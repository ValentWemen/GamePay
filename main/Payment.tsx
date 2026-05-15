import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Share,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  formatRupiah,
  generateVA,
  formatVA,
  generateOrderId,
  calculatePriceBreakdown,
  PriceBreakdown,
} from "../utils/helpers";

const PRIMARY = "#FFA800";

type Method = {
  id: string;
  label: string;
  icon: string;
  description?: string;
  children: { id: string; name: string; logo: string; fee?: number }[];
};

const PAYMENT_METHODS: Method[] = [
  {
    id: "qris",
    label: "QRIS",
    icon: "📱",
    description: "Scan QR sekali untuk semua e-wallet & m-banking",
    children: [{ id: "qris-all", name: "QRIS (Semua Bank & E-Wallet)", logo: "📲", fee: 0 }],
  },
  {
    id: "va",
    label: "Virtual Account",
    icon: "🏦",
    description: "Transfer dari ATM/m-banking",
    children: [
      { id: "BCA", name: "BCA Virtual Account", logo: "🔵", fee: 0 },
      { id: "Mandiri", name: "Mandiri Virtual Account", logo: "🟡", fee: 0 },
      { id: "BRI", name: "BRI Virtual Account", logo: "🔴", fee: 0 },
      { id: "BNI", name: "BNI Virtual Account", logo: "🟠", fee: 0 },
      { id: "Permata", name: "Permata Virtual Account", logo: "🟢", fee: 0 },
      { id: "CIMB", name: "CIMB Niaga Virtual Account", logo: "🟣", fee: 0 },
    ],
  },
  {
    id: "ewallet",
    label: "E-Wallet",
    icon: "💰",
    description: "Bayar instan via aplikasi",
    children: [
      { id: "GoPay", name: "GoPay", logo: "💚", fee: 0 },
      { id: "OVO", name: "OVO", logo: "💜", fee: 0 },
      { id: "DANA", name: "DANA", logo: "🔵", fee: 0 },
      { id: "ShopeePay", name: "ShopeePay", logo: "🟠", fee: 0 },
      { id: "LinkAja", name: "LinkAja", logo: "🔴", fee: 0 },
    ],
  },
  {
    id: "retail",
    label: "Gerai Retail",
    icon: "🏪",
    description: "Bayar di minimarket terdekat",
    children: [
      { id: "Indomaret", name: "Indomaret", logo: "🔵", fee: 2500 },
      { id: "Alfamart", name: "Alfamart", logo: "🔴", fee: 2500 },
    ],
  },
];

const EWALLET_DEEPLINKS: Record<string, string> = {
  GoPay: "gojek://gopay",
  OVO: "ovo://",
  DANA: "dana://",
  ShopeePay: "shopeeid://",
  LinkAja: "linkaja://",
};

