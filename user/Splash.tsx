import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./Supabase";

const PRIMARY = "#FFA800";

export default function Splash({ navigation }) {
  useEffect(() => {
    let isMounted = true;

    // Cek deep link saat splash - simpan code untuk redirect nanti
    const handleInitialLink = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          // Parse URL untuk cek apakah ada /join/:code
          const { path } = Linking.parse(initialUrl);
          if (path?.startsWith("join/")) {
            const code = path.replace("join/", "").trim();
            if (code) {
              await AsyncStorage.setItem("pending_join_code", code);
            }
          }
        }
      } catch (e) {
        console.log("Deep link parse error:", e);
      }
    };

    // Cek session dan navigate sesuai status
    const checkSession = async () => {
      try {
        await handleInitialLink();

        const {
          data: { session },
        } = await supabase.auth.getSession();

        setTimeout(async () => {
          if (!isMounted) return;

          if (session?.user) {
            // Cek apakah ada pending join code
            const pendingCode = await AsyncStorage.getItem("pending_join_code");
            if (pendingCode) {
              await AsyncStorage.removeItem("pending_join_code");
              navigation.replace("Home");
              // Navigate ke GroupDetail dengan code setelah delay
              setTimeout(() => {
                navigation.navigate("GroupDetail", { groupCode: pendingCode });
              }, 300);
            } else {
              navigation.replace("Home");
            }
          } else {
            navigation.replace("Login");
          }
        }, 1200);
      } catch (e) {
        console.error("Splash auth error:", e);
        if (isMounted) navigation.replace("Login");
      }
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        if (session?.user && _event === "SIGNED_IN") {
          const pendingCode = await AsyncStorage.getItem("pending_join_code");
          if (pendingCode) {
            await AsyncStorage.removeItem("pending_join_code");
            navigation.replace("Home");
            setTimeout(() => {
              navigation.navigate("GroupDetail", { groupCode: pendingCode });
            }, 300);
          } else {
            navigation.replace("Home");
          }
        }
      },
    );

    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={PRIMARY} barStyle="light-content" />
      <View style={styles.logoCircle}>
        <Text style={styles.logoEmoji}>🎮</Text>
      </View>
      <Text style={styles.logo}>GamePay</Text>
      <Text style={styles.tagline}>
        Top up game lebih hemat, bareng teman lebih asyik
      </Text>
      <ActivityIndicator color="#FFF" style={{ marginTop: 32 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoEmoji: { fontSize: 48 },
  logo: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },
});
