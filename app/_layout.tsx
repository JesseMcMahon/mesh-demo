import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Text, TextInput } from "react-native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SURFACE } from "@/constants/colors";
import { AuthProvider } from "@/contexts/auth";
import { UserProfileProvider } from "@/contexts/user-profile";
import { NotificationProvider } from "@/contexts/notification";
import { SocketProvider } from "@/contexts/socket";
import { ThemeColorProvider } from "@/contexts/theme";
import { DeepLinkHandler } from "@/components/DeepLinkHandler";
import { InvestorDemoProvider } from "@/contexts/investor-demo";
import { IS_INVESTOR_DEMO } from "@/constants/appMode";
import {
  UI_FONT_REGULAR,
  UI_FONT_MEDIUM,
  UI_FONT_SEMIBOLD,
  UI_FONT_BOLD,
} from "@/constants/typography";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

export const unstable_settings = {
  initialRouteName: "index",
};

function applyGlobalTypography(fontFamily: string) {
  const textComponent = Text as any;
  const inputComponent = TextInput as any;

  if ((globalThis as any).__meshTypographyAppliedFor === fontFamily) {
    return;
  }

  (globalThis as any).__meshTypographyAppliedFor = fontFamily;

  const textDefaults = textComponent.defaultProps || {};
  textComponent.defaultProps = {
    ...textDefaults,
    style: [{ fontFamily }, textDefaults.style],
  };

  const inputDefaults = inputComponent.defaultProps || {};
  inputComponent.defaultProps = {
    ...inputDefaults,
    style: [{ fontFamily }, inputDefaults.style],
  };
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded, fontLoadError] = useFonts({
    [UI_FONT_REGULAR]: require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    [UI_FONT_MEDIUM]: require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    [UI_FONT_SEMIBOLD]: require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    [UI_FONT_BOLD]: require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
  });

  if (!fontsLoaded && !fontLoadError) {
    return null;
  }

  applyGlobalTypography(UI_FONT_REGULAR);

  if (IS_INVESTOR_DEMO) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeColorProvider>
              <InvestorDemoProvider>
                <ThemeProvider
                  value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
                >
                  <Stack
                    screenOptions={{
                      contentStyle: {
                        backgroundColor: SURFACE.background,
                      },
                      headerShown: false,
                      animation: "fade",
                    }}
                  >
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="(investor-demo)"
                      options={{ headerShown: false }}
                    />
                  </Stack>
                  <StatusBar style="light" />
                </ThemeProvider>
              </InvestorDemoProvider>
            </ThemeColorProvider>
          </QueryClientProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeColorProvider>
            <AuthProvider>
              <UserProfileProvider>
                <SocketProvider>
                  <NotificationProvider>
                    <ThemeProvider
                      value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
                    >
                      <DeepLinkHandler />
                      <Stack
                        screenOptions={{
                          contentStyle: {
                            backgroundColor: SURFACE.background,
                          },
                          headerShown: false,
                          animation: "fade",
                        }}
                      >
                        <Stack.Screen
                          name="index"
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen
                          name="splash"
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen
                          name="login"
                          options={{
                            headerShown: false,
                            gestureEnabled: false,
                            animation: "fade",
                          }}
                        />
                        <Stack.Screen
                          name="signup"
                          options={{
                            headerShown: false,
                            gestureEnabled: false,
                            animation: "fade",
                          }}
                        />
                        <Stack.Screen
                          name="forgot-password"
                          options={{
                            headerShown: false,
                            gestureEnabled: false,
                            animation: "fade",
                          }}
                        />
                        <Stack.Screen
                          name="(tabs)"
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen
                          name="modal"
                          options={{ presentation: "modal", title: "Modal" }}
                        />
                      </Stack>
                      <StatusBar style="light" />
                    </ThemeProvider>
                  </NotificationProvider>
                </SocketProvider>
              </UserProfileProvider>
            </AuthProvider>
          </ThemeColorProvider>
        </QueryClientProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
