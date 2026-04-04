import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { TopNavigation } from "@/components/TopNavigation";
import { PlayerDetailsModal } from "@/components/PlayerDetailsModal";
import { useLeagueData } from "@/contexts/league-data";
import { useNotification } from "@/contexts/notification";
import { useSocket } from "@/contexts/socket";
import { useUserProfile } from "@/contexts/user-profile";
import {
  useProposeTrade,
  useReceiverTradeDecision,
  useTradeHistory,
  useTradePending,
  useVoteTradeProposal,
} from "@/hooks/useFantasyV2";
import { getPlayerImageUrl } from "@/lib/playerImages";
import { backOrReplace } from "@/lib/navigation";
import { ACCENT, BORDER, BRAND, SEMANTIC, SURFACE, TEXT } from "@/constants/colors";
import { TradeOfferCard } from "@/components/trades/TradeOfferCard";
import { TradeOfferDetailSheet } from "@/components/trades/TradeOfferDetailSheet";
import { TradeComposeSheet } from "@/components/trades/TradeComposeSheet";
import {
  TradeProposal,
  TradeViewerDirection,
  asId,
  normalizeTradeStatus,
} from "@/components/trades/tradeUtils";
import { getUserErrorMessage } from "@/lib/errorMessages";

type TradeTab = "inbox" | "sent" | "completed";

const RESERVED_STATUSES = ["proposer_voting", "receiver_pending", "receiver_voting", "accepted"];

function deriveDirection(proposal: TradeProposal, mySquadId: string | null): TradeViewerDirection {
  const explicit = proposal?.viewerContext?.direction;
  if (explicit === "inbox" || explicit === "sent" || explicit === "other") {
    return explicit;
  }
  const proposerId = asId(proposal?.proposerSquadId);
  const receiverId = asId(proposal?.receiverSquadId);
  if (mySquadId && mySquadId === receiverId) return "inbox";
  if (mySquadId && mySquadId === proposerId) return "sent";
  return "other";
}

