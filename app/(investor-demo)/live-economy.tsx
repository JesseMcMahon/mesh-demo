import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { DemoModuleScaffold } from "@/components/demo/DemoModuleScaffold";
import { FeatureFooter } from "@/components/demo/FeatureFooter";
import { useDemoTheme } from "@/lib/demoTheme";
import { useInvestorDemo } from "@/contexts/investor-demo";

type MomentEvent = {
  id: string;
  label: string;
  detail: string;
  xp: number;
  gems: number;
  sponsorEvent: "view" | "attempt" | "completion";
  myContribution: number;
  totalContribution: number;
};

const MOMENT_EVENTS: MomentEvent[] = [
  {
    id: "swing",
    label: "+20 projected swing",
    detail: "Projection flips after lineup vote lock",
    xp: 28,
    gems: 7,
    sponsorEvent: "view",
    myContribution: 20,
    totalContribution: 52,
  },
  {
    id: "td50",
    label: "50+ yard touchdown",
    detail: "Auto-trigger taunt + momentum bonus",
    xp: 36,
    gems: 10,
    sponsorEvent: "attempt",
    myContribution: 28,
    totalContribution: 72,
  },
  {
    id: "fg50",
    label: "Clutch 50+ yard field goal",
    detail: "Late window clutch reward event",
    xp: 24,
    gems: 6,
    sponsorEvent: "completion",
    myContribution: 18,
    totalContribution: 46,
  },
];

const SPONSOR_CARDS = [
  { id: "dominos", brand: "Domino's", reward: "Free medium pizza", eta: "1 win away" },
  { id: "nike", brand: "Nike", reward: "Avatar shoe drop", eta: "2 actions away" },
  { id: "chipotle", brand: "Chipotle", reward: "BOGO burrito", eta: "Almost there" },
];

