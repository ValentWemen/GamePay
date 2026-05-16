import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../user/Supabase";
import { formatRupiah, formatVA, generateQRISPayload } from "../utils/helpers";

const PRIMARY = "#FFA800";

const VA_INSTRUCTIONS: Record<string, string[]> = {
  BCA: [
    "Buka m-BCA atau KlikBCA",
    "Pilih m-Transfer > BCA Virtual Account",
    "Masukkan nomor Virtual Account di atas",
    "Pastikan nominal sesuai, lalu konfirmasi",
  ],
  Mandiri: [
    "Buka Livin' by Mandiri",
    "Pilih Bayar > Multipayment",
    "Cari 'GamePay' atau masukkan kode 88508",
    "Masukkan nomor VA & nominal, lalu konfirmasi",
  ],
  BRI: [
    "Buka BRImo",
    "Pilih BRIVA",
    "Masukkan nomor Virtual Account",
    "Konfirmasi pembayaran",
  ],
  BNI: [
    "Buka mobile banking BNI",
    "Pilih Transfer > Virtual Account Billing",
    "Masukkan nomor Virtual Account",
    "Konfirmasi pembayaran",
  ],
  Permata: [
    "Buka PermataMobile X",
    "Pilih Pembayaran > Virtual Account",
    "Masukkan nomor Virtual Account",
    "Konfirmasi pembayaran",
  ],
  CIMB: [
    "Buka OCTO Mobile",
    "Pilih Transfer > Virtual Account",
    "Masukkan nomor Virtual Account",
    "Konfirmasi pembayaran",
  ],
};

