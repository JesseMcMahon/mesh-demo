import { InvestorOverlay } from "@/components/demo/InvestorOverlay";
import { useInvestorDemo } from "@/contexts/investor-demo";
import { useDemoTheme } from "@/lib/demoTheme";
import { DEMO_FEATURES, DemoFeatureId } from "@/lib/investorDemoContent";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const FEATURE_ICON: Record<DemoFeatureId, keyof typeof MaterialIcons.glyphMap> =
  {
    lineup: "tune",
    locker: "emoji-events",
    crib: "home",
    economy: "hub",
    battlepass: "view-carousel",
    gems: "diamond",
    taunts: "campaign",
  };

function getFeatureTone(id: DemoFeatureId) {
  const tones: Record<DemoFeatureId, string> = {
    lineup: "#64D0C1",
    locker: "#E4C16E",
    crib: "#7BC6FF",
    economy: "#6FD1FF",
    battlepass: "#8F8AFF",
    gems: "#B889FF",
    taunts: "#FF8F74",
  };

  return tones[id];
}

const INTRO_STEPS = [
  {
    title: "Fantasy sports, reimagined.",
    body: "Mesh is built for the next era of fantasy: deeper competition, stronger communities, and a game that feels alive every week.",
    icon: "rocket-launch" as const,
  },
  {
    title: "Everything you expect. More than you've seen.",
    body: "Get the core fantasy experience you already know, plus social gameplay layers that make every decision, rivalry, and win feel bigger.",
    icon: "sports-football" as const,
  },
  {
    title: "Win solo. Or win as a squad.",
    body: "Compete as an individual or team up with friends toward a shared goal. Mesh blends personal strategy with group identity and collaboration.",
    icon: "groups" as const,
  },
  {
    title: "Progress that means something.",
    body: "Play to earn XP, gems, unlockables, and sponsor deals from brands you care about. Your success shows up in your identity, not just standings.",
    icon: "diamond" as const,
  },
  {
    title: "Quick tour: this is a guided demo.",
    body: "This demo showcases our signature features and long-term vision. Tap through sections, complete actions, and watch your profile evolve in real time.",
    icon: "explore" as const,
  },
];

