import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { DemoModuleScaffold } from "@/components/demo/DemoModuleScaffold";
import { FeatureFooter } from "@/components/demo/FeatureFooter";
import {
  DemoSeasonFormat,
  useInvestorDemo,
} from "@/contexts/investor-demo";
import { useDemoTheme } from "@/lib/demoTheme";

const PRESTIGE_XP_PER_LEVEL = 1200;

const FORMAT_OPTIONS: Array<{ id: DemoSeasonFormat; label: string }> = [
  { id: "nfl", label: "NFL" },
  { id: "march_madness", label: "March Madness" },
  { id: "reality_tv", label: "Reality TV" },
];

const SEASON_ACTIONS: Array<{
  id: string;
  label: string;
  xp: number;
  gems: number;
  icon: keyof typeof MaterialIcons.glyphMap;
}> = [
  { id: "lineup", label: "Set Weekly Lineup", xp: 40, gems: 8, icon: "tune" },
  {
    id: "matchup_win",
    label: "Win Weekly Matchup",
    xp: 115,
    gems: 24,
    icon: "emoji-events",
  },
  {
    id: "social_action",
    label: "Send Rivalry Taunt",
    xp: 35,
    gems: 10,
    icon: "campaign",
  },
];

function formatLabel(format: DemoSeasonFormat): string {
  if (format === "march_madness") return "March Madness";
  if (format === "reality_tv") return "Reality TV";
  return "NFL";
}

