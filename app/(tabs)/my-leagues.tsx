import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { TopNavigation } from "@/components/TopNavigation";
import { SURFACE, TEXT, BORDER, BRAND } from "@/constants/colors";
import { useUserProfile } from "@/contexts/user-profile";
import { leagueApi } from "@/lib/api";
import { SkeletonCardList } from "@/components/Skeleton";
import { ScreenState } from "@/components/ui/ScreenState";
import { MeshImage } from "@/components/ui/MeshImage";

interface LeagueMembership {
  league: any;
  roles: string[];
  squadId: string | null;
  squad: { name: string; imageUrl: string } | null;
  membershipId: string;
  joinedAt: string;
  seasonLifecycle?: {
    key?: string;
    label?: string;
  } | null;
}

export default function MyLeaguesScreen() {
  const router = useRouter();
  const { accessToken } = useUserProfile();
  const [filter, setFilter] = useState<"all" | "withSquad" | "noSquad">("all");

  const { data, isLoading, isError, isRefetching, refetch } = useQuery({
    queryKey: ["my-leagues-screen", accessToken],
    enabled: !!accessToken,
    queryFn: () => leagueApi.getMyLeagues(accessToken),
    staleTime: 30_000,
  });

  const leagues = useMemo(() => {
    const raw = Array.isArray(data) ? data : [];
    const normalized = raw
      .map((item: any) => ({
        league: item?.league || item,
        roles: item?.roles || [],
        squadId: item?.squadId || null,
        squad: item?.squad || null,
        membershipId: item?.membershipId || item?._id || item?.id,
        joinedAt: item?.joinedAt || "",
        seasonLifecycle: item?.seasonLifecycle || item?.homeSnapshot?.state || null,
      }))
      .filter((entry: LeagueMembership) => Boolean(entry?.league?._id || entry?.league?.id));

    if (filter === "withSquad") return normalized.filter((entry) => Boolean(entry.squadId));
    if (filter === "noSquad") return normalized.filter((entry) => !entry.squadId);
    return normalized;
  }, [data, filter]);

  const keyExtractor = useCallback(
    (item: LeagueMembership, idx: number) =>
      String(item?.league?._id || item?.league?.id || item?.membershipId || idx),
    []
  );

  const renderLeagueItem = useCallback(
    ({ item }: { item: LeagueMembership }) => {
      const league = item.league;
      const id = league?._id || league?.id;
      const memberCount = league?.memberCount ?? 0;
      const size = league?.leagueSize ?? "--";
      const lifecycleLabel = String(item?.seasonLifecycle?.label || "").trim();

      return (
        <TouchableOpacity
          onPress={() => id && router.push(`/(tabs)/league/${id}` as any)}
          activeOpacity={0.84}
          style={{
            marginBottom: 10,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: BORDER.default,
            backgroundColor: SURFACE.card,
            padding: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {league?.imageUrl ? (
              <MeshImage
                source={{ uri: String(league.imageUrl) }}
                style={{ width: 44, height: 44, borderRadius: 12 }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: `${BRAND.primary}22`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: TEXT.primary, fontWeight: "800", fontSize: 18 }}>
                  {String(league?.name || "L").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: TEXT.primary, fontWeight: "700", fontSize: 16 }} numberOfLines={1}>
                {league?.name || "Unnamed League"}
              </Text>
              <Text style={{ color: TEXT.secondary, fontSize: 12 }} numberOfLines={1}>
                {memberCount}/{size} members
              </Text>
            </View>
            {lifecycleLabel ? (
              <View
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: BORDER.medium,
                  backgroundColor: SURFACE.elevated,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  marginRight: 4,
                }}
              >
                <Text style={{ color: BRAND.primary, fontSize: 10, fontWeight: "700" }}>
                  {lifecycleLabel}
                </Text>
              </View>
            ) : null}
            <MaterialIcons name="chevron-right" size={22} color={TEXT.tertiary} />
          </View>

          {item?.squad?.name ? (
            <View
              style={{
                marginTop: 10,
                backgroundColor: `${BRAND.gold}20`,
                borderWidth: 1,
                borderColor: `${BRAND.gold}50`,
                borderRadius: 999,
                alignSelf: "flex-start",
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: BRAND.gold, fontSize: 12, fontWeight: "700" }}>
                Your squad: {item.squad.name}
              </Text>
            </View>
          ) : (
            <View
              style={{
                marginTop: 10,
                backgroundColor: SURFACE.elevated,
                borderRadius: 999,
                alignSelf: "flex-start",
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: TEXT.secondary, fontSize: 12, fontWeight: "700" }}>
                Join a squad to unlock lineup votes
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [router]
  );

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE.background }}>
      <TopNavigation title="My Leagues" />

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <View
          style={{
            backgroundColor: SURFACE.card,
            borderWidth: 1,
            borderColor: BORDER.default,
            borderRadius: 14,
            padding: 4,
            flexDirection: "row",
            gap: 6,
          }}
        >
          {[
            { key: "all" as const, label: "All" },
            { key: "withSquad" as const, label: "In Squad" },
            { key: "noSquad" as const, label: "Need Squad" },
          ].map((item) => {
            const active = filter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: "center",
                  backgroundColor: active ? BRAND.primary : "transparent",
                }}
              >
                <Text style={{ color: active ? TEXT.primary : TEXT.secondary, fontWeight: "700", fontSize: 12 }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <SkeletonCardList count={7} cardHeight={86} />
        </View>
      ) : isError ? (
        <ScreenState
          icon="error-outline"
          title="Couldn’t load your leagues"
          subtitle="Pull to refresh or try again."
          actionLabel="Try again"
          onAction={() => refetch()}
          containerStyle={{ flex: 1 }}
        />
      ) : (
        <FlatList
          data={leagues}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={BRAND.primary} />
          }
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
          initialNumToRender={10}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            <ScreenState
              icon="emoji-events"
              title="No leagues here"
              subtitle="Join or create a league to get started."
              actionLabel="Find leagues"
              onAction={() => router.push("/(tabs)/join-league" as any)}
            />
          }
          renderItem={renderLeagueItem}
        />
      )}
    </View>
  );
}
