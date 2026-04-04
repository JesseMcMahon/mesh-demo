import { ReactNode } from "react";
import {
  View,
  Image,
  ImageSourcePropType,
  Text,
  TextStyle,
  ViewStyle,
  TouchableOpacity,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BRAND } from "@/constants/colors";
import { backOrReplace } from "@/lib/navigation";
import { triggerHaptic } from "@/lib/haptics";
import { useSpringPress } from "@/hooks/useSpringPress";

interface TopNavigationProps {
  title: string;
  style?: ViewStyle;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightIcon?: {
    name: keyof typeof MaterialIcons.glyphMap;
    onPress: () => void;
    showNotification?: boolean;
  };
  rightText?: {
    text: string;
    onPress: () => void;
    textStyle?: {
      color?: string;
      fontWeight?: TextStyle["fontWeight"];
      fontSize?: number;
    };
  };
  bottomSection?: ReactNode;
}

/**
 * Top navigation bar with meshBannerBackground image
 * Standard iOS navigation bar height with background image
 */
export function TopNavigation({
  title,
  style,
  showBackButton = false,
  onBackPress,
  rightIcon,
  rightText,
  bottomSection,
}: TopNavigationProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const backPressSpring = useSpringPress(0.92);
  const rightIconSpring = useSpringPress(0.92);
  const rightTextSpring = useSpringPress(0.96);
  const bannerBackground: ImageSourcePropType = require("@/assets/images/meshBannerBackground.png");
  const handleDefaultBack = () => backOrReplace(router, "/(tabs)" as any);

  return (
    <View
      style={[
        {
          position: "relative",
          overflow: "hidden",
        },
        style,
      ]}
    >
      {/* Background Image - covers entire navbar including tabs */}
      <Image
        source={bannerBackground}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
        }}
        resizeMode="cover"
      />

      {/* Main Navigation Bar */}
      <View
        style={{
          height: 48 + insets.top, // Slightly roomier nav bar for long league tab labels
          position: "relative",
          zIndex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: insets.top,
          paddingHorizontal: 18,
        }}
      >
        {/* Left side - Back button or spacer */}
        <View style={{ width: 40, alignItems: "flex-start" }}>
          {showBackButton && (
            <Animated.View style={backPressSpring.animatedStyle}>
              <TouchableOpacity
                onPress={async () => {
                  await triggerHaptic("selection");
                  (onBackPress || handleDefaultBack)();
                }}
                onPressIn={backPressSpring.onPressIn}
                onPressOut={backPressSpring.onPressOut}
                style={{
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        {/* Center - Title */}
        <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 8 }}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              color: "#FFFFFF",
              fontSize: 17,
              fontWeight: "600",
            }}
          >
            {title}
          </Text>
        </View>

        {/* Right side - Icon, Text, or spacer */}
        <View style={{ minWidth: 60, alignItems: "flex-end" }}>
          {rightText && (
            <Animated.View style={rightTextSpring.animatedStyle}>
              <TouchableOpacity
                onPress={async () => {
                  await triggerHaptic("selection");
                  rightText.onPress();
                }}
                onPressIn={rightTextSpring.onPressIn}
                onPressOut={rightTextSpring.onPressOut}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{
                    color: rightText.textStyle?.color || "#FFFFFF",
                    fontSize: rightText.textStyle?.fontSize || 17,
                    fontWeight: rightText.textStyle?.fontWeight || "400",
                  }}
                >
                  {rightText.text}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
          {rightIcon && (
            <Animated.View style={rightIconSpring.animatedStyle}>
              <TouchableOpacity
                onPress={async () => {
                  await triggerHaptic("selection");
                  rightIcon.onPress();
                }}
                onPressIn={rightIconSpring.onPressIn}
                onPressOut={rightIconSpring.onPressOut}
                style={{
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <MaterialIcons name={rightIcon.name} size={24} color="#FFFFFF" />
                {rightIcon.showNotification && (
                  <View
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: BRAND.primary,
                    }}
                  />
                )}
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>

      {/* Optional Bottom Section (e.g., Tabs) - inside banner */}
      {bottomSection && (
        <View
          style={{
            position: "relative",
            zIndex: 1,
            backgroundColor: "transparent",
          }}
        >
          {bottomSection}
        </View>
      )}
    </View>
  );
}
