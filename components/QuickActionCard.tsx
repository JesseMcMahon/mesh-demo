import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND, SURFACE, TEXT, BORDER, ACCENT, GRADIENTS } from "@/constants/colors";
import { triggerHaptic } from "@/lib/haptics";
import { useSpringPress } from "@/hooks/useSpringPress";

interface QuickActionCardProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  variant?: "default" | "gradient" | "highlighted";
  gradientColors?: readonly [string, string, ...string[]];
  iconColor?: string;
  badge?: string | number;
  badgeColor?: string;
  disabled?: boolean;
}

export const QuickActionCard = React.memo(function QuickActionCard({
  icon,
  title,
  subtitle,
  onPress,
  variant = "default",
  gradientColors = [...GRADIENTS.action] as const,
  iconColor = BRAND.primary,
  badge,
  badgeColor = BRAND.gold,
  disabled = false,
}: QuickActionCardProps) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress(0.98);

  const handlePress = async () => {
    if (disabled) return;
    await triggerHaptic("light");
    onPress();
  };

  const content = (
    <>
      <View style={styles.iconContainer}>
        <MaterialIcons
          name={icon}
          size={24}
          color={variant === "gradient" ? "#FFFFFF" : iconColor}
        />
        {badge !== undefined && (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.title,
            variant === "gradient" && styles.titleGradient,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              variant === "gradient" && styles.subtitleGradient,
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>
      <MaterialIcons
        name="chevron-right"
        size={24}
        color={variant === "gradient" ? "#FFFFFF" : TEXT.quaternary}
      />
    </>
  );

  if (variant === "gradient") {
    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={0.8}
          disabled={disabled}
          style={[styles.touchable, disabled && styles.disabled]}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientContainer}
          >
            {content}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.7}
        disabled={disabled}
        style={[
          styles.container,
          variant === "highlighted" && styles.containerHighlighted,
          disabled && styles.disabled,
        ]}
      >
        {content}
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 16,
    overflow: "hidden",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE.cardTransparent,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER.medium,
    padding: 16,
  },
  containerHighlighted: {
    borderColor: BRAND.primary,
    backgroundColor: ACCENT.redBg,
  },
  gradientContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  titleGradient: {
    fontWeight: "700",
  },
  subtitle: {
    color: TEXT.secondary,
    fontSize: 13,
    marginTop: 2,
  },
  subtitleGradient: {
    color: "rgba(255, 255, 255, 0.7)",
  },
});
