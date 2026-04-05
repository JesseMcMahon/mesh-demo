import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { DemoModuleScaffold } from "@/components/demo/DemoModuleScaffold";
import { FeatureFooter } from "@/components/demo/FeatureFooter";
import { useDemoTheme } from "@/lib/demoTheme";
import { useInvestorDemo } from "@/contexts/investor-demo";

const displays = [
  {
    name: "Championship Shelf",
    value: "2 League Titles",
    detail: "Dynamic trophy variants by season finish",
    icon: "workspace-premium" as const,
    tone: "#F3C85B",
  },
  {
    name: "Signature Wall",
    value: "8 Legendary Unlockables",
    detail: "Animated cosmetics and limited event drops",
    icon: "wallpaper" as const,
    tone: "#56D7FF",
  },
  {
    name: "Ring Case",
    value: "2024 • 2025",
    detail: "Chronological legacy moments for each championship",
    icon: "diamond" as const,
    tone: "#AE9BFF",
  },
];

export default function CribScreen() {
  const theme = useDemoTheme();
  const { completeFeature } = useInvestorDemo();
  const [inspectedDisplays, setInspectedDisplays] = useState<string[]>([]);

  const inspectedAll = useMemo(
    () => inspectedDisplays.length === displays.length,
    [inspectedDisplays.length]
  );

  const onInspectDisplay = (displayName: string) => {
    setInspectedDisplays((previous) => {
      if (previous.includes(displayName)) return previous;
      const next = [...previous, displayName];
      if (next.length === displays.length) {
        completeFeature("crib");
      }
      return next;
    });
  };

  return (
    <DemoModuleScaffold
      title="Crib Showcase"
      subtitle="A personal NFL 2K-style legacy room where status is visible, social, and collectible."
      moduleIntroKey="crib"
      footer={<FeatureFooter featureId="crib" />}
    >
      <LinearGradient
        colors={[`${theme.primary}2E`, `${theme.primary}10`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroCard, { borderColor: `${theme.primary}44` }]}
      >
        <Text style={[styles.heroTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
          Your Crib Becomes The Franchise Museum
        </Text>
        <Text style={[styles.heroCopy, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
          Every championship, milestone, and cosmetic unlock becomes a visual artifact that compounds over seasons.
        </Text>
        <Text style={[styles.progressHint, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
          {inspectedAll
            ? "Showcase tour complete"
            : `Inspect ${displays.length - inspectedDisplays.length} more display${displays.length - inspectedDisplays.length === 1 ? "" : "s"} to complete`}
        </Text>
      </LinearGradient>

      {displays.map((display) => (
        <TouchableOpacity
          key={display.name}
          activeOpacity={0.88}
          onPress={() => onInspectDisplay(display.name)}
          style={[styles.card, { borderColor: `${theme.primary}30`, backgroundColor: theme.surfaceElevated }]}
        >
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: `${display.tone}24` }]}> 
              <MaterialIcons name={display.icon} size={24} color={display.tone} />
            </View>

            <View style={styles.textWrap}>
              <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
                {display.name}
              </Text>
              <Text style={[styles.value, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
                {display.value}
              </Text>
              <Text style={[styles.detail, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
                {display.detail}
              </Text>
              <Text style={[styles.inspectHint, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
                {inspectedDisplays.includes(display.name) ? "Inspected" : "Tap to inspect"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </DemoModuleScaffold>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.25,
  },
  heroCopy: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  progressHint: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.25,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
  },
  value: {
    fontSize: 12,
    fontWeight: "700",
  },
  detail: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  inspectHint: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.2,
    marginTop: 2,
  },
});
