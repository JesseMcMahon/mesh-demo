import React, { useCallback, useMemo, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { DemoModuleScaffold } from "@/components/demo/DemoModuleScaffold";
import { useDemoTheme } from "@/lib/demoTheme";

type RoadmapItem = {
  id: string;
  pill: string;
  season: string;
  title: string;
  description: string;
  tags: string[];
};

const ROADMAP_ITEMS: RoadmapItem[] = [
  {
    id: "ff-2026",
    pill: "Coming Soon",
    season: "Summer 2026",
    title: "Fantasy Football",
    description:
      "Squad-based NFL fantasy rebuilt with lineup votes, social rivalry loops, unlockables, and sponsor rewards.",
    tags: ["Squad Mode", "XP + Rewards", "Digital Assets"],
  },
  {
    id: "golf-march-2027",
    pill: "2027",
    season: "Spring 2027",
    title: "Fantasy Golf + March Madness",
    description:
      "Bracket pools and golf picks with squad progression, fresh emotes, and sponsor-driven weekly challenges.",
    tags: ["Fantasy Golf", "March Madness", "New Emotes"],
  },
  {
    id: "reality-2027",
    pill: "Summer 2027",
    season: "Summer 2027",
    title: "Reality TV Brackets",
    description:
      "Compete on Survivor, Bachelor, and Big Brother with social picks, side quests, and shared squad goals.",
    tags: ["Reality TV", "Brackets", "New Challenges"],
  },
  {
    id: "always-on",
    pill: "Every Season",
    season: "Ongoing",
    title: "New Drops All Year",
    description:
      "Pool formats, leagues, skins, taunts, and sponsor partnerships continue shipping all year long.",
    tags: ["Pool Formats", "New Skins", "New Sponsors"],
  },
];

export default function RoadmapScreen() {
  const theme = useDemoTheme();
  const [scrollProgress, setScrollProgress] = useState(0);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const maxScroll = Math.max(contentSize.height - layoutMeasurement.height, 1);
    const ratio = Math.min(Math.max(contentOffset.y / maxScroll, 0), 1);
    setScrollProgress(ratio);
  }, []);

  const progressHeight = useMemo(
    () => `${Math.round(scrollProgress * 100)}%` as `${number}%`,
    [scrollProgress]
  );

  return (
    <DemoModuleScaffold
      title="Roadmap"
      subtitle="What’s next for Mesh across seasons and sports."
      moduleIntroKey="roadmap"
      scrollViewProps={{
        onScroll,
        scrollEventThrottle: 16,
      }}
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
        <Text style={[styles.kicker, { color: theme.kicker, fontFamily: theme.labelFont }]}>
          What&apos;s Coming
        </Text>
        <Text style={[styles.heroTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
          ONE PLATFORM.
        </Text>
        <Text style={[styles.heroTitle, { color: theme.primary, fontFamily: theme.displayFont }]}>
          EVERY SEASON.
        </Text>
        <Text style={[styles.heroBody, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
          New formats, new sports, and new ways to compete with your squad all year.
          Scroll the timeline to see what drops next.
        </Text>
      </View>

      <View style={styles.timelineWrap}>
        <View style={[styles.trackBase, { backgroundColor: `${theme.primary}2A` }]}>
          <View
            style={[
              styles.trackProgress,
              {
                backgroundColor: theme.primary,
                height: progressHeight,
              },
            ]}
          />
        </View>

        {ROADMAP_ITEMS.map((item, index) => {
          const threshold = ROADMAP_ITEMS.length <= 1 ? 0 : index / (ROADMAP_ITEMS.length - 1);
          const isActive = scrollProgress >= threshold - 0.08;

          return (
            <View key={item.id} style={styles.row}>
              <View
                style={[
                  styles.nodeOuter,
                  {
                    borderColor: isActive ? `${theme.primary}A8` : `${theme.primary}4A`,
                    backgroundColor: isActive ? `${theme.primary}2B` : theme.surface,
                  },
                ]}
              >
                <View
                  style={[
                    styles.nodeInner,
                    {
                      backgroundColor: isActive ? theme.primary : `${theme.textMuted}7A`,
                    },
                  ]}
                />
              </View>

              <View
                style={[
                  styles.card,
                  {
                    borderColor: isActive ? `${theme.primary}6A` : theme.primaryBorder,
                    backgroundColor: theme.surfaceElevated,
                    shadowColor: isActive ? theme.primary : "#000000",
                    shadowOpacity: isActive ? 0.22 : 0.06,
                  },
                ]}
              >
                <View
                  style={[
                    styles.pill,
                    {
                      borderColor: isActive ? `${theme.primary}66` : `${theme.textMuted}55`,
                      backgroundColor: isActive ? `${theme.primary}20` : `${theme.textMuted}18`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      {
                        color: isActive ? theme.primaryLight : theme.textMuted,
                        fontFamily: theme.labelFont,
                      },
                    ]}
                  >
                    {item.pill}
                  </Text>
                </View>

                <Text style={[styles.season, { color: theme.textMuted, fontFamily: theme.bodyFont }]}>
                  {item.season}
                </Text>
                <Text style={[styles.cardTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
                  {item.title}
                </Text>
                <Text style={[styles.description, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
                  {item.description}
                </Text>

                <View style={styles.tagRow}>
                  {item.tags.map((tag) => (
                    <View
                      key={`${item.id}-${tag}`}
                      style={[
                        styles.tag,
                        {
                          borderColor: `${theme.primary}36`,
                          backgroundColor: `${theme.appBackground}A8`,
                        },
                      ]}
                    >
                      <MaterialIcons name="bolt" size={12} color={theme.primaryLight} />
                      <Text style={[styles.tagText, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </DemoModuleScaffold>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  heroTitle: {
    fontSize: 36,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  heroBody: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  timelineWrap: {
    position: "relative",
    paddingLeft: 34,
    gap: 18,
    paddingBottom: 8,
  },
  trackBase: {
    position: "absolute",
    left: 11,
    top: 18,
    bottom: 24,
    width: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  trackProgress: {
    width: "100%",
    borderRadius: 999,
  },
  row: {
    position: "relative",
  },
  nodeOuter: {
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
  nodeInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 2,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  season: {
    fontSize: 13,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 30,
    lineHeight: 32,
    fontWeight: "900",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
  tagRow: {
    marginTop: 2,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
