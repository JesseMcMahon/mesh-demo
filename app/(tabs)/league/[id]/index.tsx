import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQueryClient } from "@tanstack/react-query";
import { TopNavigation } from "@/components/TopNavigation";
import { LeagueTabs } from "@/components/LeagueTabs";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { MeshTextInput } from "@/components/MeshTextInput";
import { MeshButton } from "@/components/MeshButton";
import { RosterView } from "@/components/RosterView";
import { LineupVoteModal } from "@/components/LineupVoteModal";
import { PreSeasonContent } from "@/components/PreSeasonContent";
import { LeagueHomeContent } from "@/components/LeagueHomeContent";
import { LeagueTabContent } from "@/components/LeagueTabContent";
import { MatchupCenter } from "@/components/MatchupCenter";
import { PlayerDetailsModal } from "@/components/PlayerDetailsModal";
import { VoteStatus, Position } from "@/types/roster";
import { useUserProfile } from "@/contexts/user-profile";
import { useLeagueData } from "@/contexts/league-data";
import { useNotification } from "@/contexts/notification";
import { useSocket } from "@/contexts/socket";
import { leagueApi } from "@/lib/api";
import { getUserErrorMessage } from "@/lib/errorMessages";
import { getPlayerImageUrl } from "@/lib/playerImages";
import { useLeagueDraftSettings } from "@/hooks/useLeagueData";
import { useCommunityTypes } from "@/hooks/useCommunityTypes";
import {
  useLeagueStandings,
  useMatchupCenter,
  useLineupContext,
  useSeasonMatchups,
  useSubmitLineupVote,
  useTradePending,
  useWaiverPending,
  useWeekState,
} from "@/hooks/useFantasyV2";
import { ACCENT, BRAND, SURFACE, TEXT, BORDER } from "@/constants/colors";
import { backOrReplace } from "@/lib/navigation";

type LeagueTab = "home" | "squad" | "matchups" | "roster" | "league";

function asId(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (typeof value.$oid === "string") return value.$oid;
    if (typeof value.id === "string") return value.id;
    if (typeof value._id === "string") return value._id;
    if (value._id && typeof value._id === "object" && typeof value._id.$oid === "string") {
      return value._id.$oid;
    }
  }
  return null;
}

function applyCenterDelta(prev: any, delta: any) {
  if (!prev || !delta) return prev;

  const cardMap = new Map((prev?.matchTab?.cards || []).map((card: any) => [card.matchupId, card]));
  for (const header of delta?.headerDeltas || []) {
    const existing: any = cardMap.get(header.matchupId);
    if (!existing) continue;
    cardMap.set(header.matchupId, {
      ...existing,
      status: header.status ?? existing.status,
      scores: header.scores ?? existing.scores,
      winPct: header.winPct ?? existing.winPct,
      gameSummary: header.gameSummary ?? existing.gameSummary,
    });
  }

  for (const rowDelta of delta?.rowDeltas || []) {
    const existing: any = cardMap.get(rowDelta.matchupId);
    if (!existing) continue;
    cardMap.set(rowDelta.matchupId, {
      ...existing,
      rows: Array.isArray(rowDelta.rows) ? rowDelta.rows : existing.rows,
    });
  }

  const nextCards = (prev?.matchTab?.cards || []).map((card: any) => cardMap.get(card.matchupId) || card);
  const selectedMatchupId = prev?.selectedMatchupId || nextCards[0]?.matchupId || null;
  const selectedRows =
    nextCards.find((card: any) => card.matchupId === selectedMatchupId)?.rows ||
    nextCards[0]?.rows ||
    [];

  return {
    ...prev,
    cursor: delta?.cursor || prev.cursor,
    gameContextHealth: delta?.gameContextHealth || prev.gameContextHealth,
    matchups: nextCards.map((card: any) => ({
      matchupId: card.matchupId,
      matchupNumber: card.matchupNumber,
      status: card.status,
      home: card.home,
      away: card.away,
      scores: card.scores,
      winPct: card.winPct,
    })),
    matchTab: {
      ...prev.matchTab,
      cards: nextCards,
      rows: selectedRows,
    },
  };
}

