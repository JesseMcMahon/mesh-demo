import { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { SURFACE, TEXT, BORDER, SEMANTIC, BRAND } from "@/constants/colors";
import { useAppTheme } from "@/contexts/theme";
import { useUserProfile } from "@/contexts/user-profile";
import { leagueApi, inviteApi } from "@/lib/api";
import { useNotification } from "@/contexts/notification";
import { TopNavigation } from "@/components/TopNavigation";
import { MeshTextInput } from "@/components/MeshTextInput";
import { MeshButton } from "@/components/MeshButton";
import { SkeletonCardList } from "@/components/Skeleton";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export default function JoinLeagueScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { colors } = useAppTheme();
  const { accessToken } = useUserProfile();
  const { showNotification } = useNotification();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 260);
  const [inviteCode, setInviteCode] = useState(params.code || "");
  const [leaguePasskey, setLeaguePasskey] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "code">(
    params.code ? "code" : "search"
  );

  const {
    data: searchData,
    isLoading: isSearching,
    isError: isSearchError,
    isRefetching: isRefetchingSearch,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchSearch,
  } = useInfiniteQuery({
    queryKey: ["search-leagues", accessToken, debouncedSearch],
    enabled: activeTab === "search",
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      leagueApi.searchPublicLeagues(debouncedSearch, accessToken, {
        page: Number(pageParam),
        pageLimit: 24,
      }),
    getNextPageParam: (lastPage: any) => {
      const payload = lastPage?.data || lastPage;
      const page = Number(payload?.page || 1);
      return payload?.hasMore ? page + 1 : undefined;
    },
    staleTime: 15_000,
    refetchOnMount: true,
  });

  const searchResults = useMemo(() => {
    if (!searchData?.pages?.length) return [];
    return searchData.pages.flatMap((page: any) => {
      const d = page?.data || page;
      if (Array.isArray(d)) return d;
      if (Array.isArray(d?.leagues)) return d.leagues;
      if (Array.isArray(page?.leagues)) return page.leagues;
      if (Array.isArray(page)) return page;
      return [];
    });
  }, [searchData]);

  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      return inviteApi.joinLeagueViaInvite(code, accessToken!, leaguePasskey.trim());
    },
    onSuccess: (result) => {
      showNotification("You joined the league.", "success");
      const leagueId = result.data?.leagueId || result.data?.league?._id;
      if (leagueId) {
        router.replace(`/(tabs)/league/${leagueId}` as any);
      } else {
        router.replace("/(tabs)" as any);
      }
    },
    onError: (error: Error & { status?: number }) => {
      let message = error.message || "Failed to join league";
      if (error.status === 410) message = "This invite has expired or been revoked.";
      if (error.status === 401) message = "Incorrect league passkey.";
      if (error.status === 400 && /passkey/i.test(error.message || "")) {
        message = "This private league requires a passkey.";
      } else if (error.status === 400) {
        message = "You may already be in this league.";
      }
      showNotification(message, "error");
    },
  });

  const validateMutation = useMutation({
    mutationFn: async (code: string) => {
      return inviteApi.validateLeagueInvite(code);
    },
  });

  const handleJoinWithCode = useCallback(() => {
    const code = inviteCode.trim();
    if (!code) {
      showNotification("Enter an invite code.", "error");
      return;
    }
    joinMutation.mutate(code);
  }, [inviteCode, joinMutation, showNotification]);

  const handleValidateCode = useCallback(() => {
    const code = inviteCode.trim();
    if (!code) {
      showNotification("Enter an invite code first.", "error");
      return;
    }
    validateMutation.mutate(code);
  }, [inviteCode, showNotification, validateMutation]);

  const renderLeagueItem = ({ item }: { item: any }) => {
    const league = item.league || item;
    const name = league?.name || "Unnamed League";
    const communityTypeRaw = league?.communityType;
    const communityType =
      typeof communityTypeRaw === "string"
        ? communityTypeRaw
        : communityTypeRaw?.type || communityTypeRaw?.name || "General";
    const memberCount = league?.memberCount ?? league?.currentMemberCount ?? 0;
    const leagueSize = league?.leagueSize ?? league?.maxSize ?? "--";
    const isPublicLeague = league?.isPublic !== false;

    return (
      <TouchableOpacity
        onPress={() =>
          router.push(`/(tabs)/league/${league._id || league.id}` as any)
        }
        style={{
          backgroundColor: SURFACE.card,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: BORDER.default,
          padding: 16,
          marginBottom: 12,
          overflow: "hidden",
        }}
        activeOpacity={0.85}
      >
        <View
          style={{
            position: "absolute",
            top: -24,
            right: -16,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: `${colors.primary}18`,
          }}
        />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: `${colors.primary}22`,
              borderWidth: 1,
              borderColor: `${colors.primary}44`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#FFF", fontSize: 22, fontWeight: "800" }}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFF", fontSize: 17, fontWeight: "700" }} numberOfLines={1}>
              {name}
            </Text>
            <Text style={{ color: TEXT.secondary, fontSize: 13, marginTop: 3 }} numberOfLines={1}>
              {communityType}
            </Text>
          </View>

          <MaterialIcons name="chevron-right" size={24} color={TEXT.tertiary} />
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            flexWrap: "wrap",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: SURFACE.elevated,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
            }}
          >
            <MaterialIcons name="groups" size={12} color={TEXT.light} />
            <Text style={{ color: TEXT.light, fontSize: 12, fontWeight: "600" }}>
              {memberCount}/{leagueSize} members
            </Text>
          </View>

          <View
            style={{
              backgroundColor: isPublicLeague ? `${BRAND.gold}22` : "#FF980022",
              borderColor: isPublicLeague ? `${BRAND.gold}55` : "#FF980055",
              borderWidth: 1,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                color: isPublicLeague ? BRAND.gold : "#FFB74D",
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              {isPublicLeague ? "Public" : "Private"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE.background }}>
      <TopNavigation title="Join League" showBackButton />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <View
            style={{
              borderRadius: 18,
              borderWidth: 1,
              borderColor: BORDER.default,
              backgroundColor: SURFACE.card,
              padding: 16,
              marginBottom: 16,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                position: "absolute",
                right: -40,
                top: -30,
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: `${colors.primary}16`,
              }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: `${colors.primary}25`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons
                  name={activeTab === "search" ? "travel-explore" : "vpn-key"}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFF", fontSize: 17, fontWeight: "700" }}>
                  {activeTab === "search" ? "Find Public Leagues" : "Join with Invite Code"}
                </Text>
                <Text style={{ color: TEXT.secondary, fontSize: 13, marginTop: 3 }}>
                  {activeTab === "search"
                    ? "Browse open leagues and join in one tap."
                    : "Use an invite code and passkey when required."}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              backgroundColor: SURFACE.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: BORDER.default,
              padding: 4,
              gap: 6,
            }}
          >
            {(["search", "code"] as const).map((tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    paddingVertical: 11,
                    borderRadius: 10,
                    backgroundColor: active ? colors.primary : "transparent",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: active ? "#FFF" : TEXT.secondary,
                      fontWeight: "700",
                      fontSize: 13,
                      letterSpacing: 0.2,
                    }}
                  >
                    {tab === "search" ? "Search" : "Code"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          {activeTab === "search" ? (
            <>
              <MeshTextInput
                startIcon={{ name: "search" }}
                placeholder="Search by league name or city"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                returnKeyType="search"
              />

              {isSearching ? (
                <View style={{ paddingTop: 14 }}>
                  <SkeletonCardList count={5} cardHeight={90} />
                </View>
              ) : isSearchError ? (
                <View className="items-center py-12">
                  <MaterialIcons name="error-outline" size={48} color={SEMANTIC.error} />
                  <Text
                    style={{
                      color: TEXT.secondary,
                      fontSize: 16,
                      marginTop: 12,
                      textAlign: "center",
                    }}
                  >
                    Couldn’t load leagues right now.
                  </Text>
                </View>
              ) : searchResults.length === 0 ? (
                <View className="items-center py-12">
                  <MaterialIcons
                    name={searchQuery ? "search-off" : "sports-football"}
                    size={52}
                    color={TEXT.tertiary}
                  />
                  <Text
                    style={{
                      color: TEXT.secondary,
                      fontSize: 16,
                      marginTop: 12,
                      textAlign: "center",
                    }}
                  >
                    {searchQuery
                      ? `No matches for "${searchQuery}"`
                      : "No public leagues are open right now."}
                  </Text>
                  <View style={{ marginTop: 12, width: 220 }}>
                    <MeshButton
                      title={searchQuery ? "Clear search" : "Create league"}
                      onPress={() =>
                        searchQuery
                          ? setSearchQuery("")
                          : router.push("/(tabs)/create-league/step1" as any)
                      }
                      variant={searchQuery ? "secondary" : "primary"}
                      height="small"
                    />
                  </View>
                </View>
              ) : (
                <FlatList
                  data={searchResults}
                  renderItem={renderLeagueItem}
                  keyExtractor={(item, index) =>
                    item._id || item.id || item?.league?._id || String(index)
                  }
                  refreshControl={
                    <RefreshControl
                      refreshing={isRefetchingSearch}
                      onRefresh={() => refetchSearch()}
                      tintColor={colors.primary}
                    />
                  }
                  ListFooterComponent={
                    hasNextPage ? (
                      <TouchableOpacity
                        onPress={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        style={{
                          marginTop: 8,
                          marginBottom: 4,
                          backgroundColor: SURFACE.elevated,
                          borderWidth: 1,
                          borderColor: BORDER.medium,
                          borderRadius: 12,
                          paddingVertical: 10,
                          alignItems: "center",
                        }}
                      >
                        {isFetchingNextPage ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Text style={{ color: "#FFF", fontWeight: "600" }}>
                            Load more
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : null
                  }
                  contentContainerStyle={{ paddingTop: 14 }}
                  scrollEnabled={false}
                />
              )}
            </>
          ) : (
            <View
              style={{
                backgroundColor: SURFACE.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: BORDER.default,
                padding: 16,
              }}
            >
              <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>
                Private league access
              </Text>
              <Text style={{ color: TEXT.secondary, fontSize: 14, marginTop: 6 }}>
                Enter an invite code. Add passkey if prompted.
              </Text>

              <View style={{ marginTop: 14 }}>
                <MeshTextInput
                  startIcon={{ name: "vpn-key" }}
                  placeholder="Invite code (e.g. ABC123)"
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>

              {(validateMutation.data?.data?.league?.requiresPasskey ||
                validateMutation.data?.data?.league?.hasPrivatePasskey) && (
                <View style={{ marginTop: 12 }}>
                  <MeshTextInput
                    startIcon={{ name: "lock" }}
                    placeholder="Enter league passkey"
                    value={leaguePasskey}
                    onChangeText={setLeaguePasskey}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}>
                  <MeshButton
                    title="Check Code"
                    onPress={handleValidateCode}
                    loading={validateMutation.isPending}
                    disabled={!inviteCode.trim() || validateMutation.isPending}
                    variant="secondary"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <MeshButton
                    title="Join League"
                    onPress={handleJoinWithCode}
                    loading={joinMutation.isPending}
                    disabled={
                      !inviteCode.trim() ||
                      joinMutation.isPending ||
                      ((validateMutation.data?.data?.league?.requiresPasskey ||
                        validateMutation.data?.data?.league?.hasPrivatePasskey) &&
                        !leaguePasskey.trim())
                    }
                  />
                </View>
              </View>

              {validateMutation.data?.data?.league && (
                <View
                  style={{
                    backgroundColor: SURFACE.elevated,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: BORDER.medium,
                    padding: 12,
                    marginTop: 14,
                  }}
                >
                  <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "700" }}>
                    {validateMutation.data.data.league.name}
                  </Text>
                  {validateMutation.data.data.league.description ? (
                    <Text style={{ color: TEXT.secondary, fontSize: 13, marginTop: 4 }}>
                      {validateMutation.data.data.league.description}
                    </Text>
                  ) : null}
                </View>
              )}

              {(validateMutation.error || joinMutation.isError) && (
                <Text
                  style={{
                    color: SEMANTIC.error,
                    fontSize: 13,
                    marginTop: 12,
                    textAlign: "center",
                  }}
                >
                  {(
                    (joinMutation.error as Error)?.message ||
                    (validateMutation.error as Error)?.message ||
                    "Couldn’t process invite code."
                  )}
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
