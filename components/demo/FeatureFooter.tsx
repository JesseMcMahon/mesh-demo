import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  DemoFeatureId,
  DEMO_FEATURES,
  getFeatureById,
  getNextFeature,
} from "@/lib/investorDemoContent";
import { useInvestorDemo } from "@/contexts/investor-demo";
import { useDemoTheme } from "@/lib/demoTheme";

export function FeatureFooter({
  featureId,
  showHomeCta = true,
}: {
  featureId: DemoFeatureId;
  showHomeCta?: boolean;
}) {
  const router = useRouter();
  const params = useLocalSearchParams<{ guided?: string }>();
  const { isFeatureComplete, state } = useInvestorDemo();
  const theme = useDemoTheme();
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const modalScale = useRef(new Animated.Value(0.9)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const feature = getFeatureById(featureId);
  const nextFeature = getNextFeature(featureId);
  const isGuided = params.guided === "1";
  const complete = isFeatureComplete(featureId);
  const wasCompleteRef = useRef(complete);

  const ctaLabel = useMemo(() => {
    if (nextFeature == null) {
      return "Back To Home";
    }
    return "Back To Home";
  }, [nextFeature]);

  const progressText = `${state.completedFeatures.length}/${DEMO_FEATURES.length} Completed`;

  useEffect(() => {
    if (!wasCompleteRef.current && complete && feature != null) {
      setShowCompleteModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      modalScale.setValue(0.9);
      modalOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(modalScale, {
          toValue: 1,
          damping: 13,
          stiffness: 170,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
      completionTimeoutRef.current = setTimeout(() => {
        setShowCompleteModal(false);
        router.replace("/(investor-demo)/home" as any);
      }, 1450);
    }

    wasCompleteRef.current = complete;
  }, [complete, feature, modalOpacity, modalScale, router]);

  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, []);

  if (feature == null) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.metaRow}>
          <View
            style={[
              styles.metaPill,
              {
                borderColor: `${theme.primary}38`,
                backgroundColor: theme.glass,
              },
            ]}
          >
            <MaterialIcons name="auto-awesome" size={14} color={theme.primary} />
            <Text style={[styles.metaText, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
              {progressText}
            </Text>
          </View>

          <View
            style={[
              styles.rewardPill,
              {
                backgroundColor: `${theme.primary}1F`,
                borderColor: `${theme.primary}44`,
              },
            ]}
          >
            <Text style={[styles.rewardText, { color: theme.primaryLight }]}>
              +{feature.xpReward} XP • +{feature.gemReward} Gems
            </Text>
          </View>
        </View>

        {showHomeCta ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.button, styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                if (isGuided) {
                  if (nextFeature != null) {
                    router.push(`${nextFeature.route}?guided=1` as any);
                  } else {
                    router.replace("/(investor-demo)/home" as any);
                  }
                } else {
                  router.replace("/(investor-demo)/home" as any);
                }
              }}
            >
              <Text style={[styles.primaryText, { fontFamily: theme.buttonFont }]}>
                {isGuided ? ctaLabel : "Back To Demo Home"}
              </Text>
              <MaterialIcons name="arrow-forward" size={16} color={theme.appBackground} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <Modal transparent visible={showCompleteModal} animationType="fade">
        <View style={styles.completeOverlay}>
          <Animated.View
            style={[
              styles.completeCard,
              {
                borderColor: `${theme.primary}66`,
                backgroundColor: theme.surface,
                opacity: modalOpacity,
                transform: [{ scale: modalScale }],
              },
            ]}
          >
            <View style={[styles.completeIconWrap, { backgroundColor: `${theme.primary}22`, borderColor: `${theme.primary}55` }]}>
              <MaterialIcons name="check-circle" size={30} color={theme.primaryLight} />
            </View>
            <Text style={[styles.completeTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
              {feature.title} complete!
            </Text>
            <Text style={[styles.completeSubtitle, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
              Nice. Returning to home...
            </Text>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaText: {
    fontWeight: "700",
    fontSize: 11,
  },
  rewardPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rewardText: {
    fontSize: 11,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
  },
  button: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 6,
  },
  primaryButton: {
    flex: 1,
  },
  primaryText: {
    color: "#07111C",
    fontWeight: "800",
    fontSize: 13,
  },
  completeOverlay: {
    flex: 1,
    backgroundColor: "rgba(3, 10, 17, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  completeCard: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 10,
  },
  completeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  completeSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
