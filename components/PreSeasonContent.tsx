import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Image,
  ImageSourcePropType,
  Share,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SquadCard } from "./SquadCard";
import { NotificationType } from "./MeshNotification";
import type { NotificationOptions } from "./MeshNotification";
import { getCommunityTypeConfig } from "@/constants/communityTypes";
import {
  BRAND,
  SURFACE,
  TEXT,
  BORDER,
  ACCENT,
  GRADIENTS,
  SEMANTIC,
} from "@/constants/colors";

const meshLogo: ImageSourcePropType = require("@/assets/images/meshLogo.png");

interface Squad {
  _id: string;
  name?: string;
  isPublic?: boolean;
  members?: any[];
  slotNumber?: number;
}

interface PreSeasonContentProps {
  // League data
  leagueName: string;
  leagueId: string;
  leagueImageUrl?: string | null;
  description?: string;
  location?: string;
  communityType?: string;
  isPublic: boolean;
  leagueSize: number;
  shareUrl: string;
  commissionerUsername?: string | null;
  leagueRules?: {
    leagueType?: string;
    leagueSize?: number;
    minSquadSize?: number;
    maxSquadSize?: number | null;
    privacy?: string;
    waiverType?: string;
    waiverVoteThresholdPct?: number;
    faabBudgetDefault?: number;
    draftType?: string;
    draftRounds?: number;
    secondsPerPick?: number;
    draftTime?: string | null;
    draftStatus?: string;
  } | null;

  // Admin & user state
  isLeagueAdmin: boolean;
  isUserInSquad: boolean;
  userId?: string;
  userSquadId?: string;

  // Squads
  squads: Squad[];
  populatedSquadsCount: number;

  // Draft settings
  draftSettings: any;

  // Callbacks
  onEditPress: () => void;
  onDraftSettingsPress: () => void;
  onDraftRoomPress: () => void;
  onCreateSquadPress: () => void;
  onSquadPress: (squad: Squad) => void;
  onJoinSquadPress?: (squad: Squad) => void;
  onLeaveSquadPress: (squadId: string) => void;
  onRefresh?: () => Promise<void>;
  showNotification: (
    message: string,
    type: NotificationType,
    options?: NotificationOptions
  ) => void;
  isViewerMember?: boolean;
  leagueStarted?: boolean;
  seasonLifecycle?: {
    key?: string;
    label?: string;
    reactivationWindowStartsAt?: string | Date | null;
    reactivationWindowTimezone?: string | null;
  } | null;
  canReactivateSeason?: boolean;
  isReactivatingSeason?: boolean;
  onReactivateSeason?: () => void | Promise<void>;
}

/**
 * Format time per pick to readable string
 */
function formatTimePerPick(seconds: number): string {
  if (!seconds || seconds === 0) return "Not set";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0 && secs > 0) return `${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m`;
  return `${secs}s`;
}

/**
 * Format draft date
 */