export default function InvestorDemoHomeScreen() {
  const router = useRouter();
  const {
    state,
    resetDemo,
    nextLevelXp,
    isFeatureComplete,
    startBattlePassProgression,
    markCinematicIntroSeen,
    togglePresenterOverlay,
  } = useInvestorDemo();
  const theme = useDemoTheme();

  const [introStepIndex, setIntroStepIndex] = useState(0);
  const introOpacity = useRef(new Animated.Value(0)).current;
  const introTranslateY = useRef(new Animated.Value(14)).current;

  const handleResetDemo = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {},
    );
    resetDemo();
  }, [resetDemo]);

  const handleStartProgression = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    startBattlePassProgression();
    requestAnimationFrame(() => {
      router.replace("/(investor-demo)/battle-pass" as any);
    });
  }, [router, startBattlePassProgression]);

  const handleRoutePress = useCallback(
    (route: string) => {
      Haptics.selectionAsync().catch(() => {});
      router.push(route as any);
    },
    [router],
  );

  const levelProgress = useMemo(
    () => {
      if (nextLevelXp <= 0) return 0;
      return Math.max(0, Math.min(1, state.xp / nextLevelXp));
    },
    [nextLevelXp, state.xp],
  );

  const completedCount = state.completedFeatures.length;
  const unlockedCount = state.unlockedItems.length;
  const completionPercent = Math.round(
    (completedCount / DEMO_FEATURES.length) * 100,
  );
  const nextUnlockLabel =
    state.battlePassLevel < 5
      ? "Next unlock: Level 5"
      : state.battlePassLevel < 10
        ? "Next unlock: Level 10"
        : "All milestone unlocks claimed";
  const netFlowThisSession = state.sessionGemsEarned - state.sessionGemsSpent;
  const sinkUsageRate =
    state.sessionGemsEarned > 0
      ? Math.min(
          100,
          Math.round((state.sessionGemsSpent / state.sessionGemsEarned) * 100),
        )
      : 0;

  const showIntroModal = !state.hasSeenCinematicIntro;
  const introStep = INTRO_STEPS[introStepIndex];
  const isLastIntroStep = introStepIndex === INTRO_STEPS.length - 1;

  useEffect(() => {
    if (!showIntroModal) return;
    introOpacity.setValue(0);
    introTranslateY.setValue(14);
    Animated.parallel([
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(introTranslateY, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showIntroModal, introOpacity, introTranslateY]);

  const primaryCta = useMemo(() => {
    if (state.battlePassLevel < 5) {
      return {
        label: "Start Battle Pass Progression",
        action: handleStartProgression,
        icon: "rocket-launch" as const,
      };
    }

    if (state.battlePassLevel < 10) {
      return {
        label: "Continue In Battle Pass",
        action: () => handleRoutePress("/(investor-demo)/battle-pass"),
        icon: "view-carousel" as const,
      };
    }

    return {
      label: "Customize In My Locker",
      action: () => handleRoutePress("/(investor-demo)/my-locker"),
      icon: "inventory-2" as const,
    };
  }, [state.battlePassLevel, handleStartProgression, handleRoutePress]);

  const transitionIntroStep = useCallback(
    (nextIndex: number) => {
      Animated.parallel([
        Animated.timing(introOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(introTranslateY, {
          toValue: 10,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIntroStepIndex(nextIndex);
        introOpacity.setValue(0);
        introTranslateY.setValue(12);
        Animated.parallel([
          Animated.timing(introOpacity, {
            toValue: 1,
            duration: 190,
            useNativeDriver: true,
          }),
          Animated.timing(introTranslateY, {
            toValue: 0,
            duration: 190,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [introOpacity, introTranslateY],
  );

  const finishIntro = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    markCinematicIntroSeen();
  }, [markCinematicIntroSeen]);

  const onIntroNext = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    if (isLastIntroStep) {
      finishIntro();
      return;
    }
    transitionIntroStep(introStepIndex + 1);
  }, [finishIntro, introStepIndex, isLastIntroStep, transitionIntroStep]);

  const onIntroBack = useCallback(() => {
    if (introStepIndex === 0) return;
    Haptics.selectionAsync().catch(() => {});
    transitionIntroStep(introStepIndex - 1);
  }, [introStepIndex, transitionIntroStep]);

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.appBackground }]}
        contentContainerStyle={styles.content}
      >
        <View
          style={[
            styles.hero,
            {
              borderColor: theme.primaryBorder,
              backgroundColor: theme.surfaceElevated,
            },
          ]}
        >
          <View
            style={[
              styles.heroHeaderBand,
              {
                borderColor: `${theme.primary}45`,
                backgroundColor: `${theme.primary}12`,
              },
            ]}
          >
            <View style={styles.heroHeaderMain}>
              <View style={styles.kickerRow}>
                <View
                  style={[styles.liveDot, { backgroundColor: theme.primary }]}
                />
                <TouchableOpacity
                  activeOpacity={0.86}
                  onLongPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                      () => {},
                    );
                    togglePresenterOverlay();
                  }}
                >
                  <Text
                    style={[
                      styles.kicker,
                      { color: theme.kicker, fontFamily: theme.labelFont },
                    ]}
                  >
                    Mesh Demo Command Center
                  </Text>
                </TouchableOpacity>
              </View>
              <Text
                style={[
                  styles.heroHeading,
                  { color: theme.textPrimary, fontFamily: theme.displayFont },
                ]}
              >
                Mesh Gamification Showcase
              </Text>
              <Text
                style={[
                  styles.heroSubheading,
                  { color: theme.textSecondary, fontFamily: theme.bodyFont },
                ]}
              >
                One clean view of progression, unlocks, and social gameplay
                moments.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleResetDemo}
              activeOpacity={0.85}
              style={[
                styles.resetButton,
                {
                  borderColor: `${theme.primary}4A`,
                  backgroundColor: theme.glass,
                },
              ]}
            >
              <MaterialIcons
                name="restart-alt"
                size={16}
                color={theme.textPrimary}
              />
              <Text
                style={[
                  styles.resetButtonText,
                  { color: theme.textPrimary, fontFamily: theme.buttonFont },
                ]}
              >
                Reset
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroMetricGrid}>
            <View
              style={[
                styles.heroMetricCard,
                {
                  borderColor: `${theme.primary}3D`,
                  backgroundColor: theme.glass,
                },
              ]}
            >
              <View
                style={[
                  styles.metricIconWrap,
                  { backgroundColor: `${theme.primary}20` },
                ]}
              >
                <MaterialIcons
                  name="military-tech"
                  size={16}
                  color={theme.primaryLight}
                />
              </View>
              <Text
                style={[
                  styles.metricValue,
                  { color: theme.textPrimary, fontFamily: theme.displayFont },
                ]}
              >
                Level {state.level}
              </Text>
              <Text
                style={[
                  styles.metricLabel,
                  { color: theme.textSecondary, fontFamily: theme.bodyFont },
                ]}
              >
                {state.gems} Gems
              </Text>
            </View>

            <View
              style={[
                styles.heroMetricCard,
                {
                  borderColor: `${theme.primary}3D`,
                  backgroundColor: theme.glass,
                },
              ]}
            >
              <View
                style={[
                  styles.metricIconWrap,
                  { backgroundColor: `${theme.primary}20` },
                ]}
              >
                <MaterialIcons
                  name="inventory-2"
                  size={16}
                  color={theme.primaryLight}
                />
              </View>
              <Text
                style={[
                  styles.metricValue,
                  { color: theme.textPrimary, fontFamily: theme.displayFont },
                ]}
              >
                {unlockedCount}/4
              </Text>
              <Text
                style={[
                  styles.metricLabel,
                  { color: theme.textSecondary, fontFamily: theme.bodyFont },
                ]}
              >
                Battle Pass Items
              </Text>
            </View>

            <View
              style={[
                styles.heroMetricCard,
                {
                  borderColor: `${theme.primary}3D`,
                  backgroundColor: theme.glass,
                },
              ]}
            >
              <View
                style={[
                  styles.metricIconWrap,
                  { backgroundColor: `${theme.primary}20` },
                ]}
              >
                <MaterialIcons
                  name="task-alt"
                  size={16}
                  color={theme.primaryLight}
                />
              </View>
              <Text
                style={[
                  styles.metricValue,
                  { color: theme.textPrimary, fontFamily: theme.displayFont },
                ]}
              >
                {completedCount}/{DEMO_FEATURES.length}
              </Text>
              <Text
                style={[
                  styles.metricLabel,
                  { color: theme.textSecondary, fontFamily: theme.bodyFont },
                ]}
              >
                Features Complete
              </Text>
            </View>

            <View
              style={[
                styles.heroMetricCard,
                {
                  borderColor: `${theme.primary}3D`,
                  backgroundColor: theme.glass,
                },
              ]}
            >
              <View
                style={[
                  styles.metricIconWrap,
                  { backgroundColor: `${theme.primary}20` },
                ]}
              >
                <MaterialIcons
                  name="rocket-launch"
                  size={16}
                  color={theme.primaryLight}
                />
              </View>
              <Text
                style={[
                  styles.metricValue,
                  { color: theme.textPrimary, fontFamily: theme.displayFont },
                ]}
              >
                {completionPercent}%
              </Text>
              <Text
                style={[
                  styles.metricLabel,
                  { color: theme.textSecondary, fontFamily: theme.bodyFont },
                ]}
              >
                Demo Completion
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.progressPanel,
              {
                borderColor: `${theme.primary}3D`,
                backgroundColor: theme.glass,
              },
            ]}
          >
            <View style={styles.progressHeader}>
              <Text
                style={[
                  styles.progressTitle,
                  { color: theme.textPrimary, fontFamily: theme.labelFont },
                ]}
              >
                Progress To Next Level
              </Text>
              <Text
                style={[
                  styles.progressText,
                  { color: theme.textSecondary, fontFamily: theme.bodyFont },
                ]}
              >
                {state.xp} / {nextLevelXp} XP
              </Text>
            </View>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: `${theme.primary}22` },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(levelProgress * 100)}%`,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            </View>
            <View style={styles.progressMetaRow}>
              <Text
                style={[
                  styles.progressMeta,
                  { color: theme.textSecondary, fontFamily: theme.bodyFont },
                ]}
              >
                Deterministic flow: Level 1 → 5 → 10 unlock milestones.
              </Text>
              <Text
                style={[
                  styles.progressMetaHighlight,
                  { color: theme.primaryLight, fontFamily: theme.labelFont },
                ]}
              >
                {nextUnlockLabel}
              </Text>
            </View>
          </View>

          <View style={styles.heroActionsRow}>
            <TouchableOpacity
              style={[styles.primaryCta, { backgroundColor: theme.primary }]}
              activeOpacity={0.9}
              onPress={primaryCta.action}
            >
              <MaterialIcons
                name={primaryCta.icon}
                size={18}
                color={theme.surface}
              />
              <Text
                style={[
                  styles.primaryCtaText,
                  { color: theme.surface, fontFamily: theme.buttonFont },
                ]}
              >
                {primaryCta.label}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.commandCenterCard,
            {
              borderColor: `${theme.primary}44`,
              backgroundColor: theme.surfaceElevated,
            },
          ]}
        >
          <View style={styles.commandCenterHeader}>
            <Text
              style={[
                styles.commandCenterTitle,
                { color: theme.textPrimary, fontFamily: theme.displayFont },
              ]}
            >
              Economy Command Center
            </Text>
            <View
              style={[
                styles.commandCenterNetPill,
                {
                  borderColor:
                    netFlowThisSession >= 0 ? "#4DD9A6AA" : "#FF9D7CAA",
                  backgroundColor:
                    netFlowThisSession >= 0
                      ? "rgba(77, 217, 166, 0.15)"
                      : "rgba(255, 157, 124, 0.15)",
                },
              ]}
            >
              <Text
                style={[
                  styles.commandCenterNetText,
                  {
                    color: netFlowThisSession >= 0 ? "#75E7BA" : "#FFB49B",
                    fontFamily: theme.labelFont,
                  },
                ]}
              >
                Net {netFlowThisSession >= 0 ? "+" : ""}
                {netFlowThisSession} Gems
              </Text>
            </View>
          </View>

          <View style={styles.ledgerSplitRow}>
            <View
              style={[
                styles.ledgerCard,
                {
                  borderColor: `${theme.primary}35`,
                  backgroundColor: theme.glass,
                },
              ]}
            >
              <Text
                style={[
                  styles.ledgerTitle,
                  { color: theme.primaryLight, fontFamily: theme.labelFont },
                ]}
              >
                Seasonal Ledger
              </Text>
              <Text
                style={[
                  styles.ledgerValue,
                  { color: theme.textPrimary, fontFamily: theme.displayFont },
                ]}
              >
                L{state.seasonLevel}
              </Text>
              <Text
                style={[
                  styles.ledgerSub,
                  { color: theme.textSecondary, fontFamily: theme.bodyFont },
                ]}
              >
                {state.seasonXp} XP • Resets
              </Text>
            </View>

            <View
              style={[
                styles.ledgerCard,
                {
                  borderColor: `${theme.primary}35`,
                  backgroundColor: theme.glass,
                },
              ]}
            >
              <Text
                style={[
                  styles.ledgerTitle,
                  { color: theme.primaryLight, fontFamily: theme.labelFont },
                ]}
              >
                Lifetime Ledger
              </Text>
              <Text
                style={[
                  styles.ledgerValue,
                  { color: theme.textPrimary, fontFamily: theme.displayFont },
                ]}
              >
                P{state.lifetimePrestige}
              </Text>
              <Text
                style={[
                  styles.ledgerSub,
                  { color: theme.textSecondary, fontFamily: theme.bodyFont },
                ]}
              >
                {state.lifetimeGems} Gems • Persists
              </Text>
            </View>
          </View>

          <View style={styles.faucetSinkRow}>
            <View
              style={[
                styles.fsCard,
                {
                  borderColor: `${theme.primary}30`,
                  backgroundColor: theme.glass,
                },
              ]}
            >
              <Text
                style={[
                  styles.fsTitle,
                  { color: "#7DE9C4", fontFamily: theme.labelFont },
                ]}
              >
                Faucets
              </Text>
              <Text
                style={[
                  styles.fsBody,
                  { color: theme.textSecondary, fontFamily: theme.bodyFont },
                ]}
              >
                Lineup • Wins • Taunts • Sponsor
              </Text>
            </View>
            <View
              style={[
                styles.fsCard,
                {
                  borderColor: `${theme.primary}30`,
                  backgroundColor: theme.glass,
                },
              ]}
            >
              <Text
                style={[
                  styles.fsTitle,
                  { color: "#FFB48C", fontFamily: theme.labelFont },
                ]}
              >
                Sinks
              </Text>
              <Text
                style={[
                  styles.fsBody,
                  { color: theme.textSecondary, fontFamily: theme.bodyFont },
                ]}
              >
                Cosmetics • Boosts • Themes • Entry
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.commandCenterFootnote,
              { color: theme.textMuted, fontFamily: theme.bodyFont },
            ]}
          >
            Sink usage this session: {sinkUsageRate}%
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.myLockerCard,
            {
              borderColor: `${theme.primary}9A`,
              backgroundColor: `${theme.primary}2D`,
            },
          ]}
          activeOpacity={0.88}
          onPress={() => handleRoutePress("/(investor-demo)/my-locker")}
        >
          <View
            style={[
              styles.myLockerIconWrap,
              { backgroundColor: theme.surfaceElevated },
            ]}
          >
            <MaterialIcons
              name="inventory-2"
              size={20}
              color={theme.primaryLight}
            />
          </View>
          <View style={styles.myLockerTextWrap}>
            <Text
              style={[
                styles.myLockerTitle,
                { color: theme.textPrimary, fontFamily: theme.labelFont },
              ]}
            >
              My Locker
            </Text>
            <Text
              style={[
                styles.myLockerSub,
                { color: theme.textSecondary, fontFamily: theme.bodyFont },
              ]}
            >
              Avatar + loadout • {unlockedCount}/4 unlocks acquired
            </Text>
            <View
              style={[
                styles.myLockerPill,
                {
                  borderColor: `${theme.primary}80`,
                  backgroundColor: `${theme.appBackground}66`,
                },
              ]}
            >
              <Text
                style={[
                  styles.myLockerPillText,
                  { color: theme.primaryLight, fontFamily: theme.labelFont },
                ]}
              >
                Featured Path
              </Text>
            </View>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={theme.primaryLight}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roadmapCard,
            {
              borderColor: `${theme.primary}44`,
              backgroundColor: theme.surfaceElevated,
            },
          ]}
          activeOpacity={0.88}
          onPress={() => handleRoutePress("/(investor-demo)/roadmap")}
        >
          <View
            style={[
              styles.roadmapIconWrap,
              {
                backgroundColor: `${theme.primary}14`,
                borderColor: `${theme.primary}33`,
              },
            ]}
          >
            <MaterialIcons
              name="alt-route"
              size={22}
              color={theme.primaryLight}
            />
          </View>
          <View style={styles.roadmapTextWrap}>
            <Text
              style={[
                styles.roadmapTitle,
                { color: theme.textPrimary, fontFamily: theme.displayFont },
              ]}
            >
              Product Roadmap
            </Text>
            <Text
              style={[
                styles.roadmapSub,
                { color: theme.textSecondary, fontFamily: theme.bodyFont },
              ]}
            >
              See what launches next across sports, modes, and rewards.
            </Text>
            <View
              style={[
                styles.roadmapPill,
                {
                  borderColor: `${theme.primary}3A`,
                  backgroundColor: `${theme.primary}12`,
                },
              ]}
            >
              <Text
                style={[
                  styles.roadmapPillText,
                  { color: theme.primaryLight, fontFamily: theme.labelFont },
                ]}
              >
                Scrollable timeline
              </Text>
            </View>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={22}
            color={theme.primaryLight}
          />
        </TouchableOpacity>

        <View style={styles.sectionHeaderRow}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.textPrimary, fontFamily: theme.displayFont },
            ]}
          >
            Feature Modules
          </Text>
          <Text
            style={[
              styles.sectionMeta,
              { color: theme.textSecondary, fontFamily: theme.bodyFont },
            ]}
          >
            Tap any card to preview the experience
          </Text>
        </View>

        {DEMO_FEATURES.map((feature) => {
          const complete = isFeatureComplete(feature.id);
          const tone = getFeatureTone(feature.id);
          const completionAccent = "#59D6A8";
          const cardBorderColor = complete
            ? `${completionAccent}A8`
            : `${tone}5A`;
          const cardBackground = complete
            ? `${completionAccent}16`
            : theme.surfaceElevated;
          const toneBarColor = complete ? completionAccent : `${tone}B0`;

          return (
            <TouchableOpacity
              key={feature.id}
              style={[
                styles.featureCard,
                {
                  borderColor: cardBorderColor,
                  backgroundColor: cardBackground,
                },
              ]}
              activeOpacity={0.86}
              onPress={() => handleRoutePress(feature.route)}
            >
              <View
                style={[
                  styles.featureToneBar,
                  complete && styles.featureToneBarComplete,
                  { backgroundColor: toneBarColor },
                ]}
              />
              <View style={styles.featureCardInner}>
                <View style={styles.featureCardHeader}>
                  <View style={styles.featureTitleRow}>
                    <View
                      style={[
                        styles.featureIconWrap,
                        { backgroundColor: `${tone}22` },
                      ]}
                    >
                      <MaterialIcons
                        name={FEATURE_ICON[feature.id]}
                        size={18}
                        color={tone}
                      />
                    </View>
                    <Text
                      style={[
                        styles.featureTitle,
                        {
                          color: theme.textPrimary,
                          fontFamily: theme.labelFont,
                        },
                      ]}
                    >
                      {feature.title}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: complete
                          ? `${completionAccent}2A`
                          : `${tone}20`,
                        borderColor: complete
                          ? `${completionAccent}66`
                          : `${tone}55`,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={
                        complete ? "check-circle" : "radio-button-unchecked"
                      }
                      size={12}
                      color={complete ? completionAccent : theme.textMuted}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: theme.textPrimary,
                          fontFamily: theme.labelFont,
                        },
                      ]}
                    >
                      {complete ? "Completed" : "Ready"}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.featureSubtitle,
                    { color: theme.textSecondary, fontFamily: theme.bodyFont },
                  ]}
                >
                  {feature.subtitle}
                </Text>
                {complete ? (
                  <View
                    style={[
                      styles.completeRow,
                      {
                        borderColor: `${completionAccent}55`,
                        backgroundColor: `${completionAccent}1F`,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="task-alt"
                      size={14}
                      color={completionAccent}
                    />
                    <Text
                      style={[
                        styles.completeRowText,
                        {
                          color: completionAccent,
                          fontFamily: theme.labelFont,
                        },
                      ]}
                    >
                      All actions completed in this module
                    </Text>
                  </View>
                ) : null}
                <View style={styles.featureFooterRow}>
                  <Text
                    style={[
                      styles.featureReward,
                      {
                        color: complete ? completionAccent : tone,
                        fontFamily: theme.labelFont,
                      },
                    ]}
                  >
                    {complete
                      ? "Section Complete"
                      : `+${feature.xpReward} XP • +${feature.gemReward} Gems`}
                  </Text>
                  <MaterialIcons
                    name={complete ? "check-circle" : "chevron-right"}
                    size={18}
                    color={complete ? completionAccent : theme.textMuted}
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal transparent visible={showIntroModal} animationType="fade">
        <View style={styles.introOverlay}>
          <Animated.View
            style={[
              styles.introCard,
              {
                borderColor: `${theme.primary}66`,
                backgroundColor: theme.surface,
                opacity: introOpacity,
                transform: [{ translateY: introTranslateY }],
              },
            ]}
          >
            <View style={styles.introTopRow}>
              <View
                style={[
                  styles.introStepPill,
                  {
                    borderColor: `${theme.primary}48`,
                    backgroundColor: `${theme.primary}18`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.introStepPillText,
                    { color: theme.primaryLight, fontFamily: theme.labelFont },
                  ]}
                >
                  Step {introStepIndex + 1} of {INTRO_STEPS.length}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.introSkipButton}
                onPress={finishIntro}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.introSkipText,
                    { color: theme.textMuted, fontFamily: theme.labelFont },
                  ]}
                >
                  Skip intro
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.introIconWrap,
                {
                  borderColor: `${theme.primary}4A`,
                  backgroundColor: `${theme.primary}16`,
                },
              ]}
            >
              <MaterialIcons
                name={introStep.icon}
                size={26}
                color={theme.primaryLight}
              />
            </View>

            <Text
              style={[
                styles.introTitle,
                { color: theme.textPrimary, fontFamily: theme.displayFont },
              ]}
            >
              {introStep.title}
            </Text>
            <Text
              style={[
                styles.introBody,
                { color: theme.textSecondary, fontFamily: theme.bodyFont },
              ]}
            >
              {introStep.body}
            </Text>

            <View style={styles.introDotsRow}>
              {INTRO_STEPS.map((_, index) => {
                const active = index === introStepIndex;
                return (
                  <View
                    key={`intro-dot-${index}`}
                    style={[
                      styles.introDot,
                      {
                        backgroundColor: active
                          ? theme.primary
                          : `${theme.textMuted}55`,
                        width: active ? 22 : 8,
                      },
                    ]}
                  />
                );
              })}
            </View>

            <View style={styles.introActionsRow}>
              <TouchableOpacity
                style={[
                  styles.introBackButton,
                  {
                    borderColor: `${theme.primary}3F`,
                    backgroundColor: theme.glass,
                    opacity: introStepIndex === 0 ? 0.45 : 1,
                  },
                ]}
                activeOpacity={introStepIndex === 0 ? 1 : 0.86}
                disabled={introStepIndex === 0}
                onPress={onIntroBack}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={16}
                  color={theme.textPrimary}
                />
                <Text
                  style={[
                    styles.introBackText,
                    { color: theme.textPrimary, fontFamily: theme.labelFont },
                  ]}
                >
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.introNextButton,
                  { backgroundColor: theme.primary },
                ]}
                activeOpacity={0.9}
                onPress={onIntroNext}
              >
                <Text
                  style={[
                    styles.introNextText,
                    {
                      color: theme.appBackground,
                      fontFamily: theme.buttonFont,
                    },
                  ]}
                >
                  {isLastIntroStep ? "Start Demo" : "Next"}
                </Text>
                <MaterialIcons
                  name={isLastIntroStep ? "play-arrow" : "arrow-forward"}
                  size={17}
                  color={theme.appBackground}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <InvestorOverlay />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 52,
    paddingBottom: 40,
    gap: 14,
  },
  hero: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 13,
    overflow: "hidden",
  },
  heroHeaderBand: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  heroHeaderMain: {
    gap: 4,
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  heroHeading: {
    marginTop: 2,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 36,
  },
  heroSubheading: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resetButtonText: {
    fontSize: 11,
    fontWeight: "700",
  },
  heroMetricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heroMetricCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 3,
  },
  metricIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900",
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  progressPanel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTitle: {
    fontWeight: "800",
    fontSize: 14,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  progressMeta: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  progressMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  progressMetaHighlight: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  heroActionsRow: {
    flexDirection: "column",
    gap: 10,
  },
  primaryCta: {
    minHeight: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: "800",
    flexShrink: 1,
    textAlign: "center",
  },
  commandCenterCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  commandCenterHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  commandCenterTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  commandCenterNetPill: {
    flexShrink: 1,
    maxWidth: "46%",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  commandCenterNetText: {
    fontSize: 9.5,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.25,
    textAlign: "center",
  },
  ledgerSplitRow: {
    flexDirection: "row",
    gap: 8,
  },
  ledgerCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 2,
  },
  ledgerTitle: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.24,
  },
  ledgerValue: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "900",
  },
  ledgerSub: {
    fontSize: 11,
    fontWeight: "600",
  },
  faucetSinkRow: {
    flexDirection: "row",
    gap: 8,
  },
  fsCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  fsTitle: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.24,
  },
  fsBody: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
  },
  commandCenterFootnote: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "right",
  },
  roadmapCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  roadmapIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  roadmapTextWrap: {
    flex: 1,
    gap: 4,
  },
  roadmapTitle: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "900",
  },
  roadmapSub: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  roadmapPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: 2,
  },
  roadmapPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  myLockerCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  myLockerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  myLockerTextWrap: {
    flex: 1,
    gap: 3,
  },
  myLockerTitle: {
    fontSize: 19,
    fontWeight: "800",
  },
  myLockerSub: {
    fontSize: 12,
    fontWeight: "600",
  },
  myLockerPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
  },
  myLockerPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  sectionHeaderRow: {
    paddingHorizontal: 2,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: "800",
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: "600",
  },
  featureCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
  },
  featureToneBar: {
    width: 4,
  },
  featureToneBarComplete: {
    width: 7,
  },
  featureCardInner: {
    flex: 1,
    padding: 13,
    gap: 8,
  },
  featureCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  featureTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  featureIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  featureSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  featureFooterRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  completeRow: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  completeRowText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  featureReward: {
    fontSize: 12,
    fontWeight: "700",
  },
  introOverlay: {
    flex: 1,
    backgroundColor: "rgba(3, 10, 18, 0.84)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  introCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  introTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  introStepPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  introStepPillText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.25,
  },
  introSkipButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  introSkipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  introIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  introTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
  },
  introBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  introDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  introDot: {
    height: 8,
    borderRadius: 999,
  },
  introActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  introBackButton: {
    flex: 0.7,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  introBackText: {
    fontSize: 13,
    fontWeight: "700",
  },
  introNextButton: {
    flex: 1.3,
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  introNextText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
