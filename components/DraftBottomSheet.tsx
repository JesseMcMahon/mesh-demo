import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { MaterialIcons } from "@expo/vector-icons";
import { BRAND, SURFACE, TEXT, BORDER, SEMANTIC } from "@/constants/colors";
import { getPlayerImageSource, prefetchPlayerImages } from "@/lib/playerImages";
import { MeshTextInput } from "./MeshTextInput";

interface Player {
  _id: string;
  playerId: number;
  firstName: string;
  lastName: string;
  team: string;
  position: string;
  photoUrl?: string;
  adp?: number;
  projectedPoints?: number;
  pickNumber?: number;
}

interface Roster {
  squadId?: string;
  squadName?: string;
  squad?: {
    _id?: string;
    name?: string;
  };
  players?: Player[];
}

interface DraftBottomSheetProps {
  players: Player[];
  playerCount: number;
  positionFilters?: PositionFilter[];
  isLoading: boolean;
  error: Error | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onDraftPlayer: (player: Player, playerId: string) => void;
  onVotePlayer?: (player: Player, playerId: string) => void;
  isHeadCoach?: boolean;
  canDraft?: boolean;
  canVote?: boolean;
  isDraftButtonDisabled: boolean;
  isVoteButtonDisabled?: boolean;
  isDraftLocked: boolean;
  lockCountdown: number | null;
  myVotePlayerId?: number | null;
  votes?: DraftVoteRow[];
  isLoadingVotes?: boolean;
  votesError?: Error | null;
  rosters?: Roster[];
  isLoadingRosters?: boolean;
  onAddToQueue?: (player: Player) => void;
  onPlayerPress?: (player: Player) => void;
  isMyTurn?: boolean;
}

type TabType = "players" | "votes" | "rosters";
type PositionFilter = "ALL" | "QB" | "RB" | "WR" | "TE" | "K" | "DST";
type PlayerActionMode = "draft" | "vote";

interface DraftVoteVoter {
  userId: string;
  name?: string | null;
  username?: string | null;
  profilePicture?: string | null;
  isMe?: boolean;
}

interface DraftVoteRow {
  player: Player;
  voteCount: number;
  voters: DraftVoteVoter[];
}

// Position-based background colors - moved outside component
const POSITION_COLORS: Record<string, string> = {
  QB: "#5688C7",
  RB: "#F45B69",
  WR: "#D1F0B1",
  TE: "#F18F01",
  K: "#F5C842",
  DEF: "#A461C6",
  DST: "#A461C6",
  D: "#A461C6",
};

const getPositionColor = (position: string): string => {
  return POSITION_COLORS[position?.toUpperCase()] || "#A461C6";
};

const getPositionTextColor = (position: string): string => {
  return position?.toUpperCase() === "WR" ? "#1A1A1A" : "#FFFFFF";
};

const POSITION_FILTERS: PositionFilter[] = ["ALL", "QB", "RB", "WR", "TE", "K", "DST"];

const normalizeDraftPosition = (position?: string | null): PositionFilter | null => {
  const normalized = String(position || "").trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "DEF" || normalized === "D") return "DST";
  if (normalized === "PK") return "K";
  if (
    normalized === "QB" ||
    normalized === "RB" ||
    normalized === "WR" ||
    normalized === "TE" ||
    normalized === "K" ||
    normalized === "DST"
  ) {
    return normalized;
  }
  return null;
};

const formatPlayerDisplayName = (player: Player): string => {
  const first = String(player?.firstName || "").trim();
  const last = String(player?.lastName || "").trim();
  if (first && last) return `${first[0]}. ${last}`;
  return first || last || `Player ${player.playerId}`;
};

// ============================================
// MEMOIZED PLAYER ROW COMPONENT
// This is the key optimization - each row only re-renders
// when its specific props change, not when draft state changes
// ============================================
interface PlayerRowProps {
  player: Player;
  actionMode: PlayerActionMode;
  buttonText: string;
  isDisabled: boolean;
  isMyTurn: boolean;
  isVoteSelected: boolean;
  onAction: (player: Player, playerId: string) => void;
  onAddToQueue?: (player: Player) => void;
  onViewPlayer?: (player: Player) => void;
}

