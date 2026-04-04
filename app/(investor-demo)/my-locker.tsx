import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { DemoModuleScaffold } from "@/components/demo/DemoModuleScaffold";
import { useInvestorDemo } from "@/contexts/investor-demo";
import { useAppTheme } from "@/contexts/theme";
import { IS_INVESTOR_DEMO } from "@/constants/appMode";
import {
  DEMO_AVATAR_IMAGES,
  DEMO_FOOTBALL_IMAGES,
  DEMO_UNLOCK_ITEMS,
  DemoFootballId,
  DemoSuitId,
  getDemoAvatarPreviewImage,
} from "@/lib/demoBattlePass";
import { DEMO_THEME_OPTIONS, useDemoTheme } from "@/lib/demoTheme";

const SUIT_OPTIONS: Array<{
  id: DemoSuitId;
  itemId: "red_armor" | "blue_armor" | null;
  label: string;
  subtitle: string;
}> = [
  {
    id: "character_example",
    itemId: null,
    label: "Base Character",
    subtitle: "Default starter avatar",
  },
  {
    id: "red_armor",
    itemId: "red_armor",
    label: DEMO_UNLOCK_ITEMS.red_armor.name,
    subtitle: "Level 5 unlock",
  },
  {
    id: "blue_armor",
    itemId: "blue_armor",
    label: DEMO_UNLOCK_ITEMS.blue_armor.name,
    subtitle: "Level 10 unlock",
  },
];

const FOOTBALL_OPTIONS: Array<{
  id: DemoFootballId;
  itemId: "common_football" | "chrome_football" | null;
  label: string;
  subtitle: string;
}> = [
  {
    id: "none",
    itemId: null,
    label: "No Football Equipped",
    subtitle: "Default slot",
  },
  {
    id: "common_football",
    itemId: "common_football",
    label: DEMO_UNLOCK_ITEMS.common_football.name,
    subtitle: "Level 5 unlock",
  },
  {
    id: "chrome_football",
    itemId: "chrome_football",
    label: DEMO_UNLOCK_ITEMS.chrome_football.name,
    subtitle: "Level 10 unlock",
  },
];

