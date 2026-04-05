import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  ScrollViewProps,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useDemoTheme } from "@/lib/demoTheme";
import { useInvestorDemo } from "@/contexts/investor-demo";
import { InvestorOverlay } from "@/components/demo/InvestorOverlay";
import { DemoModuleIntroKey, MODULE_INTRO_STEPS } from "@/lib/demoModuleIntro";

interface DemoModuleScaffoldProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  kicker?: string;
  scrollViewProps?: Partial<ScrollViewProps>;
  moduleIntroKey?: DemoModuleIntroKey;
}

export function DemoModuleScaffold({
  title,
  subtitle,
  children,
  footer,
  kicker: _kicker,
  scrollViewProps,
  moduleIntroKey,
}: DemoModuleScaffoldProps) {
  const router = useRouter();
  const theme = useDemoTheme();
  const {
    state,
    togglePresenterOverlay,
    hasSeenModuleIntro,
    markModuleIntroSeen,
  } = useInvestorDemo();
  const [introStepIndex, setIntroStepIndex] = useState(0);
  const introOpacity = useRef(new Animated.Value(0)).current;
  const introTranslate = useRef(new Animated.Value(10)).current;

  const introSteps = useMemo(
    () => (moduleIntroKey ? MODULE_INTRO_STEPS[moduleIntroKey] ?? [] : []),
    [moduleIntroKey]
  );
  const showModuleIntro = !!(
    moduleIntroKey &&
    introSteps.length &&
    !hasSeenModuleIntro(moduleIntroKey)
  );
  const introStep = introSteps[introStepIndex];
  const isLastIntroStep = introStepIndex >= introSteps.length - 1;

  useEffect(() => {
    if (!showModuleIntro) return;
    setIntroStepIndex(0);
  }, [showModuleIntro]);

  useEffect(() => {
    if (!showModuleIntro) return;
    introOpacity.setValue(0);
    introTranslate.setValue(10);
    Animated.parallel([
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(introTranslate, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showModuleIntro, introOpacity, introTranslate, introStepIndex]);

  const finishModuleIntro = () => {
    if (!moduleIntroKey) return;
    Haptics.selectionAsync().catch(() => {});
    markModuleIntroSeen(moduleIntroKey);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.appBackground }]}>
      <View style={[styles.header, { borderBottomColor: theme.primaryBorder, backgroundColor: theme.surface }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => router.replace("/(investor-demo)/home" as any)}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              togglePresenterOverlay();
            }}
            style={[
              styles.homeButton,
              {
                borderColor: `${theme.primary}44`,
                backgroundColor: `${theme.primary}20`,
              },
            ]}
          >
            <MaterialIcons name="arrow-back" size={18} color={theme.textPrimary} />
            <Text style={[styles.homeButtonText, { color: theme.textPrimary, fontFamily: theme.buttonFont }]}>
              Demo Home
            </Text>
          </TouchableOpacity>
          {state.presenterOverlayEnabled ? (
            <View
              style={[
                styles.overlayIndicator,
                {
                  borderColor: `${theme.primary}55`,
                  backgroundColor: `${theme.primary}1E`,
                },
              ]}
            >
              <MaterialIcons name="insights" size={12} color={theme.primaryLight} />
              <Text
                style={[
                  styles.overlayIndicatorText,
                  { color: theme.primaryLight, fontFamily: theme.labelFont },
                ]}
              >
                Overlay On
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
          {subtitle}
        </Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        {...scrollViewProps}
      >
        {children}
      </ScrollView>

      {footer ? <View style={[styles.footer, { borderTopColor: `${theme.primary}33`, backgroundColor: theme.surface }]}>{footer}</View> : null}
      <InvestorOverlay />

      {showModuleIntro && introStep ? (
        <Modal transparent visible animationType="fade">
          <View style={styles.introOverlay}>
            <Animated.View
              style={[
                styles.introCard,
                {
                  borderColor: `${theme.primary}66`,
                  backgroundColor: theme.surface,
                  opacity: introOpacity,
                  transform: [{ translateY: introTranslate }],
                },
              ]}
            >
              <View style={styles.introTopRow}>
                <View
                  style={[
                    styles.introPill,
                    {
                      borderColor: `${theme.primary}48`,
                      backgroundColor: `${theme.primary}1B`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.introPillText,
                      { color: theme.primaryLight, fontFamily: theme.labelFont },
                    ]}
                  >
                    Module Brief {introStepIndex + 1}/{introSteps.length}
                  </Text>
                </View>
                <TouchableOpacity onPress={finishModuleIntro} activeOpacity={0.84}>
                  <Text
                    style={[
                      styles.introSkipText,
                      { color: theme.textMuted, fontFamily: theme.bodyFont },
                    ]}
                  >
                    Skip
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.introIconWrap,
                  {
                    borderColor: `${theme.primary}56`,
                    backgroundColor: `${theme.primary}15`,
                  },
                ]}
              >
                <MaterialIcons name={introStep.icon} size={25} color={theme.primaryLight} />
              </View>

              <Text style={[styles.introTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
                {introStep.title}
              </Text>
              <Text style={[styles.introBody, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
                {introStep.body}
              </Text>

              <View style={styles.introDotsRow}>
                {introSteps.map((_, index) => {
                  const active = index === introStepIndex;
                  return (
                    <View
                      key={`module-dot-${index}`}
                      style={[
                        styles.introDot,
                        {
                          width: active ? 20 : 7,
                          backgroundColor: active ? theme.primary : `${theme.textMuted}55`,
                        },
                      ]}
                    />
                  );
                })}
              </View>

              <View style={styles.introActions}>
                <TouchableOpacity
                  activeOpacity={introStepIndex === 0 ? 1 : 0.84}
                  disabled={introStepIndex === 0}
                  onPress={() => {
                    if (introStepIndex === 0) return;
                    Haptics.selectionAsync().catch(() => {});
                    setIntroStepIndex((previous) => Math.max(0, previous - 1));
                  }}
                  style={[
                    styles.introBackButton,
                    {
                      opacity: introStepIndex === 0 ? 0.45 : 1,
                      borderColor: `${theme.primary}40`,
                      backgroundColor: theme.glass,
                    },
                  ]}
                >
                  <MaterialIcons name="arrow-back" size={16} color={theme.textPrimary} />
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
                  activeOpacity={0.9}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    if (isLastIntroStep) {
                      finishModuleIntro();
                      return;
                    }
                    setIntroStepIndex((previous) =>
                      Math.min(introSteps.length - 1, previous + 1)
                    );
                  }}
                  style={[styles.introNextButton, { backgroundColor: theme.primary }]}
                >
                  <Text
                    style={[
                      styles.introNextText,
                      { color: theme.appBackground, fontFamily: theme.buttonFont },
                    ]}
                  >
                    {isLastIntroStep ? "Start Module" : "Next"}
                  </Text>
                  <MaterialIcons
                    name={isLastIntroStep ? "play-arrow" : "arrow-forward"}
                    size={16}
                    color={theme.appBackground}
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    gap: 8,
    overflow: "hidden",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  homeButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  homeButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34,
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 22,
  },
  footer: {
    borderTopWidth: 1,
    padding: 14,
  },
  overlayIndicator: {
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  overlayIndicatorText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.28,
  },
  introOverlay: {
    flex: 1,
    backgroundColor: "rgba(4, 11, 19, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  introCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 11,
  },
  introTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  introPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  introPillText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.25,
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
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "900",
  },
  introBody: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  introDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  introDot: {
    height: 7,
    borderRadius: 999,
  },
  introActions: {
    flexDirection: "row",
    gap: 10,
  },
  introBackButton: {
    flex: 0.8,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  introBackText: {
    fontSize: 13,
    fontWeight: "700",
  },
  introNextButton: {
    flex: 1.2,
    minHeight: 46,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  introNextText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
