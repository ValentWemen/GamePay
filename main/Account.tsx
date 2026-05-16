import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../user/Supabase";
import BottomNav from "./BottomNav";

const PRIMARY = "#FFA800";

const MENU = [
  {
    section: "Akun",
    items: [
      { label: "Edit Profil", icon: "✏️", screen: "EditProfile", color: "#FFFBEA" },
    ],
  },
  {
    section: "Keamanan",
    items: [
      { label: "Ganti Password", icon: "🔒", screen: "ChangePassword", color: "#E6FFFE" },
      { label: "Pengaturan Keamanan", icon: "🛡️", screen: "SecuritySettings", color: "#E6FFFE" },
    ],
  },
  {
    section: "Info & Bantuan",
    items: [
      { label: "Berita Gaming", icon: "📰", screen: "News", color: "#EDF4FF" },
      { label: "Pusat Bantuan", icon: "❓", screen: "HelpCenter", color: "#FFFBEA" },
      { label: "Syarat & Privasi", icon: "📋", screen: "Terms", color: "#F5F5F5" },
    ],
  },
];

export default function Account({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setProfile({ ...data, email: session.user.email });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onLogout = () => {
    Alert.alert("Keluar", "Yakin mau logout?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          navigation.replace("Auth");
        },
      },
    ]);
  };

  if (loading)
    return (
      <ActivityIndicator color={PRIMARY} style={{ flex: 1, marginTop: 100 }} />
    );

  const displayName =
    profile?.display_name || profile?.full_name || profile?.email?.split("@")[0] || "User";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      })
    : "Januari 2026";

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Akun</Text>
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate("EditProfile")}
        >
          <View style={styles.avatarCircle}>
            <Text style={{ fontSize: 28 }}>😊</Text>
            <View style={styles.cameraIcon}>
              <Text style={{ fontSize: 10 }}>📷</Text>
            </View>
          </View>
          <View>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileEmail}>{profile?.email}</Text>
            <Text style={styles.profileMember}>Bergabung sejak {memberSince}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
        {MENU.map((section) => (
          <View key={section.section} style={{ marginBottom: 20 }}>
            <Text style={styles.sectionLabel}>{section.section}</Text>
            <View style={styles.menuGroup}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    idx < section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={() => navigation.navigate(item.screen)}
                >
                  <View
                    style={[
                      styles.menuIconWrap,
                      { backgroundColor: item.color || "#fff" },
                    ]}
                  >
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>⟵ Keluar</Text>
        </TouchableOpacity>

        <Text style={styles.version}>GamePay v1.0.0</Text>
      </ScrollView>

      <BottomNav active="Account" navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 14,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF8E8",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  profileName: { fontSize: 16, fontWeight: "800", color: "#1a1a1a" },
  profileEmail: { fontSize: 12, color: "#888", marginTop: 2 },
  profileMember: { fontSize: 11, color: "#aaa", marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    color: "#aaa",
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  menuGroup: { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden" },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
  menuArrow: { fontSize: 16, color: "#ccc" },
  logoutBtn: {
    borderWidth: 1.5,
    borderColor: "#ef4444",
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#ef4444" },
  version: { textAlign: "center", marginTop: 16, fontSize: 12, color: "#ccc" },
});
