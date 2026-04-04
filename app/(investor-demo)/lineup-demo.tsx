import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { DemoModuleScaffold } from "@/components/demo/DemoModuleScaffold";
import { FeatureFooter } from "@/components/demo/FeatureFooter";
import { useDemoTheme } from "@/lib/demoTheme";
import { useInvestorDemo } from "@/contexts/investor-demo";

type PlayerPosition = "QB" | "RB" | "WR" | "TE" | "DST" | "K";
type SlotId = "QB" | "RB1" | "RB2" | "WR1" | "WR2" | "TE" | "FLEX" | "DST" | "K";

type Player = {
  id: string;
  name: string;
  team: string;
  position: PlayerPosition;
  projection: number;
  matchup: string;
  headshotUrl?: string;
};

type LineupSlot = {
  id: SlotId;
  label: string;
  allowed: PlayerPosition[];
  playerId: string;
};

type SwapModalState =
  | {
      visible: false;
    }
  | {
      visible: true;
      source: "starter" | "bench";
      slotId?: SlotId;
      benchPlayerId?: string;
    };

function getNflHeadshot(espnPlayerId: number) {
  return `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${espnPlayerId}.png&w=96&h=96&scale=crop`;
}

const PLAYERS: Record<string, Player> = {
  josh_allen: {
    id: "josh_allen",
    name: "Josh Allen",
    team: "BUF",
    position: "QB",
    projection: 24.7,
    matchup: "vs MIA",
    headshotUrl: getNflHeadshot(3918298),
  },
  cmc: {
    id: "cmc",
    name: "Christian McCaffrey",
    team: "SF",
    position: "RB",
    projection: 21.3,
    matchup: "vs SEA",
    headshotUrl: getNflHeadshot(3117251),
  },
  bijan: {
    id: "bijan",
    name: "Bijan Robinson",
    team: "ATL",
    position: "RB",
    projection: 18.4,
    matchup: "@ TB",
    headshotUrl: getNflHeadshot(4429795),
  },
  jefferson: {
    id: "jefferson",
    name: "Justin Jefferson",
    team: "MIN",
    position: "WR",
    projection: 20.1,
    matchup: "vs CHI",
    headshotUrl: getNflHeadshot(4262921),
  },
  chase: {
    id: "chase",
    name: "Ja'Marr Chase",
    team: "CIN",
    position: "WR",
    projection: 19.6,
    matchup: "@ PIT",
    headshotUrl: getNflHeadshot(4362628),
  },
  kelce: {
    id: "kelce",
    name: "Travis Kelce",
    team: "KC",
    position: "TE",
    projection: 16.3,
    matchup: "vs LV",
    headshotUrl: getNflHeadshot(15847),
  },
  puka: {
    id: "puka",
    name: "Puka Nacua",
    team: "LAR",
    position: "WR",
    projection: 16.4,
    matchup: "@ ARI",
    headshotUrl: getNflHeadshot(4426515),
  },
  ravens_dst: {
    id: "ravens_dst",
    name: "Ravens D/ST",
    team: "BAL",
    position: "DST",
    projection: 9.1,
    matchup: "@ CLE",
  },
  tucker: {
    id: "tucker",
    name: "Justin Tucker",
    team: "BAL",
    position: "K",
    projection: 8.4,
    matchup: "@ CLE",
    headshotUrl: getNflHeadshot(13981),
  },
  tyreek: {
    id: "tyreek",
    name: "Tyreek Hill",
    team: "MIA",
    position: "WR",
    projection: 19.2,
    matchup: "@ BUF",
    headshotUrl: getNflHeadshot(15802),
  },
  saquon: {
    id: "saquon",
    name: "Saquon Barkley",
    team: "PHI",
    position: "RB",
    projection: 17.1,
    matchup: "vs DAL",
    headshotUrl: getNflHeadshot(3929630),
  },
  amonra: {
    id: "amonra",
    name: "Amon-Ra St. Brown",
    team: "DET",
    position: "WR",
    projection: 18.9,
    matchup: "vs GB",
    headshotUrl: getNflHeadshot(4374302),
  },
  breece: {
    id: "breece",
    name: "Breece Hall",
    team: "NYJ",
    position: "RB",
    projection: 16.2,
    matchup: "@ NE",
    headshotUrl: getNflHeadshot(4430807),
  },
  laporta: {
    id: "laporta",
    name: "Sam LaPorta",
    team: "DET",
    position: "TE",
    projection: 13.2,
    matchup: "vs GB",
    headshotUrl: getNflHeadshot(4429084),
  },
  hurts: {
    id: "hurts",
    name: "Jalen Hurts",
    team: "PHI",
    position: "QB",
    projection: 24.1,
    matchup: "vs DAL",
    headshotUrl: getNflHeadshot(4040715),
  },
  niners_dst: {
    id: "niners_dst",
    name: "49ers D/ST",
    team: "SF",
    position: "DST",
    projection: 8.7,
    matchup: "vs SEA",
  },
  butker: {
    id: "butker",
    name: "Harrison Butker",
    team: "KC",
    position: "K",
    projection: 8.1,
    matchup: "vs LV",
    headshotUrl: getNflHeadshot(3055899),
  },
};

