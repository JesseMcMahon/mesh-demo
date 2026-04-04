import { useCallback, useMemo } from "react";
import {
  Text,
  View,
  ScrollView,
  Image,
  ImageSourcePropType,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SURFACE, TEXT, BORDER, BRAND, SEMANTIC } from "@/constants/colors";
import { useAppTheme } from "@/contexts/theme";
import { useUserProfile } from "@/contexts/user-profile";
import { leagueApi } from "@/lib/api";
import { isFeatureEnabled } from "@/constants/features";
import { SkeletonBlock } from "@/components/Skeleton";
import { HomeLeaguePremiumCard, LeagueHomeSnapshot } from "@/components/home/HomeLeaguePremiumCard";
import { ScreenState } from "@/components/ui/ScreenState";

export const MY_LEAGUES_QUERY_KEY = ["my-leagues"];

interface LeagueMembership {
  league: any;
  roles: string[];
  squadId: string | null;
  squad: { name: string; imageUrl: string } | null;
  membershipId: string;
  joinedAt: string;
  homeSnapshot?: LeagueHomeSnapshot | null;
  seasonLifecycle?: LeagueHomeSnapshot["state"] | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatCompactNumber(value: number) {
  return Number(value || 0).toLocaleString();
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { accessToken, user } = useUserProfile();
  const { colors } = useAppTheme();

  const leagueCardWidth = Math.min(Math.max(SCREEN_WIDTH * 0.72, 258), 300);

  const bannerBackground: ImageSourcePropType = require("@/assets/images/meshBannerBackground.png");
  const meshLogo: ImageSourcePropType = require("@/assets/images/meshLogo.png");

  const {
    data: leaguesData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: [...MY_LEAGUES_QUERY_KEY, accessToken],
    queryFn: () => leagueApi.getMyLeagues(accessToken),
    enabled: !!accessToken,
    refetchOnMount: true,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });

  const leagues: LeagueMembership[] = useMemo(() => {
    const rawLeagues = Array.isArray(leaguesData) ? leaguesData : [];
    return rawLeagues
      .map((item: any) => {
        if (item.league) {
          return {
            league: item.league,
            roles: item.roles || [],
            squadId: item.squadId || null,
            squad: item.squad || null,
            membershipId: item.membershipId || item._id || item.id,
            joinedAt: item.joinedAt || "",
            homeSnapshot: item.homeSnapshot || null,
            seasonLifecycle: item.seasonLifecycle || item.homeSnapshot?.state || null,
          };
        }

        return {
          league: item,
          roles: item.roles || [],
          squadId: item.squadId || null,
          squad: item.squad || null,
          membershipId: item.membershipId || item._id || item.id,
          joinedAt: item.joinedAt || "",
          homeSnapshot: item.homeSnapshot || null,
          seasonLifecycle: item.seasonLifecycle || item.homeSnapshot?.state || null,
        };
      })
      .filter((item: LeagueMembership) => !!(item?.league?._id || item?.league?.id));
  }, [leaguesData]);

  const userAny = user as any;
  const firstName = (userAny?.name || "Jesse").split(" ")[0];
  const level = Number(userAny?.level ?? 12);
  const xpCurrent = Number(userAny?.xpCurrent ?? userAny?.xp ?? 3420);
  const xpGoal = Number(userAny?.nextLevelXp ?? userAny?.xpGoal ?? 5000);
  const xpPct = Math.max(0, Math.min(1, xpCurrent / Math.max(xpGoal, 1)));

  const firstLeagueName = leagues?.[0]?.league?.name || "Gridiron Legends";