export default function MyLockerScreen() {
  const { palette, setPalette } = useAppTheme();
  const theme = useDemoTheme();
  const { state, equipSuit, equipFootball, hasUnlockedItem } = useInvestorDemo();
  const [fxLabel, setFxLabel] = useState("Loadout Updated");

  const previewScale = useRef(new Animated.Value(1)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const sparkleScale = useRef(new Animated.Value(0.72)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeTranslateY = useRef(new Animated.Value(-8)).current;

  const triggerLoadoutFx = useCallback(
    (label: string) => {
      setFxLabel(label);
      previewScale.stopAnimation();
      sparkleOpacity.stopAnimation();
      sparkleScale.stopAnimation();
      badgeOpacity.stopAnimation();
      badgeTranslateY.stopAnimation();

      previewScale.setValue(1);
      sparkleOpacity.setValue(0);
      sparkleScale.setValue(0.72);
      badgeOpacity.setValue(0);
      badgeTranslateY.setValue(-8);

      Animated.parallel([
        Animated.sequence([
          Animated.timing(previewScale, {
            toValue: 1.025,
            duration: 130,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
          }),
          Animated.timing(previewScale, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
          }),
        ]),
        Animated.sequence([
          Animated.parallel([
            Animated.timing(sparkleOpacity, {
              toValue: 1,
              duration: 130,
              useNativeDriver: true,
            }),
            Animated.timing(sparkleScale, {
              toValue: 1.05,
              duration: 180,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
          ]),
          Animated.parallel([
            Animated.timing(sparkleOpacity, {
              toValue: 0,
              duration: 240,
              useNativeDriver: true,
            }),
            Animated.timing(sparkleScale, {
              toValue: 1.32,
              duration: 260,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
          ]),
        ]),
        Animated.sequence([
          Animated.parallel([
            Animated.timing(badgeOpacity, {
              toValue: 1,
              duration: 160,
              useNativeDriver: true,
            }),
            Animated.timing(badgeTranslateY, {
              toValue: 0,
              duration: 160,
              useNativeDriver: true,
              easing: Easing.out(Easing.quad),
            }),
          ]),
          Animated.delay(650),
          Animated.parallel([
            Animated.timing(badgeOpacity, {
              toValue: 0,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(badgeTranslateY, {
              toValue: -8,
              duration: 220,
              useNativeDriver: true,
              easing: Easing.in(Easing.quad),
            }),
          ]),
        ]),
      ]).start();
    },
    [badgeOpacity, badgeTranslateY, previewScale, sparkleOpacity, sparkleScale]
  );

  const onEquipSuit = useCallback(
    (suitId: DemoSuitId) => {
      if (state.equipped.suit === suitId) return;
      Haptics.selectionAsync().catch(() => {});
      equipSuit(suitId);
      triggerLoadoutFx("Suit Updated");
    },
    [equipSuit, state.equipped.suit, triggerLoadoutFx]
  );

  const onEquipFootball = useCallback(
    (footballId: DemoFootballId) => {
      if (state.equipped.football === footballId) return;
      Haptics.selectionAsync().catch(() => {});
      equipFootball(footballId);
      triggerLoadoutFx("Football Updated");
    },
    [equipFootball, state.equipped.football, triggerLoadoutFx]
  );

  const equippedAvatarPreviewImage = getDemoAvatarPreviewImage(
    state.equipped.suit,
    state.equipped.football
  );

  const equippedFootballImage =
    state.equipped.football === "none" ? null : DEMO_FOOTBALL_IMAGES[state.equipped.football];

  const unlockedSummary = useMemo(() => {
    const unlocked = state.unlockedItems.length;
    return `${unlocked}/4 Unlockables`;
  }, [state.unlockedItems.length]);

  return (
    <DemoModuleScaffold
      title="My Locker"
      subtitle="Equip suits, football cosmetics, and app themes from your unlocked inventory."
    >
      <Animated.View style={[styles.previewAnimatedWrap, { transform: [{ scale: previewScale }] }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.loadoutFxBadge,
            {
              opacity: badgeOpacity,
              transform: [{ translateY: badgeTranslateY }],
              borderColor: `${theme.primary}70`,
              backgroundColor: `${theme.primary}25`,
            },
          ]}
        >
          <MaterialIcons name="auto-awesome" size={14} color={theme.primaryLight} />
          <Text style={[styles.loadoutFxBadgeText, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
            {fxLabel}
          </Text>
        </Animated.View>

        <LinearGradient
          colors={[`${theme.primary}38`, `${theme.primary}14`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.previewCard, { borderColor: `${theme.primary}50` }]}
        >
          <View style={styles.previewHeader}>
            <Text style={[styles.previewTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>Avatar Preview</Text>
            <View style={[styles.previewPill, { borderColor: `${theme.primary}55`, backgroundColor: `${theme.primary}1A` }]}>
              <Text style={[styles.previewPillText, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>{unlockedSummary}</Text>
            </View>
          </View>

          <View style={styles.previewImageFrame}>
            <Image source={equippedAvatarPreviewImage} resizeMode="cover" style={styles.previewImage} />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.sparkleOverlay,
                {
                  opacity: sparkleOpacity,
                  transform: [{ scale: sparkleScale }],
                },
              ]}
            >
              <MaterialIcons name="auto-awesome" size={40} color={theme.primaryLight} />
            </Animated.View>
          </View>

          <View style={styles.equippedRow}>
            <View style={[styles.equippedChip, { borderColor: `${theme.primary}3A`, backgroundColor: theme.glass }]}> 
              <MaterialIcons name="checkroom" size={14} color={theme.primaryLight} />
              <Text style={[styles.equippedChipText, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>Suit: {SUIT_OPTIONS.find((item) => item.id === state.equipped.suit)?.label ?? "Base Character"}</Text>
            </View>
            <View style={[styles.equippedChip, { borderColor: `${theme.primary}3A`, backgroundColor: theme.glass }]}> 
              <MaterialIcons name="sports-football" size={14} color={theme.primaryLight} />
              <Text style={[styles.equippedChipText, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>Football: {FOOTBALL_OPTIONS.find((item) => item.id === state.equipped.football)?.label ?? "None"}</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>Suit Loadout</Text>
        <Text style={[styles.sectionMeta, { color: theme.textSecondary, fontFamily: theme.labelFont }]}>Tap to equip</Text>
      </View>

      {SUIT_OPTIONS.map((option) => {
        const unlocked = option.itemId == null ? true : hasUnlockedItem(option.itemId);
        const equipped = state.equipped.suit === option.id;

        return (
          <TouchableOpacity
            key={option.id}
            activeOpacity={unlocked ? 0.88 : 1}
            disabled={!unlocked}
            onPress={() => onEquipSuit(option.id)}
            style={[
              styles.loadoutCard,
              {
                borderColor: equipped ? `${theme.primary}7F` : `${theme.primary}2F`,
                backgroundColor: equipped ? `${theme.primary}1D` : theme.surfaceElevated,
                opacity: unlocked ? 1 : 0.6,
              },
            ]}
          >
            <View style={styles.loadoutThumbFrame}>
              <Image source={DEMO_AVATAR_IMAGES[option.id]} resizeMode="contain" style={styles.loadoutThumbImage} />
            </View>
            <View style={styles.loadoutInfo}>
              <Text style={[styles.loadoutName, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>{option.label}</Text>
              <Text style={[styles.loadoutSub, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>{option.subtitle}</Text>
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  borderColor: equipped
                    ? `${theme.primary}66`
                    : unlocked
                      ? "rgba(52,199,89,0.48)"
                      : "rgba(255,255,255,0.18)",
                  backgroundColor: equipped
                    ? `${theme.primary}22`
                    : unlocked
                      ? "rgba(52,199,89,0.15)"
                      : `${theme.textMuted}22`,
                },
              ]}
            >
              <Text style={[styles.statusPillText, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
                {equipped ? "Equipped" : unlocked ? "Unlocked" : "Locked"}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>Football Cosmetics</Text>
        <Text style={[styles.sectionMeta, { color: theme.textSecondary, fontFamily: theme.labelFont }]}>Inventory slot</Text>
      </View>

      <View style={[styles.footballPanel, { borderColor: `${theme.primary}38`, backgroundColor: theme.surfaceElevated }]}>
        <View style={styles.footballPreviewWrap}>
          {equippedFootballImage ? (
            <View style={styles.footballPreviewFrame}>
              <Image source={equippedFootballImage} resizeMode="cover" style={styles.footballPreviewImage} />
            </View>
          ) : (
            <View style={[styles.footballPlaceholder, { borderColor: `${theme.primary}44`, backgroundColor: `${theme.primary}14` }]}>
              <MaterialIcons name="sports-football" size={28} color={theme.primaryLight} />
              <Text style={[styles.footballPlaceholderText, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>No football equipped</Text>
            </View>
          )}
        </View>

        <View style={styles.footballOptions}>
          {FOOTBALL_OPTIONS.map((option) => {
            const unlocked = option.itemId == null ? true : hasUnlockedItem(option.itemId);
            const equipped = state.equipped.football === option.id;

            return (
              <TouchableOpacity
                key={option.id}
                activeOpacity={unlocked ? 0.88 : 1}
                disabled={!unlocked}
                onPress={() => onEquipFootball(option.id)}
                style={[
                  styles.footballOptionRow,
                  {
                    borderColor: equipped ? `${theme.primary}75` : `${theme.primary}32`,
                    backgroundColor: equipped ? `${theme.primary}1D` : theme.glass,
                    opacity: unlocked ? 1 : 0.6,
                  },
                ]}
              >
                <Text style={[styles.footballOptionName, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>{option.label}</Text>
                <Text style={[styles.footballOptionSub, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>{option.subtitle}</Text>
                <Text style={[styles.footballOptionState, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
                  {equipped ? "Equipped" : unlocked ? "Unlocked" : "Locked"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {!IS_INVESTOR_DEMO ? (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>App Themes</Text>
            <Text style={[styles.sectionMeta, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>4/4 Unlocked</Text>
          </View>

          {DEMO_THEME_OPTIONS.map((entry) => {
            const selected = palette === entry.id;
            return (
              <TouchableOpacity
                key={entry.id}
                activeOpacity={0.88}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); setPalette(entry.id); }}
                style={[
                  styles.themeCard,
                  {
                    borderColor: selected ? `${entry.primary}85` : `${theme.primary}2E`,
                    backgroundColor: selected ? `${entry.primary}1C` : theme.surfaceElevated,
                  },
                ]}
              >
                <LinearGradient
                  colors={[entry.gradientStart, entry.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.themeSwatch}
                >
                  <Text style={[styles.themeSwatchLabel, { fontFamily: theme.buttonFont }]}>{entry.icon}</Text>
                </LinearGradient>

                <View style={styles.themeInfo}>
                  <View style={styles.themeTitleRow}>
                    <Text style={[styles.themeName, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>{entry.name}</Text>
                    <View
                      style={[
                        styles.lockedPill,
                        {
                          borderColor: `${entry.primary}66`,
                          backgroundColor: `${entry.primary}20`,
                        },
                      ]}
                    >
                      <Text style={[styles.lockedText, { color: entry.primaryLight }]}>Unlocked</Text>
                    </View>
                  </View>
                  <Text style={[styles.themeDescription, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>{entry.description}</Text>
                </View>

                {selected ? (
                  <View style={[styles.activeBadge, { backgroundColor: `${entry.primary}26`, borderColor: `${entry.primary}66` }]}>
                    <MaterialIcons name="check-circle" size={17} color={entry.primaryLight} />
                    <Text style={[styles.activeBadgeText, { color: entry.primaryLight }]}>Active</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </>
      ) : null}
    </DemoModuleScaffold>
  );
}

const styles = StyleSheet.create({
  previewAnimatedWrap: {
    position: "relative",
  },
  loadoutFxBadge: {
    position: "absolute",
    top: -8,
    right: 12,
    zIndex: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  loadoutFxBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.22,
    textTransform: "uppercase",
  },
  previewCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  previewPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewPillText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  previewImageFrame: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(8,20,32,0.58)",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  sparkleOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  equippedRow: {
    gap: 8,
  },
  equippedChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  equippedChipText: {
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  sectionHeaderRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: "700",
  },
  loadoutCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadoutThumbFrame: {
    width: 96,
    aspectRatio: 1.5,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(8,20,32,0.58)",
  },
  loadoutThumbImage: {
    width: "100%",
    height: "100%",
  },
  loadoutInfo: {
    flex: 1,
    gap: 2,
  },
  loadoutName: {
    fontSize: 14,
    fontWeight: "800",
  },
  loadoutSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  footballPanel: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },
  footballPreviewWrap: {
    width: "100%",
  },
  footballPreviewFrame: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(8,20,32,0.58)",
  },
  footballPreviewImage: {
    width: "100%",
    height: "100%",
  },
  footballPlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footballPlaceholderText: {
    fontSize: 12,
    fontWeight: "600",
  },
  footballOptions: {
    gap: 8,
  },
  footballOptionRow: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  footballOptionName: {
    fontSize: 13,
    fontWeight: "800",
  },
  footballOptionSub: {
    fontSize: 11,
  },
  footballOptionState: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.24,
  },
  themeCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  themeSwatch: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  themeSwatchLabel: {
    color: "#F3FAFF",
    fontSize: 15,
    fontWeight: "800",
  },
  themeInfo: {
    flex: 1,
    gap: 2,
  },
  themeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  themeName: {
    fontSize: 16,
    fontWeight: "800",
  },
  lockedPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lockedText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.28,
  },
  themeDescription: {
    fontSize: 12,
    lineHeight: 17,
  },
  activeBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.24,
  },
});