export default function GemsXpScreen() {
  const {
    state,
    addSeasonProgress,
    addLifetimeProgress,
    setSeasonFormat,
    simulateSeasonRollover,
    nextLevelXp,
    completeFeature,
  } = useInvestorDemo();
  const theme = useDemoTheme();

  const seasonProgress = useMemo(() => {
    if (nextLevelXp <= 0) return 0;
    return Math.max(0, Math.min(1, state.seasonXp / nextLevelXp));
  }, [nextLevelXp, state.seasonXp]);

  const prestigeCycleXp = state.lifetimeXp % PRESTIGE_XP_PER_LEVEL;
  const prestigeProgress = prestigeCycleXp / PRESTIGE_XP_PER_LEVEL;
  const xpToNextPrestige =
    prestigeCycleXp === 0 ? PRESTIGE_XP_PER_LEVEL : PRESTIGE_XP_PER_LEVEL - prestigeCycleXp;

  const contributionTotal = useMemo(
    () =>
      state.formatContribution.nfl +
      state.formatContribution.march_madness +
      state.formatContribution.reality_tv,
    [state.formatContribution]
  );

  const contributionRows = useMemo(
    () =>
      FORMAT_OPTIONS.map((option) => {
        const value = state.formatContribution[option.id];
        const ratio = contributionTotal > 0 ? value / contributionTotal : 0;
        return {
          ...option,
          value,
          percent: Math.round(ratio * 100),
        };
      }),
    [state.formatContribution, contributionTotal]
  );

  const participationCount = contributionRows.filter((row) => row.percent > 0).length;
  const avgXpPerAction =
    state.sessionActionCount > 0
      ? Math.round(state.sessionXpEarned / state.sessionActionCount)
      : 0;

  const currentSeasonLabel = `${state.seasonKey}: ${formatLabel(state.seasonFormat)}`;

  return (
    <DemoModuleScaffold
      title="Gems + XP Ledger"
      subtitle="Season progression resets. Prestige and gems carry across every sport and show."
      footer={<FeatureFooter featureId="gems" />}
    >
      <View
        style={[
          styles.card,
          {
            borderColor: `${theme.primary}48`,
            backgroundColor: theme.surfaceElevated,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
            Season Progress
          </Text>
          <View
            style={[
              styles.resetPill,
              {
                borderColor: `${theme.primary}5C`,
                backgroundColor: `${theme.primary}22`,
              },
            ]}
          >
            <Text style={[styles.resetPillText, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
              Resets Next Season
            </Text>
          </View>
        </View>

        <Text style={[styles.metaLine, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
          {currentSeasonLabel}
        </Text>

        <View style={styles.formatChipRow}>
          {FORMAT_OPTIONS.map((option) => {
            const active = option.id === state.seasonFormat;
            return (
              <TouchableOpacity
                key={option.id}
                activeOpacity={0.85}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setSeasonFormat(option.id);
                }}
                style={[
                  styles.formatChip,
                  {
                    borderColor: active ? `${theme.primary}7A` : `${theme.primary}35`,
                    backgroundColor: active ? `${theme.primary}24` : theme.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.formatChipText,
                    {
                      color: active ? theme.primaryLight : theme.textSecondary,
                      fontFamily: theme.labelFont,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.levelRow}>
          <Text style={[styles.levelText, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
            Seasonal Level {state.seasonLevel}
          </Text>
          <Text style={[styles.levelSubText, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
            {state.seasonXp} / {nextLevelXp} XP
          </Text>
        </View>

        <View style={[styles.track, { backgroundColor: `${theme.primary}1E` }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.round(seasonProgress * 100)}%`,
                backgroundColor: theme.primary,
              },
            ]}
          />
        </View>

        <View style={styles.actionGrid}>
          {SEASON_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              activeOpacity={0.88}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                addSeasonProgress(action.xp, action.gems, state.seasonFormat);
                completeFeature("gems");
              }}
              style={[
                styles.actionCard,
                {
                  borderColor: `${theme.primary}3C`,
                  backgroundColor: `${theme.primary}16`,
                },
              ]}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${theme.primary}28` }]}>
                <MaterialIcons name={action.icon} size={16} color={theme.primaryLight} />
              </View>
              <Text style={[styles.actionTitle, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
                {action.label}
              </Text>
              <Text style={[styles.actionReward, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
                +{action.xp} XP • +{action.gems} Gems
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            simulateSeasonRollover();
          }}
          style={[styles.rolloverButton, { borderColor: `${theme.primary}44`, backgroundColor: theme.surface }]}
        >
          <MaterialIcons name="update" size={15} color={theme.textPrimary} />
          <Text style={[styles.rolloverButtonText, { color: theme.textPrimary, fontFamily: theme.buttonFont }]}>
            Simulate Season Rollover
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.card,
          {
            borderColor: `${theme.primary}48`,
            backgroundColor: theme.surfaceElevated,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
            Lifetime Prestige
          </Text>
          <View style={[styles.gemPill, { borderColor: `${theme.primary}5A`, backgroundColor: `${theme.primary}20` }]}>
            <MaterialIcons name="diamond" size={16} color={theme.primaryLight} />
            <Text style={[styles.gemPillText, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
              {state.lifetimeGems} Gems
            </Text>
          </View>
        </View>

        <Text style={[styles.metaLine, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
          Prestige and gems persist across every sport and show season.
        </Text>

        <View style={styles.levelRow}>
          <Text style={[styles.levelText, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
            Prestige {state.lifetimePrestige}
          </Text>
          <Text style={[styles.levelSubText, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
            {xpToNextPrestige} XP to next prestige
          </Text>
        </View>

        <View style={[styles.track, { backgroundColor: `${theme.primary}1E` }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.round(prestigeProgress * 100)}%`,
                backgroundColor: theme.primaryLight,
              },
            ]}
          />
        </View>

        <View style={styles.contributionStack}>
          {contributionRows.map((row) => (
            <View key={row.id} style={styles.contributionRow}>
              <View style={styles.contributionHeader}>
                <Text style={[styles.contributionLabel, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
                  {row.label}
                </Text>
                <Text style={[styles.contributionPct, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
                  {row.percent}%
                </Text>
              </View>
              <View style={[styles.contributionTrack, { backgroundColor: `${theme.primary}18` }]}>
                <View
                  style={[
                    styles.contributionFill,
                    {
                      width: `${row.percent}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.boostRow}>
          {FORMAT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              activeOpacity={0.86}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                addLifetimeProgress(90, 12, option.id);
              }}
              style={[styles.boostButton, { borderColor: `${theme.primary}38`, backgroundColor: theme.surface }]}
            >
              <MaterialIcons name="trending-up" size={13} color={theme.primaryLight} />
              <Text style={[styles.boostText, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
                + {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View
        style={[
          styles.kpiStrip,
          {
            borderColor: `${theme.primary}44`,
            backgroundColor: theme.surfaceElevated,
          },
        ]}
      >
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiValue, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
            {state.sessionActionCount}
          </Text>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
            Session Actions
          </Text>
        </View>
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiValue, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
            {avgXpPerAction}
          </Text>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
            Avg XP / Action
          </Text>
        </View>
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiValue, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
            {participationCount}/3
          </Text>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
            Cross-Format
          </Text>
        </View>
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiValue, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
            {xpToNextPrestige}
          </Text>
          <Text style={[styles.kpiLabel, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
            Return Incentive
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.card,
          {
            borderColor: `${theme.primary}48`,
            backgroundColor: theme.surfaceElevated,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
          Economy Clarity
        </Text>
        <View style={styles.flowGrid}>
          <View style={[styles.flowCol, { borderColor: `${theme.primary}30`, backgroundColor: theme.surface }]}>
            <Text style={[styles.flowTitle, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>Earn</Text>
            <Text style={[styles.flowBody, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
              Lineups, wins, challenges, taunts.
            </Text>
          </View>
          <View style={[styles.flowCol, { borderColor: `${theme.primary}30`, backgroundColor: theme.surface }]}>
            <Text style={[styles.flowTitle, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>Spend</Text>
            <Text style={[styles.flowBody, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
              Battle pass, cosmetics, app themes.
            </Text>
          </View>
          <View style={[styles.flowCol, { borderColor: `${theme.primary}30`, backgroundColor: theme.surface }]}>
            <Text style={[styles.flowTitle, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>Flex</Text>
            <Text style={[styles.flowBody, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
              Locker + crib identity and social status.
            </Text>
          </View>
        </View>

        <View style={styles.legendRow}>
          <View style={[styles.legendPill, { borderColor: `${theme.primary}4A`, backgroundColor: `${theme.primary}1E` }]}>
            <Text style={[styles.legendPillText, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
              Seasonal: XP + Pass Progress
            </Text>
          </View>
          <View style={[styles.legendPill, { borderColor: `${theme.primary}4A`, backgroundColor: `${theme.primary}1E` }]}>
            <Text style={[styles.legendPillText, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
              Lifetime: Prestige + Gems
            </Text>
          </View>
        </View>
      </View>
    </DemoModuleScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  metaLine: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  resetPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  resetPillText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.28,
  },
  formatChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  formatChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  formatChipText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  levelText: {
    fontSize: 20,
    fontWeight: "900",
  },
  levelSubText: {
    fontSize: 12,
    fontWeight: "700",
  },
  track: {
    height: 11,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
  actionGrid: {
    gap: 8,
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
  },
  actionReward: {
    fontSize: 11,
    fontWeight: "800",
  },
  rolloverButton: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  rolloverButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
  gemPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  gemPillText: {
    fontSize: 12,
    fontWeight: "900",
  },
  contributionStack: {
    gap: 8,
  },
  contributionRow: {
    gap: 5,
  },
  contributionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contributionLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  contributionPct: {
    fontSize: 11,
    fontWeight: "800",
  },
  contributionTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  contributionFill: {
    height: "100%",
  },
  boostRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  boostButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  boostText: {
    fontSize: 11,
    fontWeight: "800",
  },
  kpiStrip: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    flexDirection: "row",
    gap: 8,
  },
  kpiItem: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.08)",
    gap: 2,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  kpiLabel: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 13,
    fontWeight: "700",
  },
  flowGrid: {
    gap: 8,
  },
  flowCol: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  flowTitle: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.25,
  },
  flowBody: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  legendRow: {
    marginTop: 2,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  legendPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  legendPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
});
