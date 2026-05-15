import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatRupiah, getGroupDiscountPercent } from "../utils/helpers";

const PRIMARY = "#FFA800";
const STEPS = ["User ID", "Paket", "Bayar"];

// Paket harga dalam Rupiah - realistic Indonesia market
// Harga per diamond ~ Rp 250-300 untuk Mobile Legends/Free Fire
const PACKAGES = [
  { id: "1", amount: 86, bonus: null, price: 22000 },
  { id: "2", amount: 172, bonus: 14, price: 44000 },
  { id: "3", amount: 257, bonus: 25, price: 65000, popular: true },
  { id: "4", amount: 706, bonus: 70, price: 175000 },
  { id: "5", amount: 1412, bonus: 140, price: 349000 },
  { id: "6", amount: 2195, bonus: 250, price: 525000 },
];

const SERVERS = ["Asia", "Europe", "Americas", "SEA"];

const GAMES: Record<
  string,
  { name: string; emoji: string; hasServer: boolean; currency: string }
> = {
  "1": { name: "Mobile Legends", emoji: "🗡️", hasServer: true, currency: "Diamonds" },
  "2": { name: "Free Fire", emoji: "🔥", hasServer: false, currency: "Diamonds" },
  "3": { name: "PUBG Mobile", emoji: "🎯", hasServer: false, currency: "UC" },
  "4": { name: "Genshin Impact", emoji: "✨", hasServer: true, currency: "Genesis Crystals" },
};

