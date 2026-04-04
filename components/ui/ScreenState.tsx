import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BORDER, BRAND, SURFACE, TEXT } from "@/constants/colors";

type IconName = keyof typeof MaterialIcons.glyphMap;

interface ScreenStateProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export function ScreenState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  containerStyle,
}: ScreenStateProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <MaterialIcons name={icon} size={34} color={TEXT.secondary} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.86} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  title: {
    color: TEXT.primary,
    marginTop: 10,
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
  subtitle: {
    color: TEXT.secondary,
    marginTop: 6,
    textAlign: "center",
    fontSize: 13,
  },
  button: {
    marginTop: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonText: {
    color: BRAND.primary,
    fontWeight: "700",
    fontSize: 12,
  },
});
