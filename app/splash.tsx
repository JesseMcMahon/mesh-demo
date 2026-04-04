import { View, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUserProfile } from "@/contexts/user-profile";
import { MeshBanner } from "@/components/MeshBanner";
import { useAppTheme } from "@/contexts/theme";
import { IS_INVESTOR_DEMO } from "@/constants/appMode";

const HAS_LAUNCHED_KEY = "@mesh_has_launched_once";

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useUserProfile();
  const { colors } = useAppTheme();

  useEffect(() => {
    if (IS_INVESTOR_DEMO) {
      router.replace("/(investor-demo)/home" as any);
      return;
    }

    if (!isHydrated) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const resolveRoute = async () => {
      let isFirstLaunch = false;
      try {
        const existing = await AsyncStorage.getItem(HAS_LAUNCHED_KEY);
        if (!existing) {
          isFirstLaunch = true;
          await AsyncStorage.setItem(HAS_LAUNCHED_KEY, "1");
        }
      } catch {
        // If storage fails, default to login/signup behavior without blocking.
      }

      if (cancelled) return;
      timer = setTimeout(() => {
        if (isAuthenticated) {
          router.replace("/(tabs)" as any);
          return;
        }
        router.replace((isFirstLaunch ? "/signup" : "/login") as any);
      }, 900);
    };

    void resolveRoute();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isAuthenticated, isHydrated, router]);

  return (
    <View className="flex-1">
      <MeshBanner />
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </View>
  );
}