function formatDraftDate(dateString: string | null): { date: string; time: string } | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export const PreSeasonContent = React.memo(function PreSeasonContent({
  leagueName,
  leagueId,
  leagueImageUrl,
  description,
  location,
  communityType,
  isPublic,
  leagueSize,
  shareUrl,
  commissionerUsername,
  leagueRules,
  isLeagueAdmin,
  isUserInSquad,
  userId,
  userSquadId,
  squads,
  populatedSquadsCount,
  draftSettings,
  onEditPress,
  onDraftSettingsPress,
  onDraftRoomPress,
  onCreateSquadPress,
  onSquadPress,
  onJoinSquadPress,
  onLeaveSquadPress,
  onRefresh,
  showNotification,
  isViewerMember = true,
  leagueStarted = false,
  seasonLifecycle = null,
  canReactivateSeason = false,
  isReactivatingSeason = false,
  onReactivateSeason,
}: PreSeasonContentProps) {
  const [showAllSquads, setShowAllSquads] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [countdownNowMs, setCountdownNowMs] = useState(() => Date.now());
  const [isChecklistCollapsed, setIsChecklistCollapsed] = useState(false);
  const [hasLoadedChecklistPreference, setHasLoadedChecklistPreference] = useState(false);
  const [hasStoredChecklistPreference, setHasStoredChecklistPreference] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handleCopyLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(shareUrl);
      showNotification("Invite link copied.", "success");
    } catch {
      showNotification("Couldn't copy invite link.", "error");
    }
  }, [shareUrl, showNotification]);

  const handleShareInvite = useCallback(async () => {
    try {
      await Share.share({
        message: `Join my league on Mesh: ${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      showNotification("Couldn't open the share sheet right now.", "error");
    }
  }, [shareUrl, showNotification]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isUserMemberOfSquad = useCallback(
    (squad: Squad): boolean => {
      if (!squad.members || !Array.isArray(squad.members) || !userId) {
        return false;
      }
      return squad.members.some(
        (member: any) =>
          member._id === userId ||
          member.id === userId ||
          member.userId === userId
      );
    },
    [userId]
  );

  // Draft data
  const draftTime = draftSettings?.draftTime;
  const draftType = draftSettings?.draftType || "Snake";
  const timePerPick = draftSettings?.timePerPick || draftSettings?.secondsPerPick || 0;
  const rounds = draftSettings?.rounds || 15;
  const draftStatus = String(draftSettings?.status || "");
  const isDraftSettingsLocked =
    draftStatus === "in_progress" || draftStatus === "completed";
  const formattedDraft = formatDraftDate(draftTime);
  const countdownMs = draftTime ? new Date(draftTime).getTime() - countdownNowMs : null;
  const draftCountdownLabel =
    countdownMs !== null
      ? countdownMs <= 0
        ? "Draft room is live"
        : `Starts in ${formatCountdown(countdownMs)}`
      : null;

  // Checklist items
  const checklistItems = useMemo(() => {
    return [
      {
        id: "squad",
        label: "Join or create your squad",
        completed: isUserInSquad,
        action: !isUserInSquad ? onCreateSquadPress : undefined,
      },
      {
        id: "draft-time",
        label: "Set draft time",
        completed: !!draftTime,
        action:
          isLeagueAdmin && !draftTime && !isDraftSettingsLocked
            ? onDraftSettingsPress
            : undefined,
        adminOnly: true,
      },
      {
        id: "squads-filled",
        label: `Squads ready (${populatedSquadsCount}/${leagueSize})`,
        completed: populatedSquadsCount >= leagueSize,
      },
    ];
  }, [
    isUserInSquad,
    draftTime,
    populatedSquadsCount,
    leagueSize,
    isLeagueAdmin,
    onCreateSquadPress,
    onDraftSettingsPress,
    isDraftSettingsLocked,
  ]);

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const progressPercent = (completedCount / checklistItems.length) * 100;
  const allChecklistComplete = completedCount === checklistItems.length;
  const checklistPreferenceKey = useMemo(() => {
    if (!leagueId || !userId) return null;
    return `@mesh_preseason_checklist:${userId}:${leagueId}`;
  }, [leagueId, userId]);

  useEffect(() => {
    let active = true;
    if (!checklistPreferenceKey) {
      setHasStoredChecklistPreference(false);
      setIsChecklistCollapsed(allChecklistComplete);
      setHasLoadedChecklistPreference(true);
      return () => {
        active = false;
      };
    }

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(checklistPreferenceKey);
        if (!active) return;
        if (stored === null) {
          setHasStoredChecklistPreference(false);
          setIsChecklistCollapsed(allChecklistComplete);
        } else {
          setHasStoredChecklistPreference(true);
          setIsChecklistCollapsed(stored === "1");
        }
      } catch {
        if (!active) return;
        setHasStoredChecklistPreference(false);
        setIsChecklistCollapsed(allChecklistComplete);
      } finally {
        if (active) {
          setHasLoadedChecklistPreference(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [checklistPreferenceKey, allChecklistComplete]);

  useEffect(() => {
    if (!hasLoadedChecklistPreference || hasStoredChecklistPreference) return;
    setIsChecklistCollapsed(allChecklistComplete);
  }, [
    allChecklistComplete,
    hasLoadedChecklistPreference,
    hasStoredChecklistPreference,
  ]);

  const toggleChecklistCollapsed = useCallback(() => {
    const next = !isChecklistCollapsed;
    setIsChecklistCollapsed(next);
    if (!checklistPreferenceKey) return;
    void AsyncStorage.setItem(checklistPreferenceKey, next ? "1" : "0")
      .then(() => setHasStoredChecklistPreference(true))
      .catch(() => {});
  }, [checklistPreferenceKey, isChecklistCollapsed]);

  // Community type config
  const communityConfig = communityType ? getCommunityTypeConfig(communityType) : null;
  const commissionerLabel = String(commissionerUsername || "").trim() || "TBD";
  const leagueRulesRows = useMemo(() => {
    if (!leagueRules) return [];
    const maxSquadSizeLabel =
      leagueRules.maxSquadSize && Number(leagueRules.maxSquadSize) > 0
        ? String(leagueRules.maxSquadSize)
        : "No cap";
    const pickClockLabel = leagueRules.secondsPerPick
      ? formatTimePerPick(Number(leagueRules.secondsPerPick))
      : formatTimePerPick(timePerPick);
    return [
      {
        label: "Format",
        value: String(leagueRules.leagueType || "squad")
          .replace("_", " ")
          .replace(/^\w/, (c) => c.toUpperCase()),
      },
      {
        label: "Waivers",
        value:
          String(leagueRules.waiverType || "reverse_standings") === "faab"
            ? `FAAB ($${Number(leagueRules.faabBudgetDefault ?? 100)})`
            : "Reverse standings",
      },
      {
        label: "Roster",
        value: `${Number(leagueRules.draftRounds || rounds) || rounds} spots`,
      },
      {
        label: "Squad Size",
        value: `${Math.max(1, Number(leagueRules.minSquadSize || 1))}-${maxSquadSizeLabel}`,
      },
      {
        label: "Pick Clock",
        value: pickClockLabel,
      },
      {
        label: "Privacy",
        value: String(leagueRules.privacy || (isPublic ? "public" : "private"))
          .replace(/^\w/, (c) => c.toUpperCase()),
      },
    ];
  }, [leagueRules, rounds, timePerPick, isPublic]);

  const forceShowAllSquads = isDraftSettingsLocked;
  const displayedSquads = forceShowAllSquads || showAllSquads ? squads : squads.slice(0, 3);
  const allSquadsFilled = squads.length > 0 && squads.every((s) => s.members && s.members.length > 0);
  const lifecycleKey = String(seasonLifecycle?.key || "").trim().toLowerCase();
  const lifecycleLabel = String(seasonLifecycle?.label || "").trim();
  const isOffseasonLocked =
    lifecycleKey === "offseason_locked" || lifecycleKey === "ready_for_reactivation";
  const isReadyForReactivation = lifecycleKey === "ready_for_reactivation";
  const reactivationWindowLabel = useMemo(() => {
    if (!seasonLifecycle?.reactivationWindowStartsAt) return null;
    const parsed = new Date(seasonLifecycle.reactivationWindowStartsAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: seasonLifecycle?.reactivationWindowTimezone || "America/New_York",
    });
  }, [
    seasonLifecycle?.reactivationWindowStartsAt,
    seasonLifecycle?.reactivationWindowTimezone,
  ]);

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
      {/* Hero Header */}
      <View style={styles.heroSection}>
        {!isViewerMember && (
          <View style={styles.viewerBanner}>
            <MaterialIcons name={leagueStarted ? "timeline" : "hourglass-empty"} size={16} color={BRAND.gold} />
            <Text style={styles.viewerBannerText}>
              {leagueStarted
                ? "You're viewing as a guest. Join a squad to unlock league actions."
                : "You're viewing as a guest. Tap an open squad to join."}
            </Text>
          </View>
        )}

        <View style={styles.heroContent}>
          <View style={styles.logoContainer}>
            <Image
              source={leagueImageUrl ? { uri: leagueImageUrl } : meshLogo}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.leagueName} numberOfLines={2}>
              {leagueName}
            </Text>
            <View style={styles.metaRow}>
              {location && (
                <View style={styles.metaItem}>
                  <MaterialIcons name="location-on" size={14} color={TEXT.secondary} />
                  <Text style={styles.metaText}>{location}</Text>
                </View>
              )}
              <View style={styles.metaItem}>
                <MaterialIcons
                  name={isPublic ? "public" : "lock"}
                  size={14}
                  color={isPublic ? BRAND.gold : "#FF9800"}
                />
                <Text style={[styles.metaText, { color: isPublic ? BRAND.gold : "#FF9800" }]}>
                  {isPublic ? "Public" : "Private"}
                </Text>
              </View>
            </View>
          </View>
          {isLeagueAdmin && (
            <TouchableOpacity onPress={onEditPress} style={styles.editButton} activeOpacity={0.7}>
              <MaterialIcons name="edit" size={18} color={BRAND.primary} />
            </TouchableOpacity>
          )}
        </View>

        {description && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{populatedSquadsCount}/{leagueSize}</Text>
            <Text style={styles.statLabel}>Squads</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{draftType}</Text>
            <Text style={styles.statLabel}>Draft</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{rounds}</Text>
            <Text style={styles.statLabel}>Rounds</Text>
          </View>
          {communityConfig && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialIcons name={communityConfig.icon} size={20} color={communityConfig.color} />
                <Text style={[styles.statLabel, { marginTop: 2 }]}>{communityType}</Text>
              </View>
            </>
          )}
        </View>

        {/* Share Actions */}
        <View style={styles.shareRow}>
          <TouchableOpacity style={styles.shareButton} onPress={handleCopyLink} activeOpacity={0.7}>
            <MaterialIcons name="link" size={18} color={BRAND.primary} />
            <Text style={styles.shareButtonText}>Copy Link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} activeOpacity={0.7} onPress={handleShareInvite}>
            <MaterialIcons name="qr-code-2" size={18} color={BRAND.primary} />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        {/* Draft Countdown Card */}
        <View style={styles.draftCard}>
          <View style={styles.draftCardHeader}>
            <View style={styles.draftTitleRow}>
              <View style={styles.draftIconContainer}>
                <MaterialIcons name="event" size={22} color={BRAND.primary} />
              </View>
              <View>
                <Text style={styles.draftTitle}>Draft Day</Text>
                <Text style={styles.draftSubtitle}>
                  {formattedDraft ? `${formattedDraft.date} at ${formattedDraft.time}` : "Not scheduled yet"}
                </Text>
                {draftCountdownLabel ? (
                  <Text style={styles.draftCountdown}>{draftCountdownLabel}</Text>
                ) : null}
              </View>
            </View>
            {isLeagueAdmin && (
              <TouchableOpacity
                onPress={onDraftSettingsPress}
                activeOpacity={0.7}
                disabled={isDraftSettingsLocked}
              >
                <MaterialIcons
                  name="settings"
                  size={22}
                  color={isDraftSettingsLocked ? TEXT.quaternary : TEXT.secondary}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Draft Details */}
          <View style={styles.draftDetails}>
            <View style={styles.draftDetailItem}>
              <Text style={styles.draftDetailLabel}>Format</Text>
              <Text style={styles.draftDetailValue}>{draftType} Draft</Text>
            </View>
            <View style={styles.draftDetailItem}>
              <Text style={styles.draftDetailLabel}>Time per Pick</Text>
              <Text style={styles.draftDetailValue}>{formatTimePerPick(timePerPick)}</Text>
            </View>
            <View style={styles.draftDetailItem}>
              <Text style={styles.draftDetailLabel}>Scoring</Text>
              <Text style={styles.draftDetailValue}>PPR</Text>
            </View>
          </View>

          {/* Draft Room Button */}
          <TouchableOpacity onPress={onDraftRoomPress} activeOpacity={0.8} style={styles.draftButtonContainer}>
            <LinearGradient
              colors={[...GRADIENTS.action]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.draftButton}
            >
              <Text style={styles.draftButtonText}>Enter Draft Room</Text>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={TEXT.primary}
                style={styles.draftButtonArrow}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Commissioner + Rules */}
        <View style={styles.rulesCard}>
          <View style={styles.rulesHeader}>
            <Text style={styles.rulesTitle}>League Details</Text>
          </View>
          <View style={styles.commissionerRow}>
            <MaterialIcons name="verified-user" size={16} color={BRAND.gold} />
            <Text style={styles.commissionerLabel}>Commissioner</Text>
            <Text style={styles.commissionerValue}>@{commissionerLabel}</Text>
          </View>
          {leagueRulesRows.length > 0 ? (
            <View style={styles.rulesGrid}>
              {leagueRulesRows.map((rule) => (
                <View key={rule.label} style={styles.ruleCell}>
                  <Text style={styles.ruleLabel}>{rule.label}</Text>
                  <Text style={styles.ruleValue}>{rule.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {isOffseasonLocked ? (
          <View style={styles.lifecycleCard}>
            <View style={styles.lifecycleHeader}>
              <View style={styles.lifecycleIconWrap}>
                <MaterialIcons
                  name={isReadyForReactivation ? "autorenew" : "lock-clock"}
                  size={20}
                  color={isReadyForReactivation ? BRAND.primary : BRAND.gold}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lifecycleTitle}>
                  {lifecycleLabel || (isReadyForReactivation ? "Ready to Reactivate" : "Offseason Locked")}
                </Text>
                <Text style={styles.lifecycleSubtitle}>
                  {isReadyForReactivation
                    ? canReactivateSeason
                      ? "Start the new season when you’re ready."
                      : "Waiting on commissioner reactivation."
                    : "Competitive actions are locked until the reactivation window opens."}
                </Text>
              </View>
            </View>
            {reactivationWindowLabel ? (
              <Text style={styles.lifecycleFootnote}>
                Reactivation window: {reactivationWindowLabel} ET
              </Text>
            ) : null}

            {isReadyForReactivation && canReactivateSeason && onReactivateSeason ? (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.reactivateButton,
                  isReactivatingSeason && styles.reactivateButtonDisabled,
                ]}
                disabled={isReactivatingSeason}
                onPress={onReactivateSeason}
              >
                <MaterialIcons name="refresh" size={16} color={TEXT.primary} />
                <Text style={styles.reactivateButtonText}>
                  {isReactivatingSeason ? "Reactivating..." : "Reactivate Season"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Pre-Season Checklist */}
        <View style={styles.checklistCard}>
          <TouchableOpacity
            onPress={toggleChecklistCollapsed}
            style={styles.checklistHeader}
            activeOpacity={0.8}
          >
            <Text style={styles.checklistTitle}>Preseason Checklist</Text>
            <View style={styles.checklistHeaderRight}>
              {allChecklistComplete ? (
                <MaterialIcons name="check-circle" size={18} color={SEMANTIC.success} />
              ) : null}
              <Text style={styles.checklistProgress}>
                {completedCount}/{checklistItems.length}
              </Text>
              <MaterialIcons
                name={isChecklistCollapsed ? "expand-more" : "expand-less"}
                size={20}
                color={TEXT.secondary}
              />
            </View>
          </TouchableOpacity>

          {!isChecklistCollapsed ? (
            <>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>

              <View style={styles.checklistItems}>
                {checklistItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.checklistItem}
                    onPress={item.action}
                    disabled={!item.action}
                    activeOpacity={item.action ? 0.7 : 1}
                  >
                    <View style={[styles.checkCircle, item.completed && styles.checkCircleCompleted]}>
                      {item.completed && <MaterialIcons name="check" size={14} color={TEXT.primary} />}
                    </View>
                    <Text style={[styles.checklistLabel, item.completed && styles.checklistLabelCompleted]}>
                      {item.label}
                    </Text>
                    {item.action && (
                      <MaterialIcons name="chevron-right" size={20} color={BRAND.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.checklistCollapsedText}>
              {allChecklistComplete
                ? "All preseason tasks complete."
                : "Checklist collapsed. Tap to expand."}
            </Text>
          )}
        </View>

        {/* Squads Section */}
        <View style={styles.squadsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Squads</Text>
              <View style={styles.squadsBadge}>
                <Text style={styles.squadsBadgeText}>{populatedSquadsCount}/{leagueSize}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.inviteButton} onPress={handleCopyLink} activeOpacity={0.7}>
              <MaterialIcons name="person-add" size={16} color={TEXT.primary} />
              <Text style={styles.inviteButtonText}>Invite</Text>
            </TouchableOpacity>
          </View>

          {/* Create Squad Card (if user not in squad) */}
          {!isUserInSquad && !allSquadsFilled && (
            <TouchableOpacity style={styles.createSquadCard} onPress={onCreateSquadPress} activeOpacity={0.8}>
              <LinearGradient
                colors={[...GRADIENTS.create]}
                style={styles.createSquadGradient}
              >
                <View style={styles.createSquadIcon}>
                  <MaterialIcons name="add" size={28} color={BRAND.primary} />
                </View>
                <View style={styles.createSquadText}>
                  <Text style={styles.createSquadTitle}>Create a Squad</Text>
                  <Text style={styles.createSquadSubtitle}>Claim your spot and start building</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={BRAND.primary} />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Squad Cards */}
          {displayedSquads.map((squad, index) => {
            const hasMembers = squad.members && squad.members.length > 0;
            const isUserSquad =
              squad._id === userSquadId ||
              Boolean(userId && isUserMemberOfSquad(squad));
            const fallbackSlot = Number(squad?.slotNumber || 0) > 0 ? Number(squad.slotNumber) : index + 1;
            const emptyLabel = isDraftSettingsLocked ? `Team ${fallbackSlot}` : undefined;

            return (
              <SquadCard
                key={squad._id}
                squad={squad}
                variant={hasMembers ? "populated" : "empty"}
                emptyLabel={emptyLabel}
                isUserSquad={isUserSquad}
                isUserInSquad={isUserInSquad}
                onPress={() => onSquadPress(squad)}
                onJoinPress={
                  hasMembers && !isUserSquad && !isUserInSquad
                    ? () => onJoinSquadPress?.(squad)
                    : undefined
                }
                onLeavePress={
                  isUserSquad
                    ? () => onLeaveSquadPress(squad._id)
                    : undefined
                }
              />
            );
          })}

          {/* Empty state */}
          {squads.length === 0 && (
            <View style={styles.emptySquads}>
              <MaterialIcons name="groups" size={40} color={TEXT.quaternary} />
              <Text style={styles.emptySquadsText}>No squads yet</Text>
              <Text style={styles.emptySquadsSubtext}>Be the first to create one.</Text>
            </View>
          )}

          {/* View All Toggle */}
          {squads.length > 3 && !forceShowAllSquads && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setShowAllSquads(!showAllSquads)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>
                {showAllSquads ? "See less" : `See all squads (${squads.length})`}
              </Text>
              <MaterialIcons
                name={showAllSquads ? "expand-less" : "expand-more"}
                size={20}
                color={BRAND.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE.background,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  heroSection: {
    padding: 20,
    paddingTop: 16,
  },
  viewerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${BRAND.gold}20`,
    borderWidth: 1,
    borderColor: `${BRAND.gold}55`,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  viewerBannerText: {
    color: TEXT.light,
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: SURFACE.card,
    overflow: "hidden",
    marginRight: 14,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  heroText: {
    flex: 1,
  },
  leagueName: {
    color: TEXT.primary,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 28,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    color: TEXT.secondary,
    fontSize: 13,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ACCENT.redBg,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  description: {
    color: TEXT.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE.card,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: TEXT.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: BORDER.medium,
  },
  shareRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  shareButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT.redBgLight,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  shareButtonText: {
    color: BRAND.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  body: {
    paddingHorizontal: 20,
  },
  draftCard: {
    backgroundColor: SURFACE.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER.medium,
    padding: 18,
    marginBottom: 16,
  },
  draftCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  draftTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  draftIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: ACCENT.redBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  draftTitle: {
    color: TEXT.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  draftSubtitle: {
    color: TEXT.secondary,
    fontSize: 14,
    marginTop: 2,
  },
  draftCountdown: {
    color: BRAND.gold,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  draftDetails: {
    flexDirection: "row",
    backgroundColor: SURFACE.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  draftDetailItem: {
    flex: 1,
    alignItems: "center",
  },
  draftDetailLabel: {
    color: TEXT.tertiary,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  draftDetailValue: {
    color: TEXT.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  draftButtonContainer: {
    borderRadius: 14,
    overflow: "hidden",
  },
  draftButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  draftButtonText: {
    color: TEXT.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  draftButtonArrow: {
    marginLeft: 6,
  },
  rulesCard: {
    backgroundColor: SURFACE.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER.medium,
    padding: 18,
    marginBottom: 16,
  },
  rulesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  rulesTitle: {
    color: TEXT.primary,
    fontSize: 17,
    fontWeight: "700",
  },
  commissionerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  commissionerLabel: {
    color: TEXT.secondary,
    fontSize: 13,
    fontWeight: "600",
  },
  commissionerValue: {
    color: TEXT.primary,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: "auto",
  },
  rulesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  ruleCell: {
    width: "50%",
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  ruleLabel: {
    color: TEXT.tertiary,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ruleValue: {
    color: TEXT.primary,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 3,
  },
  lifecycleCard: {
    backgroundColor: SURFACE.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER.medium,
    padding: 16,
    marginBottom: 16,
  },
  lifecycleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  lifecycleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.nested,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  lifecycleTitle: {
    color: TEXT.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  lifecycleSubtitle: {
    color: TEXT.secondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  lifecycleFootnote: {
    color: TEXT.tertiary,
    fontSize: 12,
    marginTop: 10,
  },
  reactivateButton: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: BRAND.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  reactivateButtonDisabled: {
    opacity: 0.65,
  },
  reactivateButtonText: {
    color: TEXT.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  checklistCard: {
    backgroundColor: SURFACE.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER.medium,
    padding: 18,
    marginBottom: 16,
  },
  checklistHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  checklistHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checklistTitle: {
    color: TEXT.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  checklistProgress: {
    color: BRAND.gold,
    fontSize: 14,
    fontWeight: "700",
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: SURFACE.background,
    borderRadius: 3,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: BRAND.gold,
    borderRadius: 3,
  },
  checklistItems: {
    gap: 8,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE.nested,
    borderRadius: 10,
    padding: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: TEXT.quaternary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkCircleCompleted: {
    backgroundColor: BRAND.gold,
    borderColor: BRAND.gold,
  },
  checklistLabel: {
    color: TEXT.primary,
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  checklistLabelCompleted: {
    color: TEXT.secondary,
    textDecorationLine: "line-through",
  },
  checklistCollapsedText: {
    color: TEXT.secondary,
    fontSize: 13,
  },
  squadsSection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    color: TEXT.primary,
    fontSize: 20,
    fontWeight: "700",
  },
  squadsBadge: {
    backgroundColor: ACCENT.redBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  squadsBadgeText: {
    color: BRAND.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  inviteButtonText: {
    color: TEXT.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  createSquadCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: ACCENT.redBorder,
    borderStyle: "dashed",
    marginBottom: 10,
  },
  createSquadGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  createSquadIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ACCENT.redBgStrong,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  createSquadText: {
    flex: 1,
  },
  createSquadTitle: {
    color: BRAND.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  createSquadSubtitle: {
    color: TEXT.secondary,
    fontSize: 13,
    marginTop: 2,
  },
  emptySquads: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: SURFACE.nested,
    borderRadius: 16,
  },
  emptySquadsText: {
    color: TEXT.primary,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  emptySquadsSubtext: {
    color: TEXT.secondary,
    fontSize: 13,
    marginTop: 4,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 4,
  },
  viewAllText: {
    color: BRAND.primary,
    fontSize: 15,
    fontWeight: "600",
  },
});
