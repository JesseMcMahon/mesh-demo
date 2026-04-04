import { useMutation, useQuery } from "@tanstack/react-query";
import {
  leaderboardApiV2,
  lineupApi,
  matchupApi,
  playerApiV2,
  simApi,
  tradeApiV2,
  waiverApi,
  weekApi,
} from "@/lib/api";
import { useUserProfile } from "@/contexts/user-profile";

export function useWeekState(leagueId?: string) {
  const { accessToken } = useUserProfile();
  return useQuery({
    queryKey: ["v2-week-state", leagueId, accessToken],
    enabled: !!leagueId && !!accessToken,
    queryFn: () => weekApi.getState(leagueId as string, accessToken),
  });
}

export function useSeasonMatchups(leagueId?: string) {
  const { accessToken } = useUserProfile();
  return useQuery({
    queryKey: ["v2-matchups-season", leagueId, accessToken],
    enabled: !!leagueId && !!accessToken,
    queryFn: () => matchupApi.getSeason(leagueId as string, accessToken),
  });
}

export function useMatchupCenter(
  leagueId?: string,
  week?: number | null,
  enabled: boolean = true,
  rows: "selected" | "all" = "selected"
) {
  const { accessToken } = useUserProfile();
  return useQuery({
    queryKey: ["v2-matchup-center", leagueId, week ?? null, rows, accessToken],
    enabled: !!leagueId && !!accessToken && enabled,
    queryFn: () => matchupApi.getCenter(leagueId as string, week, rows, accessToken),
    staleTime: 5000,
    refetchOnWindowFocus: false,
  });
}

export function useMatchupCenterLive(
  leagueId?: string,
  week?: number | null,
  cursor?: string | null,
  enabled: boolean = true,
  rows: "selected" | "all" = "selected"
) {
  const { accessToken } = useUserProfile();
  const pollMs = Number(process.env.EXPO_PUBLIC_MATCHUP_CENTER_POLL_MS || 30000);

  return useQuery({
    queryKey: [
      "v2-matchup-center-live",
      leagueId,
      week ?? null,
      cursor ?? null,
      rows,
      accessToken,
    ],
    enabled: !!leagueId && !!week && !!accessToken && enabled,
    queryFn: () =>
      matchupApi.getCenterLive(
        leagueId as string,
        Number(week),
        cursor ?? undefined,
        rows,
        accessToken
      ),
    staleTime: Math.max(2000, pollMs - 1000),
    refetchInterval: Math.max(5000, pollMs),
    refetchOnWindowFocus: false,
  });
}

export function useLeagueStandings(leagueId?: string) {
  const { accessToken } = useUserProfile();
  return useQuery({
    queryKey: ["v2-league-standings", leagueId, accessToken],
    enabled: !!leagueId && !!accessToken,
    queryFn: () => leaderboardApiV2.getStandings(leagueId as string, accessToken),
  });
}

export function useWaiverPending(leagueId?: string) {
  const { accessToken } = useUserProfile();
  return useQuery({
    queryKey: ["v2-waiver-pending", leagueId, accessToken],
    enabled: !!leagueId && !!accessToken,
    queryFn: () => waiverApi.getPending(leagueId as string, accessToken),
  });
}

export function useWaiverHistory(leagueId?: string) {
  const { accessToken } = useUserProfile();
  return useQuery({
    queryKey: ["v2-waiver-history", leagueId, accessToken],
    enabled: !!leagueId && !!accessToken,
    queryFn: () => waiverApi.getHistory(leagueId as string, accessToken),
  });
}

export function useTradePending(leagueId?: string) {
  const { accessToken } = useUserProfile();
  return useQuery({
    queryKey: ["v2-trade-pending", leagueId, accessToken],
    enabled: !!leagueId && !!accessToken,
    queryFn: () => tradeApiV2.getPending(leagueId as string, accessToken),
  });
}

export function useTradeHistory(leagueId?: string) {
  const { accessToken } = useUserProfile();
  return useQuery({
    queryKey: ["v2-trade-history", leagueId, accessToken],
    enabled: !!leagueId && !!accessToken,
    queryFn: () => tradeApiV2.getHistory(leagueId as string, accessToken),
  });
}

export function usePlayerDetails(
  playerId?: number | null,
  leagueId?: string,
  seasonYear?: number
) {
  const { accessToken } = useUserProfile();
  return useQuery({
    queryKey: ["v2-player-details", playerId, leagueId, seasonYear, accessToken],
    enabled: !!playerId && !!accessToken,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: () =>
      playerApiV2.getDetails(
        {
          playerId: Number(playerId),
          leagueId,
          seasonYear,
        },
        accessToken
      ),
  });
}

export function useSubmitLineupVote() {
  const { accessToken } = useUserProfile();
  return useMutation({
    mutationFn: (payload: {
      leagueId: string;
      squadId?: string;
      week: number;
      starters: {
        slot?: string;
        position?: string;
        slotIndex?: number;
        playerId: number;
      }[];
    }) => lineupApi.submit(payload, accessToken),
  });
}

