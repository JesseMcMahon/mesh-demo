import { Stack } from "expo-router";
import { CreateLeagueProvider } from "@/contexts/create-league";
import { SURFACE } from "@/constants/colors";

export default function CreateLeagueLayout() {
  return (
    <CreateLeagueProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: SURFACE.background },
          gestureEnabled: false,
        }}
      >
        <Stack.Screen name="step1" />
        <Stack.Screen name="step2" />
        <Stack.Screen name="step2-waiver" />
        <Stack.Screen name="step3" />
        <Stack.Screen name="step4" />
        <Stack.Screen name="step5" />
      </Stack>
    </CreateLeagueProvider>
  );
}
