import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { DemoModuleScaffold } from "@/components/demo/DemoModuleScaffold";
import { FeatureFooter } from "@/components/demo/FeatureFooter";
import { DemoThemeTokens, useDemoTheme } from "@/lib/demoTheme";
import { useInvestorDemo } from "@/contexts/investor-demo";

type TrophyTier = "rare" | "epic" | "legendary";

type TrophyItem = {
  id: string;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  tier: TrophyTier;
  row: 0 | 1 | 2;
  unlockRule: string;
  earnedOn: string;
  nflBenchmark: string;
  benchmarkDetails: string[];
  impact: string;
};

function getTierTone(theme: DemoThemeTokens): Record<TrophyTier, { icon: string; glow: string; badge: string }> {
  if (theme.id === "miamiVice") {
    return {
      rare: { icon: "#67E8FF", glow: "rgba(103, 232, 255, 0.3)", badge: "#67E8FF" },
      epic: { icon: "#FF7CCE", glow: "rgba(255, 124, 206, 0.33)", badge: "#FF7CCE" },
      legendary: { icon: "#FFE27D", glow: "rgba(255, 226, 125, 0.34)", badge: "#FFE27D" },
    };
  }

  if (theme.id === "retro") {
    return {
      rare: { icon: "#FFB36C", glow: "rgba(255, 179, 108, 0.3)", badge: "#FFB36C" },
      epic: { icon: "#E18D63", glow: "rgba(225, 141, 99, 0.34)", badge: "#E18D63" },
      legendary: { icon: "#F5D08A", glow: "rgba(245, 208, 138, 0.35)", badge: "#F5D08A" },
    };
  }

  if (theme.id === "jungle") {
    return {
      rare: { icon: "#88EFB1", glow: "rgba(136, 239, 177, 0.3)", badge: "#88EFB1" },
      epic: { icon: "#8DD8A5", glow: "rgba(141, 216, 165, 0.34)", badge: "#8DD8A5" },
      legendary: { icon: "#D3EE87", glow: "rgba(211, 238, 135, 0.34)", badge: "#D3EE87" },
    };
  }

  return {
    rare: { icon: "#56D7FF", glow: "rgba(86, 215, 255, 0.28)", badge: "#56D7FF" },
    epic: { icon: "#B78BFF", glow: "rgba(183, 139, 255, 0.3)", badge: "#B78BFF" },
    legendary: { icon: "#F3C85B", glow: "rgba(243, 200, 91, 0.34)", badge: "#F3C85B" },
  };
}