  const renderLeagueCard = useCallback(
    ({ item }: { item: LeagueMembership }) => {
      const league = item.league;
      const snapshotState = String(item?.homeSnapshot?.state?.key || "").toLowerCase();
      const isDraftingNow =
        snapshotState === "drafting" ||
        String(item?.homeSnapshot?.state?.draftStatus || "").toLowerCase() ===
          "in_progress";
      return (
        <HomeLeaguePremiumCard
          item={item}
          cardWidth={leagueCardWidth}
          primaryColor={colors.primary}
          fallbackBannerSource={bannerBackground}
          onPress={() =>
            router.push(
              isDraftingNow
                ? (`/(tabs)/league/${league?._id || league?.id}/draft-room` as any)
                : (`/(tabs)/league/${league?._id || league?.id}` as any)
            )
          }
        />
      );
    },
    [bannerBackground, colors.primary, leagueCardWidth, router]
  );

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        <View
          style={{
            paddingTop: insets.top + 10,
            paddingHorizontal: 20,
            paddingBottom: 8,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: SURFACE.elevated,
                borderWidth: 1,
                borderColor: BORDER.medium,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <Image source={meshLogo} style={{ width: 24, height: 24 }} resizeMode="contain" />
            </View>

            <View>
              <Text style={{ color: TEXT.primary, fontSize: 18, fontWeight: "700", letterSpacing: -0.3 }}>Mesh</Text>
              <Text style={{ color: TEXT.secondary, fontSize: 13, marginTop: 1 }}>
                Good to see you, {firstName}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                backgroundColor: SURFACE.elevated,
                borderWidth: 1,
                borderColor: BORDER.medium,
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 5,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <MaterialIcons name="star" size={13} color={BRAND.gold} />
              <View>
                <Text style={{ color: TEXT.primary, fontSize: 12, fontWeight: "700", lineHeight: 14 }}>
                  Lv {level}
                </Text>
                <Text style={{ color: TEXT.secondary, fontSize: 10, lineHeight: 12 }}>
                  {formatCompactNumber(xpCurrent)} XP
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: SURFACE.elevated,
                borderWidth: 1,
                borderColor: BORDER.medium,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="notifications-none" size={17} color={TEXT.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: SURFACE.elevated,
                borderWidth: 1,
                borderColor: BORDER.medium,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="settings" size={17} color={TEXT.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{
            marginHorizontal: 16,
            marginTop: 6,
            marginBottom: 18,
            backgroundColor: SURFACE.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: BORDER.default,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ color: TEXT.primary, fontSize: 14, fontWeight: "600" }}>XP Progress</Text>
            <Text style={{ color: BRAND.primary, fontSize: 12, fontWeight: "500" }}>
              Gold Pack at Lv {level + 1}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: SURFACE.elevated,
              borderRadius: 6,
              height: 8,
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            <View
              style={{
                width: `${Math.max(4, xpPct * 100)}%`,
                height: "100%",
                backgroundColor: BRAND.primary,
                borderRadius: 6,
              }}
            />
          </View>
          <Text style={{ color: TEXT.secondary, fontSize: 12 }}>
            {formatCompactNumber(xpCurrent)} / {formatCompactNumber(xpGoal)} XP
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: TEXT.primary, fontSize: 17, fontWeight: "700" }}>My Leagues</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/my-leagues" as any)}>
            <Text style={{ color: BRAND.primary, fontSize: 13, fontWeight: "600" }}>See all</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 12, marginTop: 10 }}>
            {Array.from({ length: 2 }).map((_, index) => (
              <View
                key={`league-skeleton-${index}`}
                style={{
                  width: leagueCardWidth,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: BORDER.default,
                  backgroundColor: SURFACE.card,
                  overflow: "hidden",
                }}
              >
                <SkeletonBlock width="100%" height={96} />
                <View style={{ padding: 12 }}>
                  <SkeletonBlock width="64%" height={16} style={{ marginBottom: 8 }} />
                  <SkeletonBlock width="54%" height={12} style={{ marginBottom: 10 }} />
                  <SkeletonBlock width="100%" height={74} borderRadius={10} style={{ marginBottom: 10 }} />
                  <SkeletonBlock width="100%" height={40} borderRadius={10} />
                </View>
              </View>
            ))}
          </View>
        ) : isError ? (
          <ScreenState
            icon="error-outline"
            title="Couldn’t load leagues"
            subtitle={(error as Error)?.message || "Pull to refresh or try again."}
            actionLabel="Try again"
            onAction={() => refetch()}
          />
        ) : leagues.length > 0 ? (
          <FlatList
            data={leagues}
            renderItem={renderLeagueCard}
            keyExtractor={(item) => item.league?._id || item.league?.id || item.membershipId}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 28, paddingTop: 10, paddingBottom: 6 }}
            snapToAlignment="start"
            decelerationRate="fast"
            snapToInterval={leagueCardWidth + 12}
            initialNumToRender={3}
            maxToRenderPerBatch={4}
            windowSize={5}
            removeClippedSubviews
          />
        ) : (
          <View style={{ marginHorizontal: 20, marginTop: 10 }}>
            <ScreenState
              icon="emoji-events"
              title="No leagues yet"
              subtitle="Create or join your first league to start competing."
              actionLabel="Join league"
              onAction={() => router.push("/(tabs)/join-league" as any)}
            />
          </View>
        )}

        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            backgroundColor: SURFACE.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: BORDER.default,
            padding: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ color: TEXT.primary, fontSize: 15, fontWeight: "700" }}>Achievements</Text>
            <View
              style={{
                backgroundColor: SURFACE.elevated,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <MaterialIcons name="star" size={12} color={BRAND.gold} />
              <Text style={{ color: TEXT.secondary, fontSize: 12 }}>Streak: 4 wins</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { icon: "emoji-events", color: BRAND.gold, label: "Draft King" },
                { icon: "flash-on", color: BRAND.primary, label: "Hot Streak" },
                { icon: "gps-fixed", color: SEMANTIC.info, label: "Sharp Pick" },
              ].map((item) => (
              <View key={item.label} style={{ flex: 1, backgroundColor: SURFACE.elevated, borderRadius: 10, paddingVertical: 10, alignItems: "center" }}>
                <MaterialIcons name={item.icon as any} size={20} color={item.color} />
                <Text style={{ color: item.color, fontSize: 10, fontWeight: "600", marginTop: 4 }}>{item.label}</Text>
              </View>
            ))}
            <View style={{ flex: 1, backgroundColor: SURFACE.elevated, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: BORDER.medium, paddingVertical: 10, alignItems: "center" }}>
              <Text style={{ color: BRAND.primary, fontSize: 20, fontWeight: "300", lineHeight: 20 }}>+</Text>
              <Text style={{ color: BRAND.primary, fontSize: 10, fontWeight: "600", marginTop: 4 }}>3 more</Text>
            </View>
          </View>
        </View>

        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            backgroundColor: SURFACE.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: BORDER.default,
            padding: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ color: TEXT.primary, fontSize: 15, fontWeight: "700" }}>Activity</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: SEMANTIC.warning }} />
              <Text style={{ color: TEXT.secondary, fontSize: 12 }}>Live · 2 new</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                backgroundColor: `${BRAND.primary}22`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: BRAND.primary, fontSize: 13, fontWeight: "700" }}>M</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: TEXT.light, fontSize: 13, lineHeight: 19, marginBottom: 3 }}>
                <Text style={{ color: TEXT.primary, fontWeight: "700" }}>Marcus</Text> picked DJ Stevenson in the 2nd round
              </Text>
              <Text style={{ color: TEXT.secondary, fontSize: 11 }}>5m ago · {firstLeagueName}</Text>
            </View>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: BORDER.light, marginVertical: 10 }} />

          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                backgroundColor: `${SEMANTIC.info}22`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: SEMANTIC.info, fontSize: 13, fontWeight: "700" }}>T</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: TEXT.light, fontSize: 13, lineHeight: 19, marginBottom: 3 }}>
                <Text style={{ color: TEXT.primary, fontWeight: "700" }}>Tyler</Text> traded Justin Fields for Lamar Jackson
              </Text>
              <Text style={{ color: TEXT.secondary, fontSize: 11 }}>18m ago · {firstLeagueName}</Text>
            </View>
          </View>
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <Text style={{ color: TEXT.primary, fontSize: 15, fontWeight: "700", marginBottom: 10 }}>Quick Access</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/explore" as any)}
              style={{
                flex: 1,
                backgroundColor: SURFACE.card,
                borderWidth: 1,
                borderColor: BORDER.default,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <MaterialIcons name="storefront" size={20} color={BRAND.primary} />
              <Text style={{ color: TEXT.light, fontSize: 12, fontWeight: "600" }}>Store</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)/leaderboards" as any)}
              style={{
                flex: 1,
                backgroundColor: SURFACE.card,
                borderWidth: 1,
                borderColor: BORDER.default,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <MaterialIcons name="military-tech" size={20} color={BRAND.gold} />
              <Text style={{ color: TEXT.light, fontSize: 12, fontWeight: "600" }}>Achievements</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile" as any)}
              style={{
                flex: 1,
                backgroundColor: SURFACE.card,
                borderWidth: 1,
                borderColor: BORDER.default,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <MaterialIcons name="workspace-premium" size={20} color={SEMANTIC.info} />
              <Text style={{ color: TEXT.light, fontSize: 12, fontWeight: "600" }}>Rewards</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <Text style={{ color: TEXT.primary, fontSize: 15, fontWeight: "700", marginBottom: 10 }}>Actions</Text>
          <View style={{ gap: 8 }}>
            {isFeatureEnabled("leagueCreation") && (
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/create-league/step1" as any)}
                style={{
                  backgroundColor: BRAND.primary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: TEXT.primary, fontSize: 15, fontWeight: "700" }}>Create League</Text>
              </TouchableOpacity>
            )}

            {isFeatureEnabled("leagueSearch") && (
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/join-league" as any)}
                style={{
                  backgroundColor: SURFACE.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: BORDER.medium,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: TEXT.primary, fontSize: 15, fontWeight: "600" }}>Join League</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile" as any)}
              style={{
                backgroundColor: SURFACE.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: `${BRAND.primary}66`,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: BRAND.primary, fontSize: 15, fontWeight: "600" }}>Invite Friends</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
