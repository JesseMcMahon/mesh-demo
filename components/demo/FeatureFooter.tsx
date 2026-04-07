import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
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
  const { state } = useInvestorDemo();
  const theme = useDemoTheme();

  const feature = getFeatureById(featureId);
  const nextFeature = getNextFeature(featureId);
  const isGuided = params.guided === "1";

  const ctaLabel = useMemo(() => {
    if (nextFeature == null) {
      return "Back To Home";
    }
    return "Back To Home";
  }, [nextFeature]);

  if (feature == null) {
    return null;
  }

  const progressText = `${state.completedFeatures.length}/${DEMO_FEATURES.length} Completed`;

  return (
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
          <Text
            style={[
              styles.metaText,
              { color: theme.textPrimary, fontFamily: theme.labelFont },
            ]}
          >
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
            style={[
              styles.button,
              styles.primaryButton,
              { backgroundColor: theme.primary },
            ]}
            onPress={() => {
              if (isGuided) {
                if (nextFeature != null) {
                  router.push(`${nextFeature.route}?guided=1` as any);
                } else {
                  router.replace("/(investor-demo)/home-v2" as any);
                }
              } else {
                router.replace("/(investor-demo)/home-v2" as any);
              }
            }}
          >
            <Text style={[styles.primaryText, { fontFamily: theme.buttonFont }]}>
              {isGuided ? ctaLabel : "Back To Demo Home"}
            </Text>
            <MaterialIcons
              name="arrow-forward"
              size={16}
              color={theme.appBackground}
            />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
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
});