export function useLineupContext(
  leagueId?: string,
  squadId?: string,
  week?: number,
  options?: {
    includeVoteDetails?: boolean;
  }
) {
  const { accessToken } = useUserProfile();
  const includeVoteDetails = options?.includeVoteDetails === true;
  return useQuery({
    queryKey: ["v2-lineup-context", leagueId, squadId, week, includeVoteDetails, accessToken],
    enabled: !!leagueId && !!week && !!accessToken,
    queryFn: () =>
      lineupApi.getContext(
        {
          leagueId: leagueId as string,
          squadId,
          week: Number(week),
          includeVoteDetails,
        },
        accessToken
      ),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useWaiverPlayerPool(
  leagueId?: string,
  options?: {
    searchText?: string;
    position?: string;
    page?: number;
    pageLimit?: number;
    week?: number;
    enabled?: boolean;
  }
) {
  const { accessToken } = useUserProfile();
  return useQuery({
    queryKey: [
      "v2-waiver-player-pool",
      leagueId,
      options?.searchText || "",
      options?.position || "",
      Number(options?.page || 1),
      Number(options?.pageLimit || 100),
      Number(options?.week || 0),
      accessToken,
    ],
    enabled: !!leagueId && !!accessToken && (options?.enabled ?? true),
    queryFn: () =>
      waiverApi.getPlayerPool(
        {
          leagueId: leagueId as string,
          searchText: options?.searchText,
          position: options?.position,
          page: options?.page,
          pageLimit: options?.pageLimit,
          week: options?.week,
        },
        accessToken
      ),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useSubmitWaiverClaim() {
  const { accessToken } = useUserProfile();
  return useMutation({
    mutationFn: (payload: {
      leagueId: string;
      addPlayerId: number;
      dropPlayerId?: number | null;
      bidAmount: number;
      week?: number;
      mode?: "auto" | "waiver" | "immediate";
    }) => waiverApi.claim(payload, accessToken),
  });
}

export function useVoteWaiverClaim() {
  const { accessToken } = useUserProfile();
  return useMutation({
    mutationFn: (payload: { claimId: string; vote: "approve" | "reject" }) =>
      waiverApi.vote(payload, accessToken),
  });
}

export function useProposeTrade() {
  const { accessToken } = useUserProfile();
  return useMutation({
    mutationFn: (payload: {
      leagueId: string;
      receiverSquadId: string;
      offeredAssets: { type: "player"; playerId: number; fromSquadId: string }[];
      requestedAssets: { type: "player"; playerId: number; fromSquadId: string }[];
    }) => tradeApiV2.propose(payload, accessToken),
  });
}

export function useVoteTradeProposal() {
  const { accessToken } = useUserProfile();
  return useMutation({
    mutationFn: (payload: { tradeProposalId: string; vote: "approve" | "reject" }) =>
      tradeApiV2.vote(payload, accessToken),
  });
}

export function useReceiverTradeDecision() {
  const { accessToken } = useUserProfile();
  return useMutation({
    mutationFn: (payload: { tradeProposalId: string; decision: "accept" | "reject" }) =>
      tradeApiV2.receiverDecision(payload, accessToken),
  });
}

// Simulation hooks (dev/admin only)
export function useStartSimulationRun() {
  const { accessToken } = useUserProfile();
  return useMutation({
    mutationFn: (payload: {
      leagueId: string;
      seasonId?: string;
      sportsSeason?: number;
      seed?: number;
      dryRun?: boolean;
    }) => simApi.startRun(payload, accessToken),
  });
}

export function useStepSimulationRun() {
  const { accessToken } = useUserProfile();
  return useMutation({
    mutationFn: (payload: { runId: string; action?: "advance_week" }) =>
      simApi.stepRun(payload, accessToken),
  });
}

export function useBatchSimulationRun() {
  const { accessToken } = useUserProfile();
  return useMutation({
    mutationFn: (payload: {
      leagueIds: string[];
      seasons?: number[];
      maxLeagues?: number;
      seed?: number;
      dryRun?: boolean;
    }) => simApi.batchRun(payload, accessToken),
  });
}

export function useSimulationRunStatus(runId?: string, enabled: boolean = true) {
  const { accessToken } = useUserProfile();
  return useQuery({
    queryKey: ["v2-sim-run-status", runId, accessToken],
    enabled: !!runId && !!accessToken,
    queryFn: () => simApi.getRunStatus(runId as string, accessToken),
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.run?.status;
      return status === "running" ? 2500 : false;
    },
  });
}

export function useSimulationRunLogs(
  runId?: string,
  limit: number = 200,
  enabled: boolean = true
) {
  const { accessToken } = useUserProfile();
  return useQuery({
    queryKey: ["v2-sim-run-logs", runId, limit, accessToken],
    enabled: !!runId && !!accessToken,
    queryFn: () => simApi.getRunLogs(runId as string, limit, accessToken),
    refetchInterval: 4000,
  });
}
