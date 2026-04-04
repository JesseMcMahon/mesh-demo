import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR } from "@/constants/colors";
import { triggerHaptic } from "@/lib/haptics";

interface TabConfig {
  routeName: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
}

const TAB_CONFIGS: TabConfig[] = [
  { routeName: "index", icon: "home", label: "Home" },
  { routeName: "my-leagues", icon: "groups", label: "Leagues" },
  { routeName: "explore", icon: "explore", label: "Explore" },
  { routeName: "avatar-lab", icon: "sports-esports", label: "Avatar" },
  { routeName: "profile", icon: "person", label: "Profile" },
];

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const handleTabPress = async (routeName: string, routeKey: string) => {
    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });

    const isFocused =
      state.routes.findIndex((r) => r.name === routeName) === state.index;

    if (!isFocused && !event.defaultPrevented) {
      await triggerHaptic("selection");
      navigation.navigate(routeName);
    }
  };

  return (
    <View
      style={{
        backgroundColor: TAB_BAR.background,
        borderTopWidth: 1,
        borderTopColor: TAB_BAR.border,
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 8) + 8,
        paddingHorizontal: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
        }}
      >
        {TAB_CONFIGS.map((config) => {
          const route = state.routes.find((r) => r.name === config.routeName);
          if (!route) return null;

          const isFocused =
            state.routes.findIndex((r) => r.name === config.routeName) ===
            state.index;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => handleTabPress(config.routeName, route.key)}
              activeOpacity={0.85}
              style={{
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                minWidth: 64,
                paddingVertical: 2,
              }}
            >
              <MaterialIcons
                name={config.icon}
                size={20}
                color={isFocused ? TAB_BAR.selectedIcon : TAB_BAR.unselectedIcon}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: isFocused ? "700" : "500",
                  color: isFocused ? TAB_BAR.selectedIcon : TAB_BAR.unselectedIcon,
                }}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
