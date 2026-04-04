import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND, BORDER, SEMANTIC, SURFACE, TEXT } from "@/constants/colors";
import { PlayerDetailsModal } from "@/components/PlayerDetailsModal";

type MatchupCenterProps = {
  centerData: any;
  selectedWeek: number;
  onWeekChange: (week: number) => void;
  onRefresh?: () => Promise<void>;
  socketConnected?: boolean;
  leagueId?: string;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32;

function statusText(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active") return "LIVE";
  if (normalized === "final") return "FINAL";
  return "PREGAME";
}

function statusColor(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active") return SEMANTIC.success;
  if (normalized === "final") return TEXT.secondary;
  return SEMANTIC.warning;
}

function formatPoints(value: unknown) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "0.0";
  return numeric.toFixed(1);
}

function formatClock(quarter: unknown, clock: unknown) {
  const quarterLabel = quarter ? `Q${String(quarter).replace(/^Q/i, "")}` : "";
  const clockLabel = clock ? String(clock) : "";
  return [quarterLabel, clockLabel].filter(Boolean).join(" • ") || "";
}

function playerSubtitle(player: any) {
  const position = String(player?.position || "").toUpperCase();
  const team = String(player?.team || "").toUpperCase();
  const injury = String(player?.injuryStatus || "").trim();
  return [
    [position, team].filter(Boolean).join(" • "),
    injury ? injury.toUpperCase() : "",
  ]
    .filter(Boolean)
    .join("  ");
}

function getWeekArray(weekNav: any[]) {
  return (Array.isArray(weekNav) ? weekNav : [])
    .map((entry) => Number(entry?.week || 0))
    .filter((week) => Number.isFinite(week) && week > 0)
    .sort((a, b) => a - b);
}

function rowTone(player: any) {
  if (!player?.liveContext) return null;
  if (player.liveContext?.isRedZone) return "redzone";
  if (player.liveContext?.hasPossession) return "possession";
  return null;
}

function PlayerColumn({
  player,
  align,
  onPress,
}: {
  player: any;
  align: "left" | "right";
  onPress: (player: any) => void;
}) {
  if (!player) {
    return <View style={[styles.playerColumn, align === "right" && styles.playerColumnRight]} />;
  }

  const tone = rowTone(player);
  return (
    <Pressable
      onPress={() => onPress(player)}
      style={[
        styles.playerColumn,
        align === "right" && styles.playerColumnRight,
        tone === "possession" && styles.playerColumnPossession,
        tone === "redzone" && styles.playerColumnRedZone,
      ]}
    >
      <Text
        style={[styles.playerName, align === "right" && styles.playerNameRight]}
        numberOfLines={1}
      >
        {player.name}
      </Text>
      <Text
        style={[styles.playerMeta, align === "right" && styles.playerMetaRight]}
        numberOfLines={1}
      >
        {playerSubtitle(player)}
      </Text>
      <View style={[styles.playerPointsRow, align === "right" && styles.playerPointsRowRight]}>
        <Text style={styles.playerPoints}>{formatPoints(player.fantasyPoints)}</Text>
        <Text style={styles.playerProjection}>Proj {formatPoints(player.projectedPoints)}</Text>
      </View>
      {!!formatClock(player?.liveContext?.quarter, player?.liveContext?.clock) && (
        <Text
          style={[styles.liveClock, align === "right" && styles.liveClockRight]}
          numberOfLines={1}
        >
          {formatClock(player?.liveContext?.quarter, player?.liveContext?.clock)}
        </Text>
      )}
    </Pressable>
  );
}

function MatchRows({
  rows,
  onPlayerPress,
}: {
  rows: any[];
  onPlayerPress: (player: any) => void;
}) {
  const starters = (rows || []).filter((row) => row?.rowType === "starter");
  const bench = (rows || []).filter((row) => row?.rowType === "bench");

  const renderRow = (row: any) => (
    <View key={`${row.rowType}-${row.slot}`} style={styles.rowCard}>
      <PlayerColumn player={row.left} align="left" onPress={onPlayerPress} />
      <View style={styles.slotColumn}>
        <Text style={styles.slotLabel}>{row.slotDisplay || row.slot}</Text>
      </View>
      <PlayerColumn player={row.right} align="right" onPress={onPlayerPress} />
    </View>
  );

  return (
    <View style={styles.rowsContainer}>
      <Text style={styles.sectionTitle}>Starters</Text>
      {starters.length ? starters.map(renderRow) : <Text style={styles.emptySection}>No starter data.</Text>}

      <Text style={[styles.sectionTitle, styles.sectionSpacer]}>Bench</Text>
      {bench.length ? bench.map(renderRow) : <Text style={styles.emptySection}>No bench data.</Text>}
    </View>
  );
}