const INITIAL_SLOTS: LineupSlot[] = [
  { id: "QB", label: "QB", allowed: ["QB"], playerId: "josh_allen" },
  { id: "RB1", label: "RB", allowed: ["RB"], playerId: "cmc" },
  { id: "RB2", label: "RB", allowed: ["RB"], playerId: "bijan" },
  { id: "WR1", label: "WR", allowed: ["WR"], playerId: "jefferson" },
  { id: "WR2", label: "WR", allowed: ["WR"], playerId: "chase" },
  { id: "TE", label: "TE", allowed: ["TE"], playerId: "kelce" },
  { id: "FLEX", label: "FLEX", allowed: ["RB", "WR", "TE"], playerId: "puka" },
  { id: "DST", label: "DST", allowed: ["DST"], playerId: "ravens_dst" },
  { id: "K", label: "K", allowed: ["K"], playerId: "tucker" },
];

const INITIAL_BENCH: string[] = [
  "tyreek",
  "amonra",
  "saquon",
  "breece",
  "laporta",
  "hurts",
  "niners_dst",
  "butker",
];

const OPPONENT_PROJECTION = 152.8;

function buildSignature(slots: LineupSlot[], bench: string[]) {
  return `${slots.map((slot) => `${slot.id}:${slot.playerId}`).join("|")}::${bench.join("|")}`;
}