const TROPHIES: TrophyItem[] = [
  {
    id: "mvp-chain",
    name: "MVP Chain",
    icon: "workspace-premium",
    tier: "legendary",
    row: 0,
    unlockRule: "Score 170+ fantasy points in one NFL week.",
    earnedOn: "Week 11, 2025 Season",
    nflBenchmark: "2020 Alvin Kamara: 6 rushing TDs in one game",
    benchmarkDetails: [
      "Saints vs Vikings (Dec 25, 2020)",
      "6 rushing touchdowns is an NFL record tie",
      "Fantasy ceiling example for league-winning spike weeks",
    ],
    impact: "Signals elite weekly ceiling and creates high social status in-league.",
  },
  {
    id: "meta-box",
    name: "Meta Box",
    icon: "inbox",
    tier: "epic",
    row: 0,
    unlockRule: "Win 3 straight weeks via lineup vote decisions.",
    earnedOn: "Weeks 6–8, 2025 Season",
    nflBenchmark: "2023 C.J. Stroud: 470 pass yards, 5 TD, 0 INT",
    benchmarkDetails: [
      "Texans vs Buccaneers (Week 9, 2023)",
      "Rookie single-game passing yards record",
      "Decision optimization outcome model in lineup module",
    ],
    impact: "Proves strategy engagement and reinforces lineup-vote retention loop.",
  },
  {
    id: "gold-stack",
    name: "Gold Stack",
    icon: "payments",
    tier: "rare",
    row: 0,
    unlockRule: "Accumulate 1,000 gems from gameplay actions.",
    earnedOn: "Milestone reached in 27 active sessions",
    nflBenchmark: "2023 Tyreek Hill: 215 receiving yards (Week 1)",
    benchmarkDetails: [
      "Dolphins vs Chargers (Week 1, 2023)",
      "Immediate explosive output drives fantasy economy swings",
      "Used as reward pacing benchmark for gem inflation controls",
    ],
    impact: "Demonstrates economy stickiness from repeat micro-achievements.",
  },
  {
    id: "founder-bust",
    name: "Founder Bust",
    icon: "emoji-events",
    tier: "legendary",
    row: 0,
    unlockRule: "Finish top-2 in final standings for 2 consecutive seasons.",
    earnedOn: "2024 + 2025 Seasons",
    nflBenchmark: "Tom Brady: 7 career Super Bowl wins",
    benchmarkDetails: [
      "Long-horizon dominance benchmark",
      "Used for dynasty-style prestige framing",
      "Encourages season-over-season reactivation behavior",
    ],
    impact: "Anchors long-term identity and offseason re-engagement.",
  },
  {
    id: "sun-crest",
    name: "Sun Crest",
    icon: "brightness-5",
    tier: "epic",
    row: 1,
    unlockRule: "Record 5 Sunday matchup wins in a row.",
    earnedOn: "Weeks 3–7, 2025 Season",
    nflBenchmark: "2007 Patriots: 16-0 regular season run",
    benchmarkDetails: [
      "Historic consistency benchmark",
      "High weekly win-streak pressure scenario",
      "Maps directly to streak-based achievement systems",
    ],
    impact: "Creates habit loops through streak protection behavior.",
  },
  {
    id: "skull-mark",
    name: "Skull Mark",
    icon: "sports-mma",
    tier: "rare",
    row: 1,
    unlockRule: "Beat projected odds by 20%+ in a single week.",
    earnedOn: "Week 9, 2025 Season",
    nflBenchmark: "2022 Vikings largest comeback: 33-point deficit",
    benchmarkDetails: [
      "Vikings vs Colts (Week 15, 2022)",
      "Largest comeback in NFL history",
      "Upset narrative benchmark for underdog wins",
    ],
    impact: "Drives emotional peaks and post-game social sharing.",
  },
  {
    id: "mini-oscar",
    name: "Mini Oscar",
    icon: "military-tech",
    tier: "rare",
    row: 1,
    unlockRule: "Start a low-rostered player who posts 20+ points.",
    earnedOn: "Week 4, 2025 Season",
    nflBenchmark: "2023 De'Von Achane: 203 rush yds, 2 rush TD",
    benchmarkDetails: [
      "Dolphins vs Broncos (Week 3, 2023)",
      "One of the biggest rookie breakouts of the season",
      "Captures surprise breakout archetype in fantasy",
    ],
    impact: "Rewards research and boosts confidence in lineup experimentation.",
  },
  {
    id: "crossed-gold",
    name: "Crossed Gold",
    icon: "build",
    tier: "epic",
    row: 1,
    unlockRule: "Complete 3 successful trade proposals in one season.",
    earnedOn: "2025 Season",
    nflBenchmark: "Rams 2021 all-in roster strategy",
    benchmarkDetails: [
      "Aggressive roster construction benchmark",
      "Team-building over static roster inertia",
      "Used to frame high-activity manager behavior",
    ],
    impact: "Increases trade activity and social negotiation frequency.",
  },
  {
    id: "legacy-book",
    name: "Legacy Book",
    icon: "menu-book",
    tier: "rare",
    row: 2,
    unlockRule: "Complete 2 seasons with 90% lineup lock compliance.",
    earnedOn: "2024–2025 Seasons",
    nflBenchmark: "Peyton Manning film-study prep model",
    benchmarkDetails: [
      "Preparation and weekly discipline benchmark",
      "Correlates with consistent start/sit management",
      "Supports competitive integrity narrative",
    ],
    impact: "Promotes reliable weekly engagement and lower churn.",
  },
  {
    id: "iron-cross",
    name: "Iron Cross",
    icon: "church",
    tier: "rare",
    row: 2,
    unlockRule: "Maintain top-3 points-for rank across 10+ weeks.",
    earnedOn: "Weeks 1–12, 2025 Season",
    nflBenchmark: "2013 Broncos: 606 points scored",
    benchmarkDetails: [
      "Most points scored in one NFL season",
      "Offensive consistency benchmark",
      "Fantasy equivalent of sustained scoring pressure",
    ],
    impact: "Rewards season-long excellence, not only matchup luck.",
  },
  {
    id: "relic-plate",
    name: "Relic Plate",
    icon: "receipt-long",
    tier: "epic",
    row: 2,
    unlockRule: "Execute waiver claim that becomes top-12 seasonal performer.",
    earnedOn: "Week 2 claim, 2025 Season",
    nflBenchmark: "2021 Cooper Kupp triple crown season",
    benchmarkDetails: [
      "145 catches, 1,947 yards, 16 TD",
      "Elite acquisition value benchmark",
      "Waiver impact modeled with season-long value lift",
    ],
    impact: "Incentivizes active waiver behavior and recurring app opens.",
  },
  {
    id: "alpha-sigil",
    name: "Alpha Sigil",
    icon: "change-history",
    tier: "legendary",
    row: 2,
    unlockRule: "Win league championship and lead playoffs in points.",
    earnedOn: "2025 Championship Week",
    nflBenchmark: "Patrick Mahomes multi-title playoff efficiency",
    benchmarkDetails: [
      "High-leverage postseason performance benchmark",
      "Championship pressure conversion archetype",
      "Final-stage prestige unlock trigger",
    ],
    impact: "Top-tier social flex artifact with highest retention value.",
  },
];

