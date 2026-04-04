import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  InteractionManager,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND, BORDER, SEMANTIC, SURFACE, TEXT } from "@/constants/colors";
import { usePlayerDetails } from "@/hooks/useFantasyV2";
import { getUserErrorMessage } from "@/lib/errorMessages";
import { getPlayerImageSource, prefetchPlayerImage } from "@/lib/playerImages";

type PlayerTab = "overview" | "projections" | "gamelog" | "schedule" | "news" | "bio";

type PlayerLite = {
  playerId: number;
  firstName?: string;
  lastName?: string;
  name?: string;
  position?: string;
  fantasyPosition?: string;
  team?: string;
  photoUrl?: string;
  injuryStatus?: string | null;
};

interface PlayerDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  leagueId?: string;
  seasonYear?: number;
  actionsEnabled?: boolean;
  player: PlayerLite | null;
  onAddPlayer?: (playerId: number) => void;
  onDropPlayer?: (playerId: number) => void;
  onTradePlayer?: (playerId: number) => void;
}

const TAB_ITEMS: { key: PlayerTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "projections", label: "Projections" },
  { key: "gamelog", label: "Game Log" },
  { key: "schedule", label: "Schedule" },
  { key: "news", label: "News" },
  { key: "bio", label: "Bio" },
];

function formatPlayerName(player: PlayerLite | null | undefined): string {
  if (!player) return "";
  const first = String(player.firstName || "").trim();
  const last = String(player.lastName || "").trim();
  const fallback = String(player.name || "").trim();
  const full = `${first} ${last}`.trim();
  return full || fallback || `Player #${player.playerId}`;
}

function asNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatNumber(value: unknown, digits = 1, fallback = "--"): string {
  const numeric = asNumber(value);
  if (numeric === null) return fallback;
  return numeric.toFixed(digits);
}

function formatPercent(value: unknown, fallback = "--"): string {
  const numeric = asNumber(value);
  if (numeric === null) return fallback;
  return `${numeric.toFixed(1)}%`;
}

function formatDateTime(value: unknown): string {
  if (!value) return "--";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleString();
}

