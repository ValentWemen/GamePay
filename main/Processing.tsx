import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
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

// Mapping payment method app → Midtrans payment_type
function getMidtransPaymentType(paymentParent: string, paymentMethod: string): {
  payment_type: string;
  bank?: string;
  store?: string;
} {
  if (paymentParent === "va") {
    return { payment_type: "bank_transfer", bank: paymentMethod.toLowerCase() };
  }
  if (paymentParent === "qris") {
    return { payment_type: "qris" };
  }
  if (paymentParent === "retail") {
    const storeMap: Record<string, string> = {
      Indomaret: "indomaret",
      Alfamart: "alfamaret",
    };
    return { payment_type: "cstore", store: storeMap[paymentMethod] || paymentMethod.toLowerCase() };
  }
  // ewallet
  const ewalletMap: Record<string, string> = {
    GoPay: "gopay",
    OVO: "ovo",
    DANA: "dana",
    ShopeePay: "shopeepay",
    LinkAja: "linkaja",
  };
  return { payment_type: ewalletMap[paymentMethod] || "gopay" };
}

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
    package: pkg,
    quantity = 1,
    userId,
    server,
    paymentMethod,
    paymentParent,
    orderId: appOrderId,
    vaNumber: appVaNumber,
    amount,
    members = 1,
    groupCode,
    gamekoinUsed = 0,
  } = route?.params || {};

  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Data dari edge function / fallback ke lokal
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [displayOrderId, setDisplayOrderId] = useState<string>(appOrderId || "");
  const [realVaNumber, setRealVaNumber] = useState<string | null>(appVaNumber || null);
  const [qrString, setQrString] = useState<string | null>(null);
  const [paymentCode, setPaymentCode] = useState<string | null>(null);

  useEffect(() => {
    initPayment();
  }, []);

  useEffect(() => {
    const interval = setInterval(
      () => setSecondsLeft((s) => Math.max(0, s - 1)),
      1000,
    );
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

  const initPayment = async () => {
    setLoading(true);
    setInitError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert("Belum Login", "Silakan login dulu.");
        setLoading(false);
        return;
      }

      // 1. Buat transaksi pending di DB
      const { data: tx, error: txErr } = await supabase
        .from("transactions")
        .insert({
          user_id: session.user.id,
          order_id: appOrderId,
          game_name: game,
          game_emoji: gameEmoji,
          package_name:
            pkg?.name || `${pkg?.amount} ${pkg?.label || "Diamonds"}`,
          amount,
          bonus: pkg?.bonus || 0,
          status: "Processing",
          user_game_id: userId,
          server: server || null,
          payment_method: paymentMethod,
          payment_parent: paymentParent,
          is_group_order: members > 1,
          group_code: groupCode || null,
          members,
        })
        .select("id")
        .single();

      if (txErr || !tx) {
        setInitError("Gagal membuat transaksi. Coba lagi.");
        setLoading(false);
        return;
      }
      setTransactionId(tx.id);

      // 2. Jika bayar penuh dengan GameKoin, skip edge function
      if (paymentParent === "gamekoin") {
        setLoading(false);
        return;
      }

      // 3. Panggil edge function create-payment
      const { payment_type, bank, store } = getMidtransPaymentType(
        paymentParent,
        paymentMethod,
      );

      const { data: edgeData, error: edgeErr } =
        await supabase.functions.invoke("create-payment", {
          body: {
            transaction_id: tx.id,
            gross_amount: amount,
            payment_type,
            ...(bank && { bank }),
            ...(store && { store }),
            customer_details: {
              email: session.user.email,
              first_name:
                session.user.email?.split("@")[0] || "User",
            },
            item_details: [
              {
                id: "gamepay-topup",
                price: amount,
                quantity: 1,
                name: `${game} - ${pkg?.name || `${pkg?.amount} ${pkg?.label || "Diamonds"}`}`,
              },
            ],
          },
        });

      if (edgeErr || !edgeData?.success) {
        // Midtrans gagal — tampilkan mode demo dengan data lokal
        console.warn("Edge function error:", edgeErr || edgeData);
        setInitError(
          "Koneksi ke payment gateway gagal. Gunakan mode demo untuk pengujian.",
        );
        setLoading(false);
        return;
      }

      // 3. Pakai data real dari Midtrans
      if (edgeData.order_id) setDisplayOrderId(edgeData.order_id);
      if (edgeData.va_numbers?.[0]?.va_number) {
        setRealVaNumber(edgeData.va_numbers[0].va_number);
      }
      if (edgeData.qr_string) setQrString(edgeData.qr_string);
      if (edgeData.payment_code) setPaymentCode(edgeData.payment_code);
    } catch (e) {
      console.error("initPayment error:", e);
      setInitError("Terjadi kesalahan. Gunakan mode demo.");
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async () => {
    setConfirming(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // Update status transaksi
      if (transactionId) {
        await supabase
          .from("transactions")
          .update({ payment_status: "completed", status: "Completed" })
          .eq("id", transactionId);
      }

      // Kurangi gamekoin_balance jika dipakai
      if (gamekoinUsed > 0) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("gamekoin_balance")
          .eq("id", session.user.id)
          .single();
        const cur = prof?.gamekoin_balance || 0;
        await supabase
          .from("profiles")
          .update({ gamekoin_balance: Math.max(0, cur - gamekoinUsed) })
          .eq("id", session.user.id);
      }

      // Update group_members jika group order
      if (groupCode) {
        const { data: grp } = await supabase
          .from("groups")
          .select("id")
          .eq("code", groupCode)
          .single();
        if (grp) {
          await supabase
            .from("group_members")
            .update({
              payment_status: "paid",
              paid_at: new Date().toISOString(),
            })
            .eq("group_id", grp.id)
            .eq("user_id", session.user.id);
        }
      }

      setTimeout(() => {
        navigation.replace("PaymentSuccess", {
          game,
          gameEmoji,
          package: pkg,
          amount,
          orderId: displayOrderId,
          paymentMethod,
          members,
        });
      }, 1000);
    } catch (e) {
      console.error("confirmPayment error:", e);
      Alert.alert("Error", "Gagal memperbarui status pembayaran.");
      setConfirming(false);
    }
  };

  const copyVA = async () => {
    const va = realVaNumber || appVaNumber;
    if (!va) return;
    await Clipboard.setStringAsync(va);
    Alert.alert("✓ Tersalin", "Nomor VA berhasil disalin");
  };

  const copyAmount = async () => {
    await Clipboard.setStringAsync(String(amount));
    Alert.alert("✓ Tersalin", "Nominal berhasil disalin");
  };

  const shareDetails = async () => {
    const va = realVaNumber || appVaNumber;
    const details =
      paymentParent === "va"
        ? `💳 Pembayaran GamePay\nVA ${paymentMethod}: ${formatVA(va)}\nNominal: ${formatRupiah(amount)}\nOrder: ${displayOrderId}`
        : `💳 Pembayaran GamePay\nMetode: ${paymentMethod}\nNominal: ${formatRupiah(amount)}\nOrder: ${displayOrderId}`;
    try {
      await Share.share({ message: details });
    } catch {}
  };

  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  const qrPayload =
    qrString ||
    generateQRISPayload({ merchantName: "GAMEPAY STORE", amount, orderId: displayOrderId });

  const isQRIS = paymentParent === "qris";
  const isVA = paymentParent === "va";
  const isEwallet = paymentParent === "ewallet";
  const isRetail = paymentParent === "retail";
  const displayVA = realVaNumber || appVaNumber;

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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Menghubungi payment gateway...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {initError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.errorText}>{initError}</Text>
                <TouchableOpacity onPress={initPayment} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Coba Lagi</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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
              <Text style={styles.orderVal}>{displayOrderId}</Text>
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
                    ID2025{displayOrderId?.slice(-6)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {isVA && displayVA && (
            <View style={styles.vaCard}>
              <Text style={styles.vaCardLabel}>
                Virtual Account {paymentMethod}
              </Text>
              <View style={styles.vaCardRow}>
                <Text style={styles.vaCardNum}>{formatVA(displayVA)}</Text>
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
                Datang ke gerai {paymentMethod} terdekat dan sebutkan kode:
              </Text>
              <View style={styles.retailCodeBox}>
                <Text style={styles.retailCode}>
                  {paymentCode || displayOrderId}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.confirmBtn, confirming && styles.confirmBtnDisabled]}
            onPress={confirmPayment}
            disabled={confirming}
          >
            <Text style={styles.confirmBtnText}>
              {confirming ? "Memproses..." : "✓ Udah gw bayar"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.demoHint}>
            ⚠️ Di production, status akan auto-update via webhook Midtrans.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

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

  loadingContainer: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 16,
  },
  loadingText: { fontSize: 14, color: "#888" },

  errorBanner: {
    backgroundColor: "#FFF3CD", borderRadius: 12, padding: 14,
    flexDirection: "row", gap: 10, marginBottom: 12,
    borderWidth: 1, borderColor: "#FFE69C",
  },
  errorIcon: { fontSize: 20 },
  errorText: { fontSize: 12, color: "#856404", lineHeight: 18 },
  retryBtn: { marginTop: 6 },
  retryText: { fontSize: 12, fontWeight: "700", color: PRIMARY },

  timerCard: {
    backgroundColor: "#1a1a2e", borderRadius: 14, padding: 20,
    alignItems: "center", marginBottom: 12,
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
    padding: 12, backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 8, borderColor: PRIMARY,
    alignItems: "center", justifyContent: "center",
  },
  qrFooter: {
    flexDirection: "row", justifyContent: "space-around", width: "100%", marginTop: 16,
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
    backgroundColor: PRIMARY, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  vaCopyText: { fontSize: 11, fontWeight: "700", color: "#000" },
  instructionCard: {
    backgroundColor: "#FFFBEA", borderRadius: 12, padding: 14,
    marginTop: 16, borderWidth: 1, borderColor: "#FFE4AD",
  },
  instructionTitle: { fontSize: 13, fontWeight: "700", color: "#1a1a1a", marginBottom: 10 },
  instructionStep: { flexDirection: "row", gap: 10, marginBottom: 8, alignItems: "flex-start" },
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

  confirmBtn: {
    backgroundColor: PRIMARY, borderRadius: 14, padding: 14,
    alignItems: "center", marginTop: 8,
  },
  confirmBtnDisabled: { backgroundColor: "#FFE4AD" },
  confirmBtnText: { fontSize: 15, fontWeight: "800", color: "#000" },
  demoHint: {
    fontSize: 11, color: "#aaa", textAlign: "center",
    marginTop: 8, fontStyle: "italic",
  },
});