export default function LockerRoomScreen() {
  const [selectedTrophy, setSelectedTrophy] = useState<TrophyItem | null>(null);
  const theme = useDemoTheme();
  const { completeFeature } = useInvestorDemo();
  const tierTone = useMemo(() => getTierTone(theme), [theme]);

  const shelves = useMemo(() => {
    const byRow: TrophyItem[][] = [[], [], []];
    TROPHIES.forEach((trophy) => {
      byRow[trophy.row].push(trophy);
    });
    return byRow;
  }, []);

  const selectedTone = selectedTrophy ? tierTone[selectedTrophy.tier] : null;

  return (
    <DemoModuleScaffold
      title="Locker Room"
      subtitle="Identity surface for achievements, rarity tiers, streaks, and long-term bragging rights."
      footer={<FeatureFooter featureId="locker" />}
    >
      <LinearGradient
        colors={[`${theme.primary}32`, `${theme.primaryLight}14`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.summaryCard, { borderColor: `${theme.primary}46` }]}
      >
        <Text style={[styles.summaryTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
          Current Prestige Snapshot
        </Text>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCell, { borderColor: `${theme.primary}36`, backgroundColor: theme.glass }]}>
            <Text style={[styles.summaryValue, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>4</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
              Win Streak
            </Text>
          </View>
          <View style={[styles.summaryCell, { borderColor: `${theme.primary}36`, backgroundColor: theme.glass }]}>
            <Text style={[styles.summaryValue, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>18</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
              Unlocked Badges
            </Text>
          </View>
          <View style={[styles.summaryCell, { borderColor: `${theme.primary}36`, backgroundColor: theme.glass }]}>
            <Text style={[styles.summaryValue, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
              92%
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
              Season Mastery
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.displayHint, { borderColor: `${theme.primary}30`, backgroundColor: theme.glass }]}>
        <Text style={[styles.displayHintText, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
          Tap any trophy to inspect how it was earned and the NFL benchmark behind it.
        </Text>
      </View>

      <LinearGradient
        colors={[theme.surfaceElevated, theme.surface, theme.appBackground]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.caseFrame, { borderColor: `${theme.primary}4A` }]}
      >
        <View style={[styles.caseHeader, { backgroundColor: theme.glass, borderBottomColor: `${theme.primary}28` }]}>
          <View style={[styles.light, { backgroundColor: `${theme.primaryLight}D9`, shadowColor: theme.primaryLight }]} />
          <View style={[styles.light, { backgroundColor: `${theme.primaryLight}D9`, shadowColor: theme.primaryLight }]} />
          <View style={[styles.light, { backgroundColor: `${theme.primaryLight}D9`, shadowColor: theme.primaryLight }]} />
          <View style={[styles.light, { backgroundColor: `${theme.primaryLight}D9`, shadowColor: theme.primaryLight }]} />
        </View>

        <View style={[styles.caseInner, { backgroundColor: theme.surface }]}>
          <View style={[styles.glassReflectionLeft, { backgroundColor: `${theme.primaryLight}22` }]} />
          <View style={[styles.glassReflectionRight, { backgroundColor: `${theme.primaryLight}14` }]} />

          {shelves.map((row, index) => (
            <View key={`row-${index}`} style={styles.shelfSection}>
              <View style={styles.trophyRow}>
                {row.map((trophy) => {
                  const tone = tierTone[trophy.tier];

                  return (
                    <TouchableOpacity
                      key={trophy.id}
                      style={styles.trophySlot}
                      activeOpacity={0.86}
                      onPress={() => {
                        setSelectedTrophy(trophy);
                        completeFeature("locker");
                      }}
                    >
                      <View style={[styles.tierPill, { borderColor: tone.badge }]}>
                        <Text
                          style={[
                            styles.tierPillText,
                            { color: tone.badge, fontFamily: theme.labelFont },
                          ]}
                        >
                          {trophy.tier.toUpperCase()}
                        </Text>
                      </View>

                      <View style={[styles.trophyGlow, { backgroundColor: tone.glow }]} />
                      <View style={[styles.trophyIconBase, { backgroundColor: `${tone.badge}22`, borderColor: `${tone.badge}40` }]}>
                        <MaterialIcons name={trophy.icon} size={24} color={tone.icon} />
                      </View>
                      <View style={[styles.plaque, { borderColor: `${tone.badge}42`, backgroundColor: theme.glass }]}>
                        <Text style={[styles.plaqueText, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
                          {trophy.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {index < shelves.length - 1 ? (
                <View style={[styles.shelfDivider, { backgroundColor: `${theme.primary}28` }]} />
              ) : null}
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.legendRow}>
        <View style={styles.legendPill}>
          <View style={[styles.legendDot, { backgroundColor: tierTone.rare.badge }]} />
          <Text style={[styles.legendText, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>Rare</Text>
        </View>
        <View style={styles.legendPill}>
          <View style={[styles.legendDot, { backgroundColor: tierTone.epic.badge }]} />
          <Text style={[styles.legendText, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>Epic</Text>
        </View>
        <View style={styles.legendPill}>
          <View style={[styles.legendDot, { backgroundColor: tierTone.legendary.badge }]} />
          <Text style={[styles.legendText, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
            Legendary
          </Text>
        </View>
      </View>

      <Modal
        visible={selectedTrophy != null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTrophy(null)}
      >
        <View style={styles.modalWrap}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedTrophy(null)} />

          {selectedTrophy != null ? (
            <View style={styles.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
                <View style={styles.modalHeaderRow}>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
                    {selectedTrophy.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedTrophy(null)}
                    style={styles.modalClose}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="close" size={18} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.modalTierPill,
                    selectedTone
                      ? {
                          backgroundColor: `${selectedTone.badge}26`,
                          borderColor: `${selectedTone.badge}70`,
                        }
                      : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.modalTierText,
                      selectedTone ? { color: selectedTone.badge, fontFamily: theme.labelFont } : null,
                    ]}
                  >
                    {selectedTrophy.tier.toUpperCase()}
                  </Text>
                </View>

                <Text style={[styles.modalSectionTitle, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
                  How It Was Earned
                </Text>
                <Text style={[styles.modalBody, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
                  {selectedTrophy.unlockRule}
                </Text>
                <Text style={[styles.modalBody, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
                  Earned: {selectedTrophy.earnedOn}
                </Text>

                <Text style={[styles.modalSectionTitle, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
                  NFL Benchmark
                </Text>
                <Text style={[styles.modalBodyStrong, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
                  {selectedTrophy.nflBenchmark}
                </Text>
                {selectedTrophy.benchmarkDetails.map((detail) => (
                  <Text
                    key={detail}
                    style={[styles.modalBody, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}
                  >
                    • {detail}
                  </Text>
                ))}

                <Text style={[styles.modalSectionTitle, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
                  Why It Matters
                </Text>
                <Text style={[styles.modalBody, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
                  {selectedTrophy.impact}
                </Text>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </DemoModuleScaffold>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryCell: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  displayHint: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  displayHintText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  caseFrame: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  caseHeader: {
    height: 44,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  light: {
    width: 36,
    height: 11,
    borderRadius: 999,
    shadowOpacity: 0.42,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 1 },
  },
  caseInner: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    position: "relative",
  },
  glassReflectionLeft: {
    position: "absolute",
    top: 0,
    left: 20,
    width: 1,
    height: "100%",
  },
  glassReflectionRight: {
    position: "absolute",
    top: 0,
    right: 18,
    width: 1,
    height: "100%",
  },
  shelfSection: {
    paddingTop: 12,
  },
  trophyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  trophySlot: {
    flex: 1,
    minHeight: 124,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingHorizontal: 2,
  },
  trophyGlow: {
    position: "absolute",
    width: 62,
    height: 62,
    borderRadius: 999,
    top: 22,
  },
  tierPill: {
    position: "absolute",
    top: 8,
    right: 2,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(9, 13, 19, 0.72)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 3,
  },
  tierPillText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.35,
  },
  trophyIconBase: {
    width: 46,
    height: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  plaque: {
    marginTop: 10,
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 5,
    minHeight: 38,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  plaqueText: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "800",
    letterSpacing: 0.18,
    textAlign: "center",
  },
  shelfDivider: {
    marginTop: 10,
    height: 1,
  },
  legendRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  legendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(170, 193, 217, 0.22)",
    backgroundColor: "rgba(20, 38, 59, 0.64)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "700",
  },
  modalWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4,12,20,0.8)",
  },
  modalCard: {
    maxHeight: "78%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "#0F1D2D",
    borderWidth: 1,
    borderColor: "rgba(170, 193, 217, 0.24)",
    paddingTop: 12,
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingBottom: 26,
    gap: 10,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    flex: 1,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(170, 193, 217, 0.16)",
  },
  modalTierPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(243,200,91,0.2)",
    borderWidth: 1,
    borderColor: "rgba(243,200,91,0.42)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  modalTierText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 4,
  },
  modalBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  modalBodyStrong: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
});
