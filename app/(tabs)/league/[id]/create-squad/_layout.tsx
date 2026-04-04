import { Stack, useLocalSearchParams } from "expo-router";
import { CreateSquadProvider } from "@/contexts/create-squad";
import { LeagueDataProvider } from "@/contexts/league-data";
import { SURFACE } from "@/constants/colors";

export default function CreateSquadLayout() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const leagueId = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <LeagueDataProvider leagueId={leagueId}>
      <CreateSquadProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: SURFACE.background },
          }}
        >
          <Stack.Screen name="step1" />
          <Stack.Screen name="step2" />
        </Stack>
      </CreateSquadProvider>
    </LeagueDataProvider>
  );
}
