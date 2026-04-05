import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { DemoModuleScaffold } from "@/components/demo/DemoModuleScaffold";
import { FeatureFooter } from "@/components/demo/FeatureFooter";
import { UnlockRevealModal } from "@/components/demo/UnlockRevealModal";
import { useInvestorDemo } from "@/contexts/investor-demo";
import {
  DEMO_BATTLE_PASS_TIERS,
  DEMO_UNLOCK_ITEMS,
  DemoRevealStage,
  DemoUnlockItemId,
  getUnlockItemsForLevel,
} from "@/lib/demoBattlePass";
import { useDemoTheme } from "@/lib/demoTheme";

type TierVisualState = "claimed" | "current" | "upcoming";

function getTierState(tierLevel: number, currentLevel: number): TierVisualState {
  if (tierLevel === currentLevel) return "current";
  if (tierLevel < currentLevel) return "claimed";
  return "upcoming";
}

export default function BattlePassScreen() {
  const router = useRouter();
  const theme = useDemoTheme();
  const { state, completeSecondBattlePassAction, markRevealSeen, completeFeature } = useInvestorDemo();

  const [replayStage, setReplayStage] = useState<DemoRevealStage>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const lastRevealStageRef = useRef<DemoRevealStage>(null);

  const tierLevels = useMemo(() => DEMO_BATTLE_PASS_TIERS.map((tier) => tier.level), []);
  const unlockTierLevels = useMemo(
    () =>
      DEMO_BATTLE_PASS_TIERS.filter((tier) =>
        tier.rewards.some((reward) => reward.type === "unlockable")
      ).map((tier) => tier.level),
    []
  );

  const currentTierLevel = useMemo(() => {
    const exact = tierLevels.includes(state.battlePassLevel);
    if (exact) return state.battlePassLevel;

    const eligible = tierLevels.filter((level) => level <= state.battlePassLevel);
    if (eligible.length === 0) return tierLevels[0] ?? 1;

    return eligible[eligible.length - 1];
  }, [tierLevels, state.battlePassLevel]);

  const currentIndex = useMemo(
    () => Math.max(0, tierLevels.findIndex((level) => level === currentTierLevel)),
    [tierLevels, currentTierLevel]
  );

  const progressPct = useMemo(() => {
    if (tierLevels.length <= 1) return 0;
    return (currentIndex / (tierLevels.length - 1)) * 100;
  }, [currentIndex, tierLevels.length]);
  const timelineInset = 8;
  const usableTimelineWidth = Math.max(0, timelineWidth - timelineInset * 2);

  const unlockProgressPct = useMemo(() => {
    if (unlockTierLevels.length === 0) return 0;
    if (unlockTierLevels.length === 1) {
      return state.battlePassLevel >= unlockTierLevels[0] ? 100 : 0;
    }

    const first = unlockTierLevels[0];
    const last = unlockTierLevels[unlockTierLevels.length - 1];
    const span = Math.max(last - first, 1);
    const ratio = (state.battlePassLevel - first) / span;
    return Math.min(100, Math.max(0, ratio * 100));
  }, [state.battlePassLevel, unlockTierLevels]);

  const derivedRevealStage = useMemo<DemoRevealStage>(() => {
    if (state.pendingReveal === "level10") return "level10";
    if (state.pendingReveal === "level5") return "level5";

    if (
      state.battlePassLevel >= 10 &&
      !state.hasSeenBattlePassLevel10Reveal &&
      state.hasSeenBattlePassLevel5Reveal
    ) {
      return "level10";
    }

    if (state.battlePassLevel >= 5 && !state.hasSeenBattlePassLevel5Reveal) {
      return "level5";
    }

    return null;
  }, [
    state.pendingReveal,
    state.battlePassLevel,
    state.hasSeenBattlePassLevel10Reveal,
    state.hasSeenBattlePassLevel5Reveal,
  ]);

  const activeRevealStage = replayStage ?? derivedRevealStage;

  useEffect(() => {
    if (activeRevealStage != null && lastRevealStageRef.current !== activeRevealStage) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    lastRevealStageRef.current = activeRevealStage;
  }, [activeRevealStage]);

  const openLocker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push("/(investor-demo)/my-locker" as any);
  }, [router]);

  const handleSecondAction = useCallback(() => {
    const eligible = state.progressStep === "ready_for_second_action" && state.battlePassLevel < 10;
    if (!eligible) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    completeSecondBattlePassAction();
    completeFeature("battlepass");
  }, [state.progressStep, state.battlePassLevel, completeSecondBattlePassAction, completeFeature]);

  const handleReplayOpen = useCallback((stage: Exclude<DemoRevealStage, null>) => {
    Haptics.selectionAsync().catch(() => {});
    setReplayStage(stage);
  }, []);

  const revealItems = useMemo(() => {
    if (activeRevealStage === "level10") return getUnlockItemsForLevel(10);
    if (activeRevealStage === "level5") return getUnlockItemsForLevel(5);
    return [];
  }, [activeRevealStage]);

  const canRunSecondAction =
    state.progressStep === "ready_for_second_action" && state.battlePassLevel < 10;

  const showGoToLockerPrompt =
    state.battlePassLevel >= 10 &&
    state.progressStep === "go_to_locker" &&
    state.hasSeenBattlePassLevel10Reveal;

  const replayOptions = useMemo(() => {
    const options: Array<{ stage: Exclude<DemoRevealStage, null>; label: string }> = [];
    if (state.hasSeenBattlePassLevel5Reveal) {
      options.push({ stage: "level5", label: "Replay Lv5" });
    }
    if (state.hasSeenBattlePassLevel10Reveal) {
      options.push({ stage: "level10", label: "Replay Lv10" });
    }
    return options;
  }, [state.hasSeenBattlePassLevel5Reveal, state.hasSeenBattlePassLevel10Reveal]);

  function laneTone(lane: "Free" | "Premium") {
    if (lane === "Premium") {
      return {
        backgroundColor: "rgba(132, 118, 184, 0.18)",
        borderColor: "rgba(132, 118, 184, 0.4)",
        color: "#B5A5E4",
      };
    }

    return {
      backgroundColor: `${theme.primary}14`,
      borderColor: `${theme.primary}3D`,
      color: theme.primaryLight,
    };
  }

  function tierStateTone(stateValue: TierVisualState) {
    if (stateValue === "claimed") {
      return {
        label: "Complete",
        text: "#75D0B6",
        border: "rgba(117, 208, 182, 0.42)",
        cardBg: "rgba(21, 41, 37, 0.55)",
      };
    }

    if (stateValue === "current") {
      return {
        label: "Active",
        text: theme.primaryLight,
        border: `${theme.primary}52`,
        cardBg: `${theme.primary}12`,
      };
    }

    return {
      label: "Locked",
      text: theme.textMuted,
      border: `${theme.textMuted}4A`,
      cardBg: theme.surface,
    };
  }

  function isUnlocked(itemId: DemoUnlockItemId) {
    return state.unlockedItems.includes(itemId);
  }

  function isEquipped(itemId: DemoUnlockItemId) {
    if (DEMO_UNLOCK_ITEMS[itemId].kind === "suit") {
      return state.equipped.suit === itemId;
    }
    return state.equipped.football === itemId;
  }

  function closeReveal(stage: Exclude<DemoRevealStage, null>) {
    Haptics.selectionAsync().catch(() => {});
    if (replayStage === stage) {
      setReplayStage(null);
      return;
    }

    if (stage === "level5" && !state.hasSeenBattlePassLevel5Reveal) {
      markRevealSeen("level5");
      return;
    }

    if (stage === "level10" && !state.hasSeenBattlePassLevel10Reveal) {
      markRevealSeen("level10");
      return;
    }
  }

  function handleRevealCta(stage: Exclude<DemoRevealStage, null>) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const isReplay = replayStage === stage;

    if (isReplay) {
      setReplayStage(null);
      if (stage === "level10") {
        openLocker();
      }
      return;
    }

    if (stage === "level5" && !state.hasSeenBattlePassLevel5Reveal) {
      markRevealSeen("level5");
      return;
    }

    if (stage === "level10" && !state.hasSeenBattlePassLevel10Reveal) {
      markRevealSeen("level10");
      openLocker();
      return;
    }

    if (stage === "level10") {
      openLocker();
    }
  }

  return (
    <DemoModuleScaffold
      title="Battle Pass"
      subtitle="Milestone progression with cleaner reward clarity and unlock moments."
      moduleIntroKey="battle_pass"
      footer={<FeatureFooter featureId="battlepass" />}
    >
      <View style={[styles.summaryCard, { borderColor: theme.primaryBorder, backgroundColor: theme.surfaceElevated }]}>
        <View style={styles.summaryHeaderRow}>
          <Text style={[styles.summaryTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>Season 1 • Rivalry Rising</Text>
          <Text style={[styles.summaryLevel, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>Level {state.battlePassLevel}</Text>
        </View>
        <Text style={[styles.summaryCopy, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>Milestones at Levels 5 and 10 unlock suit + football bundles.</Text>

        <View
          style={[styles.timelineTrack, { backgroundColor: `${theme.primary}12` }]}
          onLayout={(event) => setTimelineWidth(event.nativeEvent.layout.width)}
        >
          <View style={[styles.timelineFill, { left: timelineInset, width: (progressPct / 100) * usableTimelineWidth, backgroundColor: theme.primary }]} />
          {tierLevels.map((level, index) => {
            const left =
              tierLevels.length <= 1
                ? timelineInset
                : timelineInset + (index / (tierLevels.length - 1)) * usableTimelineWidth;
            const reached = level <= currentTierLevel;
            return (
              <View key={`timeline-node-${level}`} style={[styles.timelineNodeWrap, { left }]}>
                <Text style={[styles.timelineNodeLabel, { color: reached ? theme.textPrimary : theme.textMuted, fontFamily: theme.labelFont }]}>L{level}</Text>
                <View
                  style={[
                    styles.timelineNode,
                    {
                      backgroundColor: reached ? theme.primary : `${theme.textMuted}55`,
                      borderColor: reached ? theme.primaryLight : `${theme.textMuted}88`,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.actionCard, { borderColor: theme.primaryBorder, backgroundColor: theme.surfaceElevated }]}>
        <Text style={[styles.actionTitle, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>Progression Action</Text>
        <Text style={[styles.actionCopy, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
          {state.battlePassLevel < 5
            ? "Use Home to trigger your first milestone."
            : state.battlePassLevel < 10
              ? "Run the second milestone action to unlock Level 10 rewards."
              : "Level 10 complete. Open My Locker to equip new cosmetics."}
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={canRunSecondAction ? 0.9 : 1}
            disabled={!canRunSecondAction}
            onPress={handleSecondAction}
            style={[
              styles.primaryAction,
              {
                backgroundColor: canRunSecondAction ? theme.primary : `${theme.primary}40`,
                opacity: canRunSecondAction ? 1 : 0.75,
              },
            ]}
          >
            <MaterialIcons name="rocket-launch" size={16} color={theme.appBackground} />
            <Text style={[styles.primaryActionText, { color: theme.appBackground, fontFamily: theme.buttonFont }]}>Reach Level 10 Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={openLocker}
            style={[styles.secondaryAction, { borderColor: theme.primaryBorder, backgroundColor: theme.surface }]}
          >
            <Text style={[styles.secondaryActionText, { color: theme.textPrimary, fontFamily: theme.buttonFont }]}>Go To My Locker</Text>
            <MaterialIcons name="arrow-forward" size={16} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        {replayOptions.length ? (
          <View style={styles.replayRow}>
            {replayOptions.map((entry) => (
              <TouchableOpacity
                key={entry.stage}
                style={[styles.replayButton, { borderColor: theme.primaryBorder, backgroundColor: theme.surface }]}
                activeOpacity={0.86}
                onPress={() => handleReplayOpen(entry.stage)}
              >
                <MaterialIcons name="replay" size={14} color={theme.textSecondary} />
                <Text style={[styles.replayText, { color: theme.textSecondary, fontFamily: theme.labelFont }]}>{entry.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.unlockTimelineWrap}>
        <View style={[styles.unlockTrackBase, { backgroundColor: `${theme.primary}25` }]}>
          <View
            style={[
              styles.unlockTrackFill,
              {
                backgroundColor: theme.primary,
                height: `${unlockProgressPct}%`,
              },
            ]}
          />
        </View>

      <View style={styles.tierStack}>
        {DEMO_BATTLE_PASS_TIERS.map((tier) => {
          const stateValue = getTierState(tier.level, currentTierLevel);
          const tone = tierStateTone(stateValue);
          const hasUnlockable = tier.rewards.some((reward) => reward.type === "unlockable");
          const unlockReached = hasUnlockable && state.battlePassLevel >= tier.level;

          return (
            <View key={tier.level} style={styles.tierRow}>
              {hasUnlockable ? (
                <View
                  style={[
                    styles.unlockNodeOuter,
                    {
                      borderColor: unlockReached ? `${theme.primary}A8` : `${theme.primary}4A`,
                      backgroundColor: unlockReached ? `${theme.primary}2A` : theme.surface,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.unlockNodeInner,
                      {
                        backgroundColor: unlockReached ? theme.primary : `${theme.textMuted}7A`,
                      },
                    ]}
                  />
                </View>
              ) : null}

              <View
                style={[
                  styles.tierCard,
                  {
                    borderColor: tone.border,
                    backgroundColor: tone.cardBg,
                  },
                ]}
              >
                <View style={styles.tierHeader}>
                  <View style={styles.tierHeaderLeft}>
                    <Text style={[styles.tierLevel, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>Level {tier.level}</Text>
                    <Text style={[styles.tierChallenge, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>{tier.challenge}</Text>
                  </View>

                  <View style={[styles.tierStatePill, { borderColor: tone.border, backgroundColor: theme.surface }]}> 
                    <Text style={[styles.tierStateText, { color: tone.text, fontFamily: theme.labelFont }]}>{tone.label}</Text>
                  </View>
                </View>

                <View style={styles.rewardStack}>
                  {tier.rewards.map((reward) => {
                    if (reward.type === "unlockable") {
                      const item = DEMO_UNLOCK_ITEMS[reward.itemId];
                      const unlocked = isUnlocked(item.id);
                      const equipped = isEquipped(item.id);
                      const lane = laneTone(item.lane);

                      return (
                        <View key={item.id} style={[styles.rewardRow, { borderColor: theme.primaryBorder, backgroundColor: theme.surface }]}> 
                          <Image source={item.image} resizeMode="cover" style={styles.rewardImage} />
                          <View style={styles.rewardMeta}>
                            <Text style={[styles.rewardName, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>{item.name}</Text>
                            <View style={styles.rewardPills}>
                              <View style={[styles.lanePill, lane]}>
                                <Text style={[styles.laneText, { color: lane.color, fontFamily: theme.labelFont }]}>{item.lane}</Text>
                              </View>
                              <View
                                style={[
                                  styles.statusPill,
                                  {
                                    borderColor: unlocked ? "rgba(117, 208, 182, 0.48)" : `${theme.textMuted}44`,
                                    backgroundColor: unlocked ? "rgba(117, 208, 182, 0.16)" : `${theme.textMuted}18`,
                                  },
                                ]}
                              >
                                <Text style={[styles.statusText, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
                                  {equipped ? "Equipped" : unlocked ? "Unlocked" : "Locked"}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    }

                    const lane = laneTone(reward.lane);
                    return (
                      <View key={reward.id} style={[styles.rewardRow, { borderColor: theme.primaryBorder, backgroundColor: theme.surface }]}> 
                        <View style={[styles.metaIconWrap, { backgroundColor: `${lane.color}20` }]}> 
                          <MaterialIcons name={reward.icon as keyof typeof MaterialIcons.glyphMap} size={16} color={lane.color} />
                        </View>
                        <View style={styles.rewardMeta}>
                          <Text style={[styles.rewardName, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>{reward.name}</Text>
                          <View style={[styles.lanePill, lane]}>
                            <Text style={[styles.laneText, { color: lane.color, fontFamily: theme.labelFont }]}>{reward.lane}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          );
        })}
      </View>
      </View>

      {showGoToLockerPrompt ? (
        <View style={[styles.directionCard, { borderColor: theme.primaryBorder, backgroundColor: theme.surfaceElevated }]}>
          <Text style={[styles.directionTitle, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>Next Step</Text>
          <Text style={[styles.directionCopy, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>Go to My Locker to equip the suit and football you just unlocked.</Text>
          <TouchableOpacity
            style={[styles.directionButton, { backgroundColor: theme.primary }]}
            activeOpacity={0.9}
            onPress={openLocker}
          >
            <Text style={[styles.directionButtonText, { color: theme.appBackground, fontFamily: theme.buttonFont }]}>Open My Locker</Text>
            <MaterialIcons name="arrow-forward" size={16} color={theme.appBackground} />
          </TouchableOpacity>
        </View>
      ) : null}

      <UnlockRevealModal
        visible={activeRevealStage === "level5"}
        title="Level 5 Bundle Unlocked"
        subtitle="Red suit plus common football unlocked. Your progression is now ready for the next milestone."
        items={revealItems}
        accent={theme.primary}
        accentLight={theme.primaryLight}
        textPrimary={theme.textPrimary}
        textSecondary={theme.textSecondary}
        bodyFont={theme.bodyFont}
        labelFont={theme.labelFont}
        buttonFont={theme.buttonFont}
        ctaLabel="Continue"
        onClose={() => closeReveal("level5")}
        onCta={() => handleRevealCta("level5")}
      />

      <UnlockRevealModal
        visible={activeRevealStage === "level10"}
        title="Level 10 Rare Bundle Unlocked"
        subtitle="Blue suit and chrome football unlocked. Jump into My Locker to equip your new loadout."
        items={revealItems}
        accent={theme.primary}
        accentLight={theme.primaryLight}
        textPrimary={theme.textPrimary}
        textSecondary={theme.textSecondary}
        bodyFont={theme.bodyFont}
        labelFont={theme.labelFont}
        buttonFont={theme.buttonFont}
        ctaLabel="Go To My Locker"
        onClose={() => closeReveal("level10")}
        onCta={() => handleRevealCta("level10")}
      />
    </DemoModuleScaffold>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.2,
    flex: 1,
  },
  summaryLevel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  summaryCopy: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  timelineTrack: {
    position: "relative",
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
  },
  timelineFill: {
    position: "absolute",
    width: 0,
    top: 18,
    bottom: 18,
    borderRadius: 999,
  },
  timelineNodeWrap: {
    position: "absolute",
    marginLeft: -12,
    alignItems: "center",
    gap: 4,
  },
  timelineNodeLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.24,
  },
  timelineNode: {
    width: 11,
    height: 11,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  actionCopy: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryAction: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  replayRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  replayButton: {
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  replayText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  tierStack: {
    gap: 12,
  },
  unlockTimelineWrap: {
    position: "relative",
    paddingLeft: 34,
  },
  unlockTrackBase: {
    position: "absolute",
    left: 11,
    top: 34,
    bottom: 34,
    width: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  unlockTrackFill: {
    width: "100%",
    borderRadius: 999,
  },
  tierRow: {
    position: "relative",
  },
  unlockNodeOuter: {
    position: "absolute",
    left: -34,
    top: 22,
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  unlockNodeInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  tierCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 9,
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  tierHeaderLeft: {
    flex: 1,
    gap: 3,
  },
  tierLevel: {
    fontSize: 13,
    fontWeight: "800",
  },
  tierChallenge: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  tierStatePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  tierStateText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.24,
  },
  rewardStack: {
    gap: 8,
  },
  rewardRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  rewardImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  metaIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardMeta: {
    flex: 1,
    gap: 6,
  },
  rewardName: {
    fontSize: 12,
    fontWeight: "800",
  },
  rewardPills: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  lanePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  laneText: {
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.28,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.26,
  },
  directionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  directionTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  directionCopy: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  directionButton: {
    marginTop: 2,
    minHeight: 42,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  directionButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
