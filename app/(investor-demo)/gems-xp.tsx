import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { DemoModuleScaffold } from "@/components/demo/DemoModuleScaffold";
import { FeatureFooter } from "@/components/demo/FeatureFooter";
import { useInvestorDemo } from "@/contexts/investor-demo";
import { useDemoTheme } from "@/lib/demoTheme";

const actions = [
  {
    label: "Set Weekly Lineup",
    xp: 35,
    gems: 8,
    icon: "tune" as const,
  },
  {
    label: "Win Weekly Matchup",
    xp: 120,
    gems: 25,
    icon: "emoji-events" as const,
  },
  {
    label: "Complete Daily Challenge",
    xp: 50,
    gems: 12,
    icon: "flag" as const,
  },
  {
    label: "Send Rivalry Taunt",
    xp: 30,
    gems: 10,
    icon: "campaign" as const,
  },
];

export default function GemsXpScreen() {
  const { state, addXpAndGems, nextLevelXp, completeFeature } = useInvestorDemo();
  const theme = useDemoTheme();
  const progress = Math.min(1, (state.xp % 500) / 500);

  return (
    <DemoModuleScaffold
      title="Gems + XP Loop"
      subtitle="Every meaningful action contributes to progression, retention, and cosmetic unlock velocity."
      footer={<FeatureFooter featureId="gems" />}
    >
      <View style={[styles.panel, { borderColor: `${theme.primary}3A`, backgroundColor: theme.surfaceElevated }]}>
        <View style={styles.panelHeaderRow}>
          <View>
            <Text style={[styles.level, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
              Level {state.level}
            </Text>
            <Text style={[styles.sub, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
              {state.xp} / {nextLevelXp} XP
            </Text>
          </View>

          <View style={[styles.gemPill, { borderColor: `${theme.primary}6A`, backgroundColor: `${theme.primary}22` }]}>
            <MaterialIcons name="diamond" size={16} color={theme.primaryLight} />
            <Text style={[styles.gems, { color: theme.primaryLight }]}>{state.gems}</Text>
          </View>
        </View>

        <View style={[styles.track, { backgroundColor: `${theme.primary}24` }]}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: theme.primary }]} />
        </View>

        <Text style={[styles.meta, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
          Compounding progression loop: play to reward to customization to social flex to play.
        </Text>
      </View>

      <View style={[styles.card, { borderColor: `${theme.primary}3A`, backgroundColor: theme.surfaceElevated }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
          Demo Earning Actions
        </Text>
        <View style={styles.actionList}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.actionCard, { borderColor: `${theme.primary}34`, backgroundColor: `${theme.primary}18` }]}
              activeOpacity={0.86}
              onPress={() => {
                addXpAndGems(action.xp, action.gems);
                completeFeature("gems");
              }}
            >
              <View style={styles.actionMainRow}>
                <View style={[styles.actionIconWrap, { backgroundColor: `${theme.primary}26` }]}> 
                  <MaterialIcons name={action.icon} size={16} color={theme.primaryLight} />
                </View>
                <Text style={[styles.actionTitle, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
                  {action.label}
                </Text>
              </View>

              <Text style={[styles.actionReward, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
                +{action.xp} XP • +{action.gems} Gems
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.card, { borderColor: `${theme.primary}3A`, backgroundColor: theme.surfaceElevated }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
          Spend Paths (Roadmap)
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
          • Battle pass boosts and premium lane unlock
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
          • Character wearables and animations
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
          • App themes, card skins, and collectible packs
        </Text>
      </View>
    </DemoModuleScaffold>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  panelHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  level: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  sub: {
    fontSize: 12,
    fontWeight: "600",
  },
  gemPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  gems: {
    fontWeight: "800",
    fontSize: 14,
  },
  track: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
  meta: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.25,
  },
  actionList: {
    gap: 9,
  },
  actionCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 5,
  },
  actionMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  actionReward: {
    fontSize: 11,
    fontWeight: "700",
  },
});
