import { Stack } from "expo-router";

export default function InvestorDemoLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="roadmap" />
      <Stack.Screen name="lineup-demo" />
      <Stack.Screen name="locker-room" />
      <Stack.Screen name="my-locker" />
      <Stack.Screen name="crib" />
      <Stack.Screen name="battle-pass" />
      <Stack.Screen name="gems-xp" />
      <Stack.Screen name="taunts" />
    </Stack>
  );
}
