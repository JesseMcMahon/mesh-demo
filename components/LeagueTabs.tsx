import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { useMemo } from "react";
import { BRAND, TEXT } from "@/constants/colors";
import { triggerHaptic } from "@/lib/haptics";
import { useSpringPress } from "@/hooks/useSpringPress";

interface Tab {
  id: string;
  label: string;
}

interface LeagueTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

function LeagueTabItem({
  tab,
  isActive,
  onPress,
}: {
  tab: Tab;
  isActive: boolean;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress(0.97);

  return (
    <Animated.View style={[styles.tabItemWrap, animatedStyle]}>
      <TouchableOpacity
        onPress={async () => {
          await triggerHaptic("selection");
          onPress();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.tabTouchable}
        activeOpacity={0.9}
      >
        <Text numberOfLines={1} style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
          {tab.label}
        </Text>
        <View style={[styles.indicatorTrack, isActive && styles.indicatorActive]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export function LeagueTabs({ tabs, activeTab, onTabChange }: LeagueTabsProps) {
  const visibleTabs = useMemo(() => tabs.slice(0, 5), [tabs]);

  return (
    <View style={styles.container}>
      {visibleTabs.map((tab) => (
        <LeagueTabItem
          key={tab.id}
          tab={tab}
          isActive={activeTab === tab.id}
          onPress={() => onTabChange(tab.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
    height: 50,
    alignItems: "flex-end",
  },
  tabItemWrap: {
    flex: 1,
    height: "100%",
  },
  tabTouchable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
  },
  tabLabel: {
    color: TEXT.secondary,
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: TEXT.primary,
    fontWeight: "700",
  },
  indicatorTrack: {
    marginTop: 8,
    width: 44,
    height: 2.5,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  indicatorActive: {
    backgroundColor: BRAND.primary,
  },
});
