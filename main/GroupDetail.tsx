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
  calculateTax,
  SERVICE_FEE,
} from "../utils/helpers";

const PRIMARY = "#FFA800";

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

  const { game, gameEmoji, package: pkg, userId, server } = params;
  const { groupId, groupCode: deepLinkCode } = params;

  const [loading, setLoading] = useState(!isCreating);
  const [submitting, setSubmitting] = useState(false);
  const [groupData, setGroupData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [targetMembers, setTargetMembers] = useState(3);

  // Form join member
  const [joinGame, setJoinGame] = useState("");
  const [joinPackageName, setJoinPackageName] = useState("");
  const [joinPackagePrice, setJoinPackagePrice] = useState("");
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
      const query = supabase.from("groups").select("*");
      const { data: group, error: gErr } = await (groupId
        ? query.eq("id", groupId).single()
        : query.eq("code", deepLinkCode).single());

      if (gErr || !group) {
        Alert.alert("Group Tidak Ditemukan",
          "Group ini sudah tidak tersedia atau sudah expired.",
          [{ text: "OK", onPress: () => navigation.goBack() }]);
        return;
      }

      const { data: memberData } = await supabase
        .from("group_members").select("*")
        .eq("group_id", group.id).order("joined_at", { ascending: true });

      setGroupData(group);
      setMembers(memberData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // KALKULASI GROUP ORDER: setiap member punya order sendiri,
  // total gabungan dapat diskon, lalu dibagi proporsional
  // ============================================================
  const groupBreakdown = useMemo(() => {
    if (!groupData || members.length === 0) return null;
    const confirmed = members.filter((m) => m.package_price > 0);
    if (confirmed.length === 0) return null;

    const subtotal = confirmed.reduce((sum: number, m: any) => sum + (m.package_price || 0), 0);
    const discountPct = getGroupDiscountPercent(groupData.target_members);
    const totalDiscount = Math.round((subtotal * discountPct) / 100);
    const afterDiscount = subtotal - totalDiscount;
    const tax = calculateTax(afterDiscount);
    const serviceFee = SERVICE_FEE * confirmed.length;
    const grandTotal = afterDiscount + tax + serviceFee;

    const memberBreakdowns = confirmed.map((m: any) => {
      const proportion = subtotal > 0 ? m.package_price / subtotal : 0;
      const memberDiscount = Math.round(totalDiscount * proportion);
      const memberTax = Math.round(tax * proportion);
      const memberFinal = m.package_price - memberDiscount + memberTax + SERVICE_FEE;
      return { ...m, memberDiscount, memberTax, memberFinal };
    });

    return { subtotal, discountPct, totalDiscount, afterDiscount, tax, serviceFee, grandTotal, memberBreakdowns };
  }, [groupData, members]);

  const createBreakdown = useMemo(() => {
    if (!isCreating || !pkg) return null;
    const discountPct = getGroupDiscountPercent(targetMembers);
    const estSubtotal = pkg.price * targetMembers;
    const totalDiscount = Math.round((estSubtotal * discountPct) / 100);
    const afterDiscount = estSubtotal - totalDiscount;
    const tax = calculateTax(afterDiscount);
    const serviceFee = SERVICE_FEE * targetMembers;
    const grandTotal = afterDiscount + tax + serviceFee;
    return { discountPct, estSubtotal, totalDiscount, tax, serviceFee, grandTotal, estPerPerson: Math.ceil(grandTotal / targetMembers) };
  }, [isCreating, pkg, targetMembers]);

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
        game_name: game,
        game_emoji: gameEmoji,
        package_name: `${pkg.amount} ${pkg.label || "Diamonds"}`,
        package_amount: pkg.amount,
        package_bonus: pkg.bonus || 0,
        package_price: pkg.price,
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

      // Tambah host sebagai member pertama beserta order mereka
      await supabase.from("group_members").insert({
        group_id: newGroup.id,
        user_id: currentUser.id,
        user_name: currentUser.name,
        is_host: true,
        payment_status: "pending",
        game_name: game,
        game_emoji: gameEmoji,
        package_name: `${pkg.amount} ${pkg.label || "Diamonds"}`,
        package_price: pkg.price,
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
    if (!joinGame.trim()) { Alert.alert("Lengkapi Data", "Nama game tidak boleh kosong."); return; }
    if (!joinPackageName.trim()) { Alert.alert("Lengkapi Data", "Nama paket tidak boleh kosong."); return; }
    const price = parseInt(joinPackagePrice.replace(/\D/g, ""));
    if (!price || price < 1000) { Alert.alert("Lengkapi Data", "Harga paket minimal Rp 1.000."); return; }
    if (!joinUserId.trim()) { Alert.alert("Lengkapi Data", "ID game tidak boleh kosong."); return; }

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
        game_name: joinGame.trim(),
        game_emoji: "🎮",
        package_name: joinPackageName.trim(),
        package_price: price,
        target_user_id: joinUserId.trim(),
        target_server: joinServer.trim() || null,
      });

      await supabase.from("groups")
        .update({ current_members: groupData.current_members + 1 })
        .eq("id", groupData.id);

      await loadGroup();
      setShowJoinForm(false);
      Alert.alert("Berhasil Join! 🎉",
        "Ordermu sudah dicatat. Bayar setelah semua peserta siap.");
    } catch (e) {
      console.error(e);
      Alert.alert("Gagal Join Group", "Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const goToPayMember = (member: any) => {
    if (!groupData) return;
    const myBreakdown = groupBreakdown?.memberBreakdowns.find((mb: any) => mb.user_id === member.user_id);
    navigation.navigate("Payment", {
      game: member.game_name,
      gameEmoji: member.game_emoji,
      package: {
        amount: member.package_name,
        price: myBreakdown?.memberFinal || member.package_price,
        label: "",
      },
      userId: member.target_user_id,
      server: member.target_server,
      members: groupData.target_members,
      groupCode: groupData.code,
      isJoiningGroup: true,
      groupBreakdown: myBreakdown,
    });
  };

  const shareGroup = async () => {
    if (!groupData) return;
    const universalUrl = `https://gamepay.app/join/${groupData.code}`;
    const discountPct = getGroupDiscountPercent(groupData.target_members);
    const msg =
      `🎮 Yuk join *Group Order GamePay*!\n\n` +
      `💰 Diskon *${discountPct}%* untuk ${groupData.target_members} orang!\n` +
      `Masing-masing order game & paket sendiri — tapi bayar lebih murah bareng.\n\n` +
      `✅ Cara join:\n1. Buka GamePay → tab Group → "Pakai Kode"\n` +
      `2. Masukkan kode: *${groupData.code}*\n3. Isi order game kamu\n4. Bayar bagianmu!\n\n` +
      `Atau klik: ${universalUrl}`;
    try { await Share.share({ message: msg, url: universalUrl }); } catch {}
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
      <View style={[styles.container, styles.center]}><Text>Data paket tidak valid.</Text></View>
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
                </Text>
                <Text style={styles.orderMeta}>ID: {userId}{server ? ` • ${server}` : ""}</Text>
              </View>
              <Text style={styles.orderPrice}>{formatRupiah(pkg.price)}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Berapa Orang yang Akan Ikut?</Text>
            <Text style={styles.cardSub}>
              Setiap teman mengisi order mereka sendiri. Diskon dibagi proporsional dari total bersama.
            </Text>
            <View style={styles.memberPicker}>
              {[2, 3, 4, 5].map((n) => {
                const isActive = targetMembers === n;
                const disc = getGroupDiscountPercent(n);
                return (
                  <TouchableOpacity key={n}
                    style={[styles.memberBtn, isActive && styles.memberBtnActive]}
                    onPress={() => setTargetMembers(n)}>
                    <Text style={[styles.memberBtnNum, isActive && styles.memberBtnNumActive]}>{n}</Text>
                    <Text style={[styles.memberBtnSub, isActive && styles.memberBtnSubActive]}>-{disc}%</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {createBreakdown && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>💡 Estimasi Bagian Kamu</Text>
              <Text style={styles.cardSub}>Asumsi semua paket sama harga. Angka final sesuai paket tiap member.</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Harga paketmu</Text>
                <Text style={styles.rowVal}>{formatRupiah(pkg.price)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: "#22c55e" }]}>Diskon group ({createBreakdown.discountPct}%)</Text>
                <Text style={[styles.rowVal, { color: "#22c55e" }]}>
                  -est. {formatRupiah(Math.round(createBreakdown.totalDiscount / targetMembers))}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>PPN 11% + Service Fee</Text>
                <Text style={styles.rowVal}>
                  +est. {formatRupiah(Math.round((createBreakdown.tax + createBreakdown.serviceFee) / targetMembers))}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.totalLabel}>Estimasi bayar kamu</Text>
                <Text style={styles.totalVal}>≈ {formatRupiah(createBreakdown.estPerPerson)}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerTitle}>ℹ️ Cara Kerja Group Order</Text>
            <Text style={styles.infoBannerText}>
              {"1. Kamu buat group dan bagikan kode ke teman\n"}
              {"2. Setiap teman join dan isi "}
              <Text style={{ fontWeight: "700" }}>order mereka sendiri</Text>
              {" (bisa beda game, beda paket)\n"}
              {"3. Total semua order digabung → dapat diskon bersama\n"}
              {"4. Masing-masing bayar bagian mereka (lebih murah!)\n"}
              {"5. Semua top up diproses setelah semua lunas"}
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
              <Text style={styles.infoTitle}>Group Order</Text>
              <Text style={styles.infoSub}>Dibuat oleh {groupData.host_name}</Text>
            </View>
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>⏱ {formatDuration(minsLeft)}</Text>
            </View>
          </View>
          <View style={styles.discountHighlight}>
            <Text style={styles.discountHighlightText}>
              {"🎉 Diskon "}
              <Text style={{ fontSize: 22, fontWeight: "900" }}>{discountPct}%</Text>
              {` untuk ${groupData.target_members} orang!`}
            </Text>
            <Text style={styles.discountHighlightSub}>
              Setiap member order paket sendiri, diskon dibagi bersama
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
            <Text style={styles.cardTitle}>Peserta & Order Mereka ({groupData.current_members}/{groupData.target_members})</Text>
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
                    <Text style={{ fontSize: 16 }}>{m.user_name?.charAt(0).toUpperCase() || "?"}</Text>
                  </View>
                  <View>
                    <Text style={styles.memberName}>
                      {m.user_name}{m.is_host ? " 👑" : ""}{m.user_id === currentUser?.id ? " (kamu)" : ""}
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

              {m.package_price > 0 && (
                <View style={styles.memberOrderBox}>
                  <Text style={styles.memberOrderEmoji}>{m.game_emoji || "🎮"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberOrderGame}>{m.game_name}</Text>
                    <Text style={styles.memberOrderPkg}>{m.package_name}</Text>
                    <Text style={styles.memberOrderMeta}>ID: {m.target_user_id}{m.target_server ? ` • ${m.target_server}` : ""}</Text>
                  </View>
                  <Text style={styles.memberOrderPrice}>{formatRupiah(m.package_price)}</Text>
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

        {/* Rincian harga gabungan */}
        {groupBreakdown && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Rincian Harga Bersama</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>
                Total semua order ({groupBreakdown.memberBreakdowns.length} org)
              </Text>
              <Text style={styles.rowVal}>{formatRupiah(groupBreakdown.subtotal)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: "#22c55e" }]}>
                Diskon group ({groupBreakdown.discountPct}%)
              </Text>
              <Text style={[styles.rowVal, { color: "#22c55e" }]}>
                -{formatRupiah(groupBreakdown.totalDiscount)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>PPN 11%</Text>
              <Text style={styles.rowVal}>{formatRupiah(groupBreakdown.tax)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Biaya Layanan</Text>
              <Text style={styles.rowVal}>{formatRupiah(groupBreakdown.serviceFee)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.totalLabel}>Total Semua</Text>
              <Text style={styles.totalVal}>{formatRupiah(groupBreakdown.grandTotal)}</Text>
            </View>

            <View style={styles.memberBreakdownHeader}>
              <Text style={styles.cardTitle}>Bagian Masing-Masing</Text>
            </View>
            {groupBreakdown.memberBreakdowns.map((mb: any, i: number) => (
              <View key={i} style={styles.memberBreakdownRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberBreakdownName}>{mb.user_name}</Text>
                  <Text style={styles.memberBreakdownPkg}>{mb.package_name} • {formatRupiah(mb.package_price)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.memberBreakdownFinal,
                    mb.user_id === currentUser?.id && { color: PRIMARY }]}>
                    {formatRupiah(mb.memberFinal)}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#22c55e" }}>hemat {formatRupiah(mb.memberDiscount)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Form join untuk member baru */}
        {!myMembership && !isHost && showJoinForm && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎮 Isi Order Kamu</Text>
            <Text style={styles.cardSub}>Boleh beda game dan paket dari member lain.</Text>

            <Text style={styles.formLabel}>Nama Game</Text>
            <TextInput style={styles.formInput} placeholder="cth: Mobile Legends"
              placeholderTextColor="#bbb" value={joinGame} onChangeText={setJoinGame} />

            <Text style={styles.formLabel}>Nama Paket</Text>
            <TextInput style={styles.formInput} placeholder="cth: 286 Diamonds"
              placeholderTextColor="#bbb" value={joinPackageName} onChangeText={setJoinPackageName} />

            <Text style={styles.formLabel}>Harga Paket (Rp)</Text>
            <TextInput style={styles.formInput} placeholder="cth: 80000"
              placeholderTextColor="#bbb" value={joinPackagePrice}
              onChangeText={(t) => setJoinPackagePrice(t.replace(/\D/g, ""))}
              keyboardType="numeric" />

            <Text style={styles.formLabel}>ID Game Kamu</Text>
            <TextInput style={styles.formInput} placeholder="User ID / Player ID"
              placeholderTextColor="#bbb" value={joinUserId} onChangeText={setJoinUserId} />

            <Text style={styles.formLabel}>Server (opsional)</Text>
            <TextInput style={styles.formInput} placeholder="cth: ID (1234)"
              placeholderTextColor="#bbb" value={joinServer} onChangeText={setJoinServer} />

            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.cancelBtn]}
                onPress={() => setShowJoinForm(false)}>
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
                    groupBreakdown.memberBreakdowns.find((mb: any) => mb.user_id === currentUser?.id)?.memberFinal || 0)}`
                : "Bayar Sekarang"}
            </Text>
          </TouchableOpacity>
        ) : !isHost && !showJoinForm ? (
          <TouchableOpacity style={styles.payBtn} onPress={() => setShowJoinForm(true)}>
            <Text style={styles.payBtnText}>🙋 Ikut Group & Isi Orderku</Text>
          </TouchableOpacity>
        ) : isHost ? (
          <View style={[styles.payBtn, { backgroundColor: "#f0f0f0" }]}>
            <Text style={[styles.payBtnText, { color: "#888" }]}>Tunggu Semua Peserta Join</Text>
          </View>
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
  infoTitle: { fontSize: 18, fontWeight: "800", color: "#1a1a1a" },
  infoSub: { fontSize: 12, color: "#888", marginTop: 2 },
  timerBadge: { backgroundColor: "#FFFBEA", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  timerText: { fontSize: 12, fontWeight: "700", color: PRIMARY },
  discountHighlight: { backgroundColor: "#e6f9ee", borderRadius: 10, padding: 12 },
  discountHighlightText: { fontSize: 16, fontWeight: "700", color: "#22c55e", textAlign: "center" },
  discountHighlightSub: { fontSize: 12, color: "#22c55e", textAlign: "center", marginTop: 4 },

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
    flex: 1, backgroundColor: "#F5F5F5", borderRadius: 12, padding: 14,
    alignItems: "center", borderWidth: 2, borderColor: "transparent",
  },
  memberBtnActive: { borderColor: PRIMARY, backgroundColor: "#FFFBEA" },
  memberBtnNum: { fontSize: 22, fontWeight: "800", color: "#666" },
  memberBtnNumActive: { color: PRIMARY },
  memberBtnSub: { fontSize: 11, color: "#888", marginTop: 2 },
  memberBtnSubActive: { color: PRIMARY, fontWeight: "700" },

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
  memberOrderGame: { fontSize: 12, fontWeight: "700", color: "#1a1a1a" },
  memberOrderPkg: { fontSize: 11, color: "#666", marginTop: 1 },
  memberOrderMeta: { fontSize: 10, color: "#aaa", marginTop: 1 },
  memberOrderPrice: { fontSize: 13, fontWeight: "800", color: "#1a1a1a" },

  memberBreakdownHeader: { marginTop: 12, marginBottom: 4 },
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

  formLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6, marginTop: 10 },
  formInput: {
    backgroundColor: "#F5F5F5", borderRadius: 10, padding: 12,
    fontSize: 14, color: "#1a1a1a", borderWidth: 1, borderColor: "#e5e5e5",
  },

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