export default function TradesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const queryClient = useQueryClient();
  const { accessToken } = useUserProfile();
  const { showNotification } = useNotification();
  const { socket, isConnected } = useSocket();
  const { squads, rosters, userProfile } = useLeagueData();

  const userSquadId = asId((userProfile as any)?.squadId);

  const { data: pendingData, isLoading: pendingLoading } = useTradePending(id);
  const { data: historyData, isLoading: historyLoading } = useTradeHistory(id);

  const proposeTrade = useProposeTrade();
  const voteTrade = useVoteTradeProposal();
  const receiverDecision = useReceiverTradeDecision();

  const [activeTab, setActiveTab] = useState<TradeTab>("inbox");
  const [refreshing, setRefreshing] = useState(false);
  const [showComposeSheet, setShowComposeSheet] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<TradeProposal | null>(null);
  const [detailsPlayer, setDetailsPlayer] = useState<any | null>(null);
  const [proposalConflict, setProposalConflict] = useState<{
    message: string;
    lockedPlayerIds: number[];
    conflictingTradeIds: string[];
  } | null>(null);

  const pendingTrades = useMemo(() => {
    const proposals = (pendingData as any)?.proposals;
    return Array.isArray(proposals) ? (proposals as TradeProposal[]) : [];
  }, [pendingData]);

  const historyTrades = useMemo(() => {
    const proposals = (historyData as any)?.proposals;
    return Array.isArray(proposals) ? (proposals as TradeProposal[]) : [];
  }, [historyData]);

  const squadNameById = useMemo(() => {
    const map = new Map<string, string>();
    (squads || []).forEach((squad: any) => {
      const squadId = asId(squad?._id || squad?.id);
      if (!squadId) return;
      map.set(squadId, String(squad?.name || `Team ${squad?.slotNumber || ""}`).trim());
    });
    return map;
  }, [squads]);

  const playerById = useMemo(() => {
    const map = new Map<number, any>();

    const addPlayer = (player: any, fallbackPlayerId?: number) => {
      const candidateId = Number(player?.playerId ?? player?.PlayerID ?? fallbackPlayerId);
      if (!Number.isFinite(candidateId)) return;
      const existing = map.get(candidateId) || {};
      map.set(candidateId, {
        ...existing,
        ...(player || {}),
        playerId: candidateId,
      });
    };

    (rosters || []).forEach((roster: any) => {
      (roster?.players || []).forEach((player: any) => {
        addPlayer(player);
      });
    });

    const mergeApiPlayerMap = (source: any) => {
      if (!source || typeof source !== "object") return;
      Object.entries(source).forEach(([rawKey, player]) => {
        const playerId = Number(rawKey);
        if (!Number.isFinite(playerId)) return;
        addPlayer(player, playerId);
      });
    };

    mergeApiPlayerMap((pendingData as any)?.playersById);
    mergeApiPlayerMap((historyData as any)?.playersById);

    [...pendingTrades, ...historyTrades].forEach((proposal) => {
      const offeredAssets = Array.isArray(proposal?.offeredAssets) ? proposal.offeredAssets : [];
      const requestedAssets = Array.isArray(proposal?.requestedAssets) ? proposal.requestedAssets : [];
      [...offeredAssets, ...requestedAssets].forEach((asset: any) => {
        if (!asset?.player) return;
        addPlayer(asset.player, Number(asset?.playerId));
      });
    });

    return map;
  }, [rosters, pendingData, historyData, pendingTrades, historyTrades]);

  const reservedPlayerIds = useMemo(() => {
    const set = new Set<number>();
    pendingTrades.forEach((proposal) => {
      const status = normalizeTradeStatus(proposal?.status || "");
      if (!RESERVED_STATUSES.includes(status)) return;
      if (deriveDirection(proposal, userSquadId) !== "sent") return;
      const offered = Array.isArray(proposal?.offeredAssets) ? proposal.offeredAssets : [];
      offered.forEach((asset) => {
        const playerId = Number(asset?.playerId);
        if (Number.isFinite(playerId)) set.add(playerId);
      });
    });
    return set;
  }, [pendingTrades, userSquadId]);

  const inboxTrades = useMemo(
    () => pendingTrades.filter((proposal) => deriveDirection(proposal, userSquadId) === "inbox"),
    [pendingTrades, userSquadId]
  );

  const sentTrades = useMemo(
    () => pendingTrades.filter((proposal) => deriveDirection(proposal, userSquadId) === "sent"),
    [pendingTrades, userSquadId]
  );

  const completedTrades = useMemo(
    () => historyTrades.filter((proposal) => deriveDirection(proposal, userSquadId) !== "other" || !userSquadId),
    [historyTrades, userSquadId]
  );

  const tabRows = useMemo(() => {
    if (activeTab === "inbox") return inboxTrades;
    if (activeTab === "sent") return sentTrades;
    return completedTrades;
  }, [activeTab, inboxTrades, sentTrades, completedTrades]);

  const invalidateTradeQueries = useCallback(async () => {
    if (!id || !accessToken) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["v2-trade-pending", id, accessToken] }),
      queryClient.invalidateQueries({ queryKey: ["v2-trade-history", id, accessToken] }),
    ]);
  }, [id, accessToken, queryClient]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await invalidateTradeQueries();
    } finally {
      setRefreshing(false);
    }
  }, [invalidateTradeQueries]);

  useEffect(() => {
    if (!socket || !id || !accessToken) return;

    socket.emit("joinLeagueV2", { leagueId: id, accessToken });

    const handleTradeUpdated = (payload: any) => {
      if (String(payload?.leagueId || "") !== String(id)) return;
      invalidateTradeQueries();
    };

    socket.on("tradeUpdated", handleTradeUpdated);

    return () => {
      socket.emit("leaveLeagueV2", { leagueId: id });
      socket.off("tradeUpdated", handleTradeUpdated);
    };
  }, [socket, id, accessToken, invalidateTradeQueries]);

  const submitTrade = async (payload: {
    leagueId: string;
    receiverSquadId: string;
    offeredAssets: { type: "player"; playerId: number; fromSquadId: string }[];
    requestedAssets: { type: "player"; playerId: number; fromSquadId: string }[];
  }) => {
    try {
      setProposalConflict(null);
      await proposeTrade.mutateAsync(payload);
      showNotification("Trade sent for voting", "success");
      setShowComposeSheet(false);
      setActiveTab("sent");
      await invalidateTradeQueries();
    } catch (error) {
      const code = (error as any)?.code;
      if (code === "TRADE_PLAYER_RESERVED") {
        const lockedPlayerIds = Array.isArray((error as any)?.lockedPlayerIds)
          ? (error as any).lockedPlayerIds.map((value: any) => Number(value)).filter((value: number) => Number.isFinite(value))
          : [];
        const conflictingTradeIds = Array.isArray((error as any)?.conflictingTradeIds)
          ? (error as any).conflictingTradeIds.map((value: any) => String(value))
          : [];
        setProposalConflict({
          message: getUserErrorMessage(
            error,
            "One or more players are already in an active trade."
          ),
          lockedPlayerIds,
          conflictingTradeIds,
        });
        return;
      }
      showNotification(getUserErrorMessage(error, "Failed to submit trade"), "error");
    }
  };

  const onVote = async (tradeProposalId: string, vote: "approve" | "reject") => {
    try {
      await voteTrade.mutateAsync({ tradeProposalId, vote });
      showNotification(vote === "approve" ? "Trade approved" : "Trade rejected", "success");
      await invalidateTradeQueries();
      setSelectedProposal(null);
    } catch (error) {
      showNotification(getUserErrorMessage(error, "Failed to vote trade"), "error");
    }
  };

  const onReceiverDecision = async (tradeProposalId: string, decision: "accept" | "reject") => {
    try {
      await receiverDecision.mutateAsync({ tradeProposalId, decision });
      showNotification(decision === "accept" ? "Trade accepted" : "Trade declined", "success");
      await invalidateTradeQueries();
      setSelectedProposal(null);
    } catch (error) {
      showNotification(getUserErrorMessage(error, "Failed receiver decision"), "error");
    }
  };

  const renderEmptyState = () => {
    if (activeTab === "inbox") {
      return (
        <View style={styles.emptyWrap}>
          <MaterialIcons name="inbox" size={22} color={TEXT.secondary} />
          <Text style={styles.emptyTitle}>No incoming offers</Text>
          <Text style={styles.emptySub}>You’ll see offers from other squads here.</Text>
          <TouchableOpacity style={styles.emptyCta} onPress={() => setShowComposeSheet(true)}>
            <Text style={styles.emptyCtaText}>Propose Trade</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (activeTab === "sent") {
      return (
        <View style={styles.emptyWrap}>
          <MaterialIcons name="outbox" size={22} color={TEXT.secondary} />
          <Text style={styles.emptyTitle}>No active sent offers</Text>
          <Text style={styles.emptySub}>Send a new proposal to start a deal.</Text>
          <TouchableOpacity style={styles.emptyCta} onPress={() => setShowComposeSheet(true)}>
            <Text style={styles.emptyCtaText}>Propose Trade</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyWrap}>
        <MaterialIcons name="history" size={22} color={TEXT.secondary} />
        <Text style={styles.emptyTitle}>No completed trade activity yet</Text>
      </View>
    );
  };

  const keyExtractor = useCallback(
    (item: TradeProposal) =>
      String(asId(item?._id) || `${item?.status}-${item?.updatedAt || item?.createdAt}`),
    []
  );

  const renderTradeItem = useCallback(
    ({ item }: { item: TradeProposal }) => (
      <TradeOfferCard
        proposal={item}
        mySquadId={userSquadId}
        squadNameById={squadNameById}
        playerById={playerById}
        onPress={() => setSelectedProposal(item)}
        onPlayerPress={(player) => setDetailsPlayer(player)}
      />
    ),
    [playerById, squadNameById, userSquadId]
  );

  return (
    <View style={styles.screen}>
      <TopNavigation
        title="Trades"
        showBackButton
        onBackPress={() => backOrReplace(router, `/(tabs)/league/${id}` as any)}
      />

      <View style={styles.body}>
        <LinearGradient
          colors={["rgba(255,255,255,0.09)", "rgba(255,255,255,0.03)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTopRow}>
            <Text style={styles.heroTitle}>Trade Center</Text>
            <View style={styles.connectionPill}>
              <View style={[styles.connectionDot, { backgroundColor: isConnected ? SEMANTIC.success : ACCENT.gold }]} />
              <Text style={styles.connectionText}>{isConnected ? "Live" : "Syncing"}</Text>
            </View>
          </View>
          <Text style={styles.heroSub}>Inbox, sent offers, and completed outcomes in one place.</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStatCell}>
              <Text style={styles.heroStatValue}>{inboxTrades.length}</Text>
              <Text style={styles.heroStatLabel}>Inbox</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatCell}>
              <Text style={styles.heroStatValue}>{sentTrades.length}</Text>
              <Text style={styles.heroStatLabel}>Sent</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatCell}>
              <Text style={styles.heroStatValue}>{completedTrades.length}</Text>
              <Text style={styles.heroStatLabel}>Completed</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.tabRow}>
          {[
            { key: "inbox", icon: "inbox", label: "Inbox" },
            { key: "sent", icon: "outbox", label: "Sent" },
            { key: "completed", icon: "history", label: "Completed" },
          ].map((tab) => {
            const isActive = activeTab === (tab.key as TradeTab);
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key as TradeTab)}
              >
                <MaterialIcons
                  name={tab.icon as any}
                  size={14}
                  color={isActive ? TEXT.primary : TEXT.secondary}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={tabRows}
          keyExtractor={keyExtractor}
          renderItem={renderTradeItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} />}
          contentContainerStyle={[styles.listContent, tabRows.length === 0 && styles.emptyListContent]}
          ListEmptyComponent={pendingLoading || historyLoading ? null : renderEmptyState}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={6}
          removeClippedSubviews
        />
      </View>

      <TouchableOpacity style={styles.fab} onPress={() => setShowComposeSheet(true)} activeOpacity={0.85}>
        <MaterialIcons name="add" size={24} color={TEXT.primary} />
        <MaterialIcons name="swap-horiz" size={16} color={TEXT.primary} style={styles.fabSwapIcon} />
      </TouchableOpacity>

      <TradeComposeSheet
        visible={showComposeSheet}
        leagueId={id || ""}
        userSquadId={userSquadId}
        squads={squads || []}
        rosters={rosters || []}
        reservedPlayerIds={reservedPlayerIds}
        proposalConflict={proposalConflict}
        clearConflict={() => setProposalConflict(null)}
        onClose={() => setShowComposeSheet(false)}
        onSubmit={submitTrade}
        isSubmitting={proposeTrade.isPending}
        onPlayerPress={(player) => setDetailsPlayer(player)}
      />

      <TradeOfferDetailSheet
        visible={!!selectedProposal}
        proposal={selectedProposal}
        mySquadId={userSquadId}
        squadNameById={squadNameById}
        playerById={playerById}
        votePending={voteTrade.isPending}
        receiverDecisionPending={receiverDecision.isPending}
        onClose={() => setSelectedProposal(null)}
        onVote={onVote}
        onReceiverDecision={onReceiverDecision}
        onPlayerPress={(player) => setDetailsPlayer(player)}
      />

      <PlayerDetailsModal
        visible={!!detailsPlayer}
        onClose={() => setDetailsPlayer(null)}
        leagueId={id}
        player={
          detailsPlayer
            ? {
                playerId: Number(detailsPlayer?.playerId ?? detailsPlayer?.PlayerID),
                firstName: detailsPlayer?.firstName || detailsPlayer?.FirstName,
                lastName: detailsPlayer?.lastName || detailsPlayer?.LastName,
                name: detailsPlayer?.name || detailsPlayer?.Name,
                position: detailsPlayer?.position || detailsPlayer?.Position,
                fantasyPosition: detailsPlayer?.fantasyPosition || detailsPlayer?.FantasyPosition,
                team: detailsPlayer?.team || detailsPlayer?.Team,
                photoUrl: getPlayerImageUrl(detailsPlayer) || undefined,
                injuryStatus: detailsPlayer?.injuryStatus || detailsPlayer?.InjuryStatus,
              }
            : null
        }
        onAddPlayer={() => {
          setDetailsPlayer(null);
          router.push(`/(tabs)/league/${id}/players`);
        }}
        onDropPlayer={() => {
          setDetailsPlayer(null);
          router.push(`/(tabs)/league/${id}/players`);
        }}
        onTradePlayer={() => {
          setDetailsPlayer(null);
          setShowComposeSheet(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SURFACE.background,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.card,
    padding: 14,
    marginBottom: 12,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroTitle: {
    color: TEXT.primary,
    fontSize: 24,
    fontWeight: "800",
  },
  heroSub: {
    color: TEXT.secondary,
    fontSize: 13,
    marginTop: 7,
  },
  connectionPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    color: TEXT.secondary,
    fontSize: 11,
    fontWeight: "700",
  },
  heroStats: {
    marginTop: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  heroStatCell: {
    flex: 1,
    alignItems: "center",
  },
  heroStatValue: {
    color: TEXT.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  heroStatLabel: {
    color: TEXT.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 26,
    backgroundColor: BORDER.medium,
  },
  tabRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.card,
    padding: 4,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  tabButton: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: BRAND.primary,
  },
  tabLabel: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  tabLabelActive: {
    color: TEXT.primary,
  },
  listContent: {
    paddingBottom: 96,
  },
  emptyListContent: {
    flex: 1,
  },
  emptyWrap: {
    marginTop: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    marginTop: 9,
    color: TEXT.primary,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySub: {
    marginTop: 5,
    color: TEXT.secondary,
    fontSize: 13,
    textAlign: "center",
  },
  emptyCta: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${BRAND.primary}aa`,
    backgroundColor: `${BRAND.primary}20`,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyCtaText: {
    color: BRAND.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  fab: {
    position: "absolute",
    right: 18,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BRAND.primary,
    borderWidth: 1,
    borderColor: `${BRAND.primary}bb`,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BRAND.primary,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  fabSwapIcon: {
    position: "absolute",
    bottom: 9,
    right: 10,
    opacity: 0.9,
  },
});
