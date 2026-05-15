import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../user/Supabase";
import BottomNav from "./BottomNav";
import {
  formatRupiah,
  formatDuration,
  getGroupDiscountPercent,
  calculatePriceBreakdown,
} from "../utils/helpers";

const PRIMARY = "#FFA800";

const EMOJI_MAP: Record<string, string> = {
  "Mobile Legends": "🗡️",
  "Free Fire": "🔥",
  "PUBG Mobile": "🎯",
  "Genshin Impact": "✨",
};

type GroupRow = {
  id: string;
  code: string;
  game_name: string;
  game_emoji?: string;
  package_name: string;
  package_price: number;
  target_members: number;
  current_members: number;
  expires_at: string;
  host_name: string;
  status: string;
};

export default function Group({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("status", "open")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.warn("Fetch groups (table mungkin belum ada):", error.message);
        setGroups([]);
      } else {
        setGroups(data || []);
      }
    } catch (e) {
      console.error(e);
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  const handleJoinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      Alert.alert("Kode Kosong", "Masukkan kode group terlebih dahulu");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("code", code)
        .eq("status", "open")
        .single();

      if (error || !data) {
        Alert.alert(
          "Group Tidak Ditemukan",
          "Kode tidak valid atau group sudah penuh/expired.",
        );
        return;
      }

      setJoinModalVisible(false);
      setJoinCode("");
      navigation.navigate("GroupDetail", { groupId: data.id });
    } catch (e) {
      Alert.alert("Error", "Gagal mencari group. Coba lagi.");
    }
  };

  const handleCreate = () => {
    Alert.alert(
      "Buat Group Order",
      "Pilih game dulu di halaman Home, lalu aktifkan 'Patungan dengan Teman' saat pilih paket.",
      [
        { text: "Batal", style: "cancel" },
        { text: "Ke Home", onPress: () => navigation.navigate("Home") },
      ],
    );
  };

  const minutesLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 60000));
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Text style={{ fontSize: 22 }}>👥</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Group Order</Text>
            <Text style={styles.headerSub}>Top up bareng, lebih hemat</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY}
          />
        }
      >
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionCard} onPress={handleCreate}>
            <Text style={styles.actionEmoji}>➕</Text>
            <Text style={styles.actionTitle}>Buat Group</Text>
            <Text style={styles.actionSub}>Mulai patungan baru</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setJoinModalVisible(true)}
          >
            <Text style={styles.actionEmoji}>🔑</Text>
            <Text style={styles.actionTitle}>Pakai Kode</Text>
            <Text style={styles.actionSub}>Join dari teman</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.promoBanner}>
          <Text style={styles.promoBannerTitle}>💰 Kenapa Group Order?</Text>
          <View style={styles.promoBenefit}>
            <Text style={styles.promoBenefitEmoji}>🎯</Text>
            <Text style={styles.promoBenefitText}>
              Diskon up to <Text style={{ fontWeight: "800" }}>15%</Text> untuk
              5 orang
            </Text>
          </View>
          <View style={styles.promoBenefit}>
            <Text style={styles.promoBenefitEmoji}>💸</Text>
            <Text style={styles.promoBenefitText}>
              <Text style={{ fontWeight: "800" }}>Cashback 2%</Text> ke wallet
              GamePay
            </Text>
          </View>
          <View style={styles.promoBenefit}>
            <Text style={styles.promoBenefitEmoji}>🎁</Text>
            <Text style={styles.promoBenefitText}>
              Bonus <Text style={{ fontWeight: "800" }}>GamePay Points</Text>
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>
          Group Terbuka ({groups.length})
        </Text>

        {loading ? (
          <ActivityIndicator color={PRIMARY} style={{ marginTop: 30 }} />
        ) : groups.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 48 }}>📭</Text>
            <Text style={styles.emptyTitle}>Belum ada group terbuka</Text>
            <Text style={styles.emptySub}>
              Buat group baru atau gunakan kode dari teman
            </Text>
          </View>
        ) : (
          groups.map((g) => {
            const emoji = g.game_emoji || EMOJI_MAP[g.game_name] || "🎮";
            const minsLeft = minutesLeft(g.expires_at);
            const progress = (g.current_members / g.target_members) * 100;
            const discount = getGroupDiscountPercent(g.target_members);
            const breakdown = calculatePriceBreakdown(
              g.package_price,
              g.target_members,
            );

            return (
              <TouchableOpacity
                key={g.id}
                style={styles.groupCard}
                onPress={() =>
                  navigation.navigate("GroupDetail", { groupId: g.id })
                }
              >
                <View style={styles.groupHeader}>
                  <View style={styles.groupLeft}>
                    <Text style={{ fontSize: 28 }}>{emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupName}>{g.game_name}</Text>
                      <Text style={styles.groupPkg}>{g.package_name}</Text>
                      <Text style={styles.groupHost}>by {g.host_name}</Text>
                    </View>
                  </View>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>-{discount}%</Text>
                  </View>
                </View>

                <View style={styles.progressBarBg}>
                  <View
                    style={[styles.progressBarFill, { width: `${progress}%` }]}
                  />
                </View>

                <View style={styles.groupMetaRow}>
                  <Text style={styles.groupMeta}>
                    👤 {g.current_members}/{g.target_members} orang
                  </Text>
                  <Text style={styles.groupMeta}>
                    ⏱️ {formatDuration(minsLeft)}
                  </Text>
                  <Text
                    style={[
                      styles.groupMeta,
                      { color: PRIMARY, fontWeight: "700" },
                    ]}
                  >
                    {formatRupiah(breakdown.pricePerPerson)}/org
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={joinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Masukkan Kode Group</Text>
            <Text style={styles.modalSub}>
              Minta kode dari teman yang sudah buat group
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="GP-XXXXXX"
              placeholderTextColor="#bbb"
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={10}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setJoinModalVisible(false);
                  setJoinCode("");
                }}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalJoin}
                onPress={handleJoinByCode}
              >
                <Text style={styles.modalJoinText}>Join Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNav active="Group" navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.85)" },

  actionRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  actionCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 16,
    alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  actionEmoji: { fontSize: 28, marginBottom: 6 },
  actionTitle: { fontSize: 13, fontWeight: "700", color: "#1a1a1a" },
  actionSub: { fontSize: 11, color: "#888", marginTop: 2, textAlign: "center" },

  promoBanner: {
    backgroundColor: "#1a1a2e",
    borderRadius: 14, padding: 16, marginBottom: 20,
  },
  promoBannerTitle: { fontSize: 14, fontWeight: "800", color: "#fff", marginBottom: 10 },
  promoBenefit: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6,
  },
  promoBenefitEmoji: { fontSize: 16 },
  promoBenefitText: { fontSize: 13, color: "#fff" },

  sectionLabel: { fontSize: 14, fontWeight: "700", color: "#333", marginBottom: 10 },

  emptyBox: {
    backgroundColor: "#fff", borderRadius: 14, padding: 30,
    alignItems: "center", marginTop: 10,
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: "#666", marginTop: 12 },
  emptySub: { fontSize: 12, color: "#aaa", marginTop: 4, textAlign: "center" },

  groupCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10,
  },
  groupHeader: {
    flexDirection: "row", justifyContent: "space-between", marginBottom: 12,
  },
  groupLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  groupName: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  groupPkg: { fontSize: 12, color: "#666", marginTop: 2 },
  groupHost: { fontSize: 11, color: "#aaa", marginTop: 2 },
  discountBadge: {
    backgroundColor: "#e6f9ee",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, alignSelf: "flex-start",
  },
  discountText: { fontSize: 13, fontWeight: "800", color: "#22c55e" },
  progressBarBg: {
    height: 6, backgroundColor: "#f0f0f0", borderRadius: 3,
    overflow: "hidden", marginBottom: 10,
  },
  progressBarFill: { height: "100%", backgroundColor: PRIMARY, borderRadius: 3 },
  groupMetaRow: { flexDirection: "row", justifyContent: "space-between" },
  groupMeta: { fontSize: 12, color: "#888" },

  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center", padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 24,
    width: "100%", maxWidth: 360,
  },
  modalTitle: {
    fontSize: 18, fontWeight: "800", color: "#1a1a1a", textAlign: "center",
  },
  modalSub: {
    fontSize: 13, color: "#888", textAlign: "center",
    marginTop: 6, marginBottom: 16,
  },
  modalInput: {
    backgroundColor: "#F5F5F5", borderRadius: 12, padding: 14,
    fontSize: 16, textAlign: "center", fontWeight: "700",
    letterSpacing: 2, color: "#1a1a1a", marginBottom: 16,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  modalCancel: {
    flex: 1, backgroundColor: "#F5F5F5", borderRadius: 12,
    padding: 14, alignItems: "center",
  },
  modalCancelText: { fontSize: 14, fontWeight: "700", color: "#666" },
  modalJoin: {
    flex: 1, backgroundColor: PRIMARY, borderRadius: 12,
    padding: 14, alignItems: "center",
  },
  modalJoinText: { fontSize: 14, fontWeight: "800", color: "#000" },
});
