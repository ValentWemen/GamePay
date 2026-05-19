import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PRIMARY = "#FFA800";
export const BIOMETRIC_KEY = "biometric_enabled";

export default function SecuritySettings({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<number[]>([]);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    setBiometricAvailable(hasHardware && isEnrolled);
    setBiometricTypes(types);

    if (hasHardware && isEnrolled) {
      const stored = await AsyncStorage.getItem(BIOMETRIC_KEY);
      setBiometricEnabled(stored === "true");
    }
    setLoading(false);
  };

  const getBiometricLabel = () => {
    if (
      biometricTypes.includes(
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      )
    )
      return "Sidik Jari";
    if (
      biometricTypes.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      )
    )
      return "Face ID";
    return "Biometrik";
  };

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      // Minta verifikasi dulu sebelum mengaktifkan
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Verifikasi untuk mengaktifkan keamanan biometrik",
        cancelLabel: "Batal",
        fallbackLabel: "Gunakan PIN",
      });
      if (!result.success) {
        Alert.alert("Gagal", "Verifikasi biometrik gagal, pengaturan tidak berubah.");
        return;
      }
    }
    await AsyncStorage.setItem(BIOMETRIC_KEY, value ? "true" : "false");
    setBiometricEnabled(value);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Keamanan</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.body}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Autentikasi Biometrik</Text>

            {!biometricAvailable ? (
              <View style={styles.unavailableCard}>
                <Text style={styles.unavailableIcon}>🔒</Text>
                <Text style={styles.unavailableText}>
                  Perangkat ini tidak mendukung biometrik atau belum ada sidik
                  jari / wajah yang terdaftar di pengaturan HP.
                </Text>
              </View>
            ) : (
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>
                    {getBiometricLabel()} untuk Konfirmasi Bayar
                  </Text>
                  <Text style={styles.settingDesc}>
                    Wajib verifikasi {getBiometricLabel()} sebelum setiap
                    transaksi diproses
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={toggleBiometric}
                  trackColor={{ false: "#e0e0e0", true: PRIMARY }}
                  thumbColor="#fff"
                />
              </View>
            )}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🛡️</Text>
            <Text style={styles.infoText}>
              Biometrik digunakan sebagai lapisan keamanan tambahan saat
              mengkonfirmasi pembayaran. Data biometrik tidak dikirim ke server
              mana pun — semua diproses di perangkat kamu.
            </Text>
          </View>
        </View>
      )}
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
    gap: 12,
  },
  back: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  backText: { fontSize: 18, color: "#fff", fontWeight: "700" },
  title: { fontSize: 18, fontWeight: "800", color: "#fff" },
  body: { padding: 16 },
  section: {
    backgroundColor: "#fff", borderRadius: 14,
    padding: 16, marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: "#aaa",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12,
  },
  settingRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  settingLabel: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  settingDesc: { fontSize: 12, color: "#888", marginTop: 3, lineHeight: 17 },
  unavailableCard: {
    backgroundColor: "#F5F5F5", borderRadius: 10, padding: 14,
    alignItems: "center", gap: 8,
  },
  unavailableIcon: { fontSize: 32 },
  unavailableText: {
    fontSize: 13, color: "#888", textAlign: "center", lineHeight: 19,
  },
  infoCard: {
    backgroundColor: "#FFFBEA", borderRadius: 12, padding: 14,
    flexDirection: "row", gap: 10, borderWidth: 1, borderColor: "#FFE4AD",
  },
  infoIcon: { fontSize: 20 },
  infoText: { flex: 1, fontSize: 12, color: "#856404", lineHeight: 18 },
});
