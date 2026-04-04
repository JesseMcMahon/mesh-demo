import React, { useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
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
import { useLeagueData } from "@/contexts/league-data";
import { useNotification } from "@/contexts/notification";
import { useUserProfile } from "@/contexts/user-profile";
import { useVoteWaiverClaim, useWaiverHistory, useWaiverPending } from "@/hooks/useFantasyV2";
import { getUserErrorMessage } from "@/lib/errorMessages";
import { BRAND, BORDER, SEMANTIC, SURFACE, TEXT } from "@/constants/colors";
import { backOrReplace } from "@/lib/navigation";

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

function statusLabel(status: any): string {
  const normalized = String(status || "").toLowerCase();
  if (!normalized) return "PENDING";
  return normalized.replaceAll("_", " ").toUpperCase();
}

function statusColors(status: any) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "executed" || normalized === "approved") {
    return { bg: `${SEMANTIC.success}20`, border: `${SEMANTIC.success}44`, text: SEMANTIC.success };
  }
  if (normalized === "rejected" || normalized === "expired") {
    return { bg: `${SEMANTIC.error}20`, border: `${SEMANTIC.error}44`, text: SEMANTIC.error };
  }
  return { bg: `${SEMANTIC.warning}20`, border: `${SEMANTIC.warning}44`, text: SEMANTIC.warning };
}

function claimPlayerLabel(playerId: any, lookup: Map<number, string>): string {
  const id = Number(playerId);
  if (!Number.isFinite(id)) return "Unknown Player";
  return lookup.get(id) || `#${id}`;
}

