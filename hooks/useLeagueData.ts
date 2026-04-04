import { useQuery } from "@tanstack/react-query";
import { useUserProfile } from "@/contexts/user-profile";
import { leagueApi } from "@/lib/api";

/**
 * Helper function to extract data from API response
 * Handles different response structures from the API
 */
function extractResponseData<T>(response: any): T | null {
  if (response.data) {
    return response.data;
  }
  if (response.success && response.data) {
    return response.data;
  }
  if (!response.success) {
    return response;
  }
  return null;
}

/**
 * Helper function to extract array data from API response
 */
function extractArrayResponseData<T>(response: any): T[] {
  if (Array.isArray(response)) {
    return response;
  }
  if (response.data && Array.isArray(response.data)) {
    return response.data;
  }
  if (response.success && Array.isArray(response.data)) {
    return response.data;
  }
  return [];
}

export function useLeagueDetails(
  leagueId: string | undefined,
  options: { leagueAccessToken?: string | null } = {}
) {
  const { accessToken } = useUserProfile();
  const leagueAccessToken = options.leagueAccessToken || null;

  return useQuery({
    queryKey: ["league-details", leagueId, accessToken, leagueAccessToken],
    queryFn: async () => {
      if (!leagueId || (!accessToken && !leagueAccessToken)) {
        return null;
      }

      const response = await leagueApi.getDetails(leagueId, accessToken, {
        leagueAccessToken,
      });
      return extractResponseData(response);
    },
    enabled: !!leagueId && (!!accessToken || !!leagueAccessToken),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useLeagueUserProfile(leagueId: string | undefined) {
  const { accessToken } = useUserProfile();

  return useQuery({
    queryKey: ["league-user-profile", leagueId, accessToken],
    queryFn: async () => {
      if (!leagueId || !accessToken) {
        return null;
      }

      try {
        const response = await leagueApi.getUserProfile(leagueId, accessToken);
        return extractResponseData(response);
      } catch (error: any) {
        // Non-members should still be able to view public league pages.
        if (error?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!leagueId && !!accessToken,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 20_000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useLeagueSquads(
  leagueId: string | undefined,
  options: { leagueAccessToken?: string | null } = {}
) {
  const { accessToken } = useUserProfile();
  const leagueAccessToken = options.leagueAccessToken || null;

  return useQuery({
    queryKey: ["league-squads", leagueId, accessToken, leagueAccessToken],
    queryFn: async () => {
      if (!leagueId || (!accessToken && !leagueAccessToken)) {
        return [];
      }

      const response = await leagueApi.getSquads(leagueId, accessToken, {
        leagueAccessToken,
      });
      return extractArrayResponseData(response);
    },
    enabled: !!leagueId && (!!accessToken || !!leagueAccessToken),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useLeagueDraftSettings(
  seasonId: string | undefined,
  leagueId: string | undefined
) {
  const { accessToken } = useUserProfile();

  return useQuery({
    queryKey: ["league-draft-settings", seasonId, leagueId, accessToken],
    queryFn: async () => {
      if (!accessToken) {
        return null;
      }

      // Prefer seasonId, fallback to leagueId
      if (!seasonId && !leagueId) {
        return null;
      }

      const response = await leagueApi.getDraftSettings(
        { seasonId, leagueId },
        accessToken
      );
      return extractResponseData(response);
    },
    enabled: !!accessToken && (!!seasonId || !!leagueId),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useSeasonByLeagueAndYear(
  leagueId: string | undefined,
  year: number | undefined
) {
  const { accessToken } = useUserProfile();

  return useQuery({
    queryKey: ["season-by-league-year", leagueId, year, accessToken],
    queryFn: async () => {
      if (!leagueId || !year || !accessToken) {
        return null;
      }

      const response = await leagueApi.getSeasonByLeagueAndYear(
        leagueId,
        year,
        accessToken
      );
      return extractResponseData(response);
    },
    enabled: !!leagueId && !!year && !!accessToken,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useSeasonLifecycle(leagueId: string | undefined) {
  const { accessToken } = useUserProfile();

  return useQuery({
    queryKey: ["season-lifecycle", leagueId, accessToken],
    queryFn: async () => {
      if (!leagueId || !accessToken) return null;
      const response = await leagueApi.getSeasonLifecycle(leagueId, accessToken);
      return extractResponseData(response) || response;
    },
    enabled: !!leagueId && !!accessToken,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 20_000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useSeasonHistory(leagueId: string | undefined) {
  const { accessToken } = useUserProfile();

  return useQuery({
    queryKey: ["season-history", leagueId, accessToken],
    queryFn: async () => {
      if (!leagueId || !accessToken) return { items: [] as any[] };
      const response = await leagueApi.getSeasonHistory(leagueId, accessToken);
      return extractResponseData(response) || response;
    },
    enabled: !!leagueId && !!accessToken,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useSeasonRosters(seasonId: string | undefined) {
  const { accessToken } = useUserProfile();

  return useQuery({
    queryKey: ["season-rosters", seasonId, accessToken],
    queryFn: async () => {
      if (!seasonId || !accessToken) {
        return [];
      }

      const response = await leagueApi.getSeasonRosters(accessToken, seasonId);
      // Response should be parsed JSON, extract the data
      // If data is an array, return it; otherwise return empty array
      return response?.rosters ?? [];
    },
    enabled: !!seasonId && !!accessToken,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 20_000,
    gcTime: 5 * 60 * 1000,
  });
}
