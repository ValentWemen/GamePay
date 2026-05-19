import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatRupiah, formatDateID } from "../utils/helpers";

const PRIMARY = "#FFA800";

export default function PaymentSuccess({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const insets = useSafeAreaInsets();
  const {
    game,
    gameEmoji,
    package: pkg,
    amount,
    orderId,
    paymentMethod,
    members = 1,
  } = route?.params || {};

  const shareReceipt = async () => {
    const msg =
      `✅ Top Up Berhasil!\n\n` +
      `🎮 ${game}\n` +
      `📦 ${pkg?.amount} ${pkg?.label || "Diamonds"}${pkg?.bonus ? ` +${pkg.bonus} Bonus` : ""}\n` +
      `💰 ${formatRupiah(amount || pkg?.price)}\n` +
      `💳 ${paymentMethod}\n` +
      `📋 ${orderId}\n` +
      `📅 ${formatDateID(new Date())}\n\n` +
      `Top up game di GamePay 🎮`;

    try {
      await Share.share({ message: msg });
    } catch {}
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successCircle}>
          <Text style={styles.checkmark}>✓</Text>
        </View>

        <Text style={styles.title}>Beres! Diamond udah masuk. 🎉</Text>
        <Text style={styles.sub}>
          Top up {game} lagi diproses.{"\n"}
          Biasanya masuk dalam beberapa menit.
        </Text>

        <View style={styles.card}>
          <Text style={{ fontSize: 48, marginBottom: 4 }}>{gameEmoji || "🎮"}</Text>
          <Text style={styles.cardGame}>{game}</Text>
          <Text style={styles.cardAmount}>
            {pkg?.amount} {pkg?.label || "Diamonds"}
          </Text>
          {pkg?.bonus && <Text style={styles.cardBonus}>+{pkg.bonus} Bonus</Text>}

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Order ID</Text>
            <Text style={styles.val}>{orderId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Metode</Text>
            <Text style={styles.val}>{paymentMethod}</Text>
          </View>
          {members > 1 && (
            <View style={styles.row}>
              <Text style={styles.label}>Group Order</Text>
              <Text style={[styles.val, { color: "#22c55e" }]}>
                ✓ {members} orang
              </Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Tanggal</Text>
            <Text style={styles.val}>{formatDateID(new Date())}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total Dibayar</Text>
            <Text style={styles.totalVal}>{formatRupiah(amount || pkg?.price)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.shareBtn} onPress={shareReceipt}>
          <Text style={styles.shareBtnText}>📤 Share Bukti Pembayaran</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.homeBtnText}>Kembali ke Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => navigation.navigate("History")}
        >
          <Text style={styles.historyBtnText}>Lihat Riwayat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  scrollContent: { padding: 24, paddingBottom: 40, alignItems: "center" },
  successCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "#22c55e",
    alignItems: "center", justifyContent: "center",
    marginTop: 20, marginBottom: 24,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  checkmark: { fontSize: 56, color: "#fff", fontWeight: "800" },
  title: {
    fontSize: 24, fontWeight: "800", color: "#1a1a1a", textAlign: "center",
  },
  sub: {
    fontSize: 14, color: "#888", textAlign: "center",
    marginTop: 8, lineHeight: 22,
  },
  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20,
    marginTop: 24, width: "100%", alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  cardGame: { fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginTop: 4 },
  cardAmount: { fontSize: 28, fontWeight: "800", color: PRIMARY, marginTop: 4 },
  cardBonus: { fontSize: 13, color: "#22c55e", fontWeight: "600", marginTop: 2 },
  divider: { width: "100%", height: 1, backgroundColor: "#f0f0f0", marginVertical: 14 },
  row: {
    flexDirection: "row", justifyContent: "space-between",
    width: "100%", paddingVertical: 4,
  },
  label: { fontSize: 12, color: "#888" },
  val: { fontSize: 12, color: "#1a1a1a", fontWeight: "600" },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  totalVal: { fontSize: 18, fontWeight: "800", color: PRIMARY },
  shareBtn: {
    backgroundColor: "#fff", borderRadius: 14,
    padding: 14, width: "100%", alignItems: "center", marginTop: 14,
    borderWidth: 1, borderColor: "#e0e0e0",
  },
  shareBtnText: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  footer: { padding: 20, gap: 12, backgroundColor: "#F5F5F5" },
  homeBtn: {
    backgroundColor: PRIMARY, borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center",
  },
  homeBtnText: { fontSize: 16, fontWeight: "800", color: "#000" },
  historyBtn: {
    borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center",
  },
  historyBtnText: { fontSize: 16, fontWeight: "700", color: PRIMARY },
});