export default function WaiversScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const queryClient = useQueryClient();
  const { accessToken, user } = useUserProfile();
  const { showNotification } = useNotification();
  const { rosters, squads, userProfile } = useLeagueData();

  const userSquadId = asId((userProfile as any)?.squadId);
  const userId = asId((user as any)?.id || (user as any)?._id || (userProfile as any)?._id);

  const { data: pendingData } = useWaiverPending(id);
  const { data: historyData } = useWaiverHistory(id);
  const voteClaim = useVoteWaiverClaim();

  const pendingClaims = useMemo(() => {
    const claims = (pendingData as any)?.claims;
    return Array.isArray(claims) ? claims : [];
  }, [pendingData]);

  const historyClaims = useMemo(() => {
    const claims = (historyData as any)?.claims;
    return Array.isArray(claims) ? claims : [];
  }, [historyData]);

  const squadNameById = useMemo(() => {
    const map = new Map<string, string>();
    (squads || []).forEach((squad: any) => {
      const squadId = asId(squad?._id || squad?.id);
      if (squadId) map.set(squadId, squad?.name || "Squad");
    });
    return map;
  }, [squads]);

  const playerNameById = useMemo(() => {
    const map = new Map<number, string>();
    (rosters || []).forEach((roster: any) => {
      (roster?.players || []).forEach((player: any) => {
        const pid = Number(player?.playerId ?? player?.PlayerID);
        if (!Number.isFinite(pid) || map.has(pid)) return;
        const first = String(player?.firstName || player?.FirstName || "").trim();
        const last = String(player?.lastName || player?.LastName || "").trim();
        const full = `${first} ${last}`.trim();
        map.set(pid, full || `#${pid}`);
      });
    });
    return map;
  }, [rosters]);

  const [activeView, setActiveView] = useState<"pending" | "results">("pending");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    if (!id || !accessToken) return;
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["v2-waiver-pending", id, accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["v2-waiver-history", id, accessToken] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const onVote = async (claimId: string, vote: "approve" | "reject") => {
    try {
      await voteClaim.mutateAsync({ claimId, vote });
      showNotification(`Voted ${vote} on claim`, "success");
      await onRefresh();
    } catch (error) {
      showNotification(getUserErrorMessage(error, "Failed to vote on claim"), "error");
    }
  };

  return (
    <View style={styles.screen}>
      <TopNavigation
        title="Waiver Claims"
        showBackButton
        onBackPress={() => backOrReplace(router, `/(tabs)/league/${id}` as any)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} />}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>Waiver Queue</Text>
            <TouchableOpacity
              style={styles.playersButton}
              onPress={() => router.push(`/(tabs)/league/${id}/players`)}
            >
              <MaterialIcons name="person-search" size={14} color={TEXT.primary} />
              <Text style={styles.playersButtonText}>Players</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.heroSubtitle}>Track pending votes and completed waiver outcomes.</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{pendingClaims.length}</Text>
              <Text style={styles.heroStatLabel}>Pending</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{historyClaims.length}</Text>
              <Text style={styles.heroStatLabel}>Processed</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.segmentRow}>
          {[
            { key: "pending", label: "My Claims", icon: "pending-actions" },
            { key: "results", label: "Results", icon: "fact-check" },
          ].map((item) => {
            const active = activeView === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.segmentButton, active && styles.segmentButtonActive]}
                onPress={() => setActiveView(item.key as "pending" | "results")}
              >
                <MaterialIcons name={item.icon as any} size={14} color={active ? "#FFFFFF" : TEXT.secondary} />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeView === "pending" && (
          <View style={styles.panelCard}>
            {pendingClaims.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="pending-actions" size={24} color={TEXT.secondary} />
                <Text style={styles.emptyTitle}>No pending claims</Text>
                <Text style={styles.emptySubtitle}>New claims will appear here for review.</Text>
              </View>
            ) : (
              pendingClaims.map((claim: any) => {
                const claimId = asId(claim?._id) || "";
                const claimSquadId = asId(claim?.squadId);
                const voteSummary = claim?.voteSummary || {};
                const approveCount = Number(voteSummary?.approveCount || 0);
                const thresholdRequired = Math.max(1, Number(voteSummary?.thresholdRequired || 1));
                const progressWidth = Math.min(100, (approveCount / thresholdRequired) * 100);
                const canVoteClaim =
                  claimSquadId && userSquadId && String(claimSquadId) === String(userSquadId);
                const tone = statusColors(claim?.status);
                const currentUserVote = (claim?.votes || []).find(
                  (entry: any) => asId(entry?.userId) === userId
                );

                return (
                  <View key={claimId || `${claim.addPlayerId}-${claim.createdAt}`} style={styles.claimCard}>
                    <View style={styles.claimTopRow}>
                      <Text style={styles.claimSquadText}>
                        {squadNameById.get(String(claimSquadId)) || "Squad"}
                      </Text>
                      <View style={[styles.statusPill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                        <Text style={[styles.statusPillText, { color: tone.text }]}>
                          {statusLabel(claim?.status)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.claimSwapRow}>
                      <View style={styles.swapSide}>
                        <Text style={styles.swapLabel}>ADD</Text>
                        <Text style={styles.swapPlayer}>{claimPlayerLabel(claim.addPlayerId, playerNameById)}</Text>
                      </View>
                      <MaterialIcons name="arrow-forward" size={16} color={TEXT.tertiary} />
                      <View style={styles.swapSide}>
                        <Text style={styles.swapLabel}>DROP</Text>
                        <Text style={styles.swapPlayer}>
                          {claim.dropPlayerId
                            ? claimPlayerLabel(claim.dropPlayerId, playerNameById)
                            : "No Drop"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.claimMetaRow}>
                      <Text style={styles.claimMetaText}>Bid ${Number(claim.bidAmount || 0).toFixed(0)}</Text>
                      <Text style={styles.claimMetaText}>
                        {claim.createdAt ? new Date(claim.createdAt).toLocaleString() : "Just now"}
                      </Text>
                    </View>

                    <View style={styles.voteTrack}>
                      <View style={[styles.voteFill, { width: `${progressWidth}%` as `${number}%` }]} />
                    </View>
                    <Text style={styles.voteSummaryText}>
                      {approveCount}/{thresholdRequired} approvals required
                    </Text>

                    {canVoteClaim && (claim.status === "pending" || claim.status === "approved") ? (
                      <View style={styles.voteActions}>
                        <TouchableOpacity
                          style={[styles.voteButton, styles.approveButton]}
                          onPress={() => onVote(claimId, "approve")}
                        >
                          <Text style={styles.voteButtonText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.voteButton, styles.rejectButton]}
                          onPress={() => onVote(claimId, "reject")}
                        >
                          <Text style={styles.voteButtonText}>Reject</Text>
                        </TouchableOpacity>
                        {!!currentUserVote?.vote && (
                          <Text style={styles.myVoteText}>
                            Your vote: {String(currentUserVote.vote).toUpperCase()}
                          </Text>
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeView === "results" && (
          <View style={styles.panelCard}>
            {historyClaims.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="history" size={24} color={TEXT.secondary} />
                <Text style={styles.emptyTitle}>No processed claims yet</Text>
                <Text style={styles.emptySubtitle}>Completed claims will appear after waiver processing.</Text>
              </View>
            ) : (
              historyClaims.map((claim: any) => {
                const tone = statusColors(claim?.status);
                const claimSquadId = asId(claim?.squadId);
                return (
                  <View key={`history-${asId(claim?._id) || claim.createdAt}`} style={styles.historyCard}>
                    <View style={styles.claimTopRow}>
                      <Text style={styles.claimSquadText}>
                        {squadNameById.get(String(claimSquadId)) || "Squad"}
                      </Text>
                      <View style={[styles.statusPill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                        <Text style={[styles.statusPillText, { color: tone.text }]}>
                          {statusLabel(claim?.status)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historyText}>
                      {claimPlayerLabel(claim.addPlayerId, playerNameById)}
                      {claim.dropPlayerId
                        ? ` for ${claimPlayerLabel(claim.dropPlayerId, playerNameById)}`
                        : " added"}
                    </Text>
                    <Text style={styles.historySubText}>
                      Bid ${Number(claim.bidAmount || 0).toFixed(0)}
                      {claim.processedAt
                        ? ` • ${new Date(claim.processedAt).toLocaleString()}`
                        : claim.createdAt
                          ? ` • ${new Date(claim.createdAt).toLocaleString()}`
                          : ""}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SURFACE.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 44 },

  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.card,
    padding: 16,
    marginBottom: 12,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroTitle: { color: TEXT.primary, fontSize: 23, fontWeight: "800" },
  playersButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  playersButtonText: {
    color: TEXT.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  heroSubtitle: {
    color: TEXT.secondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  heroStats: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE.elevated,
    borderWidth: 1,
    borderColor: BORDER.medium,
    borderRadius: 12,
    paddingVertical: 10,
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatValue: { color: TEXT.primary, fontSize: 18, fontWeight: "800" },
  heroStatLabel: { color: TEXT.secondary, fontSize: 12, marginTop: 1 },
  heroDivider: { width: 1, height: 24, backgroundColor: BORDER.medium },

  segmentRow: {
    flexDirection: "row",
    backgroundColor: SURFACE.card,
    borderWidth: 1,
    borderColor: BORDER.medium,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 9,
  },
  segmentButtonActive: {
    backgroundColor: BRAND.primary,
  },
  segmentText: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  segmentTextActive: { color: "#FFFFFF" },

  panelCard: {
    backgroundColor: SURFACE.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER.medium,
    padding: 14,
    marginBottom: 12,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 30,
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
  },

  claimCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    padding: 12,
    marginBottom: 10,
  },
  claimTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  claimSquadText: {
    color: TEXT.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  claimSwapRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  swapSide: {
    flex: 1,
  },
  swapLabel: {
    color: TEXT.tertiary,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  swapPlayer: {
    color: TEXT.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  claimMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  claimMetaText: {
    color: TEXT.secondary,
    fontSize: 12,
  },
  voteTrack: {
    width: "100%",
    height: 6,
    borderRadius: 999,
    backgroundColor: `${TEXT.secondary}22`,
    overflow: "hidden",
  },
  voteFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: BRAND.primary,
  },
  voteSummaryText: {
    marginTop: 6,
    color: TEXT.secondary,
    fontSize: 12,
  },
  voteActions: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  voteButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  approveButton: {
    borderColor: `${SEMANTIC.success}55`,
    backgroundColor: `${SEMANTIC.success}18`,
  },
  rejectButton: {
    borderColor: `${SEMANTIC.error}55`,
    backgroundColor: `${SEMANTIC.error}18`,
  },
  voteButtonText: {
    color: TEXT.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  myVoteText: {
    color: TEXT.secondary,
    fontSize: 11,
  },

  historyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    padding: 12,
    marginBottom: 10,
  },
  historyText: {
    color: TEXT.primary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  historySubText: {
    color: TEXT.secondary,
    fontSize: 12,
  },
});
