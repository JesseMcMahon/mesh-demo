import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { DemoModuleScaffold } from "@/components/demo/DemoModuleScaffold";
import { FeatureFooter } from "@/components/demo/FeatureFooter";
import { TAUNT_TRIGGERS } from "@/lib/investorDemoContent";
import { useInvestorDemo } from "@/contexts/investor-demo";
import { useDemoTheme } from "@/lib/demoTheme";

export default function TauntsScreen() {
  const [lastTaunt, setLastTaunt] = useState<string | null>(null);
  const { triggerTaunt, state, completeFeature } = useInvestorDemo();
  const theme = useDemoTheme();

  return (
    <DemoModuleScaffold
      title="Taunt Triggers"
      subtitle="High-hype moments can trigger social taunts that amplify rivalry and session stickiness."
      moduleIntroKey="taunts"
      footer={<FeatureFooter featureId="taunts" />}
    >
      <View style={[styles.summaryCard, { borderColor: `${theme.primary}3C`, backgroundColor: theme.surfaceElevated }]}>
        <View style={styles.summaryTopRow}>
          <Text style={[styles.summaryTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
            Live Rivalry Engine
          </Text>
          <View style={[styles.livePill, { borderColor: `${theme.primary}66`, backgroundColor: `${theme.primary}22` }]}>
            <View style={[styles.liveDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.liveText, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>Live</Text>
          </View>
        </View>

        <Text style={[styles.summaryCopy, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
          Trigger-based social moments create emotional peaks. In production this dispatches themed GIF taunts in real time.
        </Text>
      </View>

      {TAUNT_TRIGGERS.map((trigger) => (
        <TouchableOpacity
          key={trigger}
          style={[styles.triggerCard, { borderColor: `${theme.primary}3B`, backgroundColor: theme.surfaceElevated }]}
          activeOpacity={0.86}
          onPress={() => {
            setLastTaunt(trigger);
            triggerTaunt();
            completeFeature("taunts");
          }}
        >
          <View style={styles.triggerRow}>
            <View style={[styles.triggerIconWrap, { backgroundColor: `${theme.primary}28` }]}> 
              <MaterialIcons name="whatshot" size={16} color={theme.primaryLight} />
            </View>
            <Text style={[styles.triggerText, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
              {trigger}
            </Text>
          </View>
          <Text style={[styles.fireText, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
            Send Taunt Preview
          </Text>
        </TouchableOpacity>
      ))}

      <View style={[styles.statusCard, { borderColor: `${theme.primary}3B`, backgroundColor: theme.surfaceElevated }]}>
        <Text style={[styles.statusTitle, { color: theme.textSecondary, fontFamily: theme.labelFont }]}>
          Taunts Sent This Session
        </Text>
        <Text style={[styles.statusValue, { color: theme.primaryLight, fontFamily: theme.displayFont }]}>
          {state.tauntsSent}
        </Text>
        <Text style={[styles.statusDetail, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
          {lastTaunt ? `Last trigger: ${lastTaunt}` : "No taunt sent yet"}
        </Text>
      </View>
    </DemoModuleScaffold>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  summaryCopy: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  triggerCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  triggerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  triggerIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  triggerText: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    lineHeight: 19,
  },
  fireText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statusValue: {
    fontSize: 26,
    fontWeight: "800",
  },
  statusDetail: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
});
