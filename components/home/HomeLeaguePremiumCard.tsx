import React, { memo } from "react";
import { ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { BORDER, BRAND, SEMANTIC, SURFACE, TEXT } from "@/constants/colors";
import { MeshImage } from "@/components/ui/MeshImage";

export type LeagueHomeStateKey =
  | "preseason"
  | "drafting"
  | "in_season"
  | "finalizing"
  | "season_complete"
  | "offseason_locked"
  | "ready_for_reactivation";

export interface LeagueHomeSnapshot {
  state?: {
    key?: LeagueHomeStateKey;
    label?: string;
    week?: number | null;
    draftStatus?: "not_scheduled" | "scheduled" | "in_progress" | "completed" | null;
    weekStatus?: "upcoming" | "active" | "processing" | "complete" | null;
  };
  matchup?: {
    week: number;
    status: "scheduled" | "active" | "final";
    mySquadId: string;
    mySquadName: string;
    mySquadImageUrl: string;
    opponentSquadId: string;
    opponentSquadName: string;
    opponentSquadImageUrl: string;
    myScores: { projected: number; live: number; final: number };
    opponentScores: { projected: number; live: number; final: number };
    displayScoreMode: "projected" | "live" | "final";
  } | null;
  cta?: {
    type: "join_squad" | "view_league" | null;
    label: string | null;
  };
}

export interface LeagueMembershipCardItem {
  league: any;
  squad?: { name?: string; imageUrl?: string } | null;
  homeSnapshot?: LeagueHomeSnapshot | null;
}

interface HomeLeaguePremiumCardProps {
  item: LeagueMembershipCardItem;
  cardWidth: number;
  primaryColor: string;
  onPress: () => void;
  fallbackBannerSource: ImageSourcePropType;
}

function formatScore(value: number) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return "0";
  return Math.round(parsed).toString();
}

function getStatusTone(status: "scheduled" | "active" | "final" | string) {
  if (status === "active") {
    return {
      label: "Live",
      color: SEMANTIC.warning,
      bg: "#FF6B3524",
      border: "#FF6B3552",
    };
  }
  if (status === "final") {
    return {
      label: "Final",
      color: BRAND.gold,
      bg: "#F5C51826",
      border: "#F5C51852",
    };
  }
  return {
    label: "Projected",
    color: TEXT.secondary,
    bg: SURFACE.elevated,
    border: BORDER.medium,
  };
}

