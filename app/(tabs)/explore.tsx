import { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MeshTextInput } from "@/components/MeshTextInput";
import { SkeletonCardList } from "@/components/Skeleton";
import { ScreenState } from "@/components/ui/ScreenState";
import { MeshImage } from "@/components/ui/MeshImage";
import { useUserProfile } from "@/contexts/user-profile";
import { leagueApi } from "@/lib/api";
import { ACCENT, BORDER, BRAND, SURFACE, TEXT } from "@/constants/colors";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

type ExploreFilterKey = "all" | "public" | "private" | "local" | "nationwide" | "open";

type ExploreLeague = Record<string, any>;

const FILTERS: { key: ExploreFilterKey; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: "all", label: "All", icon: "dashboard" },
  { key: "public", label: "Public", icon: "public" },
  { key: "private", label: "Private", icon: "lock" },
  { key: "local", label: "Local", icon: "place" },
  { key: "nationwide", label: "Nationwide", icon: "flag" },
  { key: "open", label: "Open Spots", icon: "groups" },
];

function toTitleCase(value: string) {
  if (!value) return "";
  return value
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getLeagueIdentity(item: ExploreLeague) {
  const league = item?.league || item;
  return {
    league,
    id: String(league?._id || league?.id || ""),
  };
}

function isPrivateLeague(league: ExploreLeague) {
  return Boolean(league?.hasPrivatePasskey || league?.isPublic === false);
}

function getLocationLabel(league: ExploreLeague) {
  const scope = String(league?.location?.scope || "").toLowerCase();
  if (scope === "nationwide") return "Nationwide";

  const city = String(league?.location?.city || "").trim();
  const stateCode = String(league?.location?.stateCode || "").trim().toUpperCase();
  if (city && stateCode) return `${city}, ${stateCode}`;
  if (city) return city;

  const address = String(league?.address || "").trim();
  if (!address) return "Location TBD";
  if (/nationwide/i.test(address)) return "Nationwide";

  const parts = address
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
  }

  return address;
}

function isNationwideLeague(league: ExploreLeague) {
  const scope = String(league?.location?.scope || "").toLowerCase();
  if (scope) return scope === "nationwide";
  const address = String(league?.address || "").toLowerCase();
  return address.includes("nationwide");
}

function getOwnerHandle(league: ExploreLeague) {
  const username = String(
    league?.creator?.username ||
      league?.creator?.userName ||
      league?.creator?.name ||
      league?.creatorUsername ||
      "mesh_commish"
  ).trim();
  if (!username) return "@mesh_commish";
  return username.startsWith("@") ? username : `@${username}`;
}

function getMemberCounts(league: ExploreLeague) {
  const memberCount = Number(league?.memberCount ?? league?.membersCount ?? 0);
  const leagueSize = Number(league?.leagueSize ?? league?.maxSize ?? 0);
  return {
    memberCount: Number.isFinite(memberCount) ? memberCount : 0,
    leagueSize: Number.isFinite(leagueSize) ? leagueSize : 0,
  };
}

