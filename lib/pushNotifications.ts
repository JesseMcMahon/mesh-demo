import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { pushApi } from "@/lib/api";

const DEVICE_ID_KEY = "@mesh_device_id";
const EXPO_PUSH_TOKEN_KEY = "@mesh_expo_push_token";

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getOrCreateDeviceId() {
  const existing = (await AsyncStorage.getItem(DEVICE_ID_KEY)) || "";
  if (existing) return existing;
  const next = randomId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}

function getProjectId() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId ||
    ""
  );
}

async function getExpoPushToken() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const permission = await Notifications.requestPermissionsAsync();
    finalStatus = permission.status;
  }
  if (finalStatus !== "granted") return null;

  const projectId = getProjectId();
  if (!projectId) return null;

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = String(tokenResult?.data || "").trim();
  if (!token) return null;
  await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, token);
  return token;
}

async function getStoredToken() {
  return (await AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY)) || "";
}

export async function syncPushRegistration(accessToken?: string | null) {
  if (!accessToken) return;
  try {
    const deviceId = await getOrCreateDeviceId();
    const token = await getExpoPushToken();
    if (!token) return;
    await pushApi.register(
      {
        deviceId,
        expoPushToken: token,
        platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "unknown",
        appVersion: Constants.expoConfig?.version || "",
      },
      accessToken
    );
  } catch {
    // Best effort only.
  }
}

export async function unregisterPushRegistration(accessToken?: string | null) {
  if (!accessToken) return;
  try {
    const [deviceId, token] = await Promise.all([getOrCreateDeviceId(), getStoredToken()]);
    if (!deviceId && !token) return;
    await pushApi.unregister(
      {
        deviceId: deviceId || undefined,
        expoPushToken: token || undefined,
      },
      accessToken
    );
  } catch {
    // Best effort only.
  }
}
