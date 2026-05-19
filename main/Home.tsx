import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { supabase } from "../user/Supabase";
import BottomNav from "./BottomNav";

const PRIMARY = "#FFA800";
const { width: SW } = Dimensions.get("window");

const GAME_LOGOS: Record<string, any> = {
  "Mobile Legends": require("../assets/games/mobilelegend.png"),
  "Free Fire": require("../assets/games/freefire.png"),
  "PUBG Mobile": require("../assets/games/PUBG.png"),
  "Genshin Impact": require("../assets/games/Genshin.png"),
};

const GAMES = [
  {
    id: "022c03ac-e449-4950-be95-b5fb6bedc2ac",
    name: "Mobile Legends",
    category: "MOBA",
    bg: "#1A237E",
    badge: null,
  },
  {
    id: "aaaaaaaa-0000-0000-0000-000000000001",
    name: "Free Fire",
    category: "FPS",
    bg: "#FF6B00",
    badge: "Hot",
  },
  {
    id: "aaaaaaaa-0000-0000-0000-000000000002",
    name: "PUBG Mobile",
    category: "FPS",
    bg: "#1a1a1a",
    badge: null,
  },
  {
    id: "b3867163-23bf-48ba-8f59-b0de2560a568",
    name: "Genshin Impact",
    category: "RPG",
    bg: "#1B3A6B",
    badge: "Promo",
  },
];

const QUICK = [
  { id: "022c03ac-e449-4950-be95-b5fb6bedc2ac", name: "Mobile\nLegends" },
  { id: "aaaaaaaa-0000-0000-0000-000000000001", name: "Free Fire" },
  { id: "aaaaaaaa-0000-0000-0000-000000000002", name: "PUBG\nMobile" },
];

const BANNERS = [
  {
    id: "1",
    text: "Patungan 5 orang = hemat 15%",
    sub: "Squad lengkap, bayar masing-masing. Done.",
  },
  {
    id: "2",
    text: "Gak ada yang nalangin lagi",
    sub: "Tiap orang bayar bagiannya. Otomatis.",
  },
  {
    id: "3",
    text: "Top-up jalan saat semua bayar",
    sub: "Gak ribet nagih-nagih ke grup WhatsApp.",
  },
];

type SquadMember = {
  name: string;
  count: number;
};

