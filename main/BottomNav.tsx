import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIMARY = "#FFA800";

const tabs = [
  { name: "Home", label: "Beranda", emoji: "🏠", screen: "Home" },
  { name: "History", label: "Riwayat", emoji: "🕐", screen: "History" },
  { name: "Group", label: "Group", emoji: "👥", screen: "Group" },
  { name: "Account", label: "Akun", emoji: "👤", screen: "Account" },
];

export default function BottomNav({
  active,
  navigation,
}: {
  active: string;
  navigation: any;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
      {tabs.map((t) => (
        <TouchableOpacity
          key={t.name}
          style={styles.navItem}
          onPress={() => navigation.navigate(t.screen)}
        >
          <Text
            style={[styles.navEmoji, active === t.name && styles.navActive]}
          >
            {t.emoji}
          </Text>
          <Text
            style={[styles.navlabel, active === t.name && { color: PRIMARY, fontWeight: "700" }]}
          >
            {t.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 8,
  },
  navItem: { flex: 1, alignItems: "center" },
  navEmoji: { fontSize: 20, opacity: 0.4 },
  navActive: { opacity: 1 },
  navlabel: { fontSize: 10, color: "#aaa", marginTop: 2 },
});
