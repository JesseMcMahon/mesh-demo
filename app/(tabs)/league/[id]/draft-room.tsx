import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TopNavigation } from "@/components/TopNavigation";
import { useSocket } from "@/contexts/socket";
import {
  useLeagueDraftSettings,
  useSeasonRosters,
  useLeagueSquads,
} from "@/hooks/useLeagueData";
import { useUserProfile } from "@/contexts/user-profile";
import { useLeagueData } from "@/contexts/league-data";
import { useNotification } from "@/contexts/notification";
import { draftApi } from "@/lib/api";
import { getPlayerImageUrl, prefetchPlayerImage } from "@/lib/playerImages";
import { backOrReplace } from "@/lib/navigation";
import { OnTheClockHeader } from "@/components/OnTheClockHeader";
import { DraftBottomSheet } from "@/components/DraftBottomSheet";
import { DraftBoard } from "@/components/DraftBoard";
import { PlayerDetailsModal } from "@/components/PlayerDetailsModal";
import { BRAND, SURFACE, TEXT, SEMANTIC, ACCENT } from "@/constants/colors";

const OFF_POSITIONS = ["QB", "RB", "TE", "WR", "K", "DST"];
const DRAFT_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DST"];
const SKILL_POSITIONS = ["RB", "WR", "TE"];
const STANDARD_DRAFT_LIMITS: Record<string, { min: number; max: number }> = {
  QB: { min: 1, max: 3 },
  RB: { min: 2, max: 8 },
  WR: { min: 2, max: 8 },
  TE: { min: 1, max: 3 },
  K: { min: 1, max: 2 },
  DST: { min: 1, max: 2 },
};

const normalizeDraftPosition = (position?: string | null): string | null => {
  const normalized = String(position || "").trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "DEF" || normalized === "D") return "DST";
  if (normalized === "PK") return "K";
  return normalized;
};

const getAllowedDraftPositions = (
  rosterPlayers: Array<{ position?: string | null }>,
  totalSlots: number
) => {
  const safeTotalSlots = Math.max(Number(totalSlots) || 0, 0);
  const counts: Record<string, number> = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    K: 0,
    DST: 0,
  };

  for (let i = 0; i < rosterPlayers.length; i++) {
    const normalized = normalizeDraftPosition(rosterPlayers[i]?.position);
    if (normalized && counts[normalized] !== undefined) {
      counts[normalized] += 1;
    }
  }

  const draftedCount = rosterPlayers.length;
  const remainingSlots = Math.max(safeTotalSlots - draftedCount, 0);
  if (remainingSlots <= 0) return [];

  const limits = DRAFT_POSITIONS.reduce((acc, position) => {
    const base = STANDARD_DRAFT_LIMITS[position];
    acc[position] = {
      min: base.min,
      max: Math.min(safeTotalSlots, Math.max(base.max, base.min)),
    };
    return acc;
  }, {} as Record<string, { min: number; max: number }>);

  const coreSkillMin = SKILL_POSITIONS.reduce(
    (sum, position) => sum + limits[position].min,
    0
  );
  const mustFillWithoutFlex =
    limits.QB.min + limits.K.min + limits.DST.min + coreSkillMin;
  const flexSkillMin =
    safeTotalSlots > mustFillWithoutFlex ? coreSkillMin + 1 : coreSkillMin;

  const requiredRemaining = (nextCounts: Record<string, number>) => {
    const minDeficits = DRAFT_POSITIONS.reduce(
      (sum, position) => sum + Math.max(0, limits[position].min - nextCounts[position]),
      0
    );
    const skillCount = SKILL_POSITIONS.reduce(
      (sum, position) => sum + nextCounts[position],
      0
    );
    const skillDeficit = Math.max(0, flexSkillMin - skillCount);
    return minDeficits + skillDeficit;
  };

  return DRAFT_POSITIONS.filter((position) => {
    if (counts[position] + 1 > limits[position].max) {
      return false;
    }
    const nextCounts = { ...counts, [position]: counts[position] + 1 };
    const remainingAfterPick = remainingSlots - 1;
    return requiredRemaining(nextCounts) <= remainingAfterPick;
  });
};