export default function Processing({
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
    gameId = null,
    package: pkg,
    topupPackageId = null,
    quantity = 1,
    userId,
    server,
    paymentMethod,
    paymentParent,
    orderId,
    vaNumber,
    amount,
    members = 1,
    groupCode,
  } = route?.params || {};

  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0) {
      Alert.alert(
        "Pembayaran Expired",
        "Waktu pembayaran sudah habis. Silakan ulangi transaksi.",
        [{ text: "OK", onPress: () => navigation.popToTop() }],
      );
    }
  }, [secondsLeft]);

  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  const qrPayload = generateQRISPayload({
    merchantName: "GAMEPAY STORE",
    amount,
    orderId,
  });

  const simulatePayment = async () => {
    setSimulating(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert("Belum Login", "Silakan login dulu.");
        setSimulating(false);
        return;
      }

      await supabase.from("transactions").insert({
        user_id: session.user.id,
        order_id: orderId,
        game_id: gameId,
        topup_package_id: topupPackageId,
        game_name: game,
        game_emoji: gameEmoji,
        package_name: pkg?.name || `${pkg?.amount} ${pkg?.label || "Diamonds"}`,
        unit_price: pkg?.price || 0,
        quantity: quantity,
        amount: amount,
        bonus: pkg?.bonus || 0,
        status: "Completed",
        user_game_id: userId,
        server: server || null,
        payment_method: paymentMethod,
        payment_parent: paymentParent,
        is_group_order: members > 1,
        group_code: groupCode || null,
        members: members,
      });

      if (groupCode) {
        const { data: grp } = await supabase
          .from("groups")
          .select("id, target_members")
          .eq("code", groupCode)
          .single();

        if (grp) {
          // 1. Update payment_status user ini ke "paid"
          await supabase
            .from("group_members")
            .update({
              payment_status: "paid",
              paid_at: new Date().toISOString(),
            })
            .eq("group_id", grp.id)
            .eq("user_id", session.user.id);

          // 2. Cek apakah SEMUA member sudah bayar
          // Kalau ya, update group status ke "completed"
          const { data: allMembers } = await supabase
            .from("group_members")
            .select("payment_status")
            .eq("group_id", grp.id);

          const totalMembers = allMembers?.length || 0;
          const paidMembers =
            allMembers?.filter((m) => m.payment_status === "paid").length || 0;

          // Group selesai kalau: jumlah member yg paid == target_members
          if (
            totalMembers >= grp.target_members &&
            paidMembers >= grp.target_members
          ) {
            await supabase
              .from("groups")
              .update({
                status: "completed",
                completed_at: new Date().toISOString(),
              })
              .eq("id", grp.id);
          }
        }
      }

      setTimeout(() => {
        navigation.replace("PaymentSuccess", {
          game,
          gameEmoji,
          package: pkg,
          amount,
          orderId,
          paymentMethod,
          members,
        });
      }, 1500);
    } catch (e) {
      console.error("Error saving transaction:", e);
      Alert.alert("Error", "Gagal menyimpan transaksi.");
      setSimulating(false);
    }
  };

  const copyVA = async () => {
    if (!vaNumber) return;
    await Clipboard.setStringAsync(vaNumber);
    Alert.alert("✓ Tersalin", "Nomor VA berhasil disalin");
  };

  const copyAmount = async () => {
    await Clipboard.setStringAsync(String(amount));
    Alert.alert("✓ Tersalin", "Nominal berhasil disalin");
  };

  const shareDetails = async () => {
    const details =
      paymentParent === "va"
        ? `💳 Pembayaran GamePay\nVA ${paymentMethod}: ${formatVA(vaNumber)}\nNominal: ${formatRupiah(amount)}\nOrder: ${orderId}`
        : `💳 Pembayaran GamePay\nMetode: ${paymentMethod}\nNominal: ${formatRupiah(amount)}\nOrder: ${orderId}`;
    try {
      await Share.share({ message: details });
    } catch {}
  };

  const isQRIS = paymentParent === "qris";
  const isVA = paymentParent === "va";
  const isEwallet = paymentParent === "ewallet";
  const isRetail = paymentParent === "retail";

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menunggu Pembayaran</Text>
        <TouchableOpacity onPress={shareDetails} style={styles.backBtn}>
          <Text style={styles.backArrow}>↗</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>Selesaikan dalam</Text>
          <Text style={styles.timerVal}>
            {mm}:{ss}
          </Text>
          <Text style={styles.timerSub}>
            Pembayaran akan otomatis dibatalkan jika expired
          </Text>
        </View>

        <View style={styles.orderCard}>
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>Order ID</Text>
            <Text style={styles.orderVal}>{orderId}</Text>
          </View>
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>Game</Text>
            <Text style={styles.orderVal}>
              {gameEmoji} {game}
            </Text>
          </View>
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>Paket</Text>
            <Text style={styles.orderVal}>
              {pkg?.name || `${pkg?.amount} ${pkg?.label || "Diamonds"}`}
              {quantity > 1 ? ` × ${quantity}` : ""}
            </Text>
          </View>
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>User ID</Text>
            <Text style={styles.orderVal}>{userId}</Text>
          </View>
          {groupCode && (
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Group</Text>
              <Text style={[styles.orderVal, { color: PRIMARY }]}>
                {groupCode} ({members} org)
              </Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.orderRow}>
            <Text style={styles.totalLabel}>Total Bayar</Text>
            <TouchableOpacity onPress={copyAmount}>
              <Text style={styles.totalVal}>{formatRupiah(amount)} 📋</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isQRIS && (
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Scan QR untuk Bayar</Text>
            <Text style={styles.qrSub}>QRIS • Semua bank & e-wallet</Text>
            <View style={styles.qrBox}>
              <QRPattern data={qrPayload} />
            </View>
            <View style={styles.qrFooter}>
              <View style={styles.qrFooterItem}>
                <Text style={styles.qrFooterLabel}>Merchant</Text>
                <Text style={styles.qrFooterVal}>GAMEPAY STORE</Text>
              </View>
              <View style={styles.qrFooterItem}>
                <Text style={styles.qrFooterLabel}>NMID</Text>
                <Text style={styles.qrFooterVal}>
                  ID2025{orderId?.slice(-6)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {isVA && vaNumber && (
          <View style={styles.vaCard}>
            <Text style={styles.vaCardLabel}>
              Virtual Account {paymentMethod}
            </Text>
            <View style={styles.vaCardRow}>
              <Text style={styles.vaCardNum}>{formatVA(vaNumber)}</Text>
              <TouchableOpacity onPress={copyVA} style={styles.vaCopyBtn}>
                <Text style={styles.vaCopyText}>📋 Salin</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>
                Cara Bayar via {paymentMethod}:
              </Text>
              {(VA_INSTRUCTIONS[paymentMethod] || []).map((step, i) => (
                <View key={i} style={styles.instructionStep}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {isEwallet && (
          <View style={styles.ewalletCard}>
            <Text style={{ fontSize: 48, textAlign: "center" }}>💰</Text>
            <Text style={styles.ewalletTitle}>Bayar via {paymentMethod}</Text>
            <Text style={styles.ewalletSub}>
              Buka aplikasi {paymentMethod} di HP kamu dan selesaikan
              pembayaran.
            </Text>
          </View>
        )}

        {isRetail && (
          <View style={styles.retailCard}>
            <Text style={{ fontSize: 48, textAlign: "center" }}>🏪</Text>
            <Text style={styles.ewalletTitle}>Bayar di {paymentMethod}</Text>
            <Text style={styles.ewalletSub}>
              Datang ke gerai {paymentMethod} terdekat dan sebutkan Order ID:
            </Text>
            <View style={styles.retailCodeBox}>
              <Text style={styles.retailCode}>{orderId}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.simulateBtn, simulating && styles.simulateBtnDisabled]}
          onPress={simulatePayment}
          disabled={simulating}
        >
          <Text style={styles.simulateBtnText}>
            {simulating ? "Memproses..." : "✓ Saya Sudah Bayar (Demo)"}
          </Text>
        </TouchableOpacity>
        <Text style={styles.demoHint}>
          ⚠️ Tombol di atas hanya untuk demo. Di production, status akan
          auto-update via webhook payment gateway.
        </Text>
      </ScrollView>
    </View>
  );
}

// Pseudo QR pattern generator - tampilan visual saja (bukan QR scannable asli)
// Untuk real scannable QR, install: react-native-qrcode-svg + react-native-svg
function QRPattern({ data }: { data: string }) {
  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return h;
  };

  const seed = hash(data);
  const rng = (i: number) => Math.abs(Math.sin(seed + i * 0.5)) > 0.5;

  const SIZE = 21;
  const cells = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const isCorner =
        (x < 7 && y < 7) ||
        (x >= SIZE - 7 && y < 7) ||
        (x < 7 && y >= SIZE - 7);
      let filled = false;
      if (isCorner) {
        const lx = x < 7 ? x : x - (SIZE - 7);
        const ly = y < 7 ? y : y - (SIZE - 7);
        filled =
          lx === 0 ||
          lx === 6 ||
          ly === 0 ||
          ly === 6 ||
          (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4);
      } else {
        filled = rng(y * SIZE + x);
      }
      if (filled) {
        cells.push(
          <View
            key={`${x}-${y}`}
            style={{
              position: "absolute",
              left: x * 8,
              top: y * 8,
              width: 8,
              height: 8,
              backgroundColor: "#000",
            }}
          />,
        );
      }
    }
  }

  return (
    <View
      style={{
        width: SIZE * 8,
        height: SIZE * 8,
        backgroundColor: "#fff",
        position: "relative",
      }}
    >
      {cells}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 18, color: "#fff", fontWeight: "700" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#fff" },

  timerCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
  },
  timerLabel: { fontSize: 12, color: "#aaa" },
  timerVal: { fontSize: 38, fontWeight: "800", color: "#fff", marginTop: 4 },
  timerSub: { fontSize: 11, color: "#888", marginTop: 6, textAlign: "center" },

  orderCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
  },
  orderRow: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: 6,
  },
  orderLabel: { fontSize: 13, color: "#888" },
  orderVal: { fontSize: 13, color: "#1a1a1a", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 8 },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  totalVal: { fontSize: 16, fontWeight: "800", color: PRIMARY },

  qrCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 20,
    alignItems: "center", marginBottom: 12,
  },
  qrTitle: { fontSize: 16, fontWeight: "800", color: "#1a1a1a" },
  qrSub: { fontSize: 12, color: "#888", marginTop: 4, marginBottom: 16 },
  qrBox: {
    padding: 12,
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 8, borderColor: PRIMARY,
    alignItems: "center", justifyContent: "center",
  },
  qrFooter: {
    flexDirection: "row", justifyContent: "space-around",
    width: "100%", marginTop: 16,
  },
  qrFooterItem: { alignItems: "center" },
  qrFooterLabel: { fontSize: 10, color: "#aaa" },
  qrFooterVal: { fontSize: 11, fontWeight: "700", color: "#1a1a1a", marginTop: 2 },

  vaCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
  },
  vaCardLabel: { fontSize: 12, color: "#888", marginBottom: 8 },
  vaCardRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#1a1a2e", borderRadius: 10, padding: 14,
  },
  vaCardNum: {
    fontSize: 16, fontWeight: "800", color: "#fff",
    letterSpacing: 1, fontFamily: "monospace",
  },
  vaCopyBtn: {
    backgroundColor: PRIMARY, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  vaCopyText: { fontSize: 11, fontWeight: "700", color: "#000" },

  instructionCard: {
    backgroundColor: "#FFFBEA", borderRadius: 12, padding: 14,
    marginTop: 16, borderWidth: 1, borderColor: "#FFE4AD",
  },
  instructionTitle: {
    fontSize: 13, fontWeight: "700", color: "#1a1a1a", marginBottom: 10,
  },
  instructionStep: {
    flexDirection: "row", gap: 10, marginBottom: 8, alignItems: "flex-start",
  },
  stepNum: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: PRIMARY,
    alignItems: "center", justifyContent: "center",
  },
  stepNumText: { fontSize: 11, fontWeight: "800", color: "#000" },
  stepText: { fontSize: 12, color: "#555", flex: 1, lineHeight: 18, paddingTop: 2 },

  ewalletCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 20,
    alignItems: "center", marginBottom: 12,
  },
  ewalletTitle: { fontSize: 16, fontWeight: "800", color: "#1a1a1a", marginTop: 12 },
  ewalletSub: { fontSize: 13, color: "#888", marginTop: 6, textAlign: "center" },

  retailCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 20,
    alignItems: "center", marginBottom: 12,
  },
  retailCodeBox: {
    backgroundColor: "#1a1a2e", borderRadius: 10, padding: 14,
    marginTop: 12, width: "100%",
  },
  retailCode: {
    fontSize: 18, fontWeight: "800", color: "#fff",
    textAlign: "center", letterSpacing: 1,
  },

  simulateBtn: {
    backgroundColor: PRIMARY, borderRadius: 14, padding: 14,
    alignItems: "center", marginTop: 8,
  },
  simulateBtnDisabled: { backgroundColor: "#FFE4AD" },
  simulateBtnText: { fontSize: 15, fontWeight: "800", color: "#000" },
  demoHint: {
    fontSize: 11, color: "#aaa", textAlign: "center",
    marginTop: 8, fontStyle: "italic",
  },
});
