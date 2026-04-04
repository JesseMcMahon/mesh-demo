import React, { useMemo } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { TopNavigation } from "@/components/TopNavigation";
import { BRAND, BORDER, SURFACE, TEXT } from "@/constants/colors";
import {
  useLeagueStandings,
  useWeekState,
} from "@/hooks/useFantasyV2";
import { leaderboardApiV2 } from "@/lib/api";
import { useUserProfile } from "@/contexts/user-profile";
import { useLeagueData } from "@/contexts/league-data";
import { backOrReplace } from "@/lib/navigation";

function asId(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (typeof value.$oid === "string") return value.$oid;
    if (typeof value._id === "string") return value._id;
    if (typeof value.id === "string") return value.id;
  }
  return null;
}

export default function StandingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const queryClient = useQueryClient();
  const { accessToken } = useUserProfile();
  const { squads } = useLeagueData();

  const { data: standingsData, isLoading: standingsLoading } = useLeagueStandings(id);
  const { data: weekStateData, isLoading: weekLoading } = useWeekState(id);

  const weekStates = useMemo(() => {
    const states = (weekStateData as any)?.states;
    if (!Array.isArray(states)) return [];
    return [...states].sort((a, b) => Number(a.week || 0) - Number(b.week || 0));
  }, [weekStateData]);

  const currentWeek = useMemo(() => {
    if (!weekStates.length) return 1;
    const active = weekStates.find(
      (state: any) => state.status === "active" || state.status === "processing"
    );
    return Number(active?.week || weekStates.find((state: any) => state.status === "upcoming")?.week || 1);
  }, [weekStates]);

  const standings = useMemo(() => {
    const rows = (standingsData as any)?.standings;
    return Array.isArray(rows) ? rows : [];
  }, [standingsData]);

  const squadNameById = useMemo(() => {
    const map = new Map<string, string>();
    (squads || []).forEach((squad: any) => {
      const squadId = asId(squad?._id || squad?.id);
      if (squadId) {
        map.set(squadId, squad?.name || "Squad");
      }
    });
    return map;
  }, [squads]);

  const [weeklyHighScore, setWeeklyHighScore] = React.useState<any>(null);
  React.useEffect(() => {
    let mounted = true;
    if (!id || !accessToken) return;

    leaderboardApiV2
      .getWeeklyHighScore(id, currentWeek, accessToken)
      .then((data) => {
        if (mounted) setWeeklyHighScore(data?.winner || null);
      })
      .catch(() => {
        if (mounted) setWeeklyHighScore(null);
      });

    return () => {
      mounted = false;
    };
  }, [id, accessToken, currentWeek]);

  const onRefresh = async () => {
    if (!id || !accessToken) return;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["v2-league-standings", id, accessToken],
      }),
      queryClient.invalidateQueries({
        queryKey: ["v2-week-state", id, accessToken],
      }),
    ]);
  };

  const isLoading = standingsLoading || weekLoading;

  return (
    <View style={styles.screen}>
      <TopNavigation
        title="Standings"
        showBackButton
        onBackPress={() => backOrReplace(router, `/(tabs)/league/${id}` as any)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor={BRAND.primary}
          />
        }
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Week {currentWeek} Snapshot</Text>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroLabel}>Teams Ranked</Text>
              <Text style={styles.heroValue}>{standings.length}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroLabel}>High Score</Text>
              <Text style={styles.heroValue}>
                {weeklyHighScore?.score?.toFixed?.(1) ?? "--"}
              </Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={BRAND.primary} />
            <Text style={styles.loadingText}>Loading standings...</Text>
          </View>
        ) : standings.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="leaderboard" color={TEXT.secondary} size={28} />
            <Text style={styles.emptyTitle}>No standings yet</Text>
            <Text style={styles.emptySubtitle}>
              Standings will appear after matchups finalize.
            </Text>
          </View>
        ) : (
          <View style={styles.tableCard}>
            {standings.map((row: any, index: number) => {
              const rowSquadId = asId(row?.squadId);
              const squadName =
                (rowSquadId && squadNameById.get(rowSquadId)) || `Squad ${index + 1}`;

              return (
                <View
                  key={`${asId(row?.squadId) || row?.squadId || index}`}
                  style={[styles.row, index === 0 && styles.rowLeader]}
                >
                  <Text style={styles.rank}>{index + 1}</Text>
                  <View style={styles.rowMain}>
                    <Text style={styles.teamName}>{squadName}</Text>
                    <Text style={styles.recordText}>
                      {row?.wins || 0}-{row?.losses || 0}
                      {row?.ties ? `-${row.ties}` : ""}
                    </Text>
                  </View>
                  <View style={styles.pointsPill}>
                    <Text style={styles.pointsText}>
                      {(row?.pointsFor || 0).toFixed?.(1) ?? "0.0"} PF
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SURFACE.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  heroCard: {
    backgroundColor: SURFACE.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER.medium,
    padding: 18,
    marginBottom: 14,
  },
  heroTitle: { color: TEXT.primary, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  heroRow: { flexDirection: "row", alignItems: "center" },
  heroStat: { flex: 1 },
  heroLabel: { color: TEXT.secondary, fontSize: 12, fontWeight: "600" },
  heroValue: { color: TEXT.primary, fontSize: 22, fontWeight: "700", marginTop: 4 },
  heroDivider: { width: 1, alignSelf: "stretch", backgroundColor: BORDER.medium, marginHorizontal: 12 },
  loading: { alignItems: "center", paddingVertical: 30 },
  loadingText: { color: TEXT.secondary, marginTop: 8 },
  emptyCard: {
    alignItems: "center",
    backgroundColor: SURFACE.cardTransparent,
    borderWidth: 1,
    borderColor: BORDER.medium,
    borderRadius: 16,
    padding: 24,
  },
  emptyTitle: { color: TEXT.primary, fontSize: 16, fontWeight: "700", marginTop: 8 },
  emptySubtitle: { color: TEXT.secondary, textAlign: "center", marginTop: 6, fontSize: 13 },
  tableCard: {
    borderWidth: 1,
    borderColor: BORDER.medium,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: SURFACE.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER.medium,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowLeader: {
    backgroundColor: "rgba(201, 168, 76, 0.14)",
  },
  rank: { color: TEXT.primary, width: 28, fontWeight: "700", fontSize: 15 },
  rowMain: { flex: 1 },
  teamName: { color: TEXT.primary, fontSize: 15, fontWeight: "600" },
  recordText: { color: TEXT.secondary, fontSize: 12, marginTop: 2 },
  pointsPill: {
    backgroundColor: SURFACE.elevated,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: BORDER.medium,
  },
  pointsText: { color: TEXT.primary, fontSize: 12, fontWeight: "700" },
});
