import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { BRAND, SURFACE, TEXT, ACCENT } from "@/constants/colors";
import { getPlayerImageSource, prefetchPlayerImages } from "@/lib/playerImages";

interface DraftedPlayer {
  _id?: string;
  playerId: number;
  firstName: string;
  lastName: string;
  team: string;
  position: string;
  photoUrl?: string;
  pickNumber: number;
  round: number;
  isAutoPick?: boolean;
  addedAt?: string;
}

interface Roster {
  squadId?: string;
  squadName?: string;
  squad?: {
    _id?: string;
    name?: string;
  };
  players?: DraftedPlayer[];
}

interface DraftBoardProps {
  rosters: Roster[];
  squads: any[];
  currentPickNumber?: number;
  currentSquadId?: string | null;
  squadAutoPickState?: Record<
    string,
    {
      enabled?: boolean;
      reason?: string | null;
      updatedAt?: string | null;
    }
  >;
  totalRounds?: number;
  leagueSize?: number;
  bottomPadding?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  onPlayerPress?: (player: DraftedPlayer) => void;
}

// Calculate pick number for a cell in snake draft - moved outside for performance
const calculatePickNumber = (
  round: number,
  squadIndex: number,
  leagueSize: number
) => {
  const isOddRound = round % 2 === 1;

  if (isOddRound) {
    // Odd rounds: 1, 3, 5... go forward (0, 1, 2, 3...)
    return (round - 1) * leagueSize + squadIndex + 1;
  } else {
    // Even rounds: 2, 4, 6... go backward (N-1, N-2, N-3, ...)
    return (round - 1) * leagueSize + (leagueSize - squadIndex);
  }
};

// Position-based background colors - moved outside component to avoid recreation
const getPositionColor = (position: string): string => {
  const pos = position?.toUpperCase() || "";

  // QB - Blue (Dusty Denim)
  if (pos === "QB") return "#5688C7";

  // RB - Red (Bubblegum Pink)
  if (pos === "RB") return "#F45B69";

  // WR - Green (Tea Green)
  if (pos === "WR") return "#D1F0B1";

  // TE - Orange (Carrot Orange)
  if (pos === "TE") return "#F18F01";

  // K - Yellow (using a complementary yellow)
  if (pos === "K") return "#F5C842";

  // Defense - Purple - also catch-all for any other position
  if (pos === "DEF" || pos === "DST" || pos === "D") return "#A461C6";

  // Default to Defense color for any unmatched position
  return "#A461C6";
};

const formatDraftBoardPlayerName = (player: DraftedPlayer): string => {
  const first = String(player?.firstName || "").trim();
  const last = String(player?.lastName || "").trim();
  if (first && last) return `${first[0]}. ${last}`;
  return first || last || `Player ${player.playerId}`;
};

