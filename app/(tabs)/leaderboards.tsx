import { View, Text, ScrollView } from "react-native";
import { useQueries } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { TopNavigation } from "@/components/TopNavigation";
import { SURFACE, TEXT, BORDER, BRAND } from "@/constants/colors";
import { leaderboardApi } from "@/lib/api";
import { MeshButton } from "@/components/MeshButton";
import { SkeletonBlock } from "@/components/Skeleton";

export default function LeaderboardsScreen() {
  const [largestLeaguesQuery, topSquadsQuery, topPerformersQuery] = useQueries({
    queries: [
      {
        queryKey: ["leaderboard-largest-leagues"],
        queryFn: () => leaderboardApi.getLargestLeagues(8),
        staleTime: 60_000,
      },
      {
        queryKey: ["leaderboard-top-squads"],
        queryFn: () => leaderboardApi.getHighestScoringSquads(8),
        staleTime: 60_000,
      },
      {
        queryKey: ["leaderboard-top-performers"],
        queryFn: () => leaderboardApi.getTopPerformers(8),
        staleTime: 60_000,
      },
    ],
  });

  const largestLeagues =
    (largestLeaguesQuery.data as any)?.output?.list ||
    (largestLeaguesQuery.data as any)?.output?.data?.list ||
    (largestLeaguesQuery.data as any)?.data ||
    [];
  const topSquads =
    (topSquadsQuery.data as any)?.output?.data ||
    (topSquadsQuery.data as any)?.output?.list ||
    (topSquadsQuery.data as any)?.data ||
    [];
  const topPerformers =
    (topPerformersQuery.data as any)?.output?.data ||
    (topPerformersQuery.data as any)?.output?.list ||
    (topPerformersQuery.data as any)?.data ||
    [];

  const loading =
    largestLeaguesQuery.isLoading ||
    topSquadsQuery.isLoading ||
    topPerformersQuery.isLoading;

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE.background }}>
      <TopNavigation title="Leaderboards" />
      {loading ? (
        <View style={{ padding: 16 }}>
          {Array.from({ length: 3 }).map((_, sectionIndex) => (
            <View
              key={`leaderboard-skeleton-${sectionIndex}`}
              style={{
                marginBottom: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: BORDER.default,
                backgroundColor: SURFACE.card,
                padding: 14,
              }}
            >
              <SkeletonBlock width="44%" height={16} style={{ marginBottom: 12 }} />
              <SkeletonBlock width="100%" height={12} style={{ marginBottom: 10 }} />
              <SkeletonBlock width="100%" height={12} style={{ marginBottom: 10 }} />
              <SkeletonBlock width="100%" height={12} />
            </View>
          ))}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {[
            {
              title: "Largest Leagues",
              icon: "groups",
              rows: largestLeagues,
            },
            {
              title: "Top Squads",
              icon: "emoji-events",
              rows: topSquads,
            },
            {
              title: "Top Performers",
              icon: "local-fire-department",
              rows: topPerformers,
            },
          ].map((section) => (
            <View
              key={section.title}
              style={{
                marginBottom: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: BORDER.default,
                backgroundColor: SURFACE.card,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: BORDER.default,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <MaterialIcons name={section.icon as any} size={18} color={BRAND.gold} />
                <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 16 }}>
                  {section.title}
                </Text>
              </View>

              {Array.isArray(section.rows) && section.rows.length > 0 ? (
                section.rows.slice(0, 8).map((row: any, index: number) => (
                  <View
                    key={`${section.title}-${index}`}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: BORDER.lightest,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Text style={{ color: TEXT.secondary, width: 20, fontWeight: "700" }}>
                      {index + 1}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#FFF", fontWeight: "600" }} numberOfLines={1}>
                        {row?.team || row?.league || row?.player || row?.name || "Unknown"}
                      </Text>
                      <Text style={{ color: TEXT.secondary, fontSize: 12 }} numberOfLines={1}>
                        {row?.category?.name || row?.leagueName || row?.subtitle || "Mesh ranking"}
                      </Text>
                    </View>
                    <Text style={{ color: BRAND.gold, fontWeight: "800" }}>
                      {row?.points ?? row?.totalPoints ?? row?.score ?? row?.count ?? "—"}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={{ padding: 16, alignItems: "center" }}>
                  <Text style={{ color: TEXT.secondary }}>No leaderboard data yet.</Text>
                  <View style={{ width: 200, marginTop: 10 }}>
                    <MeshButton
                      title="Refresh"
                      onPress={() => {
                        largestLeaguesQuery.refetch();
                        topSquadsQuery.refetch();
                        topPerformersQuery.refetch();
                      }}
                      variant="secondary"
                      height="small"
                    />
                  </View>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