export function MatchupCenter({
  centerData,
  selectedWeek,
  onWeekChange,
  onRefresh,
  leagueId,
}: MatchupCenterProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMatchupId, setSelectedMatchupId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const carouselRef = useRef<FlatList>(null);

  const cards = useMemo(() => centerData?.matchTab?.cards || [], [centerData]);
  const liveMatchupCount = useMemo(
    () => cards.filter((card: any) => String(card?.status || "").toLowerCase() === "active").length,
    [cards]
  );
  const rows = useMemo(() => {
    const selectedCard = cards.find((entry: any) => entry.matchupId === selectedMatchupId) || cards[0];
    return selectedCard?.rows || centerData?.matchTab?.rows || [];
  }, [cards, selectedMatchupId, centerData]);

  useEffect(() => {
    if (!cards.length) {
      setSelectedMatchupId(null);
      return;
    }
    if (!selectedMatchupId || !cards.find((entry: any) => entry.matchupId === selectedMatchupId)) {
      setSelectedMatchupId(cards[0].matchupId);
    }
  }, [cards, selectedMatchupId]);

  const selectedIndex = useMemo(() => {
    if (!cards.length || !selectedMatchupId) return 0;
    const idx = cards.findIndex((entry: any) => entry.matchupId === selectedMatchupId);
    return idx >= 0 ? idx : 0;
  }, [cards, selectedMatchupId]);

  const onPullRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const weekChoices = useMemo(() => getWeekArray(centerData?.weekNav || []), [centerData]);
  const weekIndex = useMemo(
    () => weekChoices.findIndex((week) => week === Number(selectedWeek)),
    [weekChoices, selectedWeek]
  );

  const goPrevWeek = useCallback(() => {
    if (weekIndex <= 0) return;
    onWeekChange(weekChoices[weekIndex - 1]);
  }, [weekIndex, weekChoices, onWeekChange]);

  const goNextWeek = useCallback(() => {
    if (weekIndex < 0 || weekIndex >= weekChoices.length - 1) return;
    onWeekChange(weekChoices[weekIndex + 1]);
  }, [weekIndex, weekChoices, onWeekChange]);

  const onCardMomentumEnd = useCallback(
    (event: any) => {
      const offsetX = Number(event?.nativeEvent?.contentOffset?.x || 0);
      const index = Math.max(0, Math.min(cards.length - 1, Math.round(offsetX / CARD_WIDTH)));
      if (cards[index]) {
        setSelectedMatchupId(cards[index].matchupId);
      }
    },
    [cards]
  );

  useEffect(() => {
    if (!cards.length) return;
    carouselRef.current?.scrollToIndex({
      index: selectedIndex,
      animated: true,
      viewOffset: 0,
    });
  }, [selectedIndex, cards.length]);

  const openPlayer = useCallback((player: any) => {
    if (!player?.playerId) return;
    setSelectedPlayer(player);
    setPlayerModalOpen(true);
  }, []);

  const closePlayerModal = useCallback(() => {
    setPlayerModalOpen(false);
    setSelectedPlayer(null);
  }, []);

  const renderHeaderCard = useCallback(
    ({ item }: { item: any }) => {
      const isSelected = item.matchupId === selectedMatchupId;
      const status = statusText(item.status);
      const statusTint = statusColor(item.status);
      return (
        <View style={[styles.headerCardWrap, isSelected && styles.headerCardWrapActive]}>
          <LinearGradient
            colors={["#1B2E57", "#132643"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerCard}
          >
            <View style={styles.cardMetaRow}>
              <Text style={styles.cardMetaTitle}>MATCHUP {item.matchupNumber}</Text>
              <View style={[styles.statusPill, { borderColor: `${statusTint}77` }]}>
                <Text style={[styles.statusPillText, { color: statusTint }]}>{status}</Text>
              </View>
            </View>

            <View style={styles.cardTeamsRow}>
              <View style={styles.cardTeamBlock}>
                <Text style={styles.cardTeamName} numberOfLines={1}>{item.home?.name || "Home"}</Text>
                <Text style={styles.cardTeamSub}>
                  {item.home?.record || "--"}
                  {item.home?.rank ? `  (#${item.home.rank})` : ""}
                </Text>
                <Text style={styles.cardScore}>{formatPoints(item.scores?.live?.home)}</Text>
                <Text style={styles.cardProjected}>Proj {formatPoints(item.scores?.projected?.home)}</Text>
              </View>

              <View style={styles.winPctCol}>
                <Text style={styles.winPctText}>{Number(item.winPct?.home || 50).toFixed(0)}%</Text>
                <Text style={styles.winPctDivider}>WIN</Text>
                <Text style={styles.winPctText}>{Number(item.winPct?.away || 50).toFixed(0)}%</Text>
              </View>

              <View style={[styles.cardTeamBlock, styles.cardTeamBlockRight]}>
                <Text style={[styles.cardTeamName, styles.cardTeamNameRight]} numberOfLines={1}>{item.away?.name || "Away"}</Text>
                <Text style={[styles.cardTeamSub, styles.cardTeamSubRight]}>
                  {item.away?.record || "--"}
                  {item.away?.rank ? `  (#${item.away.rank})` : ""}
                </Text>
                <Text style={[styles.cardScore, styles.cardScoreRight]}>{formatPoints(item.scores?.live?.away)}</Text>
                <Text style={[styles.cardProjected, styles.cardProjectedRight]}>Proj {formatPoints(item.scores?.projected?.away)}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      );
    },
    [selectedMatchupId]
  );

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullRefresh}
              tintColor={BRAND.primary}
              colors={[BRAND.primary]}
            />
          ) : undefined
        }
      >
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>Matchups</Text>
          <Text style={styles.screenSubtitle}>Week {selectedWeek} slate</Text>
        </View>

        <View style={styles.topBar}>
          <TouchableOpacity onPress={goPrevWeek} style={styles.weekArrow} disabled={weekIndex <= 0}>
            <MaterialIcons
              name="chevron-left"
              size={22}
              color={weekIndex <= 0 ? TEXT.tertiary : TEXT.primary}
            />
          </TouchableOpacity>
          <View style={styles.weekCenter}>
            <Text style={styles.weekCenterTitle}>CURRENT WEEK</Text>
            <Text style={styles.weekCenterValue}>Week {selectedWeek}</Text>
          </View>
          <TouchableOpacity
            onPress={goNextWeek}
            style={styles.weekArrow}
            disabled={weekIndex < 0 || weekIndex >= weekChoices.length - 1}
          >
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={weekIndex < 0 || weekIndex >= weekChoices.length - 1 ? TEXT.tertiary : TEXT.primary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillValue}>{cards.length}</Text>
            <Text style={styles.summaryPillLabel}>Matchups</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={[styles.summaryPillValue, { color: liveMatchupCount > 0 ? SEMANTIC.warning : BRAND.primary }]}>
              {liveMatchupCount}
            </Text>
            <Text style={styles.summaryPillLabel}>Live</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillValue}>{rows.length}</Text>
            <Text style={styles.summaryPillLabel}>Rows</Text>
          </View>
        </View>

        {cards.length > 0 ? (
          <>
            <FlatList
              ref={carouselRef}
              data={cards}
              keyExtractor={(item) => item.matchupId}
              renderItem={renderHeaderCard}
              horizontal
              pagingEnabled
              decelerationRate="fast"
              snapToInterval={CARD_WIDTH}
              snapToAlignment="start"
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onCardMomentumEnd}
              getItemLayout={(_, index) => ({
                length: CARD_WIDTH,
                offset: CARD_WIDTH * index,
                index,
              })}
            />

            <View style={styles.dotsRow}>
              {cards.map((card: any) => (
                <View
                  key={card.matchupId}
                  style={[styles.dot, card.matchupId === selectedMatchupId && styles.dotActive]}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No matchups available</Text>
            <Text style={styles.emptyStateSubtitle}>Try another week or refresh.</Text>
          </View>
        )}

        <MatchRows rows={rows} onPlayerPress={openPlayer} />

        <View style={{ height: 24 }} />
      </ScrollView>

      <PlayerDetailsModal
        visible={playerModalOpen}
        onClose={closePlayerModal}
        leagueId={leagueId}
        actionsEnabled={false}
        player={selectedPlayer}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
  },
  screenHeader: {
    marginBottom: 8,
  },
  screenTitle: {
    color: TEXT.primary,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.45,
  },
  screenSubtitle: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  summaryPill: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryPillValue: {
    color: BRAND.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  summaryPillLabel: {
    color: TEXT.secondary,
    fontSize: 11,
    fontWeight: "700",
  },
  weekArrow: {
    height: 36,
    width: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER.medium,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE.card,
  },
  weekCenter: {
    alignItems: "center",
  },
  weekCenterTitle: {
    color: BRAND.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.9,
  },
  weekCenterValue: {
    color: TEXT.primary,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  headerCardWrap: {
    width: CARD_WIDTH,
    paddingVertical: 4,
  },
  headerCardWrapActive: {
    opacity: 1,
  },
  headerCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER.medium,
    padding: 14,
  },
  cardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardMetaTitle: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  cardTeamsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTeamBlock: {
    flex: 1,
  },
  cardTeamBlockRight: {
    alignItems: "flex-end",
  },
  cardTeamName: {
    color: TEXT.primary,
    fontSize: 16,
    fontWeight: "800",
    maxWidth: 130,
  },
  cardTeamNameRight: {
    textAlign: "right",
  },
  cardTeamSub: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 3,
  },
  cardTeamSubRight: {
    textAlign: "right",
  },
  cardScore: {
    color: TEXT.primary,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 6,
  },
  cardScoreRight: {
    textAlign: "right",
  },
  cardProjected: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  cardProjectedRight: {
    textAlign: "right",
  },
  winPctCol: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  winPctText: {
    color: BRAND.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  winPctDivider: {
    color: TEXT.secondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dotActive: {
    width: 20,
    borderRadius: 6,
    backgroundColor: BRAND.primary,
  },
  rowsContainer: {
    gap: 8,
  },
  sectionTitle: {
    color: TEXT.primary,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
    marginBottom: 2,
  },
  sectionSpacer: {
    marginTop: 14,
  },
  emptySection: {
    color: TEXT.secondary,
    fontSize: 13,
    marginBottom: 8,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.card,
    overflow: "hidden",
  },
  playerColumn: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  playerColumnRight: {
    alignItems: "flex-end",
  },
  playerColumnPossession: {
    backgroundColor: "rgba(0, 188, 212, 0.10)",
  },
  playerColumnRedZone: {
    backgroundColor: "rgba(214, 48, 49, 0.12)",
  },
  slotColumn: {
    width: 58,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: "rgba(10,20,40,0.5)",
  },
  slotLabel: {
    color: TEXT.light,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  playerName: {
    color: TEXT.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  playerNameRight: {
    textAlign: "right",
  },
  playerMeta: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 3,
  },
  playerMetaRight: {
    textAlign: "right",
  },
  playerPointsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  playerPointsRowRight: {
    justifyContent: "flex-end",
  },
  playerPoints: {
    color: TEXT.primary,
    fontSize: 16,
    fontWeight: "900",
  },
  playerProjection: {
    color: TEXT.secondary,
    fontSize: 11,
    fontWeight: "600",
  },
  liveClock: {
    color: BRAND.primary,
    fontSize: 11,
    marginTop: 4,
    fontWeight: "700",
  },
  liveClockRight: {
    textAlign: "right",
  },
  emptyState: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.card,
    padding: 20,
    alignItems: "center",
    marginVertical: 10,
  },
  emptyStateTitle: {
    color: TEXT.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  emptyStateSubtitle: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 6,
  },
});