export default function Home({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [bannerIdx, setBannerIdx] = useState(0);
  const bannerRef = useRef<ScrollView>(null);
  const idxRef = useRef(0);
  const [squadMembers, setSquadMembers] = useState<SquadMember[]>([]);

  // Fetch squad mabar dari group_members — siapa yang sering satu group sama current user
  const loadSquad = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Ambil semua group_id yang pernah diikuti current user
      const { data: myGroups } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", session.user.id);

      if (!myGroups || myGroups.length === 0) return;

      const groupIds = myGroups.map((g) => g.group_id);

      // Ambil semua member dari group-group tersebut, kecuali diri sendiri
      const { data: coMembers } = await supabase
        .from("group_members")
        .select("user_name")
        .in("group_id", groupIds)
        .neq("user_id", session.user.id);

      if (!coMembers || coMembers.length === 0) return;

      // Hitung frekuensi per nama
      const freq: Record<string, number> = {};
      coMembers.forEach((m) => {
        freq[m.user_name] = (freq[m.user_name] || 0) + 1;
      });

      // Sort by count, ambil top 4
      const sorted = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, count]) => ({ name, count }));

      setSquadMembers(sorted);
    } catch (e) {
      console.error("loadSquad error:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSquad();
    }, []),
  );

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

  // Inisial avatar untuk squad
  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoIcon}>
            <Text style={{ fontSize: 18 }}>🎮</Text>
          </View>
          <View>
            <Text style={styles.logoText}>GamePay</Text>
            <Text style={styles.logoSub}>Top-up patungan, gak ada drama.</Text>
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

        {/* Squad Mabar — hanya tampil kalau ada data real */}
        {squadMembers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Squad mabar kamu</Text>
            <Text style={styles.sectionSubtitle}>
              Sering top-up bareng mereka
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {squadMembers.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.squadCard}
                  onPress={() => navigation.navigate("Group")}
                >
                  <View style={styles.squadAvatar}>
                    <Text style={styles.squadAvatarText}>
                      {getInitial(s.name)}
                    </Text>
                  </View>
                  <Text style={styles.squadName} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={styles.squadCount}>{s.count}× bareng</Text>
                  <View style={styles.squadAjakBtn}>
                    <Text style={styles.squadAjakText}>Ajak lagi</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sering kamu top-up</Text>
          </View>
          <View style={styles.quickRow}>
            {QUICK.map((q) => {
              const game = GAMES.find((g) => g.id === q.id)!;
              return (
                <TouchableOpacity
                  key={q.id}
                  style={styles.quickCard}
                  onPress={() =>
                    navigation.navigate("GameDetail", { gameId: q.id })
                  }
                >
                  <View
                    style={[styles.quickLogoWrap, { backgroundColor: game.bg }]}
                  >
                    <Image
                      source={GAME_LOGOS[game.name]}
                      style={{ width: 36, height: 36 }}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.quickName}>{q.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lagi rame di squad</Text>
          </View>
          <View style={styles.gamesGrid}>
            {filtered.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[styles.gameCard, { backgroundColor: g.bg }]}
                onPress={() =>
                  navigation.navigate("GameDetail", { gameId: g.id })
                }
              >
                {g.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{g.badge}</Text>
                  </View>
                )}
                <Image
                  source={GAME_LOGOS[g.name]}
                  style={{ width: 52, height: 52, marginBottom: 8 }}
                  resizeMode="contain"
                />
                <Text style={[styles.gameName, { color: "#fff" }]}>
                  {g.name}
                </Text>
                <Text
                  style={[styles.gameSub, { color: "rgba(255,255,255,0.7)" }]}
                >
                  {g.category} • Top up
                </Text>
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
              Buka group order, share kode, squad bayar sendiri-sendiri.
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 18, fontWeight: "800", color: "#fff" },
  logoSub: { fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 1 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: "#333" },
  bannerSection: { paddingHorizontal: 16, paddingTop: 16 },
  bannerCard: {
    width: SW - 32,
    backgroundColor: "#1a1a2e",
    borderRadius: 14,
    padding: 22,
    marginRight: 0,
    minHeight: 110,
    justifyContent: "center",
  },
  bannerText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  bannerSub: { fontSize: 13, color: "rgba(255,255,255,0.85)" },
  bannerCTA: { fontSize: 12, color: PRIMARY, fontWeight: "700", marginTop: 8 },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: { width: 18, height: 4, borderRadius: 2, backgroundColor: "#ddd" },
  dotActive: { backgroundColor: PRIMARY },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  sectionSubtitle: {
    fontSize: 12,
    color: "#aaa",
    marginBottom: 12,
    marginTop: 2,
  },

  squadCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    marginRight: 10,
    width: 85,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  squadAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  squadAvatarText: { fontSize: 18, fontWeight: "800", color: "#fff" },
  squadName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  squadCount: { fontSize: 10, color: "#aaa", marginBottom: 8 },
  squadAjakBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  squadAjakText: { fontSize: 10, fontWeight: "700", color: "#000" },

  quickRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  quickCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  quickLogoWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickName: {
    fontSize: 12,
    color: "#444",
    textAlign: "center",
    fontWeight: "500",
  },
  gamesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 },
  gameCard: {
    width: (SW - 44) / 2,
    borderRadius: 14,
    padding: 14,
    minHeight: 120,
  },
  badge: {
    alignSelf: "flex-end",
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  gameName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  gameSub: { fontSize: 11, color: "#888" },
  groupBanner: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  groupIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  groupTitle: { fontSize: 15, fontWeight: "800", color: "#fff" },
  groupSub: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  groupArrow: { fontSize: 18, color: "#fff", fontWeight: "600" },
});
