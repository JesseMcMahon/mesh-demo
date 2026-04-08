import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const HERO_IMAGE = require("../../assets/demo-assets/home-hero-character.png");
const MESH_LOGO = require("../../assets/images/meshLogo.png");

type FlowCard = {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  tone: "green" | "purple" | "amber" | "blue" | "red";
  tags: string[];
};

const FLOWS: FlowCard[] = [
  {
    id: "avatar",
    title: "Avatar & Locker Room",
    description: "Your player, your identity. Customize, unlock, and equip.",
    route: "/(investor-demo)/my-locker-v2",
    icon: "sports-esports",
    tone: "purple",
    tags: ["Identity", "Store"],
  },
  {
    id: "league-play",
    title: "League Play",
    description: "Squad Home, Matchups, and league loop in one unified module.",
    route: "/(investor-demo)/league-play",
    icon: "groups",
    tone: "green",
    tags: ["Home", "Matchup", "Social"],
  },
  // {
  //   id: "economy",
  //   title: "Economy & Battle Pass",
  //   description: "Earn gems through play. Spend on cosmetics. Seasonal unlocks.",
  //   route: "/(investor-demo)/live-economy",
  //   icon: "diamond",
  //   tone: "red",
  //   tags: ["Economy", "Seasonal"],
  // },
];

function toneColors(tone: FlowCard["tone"]) {
  switch (tone) {
    case "green":
      return {
        iconBackground: "rgba(58,178,152,0.15)",
        iconBorder: "rgba(58,178,152,0.25)",
        tagText: "#3AB298",
        tagBackground: "rgba(58,178,152,0.10)",
      };
    case "purple":
      return {
        iconBackground: "rgba(127,101,192,0.15)",
        iconBorder: "rgba(127,101,192,0.25)",
        tagText: "#7F65C0",
        tagBackground: "rgba(127,101,192,0.10)",
      };
    case "amber":
      return {
        iconBackground: "rgba(245,158,11,0.12)",
        iconBorder: "rgba(245,158,11,0.20)",
        tagText: "#F59E0B",
        tagBackground: "rgba(245,158,11,0.10)",
      };
    case "blue":
      return {
        iconBackground: "rgba(59,130,246,0.12)",
        iconBorder: "rgba(59,130,246,0.20)",
        tagText: "#60A5FA",
        tagBackground: "rgba(59,130,246,0.10)",
      };
    case "red":
    default:
      return {
        iconBackground: "rgba(239,68,68,0.12)",
        iconBorder: "rgba(239,68,68,0.20)",
        tagText: "#F87171",
        tagBackground: "rgba(239,68,68,0.10)",
      };
  }
}

