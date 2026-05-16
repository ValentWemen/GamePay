// ============================================================
// GamePay - Notifications Helper
// Local notifications via expo-notifications
// ============================================================
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure handler - akan dipanggil saat ada notifikasi masuk
// Set agar notifikasi tetap muncul saat app terbuka (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request permission untuk notifikasi
 * Panggil sekali di App startup
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Notification permission not granted");
      return false;
    }

    // Set Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "GamePay Notifications",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FFA800",
        sound: "default",
      });

      await Notifications.setNotificationChannelAsync("group-order", {
        name: "Group Order",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FFA800",
        sound: "default",
      });
    }

    return true;
  } catch (e) {
    console.error("Notification permission error:", e);
    return false;
  }
}

/**
 * Tampilkan notifikasi lokal langsung
 */
export async function showNotification(
  title: string,
  body: string,
  data?: any,
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: "default",
      },
      trigger: null, // Langsung muncul
    });
  } catch (e) {
    console.error("Show notification error:", e);
  }
}

/**
 * Helper notif khusus untuk event group order
 */
export const GroupNotifications = {
  // Untuk member baru: "Kamu berhasil join group XXX"
  memberJoinedSelf: (gameName: string, groupCode: string) =>
    showNotification(
      "🎮 Berhasil Join Group!",
      `Kamu sudah join group ${gameName}. Yuk lanjut bayar bagianmu!`,
      { type: "group_joined", groupCode },
    ),

  // Untuk host: "Ada member baru join group kamu"
  newMemberJoined: (memberName: string, gameName: string) =>
    showNotification(
      "👥 Member Baru Join Group!",
      `${memberName} baru saja join group ${gameName} kamu`,
      { type: "new_member" },
    ),

  // Untuk semua member: "Group penuh, ayo bayar"
  groupFull: (gameName: string) =>
    showNotification(
      "🎉 Group Sudah Lengkap!",
      `Group ${gameName} sudah penuh. Yuk segera selesaikan pembayaran!`,
      { type: "group_full" },
    ),

  // Untuk member yang baru bayar
  memberPaid: (memberName: string) =>
    showNotification(
      "💰 Pembayaran Diterima",
      `${memberName} sudah menyelesaikan pembayaran`,
      { type: "member_paid" },
    ),

  // Untuk semua member: "Semua sudah bayar, top up diproses"
  allPaid: (gameName: string) =>
    showNotification(
      "✅ Top Up Diproses!",
      `Semua member sudah bayar. Top up ${gameName} sedang diproses!`,
      { type: "all_paid" },
    ),
};
