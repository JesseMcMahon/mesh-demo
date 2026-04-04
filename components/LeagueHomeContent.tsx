import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Image,
  ImageSourcePropType,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { QuickActionCard } from "./QuickActionCard";
import { StatCard } from "./StatCard";
import { ActivityFeedCard, ActivityType } from "./ActivityFeedCard";
import { VoteStatus } from "@/types/roster";
import { ACCENT, BRAND, SURFACE, TEXT, BORDER, SEMANTIC } from "@/constants/colors";

const meshLogo: ImageSourcePropType = require("@/assets/images/meshLogo.png");

interface LeagueHomeContentProps {
  leagueName: string;
  squadName?: string;
  squadImageUrl?: string;
  record?: string;
  rank?: number;
  totalSquads?: number;
  currentWeek: number;
  seasonYear?: number;
  voteStatus: VoteStatus;
  voteDeadline?: string;
  weeklyPoints?: number;
  projectedPoints?: number;
  pointsRank?: number;
  pendingWaiverCount?: number;
  pendingTradeCount?: number;
  currentMatchup?: {
    opponentName: string;
    opponentRecord?: string;
    opponentPoints?: number;
    userPoints?: number;
    gameTime?: string;
  };
  recentActivity?: {
    id: string;
    type: ActivityType;
    title: string;
    subtitle?: string;
    timestamp: string;
  }[];
  onVotePress: () => void;
  onRosterPress: () => void;
  onEnterDraftPress?: () => void;
  onMatchupPress?: () => void;
  onLeaderboardPress?: () => void;
  onTradesPress?: () => void;
  onWaiverPress?: () => void;
  onStandingsPress?: () => void;
  onActivityPress?: (activity: any) => void;
  onRefresh?: () => Promise<void>;
}

function formatScore(value: number) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "0.0";
  return num.toFixed(1);
}

function matchupStatusTone(gameTime?: string) {
  const normalized = String(gameTime || "").toLowerCase();
  if (normalized.includes("live")) return { label: "Live", color: SEMANTIC.warning, bg: "#FF6B351F" };
  if (normalized.includes("final")) return { label: "Final", color: BRAND.gold, bg: "#F5C5181F" };
  return { label: "Projected", color: BRAND.primary, bg: ACCENT.primaryBg };
}

