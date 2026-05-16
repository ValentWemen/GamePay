import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomNav from "./BottomNav";

const PRIMARY = "#FFA800";
const { width: SW } = Dimensions.get("window");

const GAMES = [
  { id: "022c03ac-e449-4950-be95-b5fb6bedc2ac", name: "Mobile Legends", category: "MOBA", emoji: "🗡️", bg: "#EDECFF", badge: null },
  { id: "aaaaaaaa-0000-0000-0000-000000000001", name: "Free Fire",      category: "FPS",  emoji: "🔥", bg: "#FFFFDF", badge: "Hot" },
  { id: "aaaaaaaa-0000-0000-0000-000000000002", name: "PUBG Mobile",    category: "FPS",  emoji: "🎯", bg: "#FFFFF4", badge: null },
  { id: "b3867163-23bf-48ba-8f59-b0de2560a568", name: "Genshin Impact", category: "RPG",  emoji: "✨", bg: "#EDF4FF", badge: "Promo" },
];

const QUICK = [
  { id: "022c03ac-e449-4950-be95-b5fb6bedc2ac", name: "Mobile\nLegends", emoji: "🗡️" },
  { id: "aaaaaaaa-0000-0000-0000-000000000001", name: "Free Fire",        emoji: "🔥" },
  { id: "aaaaaaaa-0000-0000-0000-000000000002", name: "PUBG\nMobile",     emoji: "🎯" },
];

const BANNERS = [
  { id: "1", text: "Diskon Group s/d 15%", sub: "Patungan bareng teman lebih hemat!" },
  { id: "2", text: "Cashback 2% ke Wallet", sub: "Setiap top-up via group order" },
  { id: "3", text: "Bonus GamePay Points", sub: "Kumpulkan poin tiap transaksi" },
];

export default function Home({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [bannerIdx, setBannerIdx] = useState(0);
  const bannerRef = useRef<ScrollView>(null);
  const idxRef = useRef(0);

  useEffect(() => {
    const t = setInterval(() => {
      const next = (idxRef.current + 1) % BANNERS.length;
      bannerRef.current?.scrollTo({ x: next * (SW - 32), animated: true });
      idxRef.current = next;
      setBannerIdx(next);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  const filtered = GAMES.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoIcon}>
            <Text style={{ fontSize: 18 }}>🎮</Text>
          </View>
          <View>
            <Text style={styles.logoText}>GamePay</Text>
            <Text style={styles.logoSub}>Top up game favoritmu</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("News")}
          style={styles.headerBtn}
        >
          <Text style={{ fontSize: 18 }}>📰</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.searchWrap, { marginTop: -1 }]}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Cari game..."
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <View style={styles.bannerSection}>
          <ScrollView
            ref={bannerRef}
            horizontal
            pagingEnabled={false}
            snapToInterval={SW - 32}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / (SW - 32));
              idxRef.current = i;
              setBannerIdx(i);
            }}
          >
            {BANNERS.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.bannerCard}
                onPress={() => navigation.navigate("Group")}
                activeOpacity={0.85}
              >
                <Text style={styles.bannerText}>{b.text}</Text>
                <Text style={styles.bannerSub}>{b.sub}</Text>
                <Text style={styles.bannerCTA}>Coba Sekarang →</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.dots}>
            {BANNERS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === bannerIdx && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Up Cepat</Text>
          </View>
          <View style={styles.quickRow}>
            {QUICK.map((q) => (
              <TouchableOpacity
                key={q.id}
                style={styles.quickCard}
                onPress={() => navigation.navigate("GameDetail", { gameId: q.id })}
              >
                <Text style={styles.quickEmoji}>{q.emoji}</Text>
                <Text style={styles.quickName}>{q.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Game Populer</Text>
          </View>
          <View style={styles.gamesGrid}>
            {filtered.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[styles.gameCard, { backgroundColor: g.bg }]}
                onPress={() => navigation.navigate("GameDetail", { gameId: g.id })}
              >
                {g.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{g.badge}</Text>
                  </View>
                )}
                <Text style={styles.gameEmoji}>{g.emoji}</Text>
                <Text style={styles.gameName}>{g.name}</Text>
                <Text style={styles.gameSub}>{g.category} • Top up</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.groupBanner}
          onPress={() => navigation.navigate("Group")}
        >
          <View style={styles.groupIconWrap}>
            <Text style={{ fontSize: 22 }}>👥</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.groupTitle}>Group Order</Text>
            <Text style={styles.groupSub}>
              Patungan dengan teman, hemat hingga 15%!
            </Text>
          </View>
          <Text style={styles.groupArrow}>›</Text>
        </TouchableOpacity>

        <View style={{ height: 90 }} />
      </ScrollView>

      <BottomNav active="Home" navigation={navigation} />
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
  logoIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  logoText: { fontSize: 18, fontWeight: "800", color: "#fff" },
  logoSub: { fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 1 },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  searchWrap: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 12,
    paddingHorizontal: 14, height: 46,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: "#333" },
  bannerSection: { paddingHorizontal: 16, paddingTop: 16 },
  bannerCard: {
    width: SW - 32, backgroundColor: "#1a1a2e",
    borderRadius: 14, padding: 22, marginRight: 0,
    minHeight: 110, justifyContent: "center",
  },
  bannerText: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 4 },
  bannerSub: { fontSize: 13, color: "rgba(255,255,255,0.85)" },
  bannerCTA: { fontSize: 12, color: PRIMARY, fontWeight: "700", marginTop: 8 },
  dots: {
    flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10,
  },
  dot: { width: 18, height: 4, borderRadius: 2, backgroundColor: "#ddd" },
  dotActive: { backgroundColor: PRIMARY },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  quickRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  quickCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14,
    padding: 14, alignItems: "center",
    borderWidth: 1, borderColor: "#f0f0f0",
  },
  quickEmoji: { fontSize: 28, marginBottom: 6 },
  quickName: { fontSize: 12, color: "#444", textAlign: "center", fontWeight: "500" },
  gamesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 },
  gameCard: { width: (SW - 44) / 2, borderRadius: 14, padding: 14, minHeight: 120 },
  badge: {
    alignSelf: "flex-end", backgroundColor: PRIMARY,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6,
  },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  gameEmoji: { fontSize: 36, marginBottom: 8 },
  gameName: { fontSize: 13, fontWeight: "700", color: "#1a1a1a", marginBottom: 2 },
  gameSub: { fontSize: 11, color: "#888" },
  groupBanner: {
    marginHorizontal: 16, marginTop: 20,
    backgroundColor: PRIMARY, borderRadius: 14, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  groupIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  groupTitle: { fontSize: 15, fontWeight: "800", color: "#fff" },
  groupSub: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  groupArrow: { fontSize: 18, color: "#fff", fontWeight: "600" },
});
