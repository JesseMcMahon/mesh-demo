import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { TopNavigation } from "@/components/TopNavigation";
import { DraftBoard } from "@/components/DraftBoard";
import { PlayerDetailsModal } from "@/components/PlayerDetailsModal";
import { useLeagueDraftSettings, useLeagueSquads } from "@/hooks/useLeagueData";
import { useUserProfile } from "@/contexts/user-profile";
import { draftApi } from "@/lib/api";
import { getPlayerImageUrl } from "@/lib/playerImages";
import { backOrReplace } from "@/lib/navigation";
import { BRAND, SURFACE, TEXT, SEMANTIC } from "@/constants/colors";

type DraftPick = {
  _id?: string;
  playerId: number;
  firstName: string;
  lastName: string;
  team: string;
  position: string;
  photoUrl?: string;
  pickNumber: number;
  round: number;
  isAutoPick?: boolean;
  squadId: string;
  squad?: {
    _id?: string;
    name?: string;
    imageUrl?: string;
  } | null;
};

export default function DraftRecapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const leagueId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { accessToken } = useUserProfile();
  const [detailsPlayer, setDetailsPlayer] = useState<DraftPick | null>(null);

  const { data: draftSettings, isLoading: isLoadingDraftSettings } =
    useLeagueDraftSettings(undefined, leagueId);
  const draftId = (draftSettings as any)?._id || null;
  const draftStatus = (draftSettings as any)?.status || null;
  const totalRounds = (draftSettings as any)?.rounds || 15;

  const { data: squads = [] } = useLeagueSquads(leagueId);

  const {
    data: boardData,
    isLoading: isLoadingBoard,
    error: boardError,
    refetch,
  } = useQuery({
    queryKey: ["draft-board", draftId, accessToken],
    queryFn: () => draftApi.getDraftBoard(accessToken!, draftId!),
    enabled:
      !!accessToken &&
      !!draftId &&
      draftStatus === "completed",
    refetchOnMount: true,
    staleTime: 0,
  });

  const rosters = useMemo(() => {
    const picks: DraftPick[] = (boardData as any)?.picks || [];
    const rosterMap = new Map<string, any>();

    picks.forEach((pick) => {
      const squadId = String(pick.squadId || pick.squad?._id || "");
      if (!squadId) return;

      if (!rosterMap.has(squadId)) {
        rosterMap.set(squadId, {
          squadId,
          squadName: pick.squad?.name || "Unknown Squad",
          squad: pick.squad || null,
          players: [],
        });
      }

      rosterMap.get(squadId).players.push({
        _id: pick._id,
        playerId: pick.playerId,
        firstName: pick.firstName,
        lastName: pick.lastName,
        team: pick.team,
        position: pick.position,
        photoUrl: getPlayerImageUrl(pick) || undefined,
        pickNumber: pick.pickNumber,
        round: pick.round,
        isAutoPick: pick.isAutoPick,
      });
    });

    return Array.from(rosterMap.values()).map((roster) => ({
      ...roster,
      players: (roster.players || []).sort(
        (a: any, b: any) => (a.pickNumber || 0) - (b.pickNumber || 0)
      ),
    }));
  }, [boardData]);

  const handleBack = () => {
    backOrReplace(router, `/(tabs)/league/${leagueId}` as any);
  };

  const isInitialLoading = isLoadingDraftSettings || (draftStatus === "completed" && isLoadingBoard);

  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        <TopNavigation title="Draft Recap" showBackButton onBackPress={handleBack} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.subtleText}>Loading draft recap...</Text>
        </View>
      </View>
    );
  }

  if (draftStatus !== "completed") {
    return (
      <View style={styles.container}>
        <TopNavigation title="Draft Recap" showBackButton onBackPress={handleBack} />
        <View style={styles.centered}>
          <MaterialIcons name="hourglass-empty" size={48} color={TEXT.secondary} />
          <Text style={styles.title}>Draft recap is not available yet</Text>
          <Text style={styles.subtleText}>
            Recap unlocks after the draft is completed.
          </Text>
        </View>
      </View>
    );
  }

  if (boardError) {
    return (
      <View style={styles.container}>
        <TopNavigation title="Draft Recap" showBackButton onBackPress={handleBack} />
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color={SEMANTIC.error} />
          <Text style={styles.title}>Unable to load draft recap</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavigation title="Draft Recap" showBackButton onBackPress={handleBack} />
      <View style={styles.boardContainer}>
        <DraftBoard
          rosters={rosters}
          squads={squads}
          totalRounds={totalRounds}
          leagueSize={squads.length || rosters.length || 1}
          onPlayerPress={(player) => setDetailsPlayer(player as DraftPick)}
        />
      </View>

      <PlayerDetailsModal
        visible={!!detailsPlayer}
        onClose={() => setDetailsPlayer(null)}
        leagueId={leagueId}
        actionsEnabled={draftStatus === "completed"}
        player={
          detailsPlayer
            ? {
                playerId: Number(detailsPlayer.playerId),
                firstName: detailsPlayer.firstName,
                lastName: detailsPlayer.lastName,
                name: `${detailsPlayer.firstName} ${detailsPlayer.lastName}`.trim(),
                position: detailsPlayer.position,
                fantasyPosition: detailsPlayer.position,
                team: detailsPlayer.team,
                photoUrl: getPlayerImageUrl(detailsPlayer) || undefined,
              }
            : null
        }
        onAddPlayer={() => {
          setDetailsPlayer(null);
          router.push(`/(tabs)/league/${leagueId}/players`);
        }}
        onDropPlayer={() => {
          setDetailsPlayer(null);
          router.push(`/(tabs)/league/${leagueId}/players`);
        }}
        onTradePlayer={() => {
          setDetailsPlayer(null);
          router.push(`/(tabs)/league/${leagueId}/trades`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE.background,
  },
  boardContainer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 10,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  subtleText: {
    color: TEXT.secondary,
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: BRAND.primary,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
