import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { TopNavigation } from "@/components/TopNavigation";
import { MatchupCenter } from "@/components/MatchupCenter";
import { useMatchupCenter, useMatchupCenterLive } from "@/hooks/useFantasyV2";
import { backOrReplace } from "@/lib/navigation";
import { useSocket } from "@/contexts/socket";
import { useUserProfile } from "@/contexts/user-profile";

function applyCenterDeltas(prev: any, payload: any) {
  if (!prev || !payload) return prev;

  const cardMap = new Map((prev?.matchTab?.cards || []).map((card: any) => [card.matchupId, card]));

  for (const header of payload?.headerDeltas || []) {
    const existing: any = cardMap.get(header.matchupId) as any;
    if (!existing) continue;
    cardMap.set(header.matchupId, {
      ...existing,
      status: header.status ?? existing.status,
      scores: header.scores ?? existing.scores,
      winPct: header.winPct ?? existing.winPct,
      gameSummary: header.gameSummary ?? existing.gameSummary,
    });
  }

  for (const rowDelta of payload?.rowDeltas || []) {
    const existing: any = cardMap.get(rowDelta.matchupId) as any;
    if (!existing) continue;
    cardMap.set(rowDelta.matchupId, {
      ...existing,
      rows: Array.isArray(rowDelta.rows) ? rowDelta.rows : existing.rows,
    });
  }

  const nextCards = (prev?.matchTab?.cards || []).map((card: any) => cardMap.get(card.matchupId) || card);
  const selectedMatchupId = prev?.selectedMatchupId || nextCards[0]?.matchupId || null;
  const selectedRows =
    nextCards.find((card: any) => card.matchupId === selectedMatchupId)?.rows ||
    nextCards[0]?.rows ||
    [];

  return {
    ...prev,
    cursor: payload?.cursor || prev.cursor,
    gameContextHealth: payload?.gameContextHealth || prev.gameContextHealth,
    matchups: nextCards.map((card: any) => ({
      matchupId: card.matchupId,
      matchupNumber: card.matchupNumber,
      status: card.status,
      home: card.home,
      away: card.away,
      scores: card.scores,
      winPct: card.winPct,
    })),
    matchTab: {
      ...prev.matchTab,
      cards: nextCards,
      rows: selectedRows,
    },
  };
}

export default function MatchupsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { socket, isConnected } = useSocket();
  const { accessToken } = useUserProfile();

  const centerEnabled = process.env.EXPO_PUBLIC_ENABLE_MATCHUP_CENTER_V2 !== "false";
  const lineupVoteRefetchAtRef = React.useRef(0);

  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  const {
    data: centerData,
    refetch: refetchCenter,
  } = useMatchupCenter(id, selectedWeek, centerEnabled, "selected");

  const centerCursor = (centerData as any)?.cursor || null;
  const centerWeek = Number((centerData as any)?.week || selectedWeek || 1);

  const pollingEnabled = centerEnabled && !isConnected;
  const { data: liveData } = useMatchupCenterLive(
    id,
    centerWeek,
    centerCursor,
    pollingEnabled,
    "selected"
  );

  useEffect(() => {
    if (!centerData) return;
    const nextWeek = Number((centerData as any)?.week || 0);
    if (nextWeek > 0 && nextWeek !== selectedWeek) {
      setSelectedWeek(nextWeek);
    }
  }, [centerData, selectedWeek]);

  useEffect(() => {
    if (!centerEnabled || !id || !accessToken) return;
    if (!(liveData as any)?.changedMatchupIds?.length) return;

    queryClient.setQueryData(
      ["v2-matchup-center", id, centerWeek ?? null, "selected", accessToken],
      (prev: any) => applyCenterDeltas(prev, liveData)
    );
  }, [centerEnabled, id, accessToken, queryClient, liveData, centerWeek]);

  useEffect(() => {
    if (!centerEnabled || !socket || !isConnected || !id || !accessToken) return;

    socket.emit("joinLeagueV2", {
      leagueId: id,
      accessToken,
    });

    const handleContextUpdate = (payload: any) => {
      if (String(payload?.leagueId || "") !== String(id)) return;
      if (Number(payload?.week || 0) !== Number(centerWeek || selectedWeek)) return;

      queryClient.setQueryData(
        ["v2-matchup-center", id, centerWeek ?? null, "selected", accessToken],
        (prev: any) => applyCenterDeltas(prev, payload)
      );
    };

    const handleMatchupLiveUpdate = (payload: any) => {
      if (String(payload?.leagueId || "") !== String(id)) return;
      if (!payload?.centerDelta) return;
      if (Number(payload?.week || 0) !== Number(centerWeek || selectedWeek)) return;

      queryClient.setQueryData(
        ["v2-matchup-center", id, centerWeek ?? null, "selected", accessToken],
        (prev: any) => applyCenterDeltas(prev, payload.centerDelta)
      );
    };

    const handleWeekStateUpdate = (payload: any) => {
      if (String(payload?.leagueId || "") !== String(id)) return;
      void refetchCenter();
    };

    const handleLineupVoteUpdated = (payload: any) => {
      if (String(payload?.leagueId || "") !== String(id)) return;
      if (Number(payload?.week || 0) !== Number(centerWeek || selectedWeek)) return;
      const now = Date.now();
      if (now - lineupVoteRefetchAtRef.current < 1000) return;
      lineupVoteRefetchAtRef.current = now;
      void refetchCenter();
    };

    socket.on("matchupContextUpdate", handleContextUpdate);
    socket.on("matchupLiveUpdate", handleMatchupLiveUpdate);
    socket.on("weekStateUpdate", handleWeekStateUpdate);
    socket.on("lineupVoteUpdated", handleLineupVoteUpdated);

    return () => {
      socket.emit("leaveLeagueV2", { leagueId: id });
      socket.off("matchupContextUpdate", handleContextUpdate);
      socket.off("matchupLiveUpdate", handleMatchupLiveUpdate);
      socket.off("weekStateUpdate", handleWeekStateUpdate);
      socket.off("lineupVoteUpdated", handleLineupVoteUpdated);
    };
  }, [
    centerEnabled,
    socket,
    isConnected,
    id,
    accessToken,
    queryClient,
    centerWeek,
    selectedWeek,
    refetchCenter,
  ]);

  const onRefresh = useCallback(async () => {
    await refetchCenter();
  }, [refetchCenter]);

  const navTitle = useMemo(() => "Matchups", []);

  return (
    <View style={{ flex: 1 }}>
      <TopNavigation
        title={navTitle}
        showBackButton
        onBackPress={() => backOrReplace(router, `/(tabs)/league/${id}` as any)}
      />

      <MatchupCenter
        centerData={centerData || null}
        selectedWeek={centerWeek}
        onWeekChange={(week) => setSelectedWeek(Number(week || 1))}
        onRefresh={onRefresh}
        socketConnected={isConnected}
        leagueId={id}
      />
    </View>
  );
}
