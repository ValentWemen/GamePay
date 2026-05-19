import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatRupiah, formatDateID } from "../utils/helpers";

const PRIMARY = "#FFA800";

const PAYMENT_LABEL: Record<string, string> = {
  qris: "QRIS",
  va: "Virtual Account",
  ewallet: "E-Wallet",
  retail: "Gerai Retail",
  gamekoin: "GameKoin",
};

export default function TransactionDetail({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const insets = useSafeAreaInsets();
  const tx = route?.params?.transaction;

  if (!tx) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: "#888" }}>Data tidak ditemukan.</Text>
      </View>
    );
  }

  const isCompleted = tx.status === "Completed";
  const isProcessing = tx.status === "Processing";
  const statusColor = isCompleted ? "#22c55e" : isProcessing ? PRIMARY : "#ef4444";
  const statusBg = isCompleted ? "#e6f9ee" : isProcessing ? "#fff8e0" : "#fef2f2";
  const statusLabel = isCompleted ? "✓ Berhasil" : isProcessing ? "⏰ Diproses" : "✗ Gagal";

  const paymentLabel = tx.payment_parent
    ? PAYMENT_LABEL[tx.payment_parent] || tx.payment_parent
    : tx.payment_method || "-";
  const paymentDetail =
    tx.payment_parent && tx.payment_method && tx.payment_parent !== tx.payment_method
      ? tx.payment_method
      : null;

  const onShare = async () => {
    try {
      await Share.share({
        message:
          `🎮 Top Up ${tx.game_name}\n` +
          `Paket: ${tx.package_name}\n` +
          `Order ID: ${tx.order_id || tx.id.slice(0, 8).toUpperCase()}\n` +
          `Status: ${statusLabel}\n` +
          `Total: ${formatRupiah(tx.amount)}\n\n` +
          `Transaksi via GamePay`,
      });
    } catch {}
  };

  const orderId = tx.order_id || tx.id.slice(0, 8).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Transaksi</Text>
        <TouchableOpacity onPress={onShare} style={styles.backBtn}>
          <Text style={styles.backArrow}>↗</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Status utama */}
        <View style={[styles.statusCard, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusIcon, { color: statusColor }]}>
            {isCompleted ? "✅" : isProcessing ? "⏳" : "❌"}
          </Text>
          <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
          <Text style={[styles.statusAmount, { color: statusColor }]}>
            {formatRupiah(tx.amount)}
          </Text>
          <Text style={styles.statusDate}>{formatDateID(tx.created_at)}</Text>
        </View>

        {/* Info Game */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎮 Informasi Pembelian</Text>
          <Row label="Game" val={`${tx.game_emoji || "🎮"} ${tx.game_name}`} />
          <Row label="Paket" val={tx.package_name} />
          {tx.bonus > 0 && <Row label="Bonus" val={`+${tx.bonus}`} valColor="#22c55e" />}
          {tx.user_game_id && <Row label="ID Game" val={tx.user_game_id} />}
          {tx.server && <Row label="Server" val={tx.server} />}
        </View>

        {/* Order ID */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Informasi Order</Text>
          <View style={styles.orderIdRow}>
            <Text style={styles.rowLabel}>Order ID</Text>
            <TouchableOpacity
              style={styles.orderIdRight}
              onPress={async () => {
                await Clipboard.setStringAsync(orderId);
              }}
            >
              <Text style={styles.orderIdVal}>{orderId}</Text>
              <Text style={styles.copyHint}>📋</Text>
            </TouchableOpacity>
          </View>
          <Row label="Tanggal" val={formatDateID(tx.created_at)} />
          {tx.is_group_order && (
            <>
              <Row label="Tipe" val="👥 Group Order" valColor={PRIMARY} />
              {tx.group_code && <Row label="Kode Group" val={tx.group_code} />}
              {tx.members && <Row label="Jumlah Peserta" val={`${tx.members} orang`} />}
            </>
          )}
        </View>

        {/* Pembayaran */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💳 Metode Pembayaran</Text>
          <Row label="Kategori" val={paymentLabel} />
          {paymentDetail && <Row label="Detail" val={paymentDetail} />}
        </View>

        {/* Total */}
        <View style={[styles.card, styles.totalCard]}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Dibayar</Text>
            <Text style={styles.totalVal}>{formatRupiah(tx.amount)}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  val,
  valColor,
}: {
  label: string;
  val: string;
  valColor?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowVal, valColor ? { color: valColor } : {}]}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
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

  statusCard: {
    borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 12,
  },
  statusIcon: { fontSize: 40, marginBottom: 8 },
  statusLabel: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  statusAmount: { fontSize: 28, fontWeight: "900", marginBottom: 4 },
  statusDate: { fontSize: 12, color: "#888" },

  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardTitle: { fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 12 },

  row: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 7, borderTopWidth: 1, borderTopColor: "#f5f5f5",
    alignItems: "center",
  },
  rowLabel: { fontSize: 13, color: "#888" },
  rowVal: { fontSize: 13, fontWeight: "600", color: "#1a1a1a", maxWidth: "60%", textAlign: "right" },

  orderIdRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 7, borderTopWidth: 1, borderTopColor: "#f5f5f5",
    alignItems: "center",
  },
  orderIdRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  orderIdVal: { fontSize: 13, fontWeight: "700", color: "#1a1a1a", fontFamily: "monospace" },
  copyHint: { fontSize: 14 },

  totalCard: { borderWidth: 1.5, borderColor: "#FFE4AD" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  totalVal: { fontSize: 20, fontWeight: "900", color: PRIMARY },
});
