import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { TopNavigation } from "@/components/TopNavigation";
import { PlayerDetailsModal } from "@/components/PlayerDetailsModal";
import { useLeagueData } from "@/contexts/league-data";
import { useNotification } from "@/contexts/notification";
import { useUserProfile } from "@/contexts/user-profile";
import { getUserErrorMessage } from "@/lib/errorMessages";
import { getPlayerImageUrl, prefetchPlayerImages } from "@/lib/playerImages";
import { useSubmitWaiverClaim, useWaiverPlayerPool } from "@/hooks/useFantasyV2";
import { BRAND, BORDER, SEMANTIC, SURFACE, TEXT } from "@/constants/colors";
import { backOrReplace } from "@/lib/navigation";
import { MeshImage } from "@/components/ui/MeshImage";
import { ScreenState } from "@/components/ui/ScreenState";

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "DST", "K"];
const PAGE_LIMIT = 80;

type ClaimMode = "waiver" | "immediate";

type DropOption = {
  playerId: number | null;
  player: any | null;
};

function asId(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (typeof value.$oid === "string") return value.$oid;
    if (typeof value._id === "string") return value._id;
    if (typeof value.id === "string") return value.id;
  }
  return null;
}

function playerName(player: any): string {
  const first = String(player?.firstName || "").trim();
  const last = String(player?.lastName || "").trim();
  const fallback = String(player?.name || "").trim();
  return `${first} ${last}`.trim() || fallback || `Player #${player?.playerId}`;
}

function getPlayerPosition(player: any): string {
  return String(player?.position || player?.fantasyPosition || "--").toUpperCase();
}

function getPlayerTeam(player: any): string {
  return String(player?.team || "FA").toUpperCase();
}

function getOpponentLabel(player: any): string {
  const opponent = String(player?.opponent || "").trim();
  const rank = Number(player?.opponentRank || 0);
  if (!opponent) return "--";
  if (Number.isFinite(rank) && rank > 0) {
    return `${opponent} (${rank})`;
  }
  return opponent;
}

function getOpponentSubLabel(player: any): string {
  const week = Number(player?.gameWeek || 0);
  if (Number.isFinite(week) && week > 0) {
    return `Week ${week}`;
  }
  return "Upcoming";
}

function acquisitionHint(reasonCode: any, mode: ClaimMode): string {
  const code = String(reasonCode || "").toUpperCase();
  if (code === "HEAD_COACH_REQUIRED" || code === "IMMEDIATE_ADD_HEAD_COACH_REQUIRED") {
    return "Immediate add is head-coach only in squad leagues.";
  }
  if (code === "IN_WAIVER_WINDOW") {
    return "Waiver window is active.";
  }
  if (code === "PLAYER_TEAM_STARTED") {
    return "Player game already started. Waiver required.";
  }
  if (code === "LOCK_SOURCE_UNAVAILABLE") {
    return "Live lock status delayed. Claims still available.";
  }
  if (mode === "immediate") {
    return "Immediate add available.";
  }
  return "Submit a waiver claim.";
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}

function mergePlayers(existing: any[], incoming: any[]): any[] {
  const map = new Map<number, any>();
  for (const row of existing) {
    const id = Number(row?.playerId);
    if (!Number.isFinite(id)) continue;
    map.set(id, row);
  }
  for (const row of incoming) {
    const id = Number(row?.playerId);
    if (!Number.isFinite(id)) continue;
    map.set(id, row);
  }
  return Array.from(map.values());
}