function Avatar({ imageUrl, fallback, size = 32 }: { imageUrl?: string; fallback: string; size?: number }) {
  if (imageUrl) {
    return (
      <MeshImage
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: 999 }}
        contentFit="cover"
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: "#2D5F8A",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: TEXT.primary, fontWeight: "800", fontSize: 12 }}>
        {(fallback || "?").charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function formatClock(seconds?: number) {
  if (!seconds || seconds <= 0) return "Live";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export const HomeLeaguePremiumCard = memo(function HomeLeaguePremiumCard({
  item,
  cardWidth,
  primaryColor,
  onPress,
  fallbackBannerSource,
}: HomeLeaguePremiumCardProps) {
  const league = item?.league || {};
  const snapshot = item?.homeSnapshot || {};
  const stateLabel = snapshot?.state?.label || "Pre-season";
  const stateKey = snapshot?.state?.key || "preseason";
  const matchup = snapshot?.matchup || null;
  const ctaType = snapshot?.cta?.type || "view_league";
  const ctaLabel = snapshot?.cta?.label || (ctaType === "join_squad" ? "Join a Squad" : "View League");

  const leagueName = String(league?.name || "Unnamed League");
  const filledSquadCount = Number(
    league?.filledSquadCount ??
      league?.currentSquadCount ??
      league?.currentMemberCount ??
      league?.memberCount ??
      league?.activeSquadCount ??
      0
  );
  const maxSize = Number(league?.leagueSize ?? league?.maxSize ?? league?.squadCount ?? 0);
  const isDrafting = stateKey === "drafting";
  const isInSeasonLike = stateKey === "in_season" || stateKey === "finalizing";
  const isOffseason =
    stateKey === "offseason_locked" || stateKey === "ready_for_reactivation";

  const statusTone = getStatusTone(matchup?.status || "scheduled");
  const scoreMode = matchup?.displayScoreMode || "projected";
  const myScore = matchup ? matchup?.myScores?.[scoreMode] : 0;
  const opponentScore = matchup ? matchup?.opponentScores?.[scoreMode] : 0;

  const draftRound = Number(
    league?.draftState?.currentRound || league?.currentRound || league?.draft?.currentRound || 1,
  );
  const draftPick = Number(
    league?.draftState?.currentPick || league?.currentPick || league?.draft?.currentPick || 1,
  );
  const draftSize = maxSize || 12;
  const draftClock = formatClock(league?.draftState?.pickClockRemainingSec);
  const displayWeek = matchup?.week || snapshot?.state?.week || null;

  const stateBadgeLabel = isDrafting
    ? "DRAFTING NOW"
    : isInSeasonLike && displayWeek
      ? `WEEK ${displayWeek}`
      : isOffseason
        ? stateLabel.toUpperCase()
      : stateLabel.toUpperCase();

  const stateBadgeStyle = isDrafting
    ? styles.stateBadgeDraft
    : isInSeasonLike
      ? styles.stateBadgeWeek
      : isOffseason
        ? styles.stateBadgeOffseason
      : styles.stateBadgeDefault;

  const stateBadgeTextStyle = isDrafting
    ? styles.stateBadgeTextDraft
    : isInSeasonLike
      ? styles.stateBadgeTextWeek
      : isOffseason
        ? styles.stateBadgeTextOffseason
      : styles.stateBadgeTextDefault;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.card, { width: cardWidth }]}
    >
      <View style={styles.heroWrap}>
        <MeshImage
          source={league?.imageUrl ? { uri: String(league.imageUrl) } : fallbackBannerSource}
          style={styles.heroImage}
          contentFit="cover"
        />
        <LinearGradient
          colors={["rgba(7,13,20,0.24)", "rgba(9,17,28,0.92)"]}
          style={styles.heroOverlay}
        />

        <View style={styles.topBadgesRow}>
          <View style={[styles.stateBadge, stateBadgeStyle]}>
            <Text style={[styles.stateBadgeText, stateBadgeTextStyle]}>{stateBadgeLabel}</Text>
          </View>
          {isDrafting ? (
            <View style={styles.clockBadge}>
              <View style={styles.clockDot} />
              <Text style={styles.clockText}>{draftClock}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.leagueName} numberOfLines={1}>
          {leagueName}
        </Text>

        <Text style={styles.metaLine} numberOfLines={1}>
          {(item?.squad?.name || "My squad")} · {filledSquadCount}/{maxSize || "--"} squads filled
        </Text>

        {isDrafting ? (
          <View style={styles.draftModule}>
            <Text style={styles.draftMeta}>ROUND {draftRound} · YOUR PICK</Text>
            <Text style={styles.draftPickText}>Pick {draftPick} of {draftSize}</Text>
          </View>
        ) : matchup ? (
          <View style={styles.matchupModule}>
            <View style={styles.matchupHeader}>
              <Text style={styles.matchupLabel}>Week {matchup.week}</Text>
              <View style={[styles.matchupStatusChip, { backgroundColor: statusTone.bg, borderColor: statusTone.border }]}> 
                <Text style={[styles.matchupStatusText, { color: statusTone.color }]}>{statusTone.label}</Text>
              </View>
            </View>

            <View style={styles.matchupRow}>
              <View style={styles.teamBlock}>
                <Text style={styles.teamTiny} numberOfLines={1}>You</Text>
                <Text style={styles.teamScore}>{formatScore(myScore)}</Text>
              </View>
              <Text style={styles.vsText}>VS</Text>
              <View style={[styles.teamBlock, { alignItems: "flex-end" }]}> 
                <Text style={styles.teamTiny} numberOfLines={1}>{matchup.opponentSquadName}</Text>
                <Text style={styles.teamScore}>{formatScore(opponentScore)}</Text>
              </View>
            </View>
          </View>
        ) : ctaType === "join_squad" ? (
          <View style={styles.joinPromptCard}>
            <Avatar fallback="J" />
            <View style={{ flex: 1 }}>
              <Text style={styles.joinPromptTitle}>Draft complete</Text>
              <Text style={styles.joinPromptSub}>Join a squad to unlock matchup tracking.</Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.footerCtaRow, isDrafting && styles.footerCtaRowDraft]}>
          <Text style={[styles.footerCtaText, isDrafting && styles.footerCtaTextDraft]}>
            {isDrafting ? "Enter Draft" : matchup ? "View Lineup" : ctaLabel}
          </Text>
          <MaterialIcons
            name={isDrafting ? "login" : "arrow-forward"}
            size={16}
            color={isDrafting ? TEXT.primary : primaryColor}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    marginRight: 12,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: SURFACE.card,
    borderWidth: 1,
    borderColor: BORDER.default,
  },
  heroWrap: {
    height: 96,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    backgroundColor: SURFACE.elevated,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topBadgesRow: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stateBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#2E7D3226",
    borderWidth: 1,
    borderColor: "#2E7D3255",
  },
  stateBadgeDraft: {
    backgroundColor: "#FF6B3524",
    borderColor: "#FF6B3555",
  },
  stateBadgeWeek: {
    backgroundColor: "#2E7D3226",
    borderColor: "#2E7D3255",
  },
  stateBadgeDefault: {
    backgroundColor: SURFACE.elevated,
    borderColor: BORDER.medium,
  },
  stateBadgeOffseason: {
    backgroundColor: "#F5C51824",
    borderColor: "#F5C51852",
  },
  stateBadgeText: {
    color: "#A5D6A7",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.45,
  },
  stateBadgeTextDraft: {
    color: "#FFB39A",
  },
  stateBadgeTextWeek: {
    color: "#A5D6A7",
  },
  stateBadgeTextDefault: {
    color: TEXT.secondary,
  },
  stateBadgeTextOffseason: {
    color: BRAND.gold,
  },
  clockBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(0,0,0,0.45)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  clockDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: SEMANTIC.warning,
  },
  clockText: {
    color: TEXT.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  body: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  leagueName: {
    color: TEXT.primary,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  metaLine: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  draftModule: {
    borderRadius: 10,
    backgroundColor: SURFACE.elevated,
    borderWidth: 1,
    borderColor: BORDER.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  draftMeta: {
    color: TEXT.secondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  draftPickText: {
    color: TEXT.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  matchupModule: {
    borderRadius: 10,
    backgroundColor: SURFACE.elevated,
    borderWidth: 1,
    borderColor: BORDER.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  matchupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  matchupLabel: {
    color: TEXT.secondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  matchupStatusChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  matchupStatusText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  matchupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamBlock: {
    flex: 1,
  },
  teamTiny: {
    color: TEXT.secondary,
    fontSize: 11,
    marginBottom: 4,
  },
  teamScore: {
    color: TEXT.primary,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  vsText: {
    color: BRAND.primary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 14,
  },
  joinPromptCard: {
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  joinPromptTitle: {
    color: TEXT.primary,
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 1,
  },
  joinPromptSub: {
    color: TEXT.secondary,
    fontSize: 11,
  },
  footerCtaRow: {
    borderRadius: 10,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: BORDER.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerCtaRowDraft: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  footerCtaText: {
    color: BRAND.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  footerCtaTextDraft: {
    color: TEXT.primary,
  },
});