export default function GameDetail({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const insets = useSafeAreaInsets();
  const gameId = route?.params?.gameId || "2";
  const game = GAMES[gameId] || GAMES["2"];

  const [step, setStep] = useState(0);
  const [userId, setUserId] = useState("");
  const [server, setServer] = useState("");
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [groupMode, setGroupMode] = useState(false);

  const canContinue = () => {
    if (step === 0) {
      if (userId.length < 3) return false;
      if (game.hasServer && server === "") return false;
      return true;
    }
    if (step === 1) return selectedPkg !== null;
    return false;
  };

  const onContinue = () => {
    if (step === 0) {
      setStep(1);
      return;
    }

    if (step === 1) {
      const pkg = PACKAGES.find((p) => p.id === selectedPkg);
      if (!pkg) return;

      if (groupMode) {
        navigation.navigate("CreateGroup", {
          game: game.name,
          gameEmoji: game.emoji,
          package: { ...pkg, label: game.currency },
          userId,
          server,
          mode: "create",
        });
      } else {
        navigation.navigate("Payment", {
          game: game.name,
          gameEmoji: game.emoji,
          package: { ...pkg, label: game.currency },
          userId,
          server,
          members: 1,
        });
      }
      return;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => (step > 0 ? setStep(step - 1) : navigation.goBack())}
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Text style={{ fontSize: 22 }}>{game.emoji}</Text>
        </View>
        <View>
          <Text style={styles.headerTitle}>{game.name}</Text>
          <Text style={styles.headerSub}>Top Up</Text>
        </View>
      </View>

      <View style={styles.stepBar}>
        {STEPS.map((s, i) => (
          <View
            key={s}
            style={[styles.stepLine, i <= step && styles.stepLineActive]}
          />
        ))}
      </View>

      <View style={styles.stepLabelRow}>
        {STEPS.map((s, i) => (
          <Text
            key={s}
            style={[styles.stepLabel, i === step && styles.stepLabelActive]}
          >
            {s}
          </Text>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {step === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Masukkan User ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 123456789"
              placeholderTextColor="#ccc"
              value={userId}
              onChangeText={setUserId}
              keyboardType="numeric"
            />
            <Text style={styles.inputHint}>
              💡 User ID bisa ditemukan di profil game kamu
            </Text>

            {game.hasServer && (
              <>
                <Text style={[styles.cardTitle, { marginTop: 20 }]}>
                  Pilih Server
                </Text>
                <View style={styles.serverGrid}>
                  {SERVERS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.serverBtn,
                        server === s && styles.serverBtnActive,
                      ]}
                      onPress={() => setServer(s)}
                    >
                      <Text
                        style={[
                          styles.serverBtnText,
                          server === s && styles.serverBtnActiveText,
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {userId.length >= 3 && (
              <View style={styles.previewBox}>
                <Text style={styles.previewText}>
                  ✓ User ID:{" "}
                  <Text style={{ fontWeight: "700", color: PRIMARY }}>
                    {userId}
                  </Text>
                </Text>
                {server ? (
                  <Text style={styles.previewText}>
                    ✓ Server:{" "}
                    <Text style={{ fontWeight: "700", color: PRIMARY }}>
                      {server}
                    </Text>
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        )}

        {step === 1 && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pilih Paket</Text>
              <Text style={styles.cardSub}>
                Untuk User ID:{" "}
                <Text style={{ color: PRIMARY, fontWeight: "700" }}>
                  {userId}
                </Text>
              </Text>
              <View style={styles.pkgGrid}>
                {PACKAGES.map((pkg) => (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[
                      styles.pkgCard,
                      selectedPkg === pkg.id && styles.pkgCardActive,
                    ]}
                    onPress={() => setSelectedPkg(pkg.id)}
                  >
                    {(pkg as any).popular && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>🔥 Popular</Text>
                      </View>
                    )}
                    <Text style={styles.pkgAmount}>{pkg.amount}</Text>
                    <Text style={styles.pkgDiamond}>💎 {game.currency}</Text>
                    {pkg.bonus && (
                      <Text style={styles.pkgBonus}>+{pkg.bonus} Bonus</Text>
                    )}
                    <Text style={styles.pkgPrice}>{formatRupiah(pkg.price)}</Text>
                    {selectedPkg === pkg.id && (
                      <Text style={styles.pkgCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.groupToggle,
                groupMode && styles.groupToggleActive,
              ]}
              onPress={() => setGroupMode(!groupMode)}
              activeOpacity={0.8}
            >
              <View style={styles.groupToggleLeft}>
                <Text style={{ fontSize: 28 }}>👥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupToggleTitle}>
                    Patungan dengan Teman?
                  </Text>
                  <Text style={styles.groupToggleSub}>
                    Hemat hingga 15% + cashback + bonus points
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.toggleSwitch,
                  groupMode && styles.toggleSwitchOn,
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    groupMode && styles.toggleKnobOn,
                  ]}
                />
              </View>
            </TouchableOpacity>

            {groupMode && (
              <View style={styles.promoCard}>
                <Text style={styles.promoTitle}>💰 Estimasi Hemat</Text>
                <View style={styles.promoRow}>
                  <Text style={styles.promoLabel}>2 orang</Text>
                  <Text style={styles.promoVal}>-{getGroupDiscountPercent(2)}%</Text>
                </View>
                <View style={styles.promoRow}>
                  <Text style={styles.promoLabel}>3 orang</Text>
                  <Text style={styles.promoVal}>-{getGroupDiscountPercent(3)}%</Text>
                </View>
                <View style={styles.promoRow}>
                  <Text style={styles.promoLabel}>4 orang</Text>
                  <Text style={styles.promoVal}>-{getGroupDiscountPercent(4)}%</Text>
                </View>
                <View style={styles.promoRow}>
                  <Text style={styles.promoLabel}>5 orang</Text>
                  <Text style={[styles.promoVal, { color: "#22c55e" }]}>
                    -{getGroupDiscountPercent(5)}% 🏆
                  </Text>
                </View>
                <View style={styles.promoDivider} />
                <Text style={styles.promoBonus}>
                  + 2% cashback ke wallet GamePay
                </Text>
                <Text style={styles.promoBonus}>
                  + Bonus GamePay Points
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[
            styles.continueBtn,
            !canContinue() && styles.continueBtnDisabled,
          ]}
          onPress={onContinue}
          disabled={!canContinue()}
        >
          <Text
            style={[
              styles.continueBtnText,
              !canContinue() && styles.continueBtnTextDisabled,
            ]}
          >
            {step === 1
              ? groupMode
                ? "Buat Group Order →"
                : "Lanjut ke Pembayaran →"
              : "Lanjutkan →"}
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 18, color: "#fff", fontWeight: "700" },
  headerIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.85)" },
  stepBar: {
    flexDirection: "row", backgroundColor: PRIMARY,
    paddingHorizontal: 20, paddingBottom: 12, gap: 6,
  },
  stepLine: { flex: 1, height: 4, backgroundColor: "rgba(255,255,255,0.35)", borderRadius: 8 },
  stepLineActive: { backgroundColor: "#fff" },
  stepLabelRow: { flexDirection: "row", backgroundColor: PRIMARY, paddingHorizontal: 20, paddingBottom: 16 },
  stepLabel: { flex: 1, fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "center" },
  stepLabelActive: { color: "#fff", fontWeight: "700" },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#333", marginBottom: 12 },
  cardSub: { fontSize: 12, color: "#aaa", marginBottom: 12, marginTop: -8 },
  input: {
    backgroundColor: "#F5F5F5", borderRadius: 10, padding: 14,
    fontSize: 16, color: "#333", marginBottom: 8,
  },
  inputHint: { fontSize: 12, color: "#aaa", marginBottom: 8 },
  previewBox: {
    backgroundColor: "#FFFBEA", borderRadius: 10, padding: 12, marginTop: 12,
    borderWidth: 1, borderColor: "#FFE4AD", gap: 4,
  },
  previewText: { fontSize: 13, color: "#555" },
  serverGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  serverBtn: {
    flex: 1, minWidth: "44%", backgroundColor: "#F5F5F5",
    borderRadius: 10, padding: 14, alignItems: "center",
    borderWidth: 1.5, borderColor: "transparent",
  },
  serverBtnActive: { borderColor: PRIMARY, backgroundColor: "#FFFBEA" },
  serverBtnText: { fontSize: 14, fontWeight: "600", color: "#555" },
  serverBtnActiveText: { color: PRIMARY },
  pkgGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pkgCard: {
    width: "47%", backgroundColor: "#F5F5F5", borderRadius: 12,
    padding: 14, alignItems: "center", borderWidth: 1.5,
    borderColor: "transparent", position: "relative", minHeight: 130,
  },
  pkgCardActive: { borderColor: PRIMARY, backgroundColor: "#FFFBEA" },
  popularBadge: {
    position: "absolute", top: -10, alignSelf: "center",
    backgroundColor: PRIMARY, borderRadius: 10,
    paddingVertical: 2, paddingHorizontal: 8,
  },
  popularText: { fontSize: 11, fontWeight: "700", color: "#000" },
  pkgAmount: { fontSize: 22, fontWeight: "800", color: "#1a1a1a", marginTop: 8 },
  pkgDiamond: { fontSize: 11, marginTop: 2, color: "#888" },
  pkgBonus: { fontSize: 11, color: PRIMARY, fontWeight: "600", marginTop: 2 },
  pkgPrice: { fontSize: 13, color: "#555", marginTop: 6, fontWeight: "700" },
  pkgCheck: { fontSize: 16, color: PRIMARY, fontWeight: "800", marginTop: 4 },
  groupToggle: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 2, borderColor: "transparent", marginBottom: 12,
  },
  groupToggleActive: { borderColor: PRIMARY, backgroundColor: "#FFFBEA" },
  groupToggleLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  groupToggleTitle: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  groupToggleSub: { fontSize: 12, color: "#888", marginTop: 2 },
  toggleSwitch: { width: 44, height: 26, borderRadius: 13, backgroundColor: "#e0e0e0", padding: 2 },
  toggleSwitchOn: { backgroundColor: PRIMARY },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  toggleKnobOn: { marginLeft: 18 },
  promoCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: "#FFE4AD",
  },
  promoTitle: { fontSize: 14, fontWeight: "800", color: "#1a1a1a", marginBottom: 12 },
  promoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  promoLabel: { fontSize: 13, color: "#555" },
  promoVal: { fontSize: 13, fontWeight: "700", color: PRIMARY },
  promoDivider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 10 },
  promoBonus: { fontSize: 12, color: "#22c55e", fontWeight: "600", marginTop: 4 },
  footer: { padding: 16, paddingTop: 8, backgroundColor: "#F5F5F5" },
  continueBtn: {
    backgroundColor: PRIMARY, borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center",
  },
  continueBtnDisabled: { backgroundColor: "#FFE4AD" },
  continueBtnText: { fontSize: 16, fontWeight: "800", color: "#000" },
  continueBtnTextDisabled: { color: "#bbb" },
});