function getStateBadgeLabel(league: ExploreLeague) {
  const draftStatus = String(league?.draftStatus || league?.draft?.status || "").toLowerCase();
  if (draftStatus === "in_progress") return "Drafting";
  if (draftStatus === "completed") return "In Season";

  const week = Number(league?.currentWeek || league?.week || 0);
  if (week > 0) return `Week ${week}`;

  const { memberCount, leagueSize } = getMemberCounts(league);
  if (leagueSize > 0 && memberCount >= leagueSize) return "Ready";
  return "Pre-season";
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useUserProfile();

  const [leagueNameQuery, setLeagueNameQuery] = useState("");
  const [cityStateQuery, setCityStateQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ExploreFilterKey>("all");

  const debouncedLeagueName = useDebouncedValue(leagueNameQuery.trim(), 260);
  const debouncedCityState = useDebouncedValue(cityStateQuery.trim(), 260);

  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["explore-leagues", accessToken, debouncedLeagueName, debouncedCityState],
    enabled: true,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      leagueApi.searchPublicLeagues(
        {
          nameQuery: debouncedLeagueName,
          cityStateQuery: debouncedCityState,
        },
        accessToken,
        {
          page: Number(pageParam),
          pageLimit: 24,
        }
      ),
    getNextPageParam: (lastPage: any) => {
      const payload = lastPage?.data || lastPage;
      const page = Number(payload?.page || 1);
      return payload?.hasMore ? page + 1 : undefined;
    },
    staleTime: 15_000,
    refetchOnMount: true,
  });

  const leagues = useMemo<ExploreLeague[]>(() => {
    if (!data?.pages?.length) return [];
    return data.pages.flatMap((page: any) => {
      const payload = page?.data || page;
      if (Array.isArray(payload?.leagues)) return payload.leagues;
      if (Array.isArray(page?.leagues)) return page.leagues;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(page)) return page;
      return [];
    });
  }, [data]);

  const filteredLeagues = useMemo(() => {
    if (activeFilter === "all") return leagues;

    return leagues.filter((item) => {
      const { league } = getLeagueIdentity(item);
      const privateLeague = isPrivateLeague(league);
      const nationwide = isNationwideLeague(league);
      const { memberCount, leagueSize } = getMemberCounts(league);
      const hasOpenSpots = leagueSize <= 0 || memberCount < leagueSize;

      if (activeFilter === "public") return !privateLeague;
      if (activeFilter === "private") return privateLeague;
      if (activeFilter === "local") return !nationwide;
      if (activeFilter === "nationwide") return nationwide;
      if (activeFilter === "open") return hasOpenSpots;
      return true;
    });
  }, [leagues, activeFilter]);

  const hasActiveSearch = Boolean(leagueNameQuery.trim() || cityStateQuery.trim());

  const resultsLabel = useMemo(() => {
    const count = filteredLeagues.length;
    if (cityStateQuery.trim()) {
      return `${count} ${count === 1 ? "league" : "leagues"} near ${cityStateQuery.trim()}`;
    }
    if (leagueNameQuery.trim()) {
      return `${count} ${count === 1 ? "league" : "leagues"} matching \"${leagueNameQuery.trim()}\"`;
    }
    return `${count} ${count === 1 ? "league" : "leagues"} available`;
  }, [filteredLeagues.length, cityStateQuery, leagueNameQuery]);

  const listHeader = (
    <View>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text style={{ color: TEXT.primary, fontSize: 28, fontWeight: "800", letterSpacing: -0.6 }}>
          Explore Leagues
        </Text>
        <Text style={{ color: TEXT.secondary, fontSize: 13, marginTop: 2 }}>
          Find your next competition
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4, gap: 8 }}>
        <MeshTextInput
          placeholder="League name..."
          value={leagueNameQuery}
          onChangeText={setLeagueNameQuery}
          startIcon={{ name: "search", color: TEXT.tertiary, size: 18 }}
          endIcon={
            leagueNameQuery
              ? { name: "close", color: TEXT.secondary, onPress: () => setLeagueNameQuery("") }
              : undefined
          }
          className="rounded-xl text-[14px]"
          style={{
            backgroundColor: SURFACE.card,
            borderWidth: 1,
            borderColor: BORDER.default,
            height: 44,
            paddingVertical: 11,
          }}
        />

        <MeshTextInput
          placeholder="City, State"
          value={cityStateQuery}
          onChangeText={setCityStateQuery}
          startIcon={{ name: "location-on", color: cityStateQuery ? BRAND.primary : TEXT.tertiary, size: 18 }}
          endIcon={
            cityStateQuery
              ? { name: "close", color: BRAND.primary, onPress: () => setCityStateQuery("") }
              : undefined
          }
          className="rounded-xl text-[14px]"
          style={{
            backgroundColor: SURFACE.card,
            borderWidth: 1,
            borderColor: BORDER.default,
            height: 44,
            paddingVertical: 11,
          }}
        />
      </View>

      <View style={{ paddingTop: 8, paddingBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {FILTERS.map((chip) => {
            const isActive = chip.key === activeFilter;
            return (
              <TouchableOpacity
                key={chip.key}
                onPress={() => setActiveFilter(chip.key)}
                activeOpacity={0.85}
                style={{
                  marginRight: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: isActive ? BRAND.primary : BORDER.medium,
                  backgroundColor: isActive ? BRAND.primary : SURFACE.card,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <MaterialIcons
                  name={chip.icon}
                  size={13}
                  color={isActive ? SURFACE.background : TEXT.secondary}
                />
                <Text
                  style={{
                    color: isActive ? SURFACE.background : TEXT.secondary,
                    fontSize: 12,
                    fontWeight: isActive ? "700" : "600",
                  }}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
        <Text style={{ color: TEXT.secondary, fontSize: 12 }}>{resultsLabel}</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: SURFACE.background }}>
        {listHeader}
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonCardList count={5} cardHeight={240} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: SURFACE.background }}>
        {listHeader}
        <ScreenState
          icon="error-outline"
          title="Couldn’t load leagues"
          subtitle="Pull to refresh or try again."
          actionLabel="Try again"
          onAction={() => refetch()}
          containerStyle={{ marginTop: 10 }}
        />
      </View>
    );
  }

  const keyExtractor = (item: any, index: number) => {
    const { id } = getLeagueIdentity(item);
    return id || String(index);
  };

  const onEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderItem = ({ item }: { item: ExploreLeague }) => {
      const { league, id } = getLeagueIdentity(item);
      const leagueName = String(league?.name || "Unnamed League");
      const locationLabel = getLocationLabel(league);
      const ownerHandle = getOwnerHandle(league);
      const isPrivate = isPrivateLeague(league);
      const { memberCount, leagueSize } = getMemberCounts(league);
      const hasOpenSpots = leagueSize <= 0 || memberCount < leagueSize;
      const stateLabel = getStateBadgeLabel(league);

      const communityType = toTitleCase(String(league?.communityType || "Season"));
      const leagueType = toTitleCase(String(league?.leagueType || "League"));
      const ctaLabel = isPrivate ? "Enter Passkey" : "View League";

      const occupancyPct =
        leagueSize > 0 ? Math.max(0, Math.min(1, memberCount / leagueSize)) : 0;

      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => id && router.push(`/(tabs)/league/${id}` as any)}
          style={{
            backgroundColor: SURFACE.card,
            borderWidth: 1,
            borderColor: BORDER.default,
            borderRadius: 16,
            marginBottom: 12,
            overflow: "hidden",
          }}
        >
          <View style={{ height: 104, position: "relative" }}>
            <MeshImage
              source={league?.imageUrl ? { uri: String(league.imageUrl) } : require("@/assets/images/meshBannerBackground.png")}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
            <LinearGradient
              colors={["rgba(7,13,20,0.2)", "rgba(9,17,28,0.9)"]}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />

            <View
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                right: 10,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View
                  style={{
                    borderRadius: 7,
                    borderWidth: 1,
                    borderColor: ACCENT.primaryBorder,
                    backgroundColor: ACCENT.primaryBgMedium,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ color: BRAND.primary, fontSize: 10, fontWeight: "800", letterSpacing: 0.35 }}>
                    {stateLabel.toUpperCase()}
                  </Text>
                </View>

                <View
                  style={{
                    borderRadius: 7,
                    borderWidth: 1,
                    borderColor: BORDER.medium,
                    backgroundColor: "rgba(6, 10, 16, 0.48)",
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <MaterialIcons
                    name={isPrivate ? "lock" : "public"}
                    size={10}
                    color={isPrivate ? TEXT.secondary : TEXT.light}
                  />
                  <Text style={{ color: TEXT.light, fontSize: 10, fontWeight: "600" }}>
                    {isPrivate ? "Private" : "Public"}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  borderRadius: 7,
                  borderWidth: 1,
                  borderColor: BORDER.medium,
                  backgroundColor: "rgba(6, 10, 16, 0.54)",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  alignItems: "flex-end",
                }}
              >
                <Text style={{ color: BRAND.primary, fontSize: 12, fontWeight: "700" }}>
                  {leagueSize > 0 ? `${memberCount}/${leagueSize}` : `${memberCount}`}
                </Text>
                <Text style={{ color: TEXT.secondary, fontSize: 9, marginTop: -1 }}>members</Text>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: TEXT.primary, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 }}
                  numberOfLines={1}
                >
                  {leagueName}
                </Text>
                <Text style={{ color: TEXT.secondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {communityType} · {locationLabel}
                </Text>
              </View>
              <Text style={{ color: hasOpenSpots ? BRAND.primary : TEXT.secondary, fontSize: 11, fontWeight: "700" }}>
                {hasOpenSpots ? "Open" : "Full"}
              </Text>
            </View>

            <Text style={{ color: TEXT.secondary, fontSize: 11, marginTop: 7 }}>
              by <Text style={{ color: BRAND.primary, fontWeight: "700" }}>{ownerHandle}</Text>
            </Text>

            <View style={{ flexDirection: "row", gap: 6, marginTop: 9 }}>
              <View style={{ backgroundColor: SURFACE.elevated, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: TEXT.secondary, fontSize: 10, fontWeight: "600" }}>{leagueType}</Text>
              </View>
              <View style={{ backgroundColor: SURFACE.elevated, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: TEXT.secondary, fontSize: 10, fontWeight: "600" }}>
                  {isNationwideLeague(league) ? "Nationwide" : "Local"}
                </Text>
              </View>
              {league?.hasPrivatePasskey ? (
                <View
                  style={{
                    backgroundColor: ACCENT.primaryBgLight,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: ACCENT.primaryBorder,
                  }}
                >
                  <Text style={{ color: BRAND.primary, fontSize: 10, fontWeight: "700" }}>Passkey</Text>
                </View>
              ) : null}
            </View>

            {leagueSize > 0 ? (
              <View style={{ marginTop: 10 }}>
                <View
                  style={{
                    width: "100%",
                    height: 5,
                    borderRadius: 999,
                    backgroundColor: SURFACE.elevated,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${Math.round(occupancyPct * 100)}%`,
                      maxWidth: "100%",
                      height: "100%",
                      backgroundColor: BRAND.primary,
                    }}
                  />
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={() => id && router.push(`/(tabs)/league/${id}` as any)}
              activeOpacity={0.9}
              style={{
                marginTop: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: BRAND.primary,
                backgroundColor: isPrivate ? "transparent" : BRAND.primary,
                paddingVertical: 11,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 7,
              }}
            >
              {isPrivate ? <MaterialIcons name="lock" size={14} color={BRAND.primary} /> : null}
              <Text
                style={{
                  color: isPrivate ? BRAND.primary : TEXT.primary,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                {ctaLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    };

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE.background }}>
      <FlatList
        data={filteredLeagues}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={BRAND.primary} />
        }
        onEndReachedThreshold={0.35}
        onEndReached={onEndReached}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={6}
        removeClippedSubviews
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ paddingVertical: 18 }}>
              <ActivityIndicator size="small" color={BRAND.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <ScreenState
            icon="travel-explore"
            title="No leagues found"
            subtitle={
              hasActiveSearch
                ? "Try a different name or city filter."
                : "No public leagues are open right now."
            }
            actionLabel={hasActiveSearch ? "Clear filters" : "Create league"}
            onAction={() => {
              if (hasActiveSearch) {
                setLeagueNameQuery("");
                setCityStateQuery("");
                setActiveFilter("all");
                return;
              }
              router.push("/(tabs)/create-league/step1" as any);
            }}
          />
        }
        renderItem={renderItem}
      />
    </View>
  );
}
