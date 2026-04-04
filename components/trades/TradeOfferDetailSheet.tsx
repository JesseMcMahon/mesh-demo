import React, { useMemo } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ACCENT, BORDER, SEMANTIC, SURFACE, TEXT } from "@/constants/colors";
import { getPlayerImageUrl } from "@/lib/playerImages";
import { MeshImage } from "@/components/ui/MeshImage";
import {
  TradeProposal,
  asId,
  getPartnerSquadName,
  getProgress,
  getRoleBanner,
  getTradeStatusLabel,
  getTradeStatusTone,
  getViewerTradeColumns,
} from "./tradeUtils";

interface TradeOfferDetailSheetProps {
  visible: boolean;
  proposal: TradeProposal | null;
  mySquadId: string | null;
  squadNameById: Map<string, string>;
  playerById: Map<number, any>;
  onClose: () => void;
  onVote: (tradeProposalId: string, vote: "approve" | "reject") => void;
  onReceiverDecision: (tradeProposalId: string, decision: "accept" | "reject") => void;
  onPlayerPress?: (player: any) => void;
  votePending?: boolean;
  receiverDecisionPending?: boolean;
}

function renderPlayerName(player: any, playerId: number): string {
  const first = String(player?.firstName || player?.FirstName || "").trim();
  const last = String(player?.lastName || player?.LastName || "").trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  if (player?.name) return String(player.name);
  return `#${playerId}`;
}

function renderPlayerMeta(player: any): string {
  const pos = String(player?.position || player?.Position || "--").toUpperCase();
  const team = String(player?.team || player?.Team || "FA").toUpperCase();
  return `${pos} • ${team}`;
}

