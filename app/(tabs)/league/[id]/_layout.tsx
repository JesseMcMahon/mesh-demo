import React, { useEffect, useMemo } from "react";
import { Stack, useLocalSearchParams, useRouter, useSegments } from "expo-router";
import { LeagueDataProvider, useLeagueData } from "@/contexts/league-data";
import { SURFACE } from "@/constants/colors";

function LeagueStackScreens({ leagueId }: { leagueId?: string }) {
  const router = useRouter();
  const segments = useSegments();
  const { userProfile, isLoading } = useLeagueData();

  const isLeagueMember = useMemo(() => {
    return Boolean((userProfile as any)?.membershipId || (userProfile as any)?.leagueId);
  }, [userProfile]);

  useEffect(() => {
    if (!leagueId || isLoading || isLeagueMember) return;

    const leagueSegmentIndex = segments.findIndex((segment) => segment === "league");
    const isLeagueRoute =
      leagueSegmentIndex >= 0 && segments[leagueSegmentIndex + 1] === leagueId;
    const isNestedLeagueRoute =
      isLeagueRoute && segments.length > leagueSegmentIndex + 2;
    if (isNestedLeagueRoute) {
      router.replace(`/(tabs)/league/${leagueId}` as any);
    }
  }, [segments, leagueId, isLoading, isLeagueMember, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: SURFACE.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "League Details" }} />
      <Stack.Screen name="edit" options={{ title: "Edit League" }} />
      <Stack.Screen
        name="draft-settings"
        options={{ title: "Draft Settings" }}
      />
      <Stack.Screen name="draft-room" options={{ title: "Draft Room" }} />
      <Stack.Screen name="draft-recap" options={{ title: "Draft Recap" }} />
      <Stack.Screen name="matchups" options={{ title: "Matchups" }} />
      <Stack.Screen name="players" options={{ title: "Players" }} />
      <Stack.Screen name="waivers" options={{ title: "Waiver Claims" }} />
      <Stack.Screen name="trades" options={{ title: "Trades" }} />
      <Stack.Screen name="standings" options={{ title: "Standings" }} />
      <Stack.Screen name="simulation" options={{ title: "Simulation Console" }} />
    </Stack>
  );
}

export default function LeagueDetailLayout() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const leagueId = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <LeagueDataProvider leagueId={leagueId}>
      <LeagueStackScreens leagueId={leagueId} />
    </LeagueDataProvider>
  );
}
