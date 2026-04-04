import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BRAND, ACCENT, TEXT, BORDER } from "@/constants/colors";

interface SettingsSectionProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  children: React.ReactNode;
  showDivider?: boolean;
}

export const SettingsSection = React.memo(function SettingsSection({
  title,
  subtitle,
  icon,
  children,
  showDivider = false,
}: SettingsSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {icon && (
          <View style={styles.iconContainer}>
            <MaterialIcons name={icon} size={20} color={BRAND.primary} />
          </View>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.content}>{children}</View>
      {showDivider && <View style={styles.divider} />}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ACCENT.redBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: TEXT.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: TEXT.secondary,
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER.medium,
    marginTop: 24,
  },
});