export const DraftBoard = React.memo(function DraftBoard({
  rosters,
  squads,
  currentPickNumber,
  currentSquadId,
  squadAutoPickState,
  totalRounds = 15,
  leagueSize,
  bottomPadding = 24,
  refreshing = false,
  onRefresh,
  onPlayerPress,
}: DraftBoardProps) {
  // Get all squads in order, with roster data
  const squadOrder = useMemo(() => {
    // Create a map of squadId to roster
    const rosterMap = new Map<string, Roster>();
    rosters.forEach((roster) => {
      const squadId = roster.squadId || roster.squad?._id;
      if (squadId) {
        rosterMap.set(squadId, roster);
      }
    });

    // Get squad order from squads array, or derive from rosters
    const orderedSquads =
      squads.length > 0
        ? squads.map((squad) => ({
            _id: squad._id,
            name: squad.name || "Unknown",
            roster: rosterMap.get(squad._id)?.players || [],
          }))
        : Array.from(rosterMap.entries()).map(([squadId, roster]) => ({
            _id: squadId,
            name: roster.squadName || roster.squad?.name || "Unknown",
            roster: roster.players || [],
          }));

    return orderedSquads;
  }, [rosters, squads]);

  // Calculate actual league size from squads or rosters
  const actualLeagueSize = leagueSize || squadOrder.length || 1;

  // Create a grid: rounds (rows) x squads (columns)
  // For snake draft: Round 1 goes 1->N, Round 2 goes N->1, Round 3 goes 1->N, etc.
  const draftGrid = useMemo(() => {
    const grid: (DraftedPlayer | null)[][] = [];

    // Initialize grid with nulls
    for (let round = 1; round <= totalRounds; round++) {
      const row: (DraftedPlayer | null)[] = [];
      for (let squadIndex = 0; squadIndex < actualLeagueSize; squadIndex++) {
        row.push(null);
      }
      grid.push(row);
    }

    // Create a map of pickNumber -> player for quick lookup
    const pickMap = new Map<
      number,
      { player: DraftedPlayer; squadId: string }
    >();
    squadOrder.forEach((squad) => {
      squad.roster.forEach((player) => {
        if (player.pickNumber) {
          pickMap.set(player.pickNumber, {
            player,
            squadId: squad._id || "",
          });
        }
      });
    });

    // Fill in the grid based on pick numbers
    for (let round = 1; round <= totalRounds; round++) {
      for (let squadIndex = 0; squadIndex < actualLeagueSize; squadIndex++) {
        // Calculate pick number for this position
        const pickNum = calculatePickNumber(
          round,
          squadIndex,
          actualLeagueSize
        );
        const pickData = pickMap.get(pickNum);
        if (pickData) {
          grid[round - 1][squadIndex] = pickData.player;
        }
      }
    }

    return grid;
  }, [squadOrder, totalRounds, actualLeagueSize]);

  useEffect(() => {
    const players = squadOrder.flatMap((squad) => squad.roster || []);
    prefetchPlayerImages(players, 80);
  }, [squadOrder]);

  // Wrapper function for use in render
  const getPickNumber = (round: number, squadIndex: number) => {
    return calculatePickNumber(round, squadIndex, actualLeagueSize);
  };

  const screenWidth = Dimensions.get("window").width;
  const cellWidth = Math.max(
    132,
    (screenWidth - 60) / Math.max(actualLeagueSize, 4)
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={styles.horizontalScrollView}
        contentContainerStyle={styles.horizontalContent}
        nestedScrollEnabled={true}
      >
        <ScrollView
          showsVerticalScrollIndicator={true}
          style={styles.verticalScrollView}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          nestedScrollEnabled={true}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={BRAND.primary}
              />
            ) : undefined
          }
        >
          {/* Header Row - Squad Names */}
          <View style={styles.headerRow}>
            <View style={[styles.roundHeaderCell, { width: 50 }]}>
              <Text style={styles.roundHeaderText}>RD</Text>
            </View>
            {squadOrder.map((squad, index) => (
              <View
                key={squad._id || index}
                style={[
                  styles.squadHeaderCell,
                  { width: cellWidth },
                  currentSquadId === squad._id && styles.currentSquadHeader,
                ]}
              >
                <Text
                  style={[
                    styles.squadHeaderText,
                    currentSquadId === squad._id &&
                      styles.currentSquadHeaderText,
                  ]}
                  numberOfLines={2}
                >
                  {squad.name}
                </Text>
                {Boolean(squadAutoPickState?.[String(squad._id)]?.enabled) ? (
                  <View style={styles.autopickBadge}>
                    <MaterialIcons name="bolt" size={10} color="#FFFFFF" />
                    <Text style={styles.autopickBadgeText}>AUTO</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          {/* Draft Grid Rows */}
          {draftGrid.map((row, roundIndex) => {
            const round = roundIndex + 1;
            return (
              <View key={round} style={styles.row}>
                {/* Round Number Cell */}
                <View style={[styles.roundCell, { width: 50 }]}>
                  <Text style={styles.roundText}>{round}</Text>
                </View>

                {/* Player Cells */}
                {row.map((player, squadIndex) => {
                  const pickNum = getPickNumber(round, squadIndex);
                  const isCurrentPick =
                    currentPickNumber !== undefined &&
                    pickNum === currentPickNumber;
                  const squadId = squadOrder[squadIndex]?._id;
                  const isCurrentSquad = currentSquadId === squadId;

                  const positionColor = player
                    ? getPositionColor(player.position)
                    : SURFACE.cardTransparent;
                  const playerImageSource = player ? getPlayerImageSource(player) : null;

                  // Calculate pick number in round (1-based)
                  const pickInRound =
                    round % 2 === 1
                      ? squadIndex + 1
                      : actualLeagueSize - squadIndex;

                  return (
                    <View
                      key={`${round}-${squadIndex}`}
                      style={[
                        styles.cell,
                        { width: cellWidth },
                        { backgroundColor: positionColor },
                        isCurrentSquad && styles.currentSquadColumn,
                        isCurrentPick && styles.currentPickCell,
                        isCurrentSquad &&
                          isCurrentPick &&
                          styles.currentSquadPickCell,
                      ]}
                    >
                      {player ? (
                        <TouchableOpacity
                          style={styles.playerCellTapArea}
                          onPress={() => onPlayerPress?.(player)}
                          disabled={!onPlayerPress || !Number.isFinite(Number(player.playerId))}
                          activeOpacity={0.78}
                        >
                          <View style={styles.playerTextWrap}>
                            <Text style={styles.playerName} numberOfLines={2}>
                              {formatDraftBoardPlayerName(player)}
                            </Text>
                            <Text style={styles.playerPositionTeam} numberOfLines={1}>
                              {player.position} • {player.team} • {round}.{pickInRound}
                            </Text>
                          </View>
                          {playerImageSource ? (
                            <ExpoImage
                              source={playerImageSource}
                              style={styles.playerPhoto}
                              contentFit="cover"
                              transition={100}
                              cachePolicy="memory-disk"
                            />
                          ) : null}
                        </TouchableOpacity>
                      ) : isCurrentPick ? (
                        <View style={styles.emptyCurrentPickCell}>
                          <MaterialIcons
                            name="schedule"
                            size={24}
                            color={BRAND.primary}
                            style={styles.clockIcon}
                          />
                          <View style={styles.onTheClockBadge}>
                            <Text style={styles.onTheClockText}>
                              ON THE CLOCK
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.emptyCellText}>{pickNum}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE.background,
  },
  horizontalScrollView: {
    flex: 1,
  },
  horizontalContent: {
    flexGrow: 1,
  },
  verticalScrollView: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  roundHeaderCell: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
    marginBottom: 4,
    borderRadius: 6,
    backgroundColor: SURFACE.cardTransparent,
  },
  roundHeaderText: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "600",
  },
  squadHeaderCell: {
    paddingHorizontal: 6,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
    marginBottom: 4,
    borderRadius: 6,
    backgroundColor: SURFACE.cardTransparent,
  },
  currentSquadHeader: {
    backgroundColor: ACCENT.redBg,
    borderWidth: 2,
    borderColor: BRAND.primary,
  },
  squadHeaderText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  autopickBadge: {
    position: "absolute",
    right: 4,
    bottom: 3,
    borderRadius: 6,
    backgroundColor: "rgba(22, 27, 36, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  autopickBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  currentSquadHeaderText: {
    color: BRAND.primary,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 4,
    alignItems: "stretch",
    minHeight: 88,
  },
  roundCell: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
    marginBottom: 4,
    borderRadius: 6,
    backgroundColor: SURFACE.cardTransparent,
    minHeight: 88,
  },
  roundText: {
    color: TEXT.secondary,
    fontSize: 14,
    fontWeight: "600",
  },
  cell: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    minHeight: 88,
    marginRight: 4,
    marginBottom: 4,
    borderRadius: 6,
  },
  playerCellTapArea: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-start",
    position: "relative",
    paddingRight: 2,
    paddingBottom: 34,
  },
  playerTextWrap: {
    width: "100%",
    minWidth: 0,
    paddingRight: 0,
  },
  currentPickCell: {
    backgroundColor: ACCENT.redBg,
    borderWidth: 2,
    borderColor: BRAND.primary,
  },
  currentSquadColumn: {
    borderWidth: 2,
    borderColor: BRAND.primary,
  },
  currentSquadPickCell: {
    backgroundColor: ACCENT.redBgMedium,
  },
  playerName: {
    color: "#1A1A1A",
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 16,
    marginBottom: 2,
  },
  playerPositionTeam: {
    color: "#4A4A4A",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "left",
    width: "100%",
  },
  playerPhoto: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  emptyCellText: {
    color: TEXT.secondary,
    fontSize: 10,
    opacity: 0.5,
  },
  emptyCurrentPickCell: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  clockIcon: {
    marginBottom: 8,
    alignSelf: "center",
  },
  onTheClockBadge: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  onTheClockText: {
    color: "#FFFFFF",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
