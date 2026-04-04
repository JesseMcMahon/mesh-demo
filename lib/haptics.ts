import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export type MeshHapticType =
  | "none"
  | "selection"
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error";

function canHaptic() {
  return Platform.OS === "ios" || Platform.OS === "android";
}

export async function triggerHaptic(type: MeshHapticType = "light") {
  if (!canHaptic() || type === "none") return;

  try {
    if (type === "selection") {
      await Haptics.selectionAsync();
      return;
    }

    if (type === "success" || type === "warning" || type === "error") {
      const notifType =
        type === "success"
          ? Haptics.NotificationFeedbackType.Success
          : type === "warning"
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Error;
      await Haptics.notificationAsync(notifType);
      return;
    }

    const impactStyle =
      type === "heavy"
        ? Haptics.ImpactFeedbackStyle.Heavy
        : type === "medium"
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light;

    await Haptics.impactAsync(impactStyle);
  } catch {
    // noop: haptics should never block UX.
  }
}