export default function LiveEconomyScreen() {
  const theme = useDemoTheme();
  const {
    state,
    completeFeature,
    recordLiveMoment,
    recordSponsorEvent,
    addSquadContribution,
  } = useInvestorDemo();
  const [lastMoment, setLastMoment] = useState<string | null>(null);

  const sponsorProgress = useMemo(() => {
    const { views, attempts, completions, redemptions } = state.sponsorFunnel;
    const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

    // Monotonic sponsor progress: each bar only moves upward as absolute funnel
    // counters increase (no relative-ratio math that can make bars shrink).
    const dominos = clamp(22 + views * 10 + attempts * 6 + completions * 4 + redemptions * 8);
    const nike = clamp(12 + attempts * 13 + completions * 7 + redemptions * 8);
    const chipotle = clamp(8 + completions * 18 + redemptions * 11);

    return [dominos, nike, chipotle];
  }, [state.sponsorFunnel]);

  const squadPct = Math.min(
    100,
    Math.round((state.squadObjective.totalContribution / state.squadObjective.target) * 100),
  );

  return (
    <DemoModuleScaffold
      title="Live Economy Engine"
      subtitle="Reactive game moments feed rewards, sponsor value, and squad progression in real time."
      moduleIntroKey="live_economy"
      footer={<FeatureFooter featureId="economy" />}
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
        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
            Live Moments Timeline
          </Text>
          <View
            style={[
              styles.livePill,
              {
                borderColor: `${theme.primary}60`,
                backgroundColor: `${theme.primary}20`,
              },
            ]}
          >
            <View style={[styles.liveDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.liveText, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
              Live
            </Text>
          </View>
        </View>

        {MOMENT_EVENTS.map((event) => (
          <TouchableOpacity
            key={event.id}
            activeOpacity={0.88}
            style={[
              styles.eventCard,
              {
                borderColor: `${theme.primary}34`,
                backgroundColor: theme.surface,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              recordLiveMoment({
                xp: event.xp,
                gems: event.gems,
                sponsorEvent: event.sponsorEvent,
                myContribution: event.myContribution,
                totalContribution: event.totalContribution,
              });
              setLastMoment(event.label);
              completeFeature("economy");
            }}
          >
            <View style={styles.eventHeader}>
              <Text style={[styles.eventLabel, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
                {event.label}
              </Text>
              <Text style={[styles.eventReward, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
                +{event.xp} XP • +{event.gems} Gems
              </Text>
            </View>
            <Text style={[styles.eventDetail, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
              {event.detail}
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.lastMoment, { color: theme.textMuted, fontFamily: theme.bodyFont }]}>
          {lastMoment ? `Last event: ${lastMoment}` : "Tap a moment to run the engine"}
        </Text>
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
        <View style={styles.sponsorHeaderRow}>
          <Text style={[styles.sectionTitle, styles.sponsorSectionTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
            Sponsor Rewards Marketplace
          </Text>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              recordSponsorEvent("redemption");
              completeFeature("economy");
            }}
            style={[styles.redeemButton, { borderColor: `${theme.primary}54`, backgroundColor: `${theme.primary}20` }]}
          >
            <MaterialIcons name="redeem" size={14} color={theme.primaryLight} />
            <Text style={[styles.redeemText, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
              Sim Redeem
            </Text>
          </TouchableOpacity>
        </View>

        {SPONSOR_CARDS.map((card, index) => (
          <View
            key={card.id}
            style={[
              styles.sponsorCard,
              { borderColor: `${theme.primary}32`, backgroundColor: theme.surface },
            ]}
          >
            <View style={styles.sponsorHeader}>
              <Text style={[styles.sponsorTitle, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
                {card.brand} — {card.reward}
              </Text>
              <Text style={[styles.sponsorEta, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
                {card.eta}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: `${theme.primary}16` }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${sponsorProgress[index]}%`,
                    backgroundColor: index === 1 ? "#A88EFF" : "#65D7C2",
                  },
                ]}
              />
            </View>
          </View>
        ))}

        <View
          style={[
            styles.funnelPanel,
            { borderColor: `${theme.primary}30`, backgroundColor: theme.surface },
          ]}
        >
          <Text style={[styles.funnelTitle, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
            Investor Funnel (Sim)
          </Text>
          <View style={styles.funnelRow}>
            <Text style={[styles.funnelLabel, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
              Views → Attempts
            </Text>
            <Text style={[styles.funnelValue, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
              {state.sponsorFunnel.views} → {state.sponsorFunnel.attempts}
            </Text>
          </View>
          <View style={styles.funnelRow}>
            <Text style={[styles.funnelLabel, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
              Completions → Redemptions
            </Text>
            <Text style={[styles.funnelValue, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
              {state.sponsorFunnel.completions} → {state.sponsorFunnel.redemptions}
            </Text>
          </View>
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
        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
            Squad Economy Layer
          </Text>
          <Text style={[styles.squadBadge, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
            Shared Chest
          </Text>
        </View>

        <Text style={[styles.squadBody, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
          Weekly objective: Fill the squad reward chest to unlock a shared cosmetic drop.
        </Text>

        <View style={[styles.progressTrack, { backgroundColor: `${theme.primary}16` }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${squadPct}%`, backgroundColor: theme.primary },
            ]}
          />
        </View>

        <View style={styles.squadMetrics}>
          <Text style={[styles.squadMetric, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
            My Contribution: {state.squadObjective.myContribution}
          </Text>
          <Text style={[styles.squadMetric, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
            Squad Total: {state.squadObjective.totalContribution}/{state.squadObjective.target}
          </Text>
        </View>

        <View style={styles.squadActions}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.squadActionBtn, { backgroundColor: theme.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              addSquadContribution(25, 65);
              completeFeature("economy");
            }}
          >
            <MaterialIcons name="groups" size={16} color={theme.appBackground} />
            <Text style={[styles.squadActionText, { color: theme.appBackground, fontFamily: theme.buttonFont }]}>
              Add Squad Progress
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </DemoModuleScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  sponsorHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  sponsorSectionTitle: {
    minWidth: 180,
    flex: 1,
  },
  livePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.25,
  },
  eventCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  eventLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  eventReward: {
    fontSize: 11,
    fontWeight: "800",
  },
  eventDetail: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  lastMoment: {
    fontSize: 11,
    fontWeight: "600",
  },
  redeemButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  redeemText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.25,
    textTransform: "uppercase",
  },
  sponsorCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 7,
  },
  sponsorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  sponsorTitle: {
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
  },
  sponsorEta: {
    fontSize: 11,
    fontWeight: "600",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  funnelPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  funnelTitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  funnelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  funnelLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  funnelValue: {
    fontSize: 11,
    fontWeight: "800",
  },
  squadBadge: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.24,
  },
  squadBody: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  squadMetrics: {
    gap: 3,
  },
  squadMetric: {
    fontSize: 12,
    fontWeight: "700",
  },
  squadActions: {
    flexDirection: "row",
    gap: 8,
  },
  squadActionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  squadActionText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