function formatDateTime(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function AssetAvatar({ player, playerId }: { player: any; playerId: number }) {
  const imageUrl = getPlayerImageUrl(player || { playerId });
  if (imageUrl) {
    return (
      <MeshImage
        source={{ uri: imageUrl }}
        style={styles.assetAvatar}
        contentFit="cover"
      />
    );
  }

  return (
    <View style={styles.assetAvatarFallback}>
      <MaterialIcons name="person" size={12} color={TEXT.secondary} />
    </View>
  );
}

function AssetList({
  title,
  assets,
  playerById,
  onPlayerPress,
}: {
  title: string;
  assets: { playerId: number }[];
  playerById: Map<number, any>;
  onPlayerPress?: (player: any) => void;
}) {
  return (
    <View style={styles.assetSection}>
      <Text style={styles.assetLabel}>{title}</Text>
      {assets.length === 0 ? (
        <Text style={styles.assetEmpty}>No players</Text>
      ) : (
        assets.map((asset) => {
          const playerId = Number(asset?.playerId);
          const player = playerById.get(playerId);
          return (
            <TouchableOpacity
              key={`${title}-${playerId}`}
              style={styles.assetRow}
              disabled={!player || !onPlayerPress}
              onPress={() => player && onPlayerPress?.(player)}
            >
              <AssetAvatar player={player} playerId={playerId} />
              <View style={styles.assetBody}>
                <Text style={styles.assetName}>{renderPlayerName(player, playerId)}</Text>
                <Text style={styles.assetMeta}>{renderPlayerMeta(player)}</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

export function TradeOfferDetailSheet({
  visible,
  proposal,
  mySquadId,
  squadNameById,
  playerById,
  onClose,
  onVote,
  onReceiverDecision,
  onPlayerPress,
  votePending = false,
  receiverDecisionPending = false,
}: TradeOfferDetailSheetProps) {
  const insets = useSafeAreaInsets();

  const statusTone = useMemo(
    () => getTradeStatusTone(proposal?.status || ""),
    [proposal?.status]
  );

  if (!proposal) return null;

  const partnerName = getPartnerSquadName(proposal, squadNameById, mySquadId);
  const columns = getViewerTradeColumns(proposal);
  const roleBanner = getRoleBanner(proposal);

  const proposerSummary = proposal?.voteSummary?.proposer || {};
  const receiverSummary = proposal?.voteSummary?.receiver || {};
  const proposerProgress = getProgress(proposerSummary.approveCount, proposerSummary.thresholdRequired);
  const receiverProgress = getProgress(receiverSummary.approveCount, receiverSummary.thresholdRequired);

  const proposalId = asId(proposal?._id);
  const canVote = Boolean(proposal?.viewerContext?.canVote);
  const canReceiverDecide = Boolean(proposal?.viewerContext?.canReceiverDecide);

  const proposerDeadline = formatDateTime(proposal?.windows?.proposerVoteDeadline);
  const receiverDeadline = formatDateTime(proposal?.windows?.receiverDecisionDeadline);
  const executeAt = formatDateTime(proposal?.windows?.executeAt || null);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}> 
              <View style={styles.grabber} />
              <View style={styles.header}>
                <View style={styles.headerTextWrap}>
                  <Text style={styles.title}>Trade Offer</Text>
                  <Text style={styles.partner}>{partnerName}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusTone.bg, borderColor: statusTone.border }]}> 
                  <Text style={[styles.statusText, { color: statusTone.text }]}>
                    {getTradeStatusLabel(proposal?.status || "")}
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <MaterialIcons name="close" size={20} color={TEXT.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                {roleBanner ? (
                  <View style={styles.roleBanner}>
                    <MaterialIcons name="info-outline" size={14} color={ACCENT.gold} />
                    <Text style={styles.roleBannerText}>{roleBanner}</Text>
                  </View>
                ) : null}

                <View style={styles.assetsCard}>
                  <AssetList
                    title={columns.receivesLabel}
                    assets={columns.receives}
                    playerById={playerById}
                    onPlayerPress={onPlayerPress}
                  />
                  <View style={styles.assetsDivider} />
                  <AssetList
                    title={columns.sendsLabel}
                    assets={columns.sends}
                    playerById={playerById}
                    onPlayerPress={onPlayerPress}
                  />
                </View>

                <View style={styles.voteBlock}>
                  <View style={styles.voteLineRow}>
                    <Text style={styles.voteLabel}>Proposer votes</Text>
                    <Text style={styles.voteCount}>
                      {Number(proposerSummary.approveCount || 0)}/{Math.max(1, Number(proposerSummary.thresholdRequired || 1))}
                    </Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${Math.round(proposerProgress * 100)}%` }]} />
                  </View>

                  <View style={[styles.voteLineRow, { marginTop: 10 }]}>
                    <Text style={styles.voteLabel}>Receiver votes</Text>
                    <Text style={styles.voteCount}>
                      {Number(receiverSummary.approveCount || 0)}/{Math.max(1, Number(receiverSummary.thresholdRequired || 1))}
                    </Text>
                  </View>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        { width: `${Math.round(receiverProgress * 100)}%`, backgroundColor: SEMANTIC.success },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.deadlineBlock}>
                  {proposerDeadline ? <Text style={styles.deadlineText}>Proposer voting deadline: {proposerDeadline}</Text> : null}
                  {receiverDeadline ? <Text style={styles.deadlineText}>Receiver decision deadline: {receiverDeadline}</Text> : null}
                  {executeAt ? <Text style={styles.deadlineText}>Execution window: {executeAt}</Text> : null}
                </View>

                {proposal?.cancellationReason === "player_committed_in_accepted_trade" ? (
                  <Text style={styles.cancelReason}>Cancelled: player already committed in accepted trade.</Text>
                ) : null}
              </ScrollView>

              {canReceiverDecide ? (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.declineButton]}
                    disabled={receiverDecisionPending}
                    onPress={() => proposalId && onReceiverDecision(proposalId, "reject")}
                  >
                    <Text style={styles.actionText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    disabled={receiverDecisionPending}
                    onPress={() => proposalId && onReceiverDecision(proposalId, "accept")}
                  >
                    <Text style={styles.actionText}>{receiverDecisionPending ? "Accepting..." : "Accept"}</Text>
                  </TouchableOpacity>
                </View>
              ) : canVote ? (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectVoteButton]}
                    disabled={votePending}
                    onPress={() => proposalId && onVote(proposalId, "reject")}
                  >
                    <Text style={styles.actionText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    disabled={votePending}
                    onPress={() => proposalId && onVote(proposalId, "approve")}
                  >
                    <Text style={styles.actionText}>{votePending ? "Saving..." : "Approve"}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.48)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: SURFACE.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: BORDER.medium,
    maxHeight: "92%",
    minHeight: "58%",
  },
  grabber: {
    width: 46,
    height: 5,
    borderRadius: 3,
    backgroundColor: `${TEXT.tertiary}66`,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.medium,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: TEXT.primary,
    fontSize: 21,
    fontWeight: "800",
  },
  partner: {
    marginTop: 2,
    color: TEXT.secondary,
    fontSize: 13,
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 16,
  },
  roleBanner: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${ACCENT.gold}55`,
    backgroundColor: `${ACCENT.gold}16`,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  roleBannerText: {
    color: TEXT.primary,
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "600",
  },
  assetsCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    flexDirection: "row",
    paddingVertical: 9,
  },
  assetsDivider: {
    width: 1,
    backgroundColor: BORDER.medium,
  },
  assetSection: {
    flex: 1,
    paddingHorizontal: 10,
  },
  assetLabel: {
    color: TEXT.tertiary,
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 7,
    letterSpacing: 0.4,
  },
  assetEmpty: {
    color: TEXT.tertiary,
    fontSize: 12,
  },
  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  assetAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: SURFACE.card,
  },
  assetAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE.card,
  },
  assetBody: {
    marginLeft: 7,
    flex: 1,
    minWidth: 0,
  },
  assetName: {
    color: TEXT.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  assetMeta: {
    color: TEXT.secondary,
    fontSize: 11,
  },
  voteBlock: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    padding: 10,
  },
  voteLineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  voteLabel: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "700",
  },
  voteCount: {
    color: TEXT.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  track: {
    marginTop: 5,
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: `${TEXT.tertiary}3d`,
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: ACCENT.gold,
  },
  deadlineBlock: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
  },
  deadlineText: {
    color: TEXT.secondary,
    fontSize: 11,
    marginBottom: 4,
  },
  cancelReason: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 10,
  },
  actionsRow: {
    borderTopWidth: 1,
    borderTopColor: BORDER.medium,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderWidth: 1,
    marginHorizontal: 5,
  },
  actionText: {
    color: TEXT.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  acceptButton: {
    backgroundColor: SEMANTIC.success,
    borderColor: `${SEMANTIC.success}bb`,
  },
  approveButton: {
    backgroundColor: SEMANTIC.success,
    borderColor: `${SEMANTIC.success}bb`,
  },
  declineButton: {
    backgroundColor: `${SEMANTIC.error}20`,
    borderColor: `${SEMANTIC.error}66`,
  },
  rejectVoteButton: {
    backgroundColor: `${SEMANTIC.error}20`,
    borderColor: `${SEMANTIC.error}66`,
  },
});
