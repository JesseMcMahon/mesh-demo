import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BRAND, SURFACE, TEXT, BORDER, ACCENT, SEMANTIC } from "@/constants/colors";

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  onPress?: () => void;
  size?: "small" | "medium" | "large";
}

export const StatCard = React.memo(function StatCard({
  label,
  value,
  subValue,
  icon,
  iconColor = BRAND.primary,
  trend,
  trendValue,
  onPress,
  size = "medium",
}: StatCardProps) {
  const Container = onPress ? TouchableOpacity : View;

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return BRAND.gold;
      case "down":
        return SEMANTIC.error;
      default:
        return TEXT.secondary;
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return "trending-up";
      case "down":
        return "trending-down";
      default:
        return "trending-flat";
    }
  };

  return (
    <Container
      style={[styles.container, styles[`container_${size}`]]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
            <MaterialIcons name={icon} size={18} color={iconColor} />
          </View>
        )}
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>

      <View style={styles.valueContainer}>
        <Text style={[styles.value, styles[`value_${size}`]]} numberOfLines={1}>
          {value}
        </Text>
        {subValue && (
          <Text style={styles.subValue} numberOfLines={1}>
            {subValue}
          </Text>
        )}
      </View>

      {trend && trendValue && (
        <View style={styles.trendContainer}>
          <MaterialIcons
            name={getTrendIcon()}
            size={16}
            color={getTrendColor()}
          />
          <Text style={[styles.trendValue, { color: getTrendColor() }]}>
            {trendValue}
          </Text>
        </View>
      )}

      {onPress && (
        <View style={styles.chevron}>
          <MaterialIcons name="chevron-right" size={20} color={TEXT.quaternary} />
        </View>
      )}
    </Container>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACE.cardTransparent,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER.medium,
    padding: 16,
  },
  container_small: {
    padding: 12,
  },
  container_medium: {
    padding: 16,
  },
  container_large: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  label: {
    color: TEXT.secondary,
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  value: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  value_small: {
    fontSize: 20,
  },
  value_medium: {
    fontSize: 26,
  },
  value_large: {
    fontSize: 32,
  },
  subValue: {
    color: TEXT.secondary,
    fontSize: 14,
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  trendValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  chevron: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -10,
  },
});
