import React, { createContext, useContext, ReactNode, useMemo } from "react";
import {
  useLeagueDetails,
  useLeagueUserProfile,
  useLeagueSquads,
  useSeasonByLeagueAndYear,
  useSeasonRosters,
} from "@/hooks/useLeagueData";
import { useUserProfile } from "@/contexts/user-profile";

interface LeagueDataContextType {
  leagueDetails: any | null;
  userProfile: any | null;
  squads: any[];
  rosters: any[]; // Season rosters
  currentSeason: any | null; // Active season
  seasonId: string | null; // ID of the active season
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

const LeagueDataContext = createContext<LeagueDataContextType | undefined>(
  undefined
);

interface LeagueDataProviderProps {
  children: ReactNode;
  leagueId: string | undefined;
}

export function LeagueDataProvider({
  children,
  leagueId,
}: LeagueDataProviderProps) {
  const { getLeagueAccessToken } = useUserProfile();
  const leagueAccessToken = leagueId ? getLeagueAccessToken(leagueId) : null;

  const {
    data: leagueDetails,
    isLoading: isLoadingDetails,
    isError: isErrorDetails,
    error: errorDetails,
  } = useLeagueDetails(leagueId, { leagueAccessToken });

  const {
    data: userProfile,
    isLoading: isLoadingProfile,
    isError: isErrorProfile,
    error: errorProfile,
  } = useLeagueUserProfile(leagueId);

  const {
    data: squads = [],
    isLoading: isLoadingSquads,
    isError: isErrorSquads,
    error: errorSquads,
  } = useLeagueSquads(leagueId, { leagueAccessToken });

  // Use server lifecycle year when available so offseason/reactivation always target the active season.
  const fallbackYear = new Date().getFullYear();
  const activeSeasonYear = useMemo(() => {
    const parsed = Number((leagueDetails as any)?.seasonLifecycle?.activeSeasonYear);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackYear;
  }, [leagueDetails]);

  // Fetch season by leagueId and current year
  const {
    data: season,
    isLoading: isLoadingSeason,
    isError: isErrorSeason,
    error: errorSeason,
  } = useSeasonByLeagueAndYear(leagueId, activeSeasonYear);

  // Extract seasonId from the fetched season
  const seasonId = (season as any)?._id || (season as any)?.id || null;

  // Fetch rosters for the season
  const {
    data: rosters = [],
    isLoading: isLoadingRosters,
    isError: isErrorRosters,
    error: errorRosters,
  } = useSeasonRosters(seasonId || undefined);

  const isLoading =
    isLoadingDetails ||
    isLoadingProfile ||
    isLoadingSquads ||
    isLoadingSeason ||
    isLoadingRosters;
  const isError =
    isErrorDetails ||
    isErrorProfile ||
    isErrorSquads ||
    isErrorSeason ||
    isErrorRosters;
  const error =
    errorDetails || errorProfile || errorSquads || errorSeason || errorRosters;

  // Use the fetched season as currentSeason
  const currentSeason = season;

  return (
    <LeagueDataContext.Provider
      value={{
        leagueDetails,
        userProfile,
        squads,
        rosters,
        currentSeason,
        seasonId,
        isLoading,
        isError,
        error: error as Error | null,
      }}
    >
      {children}
    </LeagueDataContext.Provider>
  );
}

export function useLeagueData() {
  const context = useContext(LeagueDataContext);
  if (context === undefined) {
    throw new Error("useLeagueData must be used within a LeagueDataProvider");
  }
  return context;
}