interface DraftState {
  draftId: string;
  status: string;
  pickStatus: string;
  pickNumber: number;
  currentRound: number;
  pickNumberInRound: number;
  currentSquad: {
    _id: string;
    name: string;
    imageUrl?: string;
    autoPickEnabled?: boolean;
  } | null;
  squadAutoPick?: Record<
    string,
    {
      enabled?: boolean;
      reason?: string | null;
      updatedAt?: string | null;
    }
  >;
  pickDeadline: string | null;
  timeRemainingSeconds: number | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

interface Player {
  _id: string;
  playerId: number;
  firstName: string;
  lastName: string;
  team: string;
  position: string;
  photoUrl?: string;
}

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

interface DraftPermissions {
  mySquadId: string | null;
  isMySquadOnClock: boolean;
  isHeadCoach: boolean;
  canDraft: boolean;
  canVote: boolean;
}

type ViewMode = "with-sheet" | "board-only";
type DraftPositionFilter = "ALL" | "QB" | "RB" | "WR" | "TE" | "K" | "DST";

const hasMeaningfulDraftStateChange = (
  prev: DraftState | null,
  next: DraftState
) => {
  if (!prev) return true;
  return (
    prev.status !== next.status ||
    prev.pickStatus !== next.pickStatus ||
    prev.pickNumber !== next.pickNumber ||
    prev.currentRound !== next.currentRound ||
    prev.pickNumberInRound !== next.pickNumberInRound ||
    prev.currentSquad?._id !== next.currentSquad?._id ||
    prev.pickDeadline !== next.pickDeadline ||
    prev.completedAt !== next.completedAt
  );
};

export default function DraftRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const leagueId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { socket, isConnected } = useSocket();
  const { accessToken } = useUserProfile();
  const { showNotification } = useNotification();
  const insets = useSafeAreaInsets();

  // View mode state - bottom sheet shown or hidden
  const [viewMode, setViewMode] = useState<ViewMode>("with-sheet");

  // Fetch draft settings to get draftId and seasonId
  const { data: draftSettings, isLoading: isLoadingDraftSettings } =
    useLeagueDraftSettings(undefined, leagueId);
  const draftId = (draftSettings as any)?._id || null;

  // Extract seasonId from draft settings
  const seasonId =
    (draftSettings as any)?.seasonId ||
    (draftSettings as any)?.season?._id ||
    (draftSettings as any)?.season?.id ||
    null;

  // Fetch rosters for the season
  const {
    data: rostersData = [],
    isLoading: isLoadingRosters,
    refetch: refetchRostersData,
  } = useSeasonRosters(seasonId || undefined);

  // Fetch squads for the league
  const { data: squads = [] } = useLeagueSquads(leagueId);

  // Local state for rosters that can be updated via socket events
  const [rosters, setRosters] = useState<any[]>([]);

