import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StandingsView } from "./StandingsView";
import { PlayoffBracketView } from "./PlayoffBracketView";
import { BRAND, SURFACE, TEXT, BORDER, ACCENT, SEMANTIC } from "@/constants/colors";

type ViewMode = "standings" | "playoff";

interface LeagueTabContentProps {
  leagueId: string;
  leagueName: string;
  isLeagueAdmin?: boolean;
  showDraftRecap?: boolean;
  squads: any[];
  onLeagueSettingsPress?: () => void;
  onWaiversPress?: () => void;
  onTradesPress?: () => void;
  onManageMembersPress?: () => void;
  onLeagueRulesPress?: () => void;
  onDraftRecapPress?: () => void;
  onDeleteLeaguePress?: () => void;
  onStandingsDetailsPress?: () => void;
  onRefresh?: () => Promise<void>;
  hideTransactions?: boolean;
}

interface MenuItemProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  subtitle: string;
  onPress?: () => void;
  tone?: "default" | "danger";
}

const MenuItem = React.memo(function MenuItem({
  icon,
  label,
  subtitle,
  onPress,
  tone = "default",
}: MenuItemProps) {
  if (!onPress) return null;

  const isDanger = tone === "danger";

  return (
    <TouchableOpacity style={menuStyles.item} onPress={onPress} activeOpacity={0.8}>
      <View style={[menuStyles.iconWrapper, isDanger && menuStyles.iconWrapperDanger]}>
        <MaterialIcons
          name={icon}
          size={18}
          color={isDanger ? SEMANTIC.error : BRAND.primary}
        />
      </View>
      <View style={menuStyles.textCol}>
        <Text style={[menuStyles.label, isDanger && menuStyles.labelDanger]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={menuStyles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={TEXT.quaternary} />
    </TouchableOpacity>
  );
});

const menuStyles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.default,
    backgroundColor: "rgba(8,12,18,0.68)",
    marginBottom: 8,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ACCENT.primaryBg,
    borderWidth: 1,
    borderColor: ACCENT.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  iconWrapperDanger: {
    backgroundColor: "rgba(255,90,95,0.16)",
    borderColor: "rgba(255,90,95,0.4)",
  },
  textCol: {
    flex: 1,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  labelDanger: {
    color: SEMANTIC.error,
  },
  subtitle: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 2,
  },
});

export const LeagueTabContent = React.memo(function LeagueTabContent({
  leagueName,
  isLeagueAdmin = false,
  showDraftRecap = false,
  squads,
  onLeagueSettingsPress,
  onWaiversPress,
  onTradesPress,
  onManageMembersPress,
  onLeagueRulesPress,
  onDraftRecapPress,
  onDeleteLeaguePress,
  onStandingsDetailsPress,
  onRefresh,
  hideTransactions = false,
}: LeagueTabContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("standings");
  const [refreshing, setRefreshing] = useState(false);
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(reveal, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [reveal]);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={BRAND.primary}
            colors={[BRAND.primary]}
          />
        ) : undefined
      }
    >
      <Animated.View
        style={{
          opacity: reveal,
          transform: [
            {
              translateY: reveal.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        }}
      >
        <View style={styles.heroCard}>
          <LinearGradient
            colors={["rgba(27,108,168,0.26)", "rgba(15,24,37,0.7)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <Text style={styles.heroTitle} numberOfLines={1}>{leagueName}</Text>
            <Text style={styles.heroSubtitle}>League Hub</Text>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatPill}>
                <Text style={styles.heroStatValue}>{squads?.length || 0}</Text>
                <Text style={styles.heroStatLabel}>Squads</Text>
              </View>
              <View style={styles.heroStatPill}>
                <Text style={styles.heroStatValue}>{hideTransactions ? "Off" : "On"}</Text>
                <Text style={styles.heroStatLabel}>Transactions</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>League Tools</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="settings"
              label="League Settings"
              subtitle="Commissioner controls"
              onPress={onLeagueSettingsPress}
            />

            {!hideTransactions ? (
              <>
                <MenuItem
                  icon="person-add"
                  label="Players"
                  subtitle="Add, drop, and waivers"
                  onPress={onWaiversPress}
                />
                <MenuItem
                  icon="swap-horiz"
                  label="Trades"
                  subtitle="Review active offers"
                  onPress={onTradesPress}
                />
              </>
            ) : null}

            <MenuItem
              icon="groups"
              label="Members"
              subtitle="Manage squad members"
              onPress={onManageMembersPress}
            />
            <MenuItem
              icon="menu-book"
              label="Rules"
              subtitle="Scoring and roster settings"
              onPress={onLeagueRulesPress}
            />

            {showDraftRecap ? (
              <MenuItem
                icon="sports-football"
                label="Draft Recap"
                subtitle="Review all picks"
                onPress={onDraftRecapPress}
              />
            ) : null}

            {isLeagueAdmin && onDeleteLeaguePress ? (
              <MenuItem
                icon="delete-forever"
                label="Delete League"
                subtitle="Permanently remove this league"
                onPress={onDeleteLeaguePress}
                tone="danger"
              />
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Standings & Playoffs</Text>
            <TouchableOpacity activeOpacity={0.8} onPress={onStandingsDetailsPress} disabled={!onStandingsDetailsPress}>
              <Text style={styles.detailsLink}>View all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === "standings" && styles.toggleButtonActive]}
              onPress={() => setViewMode("standings")}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="leaderboard"
                size={16}
                color={viewMode === "standings" ? "#FFFFFF" : TEXT.secondary}
              />
              <Text style={[styles.toggleText, viewMode === "standings" && styles.toggleTextActive]}>Standings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, styles.toggleButtonRight, viewMode === "playoff" && styles.toggleButtonActive]}
              onPress={() => setViewMode("playoff")}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="account-tree"
                size={16}
                color={viewMode === "playoff" ? "#FFFFFF" : TEXT.secondary}
              />
              <Text style={[styles.toggleText, viewMode === "playoff" && styles.toggleTextActive]}>Playoff</Text>
            </TouchableOpacity>
          </View>

          {viewMode === "standings" ? <StandingsView squads={squads} /> : <PlayoffBracketView squads={squads} />}
        </View>

        <View style={styles.bottomSpacer} />
      </Animated.View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE.background,
  },
  contentContainer: {
    paddingTop: 14,
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER.medium,
    overflow: "hidden",
    backgroundColor: SURFACE.card,
  },
  heroGradient: {
    padding: 14,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  heroStatPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ACCENT.primaryBorder,
    backgroundColor: ACCENT.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroStatValue: {
    color: BRAND.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  heroStatLabel: {
    color: TEXT.secondary,
    fontSize: 11,
    fontWeight: "600",
  },
  section: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.35,
    marginBottom: 10,
  },
  menuCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.card,
    padding: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  detailsLink: {
    color: BRAND.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: SURFACE.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    overflow: "hidden",
    marginBottom: 12,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  toggleButtonRight: {
    borderLeftWidth: 1,
    borderLeftColor: BORDER.medium,
  },
  toggleButtonActive: {
    backgroundColor: BRAND.primary,
  },
  toggleText: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "700",
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },
  bottomSpacer: {
    height: 32,
  },
});