function FlowItem({ flow }: { flow: FlowCard }) {
  const router = useRouter();
  const colors = toneColors(flow.tone);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.flowCard}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        router.push(flow.route as any);
      }}
    >
      <View
        style={[
          styles.flowIconWrap,
          {
            backgroundColor: colors.iconBackground,
            borderColor: colors.iconBorder,
          },
        ]}
      >
        <MaterialIcons name={flow.icon} size={20} color={colors.tagText} />
      </View>

      <View style={styles.flowBody}>
        <Text style={styles.flowTitle}>{flow.title}</Text>
        <Text style={styles.flowDescription}>{flow.description}</Text>
        <View style={styles.flowTags}>
          {flow.tags.map((tag) => (
            <View
              key={`${flow.id}-${tag}`}
              style={[
                styles.flowTag,
                { backgroundColor: colors.tagBackground },
              ]}
            >
              <Text style={[styles.flowTagText, { color: colors.tagText }]}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <MaterialIcons name="chevron-right" size={20} color="#6B7280" />
    </TouchableOpacity>
  );
}

export default function InvestorDemoHomeV2Screen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Image
              source={MESH_LOGO}
              style={styles.meshLogoImage}
              resizeMode="contain"
            />
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>Demo Mode</Text>
            </View>
          </View>

          <View style={styles.avatarSection}>
            <View style={styles.avatarRing}>
              <Image
                source={HERO_IMAGE}
                style={styles.avatarImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.levelBadge}>
              <View style={styles.levelDot} />
              <Text style={styles.levelBadgeText}>LVL 12 · 3,420 XP</Text>
            </View>
          </View>

          <View style={styles.welcomeWrap}>
            <Text style={styles.welcomeTitle}>WELCOME TO MESH</Text>
            <Text style={styles.welcomeSub}>
              Tap any flow below to explore what makes us different.
            </Text>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Choose a Demo Flow</Text>
            <View style={styles.dividerLine} />
          </View>

          {FLOWS.map((flow) => (
            <FlowItem key={flow.id} flow={flow} />
          ))}

          <View style={styles.bottomNote}>
            <Text style={styles.bottomNoteText}>
              This is an interactive design prototype.
              {"\n"}
              <Text style={styles.bottomNoteStrong}>MESH</Text>
              {" · "}Confidential{" · "}Demo Only
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0E1014",
  },
  container: {
    flex: 1,
    backgroundColor: "#0E1014",
  },
  statusBarRow: {
    paddingHorizontal: 28,
    paddingTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusTime: {
    color: "#F0F0F0",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  statusRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  signalBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 12,
  },
  signalBar: {
    width: 3,
    backgroundColor: "#F0F0F0",
    borderRadius: 2,
  },
  battery: {
    width: 22,
    height: 12,
    borderWidth: 1.5,
    borderColor: "#F0F0F0",
    borderRadius: 3,
    justifyContent: "center",
    paddingHorizontal: 1.5,
    position: "relative",
  },
  batteryFill: {
    width: "75%",
    height: 7,
    borderRadius: 1,
    backgroundColor: "#F0F0F0",
  },
  batteryCap: {
    position: "absolute",
    right: -4.5,
    top: 3,
    width: 3,
    height: 6,
    borderRadius: 1,
    backgroundColor: "#F0F0F0",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  meshLogo: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 1.3,
    color: "#5DD8BE",
  },
  meshLogoImage: {
    width: 104,
    height: 40,
  },
  demoBadge: {
    borderWidth: 1,
    borderColor: "rgba(127,101,192,0.30)",
    backgroundColor: "rgba(127,101,192,0.15)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  demoBadgeText: {
    color: "#7F65C0",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 10,
  },
  avatarRing: {
    width: 220,
    height: 300,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(58,178,152,0.25)",
    backgroundColor: "#141821",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
    shadowColor: "#3AB298",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 24,
  },
  avatarImage: {
    width: 212,
    height: 300,
    marginBottom: -2,
  },
  levelBadge: {
    marginTop: -8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#1A1E27",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: "#3AB298",
  },
  levelBadgeText: {
    color: "#3AB298",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  welcomeWrap: {
    alignItems: "center",
    marginTop: 18,
    marginBottom: 20,
  },
  welcomeTitle: {
    color: "#F0F0F0",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  welcomeSub: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 280,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  dividerText: {
    color: "#6B7280",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  flowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#13161C",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  flowIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  flowBody: {
    flex: 1,
    minWidth: 0,
  },
  flowTitle: {
    color: "#F0F0F0",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  flowDescription: {
    color: "#9CA3AF",
    fontSize: 12,
    lineHeight: 17,
  },
  flowTags: {
    marginTop: 7,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  flowTag: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  flowTagText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  bottomNote: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    marginBottom: 6,
  },
  bottomNoteText: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 11,
    lineHeight: 18,
  },
  bottomNoteStrong: {
    color: "#3AB298",
    fontWeight: "700",
  },
  bottomNav: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    backgroundColor: "#13161C",
    paddingTop: 10,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bottomNavItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  bottomNavText: {
    color: "#6B7280",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
