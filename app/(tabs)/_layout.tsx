import { Tabs } from "expo-router";
import React from "react";
import { CustomTabBar } from "@/components/CustomTabBar";
import { SURFACE } from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: SURFACE.background,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
        }}
      />
      <Tabs.Screen
        name="my-leagues"
        options={{
          title: "My Leagues",
        }}
      />
      <Tabs.Screen
        name="leaderboards"
        options={{
          title: "Leaderboards",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
      <Tabs.Screen
        name="avatar-lab"
        options={{
          title: "Avatar",
        }}
      />
      <Tabs.Screen
        name="league/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="create-league"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="join-league"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="join-squad"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="squad-settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