function LeagueDetailScreenContent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { accessToken, user, setLeagueAccessToken, getLeagueAccessToken } =
    useUserProfile();
  const { socket, isConnected } = useSocket();
  const {
    leagueDetails,
    userProfile,
    squads,
    rosters,
    seasonId,
    isLoading: isLoadingData,
    isError: isLeagueDataError,
    error: leagueDataError,
  } = useLeagueData();
  const { data: communityTypes } = useCommunityTypes();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  const lineupContextInvalidateInFlightRef = React.useRef(false);
  const lastLineupContextInvalidateAtRef = React.useRef(0);
  const recentLineupSubmitRef = React.useRef<{
    leagueId: string;
    squadId: string;
    week: number;
    submittedAt: number;
  } | null>(null);

  // Tab state - "home" works for both pre-season and post-draft
  const [activeTab, setActiveTab] = useState<LeagueTab>("home");

  // Fetch draft settings
  const {
    data: draftSettings,
    isLoading: isDraftSettingsLoading,
    isFetching: isDraftSettingsFetching,
  } = useLeagueDraftSettings(
    seasonId || undefined,
    id
  );
  const draftStatus = (draftSettings as any)?.status || null;
  const centerEnabled = process.env.EXPO_PUBLIC_ENABLE_MATCHUP_CENTER_V2 !== "false";
  const { data: weekStateData } = useWeekState(id);
  const { data: seasonMatchupsData } = useSeasonMatchups(id);
  const { data: standingsData } = useLeagueStandings(id);
  const { data: waiverPendingData } = useWaiverPending(id);
  const { data: tradePendingData } = useTradePending(id);
  const lineupVoteMutation = useSubmitLineupVote();

  // Check if draft is complete
  const isDraftComplete = useMemo(() => {
    if (draftStatus) {
      return draftStatus === "completed";
    }
    return (draftSettings as any)?.completedAt != null;
  }, [draftStatus, draftSettings]);
  const isDraftInProgress = draftStatus === "in_progress";

  // Check if user is League Admin
  const isLeagueAdmin = useMemo(() => {
    return (
      userProfile?.roles &&
      Array.isArray(userProfile.roles) &&
      userProfile.roles.includes("LeagueAdmin")
    );
  }, [userProfile]);
  const isLeagueMember = useMemo(() => {
    const membershipId = asId((userProfile as any)?.membershipId);
    const leagueMembershipId = asId((userProfile as any)?.leagueId);
    return Boolean(membershipId || leagueMembershipId);
  }, [userProfile]);

  // Modal states
  const [showLeaveSquadModal, setShowLeaveSquadModal] = useState(false);
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [isLeavingSquad, setIsLeavingSquad] = useState(false);
  const [showDeleteLeagueModal, setShowDeleteLeagueModal] = useState(false);
  const [isDeletingLeague, setIsDeletingLeague] = useState(false);
  const [detailsPlayer, setDetailsPlayer] = useState<any | null>(null);
  const [privatePasskey, setPrivatePasskey] = useState("");
  const [isVerifyingPrivateAccess, setIsVerifyingPrivateAccess] = useState(false);
  const tabTransition = React.useRef(new Animated.Value(1)).current;
  const leagueAccessToken = id ? getLeagueAccessToken(String(id)) : null;

  // Roster states
  const [selectedRosterSquadId, setSelectedRosterSquadId] = useState<string | null>(null);
  const [refreshingRosters, setRefreshingRosters] = useState(false);
  const [rosterWeek, setRosterWeek] = useState<number>(1);
  const [matchupsWeek, setMatchupsWeek] = useState<number>(1);

  // Vote modal state
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [isReactivatingSeason, setIsReactivatingSeason] = useState(false);
  const userSquadId = asId((userProfile as any)?.squadId);

  const weekStates = useMemo(() => {
    const states = (weekStateData as any)?.states;
    if (!Array.isArray(states)) return [];
    return [...states].sort((a, b) => Number(a.week || 0) - Number(b.week || 0));
  }, [weekStateData]);

  const currentWeek = useMemo(() => {
    if (!weekStates.length) return 1;
    const activeOrProcessing = weekStates.find(
      (state: any) => state.status === "active" || state.status === "processing"
    );
    if (activeOrProcessing?.week) return Number(activeOrProcessing.week);

    const upcoming = weekStates.find((state: any) => state.status === "upcoming");
    if (upcoming?.week) return Number(upcoming.week);

    return Number(weekStates[weekStates.length - 1]?.week || 1);
  }, [weekStates]);

  React.useEffect(() => {
    setRosterWeek(currentWeek);
  }, [currentWeek]);

  React.useEffect(() => {
    setMatchupsWeek(currentWeek);
  }, [currentWeek]);

  const {
    data: matchupCenterData,
    isLoading: isMatchupCenterLoading,
    isError: isMatchupCenterError,
    refetch: refetchMatchupCenter,
  } = useMatchupCenter(id || undefined, matchupsWeek || currentWeek, centerEnabled, "selected");

  const hasLeagueStarted = useMemo(() => {
    if (isDraftInProgress || isDraftComplete) return true;
    return weekStates.some((state: any) =>
      ["active", "processing", "completed"].includes(String(state?.status || ""))
    );
  }, [isDraftComplete, isDraftInProgress, weekStates]);

  const seasonLifecycle = useMemo(
    () => ((leagueDetails as any)?.seasonLifecycle || null),
    [leagueDetails]
  );
  const seasonLifecycleKey = String(seasonLifecycle?.key || "").trim().toLowerCase();
  const isOffseasonLocked = useMemo(
    () =>
      seasonLifecycleKey === "offseason_locked" ||
      seasonLifecycleKey === "ready_for_reactivation",
    [seasonLifecycleKey]
  );
  const canReactivateSeason = useMemo(() => {
    return isLeagueMember && isLeagueAdmin && seasonLifecycleKey === "ready_for_reactivation";
  }, [isLeagueAdmin, isLeagueMember, seasonLifecycleKey]);
  const competitiveActionsEnabled = isDraftComplete && !isOffseasonLocked;

  const lineupContextSquadId = selectedRosterSquadId || userSquadId || undefined;
  const includeVoteDetails = showVoteModal;
  const { data: lineupContextData } = useLineupContext(
    id || undefined,
    lineupContextSquadId || undefined,
    rosterWeek,
    { includeVoteDetails }
  );
  const lineupContext = lineupContextData as any;
  const voteStatus: VoteStatus = useMemo(
    () => ({
      hasVoted: !!lineupContext?.myLineup,
      lastVotedAt: lineupContext?.myLineup?.lastUpdatedAt || lineupContext?.myLineup?.updatedAt,
    }),
    [lineupContext]
  );
  const currentUserVote = useMemo(
    () =>
      Array.isArray(lineupContext?.myLineupVote)
        ? (lineupContext.myLineupVote as {
            position: Position | "FLEX";
            slotIndex: number;
            playerId: number;
          }[])
        : null,
    [lineupContext]
  );

  // Reset state when screen loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        setShowLeaveSquadModal(false);
        setShowDeleteLeagueModal(false);
        setSelectedSquadId(null);
        setActiveTab("home");
      };
    }, [])
  );

  // Set default selected roster squad when rosters load.
  // Prefer the current user's squad, then fall back to the first roster.
  React.useEffect(() => {
    if (activeTab !== "roster" || rosters.length === 0 || selectedRosterSquadId) {
      return;
    }

    const userSquadId = asId((userProfile as any)?.squadId);
    const preferredRoster = userSquadId
      ? rosters.find(
          (roster: any) =>
            asId(roster.squadId || roster.squad?._id) === userSquadId
        )
      : null;

    const fallbackRoster = preferredRoster || rosters[0];
    const nextSquadId = asId(fallbackRoster?.squadId || fallbackRoster?.squad?._id);

    if (nextSquadId) {
      setSelectedRosterSquadId(nextSquadId);
    }
  }, [activeTab, rosters, selectedRosterSquadId, userProfile]);

  // League data with fallbacks
  const league = useMemo(() => {
    return leagueDetails || {
      id: id,
      name: "League Name",
      description: "",
      leagueSize: 10,
      address: "",
      isPublic: true,
    };
  }, [leagueDetails, id]);

  // Get community type name
  const communityTypeName = useMemo(() => {
    const communityTypeId =
      typeof league.communityType === "string"
        ? league.communityType
        : league.communityType?._id || league.communityType?.id || null;

    const matched = communityTypes?.find(
      (type) => (type._id || type.id) === communityTypeId
    );
    return matched?.type || "Other";
  }, [league.communityType, communityTypes]);

  const seasonMatchups = useMemo(() => {
    const matchups = (seasonMatchupsData as any)?.matchups;
    return Array.isArray(matchups) ? matchups : [];
  }, [seasonMatchupsData]);

  const currentWeekMatchups = useMemo(
    () =>
      seasonMatchups.filter(
        (matchup: any) => Number(matchup?.week || 0) === Number(currentWeek)
      ),
    [seasonMatchups, currentWeek]
  );

  const squadsById = useMemo(() => {
    const map = new Map<string, any>();
    squads.forEach((squad: any) => {
      const id = asId(squad?._id || squad?.id);
      if (id) map.set(id, squad);
    });
    return map;
  }, [squads]);

  const myCurrentMatchup = useMemo(() => {
    if (!userSquadId) return null;
    return (
      currentWeekMatchups.find((matchup: any) => {
        const homeId = asId(matchup?.homeSquadId);
        const awayId = asId(matchup?.awaySquadId);
        return homeId === userSquadId || awayId === userSquadId;
      }) || null
    );
  }, [currentWeekMatchups, userSquadId]);

  const currentMatchupCard = useMemo(() => {
    if (!myCurrentMatchup || !userSquadId) return undefined;
    const homeId = asId(myCurrentMatchup?.homeSquadId);
    const awayId = asId(myCurrentMatchup?.awaySquadId);
    const isHome = homeId === userSquadId;
    const opponentId = isHome ? awayId : homeId;
    const opponentSquad = opponentId ? squadsById.get(opponentId) : null;

    return {
      opponentName: opponentSquad?.name || "Opponent",
      opponentPoints: Number(
        isHome
          ? myCurrentMatchup?.scores?.live?.away ??
              myCurrentMatchup?.scores?.final?.away ??
              0
          : myCurrentMatchup?.scores?.live?.home ??
              myCurrentMatchup?.scores?.final?.home ??
              0
      ),
      userPoints: Number(
        isHome
          ? myCurrentMatchup?.scores?.live?.home ??
              myCurrentMatchup?.scores?.final?.home ??
              0
          : myCurrentMatchup?.scores?.live?.away ??
              myCurrentMatchup?.scores?.final?.away ??
              0
      ),
      gameTime: myCurrentMatchup?.status === "final" ? "Final" : "Live"
    };
  }, [myCurrentMatchup, squadsById, userSquadId]);

  const standings = useMemo(() => {
    const rows = (standingsData as any)?.standings;
    return Array.isArray(rows) ? rows : [];
  }, [standingsData]);

  const myStanding = useMemo(() => {
    if (!userSquadId) return null;
    return (
      standings.find(
        (row: any) => asId(row?.squadId) === userSquadId || String(row?.squadId) === userSquadId
      ) || null
    );
  }, [standings, userSquadId]);

  const myRank = useMemo(() => {
    if (!myStanding || !standings.length) return 1;
    const idx = standings.findIndex(
      (row: any) => String(row?.squadId) === String(myStanding?.squadId)
    );
    return idx >= 0 ? idx + 1 : 1;
  }, [myStanding, standings]);

  const pendingWaiverCount = useMemo(() => {
    const claims = (waiverPendingData as any)?.claims;
    return Array.isArray(claims) ? claims.length : 0;
  }, [waiverPendingData]);

  const pendingTradeCount = useMemo(() => {
    const proposals = (tradePendingData as any)?.proposals;
    return Array.isArray(proposals) ? proposals.length : 0;
  }, [tradePendingData]);

  const recentActivity = useMemo(() => {
    const items: {
      id: string;
      type: "vote" | "trade" | "pickup" | "drop" | "win" | "loss" | "matchup" | "milestone";
      title: string;
      subtitle?: string;
      timestamp: string;
    }[] = [];

    if (pendingWaiverCount > 0) {
      items.push({
        id: "waiver-pending",
        type: "pickup",
        title: `${pendingWaiverCount} waiver ${pendingWaiverCount === 1 ? "claim" : "claims"} pending`,
        subtitle: "Review claims and squad votes",
        timestamp: "Live",
      });
    }

    if (pendingTradeCount > 0) {
      items.push({
        id: "trade-pending",
        type: "trade",
        title: `${pendingTradeCount} trade ${pendingTradeCount === 1 ? "proposal" : "proposals"} active`,
        subtitle: "Open trade center to review",
        timestamp: "Live",
      });
    }

    if (myCurrentMatchup) {
      items.push({
        id: "matchup-state",
        type: "matchup",
        title: `Week ${currentWeek} vs ${currentMatchupCard?.opponentName || "Opponent"}`,
        subtitle:
          myCurrentMatchup?.status === "final"
            ? "Final score posted"
            : "Live scoring in progress",
        timestamp: myCurrentMatchup?.status === "final" ? "Final" : "Live",
      });
    }

    const activeWeekState = weekStates.find(
      (state: any) => state.status === "active" || state.status === "processing"
    );
    if (activeWeekState?.week) {
      items.push({
        id: "week-state",
        type: "milestone",
        title: `Week ${activeWeekState.week} is live`,
        subtitle: "Lineups and scores are updating in real time",
        timestamp: "Now",
      });
    }

    return items.slice(0, 5);
  }, [pendingWaiverCount, pendingTradeCount, myCurrentMatchup, currentWeek, currentMatchupCard, weekStates]);

  // Gate initial entry render until the draft status check settles to avoid
  // Home/Pre-Season flicker on first league open.
  const showEntrySkeleton = useMemo(() => {
    const draftStatusPending =
      !draftSettings && (isDraftSettingsLoading || isDraftSettingsFetching);
    return isLoadingData || draftStatusPending;
  }, [
    draftSettings,
    isDraftSettingsFetching,
    isDraftSettingsLoading,
    isLoadingData,
  ]);

  const privateGateRequired = useMemo(() => {
    if (leagueAccessToken) return false;
    if (!isLeagueDataError) return false;
    const code = String((leagueDataError as any)?.code || "");
    return code === "PRIVATE_PASSKEY_REQUIRED";
  }, [isLeagueDataError, leagueDataError, leagueAccessToken]);

  const refreshLineupDependentQueries = useCallback(
    async (options?: { week?: number; squadId?: string | null }) => {
      if (!id || !accessToken) return;

      const targetWeek = Number(options?.week || rosterWeek || 1);
      const targetSquadId = options?.squadId || lineupContextSquadId || userSquadId || null;
      const invalidations: Promise<unknown>[] = [];
      if (targetSquadId) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: ["v2-lineup-context", id, targetSquadId, targetWeek, false, accessToken],
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: ["v2-lineup-context", id, targetSquadId, targetWeek, true, accessToken],
            exact: true,
          })
        );
      }

      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: ["v2-matchup-center", id, targetWeek, "selected", accessToken],
          exact: true,
        })
      );

      await Promise.all(invalidations);
    },
    [
      accessToken,
      currentWeek,
      id,
      lineupContextSquadId,
      queryClient,
      rosterWeek,
      userSquadId,
    ]
  );

  React.useEffect(() => {
    if (!socket || !isConnected || !id || !accessToken) return;

    socket.emit("joinLeagueV2", {
      leagueId: id,
      accessToken,
    });

    const invalidateLeagueData = () => {
      void queryClient.invalidateQueries({
        queryKey: ["v2-week-state", id, accessToken],
      });
      void queryClient.invalidateQueries({
        queryKey: ["v2-matchups-season", id, accessToken],
      });
      void queryClient.invalidateQueries({
        queryKey: ["v2-league-standings", id, accessToken],
      });
      void queryClient.invalidateQueries({
        queryKey: ["v2-waiver-pending", id, accessToken],
      });
      void queryClient.invalidateQueries({
        queryKey: ["v2-trade-pending", id, accessToken],
      });
    };

    const handleLineupVoteUpdate = (payload: any) => {
      if (String(payload?.leagueId || "") !== String(id)) return;
      const payloadWeek = Number(payload?.week || rosterWeek || 1);
      const payloadSquadId = String(payload?.squadId || "");
      const payloadUserId = String(payload?.userId || "");
      const recentSubmit = recentLineupSubmitRef.current;
      if (recentSubmit) {
        const sameLeague = String(recentSubmit.leagueId) === String(id);
        const sameSquad = String(recentSubmit.squadId) === String(payloadSquadId);
        const sameWeek = Number(recentSubmit.week) === Number(payloadWeek);
        const withinWindow = Date.now() - recentSubmit.submittedAt <= 1500;
        const isOwnEventByUser = payloadUserId && String(payloadUserId) === String(user?.id || "");
        if (withinWindow && sameLeague && sameSquad && sameWeek && (isOwnEventByUser || !payloadUserId)) {
          return;
        }
      }

      const now = Date.now();
      if (lineupContextInvalidateInFlightRef.current) return;
      if (now - lastLineupContextInvalidateAtRef.current < 400) return;
      lastLineupContextInvalidateAtRef.current = now;
      lineupContextInvalidateInFlightRef.current = true;
      void refreshLineupDependentQueries({
        week: payloadWeek,
        squadId: payloadSquadId || null,
      }).finally(() => {
        lineupContextInvalidateInFlightRef.current = false;
      });
    };

    const handleTradeUpdate = (payload: any) => {
      if (String(payload?.leagueId || "") !== String(id)) return;
      invalidateLeagueData();
    };

    const handleWaiverProcessed = (payload: any) => {
      if (String(payload?.leagueId || "") !== String(id)) return;
      invalidateLeagueData();
    };

    const handleMatchupLiveUpdate = (payload: any) => {
      if (String(payload?.leagueId || "") !== String(id)) return;
      if (activeTab !== "matchups") return;
      const payloadWeek = Number(payload?.week || matchupsWeek || currentWeek || 1);
      const centerDelta = payload?.centerDelta || payload;
      if (!centerDelta) return;

      queryClient.setQueryData(
        ["v2-matchup-center", id, payloadWeek, "selected", accessToken],
        (prev: any) => applyCenterDelta(prev, centerDelta)
      );
    };

    const handleWeekStateUpdate = (payload: any) => {
      if (String(payload?.leagueId || "") !== String(id)) return;
      invalidateLeagueData();
    };

    socket.on("lineupVoteUpdated", handleLineupVoteUpdate);
    socket.on("tradeUpdated", handleTradeUpdate);
    socket.on("waiverProcessed", handleWaiverProcessed);
    socket.on("matchupLiveUpdate", handleMatchupLiveUpdate);
    socket.on("weekStateUpdate", handleWeekStateUpdate);

    return () => {
      socket.emit("leaveLeagueV2", { leagueId: id });
      socket.off("lineupVoteUpdated", handleLineupVoteUpdate);
      socket.off("tradeUpdated", handleTradeUpdate);
      socket.off("waiverProcessed", handleWaiverProcessed);
      socket.off("matchupLiveUpdate", handleMatchupLiveUpdate);
      socket.off("weekStateUpdate", handleWeekStateUpdate);
    };
  }, [
    socket,
    isConnected,
    id,
    accessToken,
    queryClient,
    lineupContextSquadId,
    activeTab,
    userSquadId,
    user?.id,
    rosterWeek,
    matchupsWeek,
    currentWeek,
    refreshLineupDependentQueries,
  ]);

  // Squad-related computed values
  const isUserInSquad = useMemo(() => {
    return (
      (userProfile?.squadId != null && userProfile?.squadId !== "") ||
      Boolean(
        user?.id &&
          squads.some((squad: any) => isUserMemberOfSquad(squad, user.id))
      )
    );
  }, [userProfile, user, squads]);

  const populatedSquadsCount = useMemo(() => {
    return squads.filter((s: any) => s.members && s.members.length > 0).length;
  }, [squads]);

  const userSquad = useMemo(() => {
    if (!user?.id) return null;
    return squads.find((squad: any) => isUserMemberOfSquad(squad, user.id)) || null;
  }, [squads, user?.id]);

  // Helper functions
  function isUserMemberOfSquad(squad: any, userId: string): boolean {
    if (!squad.members || !Array.isArray(squad.members)) return false;
    return squad.members.some(
      (member: any) =>
        member._id === userId ||
        member.id === userId ||
        member.userId === userId
    );
  }

  // Refresh functions
  const refreshLeagueData = useCallback(async () => {
    if (!id || !accessToken) return;

    const queryKeys = [
      ["league-squads", id],
      ["league-user-profile", id, accessToken],
      ["league-details", id],
      ["my-leagues"],
      ["season-lifecycle", id, accessToken],
      ["season-history", id, accessToken],
      ["v2-week-state", id, accessToken],
      ["v2-matchups-season", id, accessToken],
      ["v2-matchup-center", id],
      ["v2-matchup-center-live", id],
      ["v2-league-standings", id, accessToken],
      ["v2-waiver-pending", id, accessToken],
      ["v2-trade-pending", id, accessToken],
    ];

    await Promise.all(
      queryKeys.map((key) =>
        queryClient.invalidateQueries({ queryKey: key, exact: false })
      )
    );

    await Promise.all([
      queryClient.refetchQueries({
        queryKey: ["league-squads", id],
        type: "active",
        exact: false,
      }),
      queryClient.refetchQueries({
        queryKey: ["league-user-profile", id, accessToken],
        type: "active",
      }),
      queryClient.refetchQueries({
        queryKey: ["league-details", id],
        type: "active",
        exact: false,
      }),
      queryClient.refetchQueries({
        queryKey: ["season-lifecycle", id, accessToken],
        type: "active",
        exact: false,
      }),
      queryClient.refetchQueries({
        queryKey: ["season-history", id, accessToken],
        type: "active",
        exact: false,
      }),
      queryClient.refetchQueries({
        queryKey: ["v2-week-state", id, accessToken],
        type: "active",
      }),
      queryClient.refetchQueries({
        queryKey: ["v2-matchups-season", id, accessToken],
        type: "active",
      }),
      queryClient.refetchQueries({
        queryKey: ["v2-matchup-center", id],
        type: "active",
      }),
      queryClient.refetchQueries({
        queryKey: ["v2-matchup-center-live", id],
        type: "active",
      }),
      queryClient.refetchQueries({
        queryKey: ["v2-league-standings", id, accessToken],
        type: "active",
      }),
      queryClient.refetchQueries({
        queryKey: ["v2-waiver-pending", id, accessToken],
        type: "active",
      }),
      queryClient.refetchQueries({
        queryKey: ["v2-trade-pending", id, accessToken],
        type: "active",
      }),
    ]);
  }, [id, accessToken, queryClient]);

  const handleRefreshRosters = useCallback(async () => {
    setRefreshingRosters(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ["season-rosters"],
          type: "active",
          exact: false,
        }),
        queryClient.refetchQueries({
          queryKey: ["season-by-league-year"],
          type: "active",
          exact: false,
        }),
      ]);
    } catch (error) {
      console.error("Failed to refresh rosters:", error);
    } finally {
      setTimeout(() => setRefreshingRosters(false), 100);
    }
  }, [queryClient]);

  // Event handlers
  const handleBack = useCallback(
    () => backOrReplace(router, "/(tabs)" as any),
    [router]
  );

  const handleVerifyPrivatePasskey = useCallback(async () => {
    if (!id || !accessToken) return;
    const passkey = String(privatePasskey || "").trim();
    if (!passkey) {
      showNotification("Enter the league passkey to continue.", "error");
      return;
    }
    setIsVerifyingPrivateAccess(true);
    try {
      const response = await leagueApi.verifyPrivatePasskey(
        { leagueId: id, passkey },
        accessToken
      );
      const payload = response?.data || response;
      const token = String(payload?.leagueAccessToken || "").trim();
      if (!token) {
        throw new Error("Private league access token was not returned.");
      }

      setLeagueAccessToken(String(id), token);
      setPrivatePasskey("");
      await queryClient.invalidateQueries({
        queryKey: ["league-details", id],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: ["league-squads", id],
        exact: false,
      });
      showNotification("League unlocked.", "success");
    } catch (error: any) {
      showNotification(
        getUserErrorMessage(error, "Could not verify passkey. Please retry."),
        "error"
      );
    } finally {
      setIsVerifyingPrivateAccess(false);
    }
  }, [
    accessToken,
    id,
    privatePasskey,
    queryClient,
    setLeagueAccessToken,
    showNotification,
  ]);

  const handleChatPress = useCallback(() => {
    // TODO: Navigate to league chat
  }, []);

  const handleLeaveSquadPress = useCallback((squadId: string) => {
    setSelectedSquadId(squadId);
    setShowLeaveSquadModal(true);
  }, []);

  const handleLeaveSquadConfirm = useCallback(async () => {
    if (!selectedSquadId || !id || !accessToken) return;

    setIsLeavingSquad(true);
    try {
      await leagueApi.leaveSquad(
        { leagueId: id, squadId: selectedSquadId },
        accessToken
      );

      // Optimistically update local caches so squad membership state flips immediately.
      queryClient.setQueryData(
        ["league-user-profile", id, accessToken],
        (prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            squadId: null,
            squad: null,
          };
        }
      );

      if (user?.id) {
        queryClient.setQueryData(
          ["league-squads", id, accessToken],
          (prev: any) => {
            if (!Array.isArray(prev)) return prev;
            return prev.map((squad: any) => {
              if (String(squad?._id) !== String(selectedSquadId)) return squad;
              const members = Array.isArray(squad?.members) ? squad.members : [];
              return {
                ...squad,
                members: members.filter((member: any) => {
                  const memberId =
                    member?.userId || member?._id || member?.id || null;
                  return String(memberId) !== String(user.id);
                }),
              };
            });
          }
        );
      }

      await queryClient.invalidateQueries({
        queryKey: ["league-user-profile", id, accessToken],
      });
      await queryClient.invalidateQueries({
        queryKey: ["league-squads", id, accessToken],
      });

      await refreshLeagueData();
      setShowLeaveSquadModal(false);
      setSelectedSquadId(null);
      showNotification("You left the squad.", "success");
    } catch (error) {
      showNotification(
        getUserErrorMessage(error, "Couldn't leave squad."),
        "error"
      );
    } finally {
      setIsLeavingSquad(false);
    }
  }, [
    selectedSquadId,
    id,
    accessToken,
    queryClient,
    user?.id,
    refreshLeagueData,
    showNotification,
  ]);

  const handleLeaveSquadCancel = useCallback(() => {
    setShowLeaveSquadModal(false);
    setSelectedSquadId(null);
  }, []);

  const handleDeleteLeaguePress = useCallback(() => {
    if (!isLeagueAdmin) {
      showNotification("Only league admins can delete this league.", "error");
      return;
    }
    setShowDeleteLeagueModal(true);
  }, [isLeagueAdmin, showNotification]);

  const handleDeleteLeagueCancel = useCallback(() => {
    setShowDeleteLeagueModal(false);
  }, []);

  const handleDeleteLeagueConfirm = useCallback(async () => {
    if (!id || !accessToken) return;

    setIsDeletingLeague(true);
    try {
      await leagueApi.deleteLeague(id, accessToken);
      await queryClient.invalidateQueries({ queryKey: ["my-leagues"] });
      showNotification("League deleted.", "success");
      setShowDeleteLeagueModal(false);
      router.replace("/(tabs)" as any);
    } catch (error) {
      showNotification(
        getUserErrorMessage(error, "Couldn't delete league."),
        "error"
      );
    } finally {
      setIsDeletingLeague(false);
    }
  }, [id, accessToken, queryClient, showNotification, router]);

  const handleOpenVoteModal = useCallback(() => setShowVoteModal(true), []);
  const handleCloseVoteModal = useCallback(() => setShowVoteModal(false), []);

  const handleReactivateSeason = useCallback(async () => {
    if (!id || !accessToken) return;
    if (!canReactivateSeason) {
      showNotification("Season reactivation is not available yet.", "error");
      return;
    }

    setIsReactivatingSeason(true);
    try {
      await leagueApi.reactivateSeason(id, accessToken);
      await refreshLeagueData();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["league-draft-settings"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["season-by-league-year"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["season-rosters"], exact: false }),
      ]);
      setActiveTab("home");
      showNotification("Season reactivated. New preseason is ready.", "success");
    } catch (error) {
      showNotification(
        getUserErrorMessage(error, "Couldn't reactivate season."),
        "error"
      );
    } finally {
      setIsReactivatingSeason(false);
    }
  }, [
    accessToken,
    canReactivateSeason,
    id,
    queryClient,
    refreshLeagueData,
    showNotification,
  ]);

  const handleSubmitVote = useCallback(
    async (
      starters: { position: Position | "FLEX"; slotIndex: number; playerId: number }[]
    ) => {
      if (!id || !accessToken) return;
      const targetSquadId = lineupContextSquadId || userSquadId;
      if (!targetSquadId) {
        showNotification("Join a squad before voting on lineups.", "error");
        return;
      }

      setIsSubmittingVote(true);
      try {
        await lineupVoteMutation.mutateAsync({
          leagueId: id,
          squadId: targetSquadId,
          week: rosterWeek,
          starters: starters.map((starter) => ({
            position: starter.position,
            slotIndex: starter.slotIndex,
            playerId: starter.playerId,
          })),
        });
        recentLineupSubmitRef.current = {
          leagueId: String(id),
          squadId: String(targetSquadId),
          week: Number(rosterWeek),
          submittedAt: Date.now(),
        };

        await refreshLineupDependentQueries({
          week: rosterWeek,
          squadId: targetSquadId,
        });

        showNotification("Lineup vote submitted.", "success");
        setShowVoteModal(false);
      } catch (error) {
        showNotification(
          getUserErrorMessage(error, "Couldn't submit lineup vote."),
          "error"
        );
      } finally {
        setIsSubmittingVote(false);
      }
    },
    [
      accessToken,
      id,
      lineupContextSquadId,
      lineupVoteMutation,
      refreshLineupDependentQueries,
      rosterWeek,
      showNotification,
      userSquadId,
    ]
  );

  // Navigation handlers
  const handleCreateSquadPress = useCallback(() => {
    if (isUserInSquad) {
      showNotification("You're already in a squad in this league.", "error");
      return;
    }
    router.push(`/(tabs)/league/${id}/create-squad/step1`);
  }, [isUserInSquad, showNotification, router, id]);

  const handleJoinSquadPress = useCallback(
    (squad: any) => {
      if (isUserInSquad) {
        showNotification("You're already in a squad in this league.", "error");
        return;
      }

      const targetSquadId = squad?._id;
      const parsedSquadId = asId(targetSquadId);
      if (!parsedSquadId) {
        showNotification("Couldn't find that squad.", "error");
        return;
      }

      router.push({
        pathname: "/(tabs)/join-squad",
        params: {
          squadId: parsedSquadId,
          leagueId: id || "",
          squadName: squad?.name || "Squad",
          isPublic: String(squad?.isPublic ?? true),
        },
      } as any);
    },
    [isUserInSquad, showNotification, router, id]
  );

  const handleSquadPress = useCallback(
    (squad: any) => {
      const parsedSquadId = asId(squad?._id);
      if (!parsedSquadId) {
        showNotification("Couldn't find that squad.", "error");
        return;
      }

      const isOwnSquad =
        parsedSquadId === asId((userProfile as any)?.squadId) ||
        Boolean(user?.id && Array.isArray(squad?.members) && squad.members.some(
          (member: any) => asId(member?.userId || member?._id || member?.id) === asId(user.id)
        ));

      if (isOwnSquad) {
        setActiveTab("squad");
        return;
      }

      router.push({
        pathname: "/(tabs)/squad-settings",
        params: {
          squadId: parsedSquadId,
          leagueId: String(id || ""),
          readonly: "1",
        },
      } as any);
    },
    [showNotification, userProfile, user?.id, router, id]
  );

  // Generate tabs based on draft status
  const tabs = useMemo(() => {
    if (!isLeagueMember) {
      return [
        {
          id: "home",
          label: hasLeagueStarted ? "League Status" : "Preseason",
        },
      ];
    }

    return [
      {
        id: "home",
        label: isOffseasonLocked ? "Offseason" : isDraftComplete ? "Home" : "Preseason",
      },
      { id: "squad", label: "Squad" },
      { id: "matchups", label: "Matchups" },
      { id: "roster", label: "Roster" },
      { id: "league", label: "League" },
    ];
  }, [hasLeagueStarted, isDraftComplete, isLeagueMember, isOffseasonLocked]);

  React.useEffect(() => {
    if (!isLeagueMember && activeTab !== "home") {
      setActiveTab("home");
    }
  }, [activeTab, isLeagueMember]);

  React.useEffect(() => {
    tabTransition.setValue(0);
    Animated.parallel([
      Animated.timing(tabTransition, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeTab, tabTransition]);

  // Render tab content
  const renderTabContent = () => {
    if (!isLeagueMember && activeTab !== "home") {
      return null;
    }

    switch (activeTab) {
      case "home":
        if (isDraftComplete && isLeagueMember && !isOffseasonLocked) {
          // Post-draft: Show League Home
          return (
            <LeagueHomeContent
              leagueName={league.name || "League"}
              squadName={userSquad?.name || "My Squad"}
              record={
                myStanding
                  ? `${myStanding.wins || 0}-${myStanding.losses || 0}${myStanding.ties ? `-${myStanding.ties}` : ""}`
                  : "0-0"
              }
              rank={myRank}
              totalSquads={squads.length}
              currentWeek={currentWeek}
              voteStatus={voteStatus}
              weeklyPoints={Number(
                userSquadId && myCurrentMatchup
                  ? asId(myCurrentMatchup.homeSquadId) === userSquadId
                    ? myCurrentMatchup?.scores?.live?.home ??
                      myCurrentMatchup?.scores?.final?.home ??
                      0
                    : myCurrentMatchup?.scores?.live?.away ??
                      myCurrentMatchup?.scores?.final?.away ??
                      0
                  : 0
              )}
              projectedPoints={Number(
                userSquadId && myCurrentMatchup
                  ? asId(myCurrentMatchup.homeSquadId) === userSquadId
                    ? myCurrentMatchup?.scores?.projected?.home ?? 0
                    : myCurrentMatchup?.scores?.projected?.away ?? 0
                  : 0
              )}
              pendingWaiverCount={pendingWaiverCount}
              pendingTradeCount={pendingTradeCount}
              currentMatchup={currentMatchupCard}
              onVotePress={handleOpenVoteModal}
              onRosterPress={() => setActiveTab("roster")}
              onEnterDraftPress={
                isDraftInProgress
                  ? () => router.push(`/(tabs)/league/${id}/draft-room`)
                  : undefined
              }
              onMatchupPress={() => router.push(`/(tabs)/league/${id}/matchups`)}
              onLeaderboardPress={() => {
                router.push(`/(tabs)/league/${id}/standings`);
              }}
              onTradesPress={() => router.push(`/(tabs)/league/${id}/trades`)}
              onWaiverPress={() => router.push(`/(tabs)/league/${id}/players`)}
              onStandingsPress={() => {
                router.push(`/(tabs)/league/${id}/standings`);
              }}
              recentActivity={recentActivity}
              onRefresh={refreshLeagueData}
            />
          );
        } else {
          // Pre-draft: Show Pre-Season Content
          return (
            <PreSeasonContent
              leagueName={league.name || "League"}
              leagueImageUrl={league.imageUrl || league.leagueImageUrl || null}
              description={league.description}
              location={league.address || league.location}
              communityType={communityTypeName}
              isPublic={league.isPublic ?? true}
              leagueSize={league.leagueSize || 10}
              shareUrl={`hfsapp://league/${id}`}
              leagueId={id || ""}
              commissionerUsername={
                String(
                  league?.commissioner?.username ||
                    league?.commissioner?.name ||
                    ""
                ).trim() || null
              }
              leagueRules={league?.leagueRules || null}
              isLeagueAdmin={isLeagueAdmin}
              isUserInSquad={isUserInSquad}
              userId={user?.id}
              userSquadId={userProfile?.squadId}
              squads={squads}
              populatedSquadsCount={populatedSquadsCount}
              draftSettings={draftSettings || {}}
              onEditPress={() => router.push(`/(tabs)/league/${id}/edit`)}
              onDraftSettingsPress={() =>
                router.push(`/(tabs)/league/${id}/draft-settings`)
              }
              onDraftRoomPress={() =>
                isLeagueMember
                  ? router.push(`/(tabs)/league/${id}/draft-room`)
                  : showNotification("Join this league to open the draft room.", "error")
              }
              onCreateSquadPress={handleCreateSquadPress}
              onSquadPress={handleSquadPress}
              onJoinSquadPress={handleJoinSquadPress}
              onLeaveSquadPress={handleLeaveSquadPress}
              onRefresh={refreshLeagueData}
              showNotification={showNotification}
              isViewerMember={isLeagueMember}
              leagueStarted={hasLeagueStarted}
              seasonLifecycle={seasonLifecycle}
              canReactivateSeason={canReactivateSeason}
              isReactivatingSeason={isReactivatingSeason}
              onReactivateSeason={handleReactivateSeason}
            />
          );
        }

      case "squad":
        if (!userSquad) {
          return (
            <View style={styles.placeholderContainer}>
              <View style={styles.placeholderCard}>
                <MaterialIcons name="group-add" size={48} color={TEXT.quaternary} />
                <Text style={styles.placeholderTitle}>Join a Squad</Text>
                <Text style={styles.placeholderText}>
                  Join or create a squad to unlock lineup votes, transactions, and member tools.
                </Text>
                <TouchableOpacity
                  onPress={handleCreateSquadPress}
                  style={{
                    marginTop: 14,
                    borderRadius: 12,
                    backgroundColor: BRAND.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: "#FFF", fontWeight: "700" }}>Create squad</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }

        const squadRecord = myStanding
          ? `${myStanding.wins || 0}-${myStanding.losses || 0}${myStanding.ties ? `-${myStanding.ties}` : ""}`
          : "0-0";
        const memberList = Array.isArray(userSquad?.members) ? userSquad.members : [];
        const waiverType = String(
          (league as any)?.waiverSettings?.type ||
            (league as any)?.waiverType ||
            ""
        ).toLowerCase();
        const supportsFaab = waiverType === "faab";
        const faabValue = Number(
          (userSquad as any)?.faabBudget ??
            (userSquad as any)?.faabRemaining ??
            (myStanding as any)?.faabBudget ??
            0
        );
        const pointsFor = Number(
          (myStanding as any)?.pointsFor ??
            (myStanding as any)?.pf ??
            0
        );
        const pointsAgainst = Number(
          (myStanding as any)?.pointsAgainst ??
            (myStanding as any)?.pa ??
            0
        );
        const streak = String(
          (myStanding as any)?.streak ||
            (myStanding as any)?.currentStreak ||
            ""
        ).trim();
        const playoffOdds = Number(
          (myStanding as any)?.playoffOdds ??
            (myStanding as any)?.postSeasonOdds ??
            NaN
        );
        const showStreak = !!streak;
        const showPlayoffOdds = Number.isFinite(playoffOdds);

        const squadActions: Array<{
          key: string;
          icon: keyof typeof MaterialIcons.glyphMap;
          label: string;
          subtitle: string;
          onPress?: () => void;
        }> = [
          {
            key: "roster",
            icon: "list-alt" as keyof typeof MaterialIcons.glyphMap,
            label: "Roster",
            subtitle: "View lineup",
            onPress: () => setActiveTab("roster"),
          },
          {
            key: "standings",
            icon: "leaderboard" as keyof typeof MaterialIcons.glyphMap,
            label: "Standings",
            subtitle: "League table",
            onPress: () => router.push(`/(tabs)/league/${id}/standings`),
          },
          {
            key: "players",
            icon: "person-add" as keyof typeof MaterialIcons.glyphMap,
            label: "Players",
            subtitle: "Add/drop",
            onPress: competitiveActionsEnabled
              ? () => router.push(`/(tabs)/league/${id}/players`)
              : undefined,
          },
          {
            key: "trades",
            icon: "swap-horiz" as keyof typeof MaterialIcons.glyphMap,
            label: "Trades",
            subtitle: "Active offers",
            onPress: competitiveActionsEnabled
              ? () => router.push(`/(tabs)/league/${id}/trades`)
              : undefined,
          },
        ].filter((entry) => !!entry.onPress);

        return (
          <ScrollView
            style={{ flex: 1, backgroundColor: SURFACE.background }}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: BORDER.default,
                backgroundColor: SURFACE.card,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={["rgba(27,108,168,0.28)", "rgba(15,24,37,0.74)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 16 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: BORDER.default,
                      backgroundColor: SURFACE.elevated,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons name="groups" size={26} color={BRAND.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#FFF", fontSize: 23, fontWeight: "800", letterSpacing: -0.4 }} numberOfLines={1}>
                      {userSquad?.name || "My Squad"}
                    </Text>
                    <Text style={{ color: BRAND.primary, marginTop: 2, fontSize: 12, fontWeight: "700" }}>
                      {isLeagueAdmin ? "Commissioner" : "Member"}
                    </Text>
                    <Text style={{ color: TEXT.secondary, marginTop: 2, fontSize: 12 }} numberOfLines={1}>
                      {league.name || "League"}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                  <View style={styles.squadMetricCard}>
                    <Text style={styles.squadMetricValue}>{squadRecord}</Text>
                    <Text style={styles.squadMetricLabel}>Record</Text>
                  </View>
                  <View style={styles.squadMetricCard}>
                    <Text style={[styles.squadMetricValue, { color: BRAND.primary }]}>#{myRank || 1}</Text>
                    <Text style={styles.squadMetricLabel}>Rank</Text>
                  </View>
                  {supportsFaab ? (
                    <View style={styles.squadMetricCard}>
                      <Text style={[styles.squadMetricValue, { color: BRAND.gold }]}>${faabValue}</Text>
                      <Text style={styles.squadMetricLabel}>FAAB</Text>
                    </View>
                  ) : null}
                  <View style={styles.squadMetricCard}>
                    <Text style={styles.squadMetricValue}>{memberList.length}</Text>
                    <Text style={styles.squadMetricLabel}>Members</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {!!squadActions.length ? (
              <View
                style={{
                  marginTop: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: BORDER.default,
                  backgroundColor: SURFACE.card,
                  padding: 10,
                }}
              >
                <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
                  {squadActions.map((entry) => (
                    <TouchableOpacity
                      key={entry.key}
                      onPress={entry.onPress}
                      activeOpacity={0.85}
                      style={styles.squadActionCard}
                    >
                      <View style={styles.squadActionIconWrap}>
                        <MaterialIcons name={entry.icon} size={17} color={BRAND.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.squadActionTitle} numberOfLines={1}>{entry.label}</Text>
                        <Text style={styles.squadActionSubtitle} numberOfLines={1}>{entry.subtitle}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            <View
              style={{
                marginTop: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: BORDER.default,
                backgroundColor: SURFACE.card,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ color: "#FFF", fontSize: 19, fontWeight: "800", letterSpacing: -0.25 }}>
                  Members
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/squad-settings",
                      params: { squadId: asId(userSquad?._id || userSquad?.id) || "", leagueId: id || "" },
                    } as any)
                  }
                  activeOpacity={0.8}
                >
                  <Text style={{ color: BRAND.primary, fontSize: 12, fontWeight: "700" }}>Manage</Text>
                </TouchableOpacity>
              </View>

              {memberList.map((member: any, index: number) => (
                <View
                  key={`member-${member?._id || member?.id || member?.userId || index}`}
                  style={{
                    paddingVertical: 9,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: BORDER.lightest,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: ACCENT.primaryBg,
                        borderWidth: 1,
                        borderColor: ACCENT.primaryBorder,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: BRAND.primary, fontSize: 12, fontWeight: "800" }}>
                        {String(member?.name || member?.username || "S").trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#FFF", fontWeight: "700" }} numberOfLines={1}>
                        {member?.name || member?.username || "Squad Member"}
                      </Text>
                      <Text style={{ color: TEXT.secondary, fontSize: 12 }} numberOfLines={1}>
                        {member?.roles?.join?.(", ") || "Member"}
                      </Text>
                    </View>
                  </View>
                  {String(member?._id || member?.id || member?.userId || "") === String(user?.id || "") ? (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>You</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>

            <View
              style={{
                marginTop: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: BORDER.default,
                backgroundColor: SURFACE.card,
                padding: 14,
              }}
            >
              <Text style={{ color: "#FFF", fontSize: 19, fontWeight: "800", letterSpacing: -0.25, marginBottom: 10 }}>
                Season Stats
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
                <View style={styles.seasonStatCard}>
                  <Text style={styles.seasonStatLabel}>Points For</Text>
                  <Text style={styles.seasonStatValue}>{pointsFor.toFixed(1)}</Text>
                </View>
                <View style={styles.seasonStatCard}>
                  <Text style={styles.seasonStatLabel}>Points Against</Text>
                  <Text style={styles.seasonStatValue}>{pointsAgainst.toFixed(1)}</Text>
                </View>
                {showStreak ? (
                  <View style={styles.seasonStatCard}>
                    <Text style={styles.seasonStatLabel}>Streak</Text>
                    <Text style={[styles.seasonStatValue, { color: BRAND.primary }]}>{streak}</Text>
                  </View>
                ) : null}
                {showPlayoffOdds ? (
                  <View style={styles.seasonStatCard}>
                    <Text style={styles.seasonStatLabel}>Playoff Odds</Text>
                    <Text style={[styles.seasonStatValue, { color: BRAND.gold }]}>{Math.round(playoffOdds)}%</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </ScrollView>
        );

      case "roster":
        return renderRosterTab();

      case "matchups": {
        const resolvedCenterData = (matchupCenterData as any) || null;
        const resolvedWeek = Number(resolvedCenterData?.week || matchupsWeek || currentWeek || 1);
        const lightweightCenterData = {
          week: currentWeek,
          weekNav: weekStates.map((state: any) => ({
            week: Number(state?.week || 0),
            label:
              Number(state?.week || 0) === Number(currentWeek)
                ? "Current Week"
                : `Week ${Number(state?.week || 0)}`,
            isCurrent: Number(state?.week || 0) === Number(currentWeek),
            status: state?.status || "upcoming",
          })),
          matchTab: {
            cards: currentWeekMatchups.map((matchup: any, idx: number) => {
              const homeId = asId(matchup?.homeSquadId);
              const awayId = asId(matchup?.awaySquadId);
              const homeSquad = squadsById.get(homeId || "");
              const awaySquad = squadsById.get(awayId || "");
              const homeProjected = Number(matchup?.scores?.projected?.home || 0);
              const awayProjected = Number(matchup?.scores?.projected?.away || 0);
              const total = Math.max(1, homeProjected + awayProjected);
              const homePct = Number(((homeProjected / total) * 100).toFixed(1));

              return {
                matchupId: asId(matchup?._id) || `m-${idx}`,
                matchupNumber: Number(matchup?.matchupNumber || idx + 1),
                status: matchup?.status || "scheduled",
                home: {
                  squadId: homeId,
                  name: homeSquad?.name || "Home Squad",
                  record: "--",
                  rank: null,
                },
                away: {
                  squadId: awayId,
                  name: awaySquad?.name || "Away Squad",
                  record: "--",
                  rank: null,
                },
                scores: {
                  projected: {
                    home: homeProjected,
                    away: awayProjected,
                  },
                  live: {
                    home: Number(matchup?.scores?.live?.home || 0),
                    away: Number(matchup?.scores?.live?.away || 0),
                  },
                  final: {
                    home: Number(matchup?.scores?.final?.home || 0),
                    away: Number(matchup?.scores?.final?.away || 0),
                  },
                },
                winPct: {
                  home: homePct,
                  away: Number((100 - homePct).toFixed(1)),
                },
                rows: [],
              };
            }),
            rows: [],
          },
          teamTab: [],
          playersTab: [],
          leagueTab: {
            week: currentWeek,
            standingsSnapshot: standings,
            totals: {
              matchupCount: currentWeekMatchups.length,
              livePoints: currentWeekMatchups.reduce(
                (sum: number, matchup: any) =>
                  sum +
                  Number(matchup?.scores?.live?.home || 0) +
                  Number(matchup?.scores?.live?.away || 0),
                0
              ),
            },
          },
        };

        if (centerEnabled && isMatchupCenterLoading && !resolvedCenterData) {
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BRAND.primary} />
              <Text style={styles.loadingText}>Loading matchup data...</Text>
            </View>
          );
        }

        if (centerEnabled && isMatchupCenterError && !resolvedCenterData) {
          return (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>
                Matchup data is unavailable right now. Pull to refresh.
              </Text>
            </View>
          );
        }

        return (
          <MatchupCenter
            centerData={centerEnabled ? resolvedCenterData : lightweightCenterData}
            selectedWeek={resolvedWeek}
            onWeekChange={(week) => setMatchupsWeek(Number(week || 1))}
            onRefresh={async () => {
              await refreshLeagueData();
              await refetchMatchupCenter();
            }}
            socketConnected={isConnected}
            leagueId={id || undefined}
          />
        );
      }

      case "league":
        return (
          <LeagueTabContent
            leagueId={id || ""}
            leagueName={league.name || "League"}
            isLeagueAdmin={isLeagueAdmin}
            showDraftRecap={isDraftComplete}
            squads={squads}
            onLeagueSettingsPress={() => {
              router.push(`/(tabs)/league/${id}/edit`);
            }}
            onWaiversPress={() => {
              if (!competitiveActionsEnabled) return;
              router.push(`/(tabs)/league/${id}/players`);
            }}
            onTradesPress={() => {
              if (!competitiveActionsEnabled) return;
              router.push(`/(tabs)/league/${id}/trades`);
            }}
            onManageMembersPress={() => {
              const squadId = asId(userSquad?._id || userSquad?.id || userSquadId);
              if (!squadId) {
                showNotification("Join a squad to manage members.", "error");
                return;
              }
              router.push({
                pathname: "/(tabs)/squad-settings",
                params: { squadId, leagueId: id || "" },
              } as any);
            }}
            onLeagueRulesPress={() => {
              router.push(`/(tabs)/league/${id}/standings`);
            }}
            onStandingsDetailsPress={() => {
              router.push(`/(tabs)/league/${id}/standings`);
            }}
            onDraftRecapPress={() => {
              router.push(`/(tabs)/league/${id}/draft-recap`);
            }}
            hideTransactions={!competitiveActionsEnabled}
            onDeleteLeaguePress={isLeagueAdmin ? handleDeleteLeaguePress : undefined}
            onRefresh={refreshLeagueData}
          />
        );

      default:
        return null;
    }
  };

  const renderRosterTab = () => {
    const slotOrder = ["QB1", "RB1", "RB2", "WR1", "WR2", "TE1", "FLEX1", "DST1", "K1"];
    const slotToPosition = (slot: string): Position | "FLEX" => {
      if (slot.startsWith("DST")) return "DEF";
      if (slot.startsWith("FLEX")) return "FLEX";
      if (slot.startsWith("QB")) return "QB";
      if (slot.startsWith("RB")) return "RB";
      if (slot.startsWith("WR")) return "WR";
      if (slot.startsWith("TE")) return "TE";
      if (slot.startsWith("K")) return "K";
      return "FLEX";
    };

    const rosterSquads = rosters.map((roster: any) => ({
      _id: asId(roster.squadId || roster.squad?._id) || "",
      name: roster.squadName || roster.squad?.name,
      roster: roster.players || [],
    }));

    const selectedRoster =
      rosterSquads.find((squad) => asId(squad._id) === asId(selectedRosterSquadId)) ||
      rosterSquads[0];
    const selectedRosterId = asId(selectedRoster?._id);
    const isViewingOwnSquad = selectedRosterId && userSquadId
      ? String(selectedRosterId) === String(userSquadId)
      : false;

    const lineupPermissions = (lineupContext as any)?.permissions || {};
    const canEditVoteForSelectedSquad =
      !!isViewingOwnSquad &&
      !!(lineupPermissions?.canSubmitVote || lineupPermissions?.canSubmitDirect);

    const lineupSubtitle = (() => {
      if (lineupContext?.leagueType === "solo") {
        return "Your official lineup for this week";
      }
      const source = String(lineupContext?.officialLineup?.source || "");
      if (source === "direct") {
        return "Coach Override active";
      }
      if (lineupContext?.officialLineup?.isProvisional) {
        return "Live consensus lineup from current squad votes";
      }
      return "Official lineup based on squad votes";
    })();

    const rosterPlayerById = new Map(
      (selectedRoster?.roster || []).map((player: any) => [Number(player?.playerId), player])
    );
    const officialStartersSource = Array.isArray(lineupContext?.officialLineup?.starters)
      ? lineupContext.officialLineup.starters
      : [];
    const officialStarterBySlot = new Map(
      officialStartersSource.map((starter: any) => [String(starter?.slot || ""), starter])
    );
    const slotSummaryBySlot = new Map(
      (Array.isArray(lineupContext?.slotSummaries) ? lineupContext.slotSummaries : []).map(
        (summary: any) => [String(summary?.slot || ""), summary]
      )
    );

    const officialStarters = slotOrder.map((slot, index) => {
      const starter: any = officialStarterBySlot.get(slot);
      const summary: any = slotSummaryBySlot.get(slot);
      const winner = (summary?.candidates || []).find(
        (candidate: any) => Number(candidate?.playerId) === Number(starter?.playerId)
      );
      const rosterPlayer: any = rosterPlayerById.get(Number(starter?.playerId));
      const player = starter
        ? {
            ...(rosterPlayer || {}),
            playerId: Number(starter.playerId),
            firstName: starter.firstName || rosterPlayer?.firstName || "",
            lastName: starter.lastName || rosterPlayer?.lastName || "",
            team: starter.team || rosterPlayer?.team || "",
            position:
              slotToPosition(slot) === "DEF" ? "DEF" : starter.position || rosterPlayer?.position || "",
          }
        : null;

      return {
        slotKey: slot,
        position: slotToPosition(slot),
        label: slotToPosition(slot),
        player,
        isStarter: true,
        slotIndex: index,
        consensusPercent: winner?.percentage,
        voterNames: (winner?.voters || []).map((voter: any) => voter?.name).filter(Boolean),
        isLocked: !!summary?.locked,
      };
    });

    if (isLoadingData) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Loading roster</Text>
        </View>
      );
    }

    if (rosters.length === 0) {
      return (
        <View style={styles.placeholderContainer}>
          <View style={styles.placeholderCard}>
            <MaterialIcons name="group-off" size={48} color={TEXT.quaternary} />
            <Text style={styles.placeholderTitle}>No rosters yet</Text>
            <Text style={styles.placeholderText}>
              Rosters appear after the draft starts.
            </Text>
          </View>
        </View>
      );
    }

    // Squad selector for multiple rosters
    if (rosterSquads.length > 1) {
      return (
        <View style={styles.rosterContainer}>
          <View style={styles.squadSelector}>
            <Text style={styles.selectorLabel}>Choose Squad</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectorContent}
            >
              {rosterSquads.map((squad: any) => (
                <TouchableOpacity
                  key={squad._id}
                  onPress={() => setSelectedRosterSquadId(squad._id)}
                  style={[
                    styles.selectorButton,
                    selectedRosterSquadId === squad._id && styles.selectorButtonActive,
                  ]}
                >
                  <Text style={styles.selectorButtonText}>
                    {squad.name || "Unnamed squad"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {selectedRoster && (
            <RosterView
              squadName={selectedRoster.name || "My Team"}
              players={selectedRoster.roster}
              isLoading={refreshingRosters}
              onRefresh={handleRefreshRosters}
              weekNumber={rosterWeek}
              onWeekChange={setRosterWeek}
              voteStatus={voteStatus}
              canEditVote={canEditVoteForSelectedSquad}
              onEditVotePress={canEditVoteForSelectedSquad ? handleOpenVoteModal : undefined}
              officialStarters={officialStarters}
              lineupSubtitle={lineupSubtitle}
              onPlayerPress={(player) => setDetailsPlayer(player)}
            />
          )}
        </View>
      );
    }

    // Single roster
    return (
      <RosterView
        squadName={selectedRoster?.name || "My Team"}
        players={selectedRoster?.roster || []}
        isLoading={refreshingRosters}
        onRefresh={handleRefreshRosters}
        weekNumber={rosterWeek}
        onWeekChange={setRosterWeek}
        voteStatus={voteStatus}
        canEditVote={canEditVoteForSelectedSquad}
        onEditVotePress={canEditVoteForSelectedSquad ? handleOpenVoteModal : undefined}
        officialStarters={officialStarters}
        lineupSubtitle={lineupSubtitle}
        onPlayerPress={(player) => setDetailsPlayer(player)}
      />
    );
  };

  return (
    <View style={styles.container}>
      <TopNavigation
        title=""
        showBackButton
        onBackPress={handleBack}
        rightIcon={{
          name: "chat",
          onPress: handleChatPress,
          showNotification: true,
        }}
        bottomSection={
          showEntrySkeleton ? undefined : (
          <LeagueTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as LeagueTab)}
          />
          )
        }
      />

      {privateGateRequired ? (
        <View style={styles.privateGateContainer}>
          <View style={styles.privateGateCard}>
            <MaterialIcons name="lock" size={30} color={BRAND.gold} />
            <Text style={styles.privateGateTitle}>Private League</Text>
            <Text style={styles.privateGateSubtitle}>
              Enter the league passkey to view teams and join a squad.
            </Text>
            <View style={{ width: "100%", marginTop: 12 }}>
              <MeshTextInput
                placeholder="League passkey"
                value={privatePasskey}
                onChangeText={setPrivatePasskey}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                startIcon={{ name: "vpn-key" }}
              />
            </View>
            <View style={{ width: "100%", marginTop: 14 }}>
              <MeshButton
                title="Unlock League"
                onPress={handleVerifyPrivatePasskey}
                loading={isVerifyingPrivateAccess}
                disabled={isVerifyingPrivateAccess}
              />
            </View>
          </View>
        </View>
      ) : showEntrySkeleton ? (
        <View style={styles.entrySkeletonContainer}>
          <View style={styles.entrySkeletonHeader}>
            <View style={styles.entrySkeletonTitle} />
            <View style={styles.entrySkeletonChip} />
          </View>
          <View style={styles.entrySkeletonBody}>
            <View style={styles.entrySkeletonLineWide} />
            <View style={styles.entrySkeletonLineMid} />
            <View style={styles.entrySkeletonCard} />
            <View style={styles.entrySkeletonCard} />
          </View>
          <View style={styles.entrySkeletonSpinnerWrap}>
            <ActivityIndicator size="small" color={BRAND.primary} />
            <Text style={styles.entrySkeletonText}>Loading league</Text>
          </View>
        </View>
      ) : (
        <Animated.View
          style={{
            flex: 1,
            opacity: tabTransition.interpolate({
              inputRange: [0, 1],
              outputRange: [0.92, 1],
            }),
            transform: [
              {
                translateY: tabTransition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [6, 0],
                }),
              },
              {
                scale: tabTransition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.99, 1],
                }),
              },
            ],
          }}
        >
          {renderTabContent()}
        </Animated.View>
      )}

      {/* Leave Squad Confirmation Modal */}
      <ConfirmationModal
        visible={showLeaveSquadModal}
        title="Leave Squad"
        message="Are you sure you want to leave this squad? This action cannot be undone."
        confirmText="Leave Squad"
        cancelText="Cancel"
        onConfirm={handleLeaveSquadConfirm}
        onCancel={handleLeaveSquadCancel}
        isLoading={isLeavingSquad}
        variant="danger"
      />

      {/* Delete League Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteLeagueModal}
        title="Delete League"
        message="This action is irreversible and will delete ALL league data including draft, squads, rosters, memberships, and invites. Are you sure?"
        confirmText="Delete League"
        cancelText="Cancel"
        onConfirm={handleDeleteLeagueConfirm}
        onCancel={handleDeleteLeagueCancel}
        isLoading={isDeletingLeague}
        variant="danger"
      />

      {/* Lineup Vote Modal */}
      <LineupVoteModal
        visible={showVoteModal}
        onClose={handleCloseVoteModal}
        onSubmitVote={handleSubmitVote}
        players={
          rosters.find(
            (r: any) =>
              asId(r.squadId || r.squad?._id) ===
              asId(selectedRosterSquadId || lineupContextSquadId)
          )?.players || []
        }
        currentUserVote={currentUserVote}
        weekNumber={rosterWeek}
        isSubmitting={isSubmittingVote}
        onPlayerDetailsPress={(player) => setDetailsPlayer(player)}
      />

      <PlayerDetailsModal
        visible={!!detailsPlayer}
        onClose={() => setDetailsPlayer(null)}
        leagueId={id}
        actionsEnabled={competitiveActionsEnabled}
        player={
          detailsPlayer
            ? {
                playerId: Number(detailsPlayer?.playerId),
                firstName: detailsPlayer?.firstName,
                lastName: detailsPlayer?.lastName,
                name: `${detailsPlayer?.firstName || ""} ${detailsPlayer?.lastName || ""}`.trim(),
                position: detailsPlayer?.position,
                fantasyPosition: detailsPlayer?.position,
                team: detailsPlayer?.team,
                photoUrl: getPlayerImageUrl(detailsPlayer) || undefined,
                injuryStatus: detailsPlayer?.injuryStatus || null,
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
          router.push(`/(tabs)/league/${id}/trades`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE.background,
  },
  loadingText: {
    color: TEXT.secondary,
    fontSize: 14,
    marginTop: 12,
  },
  privateGateContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    backgroundColor: SURFACE.background,
  },
  privateGateCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER.default,
    backgroundColor: SURFACE.card,
    padding: 18,
    alignItems: "center",
  },
  privateGateTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 10,
  },
  privateGateSubtitle: {
    color: TEXT.secondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  placeholderContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
    backgroundColor: SURFACE.background,
  },
  placeholderCard: {
    backgroundColor: SURFACE.cardTransparent,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER.medium,
    padding: 32,
    alignItems: "center",
  },
  placeholderTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  placeholderText: {
    color: TEXT.secondary,
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  entrySkeletonContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: SURFACE.background,
  },
  entrySkeletonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  entrySkeletonTitle: {
    width: "44%",
    height: 22,
    borderRadius: 8,
    backgroundColor: SURFACE.elevated,
    borderWidth: 1,
    borderColor: BORDER.medium,
  },
  entrySkeletonChip: {
    width: 88,
    height: 22,
    borderRadius: 999,
    backgroundColor: SURFACE.elevated,
    borderWidth: 1,
    borderColor: BORDER.medium,
  },
  entrySkeletonBody: {
    backgroundColor: SURFACE.card,
    borderWidth: 1,
    borderColor: BORDER.medium,
    borderRadius: 16,
    padding: 14,
  },
  entrySkeletonLineWide: {
    width: "92%",
    height: 12,
    borderRadius: 6,
    backgroundColor: SURFACE.elevated,
    marginBottom: 8,
  },
  entrySkeletonLineMid: {
    width: "68%",
    height: 12,
    borderRadius: 6,
    backgroundColor: SURFACE.elevated,
    marginBottom: 14,
  },
  entrySkeletonCard: {
    height: 62,
    borderRadius: 12,
    backgroundColor: SURFACE.elevated,
    borderWidth: 1,
    borderColor: BORDER.medium,
    marginBottom: 10,
  },
  entrySkeletonSpinnerWrap: {
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  entrySkeletonText: {
    color: TEXT.secondary,
    fontSize: 13,
    marginLeft: 8,
  },
  rosterContainer: {
    flex: 1,
    backgroundColor: SURFACE.background,
  },
  squadSelector: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  selectorLabel: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  selectorContent: {
    paddingRight: 24,
  },
  selectorButton: {
    backgroundColor: SURFACE.cardTransparent,
    borderWidth: 1,
    borderColor: BORDER.medium,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  selectorButtonActive: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  selectorButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  squadMetricCard: {
    flex: 1,
    minWidth: 74,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER.default,
    backgroundColor: "rgba(8,12,18,0.75)",
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  squadMetricValue: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  squadMetricLabel: {
    color: TEXT.secondary,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 3,
  },
  squadActionCard: {
    width: "48.5%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.default,
    backgroundColor: "rgba(8,12,18,0.72)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  squadActionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: BORDER.default,
    backgroundColor: "rgba(79,195,247,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  squadActionTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  squadActionSubtitle: {
    color: TEXT.secondary,
    fontSize: 11,
    marginTop: 1,
  },
  youBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: ACCENT.primaryBorder,
    backgroundColor: ACCENT.primaryBg,
  },
  youBadgeText: {
    color: BRAND.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  seasonStatCard: {
    width: "48.5%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER.default,
    backgroundColor: "rgba(8,12,18,0.72)",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  seasonStatLabel: {
    color: TEXT.secondary,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  seasonStatValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
});

export default function LeagueDetailScreen() {
  return <LeagueDetailScreenContent />;
}