function getInitials(playerName: string) {
  const parts = playerName.split(" ");
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

export default function LineupDemoScreen() {
  const theme = useDemoTheme();
  const { completeFeature } = useInvestorDemo();
  const [slots, setSlots] = useState<LineupSlot[]>(INITIAL_SLOTS);
  const [bench, setBench] = useState<string[]>(INITIAL_BENCH);
  const [swapSheet, setSwapSheet] = useState<SwapModalState>({ visible: false });
  const [message, setMessage] = useState<string>(
    "Tap any starter or bench player to open quick swap options."
  );
  const [failedHeadshots, setFailedHeadshots] = useState<Set<string>>(new Set());
  const [submittedSignature, setSubmittedSignature] = useState<string>(
    buildSignature(INITIAL_SLOTS, INITIAL_BENCH)
  );

  const lineupSignature = useMemo(() => buildSignature(slots, bench), [slots, bench]);
  const isDirty = lineupSignature !== submittedSignature;

  const starterProjection = useMemo(
    () => slots.reduce((sum, slot) => sum + PLAYERS[slot.playerId].projection, 0),
    [slots]
  );
  const delta = starterProjection - OPPONENT_PROJECTION;
  const winProb = Math.max(5, Math.min(95, 50 + delta * 2.1));

  const closeSwapSheet = useCallback(() => {
    setSwapSheet({ visible: false });
  }, []);

  const swapIntoSlot = useCallback(
    (benchPlayerId: string, slotId: SlotId) => {
      const targetSlot = slots.find((slot) => slot.id === slotId);
      if (!targetSlot) return;

      const benchPlayer = PLAYERS[benchPlayerId];
      if (!targetSlot.allowed.includes(benchPlayer.position)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setMessage(`${benchPlayer.name} is not eligible for ${targetSlot.label}.`);
        return;
      }

      const outgoingStarterId = targetSlot.playerId;

      setSlots((prev) =>
        prev.map((slot) => (slot.id === slotId ? { ...slot, playerId: benchPlayerId } : slot))
      );
      setBench((prev) =>
        prev.map((playerId) => (playerId === benchPlayerId ? outgoingStarterId : playerId))
      );
      setMessage(`${benchPlayer.name} moved to ${targetSlot.label}.`);
      closeSwapSheet();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    },
    [closeSwapSheet, slots]
  );

  const starterSwapOptions = useMemo(() => {
    if (!swapSheet.visible || swapSheet.source !== "starter" || !swapSheet.slotId) return [];
    const targetSlot = slots.find((slot) => slot.id === swapSheet.slotId);
    if (!targetSlot) return [];
    return bench
      .map((benchId) => PLAYERS[benchId])
      .filter((player) => targetSlot.allowed.includes(player.position));
  }, [bench, slots, swapSheet]);

  const benchSwapOptions = useMemo(() => {
    if (!swapSheet.visible || swapSheet.source !== "bench" || !swapSheet.benchPlayerId) return [];
    const benchPlayer = PLAYERS[swapSheet.benchPlayerId];
    return slots.filter((slot) => slot.allowed.includes(benchPlayer.position));
  }, [slots, swapSheet]);

  const onStarterPress = useCallback((slotId: SlotId) => {
    setSwapSheet({ visible: true, source: "starter", slotId });
    setMessage("Choose a bench player from the sheet to swap in.");
  }, []);

  const onBenchPress = useCallback((benchPlayerId: string) => {
    setSwapSheet({ visible: true, source: "bench", benchPlayerId });
    setMessage("Choose a starter slot from the sheet to swap with this bench player.");
  }, []);

  const onSubmitLineup = () => {
    setSubmittedSignature(lineupSignature);
    setMessage(`Lineup submitted. Projected ${starterProjection.toFixed(1)} points for Week 1.`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    closeSwapSheet();
    completeFeature("lineup");
  };

  const activeStarterSlotId =
    swapSheet.visible && swapSheet.source === "starter" ? swapSheet.slotId ?? null : null;
  const activeBenchPlayerId =
    swapSheet.visible && swapSheet.source === "bench" ? swapSheet.benchPlayerId ?? null : null;

  return (
    <DemoModuleScaffold
      title="Set Lineup"
      subtitle="Manage starters and bench like a real fantasy football lineup, then lock it in."
      footer={
        <View style={styles.footerStack}>
          {isDirty ? (
            <View style={[styles.floatingSubmitWrap, { borderColor: `${theme.primary}66`, backgroundColor: theme.surfaceElevated }]}>
              <TouchableOpacity
                onPress={onSubmitLineup}
                activeOpacity={0.9}
                style={[styles.floatingSubmitButton, { backgroundColor: theme.primary }]}
              >
                <MaterialIcons name="check-circle" size={18} color={theme.appBackground} />
                <Text style={[styles.floatingSubmitText, { color: theme.appBackground, fontFamily: theme.buttonFont }]}>
                  Submit Lineup Changes
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <FeatureFooter featureId="lineup" showHomeCta={false} />
        </View>
      }
    >
      <LinearGradient
        colors={[`${theme.primary}36`, `${theme.primary}12`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroCard, { borderColor: `${theme.primary}55` }]}
      >
        <View style={styles.heroTopRow}>
          <Text style={[styles.heroTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
            Week 1 vs Gridiron Kings
          </Text>
          <View style={[styles.lockPill, { borderColor: `${theme.primary}66`, backgroundColor: `${theme.primary}1C` }]}>
            <MaterialIcons name="timer" size={14} color={theme.primaryLight} />
            <Text style={[styles.lockPillText, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
              Lock in 22m
            </Text>
          </View>
        </View>
        <View style={styles.heroStatsRow}>
          <View style={[styles.heroStat, { borderColor: `${theme.primary}35`, backgroundColor: theme.glass }]}>
            <Text style={[styles.heroStatLabel, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>Your Projection</Text>
            <Text style={[styles.heroStatValue, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
              {starterProjection.toFixed(1)}
            </Text>
          </View>
          <View style={[styles.heroStat, { borderColor: `${theme.primary}35`, backgroundColor: theme.glass }]}>
            <Text style={[styles.heroStatLabel, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>Opponent</Text>
            <Text style={[styles.heroStatValue, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
              {OPPONENT_PROJECTION.toFixed(1)}
            </Text>
          </View>
          <View style={[styles.heroStat, { borderColor: `${theme.primary}35`, backgroundColor: theme.glass }]}>
            <Text style={[styles.heroStatLabel, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>Win Odds</Text>
            <Text style={[styles.heroStatValue, { color: theme.primaryLight, fontFamily: theme.displayFont }]}>
              {winProb.toFixed(0)}%
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.messageCard, { borderColor: `${theme.primary}30`, backgroundColor: theme.surfaceElevated }]}>
        <MaterialIcons name="touch-app" size={16} color={theme.primaryLight} />
        <Text style={[styles.messageText, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>{message}</Text>
      </View>

      <View style={[styles.sectionCard, { borderColor: `${theme.primary}35`, backgroundColor: theme.surfaceElevated }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>Starters</Text>
          <Text style={[styles.sectionMeta, { color: theme.textSecondary, fontFamily: theme.labelFont }]}>9/9 Active</Text>
        </View>

        <View style={styles.rowsWrap}>
          {slots.map((slot) => {
            const player = PLAYERS[slot.playerId];
            const showHeadshot = !!player.headshotUrl && !failedHeadshots.has(player.id);
            return (
              <TouchableOpacity
                key={slot.id}
                onPress={() => onStarterPress(slot.id)}
                activeOpacity={0.9}
                style={[
                  styles.playerRow,
                  {
                    borderColor: `${theme.primary}30`,
                    backgroundColor: theme.glass,
                  },
                ]}
              >
                <View style={styles.playerRowLeft}>
                  <View style={[styles.slotBadge, { borderColor: `${theme.primary}55`, backgroundColor: `${theme.primary}16` }]}>
                    <Text style={[styles.slotBadgeText, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>{slot.label}</Text>
                  </View>
                  <View style={[styles.avatarCircle, { backgroundColor: `${theme.primary}20`, borderColor: `${theme.primary}40` }]}>
                    {showHeadshot ? (
                      <Image
                        source={{ uri: player.headshotUrl }}
                        resizeMode="cover"
                        style={styles.avatarImage}
                        onError={() =>
                          setFailedHeadshots((prev) => {
                            if (prev.has(player.id)) return prev;
                            const next = new Set(prev);
                            next.add(player.id);
                            return next;
                          })
                        }
                      />
                    ) : (
                      <Text style={[styles.avatarInitials, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
                        {getInitials(player.name)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.playerInfo}>
                    <Text style={[styles.playerName, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>{player.name}</Text>
                    <Text style={[styles.playerMeta, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
                      {player.team} • {player.position} • {player.matchup}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.projectionText, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
                  {player.projection.toFixed(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={[styles.sectionCard, { borderColor: `${theme.primary}35`, backgroundColor: theme.surfaceElevated }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>Bench</Text>
          <Text style={[styles.sectionMeta, { color: theme.textSecondary, fontFamily: theme.labelFont }]}>8 Players</Text>
        </View>

        <View style={styles.rowsWrap}>
          {bench.map((playerId) => {
            const player = PLAYERS[playerId];
            const showHeadshot = !!player.headshotUrl && !failedHeadshots.has(player.id);
            return (
              <TouchableOpacity
                key={player.id}
                onPress={() => onBenchPress(player.id)}
                activeOpacity={0.9}
                style={[
                  styles.playerRow,
                  {
                    borderColor: `${theme.primary}30`,
                    backgroundColor: theme.glass,
                  },
                ]}
              >
                <View style={styles.playerRowLeft}>
                  <View style={[styles.slotBadge, { borderColor: `${theme.primary}40`, backgroundColor: theme.glass }]}>
                    <Text style={[styles.slotBadgeText, { color: theme.textSecondary, fontFamily: theme.labelFont }]}>BN</Text>
                  </View>
                  <View style={[styles.avatarCircle, { backgroundColor: `${theme.primary}20`, borderColor: `${theme.primary}40` }]}>
                    {showHeadshot ? (
                      <Image
                        source={{ uri: player.headshotUrl }}
                        resizeMode="cover"
                        style={styles.avatarImage}
                        onError={() =>
                          setFailedHeadshots((prev) => {
                            if (prev.has(player.id)) return prev;
                            const next = new Set(prev);
                            next.add(player.id);
                            return next;
                          })
                        }
                      />
                    ) : (
                      <Text style={[styles.avatarInitials, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
                        {getInitials(player.name)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.playerInfo}>
                    <Text style={[styles.playerName, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>{player.name}</Text>
                    <Text style={[styles.playerMeta, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
                      {player.team} • {player.position} • {player.matchup}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.projectionText, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
                  {player.projection.toFixed(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Modal
        visible={swapSheet.visible}
        transparent
        animationType="slide"
        onRequestClose={closeSwapSheet}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={closeSwapSheet} activeOpacity={1} />
          <View style={[styles.sheetContainer, { borderColor: `${theme.primary}4A`, backgroundColor: theme.surface }]}>
            <View style={styles.sheetHandleWrap}>
              <View style={[styles.sheetHandle, { backgroundColor: `${theme.primary}55` }]} />
            </View>
            <Text style={[styles.sheetTitle, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
              {swapSheet.visible && swapSheet.source === "starter"
                ? "Swap In From Bench"
                : "Swap Into Starter Slot"}
            </Text>
            <Text style={[styles.sheetSubtitle, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
              {swapSheet.visible && swapSheet.source === "starter"
                ? "Pick a bench player to move into this starter slot."
                : "Pick a starter slot for this bench player."}
            </Text>

            <View style={styles.sheetOptionsWrap}>
              {swapSheet.visible && swapSheet.source === "starter" ? (
                starterSwapOptions.length > 0 ? (
                  starterSwapOptions.map((option) => {
                    const showHeadshot = !!option.headshotUrl && !failedHeadshots.has(option.id);
                    return (
                      <TouchableOpacity
                        key={`starter-opt-${option.id}`}
                        onPress={() => activeStarterSlotId && swapIntoSlot(option.id, activeStarterSlotId)}
                        activeOpacity={0.9}
                        style={[styles.sheetOptionRow, { borderColor: `${theme.primary}33`, backgroundColor: theme.glass }]}
                      >
                        <View style={[styles.avatarCircle, { backgroundColor: `${theme.primary}20`, borderColor: `${theme.primary}40` }]}>
                          {showHeadshot ? (
                            <Image
                              source={{ uri: option.headshotUrl }}
                              resizeMode="cover"
                              style={styles.avatarImage}
                              onError={() =>
                                setFailedHeadshots((prev) => {
                                  if (prev.has(option.id)) return prev;
                                  const next = new Set(prev);
                                  next.add(option.id);
                                  return next;
                                })
                              }
                            />
                          ) : (
                            <Text style={[styles.avatarInitials, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
                              {getInitials(option.name)}
                            </Text>
                          )}
                        </View>
                        <View style={styles.sheetOptionInfo}>
                          <Text style={[styles.sheetOptionName, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
                            {option.name}
                          </Text>
                          <Text style={[styles.sheetOptionMeta, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
                            {option.team} • {option.position} • {option.matchup}
                          </Text>
                        </View>
                        <Text style={[styles.sheetProjection, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
                          {option.projection.toFixed(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={[styles.sheetEmptyText, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
                    No eligible bench players for this slot.
                  </Text>
                )
              ) : benchSwapOptions.length > 0 && activeBenchPlayerId ? (
                benchSwapOptions.map((option) => {
                  const currentStarter = PLAYERS[option.playerId];
                  return (
                    <TouchableOpacity
                      key={`bench-opt-${option.id}`}
                      onPress={() => swapIntoSlot(activeBenchPlayerId, option.id)}
                      activeOpacity={0.9}
                      style={[styles.sheetOptionRow, { borderColor: `${theme.primary}33`, backgroundColor: theme.glass }]}
                    >
                      <View style={[styles.slotBadge, { borderColor: `${theme.primary}55`, backgroundColor: `${theme.primary}16` }]}>
                        <Text style={[styles.slotBadgeText, { color: theme.primaryLight, fontFamily: theme.labelFont }]}>
                          {option.label}
                        </Text>
                      </View>
                      <View style={styles.sheetOptionInfo}>
                        <Text style={[styles.sheetOptionName, { color: theme.textPrimary, fontFamily: theme.labelFont }]}>
                          Replace {currentStarter.name}
                        </Text>
                        <Text style={[styles.sheetOptionMeta, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
                          {currentStarter.team} • {currentStarter.position} • {currentStarter.matchup}
                        </Text>
                      </View>
                      <MaterialIcons name="swap-vert" size={18} color={theme.primaryLight} />
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={[styles.sheetEmptyText, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
                  No eligible starter slots for this bench player.
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={closeSwapSheet}
              activeOpacity={0.9}
              style={[styles.sheetCancelButton, { borderColor: `${theme.primary}40`, backgroundColor: theme.glass }]}
            >
              <Text style={[styles.sheetCancelText, { color: theme.textPrimary, fontFamily: theme.buttonFont }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </DemoModuleScaffold>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  lockPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  lockPillText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.24,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 8,
  },
  heroStat: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 8,
    gap: 2,
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  messageCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 7,
    flexDirection: "row",
    alignItems: "center",
  },
  messageText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  sectionMeta: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.24,
  },
  rowsWrap: {
    gap: 8,
  },
  playerRow: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 9,
  },
  playerRowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  slotBadge: {
    minWidth: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  slotBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitials: {
    fontSize: 11,
    fontWeight: "800",
  },
  playerInfo: {
    flex: 1,
    gap: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: "800",
  },
  playerMeta: {
    fontSize: 11,
    fontWeight: "600",
  },
  projectionText: {
    fontSize: 16,
    fontWeight: "900",
    minWidth: 40,
    textAlign: "right",
  },
  footerStack: {
    gap: 10,
  },
  floatingSubmitWrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
  },
  floatingSubmitButton: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  floatingSubmitText: {
    fontSize: 14,
    fontWeight: "900",
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "900",
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(5, 10, 18, 0.45)",
  },
  sheetBackdrop: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 10,
    maxHeight: "72%",
  },
  sheetHandleWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 26,
  },
  sheetSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  sheetOptionsWrap: {
    gap: 8,
  },
  sheetOptionRow: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetOptionInfo: {
    flex: 1,
    gap: 1,
  },
  sheetOptionName: {
    fontSize: 13,
    fontWeight: "800",
  },
  sheetOptionMeta: {
    fontSize: 11,
    fontWeight: "600",
  },
  sheetProjection: {
    fontSize: 14,
    fontWeight: "900",
  },
  sheetEmptyText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    paddingVertical: 8,
  },
  sheetCancelButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  sheetCancelText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
