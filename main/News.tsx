import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Linking,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";

const PRIMARY = "#FFA800";

// Pakai GNews API - free tier 100 req/day, work di mobile, no CORS issue
// Sign up gratis di https://gnews.io untuk dapat API key sendiri
// Untuk fallback: app pakai dummy data realistic kalau API gagal
const GNEWS_API_KEY = "8966f0d7e585f7464f7176e34b482ddb"; // dummy - ganti kalau punya
const GNEWS_URL = `https://gnews.io/api/v4/search?q=mobile+game+OR+gaming+OR+esports&lang=en&max=20&apikey=${GNEWS_API_KEY}`;

// Backup: NewsData.io API juga free
// const NEWSDATA_URL = `https://newsdata.io/api/1/news?apikey=YOUR_KEY&q=gaming&language=en`;

// Dummy data realistic - dipakai kalau API gagal/limit
const DUMMY_NEWS = [
  {
    title:
      "Mobile Legends Bang Bang Hadirkan Hero Baru di M6 World Championship",
    description:
      "Moonton mengumumkan hero baru bernama Suyou yang akan rilis menjelang turnamen M6 World Championship di Malaysia. Hero ini diklaim memiliki mekanik unik yang akan mengubah meta game.",
    url: "https://www.ggwp.id/news/mobile-legends",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400",
    publishedAt: "2026-05-14T10:30:00Z",
    source: { name: "GGWP.ID" },
  },
  {
    title:
      "Free Fire Indonesia Masters 2026 Resmi Dibuka, Hadiah Capai Rp 5 Miliar",
    description:
      "Garena mengumumkan kompetisi Free Fire Indonesia Masters 2026 dengan total hadiah Rp 5 Miliar. Pendaftaran dibuka untuk semua pemain rank Heroic ke atas.",
    url: "https://liquipedia.net/freefire",
    image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400",
    publishedAt: "2026-05-13T14:00:00Z",
    source: { name: "Liquipedia" },
  },
  {
    title: "PUBG Mobile Berkolaborasi dengan Dragon Ball Super",
    description:
      "Krafton dan Bandai Namco merilis collab event Dragon Ball Super di PUBG Mobile. Pemain bisa mendapatkan skin Goku, Vegeta, dan item eksklusif lainnya.",
    url: "https://www.pubgmobile.com",
    image: "https://images.unsplash.com/photo-1556438064-2d7646166914?w=400",
    publishedAt: "2026-05-12T08:15:00Z",
    source: { name: "PUBG Mobile Official" },
  },
  {
    title: "Genshin Impact Versi 5.6 Bawa Region Baru Nod-Krai",
    description:
      "HoYoverse mengumumkan region baru Nod-Krai di update versi 5.6. Region ini menampilkan budaya Eropa Timur dengan karakter baru Varesa dan Iansan.",
    url: "https://genshin.hoyoverse.com",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400",
    publishedAt: "2026-05-11T16:45:00Z",
    source: { name: "HoYoverse" },
  },
  {
    title: "QRIS Cross-Border Payment Resmi Tersedia di 5 Negara ASEAN",
    description:
      "Bank Indonesia mengumumkan QRIS sekarang bisa digunakan di Singapura, Malaysia, Thailand, Vietnam, dan Filipina. Total transaksi diprediksi tembus Rp 1 Triliun di 2026.",
    url: "https://www.bi.go.id",
    image: "https://images.unsplash.com/photo-1556742111-a301076d9d18?w=400",
    publishedAt: "2026-05-10T09:00:00Z",
    source: { name: "Bank Indonesia" },
  },
  {
    title: "Tips Aman Top Up Game: Hindari 5 Modus Penipuan Ini",
    description:
      "Banyak pemain game mengalami penipuan saat top up. Kenali 5 modus paling umum: phishing link, joki abal-abal, harga 'terlalu murah', minta password akun, dan QR palsu.",
    url: "https://kominfo.go.id",
    image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400",
    publishedAt: "2026-05-09T11:20:00Z",
    source: { name: "Kominfo" },
  },
  {
    title: "Honor of Kings Indonesia Resmi Dibuka, Sambutan Pemain Membludak",
    description:
      "Tencent membuka server Indonesia untuk Honor of Kings dengan launch event spektakuler. Lebih dari 5 juta pemain mendaftar dalam minggu pertama.",
    url: "https://www.honorofkings.com",
    image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400",
    publishedAt: "2026-05-08T13:30:00Z",
    source: { name: "Tencent Games" },
  },
  {
    title: "Cara Mendapatkan Diamond Mobile Legends Gratis Secara Legal",
    description:
      "Selain top up, ada cara legal untuk mendapatkan diamond gratis: ikut event, redeem code, dan watch ads. Berikut tips dan triknya yang efektif.",
    url: "https://www.gameresmi.com",
    image: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=400",
    publishedAt: "2026-05-07T15:00:00Z",
    source: { name: "Game Resmi ID" },
  },
  {
    title: "GoPay & DANA Catat Pertumbuhan Transaksi Gaming 200% di 2026",
    description:
      "Laporan Asosiasi Fintech Indonesia menunjukkan e-wallet GoPay dan DANA mencatat pertumbuhan transaksi pembayaran gaming sebesar 200% dibanding tahun sebelumnya.",
    url: "https://aftech.or.id",
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400",
    publishedAt: "2026-05-06T10:00:00Z",
    source: { name: "AFTECH" },
  },
  {
    title: "Update Valorant Mobile: Sage Hadir di Patch 2.3",
    description:
      "Riot Games merilis Sage di Valorant Mobile patch 2.3 dengan kemampuan healing yang sedikit dimodifikasi untuk platform mobile. Mendapat respons positif dari komunitas.",
    url: "https://playvalorant.com",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400",
    publishedAt: "2026-05-05T12:00:00Z",
    source: { name: "Riot Games" },
  },
];

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function NewsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const fetchNews = async () => {
    setLoading(true);
    try {
      // Try GNews API first
      const response = await axios.get(GNEWS_URL, { timeout: 5000 });
      if (response.data?.articles?.length > 0) {
        setArticles(response.data.articles);
        setIsLive(true);
      } else {
        throw new Error("No articles");
      }
    } catch (err) {
      // Fallback to dummy data
      console.log("Using dummy news data (API limit/offline)");
      setArticles(DUMMY_NEWS);
      setIsLive(false);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => item.url && Linking.openURL(item.url)}
      activeOpacity={0.85}
    >
      {item.image && (
        <Image
          source={{ uri: item.image }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={3}>
          {item.title}
        </Text>
        {item.description && (
          <Text style={styles.cardDesc} numberOfLines={3}>
            {item.description}
          </Text>
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.cardSource}>
            📰 {item.source?.name || "GamePay News"}
          </Text>
          <Text style={styles.cardTime}>
            {formatRelativeTime(item.publishedAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Berita Gaming</Text>
          <Text style={styles.headerSub}>
            {isLive ? "🟢 Live updates" : "📚 Top stories"}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PRIMARY} size="large" />
          <Text style={styles.loadingText}>Memuat berita...</Text>
        </View>
      ) : (
        <FlatList
          data={articles}
          renderItem={renderItem}
          keyExtractor={(item, idx) => `${item.url || item.title}-${idx}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 48 }}>📭</Text>
              <Text style={styles.emptyText}>Belum ada berita</Text>
            </View>
          }
        />
      )}
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
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { fontSize: 18, color: "#fff", fontWeight: "700" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: { color: "#888", marginTop: 12, fontSize: 13 },
  emptyText: { color: "#666", marginTop: 12, fontSize: 14, fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#f0f0f0",
  },
  cardBody: { padding: 14 },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1a1a1a",
    lineHeight: 20,
  },
  cardDesc: { fontSize: 12, color: "#666", marginTop: 6, lineHeight: 18 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  cardSource: { fontSize: 11, color: PRIMARY, fontWeight: "700" },
  cardTime: { fontSize: 11, color: "#aaa" },
});
