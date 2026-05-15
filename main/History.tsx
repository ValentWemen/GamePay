import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../user/Supabase";
import BottomNav from "./BottomNav";
import { formatRupiah, formatDateID } from "../utils/helpers";

const PRIMARY = "#FFA800";
const FILTERS = [
  { id: "All", label: "Semua" },
  { id: "Completed", label: "Berhasil" },
  { id: "Processing", label: "Diproses" },
  { id: "Failed", label: "Gagal" },
];

const EMOJI_MAP: Record<string, string> = {
  "Mobile Legends": "🗡️",
  "Free Fire": "🔥",
  "PUBG Mobile": "🎯",
  "Genshin Impact": "✨",
};

const BG_MAP: Record<string, string> = {
  "Mobile Legends": "#EDECFF",
  "Free Fire": "#FFFFF0",
  "PUBG Mobile": "#F0FFF4",
  "Genshin Impact": "#EDF4FF",
};

export default function History({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("All");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setTransactions([]);
        return;
      }
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Fetch transactions error:", error.message);
        setTransactions([]);
      } else {
        setTransactions(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const filtered =
    filter === "All"
      ? transactions
      : transactions.filter((t) => t.status === filter);

  const total = transactions.length;
  const now = new Date();
  const spent = transactions
    .filter((t) => t.status === "Completed")
    .reduce((s, t) => {
      const d = new Date(t.created_at);
      return d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
        ? s + (t.amount || 0)
        : s;
    }, 0);
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.created_at);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;

  const renderItem = ({ item }: { item: any }) => {
    const emoji = item.game_emoji || EMOJI_MAP[item.game_name] || "🎮";
    const bg = BG_MAP[item.game_name] || "#f5f5f5";
    const isCompleted = item.status === "Completed";
    const isProcessing = item.status === "Processing";

    return (
      <TouchableOpacity style={styles.txCard} activeOpacity={0.85}>
        <View style={[styles.txIcon, { backgroundColor: bg }]}>
          <Text style={{ fontSize: 24 }}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.txTopRow}>
            <Text style={styles.txGame}>{item.game_name}</Text>
            {item.is_group_order && (
              <View style={styles.groupBadge}>
                <Text style={styles.groupBadgeText}>👥 Group</Text>
              </View>
            )}
          </View>
          <Text style={styles.txDesc}>{item.package_name}</Text>
          {item.order_id && (
            <Text style={styles.txOrderId}>#{item.order_id}</Text>
          )}
          <View style={styles.txBottom}>
            <View
              style={[
                styles.statusBadge,
                isCompleted
                  ? styles.statusCompleted
                  : isProcessing
                    ? styles.statusProcessing
                    : styles.statusFailed,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isCompleted
                    ? styles.statusCompletedText
                    : isProcessing
                      ? styles.statusProcessingText
                      : styles.statusFailedText,
                ]}
              >
                {isCompleted ? "✓ Berhasil" : isProcessing ? "⏰ Diproses" : "✗ Gagal"}
              </Text>
            </View>
            <Text style={styles.txDate}>{formatDateID(item.created_at)}</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.txAmount}>{formatRupiah(item.amount)}</Text>
          <Text style={styles.txArrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Riwayat Transaksi</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statVal}>{total}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Bulan Ini</Text>
            <Text style={[styles.statVal, { color: PRIMARY }]}>
              {formatRupiah(spent)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Transaksi</Text>
            <Text style={styles.statVal}>{thisMonth}</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterWrap}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, filter === f.id && styles.filterActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.id && styles.filterActiveText,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PRIMARY}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Text style={{ fontSize: 48 }}>📭</Text>
              <Text style={{ color: "#666", marginTop: 12, fontSize: 15, fontWeight: "600" }}>
                Belum ada transaksi
              </Text>
              <Text style={{ color: "#aaa", marginTop: 4, fontSize: 12 }}>
                Mulai top up game favoritmu!
              </Text>
            </View>
          }
        />
      )}

      <BottomNav active="History" navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: { backgroundColor: PRIMARY, paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: {
    fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 14,
  },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12,
    padding: 12, alignItems: "center",
  },
  statLabel: { fontSize: 11, color: "#aaa", marginBottom: 4 },
  statVal: { fontSize: 14, fontWeight: "800", color: "#1a1a1a" },
  filterWrap: {
    flexDirection: "row", backgroundColor: "#fff",
    paddingHorizontal: 16, paddingVertical: 12, gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: "#F5F5F5",
  },
  filterActive: { backgroundColor: PRIMARY },
  filterText: { fontSize: 13, color: "#888" },
  filterActiveText: { color: "#fff", fontWeight: "700" },
  txCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12,
  },
  txIcon: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  txTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  txGame: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  groupBadge: {
    backgroundColor: "#FFFBEA",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  groupBadgeText: { fontSize: 9, fontWeight: "700", color: PRIMARY },
  txDesc: { fontSize: 12, color: "#888", marginTop: 2 },
  txOrderId: { fontSize: 10, color: "#bbb", marginTop: 2 },
  txBottom: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusCompleted: { backgroundColor: "#e6ffee" },
  statusProcessing: { backgroundColor: "#fff8e0" },
  statusFailed: { backgroundColor: "#ffecec" },
  statusText: { fontSize: 10, fontWeight: "700" },
  statusCompletedText: { color: "#22c55e" },
  statusProcessingText: { color: PRIMARY },
  statusFailedText: { color: "#ef4444" },
  txDate: { fontSize: 11, color: "#bbb" },
  txAmount: { fontSize: 14, fontWeight: "800", color: "#1a1a1a" },
  txArrow: { fontSize: 14, color: "#ccc", marginTop: 4 },
});
