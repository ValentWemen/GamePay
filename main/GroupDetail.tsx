import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../user/Supabase";
import {
  formatRupiah,
  formatDuration,
  generateGroupCode,
  getGroupDiscountPercent,
  calculatePriceBreakdown,
} from "../utils/helpers";
import { GroupNotifications } from "../utils/notifications";

const PRIMARY = "#FFA800";
const SERVERS = ["Asia", "Europe", "Americas", "SEA"];

interface PackageData {
  id: string;
  package_name: string;
  amount: number;
  bonus: number;
  price: number;
  is_popular: boolean;
}

export default function GroupDetail({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const insets = useSafeAreaInsets();
  const params = route?.params || {};
  const isCreating = params.mode === "create";

  const { game, gameEmoji, gameId, package: pkg, userId, server } = params;
  const quantity: number = params.quantity || 1;
  const { groupId, groupCode: deepLinkCode } = params;

  const [loading, setLoading] = useState(!isCreating);
  const [submitting, setSubmitting] = useState(false);
  const [groupData, setGroupData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [targetMembers, setTargetMembers] = useState(3);

  // Packages untuk join form
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [gameHasServer, setGameHasServer] = useState(false);

  // Join form state
  const [joinPackageId, setJoinPackageId] = useState<string | null>(null);
  const [joinQuantity, setJoinQuantity] = useState(1);
  const [joinUserId, setJoinUserId] = useState("");
  const [joinServer, setJoinServer] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    if (!isCreating && (groupId || deepLinkCode)) {
      loadGroup();
    } else {
      setLoading(false);
    }
  }, []);

  // ============================================================
  // REALTIME SUBSCRIPTION - notifikasi saat member join/bayar
  // ============================================================
  useEffect(() => {
    if (!groupData?.id || !currentUser?.id) return;

    const channelName = `group-${groupData.id}-${Date.now()}`;
    console.log(`[Realtime] Subscribing to channel: ${channelName}`);
    console.log(`[Realtime] Group ID: ${groupData.id}`);
    console.log(`[Realtime] Current User: ${currentUser.id} (is host: ${currentUser.id === groupData.host_id})`);

    // Subscribe ke perubahan di group_members table untuk group ini
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_members",
          filter: `group_id=eq.${groupData.id}`,
        },
        async (payload) => {
          console.log("[Realtime] 🟢 INSERT group_members:", payload.new);
          const newMember = payload.new as any;
          // Trigger notif hanya kalau:
          // - User saat ini adalah host
          // - Yang join BUKAN host sendiri (jangan notif diri sendiri)
          if (
            currentUser?.id === groupData.host_id &&
            newMember.user_id !== currentUser?.id
          ) {
            console.log("[Realtime] 🔔 Triggering newMemberJoined notification");
            await GroupNotifications.newMemberJoined(
              newMember.user_name || "Seseorang",
              groupData.game_name,
            );
          } else {
            console.log("[Realtime] ⏭️ Skip notif (not host or self-join)");
          }
          // Refresh member list
          loadGroup();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "group_members",
          filter: `group_id=eq.${groupData.id}`,
        },
        async (payload) => {
          console.log("[Realtime] 🔄 UPDATE group_members:", payload.new);
          const updated = payload.new as any;
          const old = payload.old as any;

          // Member baru bayar (payment_status berubah ke 'paid')
          if (
            old?.payment_status !== "paid" &&
            updated?.payment_status === "paid" &&
            updated.user_id !== currentUser?.id // jangan notif diri sendiri
          ) {
            console.log("[Realtime] 🔔 Triggering memberPaid notification");
            await GroupNotifications.memberPaid(
              updated.user_name || "Member",
            );
          }
          loadGroup();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "groups",
          filter: `id=eq.${groupData.id}`,
        },
        async (payload) => {
          console.log("[Realtime] 🔄 UPDATE groups:", payload.new);
          const updated = payload.new as any;
          const old = payload.old as any;

          // Group baru penuh
          if (
            old?.current_members < old?.target_members &&
            updated?.current_members === updated?.target_members
          ) {
            console.log("[Realtime] 🔔 Triggering groupFull notification");
            await GroupNotifications.groupFull(updated.game_name);
          }
          // Group selesai (semua bayar)
          if (old?.status !== "completed" && updated?.status === "completed") {
            console.log("[Realtime] 🔔 Triggering allPaid notification");
            await GroupNotifications.allPaid(updated.game_name);
          }
          loadGroup();
        },
      )
      .subscribe((status, err) => {
        console.log(`[Realtime] Status: ${status}`);
        if (err) console.error(`[Realtime] Error:`, err);
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] ✅ Successfully subscribed!");
        }
        if (status === "CHANNEL_ERROR") {
          console.error("[Realtime] ❌ Channel error - Realtime mungkin belum di-enable di Supabase");
        }
      });

    // Cleanup saat unmount
    return () => {
      console.log(`[Realtime] Unsubscribing channel: ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [groupData?.id, currentUser?.id]);

  const loadCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from("profiles").select("*").eq("id", session.user.id).single();
      setCurrentUser({
        id: session.user.id,
        email: session.user.email,
        name: profile?.display_name || profile?.full_name ||
          session.user.email?.split("@")[0] || "User",
      });
    }
  };

  const loadGroup = async () => {
    try {
      const query = supabase
        .from("groups")
        .select("*, games(has_server, currency)");

      const { data: group, error: gErr } = await (groupId
        ? query.eq("id", groupId).single()
        : query.eq("code", deepLinkCode).single());

      if (gErr || !group) {
        Alert.alert(
          "Group Tidak Ditemukan",
          "Group ini sudah tidak tersedia atau sudah expired.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
        return;
      }

      const { data: memberData } = await supabase
        .from("group_members").select("*")
        .eq("group_id", group.id).order("joined_at", { ascending: true });

      setGroupData(group);
      setMembers(memberData || []);
      setGameHasServer(group.games?.has_server ?? false);

      if (group.game_id) {
        fetchPackages(group.game_id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async (gId: string) => {
    setLoadingPackages(true);
    try {
      const { data } = await supabase
        .from("topup_packages")
        .select("id, package_name, amount, bonus, price, is_popular")
        .eq("game_id", gId)
        .order("price", { ascending: true });
      setPackages(data || []);
    } catch (e) {
      console.error("fetchPackages error:", e);
    } finally {
      setLoadingPackages(false);
    }
  };

  // Breakdown per-member menggunakan formula baru (per-orang, dengan cap)
  const groupBreakdown = useMemo(() => {
    if (!groupData || members.length === 0) return null;
    const confirmed = members.filter(
      (m) => (m.unit_price || m.package_price) > 0
    );
    if (confirmed.length === 0) return null;

    const memberBreakdowns = confirmed.map((m: any) => {
      const unitPrice = m.unit_price || m.package_price;
      const qty = m.quantity || 1;
      const bd = calculatePriceBreakdown(unitPrice, groupData.target_members, qty);
      return {
        ...m,
        breakdown: bd,
        memberDiscount: bd.groupDiscount,
        memberFinal: bd.total,
      };
    });

    const grandTotal = memberBreakdowns.reduce((s, m) => s + m.memberFinal, 0);
    const totalDiscount = memberBreakdowns.reduce((s, m) => s + m.memberDiscount, 0);
    const discountPct = getGroupDiscountPercent(groupData.target_members);

    return { discountPct, memberBreakdowns, grandTotal, totalDiscount };
  }, [groupData, members]);

  // Breakdown host (create mode) — pakai formula baru
  const createBreakdown = useMemo(() => {
    if (!isCreating || !pkg) return null;
    return calculatePriceBreakdown(pkg.price, targetMembers, quantity);
  }, [isCreating, pkg, targetMembers, quantity]);

  const handleCreateGroup = async () => {
    if (!currentUser) { Alert.alert("Belum Login", "Silakan login dulu."); return; }
    setSubmitting(true);
    try {
      const code = generateGroupCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { data: newGroup, error } = await supabase.from("groups").insert({
        code,
        host_id: currentUser.id,
        host_name: currentUser.name,
        game_id: gameId || null,
        game_name: game,
        game_emoji: gameEmoji,
        package_name: `${pkg.amount} ${pkg.label || "Diamonds"}`,
        package_amount: pkg.amount,
        package_bonus: pkg.bonus || 0,
        package_price: pkg.price * quantity,
        topup_package_id: pkg.id || null,
        target_user_id: userId,
        target_server: server || null,
        target_members: targetMembers,
        current_members: 1,
        expires_at: expiresAt,
        status: "open",
      }).select().single();

      if (error) {
        Alert.alert("Gagal Membuat Group", error.message);
        setSubmitting(false);
        return;
      }

      await supabase.from("group_members").insert({
        group_id: newGroup.id,
        user_id: currentUser.id,
        user_name: currentUser.name,
        is_host: true,
        payment_status: "pending",
        game_name: game,
        game_emoji: gameEmoji,
        topup_package_id: pkg.id || null,
        package_name: `${pkg.amount} ${pkg.label || "Diamonds"}`,
        unit_price: pkg.price,
        quantity: quantity,
        package_price: pkg.price * quantity,
        target_user_id: userId,
        target_server: server || null,
      });

      navigation.replace("GroupDetail", { groupId: newGroup.id });
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Gagal membuat group.");
      setSubmitting(false);
    }
  };

  const handleJoinWithOrder = async () => {
    if (!currentUser || !groupData) return;

    const selectedPkg = packages.find((p) => p.id === joinPackageId);
    if (!selectedPkg) { Alert.alert("Lengkapi Data", "Pilih paket terlebih dahulu."); return; }
    if (!joinUserId.trim()) { Alert.alert("Lengkapi Data", "ID game tidak boleh kosong."); return; }
    if (gameHasServer && !joinServer) { Alert.alert("Lengkapi Data", "Pilih server terlebih dahulu."); return; }

    const alreadyMember = members.find((m) => m.user_id === currentUser.id);
    if (alreadyMember) { goToPayMember(alreadyMember); return; }

    if (groupData.current_members >= groupData.target_members) {
      Alert.alert("Group Penuh", "Group ini sudah penuh."); return;
    }

    setSubmitting(true);
    try {
      await supabase.from("group_members").insert({
        group_id: groupData.id,
        user_id: currentUser.id,
        user_name: currentUser.name,
        is_host: false,
        payment_status: "pending",
        game_name: groupData.game_name,
        game_emoji: groupData.game_emoji,
        topup_package_id: selectedPkg.id,
        package_name: selectedPkg.package_name,
        unit_price: selectedPkg.price,
        quantity: joinQuantity,
        package_price: selectedPkg.price * joinQuantity,
        target_user_id: joinUserId.trim(),
        target_server: joinServer || null,
      });

      await supabase.from("groups")
        .update({ current_members: groupData.current_members + 1 })
        .eq("id", groupData.id);

      await loadGroup();
      setShowJoinForm(false);
      Alert.alert("Berhasil Join! 🎉", "Ordermu sudah dicatat. Bayar setelah semua peserta siap.");
    } catch (e) {
      console.error(e);
      Alert.alert("Gagal Join Group", "Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const goToPayMember = (member: any) => {
    if (!groupData) return;
    const myBreakdown = groupBreakdown?.memberBreakdowns.find(
      (mb: any) => mb.user_id === member.user_id
    );
    navigation.navigate("Payment", {
      gameId: groupData.game_id,
      game: member.game_name || groupData.game_name,
      gameEmoji: member.game_emoji || groupData.game_emoji,
      topupPackageId: member.topup_package_id,
      package: {
        id: member.topup_package_id,
        price: member.unit_price || member.package_price,
        name: member.package_name,
        label: "",
      },
      quantity: member.quantity || 1,
      userId: member.target_user_id,
      server: member.target_server,
      members: groupData.target_members,
      groupCode: groupData.code,
      isJoiningGroup: true,
    });
  };

  const shareGroup = async () => {
    if (!groupData) return;

    // Universal Link (untuk production build dengan domain hosting)
    const universalUrl = `https://gamepay.app/join/${groupData.code}`;

    // Custom scheme - work di production APK
    // Expo akan auto-handle scheme "gamepay://" yang sudah dideklarasi di app.json
    const schemeUrl = `gamepay://join/${groupData.code}`;

    // Linking.createURL akan otomatis pilih scheme/universal sesuai environment
    const dynamicUrl = Linking.createURL(`/join/${groupData.code}`);

    const discountPct = getGroupDiscountPercent(groupData.target_members);

    // Format pesan ala Gojek - link di awal supaya WhatsApp auto-preview
    const msg =
      `🎮 Yuk join *Group Order GamePay* di ${groupData.game_name}!\n\n` +
      `💰 Hemat *${discountPct}%* kalau patungan ${groupData.target_members} orang.\n` +
      `Masing-masing pilih paket sendiri — tapi bayar lebih murah bareng!\n\n` +
      `👉 Klik link untuk join langsung:\n${universalUrl}\n\n` +
      `Atau buka GamePay → tab Group → "Pakai Kode": *${groupData.code}*`;

    try {
      await Share.share({
        message: msg,
        url: universalUrl, // iOS akan show link preview
        title: `Join Group Order ${groupData.game_name}`,
      });
    } catch {}
  };

  const copyCode = async () => {
    if (!groupData) return;
    await Clipboard.setStringAsync(groupData.code);
    Alert.alert("✓ Tersalin", "Kode group berhasil disalin");
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  // ============ CREATE MODE ============
  if (isCreating) {
    if (!pkg) return (
      <View style={[styles.container, styles.center]}>
        <Text>Data paket tidak valid.</Text>
      </View>
    );

    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buat Group Order</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📦 Order Kamu (Host)</Text>
            <View style={styles.orderRow}>
              <Text style={{ fontSize: 28 }}>{gameEmoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderGame}>{game}</Text>
                <Text style={styles.orderPkg}>
                  {pkg.amount} {pkg.label || "Diamonds"}
                  {pkg.bonus ? ` + ${pkg.bonus} Bonus` : ""}
                  {quantity > 1 ? ` × ${quantity}` : ""}
                </Text>
                <Text style={styles.orderMeta}>
                  ID: {userId}{server ? ` • ${server}` : ""}
                </Text>
              </View>
              <Text style={styles.orderPrice}>
                {formatRupiah(pkg.price * quantity)}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Berapa Orang yang Akan Ikut?</Text>
            <Text style={styles.cardSub}>
              Semakin banyak orang, semakin besar diskon per orang.
            </Text>
            <View style={styles.memberPicker}>
              {[2, 3, 4, 5].map((n) => {
                const isActive = targetMembers === n;
                const disc = getGroupDiscountPercent(n);
                const cap = n * 5000;
                return (
                  <TouchableOpacity key={n}
                    style={[styles.memberBtn, isActive && styles.memberBtnActive]}
                    onPress={() => setTargetMembers(n)}>
                    <Text style={[styles.memberBtnNum, isActive && styles.memberBtnNumActive]}>{n}</Text>
                    <Text style={[styles.memberBtnSub, isActive && styles.memberBtnSubActive]}>
                      -{disc}%
                    </Text>
                    <Text style={[styles.memberBtnCap, isActive && styles.memberBtnSubActive]}>
                      maks {formatRupiah(cap)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {createBreakdown && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>💡 Rincian Bayar Kamu</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>
                  Subtotal ({quantity}× {formatRupiah(pkg.price)})
                </Text>
                <Text style={styles.rowVal}>{formatRupiah(createBreakdown.subtotal)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: "#22c55e" }]}>
                  Diskon group ({createBreakdown.groupDiscountPercent}%)
                </Text>
                <Text style={[styles.rowVal, { color: "#22c55e" }]}>
                  -{formatRupiah(createBreakdown.groupDiscount)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>PPN 11%</Text>
                <Text style={styles.rowVal}>{formatRupiah(createBreakdown.tax)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Biaya Layanan</Text>
                <Text style={styles.rowVal}>{formatRupiah(createBreakdown.serviceFee)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.totalLabel}>Total Bayar Kamu</Text>
                <Text style={styles.totalVal}>{formatRupiah(createBreakdown.total)}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerTitle}>ℹ️ Cara Kerja Group Order</Text>
            <Text style={styles.infoBannerText}>
              {"1. Kamu buat group dan bagikan kode ke teman\n"}
              {"2. Setiap teman join, pilih paket dari "}
              <Text style={{ fontWeight: "700" }}>game yang sama</Text>
              {" (boleh beda paket & jumlah)\n"}
              {"3. Diskon dihitung per orang dari harga paket masing-masing\n"}
              {"4. Masing-masing bayar bagian mereka sendiri"}
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.payBtn, submitting && styles.payBtnDisabled]}
            onPress={handleCreateGroup} disabled={submitting}>
            <Text style={styles.payBtnText}>
              {submitting ? "Membuat..." : "Buat Group & Bagikan Kode →"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ============ JOIN/VIEW MODE ============
  if (!groupData) return null;

  const isHost = currentUser?.id === groupData.host_id;
  const myMembership = members.find((m) => m.user_id === currentUser?.id);
  const minsLeft = Math.max(0,
    Math.floor((new Date(groupData.expires_at).getTime() - Date.now()) / 60000));
  const progress = (groupData.current_members / groupData.target_members) * 100;
  const discountPct = getGroupDiscountPercent(groupData.target_members);
  const selectedJoinPkg = packages.find((p) => p.id === joinPackageId);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Group</Text>
        <TouchableOpacity onPress={shareGroup} style={styles.backBtn}>
          <Text style={styles.backArrow}>↗</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>
                {groupData.game_emoji} {groupData.game_name}
              </Text>
              <Text style={styles.infoSub}>Dibuat oleh {groupData.host_name}</Text>
            </View>
            {groupData.status === "completed" ? (
              <View style={styles.completedBadge}>
                <Text style={styles.completedText}>✅ Selesai</Text>
              </View>
            ) : (
              <View style={styles.timerBadge}>
                <Text style={styles.timerText}>⏱ {formatDuration(minsLeft)}</Text>
              </View>
            )}
          </View>
          <View style={styles.discountHighlight}>
            <Text style={styles.discountHighlightText}>
              {"🎉 Diskon "}
              <Text style={{ fontSize: 22, fontWeight: "900" }}>{discountPct}%</Text>
              {` untuk ${groupData.target_members} orang!`}
            </Text>
            <Text style={styles.discountHighlightSub}>
              Maks Rp {(groupData.target_members * 5000).toLocaleString("id-ID")} per orang
            </Text>
          </View>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Kode Group — Bagikan ke Teman</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{groupData.code}</Text>
            <TouchableOpacity onPress={copyCode} style={styles.codeCopyBtn}>
              <Text style={styles.codeCopyText}>📋 Salin</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={shareGroup}>
            <Text style={styles.shareBtnText}>📤 Share ke Teman</Text>
          </TouchableOpacity>
        </View>

        {/* Daftar peserta */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>
              Peserta ({groupData.current_members}/{groupData.target_members})
            </Text>
            <Text style={styles.progressPct}>{progress.toFixed(0)}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>

          {members.map((m, i) => (
            <View key={i} style={styles.memberCard}>
              <View style={styles.memberHeader}>
                <View style={styles.memberLeft}>
                  <View style={styles.memberAvatar}>
                    <Text style={{ fontSize: 16 }}>
                      {m.user_name?.charAt(0).toUpperCase() || "?"}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.memberName}>
                      {m.user_name}{m.is_host ? " 👑" : ""}
                      {m.user_id === currentUser?.id ? " (kamu)" : ""}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge,
                  m.payment_status === "paid" ? styles.statusPaid : styles.statusPending]}>
                  <Text style={[styles.statusText,
                    m.payment_status === "paid" ? styles.statusPaidText : styles.statusPendingText]}>
                    {m.payment_status === "paid" ? "✓ Lunas" : "Menunggu"}
                  </Text>
                </View>
              </View>

              {(m.unit_price || m.package_price) > 0 && (
                <View style={styles.memberOrderBox}>
                  <Text style={styles.memberOrderEmoji}>{m.game_emoji || "🎮"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberOrderPkg}>
                      {m.package_name}
                      {(m.quantity || 1) > 1 ? ` × ${m.quantity}` : ""}
                    </Text>
                    <Text style={styles.memberOrderMeta}>
                      ID: {m.target_user_id}{m.target_server ? ` • ${m.target_server}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.memberOrderPrice}>
                    {formatRupiah(m.package_price || (m.unit_price * (m.quantity || 1)))}
                  </Text>
                </View>
              )}
            </View>
          ))}

          {Array.from({ length: groupData.target_members - members.length }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.memberCard}>
              <View style={styles.memberLeft}>
                <View style={[styles.memberAvatar, { backgroundColor: "#f5f5f5" }]}>
                  <Text style={{ fontSize: 14, color: "#bbb" }}>?</Text>
                </View>
                <Text style={styles.memberEmpty}>Menunggu peserta...</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Rincian per-member */}
        {groupBreakdown && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Bagian Bayar Masing-Masing</Text>
            <Text style={styles.cardSub}>
              Diskon dihitung per orang dari harga paket masing-masing.
            </Text>
            {groupBreakdown.memberBreakdowns.map((mb: any, i: number) => (
              <View key={i} style={styles.memberBreakdownRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberBreakdownName}>
                    {mb.user_name}{mb.is_host ? " 👑" : ""}
                  </Text>
                  <Text style={styles.memberBreakdownPkg}>
                    {mb.package_name}
                    {(mb.quantity || 1) > 1 ? ` × ${mb.quantity}` : ""}
                    {" — "}{formatRupiah(mb.unit_price || mb.package_price)}/pkt
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.memberBreakdownFinal,
                    mb.user_id === currentUser?.id && { color: PRIMARY }]}>
                    {formatRupiah(mb.memberFinal)}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#22c55e" }}>
                    hemat {formatRupiah(mb.memberDiscount)}
                  </Text>
                </View>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.totalLabel}>Total Semua Orang</Text>
              <Text style={styles.totalVal}>{formatRupiah(groupBreakdown.grandTotal)}</Text>
            </View>
          </View>
        )}

        {/* Form join — package picker */}
        {!myMembership && showJoinForm && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎮 Pilih Paket Kamu</Text>

            {/* Game locked indicator */}
            <View style={styles.gameLockRow}>
              <Text style={{ fontSize: 20 }}>{groupData.game_emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.gameLockName}>{groupData.game_name}</Text>
                <Text style={styles.gameLockSub}>Game ditentukan oleh host</Text>
              </View>
              <View style={styles.gameLockBadge}>
                <Text style={styles.gameLockBadgeText}>🔒</Text>
              </View>
            </View>

            {loadingPackages ? (
              <ActivityIndicator color={PRIMARY} style={{ marginVertical: 20 }} />
            ) : packages.length === 0 ? (
              <Text style={styles.cardSub}>
                Paket tidak tersedia. Hubungi admin.
              </Text>
            ) : (
              <>
                <Text style={[styles.cardTitle, { marginTop: 12 }]}>Pilih Paket</Text>
                <View style={styles.pkgGrid}>
                  {packages.map((pkg) => (
                    <TouchableOpacity
                      key={pkg.id}
                      style={[styles.pkgCard, joinPackageId === pkg.id && styles.pkgCardActive]}
                      onPress={() => { setJoinPackageId(pkg.id); setJoinQuantity(1); }}
                    >
                      {pkg.is_popular && (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularText}>🔥 Popular</Text>
                        </View>
                      )}
                      <Text style={styles.pkgAmount}>{pkg.amount}</Text>
                      <Text style={styles.pkgSub}>{groupData.games?.currency || "Diamonds"}</Text>
                      {pkg.bonus > 0 && (
                        <Text style={styles.pkgBonus}>+{pkg.bonus} Bonus</Text>
                      )}
                      <Text style={styles.pkgPrice}>{formatRupiah(pkg.price)}</Text>
                      {joinPackageId === pkg.id && (
                        <Text style={styles.pkgCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedJoinPkg && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.cardTitle}>Jumlah Paket</Text>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        style={[styles.qtyBtn, joinQuantity <= 1 && styles.qtyBtnDisabled]}
                        onPress={() => setJoinQuantity(Math.max(1, joinQuantity - 1))}
                        disabled={joinQuantity <= 1}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <View style={styles.qtyDisplay}>
                        <Text style={styles.qtyValue}>{joinQuantity}</Text>
                        <Text style={styles.qtyLabel}>paket</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.qtyBtn, joinQuantity >= 10 && styles.qtyBtnDisabled]}
                        onPress={() => setJoinQuantity(Math.min(10, joinQuantity + 1))}
                        disabled={joinQuantity >= 10}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    {joinQuantity > 1 && (
                      <Text style={styles.qtyTotal}>
                        Subtotal: {formatRupiah(selectedJoinPkg.price * joinQuantity)}
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}

            <Text style={[styles.formLabel, { marginTop: 16 }]}>ID Game Kamu</Text>
            <TextInput
              style={styles.formInput}
              placeholder="User ID / Player ID"
              placeholderTextColor="#bbb"
              value={joinUserId}
              onChangeText={setJoinUserId}
              keyboardType="numeric"
            />

            {gameHasServer && (
              <>
                <Text style={styles.formLabel}>Pilih Server</Text>
                <View style={styles.serverGrid}>
                  {SERVERS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.serverBtn, joinServer === s && styles.serverBtnActive]}
                      onPress={() => setJoinServer(s)}
                    >
                      <Text style={[styles.serverBtnText, joinServer === s && styles.serverBtnActiveText]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowJoinForm(false); setJoinPackageId(null); }}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.payBtn, { flex: 1 }, submitting && styles.payBtnDisabled]}
                onPress={handleJoinWithOrder} disabled={submitting}>
                <Text style={styles.payBtnText}>
                  {submitting ? "Memproses..." : "Konfirmasi & Join"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {myMembership?.payment_status === "paid" ? (
          <View style={[styles.payBtn, { backgroundColor: "#e6f9ee" }]}>
            <Text style={[styles.payBtnText, { color: "#22c55e" }]}>✓ Kamu Sudah Bayar</Text>
          </View>
        ) : myMembership ? (
          <TouchableOpacity
            style={[styles.payBtn, submitting && styles.payBtnDisabled]}
            onPress={() => goToPayMember(myMembership)} disabled={submitting}>
            <Text style={styles.payBtnText}>
              {groupBreakdown
                ? `Bayar ${formatRupiah(
                    groupBreakdown.memberBreakdowns.find(
                      (mb: any) => mb.user_id === currentUser?.id
                    )?.memberFinal || 0
                  )}`
                : "Bayar Sekarang"}
            </Text>
          </TouchableOpacity>
        ) : !showJoinForm ? (
          <TouchableOpacity style={styles.payBtn} onPress={() => setShowJoinForm(true)}>
            <Text style={styles.payBtnText}>🙋 Ikut Group & Pilih Paketku</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 18, color: "#fff", fontWeight: "700" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },

  infoCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  infoTitle: { fontSize: 16, fontWeight: "800", color: "#1a1a1a" },
  infoSub: { fontSize: 12, color: "#888", marginTop: 2 },
  timerBadge: { backgroundColor: "#FFFBEA", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  completedBadge: { backgroundColor: "#dcfce7", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  completedText: { fontSize: 12, fontWeight: "800", color: "#16a34a" },
  timerText: { fontSize: 12, fontWeight: "700", color: PRIMARY },
  discountHighlight: { backgroundColor: "#e6f9ee", borderRadius: 10, padding: 12 },
  discountHighlightText: { fontSize: 16, fontWeight: "700", color: "#22c55e", textAlign: "center" },
  discountHighlightSub: { fontSize: 11, color: "#22c55e", textAlign: "center", marginTop: 4 },

  codeCard: { backgroundColor: "#1a1a2e", borderRadius: 14, padding: 16, marginBottom: 12 },
  codeLabel: { fontSize: 12, color: "#aaa", marginBottom: 6 },
  codeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  codeText: { fontSize: 24, fontWeight: "800", color: "#fff", letterSpacing: 2 },
  codeCopyBtn: { backgroundColor: PRIMARY, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  codeCopyText: { fontSize: 12, fontWeight: "700", color: "#000" },
  shareBtn: {
    backgroundColor: "rgba(255,168,0,0.2)", borderRadius: 10, padding: 12,
    alignItems: "center", marginTop: 12, borderWidth: 1, borderColor: PRIMARY,
  },
  shareBtnText: { fontSize: 13, fontWeight: "700", color: PRIMARY },

  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  cardSub: { fontSize: 12, color: "#888", marginBottom: 12, lineHeight: 17 },

  orderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  orderGame: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  orderPkg: { fontSize: 12, color: "#666", marginTop: 2 },
  orderMeta: { fontSize: 11, color: "#aaa", marginTop: 2 },
  orderPrice: { fontSize: 15, fontWeight: "800", color: PRIMARY },

  memberPicker: { flexDirection: "row", gap: 8 },
  memberBtn: {
    flex: 1, backgroundColor: "#F5F5F5", borderRadius: 12, padding: 10,
    alignItems: "center", borderWidth: 2, borderColor: "transparent",
  },
  memberBtnActive: { borderColor: PRIMARY, backgroundColor: "#FFFBEA" },
  memberBtnNum: { fontSize: 22, fontWeight: "800", color: "#666" },
  memberBtnNumActive: { color: PRIMARY },
  memberBtnSub: { fontSize: 11, color: "#888", marginTop: 2 },
  memberBtnSubActive: { color: PRIMARY, fontWeight: "700" },
  memberBtnCap: { fontSize: 9, color: "#bbb", marginTop: 2, textAlign: "center" },

  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, alignItems: "center" },
  rowLabel: { fontSize: 13, color: "#888" },
  rowVal: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 8 },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  totalVal: { fontSize: 16, fontWeight: "800", color: "#1a1a1a" },

  progressPct: { fontSize: 13, color: PRIMARY, fontWeight: "700" },
  progressBarBg: { height: 8, backgroundColor: "#f0f0f0", borderRadius: 4, overflow: "hidden", marginBottom: 14 },
  progressBarFill: { height: "100%", backgroundColor: PRIMARY, borderRadius: 4 },

  memberCard: { borderTopWidth: 1, borderTopColor: "#f5f5f5", paddingVertical: 10 },
  memberHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  memberLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  memberAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFFBEA",
    alignItems: "center", justifyContent: "center",
  },
  memberName: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  memberEmpty: { fontSize: 13, color: "#bbb", fontStyle: "italic" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusPaid: { backgroundColor: "#e6f9ee" },
  statusPending: { backgroundColor: "#fff8e0" },
  statusText: { fontSize: 11, fontWeight: "700" },
  statusPaidText: { color: "#22c55e" },
  statusPendingText: { color: PRIMARY },

  memberOrderBox: {
    backgroundColor: "#F9F9F9", borderRadius: 10, padding: 10,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  memberOrderEmoji: { fontSize: 20 },
  memberOrderPkg: { fontSize: 12, fontWeight: "700", color: "#1a1a1a" },
  memberOrderMeta: { fontSize: 10, color: "#aaa", marginTop: 1 },
  memberOrderPrice: { fontSize: 13, fontWeight: "800", color: "#1a1a1a" },

  memberBreakdownRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#f5f5f5",
  },
  memberBreakdownName: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  memberBreakdownPkg: { fontSize: 11, color: "#888", marginTop: 2 },
  memberBreakdownFinal: { fontSize: 15, fontWeight: "800", color: "#1a1a1a" },

  infoBanner: {
    backgroundColor: "#FFFBEA", borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: "#FFE4AD", marginBottom: 12,
  },
  infoBannerTitle: { fontSize: 13, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 },
  infoBannerText: { fontSize: 12, color: "#666", lineHeight: 20 },

  gameLockRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F5F5F5", borderRadius: 10, padding: 12, marginBottom: 12,
  },
  gameLockName: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  gameLockSub: { fontSize: 11, color: "#888", marginTop: 2 },
  gameLockBadge: {
    backgroundColor: "#e5e5e5", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  gameLockBadgeText: { fontSize: 14 },

  pkgGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  pkgCard: {
    width: "47%", backgroundColor: "#F5F5F5", borderRadius: 12,
    padding: 12, alignItems: "center", borderWidth: 1.5,
    borderColor: "transparent", position: "relative", minHeight: 110,
  },
  pkgCardActive: { borderColor: PRIMARY, backgroundColor: "#FFFBEA" },
  popularBadge: {
    position: "absolute", top: -8, alignSelf: "center",
    backgroundColor: PRIMARY, borderRadius: 8,
    paddingVertical: 2, paddingHorizontal: 6,
  },
  popularText: { fontSize: 10, fontWeight: "700", color: "#000" },
  pkgAmount: { fontSize: 20, fontWeight: "800", color: "#1a1a1a", marginTop: 6 },
  pkgSub: { fontSize: 10, color: "#888", marginTop: 1 },
  pkgBonus: { fontSize: 10, color: PRIMARY, fontWeight: "600", marginTop: 1 },
  pkgPrice: { fontSize: 12, color: "#555", marginTop: 4, fontWeight: "700" },
  pkgCheck: { fontSize: 14, color: PRIMARY, fontWeight: "800", marginTop: 2 },

  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 8 },
  qtyBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center",
  },
  qtyBtnDisabled: { backgroundColor: "#e0e0e0" },
  qtyBtnText: { fontSize: 20, fontWeight: "700", color: "#fff" },
  qtyDisplay: { alignItems: "center", minWidth: 50 },
  qtyValue: { fontSize: 24, fontWeight: "800", color: "#1a1a1a" },
  qtyLabel: { fontSize: 11, color: "#888" },
  qtyTotal: { textAlign: "center", marginTop: 8, fontSize: 13, fontWeight: "700", color: PRIMARY },

  formLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6, marginTop: 10 },
  formInput: {
    backgroundColor: "#F5F5F5", borderRadius: 10, padding: 12,
    fontSize: 14, color: "#1a1a1a", borderWidth: 1, borderColor: "#e5e5e5",
  },

  serverGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  serverBtn: {
    flex: 1, minWidth: "44%", backgroundColor: "#F5F5F5",
    borderRadius: 10, padding: 12, alignItems: "center",
    borderWidth: 1.5, borderColor: "transparent",
  },
  serverBtnActive: { borderColor: PRIMARY, backgroundColor: "#FFFBEA" },
  serverBtnText: { fontSize: 13, fontWeight: "600", color: "#555" },
  serverBtnActiveText: { color: PRIMARY },

  cancelBtn: {
    backgroundColor: "#F5F5F5", borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 20,
  },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: "#666" },

  footer: { padding: 16, paddingTop: 8, backgroundColor: "#F5F5F5" },
  payBtn: {
    backgroundColor: PRIMARY, borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center",
  },
  payBtnDisabled: { backgroundColor: "#FFE4AD" },
  payBtnText: { fontSize: 16, fontWeight: "800", color: "#000" },
});