export default function Payment({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const insets = useSafeAreaInsets();

  const {
    game = "Free Fire",
    gameEmoji = "🔥",
    package: pkg = { amount: 500, bonus: 75, price: 65000, label: "Diamonds" },
    userId = "",
    server = "",
    members = 1,
    groupCode = null,
  } = route?.params || {};

  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<{
    parent: string;
    child: string;
    fee: number;
  } | null>(null);

  const orderId = useMemo(() => generateOrderId(), []);
  const vaNumbers = useMemo(
    () => ({
      BCA: generateVA("BCA", userId),
      Mandiri: generateVA("Mandiri", userId),
      BRI: generateVA("BRI", userId),
      BNI: generateVA("BNI", userId),
      Permata: generateVA("Permata", userId),
      CIMB: generateVA("CIMB", userId),
    }),
    [userId],
  );

  const breakdown: PriceBreakdown = useMemo(
    () => calculatePriceBreakdown(pkg.price, members),
    [pkg.price, members],
  );

  const myAmount = breakdown.pricePerPerson;
  const finalAmount = myAmount + (selectedMethod?.fee || 0);

  const toggle = (id: string) => setExpanded((p) => (p === id ? null : id));

  const copyVA = async (va: string, bank: string) => {
    await Clipboard.setStringAsync(va);
    Alert.alert("✓ Tersalin", `Nomor VA ${bank} berhasil disalin`);
  };

  const openEwallet = async (wallet: string) => {
    const deeplink = EWALLET_DEEPLINKS[wallet];
    if (!deeplink) return;
    try {
      const can = await Linking.canOpenURL(deeplink);
      if (can) {
        await Linking.openURL(deeplink);
      } else {
        Alert.alert(
          `${wallet} tidak terinstall`,
          `Silakan install aplikasi ${wallet} terlebih dahulu, atau pilih metode pembayaran lain.`,
        );
      }
    } catch {
      Alert.alert("Gagal membuka aplikasi", "Coba metode lain.");
    }
  };

  const shareOrder = async () => {
    try {
      await Share.share({
        message:
          `🎮 Top Up ${game}\n` +
          `Order ID: ${orderId}\n` +
          `Total: ${formatRupiah(finalAmount)}\n\n` +
          `Bayar di GamePay app! 💳`,
      });
    } catch {}
  };

  const onPay = () => {
    if (!selectedMethod) return;
    navigation.navigate("Processing", {
      game,
      gameEmoji,
      package: pkg,
      userId,
      server,
      paymentMethod: selectedMethod.child,
      paymentParent: selectedMethod.parent,
      orderId,
      vaNumber: vaNumbers[selectedMethod.child as keyof typeof vaNumbers],
      amount: finalAmount,
      members,
      groupCode,
      breakdown,
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pembayaran</Text>
        <TouchableOpacity onPress={shareOrder} style={styles.backBtn}>
          <Text style={styles.backArrow}>↗</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.orderSummary}>
          <View style={styles.orderLeft}>
            <Text style={{ fontSize: 28 }}>{gameEmoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderGame}>{game}</Text>
              <Text style={styles.orderDesc}>
                {pkg?.amount} {pkg?.label || "Diamonds"}
                {pkg?.bonus ? ` + ${pkg.bonus} Bonus` : ""}
              </Text>
              {userId ? (
                <Text style={styles.orderMeta}>
                  ID: {userId}
                  {server ? ` • ${server}` : ""}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.orderPrice}>{formatRupiah(myAmount)}</Text>
            {breakdown.isGroupOrder && (
              <Text style={styles.orderShare}>bagian kamu</Text>
            )}
          </View>
        </View>

        {breakdown.isGroupOrder && (
          <View style={styles.groupBanner}>
            <Text style={styles.groupBannerEmoji}>👥</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.groupBannerTitle}>
                Group Order • {breakdown.members} orang
              </Text>
              <Text style={styles.groupBannerSub}>
                Hemat {breakdown.groupDiscountPercent}% • Cashback{" "}
                {formatRupiah(breakdown.cashback)} • +{breakdown.bonusPoints} pts
              </Text>
            </View>
          </View>
        )}

        <View style={styles.orderIdRow}>
          <Text style={styles.orderIdLabel}>Order ID</Text>
          <TouchableOpacity
            onPress={async () => {
              await Clipboard.setStringAsync(orderId);
              Alert.alert("✓ Tersalin", "Order ID berhasil disalin");
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <Text style={styles.orderIdVal}>{orderId}</Text>
            <Text style={{ fontSize: 14 }}>📋</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Pilih Metode Pembayaran</Text>

        {PAYMENT_METHODS.map((m) => (
          <View key={m.id} style={styles.methodCard}>
            <TouchableOpacity
              style={styles.methodRow}
              onPress={() => toggle(m.id)}
            >
              <View style={styles.methodLeft}>
                <View style={styles.methodIconWrap}>
                  <Text style={{ fontSize: 20 }}>{m.icon}</Text>
                </View>
                <View>
                  <Text style={styles.methodLabel}>{m.label}</Text>
                  {m.description && (
                    <Text style={styles.methodDesc}>{m.description}</Text>
                  )}
                </View>
              </View>
              <Text style={styles.methodArrow}>
                {expanded === m.id ? "˅" : "›"}
              </Text>
            </TouchableOpacity>

            {expanded === m.id && (
              <View style={styles.childList}>
                {m.children.map((c) => {
                  const isSelected =
                    selectedMethod?.parent === m.id &&
                    selectedMethod?.child === c.id;
                  return (
                    <View key={c.id}>
                      <TouchableOpacity
                        style={[
                          styles.childItem,
                          isSelected && styles.childItemActive,
                        ]}
                        onPress={() =>
                          setSelectedMethod({
                            parent: m.id,
                            child: c.id,
                            fee: c.fee || 0,
                          })
                        }
                      >
                        <View style={styles.childLeft}>
                          <Text style={{ fontSize: 18 }}>{c.logo}</Text>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.childText,
                                isSelected && styles.childTextActive,
                              ]}
                            >
                              {c.name}
                            </Text>
                            {c.fee ? (
                              <Text style={styles.childFee}>
                                Biaya: {formatRupiah(c.fee)}
                              </Text>
                            ) : (
                              <Text style={styles.childFeeFree}>
                                ✓ Gratis biaya admin
                              </Text>
                            )}
                          </View>
                        </View>
                        {isSelected && (
                          <Text style={{ color: PRIMARY, fontWeight: "700", fontSize: 16 }}>
                            ✓
                          </Text>
                        )}
                      </TouchableOpacity>

                      {isSelected && m.id === "va" && (
                        <View style={styles.vaPreview}>
                          <Text style={styles.vaPreviewLabel}>
                            Nomor Virtual Account
                          </Text>
                          <View style={styles.vaNumberRow}>
                            <Text style={styles.vaNumber}>
                              {formatVA(
                                vaNumbers[c.id as keyof typeof vaNumbers],
                              )}
                            </Text>
                            <TouchableOpacity
                              onPress={() =>
                                copyVA(
                                  vaNumbers[c.id as keyof typeof vaNumbers],
                                  c.id,
                                )
                              }
                              style={styles.copyBtn}
                            >
                              <Text style={styles.copyBtnText}>📋 Salin</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.vaHint}>
                            💡 Transfer tepat {formatRupiah(finalAmount)} ke nomor di atas
                          </Text>
                        </View>
                      )}

                      {isSelected && m.id === "ewallet" && (
                        <TouchableOpacity
                          style={styles.ewalletOpenBtn}
                          onPress={() => openEwallet(c.id)}
                        >
                          <Text style={styles.ewalletOpenText}>
                            🚀 Buka aplikasi {c.id}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ))}

        <View style={styles.priceCard}>
          <Text style={styles.priceTitle}>Rincian Pembayaran</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Harga Paket</Text>
            <Text style={styles.priceVal}>{formatRupiah(breakdown.subtotal)}</Text>
          </View>

          {breakdown.isGroupOrder && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: "#22c55e" }]}>
                Diskon Group ({breakdown.groupDiscountPercent}%)
              </Text>
              <Text style={[styles.priceVal, { color: "#22c55e" }]}>
                -{formatRupiah(breakdown.groupDiscount)}
              </Text>
            </View>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Biaya Layanan</Text>
            <Text style={styles.priceVal}>
              {formatRupiah(breakdown.serviceFee)}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>PPN 11%</Text>
            <Text style={styles.priceVal}>{formatRupiah(breakdown.tax)}</Text>
          </View>

          {selectedMethod && selectedMethod.fee > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Biaya Channel</Text>
              <Text style={styles.priceVal}>
                {formatRupiah(selectedMethod.fee)}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalVal}>
              {formatRupiah(breakdown.total + (selectedMethod?.fee || 0))}
            </Text>
          </View>

          {breakdown.isGroupOrder && (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>
                  Bagian Kamu ({breakdown.members} org)
                </Text>
                <Text style={[styles.totalVal, { color: PRIMARY, fontSize: 18 }]}>
                  {formatRupiah(finalAmount)}
                </Text>
              </View>
              <View style={styles.bonusBox}>
                <Text style={styles.bonusText}>
                  🎁 Kamu dapat: Cashback {formatRupiah(Math.round(breakdown.cashback / breakdown.members))} + {Math.floor(breakdown.bonusPoints / breakdown.members)} pts
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.payBtn, !selectedMethod && styles.payBtnDisabled]}
          onPress={onPay}
          disabled={!selectedMethod}
        >
          <Text
            style={[
              styles.payBtnText,
              !selectedMethod && styles.payBtnTextDisabled,
            ]}
          >
            {selectedMethod
              ? `Bayar ${formatRupiah(finalAmount)}`
              : "Pilih Metode Pembayaran"}
          </Text>
        </TouchableOpacity>
      </View>
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
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },

  orderSummary: {
    backgroundColor: "#fff",
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    borderRadius: 14, padding: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  orderLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  orderGame: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  orderDesc: { fontSize: 12, color: "#888", marginTop: 2 },
  orderMeta: { fontSize: 11, color: "#aaa", marginTop: 2 },
  orderPrice: { fontSize: 18, fontWeight: "800", color: PRIMARY },
  orderShare: { fontSize: 10, color: "#888", marginTop: 2 },

  groupBanner: {
    marginHorizontal: 16,
    backgroundColor: "#FFFBEA",
    borderRadius: 12, padding: 12,
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderColor: "#FFE4AD",
  },
  groupBannerEmoji: { fontSize: 24 },
  groupBannerTitle: { fontSize: 13, fontWeight: "700", color: "#1a1a1a" },
  groupBannerSub: { fontSize: 11, color: "#888", marginTop: 2 },

  orderIdRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 16, paddingVertical: 12,
  },
  orderIdLabel: { fontSize: 12, color: "#888" },
  orderIdVal: { fontSize: 12, color: "#1a1a1a", fontWeight: "700" },

  sectionTitle: {
    fontSize: 14, fontWeight: "700", color: "#333",
    marginBottom: 10, marginTop: 8, marginHorizontal: 16,
  },

  methodCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginHorizontal: 16, marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  methodRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", padding: 16,
  },
  methodLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  methodIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: "#FFFBEA",
    alignItems: "center", justifyContent: "center",
  },
  methodLabel: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  methodDesc: { fontSize: 11, color: "#888", marginTop: 2 },
  methodArrow: { fontSize: 16, color: "#aaa" },

  childList: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  childItem: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10, padding: 12,
    borderWidth: 1.5, borderColor: "transparent",
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  childItemActive: { borderColor: PRIMARY, backgroundColor: "#FFFBEA" },
  childLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  childText: { fontSize: 13, color: "#555", fontWeight: "600" },
  childTextActive: { color: PRIMARY, fontWeight: "700" },
  childFee: { fontSize: 11, color: "#888", marginTop: 2 },
  childFeeFree: { fontSize: 11, color: "#22c55e", marginTop: 2 },

  vaPreview: {
    backgroundColor: "#1a1a2e",
    borderRadius: 10, padding: 14, marginTop: -4,
  },
  vaPreviewLabel: { fontSize: 11, color: "#aaa", marginBottom: 6 },
  vaNumberRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  vaNumber: {
    fontSize: 16, fontWeight: "800", color: "#fff", letterSpacing: 1,
    fontFamily: "monospace",
  },
  copyBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  copyBtnText: { fontSize: 11, fontWeight: "700", color: "#000" },
  vaHint: { fontSize: 11, color: "#FFE4AD", marginTop: 8 },

  ewalletOpenBtn: {
    backgroundColor: "#1a1a2e",
    borderRadius: 10, padding: 12, alignItems: "center", marginTop: -4,
  },
  ewalletOpenText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  priceCard: {
    backgroundColor: "#fff",
    borderRadius: 14, padding: 16,
    marginHorizontal: 16, marginTop: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  priceTitle: {
    fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 5, alignItems: "center",
  },
  priceLabel: { fontSize: 13, color: "#888" },
  priceVal: { fontSize: 13, color: "#1a1a1a", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 8 },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  totalVal: { fontSize: 15, fontWeight: "800", color: PRIMARY },

  bonusBox: {
    backgroundColor: "#e6f9ee", borderRadius: 8, padding: 10, marginTop: 10,
  },
  bonusText: { fontSize: 12, color: "#22c55e", fontWeight: "600", textAlign: "center" },

  footer: { padding: 16, paddingTop: 8, backgroundColor: "#F5F5F5" },
  payBtn: {
    backgroundColor: PRIMARY, borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center",
  },
  payBtnDisabled: { backgroundColor: "#FFE4AD" },
  payBtnText: { fontSize: 16, fontWeight: "800", color: "#000" },
  payBtnTextDisabled: { color: "#bbb" },
});
