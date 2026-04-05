import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useInvestorDemo } from "@/contexts/investor-demo";
import { DEMO_FEATURES } from "@/lib/investorDemoContent";
import { useDemoTheme } from "@/lib/demoTheme";

export function InvestorOverlay() {
  const { state } = useInvestorDemo();
  const theme = useDemoTheme();

  const metrics = useMemo(() => {
    const avgXpPerAction =
      state.sessionActionCount > 0
        ? Math.round(state.sessionXpEarned / state.sessionActionCount)
        : 0;
    const sinkUsageRate =
      state.sessionGemsEarned > 0
        ? Math.min(100, Math.round((state.sessionGemsSpent / state.sessionGemsEarned) * 100))
        : 0;
    const carryoverParticipation =
      Object.values(state.formatContribution).filter((value) => value > 0).length;
    const completionPct = state.completedFeatures.length / DEMO_FEATURES.length;
    const retentionMock = Math.max(
      28,
      Math.min(
        74,
        Math.round(
          28 +
            completionPct * 24 +
            carryoverParticipation * 6 +
            Math.min(12, state.liveMomentsTriggered * 2)
        )
      )
    );

    return {
      avgXpPerAction,
      sinkUsageRate,
      carryoverParticipation,
      retentionMock,
    };
  }, [
    state.completedFeatures.length,
    state.formatContribution,
    state.liveMomentsTriggered,
    state.sessionActionCount,
    state.sessionGemsEarned,
    state.sessionGemsSpent,
    state.sessionXpEarned,
  ]);

  if (!state.presenterOverlayEnabled) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View
        style={[
          styles.card,
          {
            borderColor: `${theme.primary}70`,
            backgroundColor: `${theme.surface}EE`,
          },
        ]}
      >
        <View style={styles.header}>
          <MaterialIcons name="insights" size={13} color={theme.primaryLight} />
          <Text style={[styles.headerText, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
            Investor Overlay
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>Actions</Text>
          <Text style={[styles.value, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
            {state.sessionActionCount}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>XP/Action</Text>
          <Text style={[styles.value, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
            {metrics.avgXpPerAction}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>Sink Usage</Text>
          <Text style={[styles.value, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
            {metrics.sinkUsageRate}%
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>Carryover</Text>
          <Text style={[styles.value, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
            {metrics.carryoverParticipation}/3
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>30D Cohort</Text>
          <Text style={[styles.value, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
            {metrics.retentionMock}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 10,
    bottom: 10,
    zIndex: 40,
    maxWidth: 176,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  headerText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
  },
  value: {
    fontSize: 11,
    fontWeight: "800",
  },
});
