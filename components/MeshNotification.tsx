import { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  PanResponder,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { BRAND, NOTIFICATION, TEXT, SEMANTIC } from "@/constants/colors";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationOptions {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  duration?: number;
  badgeText?: string;
  variant?: "default" | "marquee";
}

interface MeshNotificationProps {
  message: string;
  type: NotificationType;
  onDismiss: () => void;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  badgeText?: string;
  variant?: NotificationOptions["variant"];
  duration?: number;
}

export function MeshNotification({
  message,
  type,
  onDismiss,
  title,
  subtitle,
  imageUrl,
  iconName,
  badgeText,
  variant = "default",
  duration = 2000,
}: MeshNotificationProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY()).current;

  const borderColor =
    type === "success"
      ? NOTIFICATION.successBorder
      : type === "error"
        ? NOTIFICATION.errorBorder
        : type === "warning"
          ? SEMANTIC.warning
          : SEMANTIC.info;

  const fallbackIconName: keyof typeof MaterialIcons.glyphMap =
    type === "success"
      ? "check-circle"
      : type === "error"
        ? "error"
        : type === "warning"
          ? "warning"
      : "info";
  const isMarquee = variant === "marquee";
  const accentColor = isMarquee ? BRAND.gold : borderColor;

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  useEffect(() => {
    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();

    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: duration,
      useNativeDriver: false,
    }).start();

    // Auto dismiss after duration
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          // Only allow upward swipes
          pan.setValue({ x: 0, y: gestureState.dy });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50) {
          // Dismiss if swiped up more than 50px
          handleDismiss();
        } else {
          // Snap back
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={{
        transform: [
          { translateY: Animated.add(slideAnim, pan.y) },
          { translateX: pan.x },
        ],
        position: "absolute",
        top: insets.top,
        left: 0,
        right: 0,
        zIndex: 9999,
      }}
      {...panResponder.panHandlers}
    >
      <View
        className="mx-4 mt-2 rounded-lg shadow-lg"
        style={{
          backgroundColor: isMarquee ? "#1D1912" : NOTIFICATION.background,
          borderLeftWidth: 4,
          borderLeftColor: accentColor,
          borderWidth: isMarquee ? 1 : 0,
          borderColor: isMarquee ? `${BRAND.gold}66` : undefined,
        }}
      >
        {/* Progress bar at top */}
        <View className="h-1 bg-gray-800 rounded-t-lg overflow-hidden">
          <Animated.View
            style={{
              height: "100%",
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ["100%", "0%"],
              }),
              backgroundColor: accentColor,
            }}
          />
        </View>

        {/* Notification content */}
        <View className="flex-row items-center px-4 py-3">
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isMarquee ? `${BRAND.gold}66` : "#FFFFFF26",
                backgroundColor: "#101216",
              }}
            />
          ) : (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: `${accentColor}22`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons
                name={iconName || fallbackIconName}
                size={20}
                color={accentColor}
              />
            </View>
          )}

          <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
            {(title || badgeText) && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                {iconName ? (
                  <MaterialIcons
                    name={iconName}
                    size={isMarquee ? 14 : 13}
                    color={accentColor}
                  />
                ) : null}
                {title ? (
                  <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "800" }}>
                    {title}
                  </Text>
                ) : null}
                {badgeText ? (
                  <View
                    style={{
                      paddingHorizontal: isMarquee ? 9 : 7,
                      paddingVertical: isMarquee ? 3 : 2,
                      borderRadius: 999,
                      backgroundColor: `${accentColor}22`,
                      borderWidth: 1,
                      borderColor: `${accentColor}66`,
                    }}
                  >
                    <Text
                      style={{
                        color: accentColor,
                        fontSize: isMarquee ? 10 : 9,
                        fontWeight: "800",
                        letterSpacing: isMarquee ? 0.7 : 0.5,
                      }}
                    >
                      {badgeText}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            <Text
              style={{ color: "#FFFFFF", fontSize: 14, fontWeight: title ? "700" : "600" }}
            >
              {message}
            </Text>
            {subtitle ? (
              <Text style={{ color: TEXT.light, fontSize: 12, marginTop: 2 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity onPress={handleDismiss} className="p-1" style={{ marginTop: 2 }}>
            <MaterialIcons name="close" size={20} color={TEXT.placeholder} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}