  // Initialize rosters from query data
  useEffect(() => {
    if (rostersData && rostersData.length > 0) {
      setRosters(rostersData);
    }
  }, [rostersData]);

  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasJoinedDraftRoom, setHasJoinedDraftRoom] = useState(false);
  const [isRefreshingDraft, setIsRefreshingDraft] = useState(false);

  // Get current draft snapshot for initial room hydration.
  const {
    data: draftStateSnapshot,
    isLoading: isLoadingDraftStateSnapshot,
    isError: isDraftStateSnapshotError,
    error: draftStateSnapshotError,
    refetch: refetchDraftStateSnapshot,
  } = useQuery({
      queryKey: ["draft-state", draftId, accessToken],
      queryFn: () => draftApi.getDraftState(accessToken!, draftId!),
      enabled: !!accessToken && !!draftId,
      refetchOnMount: "always",
      staleTime: 0,
    });

  const {
    data: draftVotesData,
    isLoading: isLoadingVotes,
    error: votesError,
    refetch: refetchDraftVotes,
  } = useQuery({
    queryKey: ["draft-votes", draftId, accessToken],
    queryFn: () => draftApi.getVotes(accessToken!, draftId!),
    enabled: !!accessToken && !!draftId,
    refetchOnMount: "always",
    staleTime: 0,
  });

  // Locking mechanism state
  const [isDraftLocked, setIsDraftLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);
  const [isPickInProgress, setIsPickInProgress] = useState(false);
  const [isVoteInProgress, setIsVoteInProgress] = useState(false);
  const [votes, setVotes] = useState<DraftVoteRow[]>([]);
  const [myVotePlayerId, setMyVotePlayerId] = useState<number | null>(null);
  const [detailsPlayer, setDetailsPlayer] = useState<Player | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<DraftPermissions | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const { userProfile } = useLeagueData();

  // Refs to hold latest values to avoid socket handler re-attachment
  const draftSettingsRef = useRef(draftSettings);
  const seasonIdRef = useRef(seasonId);
  const showNotificationRef = useRef(showNotification);

  // Keep refs updated
  useEffect(() => {
    draftSettingsRef.current = draftSettings;
  }, [draftSettings]);

  useEffect(() => {
    seasonIdRef.current = seasonId;
  }, [seasonId]);

  useEffect(() => {
    showNotificationRef.current = showNotification;
  }, [showNotification]);

  useEffect(() => {
    const snapshot =
      (draftStateSnapshot as any)?.draftState ||
      (draftStateSnapshot as any)?.data?.draftState ||
      null;
    const snapshotPermissions =
      (draftStateSnapshot as any)?.meta?.permissions ||
      (draftStateSnapshot as any)?.data?.meta?.permissions ||
      null;

    if (snapshot) {
      setDraftState(snapshot);
      setIsLoading(false);
      setError(null);
    }

    if (snapshotPermissions) {
      setDraftPermissions(snapshotPermissions);
    }
  }, [draftStateSnapshot]);

  useEffect(() => {
    if (!draftVotesData) return;

    setVotes((draftVotesData as any)?.votes || []);
    setMyVotePlayerId((draftVotesData as any)?.myVotePlayerId ?? null);

    const votePermissions = (draftVotesData as any)?.permissions;
    if (votePermissions) {
      setDraftPermissions(votePermissions);
    }
  }, [draftVotesData]);

  useEffect(() => {
    if (!isLoadingDraftStateSnapshot && !draftStateSnapshot && !draftState) {
      setIsLoading(false);
    }

    if (isDraftStateSnapshotError && !draftState) {
      const message =
        (draftStateSnapshotError as any)?.message ||
        "Unable to load draft state";
      setError(message);
    }
  }, [
    isLoadingDraftStateSnapshot,
    draftStateSnapshot,
    draftState,
    isDraftStateSnapshotError,
    draftStateSnapshotError,
  ]);

  // Get user's squad ID
  const mySquadId =
    draftPermissions?.mySquadId ||
    (userProfile as any)?.squadId ||
    null;
  const userRoles = Array.isArray((userProfile as any)?.roles)
    ? (userProfile as any).roles
    : [];
  const isHeadCoach =
    draftPermissions?.isHeadCoach ??
    userRoles.includes("HeadCoach");
  const totalSlotsPerSquad = Number((draftSettings as any)?.rounds || 15);

  const myRosterPlayers = useMemo(() => {
    if (!mySquadId) return [];
    const myRoster =
      rosters.find(
        (roster) =>
          String(roster?.squadId) === String(mySquadId) ||
          String(roster?.squad?._id) === String(mySquadId)
      ) || null;
    return Array.isArray(myRoster?.players) ? myRoster.players : [];
  }, [mySquadId, rosters]);

  const shouldApplyPositionLimits =
    !!mySquadId && !!isHeadCoach && draftState?.status === "in_progress";

  const allowedDraftPositions = useMemo(() => {
    if (!shouldApplyPositionLimits) {
      return OFF_POSITIONS;
    }
    return getAllowedDraftPositions(myRosterPlayers, totalSlotsPerSquad);
  }, [myRosterPlayers, shouldApplyPositionLimits, totalSlotsPerSquad]);

  const positionFilterOptions = useMemo<DraftPositionFilter[] | undefined>(() => {
    if (!shouldApplyPositionLimits) return undefined;
    return [
      "ALL",
      ...(OFF_POSITIONS.filter((position) =>
        allowedDraftPositions.includes(position)
      ) as DraftPositionFilter[]),
    ];
  }, [allowedDraftPositions, shouldApplyPositionLimits]);

  // Fetch available players for the current season (filters out already drafted players)
  const {
    data: playersData,
    isLoading: isLoadingPlayers,
    error: playersError,
    refetch: refetchPlayersData,
  } = useQuery({
    queryKey: ["available-players", seasonId, draftId, accessToken],
    queryFn: async () => {
      if (!accessToken) {
        throw new Error("No access token available");
      }
      if (!seasonId) {
        throw new Error("No season ID available");
      }
      return draftApi.getAvailablePlayers(accessToken, seasonId, {
        draftId: draftId || undefined,
        page: 1,
        pageLimit: 1000,
      });
    },
    enabled: !!accessToken && !!seasonId && !isLoadingDraftSettings,
  });

  // Local state for players list that can be updated via socket events
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [playerCount, setPlayerCount] = useState<number>(0);

  // Initialize players list from query data
  useEffect(() => {
    if (playersData?.players) {
      setAllPlayers(playersData.players);
      setPlayerCount(playersData.count || playersData.players.length);
    }
  }, [playersData]);

  // Filter players for OFF category (only QB, RB, TE, WR positions)
  const players = useMemo(() => {
    const offPlayers = allPlayers.filter((player) =>
      OFF_POSITIONS.includes(String(player.position || "").toUpperCase())
    );

    if (!shouldApplyPositionLimits) {
      return offPlayers;
    }

    if (!allowedDraftPositions.length) {
      return [];
    }

    const allowedSet = new Set(allowedDraftPositions);
    return offPlayers.filter((player) => {
      const normalized = normalizeDraftPosition(player.position);
      return !!normalized && allowedSet.has(normalized);
    });
  }, [allPlayers, allowedDraftPositions, shouldApplyPositionLimits]);

  const isSocketOnline = isConnected || !!socket?.connected;

  const handleRefreshDraftRoom = useCallback(async () => {
    try {
      setIsRefreshingDraft(true);
      await Promise.all([
        refetchDraftStateSnapshot(),
        refetchDraftVotes(),
        refetchRostersData(),
        refetchPlayersData(),
      ]);
    } finally {
      setIsRefreshingDraft(false);
    }
  }, [
    refetchDraftStateSnapshot,
    refetchDraftVotes,
    refetchRostersData,
    refetchPlayersData,
  ]);

  useEffect(() => {
    if (!isSocketOnline) {
      setHasJoinedDraftRoom(false);
    }
  }, [isSocketOnline]);

  // Fallback polling keeps the draft live even if socket transport drops.
  useEffect(() => {
    if (!accessToken || !draftId || !seasonId || isSocketOnline) {
      return;
    }

    const pollDraftData = () => {
      void refetchDraftStateSnapshot();
      void refetchDraftVotes();
      void refetchRostersData();
      void refetchPlayersData();
    };

    pollDraftData();
    const interval = setInterval(pollDraftData, 4000);

    return () => clearInterval(interval);
  }, [
    accessToken,
    draftId,
    seasonId,
    isSocketOnline,
    refetchDraftStateSnapshot,
    refetchDraftVotes,
    refetchRostersData,
    refetchPlayersData,
  ]);

  // Join draft room and listen for updates
  useEffect(() => {
    if (!leagueId) {
      setError("League ID not found");
      setIsLoading(false);
      return;
    }

    if (isLoadingDraftSettings) {
      return; // Wait for draft settings to load
    }

    if (!draftId) {
      setError("Draft settings not found");
      setIsLoading(false);
      return;
    }

    if (!socket) {
      return;
    }

    // Listen for draft state updates
    const handleDraftStateUpdate = (state: DraftState) => {
      setHasJoinedDraftRoom(true);
      const { pickStatus } = state;
      setDraftState((prev) =>
        hasMeaningfulDraftStateChange(prev, state) ? state : prev
      );
      setIsLoading(false);
      setError(null);

      // LOCKING CHECK - Disable all pick actions
      if (pickStatus === "locking") {
        setIsDraftLocked(true);
        setIsPickInProgress(false); // Clear the immediate disable flag
        setLockCountdown(2); // Start 2 second countdown

        // Clear any existing countdown
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }

        // Start countdown timer
        countdownIntervalRef.current = setInterval(() => {
          setLockCountdown((prev) => {
            const next = prev === null || prev <= 1 ? null : prev - 1;
            if (next === null) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }
            }
            return next;
          });
        }, 1000);
        return;
      }

      // Pick is available (on_the_clock) or any other status
      // Clear countdown and unlock for any status that's not "locking"
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setIsDraftLocked(false);
      setLockCountdown(null);
    };

    // Listen for draft-specific socket errors
    const handleDraftError = (errorData: { message: string }) => {
      const message = errorData?.message || "Draft room error";
      const normalizedMessage = message.toLowerCase();

      if (
        normalizedMessage.includes("draft state not found") ||
        normalizedMessage.includes("may not have started yet")
      ) {
        setIsLoading(false);
        return;
      }

      setHasJoinedDraftRoom(false);
      if (
        normalizedMessage.includes("not a member") ||
        normalizedMessage.includes("authentication required")
      ) {
        setError(message);
      } else {
        showNotificationRef.current(message, "error");
      }
      setIsLoading(false);
    };

    const handleDraftVotesUpdated = (payload: {
      votes?: DraftVoteRow[];
      myVotePlayerId?: number | null;
      permissions?: DraftPermissions;
    }) => {
      if (!payload || typeof payload !== "object") return;
      if (Array.isArray(payload.votes)) {
        setVotes(payload.votes);
      }
      if (payload.myVotePlayerId !== undefined) {
        setMyVotePlayerId(payload.myVotePlayerId ?? null);
      }
      if (payload.permissions) {
        setDraftPermissions(payload.permissions);
      }
    };

    // Listen for player drafted events
    const handlePlayerDrafted = (data: {
      playerId?: string | number;
      _id?: string;
      seasonId?: string;
      draftId?: string;
      firstName?: string;
      lastName?: string;
      squadName?: string;
      squadId?: string;
      team?: string;
      position?: string;
      photoUrl?: string;
      pickNumber?: number;
      round?: number;
      isAutoPick?: boolean;
      addedAt?: string;
      player?: {
        _id?: string;
        playerId?: string | number;
        firstName?: string;
        lastName?: string;
      };
      squad?: {
        name?: string;
      };
      [key: string]: any;
    }) => {
      // Use refs to get latest values without causing re-attachment
      const currentDraftId = (draftSettingsRef.current as any)?._id;
      const currentSeasonId = seasonIdRef.current;

      // Verify this event is for our draft/season
      const isForThisDraft =
        (!data.seasonId && !data.draftId) ||
        (data.seasonId &&
          currentSeasonId &&
          String(data.seasonId) === String(currentSeasonId)) ||
        (data.draftId && currentDraftId && String(data.draftId) === String(currentDraftId));

      if (isForThisDraft) {
        // Get the player identifier
        const eventPlayerId =
          data._id ||
          data.playerId ||
          data.player?._id ||
          data.player?.playerId;

        if (!eventPlayerId) {
          return;
        }

        // Remove player from available list
        setAllPlayers((prevPlayers) => {
          const updated = prevPlayers.filter((player) => {
            const playerIdStr = String(player.playerId || "");
            const player_idStr = String(player._id || "");
            const eventIdStr = String(eventPlayerId);
            return playerIdStr !== eventIdStr && player_idStr !== eventIdStr;
          });

          setPlayerCount(updated.length);
          return updated;
        });

        setVotes((prevVotes) =>
          prevVotes.filter((voteRow) => {
            const votePlayerId = String(voteRow.player?.playerId || "");
            const votePlayerMongoId = String(voteRow.player?._id || "");
            const draftedId = String(eventPlayerId);
            return votePlayerId !== draftedId && votePlayerMongoId !== draftedId;
          })
        );
        setMyVotePlayerId((prev) =>
          prev != null && String(prev) === String(eventPlayerId) ? null : prev
        );
        void refetchDraftVotes();

        // Update rosters - append player to the correct squad's roster
        if (data.squadId) {
          setRosters((prevRosters) => {
            const rosterIndex = prevRosters.findIndex(
              (roster) =>
                roster.squadId === data.squadId ||
                roster.squad?._id === data.squadId
            );

            if (rosterIndex === -1) {
              const newRoster = {
                squadId: data.squadId,
                squadName:
                  data.squadName || data.squad?.name || "Unknown Squad",
                players: [
                  {
                    _id: data._id,
                    playerId: data.playerId,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    team: data.team,
                    position: data.position,
                    photoUrl: getPlayerImageUrl(data) || undefined,
                    pickNumber: data.pickNumber,
                    round: data.round,
                    isAutoPick: data.isAutoPick,
                    addedAt: data.addedAt,
                  },
                ],
              };
              return [...prevRosters, newRoster];
            }

            const updatedRosters = [...prevRosters];
            const existingRoster = updatedRosters[rosterIndex];
            const existingPlayers = existingRoster.players || [];

            const playerExists = existingPlayers.some(
              (p: any) =>
                String(p.playerId) === String(data.playerId) ||
                String(p._id) === String(data._id || data.playerId)
            );

            if (!playerExists) {
              const rosterPlayer = {
                _id: data._id,
                playerId: data.playerId,
                firstName: data.firstName,
                lastName: data.lastName,
                team: data.team,
                position: data.position,
                photoUrl: getPlayerImageUrl(data) || undefined,
                pickNumber: data.pickNumber,
                round: data.round,
                isAutoPick: data.isAutoPick,
                addedAt: data.addedAt,
              };

              updatedRosters[rosterIndex] = {
                ...existingRoster,
                players: [...existingPlayers, rosterPlayer],
              };
            }

            return updatedRosters;
          });
        }

        // Show notification
        const playerName =
          data.firstName && data.lastName
            ? `${data.firstName} ${data.lastName}`
            : data.player?.firstName && data.player?.lastName
              ? `${data.player.firstName} ${data.player.lastName}`
              : "A player";
        const squadName = data.squadName || data.squad?.name || "a team";
        const draftedPlayerImage =
          getPlayerImageUrl(data) ||
          getPlayerImageUrl(data.player || {}) ||
          undefined;
        const teamPosition = [data.team, data.position].filter(Boolean).join(" • ");
        const pickMeta = [
          data.round ? `R${data.round}` : null,
          data.pickNumber ? `Pick ${data.pickNumber}` : null,
        ]
          .filter(Boolean)
          .join(" • ");
        const isFirstRoundPick = Number(data.round || 0) === 1;

        showNotificationRef.current(
          playerName,
          "success",
          {
            title: isFirstRoundPick
              ? data.isAutoPick
                ? "First-round auto pick is in"
                : "First-round pick is in"
              : data.isAutoPick
                ? "Auto pick is in"
                : "Pick is in",
            subtitle: [squadName, teamPosition, pickMeta].filter(Boolean).join(" • "),
            imageUrl: draftedPlayerImage,
            iconName: isFirstRoundPick ? "emoji-events" : "sports-football",
            badgeText: isFirstRoundPick ? "ROUND 1" : data.isAutoPick ? "AUTO" : "LIVE",
            variant: isFirstRoundPick ? "marquee" : "default",
            duration: 3200,
          }
        );
      }
    };

    const joinAndHydrateDraft = () => {
      setError(null);
      socket.emit("joinDraftV2", { leagueId, draftId, accessToken });
      socket.emit("getDraftStateV2", { draftId });
    };

    const handleSocketConnect = () => {
      setHasJoinedDraftRoom(false);
      joinAndHydrateDraft();
    };

    const handleSocketConnectedAck = () => {
      joinAndHydrateDraft();
    };

    const handleDraftJoined = () => {
      setHasJoinedDraftRoom(true);
    };

    socket.on("connect", handleSocketConnect);
    socket.on("connected", handleSocketConnectedAck);
    socket.on("draftJoinedV2", handleDraftJoined);
    socket.on("draftStateUpdate", handleDraftStateUpdate);
    socket.on("draftError", handleDraftError);
    socket.on("draftVotesUpdated", handleDraftVotesUpdated);
    socket.on("playerDrafted", handlePlayerDrafted);

    // If already connected, join immediately. Otherwise connect and wait for on-connect.
    if (socket.connected) {
      joinAndHydrateDraft();
    } else {
      socket.connect();
    }

    // Cleanup
    return () => {
      socket.emit("leaveDraftV2", { leagueId, draftId });
      socket.off("connect", handleSocketConnect);
      socket.off("connected", handleSocketConnectedAck);
      socket.off("draftJoinedV2", handleDraftJoined);
      socket.off("draftStateUpdate", handleDraftStateUpdate);
      socket.off("draftError", handleDraftError);
      socket.off("draftVotesUpdated", handleDraftVotesUpdated);
      socket.off("playerDrafted", handlePlayerDrafted);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [
    socket,
    leagueId,
    draftId,
    accessToken,
    isLoadingDraftSettings,
    refetchDraftVotes,
  ]);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const handleBack = () => {
    backOrReplace(router, `/(tabs)/league/${leagueId}` as any);
  };

  const handleOpenPlayerDetails = useCallback((player: Player) => {
    prefetchPlayerImage(player);
    setDetailsPlayer(player);
  }, []);

  // Check if it's the user's turn
  const isMyTurn = useMemo(() => {
    if (!draftState || !mySquadId) {
      return false;
    }
    return (
      draftState.pickStatus === "on_the_clock" &&
      draftState.currentSquad?._id === mySquadId
    );
  }, [draftState, mySquadId]);

  const canDraft = useMemo(() => {
    if (typeof draftPermissions?.canDraft === "boolean") {
      return draftPermissions.canDraft;
    }
    return isHeadCoach && isMyTurn;
  }, [draftPermissions, isHeadCoach, isMyTurn]);

  const canVote = useMemo(() => {
    if (typeof draftPermissions?.canVote === "boolean") {
      return draftPermissions.canVote;
    }
    return !isHeadCoach && !!mySquadId;
  }, [draftPermissions, isHeadCoach, mySquadId]);

  // Handle manual pick with OPTIMISTIC UI UPDATE
  const handleManualPick = useCallback(async (player: Player, playerId: string) => {
    // Client-side check first
    if (isDraftLocked || isPickInProgress) {
      return;
    }

    if (!canDraft) {
      showNotification("Only your squad head coach can draft this pick.", "error");
      return;
    }

    if (!draftState || !accessToken) {
      return;
    }

    const draftId = (draftSettings as any)?._id;
    if (!draftId) {
      return;
    }

    // OPTIMISTIC UI: Immediately disable all buttons
    setIsPickInProgress(true);

    try {
      await draftApi.manualPick(accessToken, draftId, playerId);
      // Success - socket event will handle the rest
    } catch (error: any) {
      // Re-enable buttons on error
      setIsPickInProgress(false);
      showNotification(
        error?.message || "Failed to draft player. Please try again.",
        "error"
      );
    }
  }, [isDraftLocked, isPickInProgress, canDraft, draftState, accessToken, draftSettings, showNotification]);

  const handleVotePlayer = useCallback(async (player: Player, playerId: string) => {
    if (!canVote || isVoteInProgress) {
      return;
    }

    const currentDraftId = (draftSettings as any)?._id;
    if (!accessToken || !currentDraftId) {
      return;
    }

    try {
      setIsVoteInProgress(true);
      const response = await draftApi.castVote(accessToken, currentDraftId, playerId);
      setVotes((response as any)?.votes || []);
      setMyVotePlayerId((response as any)?.myVotePlayerId ?? Number(playerId));
      if ((response as any)?.permissions) {
        setDraftPermissions((response as any).permissions);
      }
    } catch (error: any) {
      showNotification(
        error?.message || "Failed to save vote. Please try again.",
        "error"
      );
    } finally {
      setIsVoteInProgress(false);
    }
  }, [canVote, isVoteInProgress, draftSettings, accessToken, showNotification]);

  // Determine if draft button should be disabled
  const isDraftButtonDisabled = useMemo(() => {
    if (!draftState) return true;
    if (!canDraft) return true;
    if (isDraftLocked || isPickInProgress) return true;
    if (draftState.pickStatus !== "on_the_clock") return true;
    return false;
  }, [canDraft, isDraftLocked, isPickInProgress, draftState]);

  const isVoteButtonDisabled = useMemo(() => {
    if (!draftState) return true;
    if (!canVote) return true;
    if (isVoteInProgress) return true;
    return draftState.status === "completed";
  }, [draftState, canVote, isVoteInProgress]);

  // Get draft settings for total rounds
  const totalRounds = (draftSettings as any)?.rounds || 15;
  const leagueSize = (draftSettings as any)?.leagueSize || squads.length || 1;

  // View mode toggle handler - toggle between showing/hiding bottom sheet
  const handleViewModeToggle = useCallback(() => {
    setViewMode((prev) => (prev === "with-sheet" ? "board-only" : "with-sheet"));
  }, []);

  // Get view mode icon - show list icon when sheet is hidden, grid when shown
  const viewModeConfig = useMemo(() => {
    return viewMode === "with-sheet"
      ? { icon: "grid-view" as const, label: "Board Only" }
      : { icon: "view-agenda" as const, label: "Show Players" };
  }, [viewMode]);

  const isInitialLoading =
    isLoadingDraftSettings ||
    (!!draftId && isLoadingDraftStateSnapshot && !draftState) ||
    (isLoading && !draftState);
  const showReconnectBanner =
    !isInitialLoading &&
    draftState?.status === "in_progress" &&
    (!isSocketOnline || !hasJoinedDraftRoom);

  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        <TopNavigation
          title="Draft Room"
          showBackButton
          onBackPress={handleBack}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Loading draft room...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <TopNavigation
          title="Draft Room"
          showBackButton
          onBackPress={handleBack}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={SEMANTIC.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setIsLoading(true);
              refetchDraftStateSnapshot();
              if (socket && !socket.connected) {
                socket.connect();
              }
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation with View Toggle */}
      <TopNavigation
        title="Draft Room"
        showBackButton
        onBackPress={handleBack}
        rightIcon={{
          name: viewModeConfig.icon,
          onPress: handleViewModeToggle,
        }}
      />

      {/* On The Clock Header */}
      {draftState && draftState.currentSquad && draftState.pickDeadline && (
        <OnTheClockHeader
          squadName={draftState.currentSquad.name}
          squadImageUrl={draftState.currentSquad.imageUrl}
          pickDeadline={draftState.pickDeadline}
          isMyTurn={isMyTurn}
          pickNumber={draftState.pickNumber}
          currentRound={draftState.currentRound}
          totalRounds={totalRounds}
          isLocking={isDraftLocked}
          lockCountdown={lockCountdown}
        />
      )}

      {draftState?.pickStatus === "waiting_to_start" && (
        <View style={styles.pendingBanner}>
          <MaterialIcons name="schedule" size={16} color={ACCENT.warning} />
          <Text style={styles.pendingBannerText}>
            Draft has not started yet. You can review players and squad rosters now.
          </Text>
        </View>
      )}

      {/* Draft Board - Always full screen */}
      <View style={styles.draftBoardContainer}>
        <DraftBoard
          rosters={rosters}
          squads={squads}
          currentPickNumber={draftState?.pickNumber}
          currentSquadId={draftState?.currentSquad?._id || null}
          squadAutoPickState={draftState?.squadAutoPick || {}}
          totalRounds={totalRounds}
          leagueSize={leagueSize}
          bottomPadding={viewMode === "with-sheet" ? 320 + insets.bottom : 24 + insets.bottom}
          refreshing={isRefreshingDraft}
          onRefresh={handleRefreshDraftRoom}
          onPlayerPress={(player) => handleOpenPlayerDetails(player as Player)}
        />
      </View>

      {/* Bottom Sheet - Overlays on top of draft board */}
      {viewMode === "with-sheet" && (
        <DraftBottomSheet
          players={players}
          playerCount={playerCount}
          positionFilters={positionFilterOptions}
          isLoading={isLoadingPlayers}
          error={playersError}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onDraftPlayer={handleManualPick}
          isDraftButtonDisabled={isDraftButtonDisabled}
          isVoteButtonDisabled={isVoteButtonDisabled}
          isDraftLocked={isDraftLocked}
          lockCountdown={lockCountdown}
          rosters={rosters}
          isLoadingRosters={isLoadingRosters}
          isMyTurn={isMyTurn}
          isHeadCoach={isHeadCoach}
          canDraft={canDraft}
          canVote={canVote}
          myVotePlayerId={myVotePlayerId}
          votes={votes}
          isLoadingVotes={isLoadingVotes}
          votesError={votesError as Error | null}
          onVotePlayer={handleVotePlayer}
          onPlayerPress={(player) => handleOpenPlayerDetails(player)}
        />
      )}

      {/* Connection Status Indicator */}
      {showReconnectBanner && (
        <View style={styles.connectionBanner}>
          <MaterialIcons name="wifi-off" size={16} color={SEMANTIC.error} />
          <Text style={styles.connectionText}>Reconnecting...</Text>
        </View>
      )}

      <PlayerDetailsModal
        visible={!!detailsPlayer}
        onClose={() => setDetailsPlayer(null)}
        leagueId={leagueId}
        actionsEnabled={draftState?.status === "completed"}
        player={
          detailsPlayer
            ? {
                playerId: Number(detailsPlayer.playerId),
                firstName: detailsPlayer.firstName,
                lastName: detailsPlayer.lastName,
                name: `${detailsPlayer.firstName} ${detailsPlayer.lastName}`.trim(),
                position: detailsPlayer.position,
                fantasyPosition: detailsPlayer.position,
                team: detailsPlayer.team,
                photoUrl: getPlayerImageUrl(detailsPlayer) || undefined,
              }
            : null
        }
        onAddPlayer={() => {
          setDetailsPlayer(null);
          router.push(`/(tabs)/league/${leagueId}/players`);
        }}
        onDropPlayer={() => {
          setDetailsPlayer(null);
          router.push(`/(tabs)/league/${leagueId}/players`);
        }}
        onTradePlayer={() => {
          setDetailsPlayer(null);
          router.push(`/(tabs)/league/${leagueId}/trades`);
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
  draftBoardContainer: {
    flex: 1,
  },
  pendingBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: `${ACCENT.warning}1A`,
    borderWidth: 1,
    borderColor: `${ACCENT.warning}66`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pendingBannerText: {
    color: TEXT.light,
    fontSize: 13,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    color: TEXT.secondary,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  errorText: {
    color: SEMANTIC.error,
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  connectionBanner: {
    position: "absolute",
    top: 132,
    left: 20,
    right: 20,
    backgroundColor: `${SEMANTIC.error}20`,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  connectionText: {
    color: SEMANTIC.error,
    fontSize: 13,
    fontWeight: "500",
  },
});
