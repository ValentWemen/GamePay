import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChangePassword({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.back}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Change Password</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.text}>Change Password coming soon</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: "#FFA800",
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 18, color: "#fff", fontWeight: "700" },
  title: { fontSize: 18, fontWeight: "800", color: "#fff" },
  body: { flex: 1, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 48, marginBottom: 16 },
  text: { fontSize: 16, color: "#aaa" },
});
