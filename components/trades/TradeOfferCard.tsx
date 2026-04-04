import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { getPlayerImageUrl } from "@/lib/playerImages";
import { ACCENT, BORDER, BRAND, SEMANTIC, SURFACE, TEXT } from "@/constants/colors";
import { MeshImage } from "@/components/ui/MeshImage";
import {
  TradeProposal,
  getPartnerSquadName,
  getProgress,
  getTradeStatusLabel,
  getTradeStatusTone,
  getViewerTradeColumns,
  getVoteChipText,
} from "./tradeUtils";

interface TradeOfferCardProps {
  proposal: TradeProposal;
  mySquadId: string | null;
  squadNameById: Map<string, string>;
  playerById: Map<number, any>;
  onPress?: () => void;
  onPlayerPress?: (player: any) => void;
}

function displayPlayerName(player: any, fallbackId: number): string {
  const first = String(player?.firstName || player?.FirstName || "").trim();
  const last = String(player?.lastName || player?.LastName || "").trim();
  const name = `${first} ${last}`.trim();
  if (name) return name;
  if (player?.name) return String(player.name);
  return `#${fallbackId}`;
}

function displayPlayerMeta(player: any): string {
  const position = String(player?.position || player?.Position || "--").toUpperCase();
  const team = String(player?.team || player?.Team || "FA").toUpperCase();
  return `${position} • ${team}`;
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

function TradeAssetColumn({
  label,
  assets,
  playerById,
  onPlayerPress,
}: {
  label: string;
  assets: { playerId: number }[];
  playerById: Map<number, any>;
  onPlayerPress?: (player: any) => void;
}) {
  return (
    <View style={styles.assetColumn}>
      <Text style={styles.assetLabel}>{label}</Text>
      {assets.length === 0 ? (
        <Text style={styles.emptyAsset}>No players</Text>
      ) : (
        assets.map((asset) => {
          const playerId = Number(asset?.playerId);
          const player = playerById.get(playerId);
          return (
            <TouchableOpacity
              key={`${label}-${playerId}`}
              disabled={!player || !onPlayerPress}
              onPress={() => player && onPlayerPress?.(player)}
              style={styles.assetRow}
            >
              <AssetAvatar player={player} playerId={playerId} />
              <View style={styles.assetBody}>
                <Text style={styles.assetName} numberOfLines={1}>
                  {displayPlayerName(player, playerId)}
                </Text>
                <Text style={styles.assetMeta}>{displayPlayerMeta(player)}</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

export function TradeOfferCard({
  proposal,
  mySquadId,
  squadNameById,
  playerById,
  onPress,
  onPlayerPress,
}: TradeOfferCardProps) {
  const statusTone = getTradeStatusTone(proposal?.status);
  const statusLabel = getTradeStatusLabel(proposal?.status || "");
  const voteChip = getVoteChipText(proposal?.viewerContext?.myVote || null);
  const partnerName = getPartnerSquadName(proposal, squadNameById, mySquadId);

  const proposerSummary = proposal?.voteSummary?.proposer || {};
  const receiverSummary = proposal?.voteSummary?.receiver || {};
  const proposerProgress = getProgress(proposerSummary.approveCount, proposerSummary.thresholdRequired);
  const receiverProgress = getProgress(receiverSummary.approveCount, receiverSummary.thresholdRequired);

  const columns = getViewerTradeColumns(proposal);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.headerIdentity}>
          <View style={styles.logoCircle}>
            <MaterialIcons name="swap-horiz" size={13} color={ACCENT.gold} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.partnerName} numberOfLines={1}>{partnerName}</Text>
            {voteChip ? <Text style={styles.voteChip}>{voteChip}</Text> : null}
          </View>
        </View>

        <View style={[styles.statusPill, { backgroundColor: statusTone.bg, borderColor: statusTone.border }]}> 
          <Text style={[styles.statusText, { color: statusTone.text }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.assetsGrid}>
        <TradeAssetColumn
          label={columns.receivesLabel}
          assets={columns.receives}
          playerById={playerById}
          onPlayerPress={onPlayerPress}
        />
        <View style={styles.assetsDivider} />
        <TradeAssetColumn
          label={columns.sendsLabel}
          assets={columns.sends}
          playerById={playerById}
          onPlayerPress={onPlayerPress}
        />
      </View>

      <View style={styles.voteWrap}>
        <View style={styles.voteLineRow}>
          <Text style={styles.voteLabel}>Proposer</Text>
          <Text style={styles.voteCount}>
            {Number(proposerSummary.approveCount || 0)}/{Math.max(1, Number(proposerSummary.thresholdRequired || 1))}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(proposerProgress * 100)}%` }]} />
        </View>

        <View style={[styles.voteLineRow, { marginTop: 8 }]}>
          <Text style={styles.voteLabel}>Receiver</Text>
          <Text style={styles.voteCount}>
            {Number(receiverSummary.approveCount || 0)}/{Math.max(1, Number(receiverSummary.thresholdRequired || 1))}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(receiverProgress * 100)}%`, backgroundColor: SEMANTIC.success },
            ]}
          />
        </View>
      </View>

      {proposal?.cancellationReason === "player_committed_in_accepted_trade" ? (
        <Text style={styles.cancelledMeta}>Cancelled: player already committed in accepted trade.</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.card,
    padding: 12,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerIdentity: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  logoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${ACCENT.gold}66`,
    backgroundColor: `${ACCENT.gold}1a`,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    marginLeft: 9,
    flex: 1,
    minWidth: 0,
  },
  partnerName: {
    color: TEXT.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  voteChip: {
    color: TEXT.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  assetsGrid: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    paddingVertical: 8,
    flexDirection: "row",
  },
  assetsDivider: {
    width: 1,
    backgroundColor: BORDER.medium,
  },
  assetColumn: {
    flex: 1,
    paddingHorizontal: 10,
  },
  assetLabel: {
    color: TEXT.tertiary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  emptyAsset: {
    color: TEXT.tertiary,
    fontSize: 12,
  },
  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER.medium,
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
    marginTop: 1,
  },
  voteWrap: {
    marginTop: 9,
    borderTopWidth: 1,
    borderTopColor: BORDER.medium,
    paddingTop: 9,
  },
  voteLineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  voteLabel: {
    color: TEXT.secondary,
    fontSize: 11,
    fontWeight: "700",
  },
  voteCount: {
    color: TEXT.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  progressTrack: {
    marginTop: 4,
    height: 6,
    borderRadius: 999,
    backgroundColor: `${TEXT.tertiary}35`,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: BRAND.primary,
  },
  cancelledMeta: {
    color: TEXT.secondary,
    fontSize: 11,
    marginTop: 9,
  },
});