export default function PlayersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const queryClient = useQueryClient();
  const { accessToken } = useUserProfile();
  const { showNotification } = useNotification();
  const { rosters, userProfile } = useLeagueData();
  const submitClaim = useSubmitWaiverClaim();

  const userSquadId = asId((userProfile as any)?.squadId);
  const myRoster = useMemo(() => {
    if (!userSquadId) return null;
    return (
      rosters.find((roster: any) => asId(roster?.squadId || roster?.squad?._id) === userSquadId) ||
      null
    );
  }, [rosters, userSquadId]);

  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebouncedValue(searchInput, 250);
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [detailsPlayer, setDetailsPlayer] = useState<any | null>(null);

  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [claimPlayer, setClaimPlayer] = useState<any | null>(null);
  const [claimMode, setClaimMode] = useState<ClaimMode>("waiver");
  const [dropPlayerId, setDropPlayerId] = useState<number | null>(null);
  const [bidAmount, setBidAmount] = useState("10");
  const [submittingPlayerId, setSubmittingPlayerId] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [playerRows, setPlayerRows] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setPage(1);
    setPlayerRows([]);
    setHasMore(false);
  }, [id, searchText, positionFilter]);

  const {
    data: playerPoolData,
    isLoading,
    isFetching,
    error,
    refetch: refetchPlayerPool,
  } = useWaiverPlayerPool(id, {
    searchText: searchText.trim() || undefined,
    position: positionFilter === "ALL" ? undefined : positionFilter,
    page,
    pageLimit: PAGE_LIMIT,
    enabled: !!id,
  });

  useEffect(() => {
    const next = Array.isArray((playerPoolData as any)?.players)
      ? ((playerPoolData as any)?.players as any[])
      : [];

    setHasMore(Boolean((playerPoolData as any)?.hasMore));
    setPlayerRows((prev) => (page === 1 ? next : mergePlayers(prev, next)));
  }, [playerPoolData, page]);

  useEffect(() => {
    if (!playerRows.length) return;
    prefetchPlayerImages(playerRows, 60);
  }, [playerRows]);

  const rosterCount = Number((playerPoolData as any)?.rosterCount || myRoster?.players?.length || 0);
  const rosterMax = Number((playerPoolData as any)?.rosterMax || 16);
  const waiverWindow = (playerPoolData as any)?.waiverWindow || null;
  const waiverConfig = (playerPoolData as any)?.waiverConfig || null;
  const bidEnabled = waiverConfig?.bidEnabled === true;
  const lockErrorCode = String((playerPoolData as any)?.lockErrorCode || "");

  const onRefresh = async () => {
    if (!id || !accessToken) return;
    setRefreshing(true);
    try {
      setPage(1);
      setPlayerRows([]);
      await Promise.all([
        refetchPlayerPool(),
        queryClient.invalidateQueries({ queryKey: ["v2-waiver-pending", id, accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["v2-waiver-history", id, accessToken] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const loadNextPage = useCallback(() => {
    if (isLoading || isFetching || !hasMore) return;
    setPage((prev) => prev + 1);
  }, [hasMore, isFetching, isLoading]);

  const openClaimModal = (player: any, mode: ClaimMode) => {
    setClaimPlayer(player);
    setClaimMode(mode);
    setDropPlayerId(null);
    setBidAmount(mode === "waiver" && bidEnabled ? "10" : "0");
    setClaimModalVisible(true);
  };

  const submitClaimForPlayer = async (player: any, mode: ClaimMode, dropId?: number | null) => {
    if (!id || !player?.playerId) return;
    const targetPlayerId = Number(player.playerId);
    const bid = mode === "waiver" && bidEnabled ? Math.max(0, Number(bidAmount || 0)) : 0;
    setSubmittingPlayerId(targetPlayerId);

    try {
      await submitClaim.mutateAsync({
        leagueId: id,
        addPlayerId: targetPlayerId,
        dropPlayerId: dropId ?? undefined,
        bidAmount: bid,
        mode,
      });

      setClaimModalVisible(false);
      setClaimPlayer(null);
      setDropPlayerId(null);
      showNotification(mode === "immediate" ? "Player added." : "Waiver claim submitted.", "success");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["v2-waiver-player-pool", id], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["v2-waiver-pending", id], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["v2-waiver-history", id], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["season-rosters"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["v2-lineup-context", id], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["v2-matchup-center", id], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["v2-matchups-season", id], exact: false }),
      ]);
    } catch (err: any) {
      const code = String(err?.code || "");
      if (code === "DROP_REQUIRED_FOR_ROSTER_LIMIT") {
        openClaimModal(player, mode);
        showNotification("Select a player to drop before adding.", "error");
        return;
      }
      if (code === "IMMEDIATE_ADD_HEAD_COACH_REQUIRED" || code === "HEAD_COACH_REQUIRED") {
        openClaimModal(player, "waiver");
        showNotification("Only head coach can immediate add. Claim submitted instead.", "error");
        return;
      }
      showNotification(getUserErrorMessage(err, "Failed to process player action"), "error");
    } finally {
      setSubmittingPlayerId((current) => (current === targetPlayerId ? null : current));
    }
  };

  const onPrimaryAction = async (player: any) => {
    const mode: ClaimMode = player?.acquisitionType === "immediate" ? "immediate" : "waiver";
    const requiresDrop = rosterCount >= rosterMax;

    if (mode === "waiver" || requiresDrop) {
      openClaimModal(player, mode);
      return;
    }

    await submitClaimForPlayer(player, mode, null);
  };

  const claimNeedsDrop = rosterCount >= rosterMax;
  const canSubmitClaim = !!claimPlayer && (!claimNeedsDrop || dropPlayerId !== null);

  const dropOptions = useMemo<DropOption[]>(() => {
    const base = (myRoster?.players || []).map((player: any) => ({
      playerId: Number(player?.playerId),
      player,
    }));
    if (!claimNeedsDrop) return [{ playerId: null, player: null }, ...base];
    return base;
  }, [myRoster, claimNeedsDrop]);

  const renderPlayerItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const mode: ClaimMode = item?.acquisitionType === "immediate" ? "immediate" : "waiver";
      const currentPlayerId = Number(item?.playerId);
      const isSubmitting = submitClaim.isPending && submittingPlayerId === currentPlayerId;
      const headshot = getPlayerImageUrl(item);
      const actionTone = mode === "immediate" ? styles.actionImmediate : styles.actionWaiver;
      const actionIconColor = mode === "immediate" ? SEMANTIC.success : SEMANTIC.warning;

      return (
        <View style={[styles.playerRow, index % 2 === 1 ? styles.playerRowAlt : null]}>
          <TouchableOpacity
            style={styles.playerMainCell}
            onPress={() => setDetailsPlayer(item)}
            activeOpacity={0.85}
          >
            {headshot ? (
              <MeshImage
                source={{ uri: headshot }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarFallback}>
                <MaterialIcons name="person" size={18} color={TEXT.secondary} />
              </View>
            )}

            <View style={styles.playerInfo}>
              <Text style={styles.playerName} numberOfLines={1}>
                {playerName(item)}
              </Text>
              <Text style={styles.playerMeta} numberOfLines={1}>
                {getPlayerPosition(item)} • {getPlayerTeam(item)}
              </Text>
              <Text style={styles.playerHint} numberOfLines={1}>
                {acquisitionHint(item?.reasonCode, mode)}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.oppCell}>
            <Text style={styles.oppPrimary} numberOfLines={1}>
              {getOpponentLabel(item)}
            </Text>
            <Text style={styles.oppSecondary} numberOfLines={1}>
              {getOpponentSubLabel(item)}
            </Text>
          </View>

          <View style={styles.metricCell}>
            <Text style={styles.metricValue}>{Number(item?.projectedPoints || 0).toFixed(1)}</Text>
          </View>

          <View style={styles.metricCell}>
            <Text style={styles.metricDash}>-</Text>
          </View>

          <View style={styles.actionCell}>
            <TouchableOpacity
              style={[styles.actionCircle, actionTone]}
              onPress={() => onPrimaryAction(item)}
              disabled={submitClaim.isPending}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={actionIconColor} />
              ) : (
                <MaterialIcons
                  name={mode === "immediate" ? "check" : "add"}
                  size={20}
                  color={actionIconColor}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [onPrimaryAction, submitClaim.isPending, submittingPlayerId]
  );

  return (
    <View style={styles.screen}>
      <TopNavigation
        title="Players"
        showBackButton
        onBackPress={() => backOrReplace(router, `/(tabs)/league/${id}` as any)}
      />

      <FlatList
        data={playerRows}
        keyExtractor={(item) => `player-${String(item?.playerId)}`}
        renderItem={renderPlayerItem}
        onEndReachedThreshold={0.55}
        onEndReached={loadNextPage}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} />
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.headerTopRow}>
              <Text style={styles.headerTitle}>Player Wire</Text>
              <TouchableOpacity
                style={styles.viewWaiversButton}
                onPress={() => router.push(`/(tabs)/league/${id}/waivers`)}
              >
                <MaterialIcons name="pending-actions" size={14} color={TEXT.primary} />
                <Text style={styles.viewWaiversText}>View Waivers</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{rosterCount}/{rosterMax} rostered</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>Week {waiverWindow?.effectiveWeek || "--"}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{waiverWindow?.inWindow ? "Waiver Window" : "Immediate Adds"}</Text>
            </View>

            {lockErrorCode ? (
              <View style={styles.warningRow}>
                <MaterialIcons name="info-outline" size={14} color={SEMANTIC.warning} />
                <Text style={styles.warningText}>Live lock status is delayed. Actions default to claims for safety.</Text>
              </View>
            ) : null}

            <View style={styles.searchWrap}>
              <MaterialIcons name="search" size={18} color={TEXT.tertiary} />
              <TextInput
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder="Search available players"
                placeholderTextColor={TEXT.tertiary}
                style={styles.searchInput}
              />
              {isFetching && page === 1 ? <ActivityIndicator size="small" color={BRAND.primary} /> : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {POSITIONS.map((position) => {
                const active = position === positionFilter;
                return (
                  <TouchableOpacity
                    key={`position-${position}`}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setPositionFilter(position)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{position}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderText, styles.tableHeaderPlayer]}>
                Available Players
              </Text>
              <Text style={[styles.tableHeaderText, styles.tableHeaderOpp]}>Opp</Text>
              <Text style={[styles.tableHeaderText, styles.tableHeaderMetric]}>Proj</Text>
              <Text style={[styles.tableHeaderText, styles.tableHeaderMetric]}>Score</Text>
              <Text style={[styles.tableHeaderText, styles.tableHeaderAction]}>Vote</Text>
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <MaterialIcons name="error-outline" size={16} color={SEMANTIC.error} />
                <Text style={styles.errorText}>
                  {getUserErrorMessage(error, "Could not load players.")}
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={BRAND.primary} />
              <Text style={styles.emptyTitle}>Loading players...</Text>
            </View>
          ) : (
            <ScreenState
              icon="groups"
              title="No players returned"
              subtitle="Try clearing search/filter or pull to refresh."
              actionLabel="Clear filters"
              onAction={() => {
                setSearchInput("");
                setPositionFilter("ALL");
              }}
            />
          )
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footerLoading}>
              {isFetching ? <ActivityIndicator size="small" color={BRAND.primary} /> : null}
            </View>
          ) : playerRows.length ? (
            <View style={styles.footerEnd}>
              <Text style={styles.footerEndText}>End of player pool</Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        initialNumToRender={16}
        maxToRenderPerBatch={16}
        windowSize={7}
        removeClippedSubviews
      />

      <Modal
        visible={claimModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setClaimModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {claimNeedsDrop ? "Select Player To Drop" : claimMode === "waiver" ? "Submit Waiver Claim" : "Confirm Add"}
              </Text>
              <TouchableOpacity onPress={() => setClaimModalVisible(false)}>
                <MaterialIcons name="close" size={20} color={TEXT.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalPlayerName}>{claimPlayer ? playerName(claimPlayer) : ""}</Text>
            <Text style={styles.modalHint}>
              {claimNeedsDrop
                ? "At least one player must be dropped to complete this action."
                : claimMode === "waiver"
                  ? (bidEnabled ? "Set your bid and optional drop." : "Claim order follows waiver priority.")
                  : "This add can be processed immediately."}
            </Text>

            {claimMode === "waiver" && bidEnabled ? (
              <View style={styles.bidWrap}>
                <Text style={styles.bidLabel}>FAAB Bid</Text>
                <TextInput
                  value={bidAmount}
                  onChangeText={setBidAmount}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={TEXT.tertiary}
                  style={styles.bidInput}
                />
                <View style={styles.quickBidRow}>
                  {[1, 5, 10, 25].map((amount) => (
                    <TouchableOpacity
                      key={`quick-bid-${amount}`}
                      style={styles.quickBidChip}
                      onPress={() => setBidAmount(String(amount))}
                    >
                      <Text style={styles.quickBidText}>${amount}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            <FlatList
              data={dropOptions}
              keyExtractor={(item, idx) => `drop-${item?.playerId ?? "none"}-${idx}`}
              keyboardShouldPersistTaps="handled"
              style={styles.dropList}
              renderItem={({ item }) => {
                const isNoDrop = item?.playerId === null || item?.playerId === undefined;
                const selected = (isNoDrop && dropPlayerId === null) || Number(item?.playerId) === Number(dropPlayerId);
                const p = item?.player;
                const photo = p ? getPlayerImageUrl(p) : null;

                return (
                  <TouchableOpacity
                    style={[styles.dropRowItem, selected && styles.dropRowItemSelected]}
                    onPress={() => setDropPlayerId(isNoDrop ? null : Number(item?.playerId))}
                    disabled={isNoDrop && claimNeedsDrop}
                  >
                    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                      {selected ? <View style={styles.radioInner} /> : null}
                    </View>

                    {isNoDrop ? (
                      <View style={styles.dropInfo}>
                        <Text style={styles.dropName}>No Drop</Text>
                        <Text style={styles.dropMeta}>Keep current roster unchanged</Text>
                      </View>
                    ) : (
                      <>
                        {photo ? (
                          <MeshImage
                            source={{ uri: photo }}
                            style={styles.dropAvatar}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={styles.dropAvatarFallback}>
                            <MaterialIcons name="person" size={16} color={TEXT.secondary} />
                          </View>
                        )}
                        <View style={styles.dropInfo}>
                          <Text style={styles.dropName} numberOfLines={1}>{playerName(p)}</Text>
                          <Text style={styles.dropMeta} numberOfLines={1}>
                            {getPlayerPosition(p)} • {getPlayerTeam(p)}
                          </Text>
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.dropSeparator} />}
            />

            <TouchableOpacity
              style={[styles.submitButton, (!canSubmitClaim || submitClaim.isPending) && styles.submitButtonDisabled]}
              disabled={!canSubmitClaim || submitClaim.isPending}
              onPress={() => {
                if (!claimPlayer) return;
                void submitClaimForPlayer(claimPlayer, claimMode, dropPlayerId);
              }}
            >
              <Text style={styles.submitButtonText}>
                {submitClaim.isPending
                  ? "Submitting..."
                  : claimMode === "immediate"
                    ? "Confirm Add"
                    : "Submit Claim"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PlayerDetailsModal
        visible={!!detailsPlayer}
        onClose={() => setDetailsPlayer(null)}
        leagueId={id}
        player={
          detailsPlayer
            ? {
                playerId: Number(detailsPlayer?.playerId),
                firstName: detailsPlayer?.firstName,
                lastName: detailsPlayer?.lastName,
                name: detailsPlayer?.name,
                position: detailsPlayer?.position,
                fantasyPosition: detailsPlayer?.position,
                team: detailsPlayer?.team,
                photoUrl: getPlayerImageUrl(detailsPlayer) || undefined,
                injuryStatus: detailsPlayer?.injuryStatus || null,
              }
            : null
        }
        onAddPlayer={(playerId) => {
          const target = playerRows.find((row: any) => Number(row?.playerId) === Number(playerId));
          if (target) {
            void onPrimaryAction(target);
          }
          setDetailsPlayer(null);
        }}
        onDropPlayer={() => {
          setDetailsPlayer(null);
        }}
        onTradePlayer={() => {
          setDetailsPlayer(null);
          router.push(`/(tabs)/league/${id}/trades`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SURFACE.background },
  listContent: { paddingBottom: 40 },

  headerWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerTitle: { color: TEXT.primary, fontSize: 22, fontWeight: "800" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  metaText: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "600",
  },
  metaDot: {
    color: TEXT.tertiary,
    marginHorizontal: 6,
    fontSize: 12,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${SEMANTIC.warning}66`,
    backgroundColor: `${SEMANTIC.warning}18`,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    marginBottom: 8,
  },
  warningText: {
    color: TEXT.primary,
    fontSize: 12,
    flex: 1,
  },
  viewWaiversButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  viewWaiversText: {
    color: TEXT.primary,
    fontSize: 12,
    fontWeight: "700",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    borderRadius: 18,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: TEXT.primary,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  filterRow: {
    paddingVertical: 3,
    paddingRight: 8,
    marginBottom: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  filterChipActive: {
    borderColor: BRAND.primary,
    backgroundColor: `${BRAND.primary}24`,
  },
  filterChipText: {
    color: TEXT.secondary,
    fontSize: 13,
    fontWeight: "700",
  },
  filterChipTextActive: { color: TEXT.primary },

  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  tableHeaderText: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  tableHeaderPlayer: {
    flex: 1,
  },
  tableHeaderOpp: {
    width: 88,
    textAlign: "center",
  },
  tableHeaderMetric: {
    width: 56,
    textAlign: "center",
  },
  tableHeaderAction: {
    width: 56,
    textAlign: "center",
  },

  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${SEMANTIC.error}55`,
    backgroundColor: `${SEMANTIC.error}18`,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 7,
    marginTop: 8,
  },
  errorText: {
    color: TEXT.primary,
    fontSize: 12,
    flex: 1,
  },

  playerRow: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  playerRowAlt: {
    backgroundColor: "rgba(255,255,255,0.012)",
  },
  playerMainCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    paddingRight: 6,
  },
  separator: {
    height: 1,
    backgroundColor: BORDER.lightest,
    marginLeft: 10,
    marginRight: 10,
  },
  actionImmediate: {
    backgroundColor: `${SEMANTIC.success}22`,
    borderColor: `${SEMANTIC.success}80`,
  },
  actionWaiver: {
    backgroundColor: `${SEMANTIC.warning}22`,
    borderColor: `${SEMANTIC.warning}80`,
  },

  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.card,
    marginRight: 10,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  playerInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  playerName: {
    color: TEXT.primary,
    fontSize: 17,
    fontWeight: "800",
  },
  playerMeta: {
    color: TEXT.secondary,
    fontSize: 11,
    marginTop: 1,
  },
  playerHint: {
    color: TEXT.tertiary,
    fontSize: 10,
    marginTop: 2,
  },
  oppCell: {
    width: 88,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  oppPrimary: {
    color: TEXT.primary,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  oppSecondary: {
    color: TEXT.secondary,
    fontSize: 10,
    marginTop: 1,
    textAlign: "center",
  },
  metricCell: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    color: BRAND.primary,
    fontSize: 15,
    fontWeight: "900",
  },
  metricDash: {
    color: TEXT.secondary,
    fontSize: 14,
    fontWeight: "700",
  },
  actionCell: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 6,
  },
  emptyTitle: {
    color: TEXT.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: TEXT.secondary,
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 26,
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footerEnd: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  footerEndText: {
    color: TEXT.tertiary,
    fontSize: 11,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.62)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#07112B",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: BORDER.medium,
    borderBottomWidth: 0,
    paddingHorizontal: 14,
    paddingBottom: 18,
    maxHeight: "84%",
  },
  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    color: TEXT.primary,
    fontSize: 17,
    fontWeight: "800",
  },
  modalPlayerName: {
    color: TEXT.primary,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },
  modalHint: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },

  bidWrap: {
    marginBottom: 10,
  },
  bidLabel: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  bidInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT.primary,
  },
  quickBidRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  quickBidChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  quickBidText: {
    color: TEXT.primary,
    fontSize: 12,
    fontWeight: "700",
  },

  dropList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: "#091736",
    maxHeight: 340,
  },
  dropRowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dropRowItemSelected: {
    backgroundColor: `${BRAND.primary}1C`,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: BORDER.medium,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  radioOuterSelected: {
    borderColor: BRAND.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.primary,
  },
  dropAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: BORDER.medium,
    marginRight: 8,
  },
  dropAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: BORDER.medium,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: SURFACE.elevated,
  },
  dropInfo: {
    flex: 1,
  },
  dropName: {
    color: TEXT.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  dropMeta: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  dropSeparator: {
    height: 1,
    backgroundColor: BORDER.light,
    marginLeft: 40,
    marginRight: 10,
  },

  submitButton: {
    borderRadius: 12,
    backgroundColor: "#18d6cb",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    color: "#062231",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
});