export const LeagueHomeContent = React.memo(function LeagueHomeContent({
  leagueName,
  squadName = "My Squad",
  squadImageUrl,
  record = "0-0",
  rank = 1,
  totalSquads = 10,
  currentWeek = 1,
  seasonYear,
  voteStatus,
  voteDeadline,
  weeklyPoints = 0,
  projectedPoints = 0,
  pendingWaiverCount = 0,
  pendingTradeCount = 0,
  currentMatchup,
  recentActivity = [],
  onVotePress,
  onRosterPress,
  onEnterDraftPress,
  onMatchupPress,
  onLeaderboardPress,
  onTradesPress,
  onWaiverPress,
  onStandingsPress,
  onActivityPress,
  onRefresh,
}: LeagueHomeContentProps) {
  const [refreshing, setRefreshing] = useState(false);
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(reveal, {
      toValue: 1,
      duration: 260,
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

  const hasVoted = voteStatus?.hasVoted ?? false;
  const displayActivity = useMemo(() => recentActivity, [recentActivity]);
  const matchupTone = matchupStatusTone(currentMatchup?.gameTime);

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
        <View style={styles.headerCard}>
          <LinearGradient
            colors={["rgba(20, 95, 128, 0.48)", "rgba(9, 21, 34, 0.84)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerTop}>
              <View style={styles.squadInfo}>
                <View style={styles.squadImageContainer}>
                  {squadImageUrl ? (
                    <Image source={{ uri: squadImageUrl }} style={styles.squadImage} resizeMode="cover" />
                  ) : (
                    <Image source={meshLogo} style={styles.squadImage} resizeMode="contain" />
                  )}
                </View>
                <View style={styles.squadDetails}>
                  <Text style={styles.squadName} numberOfLines={1}>{squadName}</Text>
                  <Text style={styles.leagueName} numberOfLines={1}>{leagueName}</Text>
                </View>
              </View>
              <View style={styles.recordBadge}>
                <Text style={styles.recordText}>{record}</Text>
              </View>
            </View>

            <View style={styles.headerStats}>
              <View style={styles.headerStat}>
                <Text style={styles.headerStatValue}>#{rank}</Text>
                <Text style={styles.headerStatLabel}>Rank</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStat}>
                <Text style={styles.headerStatValue}>Wk {currentWeek}</Text>
                <Text style={styles.headerStatLabel}>{seasonYear || new Date().getFullYear()}</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStat}>
                <Text style={styles.headerStatValue}>{totalSquads}</Text>
                <Text style={styles.headerStatLabel}>Squads</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.voteCTA} onPress={onVotePress} activeOpacity={0.9}>
            <LinearGradient
              colors={hasVoted ? ["#1A87B4", "#4FD6FF"] : ["#56D7FF", "#157EA8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.voteGradient}
            >
              <View style={styles.voteIconContainer}>
                <MaterialIcons
                  name={hasVoted ? "how-to-vote" : "checklist"}
                  size={22}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.voteTextContainer}>
                <Text style={styles.voteTitle}>
                  {hasVoted ? "Update This Week's Lineup" : "Set This Week's Lineup"}
                </Text>
                <Text style={styles.voteSubtitle}>
                  {hasVoted
                    ? "Your vote is in. Tap to adjust starters."
                    : voteDeadline
                    ? `Vote by ${voteDeadline}`
                    : "Vote on who should start this week."}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <StatCard
                label="Points"
                value={formatScore(weeklyPoints)}
                icon="sports-football"
                iconColor={BRAND.gold}
                size="small"
              />
            </View>
            <View style={styles.statItem}>
              <StatCard
                label="Projected"
                value={formatScore(projectedPoints)}
                icon="trending-up"
                iconColor={BRAND.primary}
                size="small"
              />
            </View>
          </View>
        </View>

        {currentMatchup ? (
          <View style={styles.section}>
            <View style={styles.matchupHeaderRow}>
              <Text style={styles.sectionTitle}>Live Matchup</Text>
              <View style={[styles.matchupPill, { backgroundColor: matchupTone.bg }]}> 
                <Text style={[styles.matchupPillText, { color: matchupTone.color }]}>{matchupTone.label}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.matchupCard}
              onPress={onMatchupPress}
              activeOpacity={0.8}
            >
              <View style={styles.matchupTeam}>
                <View style={styles.matchupImageContainer}>
                  <Image source={meshLogo} style={styles.matchupImage} resizeMode="contain" />
                </View>
                <Text style={styles.matchupTeamName} numberOfLines={1}>{squadName}</Text>
                <Text style={styles.matchupPoints}>{formatScore(Number(currentMatchup.userPoints || 0))}</Text>
              </View>
              <View style={styles.matchupVs}>
                <Text style={styles.matchupVsText}>VS</Text>
                <Text style={styles.matchupTime}>{currentMatchup.gameTime || "Projected"}</Text>
              </View>
              <View style={styles.matchupTeam}>
                <View style={styles.matchupImageContainer}>
                  <MaterialIcons name="groups" size={22} color={TEXT.secondary} />
                </View>
                <Text style={styles.matchupTeamName} numberOfLines={1}>{currentMatchup.opponentName}</Text>
                <Text style={styles.matchupPoints}>{formatScore(Number(currentMatchup.opponentPoints || 0))}</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <View style={styles.actionCell}>
              <QuickActionCard icon="list-alt" title="Roster" subtitle="View lineup" onPress={onRosterPress} />
            </View>

            {onLeaderboardPress ? (
              <View style={styles.actionCell}>
                <QuickActionCard icon="leaderboard" title="Leaderboards" subtitle="Top squads" onPress={onLeaderboardPress} />
              </View>
            ) : null}

            {onStandingsPress ? (
              <View style={styles.actionCell}>
                <QuickActionCard icon="emoji-events" title="Standings" subtitle="League table" onPress={onStandingsPress} />
              </View>
            ) : null}

            {onTradesPress ? (
              <View style={styles.actionCell}>
                <QuickActionCard
                  icon="swap-horiz"
                  title="Trades"
                  subtitle="Review offers"
                  onPress={onTradesPress}
                  badge={pendingTradeCount > 0 ? pendingTradeCount : undefined}
                />
              </View>
            ) : null}

            {onWaiverPress ? (
              <View style={styles.actionCell}>
                <QuickActionCard
                  icon="person-add"
                  title="Players"
                  subtitle="Add, drop, claims"
                  onPress={onWaiverPress}
                  badge={pendingWaiverCount > 0 ? pendingWaiverCount : undefined}
                />
              </View>
            ) : null}

            {onEnterDraftPress ? (
              <View style={styles.actionCell}>
                <QuickActionCard icon="sports-football" title="Draft Room" subtitle="Enter live draft" onPress={onEnterDraftPress} />
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <ActivityFeedCard
            title="Activity"
            activities={displayActivity}
            onActivityPress={onActivityPress}
            maxItems={5}
            emptyMessage="No recent league activity"
          />
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
    paddingTop: 16,
  },
  headerCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER.medium,
    overflow: "hidden",
    backgroundColor: SURFACE.card,
  },
  headerGradient: {
    padding: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  squadInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  squadImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: SURFACE.elevated,
    overflow: "hidden",
    marginRight: 12,
    borderWidth: 1,
    borderColor: BORDER.default,
  },
  squadImage: {
    width: "100%",
    height: "100%",
  },
  squadDetails: {
    flex: 1,
  },
  squadName: {
    color: TEXT.primary,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.35,
  },
  leagueName: {
    color: TEXT.secondary,
    fontSize: 13,
    marginTop: 2,
  },
  recordBadge: {
    backgroundColor: ACCENT.primaryBgStrong,
    borderWidth: 1,
    borderColor: ACCENT.primaryBorder,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  recordText: {
    color: BRAND.primary,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  headerStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#091523",
    borderRadius: 12,
    paddingVertical: 12,
  },
  headerStat: {
    alignItems: "center",
    flex: 1,
  },
  headerStatValue: {
    color: TEXT.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  headerStatLabel: {
    color: TEXT.secondary,
    fontSize: 11,
    marginTop: 3,
    fontWeight: "600",
  },
  headerStatDivider: {
    width: 1,
    height: 26,
    backgroundColor: BORDER.medium,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: TEXT.primary,
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: -0.35,
  },
  voteCTA: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: ACCENT.primaryBorder,
  },
  voteGradient: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  voteIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  voteTextContainer: {
    flex: 1,
  },
  voteTitle: {
    color: TEXT.primary,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  voteSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statItem: {
    flex: 1,
  },
  matchupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  matchupPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  matchupPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  matchupCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER.medium,
    padding: 16,
  },
  matchupTeam: {
    flex: 1,
    alignItems: "center",
  },
  matchupImageContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: SURFACE.elevated,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 7,
  },
  matchupImage: {
    width: "100%",
    height: "100%",
  },
  matchupTeamName: {
    color: TEXT.primary,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  matchupPoints: {
    color: BRAND.gold,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 5,
  },
  matchupVs: {
    paddingHorizontal: 12,
    alignItems: "center",
  },
  matchupVsText: {
    color: TEXT.tertiary,
    fontSize: 14,
    fontWeight: "900",
  },
  matchupTime: {
    color: BRAND.primary,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  actionCell: {
    width: "48.5%",
  },
  bottomSpacer: {
    height: 34,
  },
});