function formatDateOnly(value: unknown): string {
  if (!value) return "--";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function firstAvailableValue(source: any, keys: string[]): string {
  for (const key of keys) {
    const value = source?.[key];
    if (value === undefined || value === null || String(value).trim() === "") continue;
    return String(value);
  }
  return "--";
}

function mapDisabledReason(reason?: string | null): string {
  const normalized = String(reason || "").toLowerCase();
  if (!normalized) return "";
  if (normalized === "league_context_required") return "Join a league to unlock add, drop, and trade actions.";
  if (normalized === "not_eligible") return "Your current squad role does not allow this action.";
  if (normalized === "not_rostered") return "This player is not on your roster.";
  return "This action is unavailable in this league context.";
}

function toWeekRows(list: any[] = [], pointKey: "fantasyPoints" | "projectedFantasyPoints") {
  return list
    .map((row) => ({
      week: Number(row?.week || 0),
      opponent: row?.opponent || row?.team || "--",
      points: asNumber(row?.[pointKey]),
      status: row?.gameStatus || row?.status || null,
    }))
    .filter((row) => row.week > 0)
    .sort((a, b) => a.week - b.week);
}

function trendTone(direction: string) {
  if (direction === "up") return { color: "#63D47A", icon: "trending-up" as const };
  if (direction === "down") return { color: "#FF7C7C", icon: "trending-down" as const };
  return { color: "#AAB0B8", icon: "trending-flat" as const };
}

export function PlayerDetailsModal({
  visible,
  onClose,
  leagueId,
  seasonYear = 2025,
  actionsEnabled = true,
  player,
  onAddPlayer,
  onDropPlayer,
  onTradePlayer,
}: PlayerDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<PlayerTab>("overview");
  const [isBodyReady, setIsBodyReady] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);
  const bodyReadyTaskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);
  const safePlayerId = asNumber(player?.playerId);

  const { data, isLoading, error } = usePlayerDetails(safePlayerId, leagueId, seasonYear);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setActiveTab("overview");
      setIsBodyReady(false);
      translateY.setValue(20);
      sheetOpacity.setValue(0.92);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 210,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      if (bodyReadyTaskRef.current) {
        bodyReadyTaskRef.current.cancel();
      }
      bodyReadyTaskRef.current = InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => setIsBodyReady(true));
      });
    } else {
      setIsBodyReady(false);
    }
  }, [visible, safePlayerId, sheetOpacity, translateY]);

  useEffect(() => {
    return () => {
      if (bodyReadyTaskRef.current) {
        bodyReadyTaskRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (visible && player) {
      prefetchPlayerImage(player);
    }
  }, [visible, player]);

  const closeWithAnimation = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsBodyReady(false);

    if (bodyReadyTaskRef.current) {
      bodyReadyTaskRef.current.cancel();
    }

    sheetOpacity.stopAnimation();
    translateY.stopAnimation();
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 420,
        duration: 170,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 0.9,
        duration: 130,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [onClose, sheetOpacity, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 120 || gestureState.vy > 0.9) {
            closeWithAnimation();
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            speed: 20,
            bounciness: 0,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            speed: 20,
            bounciness: 0,
          }).start();
        },
      }),
    [closeWithAnimation, translateY]
  );

  const details = (data as any)?.details || {};
  const actions = details?.actions || {};
  const ownership = details?.ownership || {};
  const ranking = details?.ranking || {};
  const kpis = details?.kpis || {};
  const trend = details?.trend || {};
  const bio = details?.bio || {};

  const weeklyStats = toWeekRows(Array.isArray(details?.weeklyStats) ? details.weeklyStats : [], "fantasyPoints");
  const weeklyProjections = toWeekRows(
    Array.isArray(details?.weeklyProjections) ? details.weeklyProjections : [],
    "projectedFantasyPoints"
  );
  const schedule = Array.isArray(details?.schedule) ? details.schedule : [];
  const latestNews = Array.isArray(details?.latestNews) ? details.latestNews : [];

  const headerName = formatPlayerName(player);
  const headerMeta = `${String(player?.position || player?.fantasyPosition || "--").toUpperCase()} • ${String(
    player?.team || "FA"
  ).toUpperCase()}`;
  const headshotSource = getPlayerImageSource(player);
  const tabRailBackground = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: ["#111A26", "#0A111B"],
    extrapolate: "clamp",
  });
  const tabRailBorderTop = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.12)"],
    extrapolate: "clamp",
  });
  const tabRailBorderBottom = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: ["rgba(255,255,255,0.10)", "rgba(255,255,255,0.16)"],
    extrapolate: "clamp",
  });
  const tabRailShadowOpacity = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0.2, 0.38],
    extrapolate: "clamp",
  });
  const tabRailInsetPadding = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [4, 0],
    extrapolate: "clamp",
  });
  const compactAccentOpacity = scrollY.interpolate({
    inputRange: [20, 130],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const metricCards = [
    { label: "Proj Pts", value: formatNumber(kpis?.projectionPoints) },
    { label: "Avg Pts", value: formatNumber(kpis?.averagePoints) },
    { label: "Season", value: formatNumber(kpis?.seasonPoints) },
    { label: "% Rostered", value: formatPercent(kpis?.rosteredPct) },
    { label: "% Started", value: formatPercent(kpis?.startedPct) },
    {
      label: "Trend",
      value:
        trend?.direction === "up"
          ? `+${formatNumber(trend?.delta, 1, "0.0")}`
          : trend?.direction === "down"
            ? formatNumber(trend?.delta, 1, "0.0")
            : formatNumber(trend?.delta, 1, "0.0"),
    },
  ];

  const bioRows = [
    { label: "Age", value: firstAvailableValue(bio, ["age"]) },
    { label: "Height", value: firstAvailableValue(bio, ["height"]) },
    { label: "Weight", value: firstAvailableValue(bio, ["weight"]) },
    { label: "College", value: firstAvailableValue(bio, ["college"]) },
    { label: "Experience", value: firstAvailableValue(bio, ["experience"]) },
    { label: "Bye Week", value: firstAvailableValue(bio, ["byeWeek"]) },
    { label: "Injury", value: firstAvailableValue(bio, ["injuryStatus", "injuryNotes"]) },
    { label: "Birth Date", value: formatDateOnly(bio?.birthDate) },
    { label: "Birthplace", value: firstAvailableValue(bio, ["birthCity", "birthState", "birthCountry"]) },
  ];

  const showLeagueActions = Boolean(leagueId);
  const shouldShowActionArea = Boolean(showLeagueActions && actionsEnabled);
  const disabledReason = showLeagueActions
    ? mapDisabledReason(actions?.reason)
    : "Read-only: join a league to unlock add, drop, and trade actions.";

  const primaryAction = useMemo(() => {
    if (!shouldShowActionArea || !safePlayerId) return null;

    if (actions?.canDrop && onDropPlayer) {
      return {
        key: "drop",
        title: "Drop Player",
        subtitle: "Remove from your roster",
        cta: "Drop",
        icon: "remove-circle-outline" as const,
        bg: `${SEMANTIC.error}1C`,
        border: `${SEMANTIC.error}70`,
      };
    }

    if (actions?.canTrade && onTradePlayer) {
      return {
        key: "trade",
        title: "Trade Player",
        subtitle: "Propose a trade package",
        cta: "Trade",
        icon: "swap-horiz" as const,
        bg: `${BRAND.gold}1E`,
        border: `${BRAND.gold}70`,
      };
    }

    if (actions?.canAdd && onAddPlayer) {
      return {
        key: "add",
        title: "Add Player",
        subtitle: "Claim to your roster",
        cta: "Add",
        icon: "add-circle-outline" as const,
        bg: `${BRAND.primary}20`,
        border: `${BRAND.primary}70`,
      };
    }

    return null;
  }, [actions?.canAdd, actions?.canDrop, actions?.canTrade, onAddPlayer, onDropPlayer, onTradePlayer, safePlayerId, shouldShowActionArea]);

  const onPrimaryActionPress = useCallback(() => {
    if (!safePlayerId || !primaryAction) return;
    if (primaryAction.key === "add") {
      onAddPlayer?.(safePlayerId);
      return;
    }
    if (primaryAction.key === "drop") {
      onDropPlayer?.(safePlayerId);
      return;
    }
    onTradePlayer?.(safePlayerId);
  }, [onAddPlayer, onDropPlayer, onTradePlayer, primaryAction, safePlayerId]);

  const actionHint = !actionsEnabled
    ? "Actions unlock after the draft is complete."
    : !showLeagueActions
      ? "Read-only mode: join a league to unlock roster actions."
      : disabledReason;

  const stickyHeaderIndices = shouldShowActionArea ? [2] : [1];

  const renderOverview = () => {
    const upcomingGame = details?.upcomingGame || null;
    const trendState = trendTone(String(trend?.direction || "flat"));

    return (
      <View style={styles.tabContentStack}>
        <View style={styles.panelSection}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.trendPill}>
              <MaterialIcons name={trendState.icon} size={14} color={trendState.color} />
              <Text style={[styles.trendPillText, { color: trendState.color }]}>
                {trend?.direction ? String(trend.direction).toUpperCase() : "FLAT"}
              </Text>
            </View>
          </View>
          <View style={styles.sectionDivider} />

          <View style={styles.streamBlock}>
            <Text style={styles.streamTitle}>Upcoming Game</Text>
            {upcomingGame ? (
              <>
                <Text style={styles.primaryValue}>
                  {upcomingGame?.isHome ? "vs" : "@"} {upcomingGame?.opponent || "--"}
                </Text>
                <Text style={styles.secondaryValue}>{formatDateTime(upcomingGame?.dateTime)}</Text>
                <Text style={styles.mutedValue}>
                  {upcomingGame?.spread != null ? `Spread: ${upcomingGame.spread}` : "Spread: --"}
                  {"  •  "}
                  {upcomingGame?.overUnder != null ? `O/U: ${upcomingGame.overUnder}` : "O/U: --"}
                </Text>
              </>
            ) : (
              <Text style={styles.emptyText}>No upcoming game yet.</Text>
            )}
          </View>
          <View style={styles.sectionDivider} />

          <View style={styles.streamBlock}>
            <Text style={styles.streamTitle}>Rankings</Text>
            <View style={styles.inlineRow}>
              <Text style={styles.metricInlineLabel}>Position</Text>
              <Text style={styles.metricInlineValue}>
                {ranking?.positionRank ? `#${ranking.positionRank}` : "--"}
              </Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.metricInlineLabel}>Overall</Text>
              <Text style={styles.metricInlineValue}>
                {ranking?.overallRank ? `#${ranking.overallRank}` : "--"}
              </Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.metricInlineLabel}>Ranking Source</Text>
              <Text style={styles.metricInlineValue}>{ranking?.basedOn || "--"}</Text>
            </View>
          </View>
          <View style={styles.sectionDivider} />

          <View style={styles.streamBlock}>
            <Text style={styles.streamTitle}>Ownership Snapshot</Text>
            <View style={styles.inlineRow}>
              <Text style={styles.metricInlineLabel}>Rostered</Text>
              <Text style={styles.metricInlineValue}>{formatPercent(ownership?.rosteredPct)}</Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.metricInlineLabel}>Started</Text>
              <Text style={styles.metricInlineValue}>{formatPercent(ownership?.startedPct)}</Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.metricInlineLabel}>Last Week Used</Text>
              <Text style={styles.metricInlineValue}>{firstAvailableValue(ownership, ["latestWeekUsed"])}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderProjections = () => {
    return (
      <View style={styles.tabContentStack}>
        <View style={styles.panelSection}>
          <Text style={styles.sectionTitle}>Projections</Text>
          <View style={styles.sectionDivider} />

          <View style={styles.streamBlock}>
            <Text style={styles.streamTitle}>Season Projection</Text>
            <View style={styles.inlineRow}>
              <Text style={styles.metricInlineLabel}>Projected Fantasy Points</Text>
              <Text style={styles.metricInlineValue}>
                {formatNumber(
                  details?.seasonProjection?.FantasyPointsPPR ?? details?.seasonProjection?.FantasyPoints ?? kpis?.projectionPoints
                )}
              </Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.metricInlineLabel}>Projected Passing Yds</Text>
              <Text style={styles.metricInlineValue}>
                {firstAvailableValue(details?.seasonProjection, ["PassingYards", "passingYards"])}
              </Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.metricInlineLabel}>Projected Rush Yds</Text>
              <Text style={styles.metricInlineValue}>
                {firstAvailableValue(details?.seasonProjection, ["RushingYards", "rushingYards"])}
              </Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.metricInlineLabel}>Projected Rec Yds</Text>
              <Text style={styles.metricInlineValue}>
                {firstAvailableValue(details?.seasonProjection, ["ReceivingYards", "receivingYards"])}
              </Text>
            </View>
          </View>
          <View style={styles.sectionDivider} />

          <View style={styles.streamBlock}>
            <Text style={styles.streamTitle}>Weekly Projections</Text>
            {weeklyProjections.length === 0 ? (
              <Text style={styles.emptyText}>No weekly projections yet.</Text>
            ) : (
              weeklyProjections.map((row) => (
                <View key={`proj-${row.week}-${row.opponent}`} style={styles.tableRow}>
                  <Text style={styles.tableLeft}>W{row.week} • {row.opponent}</Text>
                  <Text style={styles.tableRight}>{formatNumber(row.points)}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderGameLog = () => {
    return (
      <View style={styles.tabContentStack}>
        <View style={styles.panelSection}>
          <Text style={styles.sectionTitle}>Game Log</Text>
          <View style={styles.sectionDivider} />

          <View style={styles.streamBlock}>
            <Text style={styles.streamTitle}>Season Totals</Text>
            <View style={styles.inlineRow}>
              <Text style={styles.metricInlineLabel}>Fantasy Points</Text>
              <Text style={styles.metricInlineValue}>
                {formatNumber(details?.seasonStats?.FantasyPointsPPR ?? details?.seasonStats?.FantasyPoints ?? kpis?.seasonPoints)}
              </Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.metricInlineLabel}>Passing TDs</Text>
              <Text style={styles.metricInlineValue}>{firstAvailableValue(details?.seasonStats, ["PassingTouchdowns", "passingTouchdowns"])}</Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.metricInlineLabel}>Rushing TDs</Text>
              <Text style={styles.metricInlineValue}>{firstAvailableValue(details?.seasonStats, ["RushingTouchdowns", "rushingTouchdowns"])}</Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.metricInlineLabel}>Receiving TDs</Text>
              <Text style={styles.metricInlineValue}>{firstAvailableValue(details?.seasonStats, ["ReceivingTouchdowns", "receivingTouchdowns"])}</Text>
            </View>
          </View>
          <View style={styles.sectionDivider} />

          <View style={styles.streamBlock}>
            <Text style={styles.streamTitle}>Weekly Results</Text>
            {weeklyStats.length === 0 ? (
              <Text style={styles.emptyText}>No game log yet.</Text>
            ) : (
              weeklyStats.map((row) => (
                <View key={`log-${row.week}-${row.opponent}`} style={styles.tableRow}>
                  <View style={styles.tableLeftWrap}>
                    <Text style={styles.tableLeft}>W{row.week} • {row.opponent}</Text>
                    {row.status ? <Text style={styles.tableSub}>{row.status}</Text> : null}
                  </View>
                  <Text style={styles.tableRight}>{formatNumber(row.points)}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderSchedule = () => {
    return (
      <View style={styles.tabContentStack}>
        <View style={styles.panelSection}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <View style={styles.sectionDivider} />

          <View style={styles.streamBlock}>
            {schedule.length === 0 ? (
              <Text style={styles.emptyText}>Schedule data is not available yet.</Text>
            ) : (
              schedule.map((game: any, index: number) => (
                <View key={`schedule-${game?.week || index}-${game?.gameId || index}`} style={styles.scheduleRow}>
                  <View style={styles.scheduleWeekBadge}>
                    <Text style={styles.scheduleWeekBadgeText}>W{firstAvailableValue(game, ["week"])}</Text>
                  </View>
                  <View style={styles.scheduleMain}>
                    <Text style={styles.tableLeft}>
                      {game?.isHome ? "vs" : "@"} {game?.opponent || "--"}
                    </Text>
                    <Text style={styles.tableSub}>{formatDateTime(game?.dateTime)}</Text>
                    <Text style={styles.mutedValue}>
                      Spread {firstAvailableValue(game, ["spread"])} • O/U {firstAvailableValue(game, ["overUnder"])}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderNews = () => {
    return (
      <View style={styles.tabContentStack}>
        <View style={styles.panelSection}>
          <Text style={styles.sectionTitle}>News</Text>
          <View style={styles.sectionDivider} />

          <View style={styles.streamBlock}>
            {latestNews.length === 0 ? (
              <Text style={styles.emptyText}>No recent player news yet.</Text>
            ) : (
              latestNews.map((item: any, index: number) => (
                <View key={`news-${index}`} style={styles.newsRow}>
                  <Text style={styles.newsTitle}>{item?.Title || item?.title || "News update"}</Text>
                  <Text style={styles.newsMeta}>
                    {[item?.Source || item?.source || "SportsData", formatDateTime(item?.Updated || item?.updatedAt)]
                      .filter(Boolean)
                      .join(" • ")}
                  </Text>
                  <Text style={styles.newsBody}>{item?.Content || item?.content || "No details available."}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderBio = () => {
    return (
      <View style={styles.tabContentStack}>
        <View style={styles.panelSection}>
          <Text style={styles.sectionTitle}>Bio & History</Text>
          <View style={styles.sectionDivider} />

          <View style={styles.streamBlock}>
            {bioRows.map((row) => (
              <View key={row.label} style={styles.inlineRow}>
                <Text style={styles.metricInlineLabel}>{row.label}</Text>
                <Text style={styles.metricInlineValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderBody = () => {
    if (!isBodyReady) {
      return (
        <View style={styles.emptyPanel}>
          <ActivityIndicator size="small" color={BRAND.primary} />
          <Text style={styles.emptyText}>Preparing player details…</Text>
        </View>
      );
    }

    if (!safePlayerId) {
      return (
        <View style={styles.emptyPanel}>
          <MaterialIcons name="info-outline" size={22} color={TEXT.secondary} />
          <Text style={styles.emptyText}>Player details are unavailable for this entry.</Text>
        </View>
      );
    }

    if (isLoading) {
      return (
        <View style={styles.emptyPanel}>
          <ActivityIndicator size="small" color={BRAND.primary} />
          <Text style={styles.emptyText}>Loading player details…</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyPanel}>
          <MaterialIcons name="error-outline" size={22} color={SEMANTIC.error} />
          <Text style={styles.emptyTitle}>Couldn’t load player details</Text>
          <Text style={styles.emptyText}>{getUserErrorMessage(error, "Try again in a moment.")}</Text>
        </View>
      );
    }

    switch (activeTab) {
      case "overview":
        return renderOverview();
      case "projections":
        return renderProjections();
      case "gamelog":
        return renderGameLog();
      case "schedule":
        return renderSchedule();
      case "news":
        return renderNews();
      case "bio":
        return renderBio();
      default:
        return renderOverview();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={closeWithAnimation}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={closeWithAnimation} />

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
              opacity: sheetOpacity,
            },
          ]}
        >
          <Animated.ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetContent}
            stickyHeaderIndices={stickyHeaderIndices}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
          >
            <LinearGradient
              colors={["#1F3B66", "#0E1A32"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.header}
            >
              <View style={styles.headerDragZone} {...panResponder.panHandlers}>
                <View style={styles.dragHandle} />
              </View>

              <View style={styles.headerTopRow}>
                <Text style={styles.headerTitle}>Player Details</Text>
                <TouchableOpacity style={styles.closeButton} onPress={closeWithAnimation}>
                  <MaterialIcons name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.heroRow}>
                <View style={styles.headshotWrap}>
                  {headshotSource ? (
                    <ExpoImage
                      source={headshotSource}
                      style={styles.headshot}
                      contentFit="cover"
                      transition={120}
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={styles.headshotFallback}>
                      <MaterialIcons name="person" size={36} color={TEXT.secondary} />
                    </View>
                  )}
                </View>

                <View style={styles.heroTextWrap}>
                  <Text style={styles.playerName}>{headerName}</Text>
                  <Text style={styles.playerMeta}>{headerMeta}</Text>

                  <View style={styles.headerBadgeRow}>
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaBadgeText}>Bye {firstAvailableValue(bio, ["byeWeek"])}</Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaBadgeText}>Age {firstAvailableValue(bio, ["age"])}</Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaBadgeText}>{firstAvailableValue(bio, ["height"])}</Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaBadgeText}>{firstAvailableValue(bio, ["weight"])} lbs</Text>
                    </View>
                    {firstAvailableValue(bio, ["injuryStatus"]) !== "--" && (
                      <View style={[styles.metaBadge, styles.injuryBadge]}>
                        <Text style={[styles.metaBadgeText, styles.injuryBadgeText]}>
                          {firstAvailableValue(bio, ["injuryStatus"])}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.metricGrid}>
                {metricCards.map((card) => (
                  <View key={card.label} style={styles.metricCard}>
                    <Text style={styles.metricValue}>{card.value}</Text>
                    <Text style={styles.metricLabel}>{card.label}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>

            {shouldShowActionArea && (
              <View style={styles.actionsBlock}>
                {primaryAction ? (
                  <TouchableOpacity
                    style={[
                      styles.primaryActionButton,
                      {
                        backgroundColor: primaryAction.bg,
                        borderColor: primaryAction.border,
                      },
                    ]}
                    onPress={onPrimaryActionPress}
                    activeOpacity={0.82}
                  >
                    <View style={styles.primaryActionIconWrap}>
                      <MaterialIcons name={primaryAction.icon} size={18} color="#FFFFFF" />
                    </View>
                    <View style={styles.primaryActionTextWrap}>
                      <Text style={styles.primaryActionTitle}>{primaryAction.title}</Text>
                      <Text style={styles.primaryActionSubtitle}>{primaryAction.subtitle}</Text>
                    </View>
                    <View style={styles.primaryActionCtaPill}>
                      <Text style={styles.primaryActionCtaText}>{primaryAction.cta}</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.actionHintCard}>
                    <MaterialIcons name="info-outline" size={16} color={TEXT.secondary} />
                    <Text style={styles.disabledReason}>
                      {actionHint || "No roster action available right now."}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Animated.View
              style={[
                styles.tabRailStickyWrap,
                {
                  backgroundColor: tabRailBackground,
                  borderTopColor: tabRailBorderTop,
                  borderBottomColor: tabRailBorderBottom,
                  shadowOpacity: tabRailShadowOpacity,
                },
              ]}
            >
              <Animated.View style={[styles.tabRailCompactAccent, { opacity: compactAccentOpacity }]} />
              <Animated.View style={[styles.tabRailInnerWrap, { paddingTop: tabRailInsetPadding, paddingBottom: tabRailInsetPadding }]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabRailContent}
                style={styles.tabRail}
              >
                {TAB_ITEMS.map((tab) => {
                  const selected = activeTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={styles.tabRailItem}
                      onPress={() => setActiveTab(tab.key)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.tabRailText, selected && styles.tabRailTextActive]}>{tab.label}</Text>
                      <View style={[styles.tabRailIndicator, selected && styles.tabRailIndicatorActive]} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              </Animated.View>
            </Animated.View>

            <View style={styles.bodyBlock}>{renderBody()}</View>
          </Animated.ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4, 10, 20, 0.74)",
  },
  sheet: {
    maxHeight: "96%",
    minHeight: "84%",
    backgroundColor: SURFACE.background,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 1,
    borderColor: BORDER.medium,
    overflow: "hidden",
  },
  headerDragZone: {
    alignItems: "center",
    marginTop: -2,
    marginBottom: 8,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#6A6D72",
  },
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingBottom: 28,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headshotWrap: {
    width: 122,
    height: 122,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  headshot: {
    width: "100%",
    height: "100%",
  },
  headshotFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextWrap: {
    flex: 1,
    gap: 4,
    paddingTop: 2,
  },
  playerName: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 31,
  },
  playerMeta: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 13,
    fontWeight: "700",
  },
  headerBadgeRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  metaBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  injuryBadge: {
    backgroundColor: `${SEMANTIC.error}22`,
    borderColor: `${SEMANTIC.error}66`,
  },
  injuryBadgeText: {
    color: "#FFD9D6",
  },
  metricGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCard: {
    width: "31.5%",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    backgroundColor: "rgba(8,13,22,0.56)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  metricLabel: {
    marginTop: 2,
    color: "rgba(255,255,255,0.74)",
    fontSize: 10,
    fontWeight: "600",
  },
  actionsBlock: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
  },
  primaryActionButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryActionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionTextWrap: {
    flex: 1,
    gap: 2,
  },
  primaryActionTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  primaryActionSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "500",
  },
  primaryActionCtaPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  primaryActionCtaText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  actionHintCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.light,
    backgroundColor: SURFACE.elevated,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  disabledReason: {
    color: TEXT.secondary,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  tabsScroll: {
    marginTop: 12,
  },
  tabRailStickyWrap: {
    backgroundColor: "#111A26",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 8,
  },
  tabRailCompactAccent: {
    height: 1,
    backgroundColor: `${BRAND.primary}66`,
  },
  tabRailInnerWrap: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  tabRail: {
    marginTop: 0,
  },
  tabRailContent: {
    paddingHorizontal: 12,
    gap: 16,
  },
  tabRailItem: {
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: "center",
  },
  tabRailText: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  tabRailTextActive: {
    color: "#FFFFFF",
  },
  tabRailIndicator: {
    marginTop: 8,
    width: "100%",
    height: 2,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  tabRailIndicatorActive: {
    backgroundColor: BRAND.primary,
  },
  bodyBlock: {
    paddingHorizontal: 12,
    paddingTop: 14,
  },
  tabContentStack: {
    gap: 12,
  },
  panelSection: {
    backgroundColor: "#121D2A",
    borderWidth: 1,
    borderColor: "#203245",
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  trendPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  streamBlock: {
    gap: 8,
  },
  streamTitle: {
    color: "#DCE5F3",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  primaryValue: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  secondaryValue: {
    color: TEXT.light,
    fontSize: 12,
  },
  mutedValue: {
    color: TEXT.secondary,
    fontSize: 11,
  },
  inlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  metricInlineLabel: {
    color: TEXT.secondary,
    fontSize: 12,
    flex: 1,
  },
  metricInlineValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 1,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.09)",
    paddingBottom: 8,
    gap: 8,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.09)",
    paddingBottom: 10,
    gap: 10,
  },
  scheduleWeekBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: `${BRAND.primary}22`,
    borderWidth: 1,
    borderColor: `${BRAND.primary}66`,
  },
  scheduleWeekBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  scheduleMain: {
    flex: 1,
    gap: 2,
  },
  tableLeftWrap: {
    flex: 1,
    gap: 2,
  },
  tableLeft: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  tableSub: {
    color: TEXT.secondary,
    fontSize: 11,
  },
  tableRight: {
    color: BRAND.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  scheduleMeta: {
    alignItems: "flex-end",
    gap: 2,
  },
  scheduleMetaText: {
    color: TEXT.light,
    fontSize: 11,
  },
  newsRow: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.09)",
    paddingBottom: 10,
    gap: 5,
  },
  newsTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  newsMeta: {
    color: TEXT.secondary,
    fontSize: 10,
  },
  newsBody: {
    color: TEXT.light,
    fontSize: 12,
    lineHeight: 17,
  },
  emptyPanel: {
    borderWidth: 1,
    borderColor: BORDER.medium,
    borderRadius: 12,
    backgroundColor: SURFACE.card,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 12,
    gap: 8,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyText: {
    color: TEXT.secondary,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
});

export default PlayerDetailsModal;