const PlayerRow = React.memo(
  function PlayerRow({
    player,
    actionMode,
    buttonText,
    isDisabled,
    isMyTurn,
    isVoteSelected,
    onAction,
    onAddToQueue,
    onViewPlayer,
  }: PlayerRowProps) {
    const positionColor = getPositionColor(player.position);
    const positionTextColor = getPositionTextColor(player.position);

    return (
      <View style={styles.playerCard}>
        {/* Primary Action Button */}
        <TouchableOpacity
          style={[
            styles.draftButton,
            isDisabled && styles.draftButtonDisabled,
            actionMode === "draft" && isMyTurn && !isDisabled && styles.draftButtonActive,
            actionMode === "vote" && !isDisabled && styles.voteButtonActive,
            actionMode === "vote" && isVoteSelected && styles.voteButtonSelected,
          ]}
          onPress={() => onAction(player, String(player.playerId))}
          disabled={isDisabled}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.draftButtonText,
              isDisabled && styles.draftButtonTextDisabled,
            ]}
          >
            {buttonText}
          </Text>
        </TouchableOpacity>

        {/* Rank */}
        <View style={styles.rankContainer}>
          <Text style={styles.rankText}>
            {player.adp ? Math.round(player.adp) : "-"}
          </Text>
        </View>

        {/* Player Info */}
        <TouchableOpacity
          style={styles.playerInfo}
          onPress={() => onViewPlayer?.(player)}
          disabled={!onViewPlayer || !Number.isFinite(Number(player.playerId))}
          activeOpacity={0.75}
        >
          <Text style={styles.playerName} numberOfLines={1}>
            {formatPlayerDisplayName(player)}
          </Text>
          <View style={styles.playerMeta}>
            <View style={[styles.positionBadge, { backgroundColor: positionColor }]}>
              <Text style={[styles.positionText, { color: positionTextColor }]}>
                {player.position}
              </Text>
            </View>
            <Text style={styles.teamText}>{player.team}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playerInfoButton}
          onPress={() => onViewPlayer?.(player)}
          disabled={!onViewPlayer || !Number.isFinite(Number(player.playerId))}
          activeOpacity={0.7}
        >
          <MaterialIcons name="open-in-new" size={15} color={TEXT.secondary} />
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>ADP</Text>
            <Text style={styles.statValue}>
              {player.adp != null ? player.adp.toFixed(1) : "-"}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>PTS</Text>
            <Text style={styles.statValue}>
              {player.projectedPoints != null ? player.projectedPoints.toFixed(1) : "-"}
            </Text>
          </View>
        </View>

        {/* Queue Button */}
        {onAddToQueue && (
          <TouchableOpacity
            style={styles.queueButton}
            onPress={() => onAddToQueue(player)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="playlist-add" size={20} color={BRAND.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.player._id === nextProps.player._id &&
      prevProps.actionMode === nextProps.actionMode &&
      prevProps.buttonText === nextProps.buttonText &&
      prevProps.isDisabled === nextProps.isDisabled &&
      prevProps.isMyTurn === nextProps.isMyTurn &&
      prevProps.isVoteSelected === nextProps.isVoteSelected
    );
  }
);

// ============================================
// MAIN COMPONENT
// ============================================
export const DraftBottomSheet = React.memo(function DraftBottomSheet({
  players,
  playerCount,
  positionFilters,
  isLoading,
  error,
  searchQuery,
  onSearchChange,
  onDraftPlayer,
  onVotePlayer,
  isHeadCoach = false,
  canDraft = false,
  canVote = false,
  isDraftButtonDisabled,
  isVoteButtonDisabled = true,
  isDraftLocked,
  lockCountdown,
  myVotePlayerId = null,
  votes = [],
  isLoadingVotes = false,
  votesError = null,
  rosters = [],
  isLoadingRosters = false,
  onAddToQueue,
  onPlayerPress,
  isMyTurn = false,
}: DraftBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const playersListRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>("players");
  const [selectedRosterSquadId, setSelectedRosterSquadId] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("ALL");
  const availablePositionFilters = useMemo(
    () =>
      Array.isArray(positionFilters) && positionFilters.length > 0
        ? positionFilters
        : POSITION_FILTERS,
    [positionFilters]
  );

  const actionMode: PlayerActionMode = isHeadCoach ? "draft" : "vote";
  const actionButtonText = useMemo(() => {
    if (actionMode === "draft") {
      if (isDraftLocked && lockCountdown !== null) {
        return `:${lockCountdown.toString().padStart(2, "0")}`;
      }
      return "DRAFT";
    }
    return "VOTE";
  }, [actionMode, isDraftLocked, lockCountdown]);

  const handleAction = useCallback((player: Player, playerId: string) => {
    if (actionMode === "draft") {
      onDraftPlayer(player, playerId);
      return;
    }
    if (actionMode === "vote") {
      onVotePlayer?.(player, playerId);
    }
  }, [actionMode, onDraftPlayer, onVotePlayer]);

  const handleAddToQueue = useCallback((player: Player) => {
    onAddToQueue?.(player);
  }, [onAddToQueue]);

  // Transform rosters into a format with squad info
  const rosterSquads = useMemo(() => {
    return rosters.map((roster) => ({
      _id: roster.squadId || roster.squad?._id || "",
      name: roster.squadName || roster.squad?.name || "Unknown Squad",
      roster: roster.players || [],
    }));
  }, [rosters]);

  useEffect(() => {
    if (!availablePositionFilters.includes(positionFilter)) {
      setPositionFilter("ALL");
    }
  }, [availablePositionFilters, positionFilter]);

  // Set default selected roster when rosters are loaded
  useEffect(() => {
    if (rosterSquads.length > 0 && !selectedRosterSquadId) {
      setSelectedRosterSquadId(rosterSquads[0]._id);
    }
  }, [rosterSquads, selectedRosterSquadId]);

  // Get selected roster
  const selectedRoster = useMemo(() => {
    return rosterSquads.find((squad) => squad._id === selectedRosterSquadId);
  }, [rosterSquads, selectedRosterSquadId]);

  // Count players by position for filter chips - only recalculate when players array reference changes
  const positionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < availablePositionFilters.length; i++) {
      counts[availablePositionFilters[i]] = 0;
    }
    counts.ALL = players.length;
    for (let i = 0; i < players.length; i++) {
      const pos = normalizeDraftPosition(players[i].position);
      if (pos && pos in counts && pos !== "ALL") {
        counts[pos]++;
      }
    }
    return counts;
  }, [availablePositionFilters, players]);

  // Bottom sheet snap points - static
  const snapPoints = useMemo(() => ["12%", "50%", "85%"], []);

  // Open bottom sheet to middle on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      bottomSheetRef.current?.snapToIndex(1);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (activeTab !== "players") return;
    const frame = requestAnimationFrame(() => {
      playersListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab]);

  // Filter and sort players - optimized
  const filteredPlayers = useMemo(() => {
    let filtered = players;

    // Filter by position
    if (positionFilter !== "ALL") {
      filtered = filtered.filter(
        (player) => normalizeDraftPosition(player.position) === positionFilter
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((player) => {
        const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
        return (
          fullName.includes(query) ||
          player.team.toLowerCase().includes(query) ||
          player.position.toLowerCase().includes(query)
        );
      });
    }

    // Sort: players with ADP first (by ADP ascending), then by last name
    return [...filtered].sort((a, b) => {
      const aHasAdp = a.adp != null;
      const bHasAdp = b.adp != null;

      if (aHasAdp && bHasAdp) return a.adp! - b.adp!;
      if (aHasAdp) return -1;
      if (bHasAdp) return 1;

      return a.lastName.localeCompare(b.lastName);
    });
  }, [players, searchQuery, positionFilter]);

  useEffect(() => {
    prefetchPlayerImages(filteredPlayers, 50);
  }, [filteredPlayers]);

  useEffect(() => {
    prefetchPlayerImages(selectedRoster?.roster || [], 30);
  }, [selectedRoster]);

  // Empty callback for sheet changes
  const handleSheetChanges = useCallback(() => {}, []);

  // Render item - stable reference, delegates to memoized PlayerRow
  const renderPlayerItem = useCallback(
    ({ item }: { item: Player }) => (
      <PlayerRow
        player={item}
        actionMode={actionMode}
        buttonText={
          actionMode === "vote" &&
          myVotePlayerId != null &&
          Number(myVotePlayerId) === Number(item.playerId)
            ? "VOTED"
            : actionButtonText
        }
        isDisabled={
          actionMode === "draft"
            ? isDraftButtonDisabled
            : actionMode === "vote"
              ? isVoteButtonDisabled
              : true
        }
        isMyTurn={isMyTurn}
        isVoteSelected={
          actionMode === "vote" &&
          myVotePlayerId != null &&
          Number(myVotePlayerId) === Number(item.playerId)
        }
        onAction={handleAction}
        onAddToQueue={onAddToQueue ? handleAddToQueue : undefined}
        onViewPlayer={onPlayerPress}
      />
    ),
    [
      actionMode,
      actionButtonText,
      handleAction,
      handleAddToQueue,
      isDraftButtonDisabled,
      isMyTurn,
      isVoteButtonDisabled,
      myVotePlayerId,
      onAddToQueue,
      onPlayerPress,
    ]
  );

  // Key extractor - stable
  const keyExtractor = useCallback((item: Player) => item._id, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case "players":
        return (
          <View style={styles.playersTabContent}>
            {/* Search and Filters - Sticky at top */}
            <View style={styles.filtersContainer}>
              <View style={styles.searchRow}>
                <View style={styles.searchContainer}>
                  <MeshTextInput
                    placeholder="Search players..."
                    value={searchQuery}
                    onChangeText={onSearchChange}
                    startIcon={{ name: "search" }}
                    endIcon={
                      searchQuery
                        ? { name: "clear", onPress: () => onSearchChange("") }
                        : undefined
                    }
                  />
                </View>
              </View>

              {/* Position Filters */}
              <ScrollView
                style={styles.filterChipsScroll}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipsContainer}
              >
                {availablePositionFilters.map((filterKey) => {
                  const isActive = positionFilter === filterKey;
                  const count = positionCounts[filterKey] || 0;

                  return (
                    <TouchableOpacity
                      key={filterKey}
                      style={[
                        styles.filterChip,
                        isActive && styles.filterChipActive,
                      ]}
                      onPress={() => setPositionFilter(filterKey)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isActive && styles.filterChipTextActive,
                        ]}
                      >
                        {filterKey}
                      </Text>
                      <Text
                        style={[
                          styles.filterChipCount,
                          isActive && styles.filterChipCountActive,
                        ]}
                      >
                        {count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={styles.playerCountRow}>
                <Text style={styles.playerCountText}>
                  {filteredPlayers.length} shown • {playerCount} available
                </Text>
              </View>
            </View>

            {/* Players List - Scrollable */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={BRAND.primary} />
                <Text style={styles.loadingText}>Loading players...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={48} color={SEMANTIC.error} />
                <Text style={styles.errorText}>Failed to load players</Text>
                <Text style={styles.errorSubtext}>Please try again</Text>
              </View>
            ) : filteredPlayers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="search-off" size={48} color={TEXT.secondary} />
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? "No players match your search"
                    : "No players available"}
                </Text>
              </View>
            ) : (
              <BottomSheetFlatList
                ref={playersListRef}
                data={filteredPlayers}
                renderItem={renderPlayerItem}
                keyExtractor={keyExtractor}
                style={styles.playersList}
                contentContainerStyle={styles.playersListContainer}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                initialNumToRender={12}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                windowSize={5}
              />
            )}
          </View>
        );

      case "votes":
        if (isLoadingVotes) {
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BRAND.primary} />
              <Text style={styles.loadingText}>Loading votes...</Text>
            </View>
          );
        }
        if (votesError) {
          return (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={48} color={SEMANTIC.error} />
              <Text style={styles.errorText}>Failed to load votes</Text>
              <Text style={styles.errorSubtext}>{votesError.message}</Text>
            </View>
          );
        }
        return (
          <BottomSheetScrollView
            style={styles.votesScrollView}
            contentContainerStyle={styles.votesContent}
            showsVerticalScrollIndicator={true}
          >
            {!canVote && (
              <View style={styles.voteNotice}>
                <MaterialIcons name="info-outline" size={16} color={TEXT.secondary} />
                <Text style={styles.voteNoticeText}>
                  Only squad members can vote. Head coach makes the pick.
                </Text>
              </View>
            )}
            {votes.length === 0 ? (
              <View style={styles.emptyTabContainer}>
                <MaterialIcons name="how-to-vote" size={48} color={TEXT.secondary} />
                <Text style={styles.emptyTabText}>No active votes yet</Text>
                <Text style={styles.emptyTabSubtext}>
                  Votes from your squad appear here for available players only.
                </Text>
              </View>
            ) : (
              <View style={styles.voteList}>
                {votes.map((voteRow) => (
                  <TouchableOpacity
                    key={`vote-${voteRow.player.playerId}`}
                    style={[
                      styles.voteCard,
                      myVotePlayerId != null &&
                        Number(myVotePlayerId) === Number(voteRow.player.playerId) &&
                        styles.voteCardMine,
                    ]}
                    onPress={() =>
                      canVote &&
                      !isVoteButtonDisabled &&
                      onVotePlayer?.(voteRow.player, String(voteRow.player.playerId))
                    }
                    disabled={!canVote || isVoteButtonDisabled}
                    activeOpacity={0.75}
                  >
                    <View style={styles.voteHeaderRow}>
                      <TouchableOpacity
                        style={styles.votePlayerMeta}
                        onPress={() => onPlayerPress?.(voteRow.player)}
                        disabled={!onPlayerPress || !Number.isFinite(Number(voteRow.player?.playerId))}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.votePlayerName}>
                          {voteRow.player.firstName} {voteRow.player.lastName}
                        </Text>
                        <Text style={styles.votePlayerDetail}>
                          {voteRow.player.position} • {voteRow.player.team}
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.voteCountPill}>
                        <Text style={styles.voteCountText}>{voteRow.voteCount} votes</Text>
                      </View>
                    </View>
                    <Text style={styles.voteVotersLabel}>Voted by</Text>
                    <Text style={styles.voteVotersText}>
                      {voteRow.voters.length > 0
                        ? voteRow.voters
                            .map((voter) =>
                              voter.isMe
                                ? "You"
                                : voter.name || voter.username || "Teammate"
                            )
                            .join(", ")
                        : "No voters"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </BottomSheetScrollView>
        );

      case "rosters":
        if (isLoadingRosters) {
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BRAND.primary} />
              <Text style={styles.loadingText}>Loading rosters...</Text>
            </View>
          );
        }
        if (rosters.length === 0) {
          return (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="groups" size={48} color={TEXT.secondary} />
              <Text style={styles.emptyText}>No rosters available yet</Text>
            </View>
          );
        }
        return (
          <BottomSheetScrollView
            style={styles.rostersScrollView}
            contentContainerStyle={styles.rostersScrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Squad Selector */}
            {rosterSquads.length > 1 && (
              <View style={styles.rosterSelectorContainer}>
                <Text style={styles.rosterSelectorLabel}>Select Squad</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rosterSelectorScroll}
                >
                  {rosterSquads.map((squad) => (
                    <TouchableOpacity
                      key={squad._id}
                      onPress={() => setSelectedRosterSquadId(squad._id)}
                      style={[
                        styles.rosterSelectorChip,
                        selectedRosterSquadId === squad._id &&
                          styles.rosterSelectorChipActive,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.rosterSelectorChipText,
                          selectedRosterSquadId === squad._id &&
                            styles.rosterSelectorChipTextActive,
                        ]}
                      >
                        {squad.name}
                      </Text>
                      <Text
                        style={[
                          styles.rosterChipCount,
                          selectedRosterSquadId === squad._id &&
                            styles.rosterChipCountActive,
                        ]}
                      >
                        {squad.roster.length}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Roster Display */}
            {selectedRoster && (
              <>
                <View style={styles.rosterHeader}>
                  <Text style={styles.rosterTitle}>{selectedRoster.name}</Text>
                  <Text style={styles.rosterPlayerCount}>
                    {selectedRoster.roster.length} players
                  </Text>
                </View>
                {selectedRoster.roster.length > 0 ? (
                  <View style={styles.rosterPlayersContainer}>
                    {selectedRoster.roster.map((player, index) => {
                      const positionColor = getPositionColor(player.position);
                      const playerImageSource = getPlayerImageSource(player);
                      return (
                        <TouchableOpacity
                          key={player._id || player.playerId || index}
                          style={styles.rosterPlayerCard}
                          onPress={() => onPlayerPress?.(player)}
                          disabled={!onPlayerPress || !Number.isFinite(Number(player?.playerId))}
                          activeOpacity={0.75}
                        >
                          {playerImageSource ? (
                            <ExpoImage
                              source={playerImageSource}
                              style={styles.rosterPlayerPhoto}
                              contentFit="cover"
                              transition={100}
                              cachePolicy="memory-disk"
                            />
                          ) : (
                            <View
                              style={[
                                styles.rosterPlayerPhotoPlaceholder,
                                { backgroundColor: positionColor },
                              ]}
                            >
                              <Text style={styles.rosterPlayerPhotoPlaceholderText}>
                                {player.firstName[0]}
                                {player.lastName[0]}
                              </Text>
                            </View>
                          )}
                          <View style={styles.rosterPlayerInfo}>
                            <Text style={styles.rosterPlayerName}>
                              {player.firstName} {player.lastName}
                            </Text>
                            <View style={styles.rosterPlayerMeta}>
                              <View
                                style={[
                                  styles.rosterPositionBadge,
                                  { backgroundColor: positionColor },
                                ]}
                              >
                                <Text style={styles.rosterPositionText}>
                                  {player.position}
                                </Text>
                              </View>
                              <Text style={styles.rosterTeamText}>
                                {player.team}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.rosterPickInfo}>
                            <Text style={styles.rosterPickNumber}>
                              #{player.pickNumber ?? index + 1}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No players drafted yet</Text>
                  </View>
                )}
              </>
            )}
          </BottomSheetScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={false}
      enableOverDrag={false}
      enableDynamicSizing={false}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      android_keyboardInputMode="adjustResize"
    >
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { key: "players", label: "PLAYERS", icon: "person" },
          { key: "votes", label: "VOTES", icon: "how-to-vote" },
          { key: "rosters", label: "ROSTERS", icon: "groups" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as TabType)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? BRAND.primary : TEXT.secondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {renderTabContent()}
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: SURFACE.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: "#3A3D42",
    width: 40,
    height: 4,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER.medium,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  activeTab: {
    borderBottomColor: BRAND.primary,
  },
  tabText: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  playersTabContent: {
    flex: 1,
    minHeight: 0,
  },
  filtersContainer: {
    paddingTop: 12,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#FFFFFF0A",
    backgroundColor: SURFACE.background,
    zIndex: 3,
  },
  searchRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
    minHeight: 52,
    height: 52,
    justifyContent: "center",
  },
  filterChipsScroll: {
    minHeight: 42,
  },
  filterChipsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  playerCountRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  playerCountText: {
    color: TEXT.secondary,
    fontSize: 11,
    fontWeight: "500",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: SURFACE.card,
    borderWidth: 1,
    borderColor: BORDER.medium,
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  filterChipText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  filterChipCount: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "500",
  },
  filterChipCountActive: {
    color: "#FFFFFFCC",
  },
  playersListContainer: {
    paddingTop: 8,
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  playersList: {
    flex: 1,
    minHeight: 0,
  },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FFFFFF08",
    height: 72,
  },
  draftButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: BRAND.gold,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 65,
  },
  draftButtonActive: {
    backgroundColor: BRAND.gold,
  },
  voteButtonActive: {
    backgroundColor: BRAND.primary,
  },
  voteButtonSelected: {
    backgroundColor: "#2D7D46",
  },
  draftButtonDisabled: {
    backgroundColor: "#3A3D42",
  },
  draftButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  draftButtonTextDisabled: {
    color: TEXT.secondary,
  },
  rankContainer: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  rankText: {
    color: TEXT.secondary,
    fontSize: 14,
    fontWeight: "600",
  },
  playerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  playerName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  playerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  positionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  positionText: {
    fontSize: 10,
    fontWeight: "700",
  },
  teamText: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statItem: {
    alignItems: "center",
    minWidth: 40,
  },
  statLabel: {
    color: "#606368",
    fontSize: 9,
    fontWeight: "600",
    marginBottom: 2,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  playerInfoButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  queueButton: {
    padding: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    color: TEXT.secondary,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 12,
  },
  errorText: {
    color: SEMANTIC.error,
    fontSize: 16,
    fontWeight: "600",
  },
  errorSubtext: {
    color: TEXT.secondary,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    color: TEXT.secondary,
    fontSize: 14,
    textAlign: "center",
  },
  emptyTabContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTabText: {
    color: TEXT.secondary,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyTabSubtext: {
    color: "#606368",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  votesScrollView: {
    flex: 1,
  },
  votesContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 12,
    gap: 10,
  },
  voteNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FFFFFF0A",
    borderWidth: 1,
    borderColor: BORDER.medium,
  },
  voteNoticeText: {
    color: TEXT.secondary,
    fontSize: 12,
    flex: 1,
  },
  voteList: {
    gap: 10,
  },
  voteCard: {
    backgroundColor: SURFACE.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    padding: 12,
    gap: 6,
  },
  voteCardMine: {
    borderColor: BRAND.primary,
  },
  voteHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  votePlayerMeta: {
    flex: 1,
    gap: 2,
  },
  votePlayerName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  votePlayerDetail: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "500",
  },
  voteCountPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: `${BRAND.primary}33`,
  },
  voteCountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  voteVotersLabel: {
    color: TEXT.secondary,
    fontSize: 11,
    fontWeight: "600",
  },
  voteVotersText: {
    color: "#D6D9DE",
    fontSize: 12,
    lineHeight: 17,
  },
  rostersScrollView: {
    flex: 1,
  },
  rostersScrollContent: {
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  rosterSelectorContainer: {
    marginVertical: 12,
  },
  rosterSelectorLabel: {
    color: TEXT.secondary,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  rosterSelectorScroll: {
    paddingRight: 24,
  },
  rosterSelectorChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.card,
    gap: 6,
  },
  rosterSelectorChipActive: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  rosterSelectorChipText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  rosterSelectorChipTextActive: {
    color: "#FFFFFF",
  },
  rosterChipCount: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "500",
  },
  rosterChipCountActive: {
    color: "#FFFFFFCC",
  },
  rosterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 12,
  },
  rosterTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  rosterPlayerCount: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "500",
  },
  rosterPlayersContainer: {
    gap: 8,
  },
  rosterPlayerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: SURFACE.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFFFFF0A",
  },
  rosterPlayerPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SURFACE.card,
  },
  rosterPlayerPhotoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  rosterPlayerPhotoPlaceholderText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  rosterPlayerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rosterPlayerName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  rosterPlayerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rosterPositionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rosterPositionText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  rosterTeamText: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "500",
  },
  rosterPickInfo: {
    alignItems: "flex-end",
  },
  rosterPickNumber: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "600",
  },
});
