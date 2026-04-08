import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";
type LeagueTab = "home" | "roster" | "matchup" | "players" | "league";

const LEFT_CHARACTER = require("../../assets/demo-assets/home-hero-character.png");
const RIGHT_CHARACTER = require("../../assets/demo-assets/matchup-avatar-right.png");
const PRESENCE_BENCH = require("../../assets/demo-assets/presence/presence-avatar-1.png");
const PRESENCE_DRAFTWIZ = require("../../assets/demo-assets/presence/presence-avatar-2.png");
const PRESENCE_JAXON = require("../../assets/demo-assets/presence/presence-avatar-3.png");
const PRESENCE_SLEEPER = require("../../assets/demo-assets/presence/presence-avatar-4.png");

const LEAGUE_TABS: Array<{ id: LeagueTab; label: string }> = [
  { id: "home", label: "Home" },
  { id: "roster", label: "Roster" },
  { id: "matchup", label: "Matchup" },
  { id: "players", label: "Players" },
  { id: "league", label: "League" },
];
const DISABLED_TABS: LeagueTab[] = ["players", "league"];

type SidePlayer = {
  name: string;
  meta: string;
  points: string;
  initials: string;
  injury?: "Q" | "O";
  scoring?: boolean;
  bench?: boolean;
};

type MatchupRow = {
  position: string;
  left: SidePlayer;
  right: SidePlayer;
  bench?: boolean;
};

type PlayerPosition = "QB" | "RB" | "WR" | "TE" | "DEF" | "K";
type StarterSlot = "QB" | "RB" | "WR" | "FLEX" | "TE" | "DEF" | "K";

type RosterPlayer = {
  id: string;
  name: string;
  team: string;
  opponent: string;
  position: PlayerPosition;
  projection: number;
};

type StarterLineupSlot = {
  id: string;
  slot: StarterSlot;
  player: RosterPlayer;
};

const STARTERS: MatchupRow[] = [
  {
    position: "QB",
    left: {
      name: "J. Burrow",
      meta: "CIN · vs LAR",
      points: "28.4",
      initials: "JB",
      scoring: true,
    },
    right: {
      name: "L. Jackson",
      meta: "BAL · vs PIT",
      points: "21.2",
      initials: "LJ",
    },
  },
  {
    position: "RB",
    left: {
      name: "C. McCaffrey",
      meta: "SF · at SEA",
      points: "18.7",
      initials: "CM",
    },
    right: {
      name: "B. Hall",
      meta: "NYJ · vs MIA",
      points: "16.2",
      initials: "BH",
    },
  },
  {
    position: "RB",
    left: {
      name: "B. Robinson",
      meta: "ATL · vs TB",
      points: "12.3",
      initials: "BR",
    },
    right: {
      name: "S. Barkley",
      meta: "PHI · vs DAL",
      points: "19.4",
      initials: "SB",
    },
  },
  {
    position: "WR",
    left: {
      name: "J. Jefferson",
      meta: "MIN · vs GB 🔥",
      points: "24.6",
      initials: "JJ",
      scoring: true,
    },
    right: {
      name: "T. Hill",
      meta: "MIA · at NYJ",
      points: "22.1",
      initials: "TH",
    },
  },
  {
    position: "WR",
    left: {
      name: "C. Lamb",
      meta: "DAL · at PHI",
      points: "17.8",
      initials: "CL",
    },
    right: {
      name: "P. Nacua",
      meta: "LAR · at SF",
      points: "15.9",
      initials: "PN",
    },
  },
  {
    position: "FLEX",
    left: {
      name: "D. Achane",
      meta: "MIA · at NYJ",
      points: "14.6",
      initials: "DA",
    },
    right: {
      name: "J. Gibbs",
      meta: "DET · vs MIN",
      points: "16.7",
      initials: "JG",
    },
  },
  {
    position: "TE",
    left: {
      name: "S. LaPorta",
      meta: "DET · vs MIN",
      points: "13.2",
      initials: "SL",
    },
    right: {
      name: "T. Kelce",
      meta: "KC · vs LV",
      points: "16.4",
      initials: "TK",
    },
  },
  {
    position: "DEF",
    left: {
      name: "49ers D/ST",
      meta: "vs LAR",
      points: "8.0",
      initials: "SF",
    },
    right: {
      name: "Ravens D/ST",
      meta: "vs PIT",
      points: "9.0",
      initials: "BAL",
    },
  },
  {
    position: "K",
    left: {
      name: "J. Tucker",
      meta: "BAL · vs PIT",
      points: "10.0",
      initials: "JT",
    },
    right: {
      name: "H. Butker",
      meta: "KC · vs LV",
      points: "9.0",
      initials: "HB",
    },
  },
];

const BENCH: MatchupRow[] = [
  {
    position: "BE",
    bench: true,
    left: {
      name: "A. Cooper",
      meta: "CLE · at DEN",
      points: "4.8",
      initials: "AC",
      bench: true,
    },
    right: {
      name: "K. Allen",
      meta: "LAC · at IND",
      points: "7.3",
      initials: "KA",
      bench: true,
    },
  },
  {
    position: "BE",
    bench: true,
    left: {
      name: "D. Kincaid",
      meta: "BUF · at NYJ",
      points: "6.1",
      initials: "DK",
      bench: true,
    },
    right: {
      name: "R. White",
      meta: "TB · at ATL",
      points: "8.7",
      initials: "RW",
      bench: true,
    },
  },
  {
    position: "BE",
    bench: true,
    left: {
      name: "J. Palmer",
      meta: "LAC · at KC",
      points: "4.4",
      initials: "JP",
      bench: true,
    },
    right: {
      name: "G. Davis",
      meta: "BUF · at NYJ",
      points: "5.2",
      initials: "GD",
      bench: true,
    },
  },
];

const INITIAL_ROSTER_STARTERS: StarterLineupSlot[] = [
  {
    id: "QB",
    slot: "QB",
    player: {
      id: "p_burrow",
      name: "Joe Burrow",
      team: "CIN",
      opponent: "vs LAR",
      position: "QB",
      projection: 22.4,
    },
  },
  {
    id: "RB1",
    slot: "RB",
    player: {
      id: "p_bijan",
      name: "Bijan Robinson",
      team: "ATL",
      opponent: "vs TB",
      position: "RB",
      projection: 17.1,
    },
  },
  {
    id: "RB2",
    slot: "RB",
    player: {
      id: "p_breece",
      name: "Breece Hall",
      team: "NYJ",
      opponent: "vs MIA",
      position: "RB",
      projection: 16.3,
    },
  },
  {
    id: "WR1",
    slot: "WR",
    player: {
      id: "p_tyreek",
      name: "Tyreek Hill",
      team: "MIA",
      opponent: "@ NYJ",
      position: "WR",
      projection: 21.4,
    },
  },
  {
    id: "WR2",
    slot: "WR",
    player: {
      id: "p_nacua",
      name: "Puka Nacua",
      team: "LAR",
      opponent: "@ SF",
      position: "WR",
      projection: 16.0,
    },
  },
  {
    id: "FLEX",
    slot: "FLEX",
    player: {
      id: "p_achane",
      name: "De'Von Achane",
      team: "MIA",
      opponent: "@ NYJ",
      position: "RB",
      projection: 14.8,
    },
  },
  {
    id: "TE",
    slot: "TE",
    player: {
      id: "p_laporta",
      name: "Sam LaPorta",
      team: "DET",
      opponent: "vs MIN",
      position: "TE",
      projection: 12.7,
    },
  },
  {
    id: "DEF",
    slot: "DEF",
    player: {
      id: "p_49ersdst",
      name: "49ers D/ST",
      team: "SF",
      opponent: "vs LAR",
      position: "DEF",
      projection: 8.3,
    },
  },
  {
    id: "K",
    slot: "K",
    player: {
      id: "p_tucker",
      name: "Justin Tucker",
      team: "BAL",
      opponent: "vs PIT",
      position: "K",
      projection: 9.1,
    },
  },
];

const INITIAL_ROSTER_BENCH: RosterPlayer[] = [
  {
    id: "p_ceedee",
    name: "CeeDee Lamb",
    team: "DAL",
    opponent: "@ PHI",
    position: "WR",
    projection: 18.2,
  },
  {
    id: "p_jahmyr",
    name: "Jahmyr Gibbs",
    team: "DET",
    opponent: "vs MIN",
    position: "RB",
    projection: 15.8,
  },
  {
    id: "p_kelce",
    name: "Travis Kelce",
    team: "KC",
    opponent: "vs LV",
    position: "TE",
    projection: 14.1,
  },
  {
    id: "p_jamescook",
    name: "James Cook",
    team: "BUF",
    opponent: "@ NYJ",
    position: "RB",
    projection: 13.5,
  },
  {
    id: "p_butker",
    name: "Harrison Butker",
    team: "KC",
    opponent: "vs LV",
    position: "K",
    projection: 8.9,
  },
];

function HomeTabContent() {
  const router = useRouter();
  const [activePlayerEmote, setActivePlayerEmote] = useState<string | null>(
    null
  );
  const emoteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emoteOpacity = useRef(new Animated.Value(0)).current;
  const emoteTranslateY = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    return () => {
      if (emoteTimeoutRef.current) clearTimeout(emoteTimeoutRef.current);
    };
  }, []);

  const triggerPlayerEmote = (emoji: string) => {
    Haptics.selectionAsync().catch(() => {});
    setActivePlayerEmote(emoji);
    if (emoteTimeoutRef.current) clearTimeout(emoteTimeoutRef.current);
    emoteOpacity.stopAnimation();
    emoteTranslateY.stopAnimation();
    emoteOpacity.setValue(0);
    emoteTranslateY.setValue(6);

    Animated.parallel([
      Animated.timing(emoteOpacity, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }),
      Animated.timing(emoteTranslateY, {
        toValue: 0,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start();

    emoteTimeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(emoteOpacity, {
          toValue: 0,
          duration: 190,
          useNativeDriver: true,
        }),
        Animated.timing(emoteTranslateY, {
          toValue: -6,
          duration: 190,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setActivePlayerEmote(null);
      });
      emoteTimeoutRef.current = null;
    }, 2300);
  };

  return (
    <>
      <View style={styles.presenceSection}>
        <View style={styles.presenceHeader}>
          <Text style={styles.presenceLabel}>WHO'S HERE</Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>3 online</Text>
          </View>
        </View>

        <View style={styles.presenceRoom}>
          <PresenceCard
            label="Bench"
            status="away"
            size="away"
            imageSource={PRESENCE_BENCH}
          />
          <PresenceCard
            label="DraftWiz"
            status="live"
            size="live"
            imageSource={PRESENCE_DRAFTWIZ}
          />
          <PresenceCard
            label="You"
            status="live"
            size="you"
            imageSource={LEFT_CHARACTER}
            bubbleEmote={activePlayerEmote}
            bubbleOpacity={emoteOpacity}
            bubbleTranslateY={emoteTranslateY}
          />
          <PresenceCard
            label="JaxonPlay"
            status="live"
            size="live"
            imageSource={PRESENCE_JAXON}
          />
          <PresenceCard
            label="Sleeper"
            status="away"
            size="away"
            imageSource={PRESENCE_SLEEPER}
          />
        </View>

        <View style={styles.emoteBar}>
          {["🎉", "🔥", "👑", "😂", "💀", "💪"].map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.emoteBtn}
              activeOpacity={0.85}
              onPress={() => triggerPlayerEmote(emoji)}
            >
              <Text style={styles.emoteText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionDivider} />

      <TouchableOpacity
        activeOpacity={0.95}
        style={styles.recapCard}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          router.push("/(investor-demo)/squad-recap" as any);
        }}
      >
        <View style={styles.recapTop}>
          <View style={styles.recapIconWrap}>
            <MaterialIcons name="leaderboard" size={20} color="#3AB298" />
          </View>
          <View style={styles.recapBody}>
            <Text style={styles.recapEyebrow}>NEW · WEEK 14 FINAL</Text>
            <Text style={styles.recapTitle}>Squad recap is ready</Text>
            <Text style={styles.recapSub}>
              Won vs Blitz Kings · see how you ranked
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#6B7280" />
        </View>
        <View style={styles.recapStatsRow}>
          <StatBlock label="Win Result" value="WIN" accent="green" />
          <StatBlock label="Score" value="148-121" />
          <StatBlock label="Accuracy" value="87%" accent="amber" />
          <StatBlock label="XP Earned" value="+340 XP" accent="purple" />
        </View>
      </TouchableOpacity>

      <View style={styles.standingCard}>
        <View style={styles.standingHeader}>
          <Text style={styles.standingRank}>2nd</Text>
          <View style={styles.standingBody}>
            <Text style={styles.standingTitle}>League Standing</Text>
            <Text style={styles.standingSub}>
              Top 4 make playoffs · 4 weeks left
            </Text>
          </View>
        </View>
        <View style={styles.standingBarTrack}>
          <View style={styles.standingBarFill} />
        </View>
        <View style={styles.standingFooter}>
          <Text style={styles.standingFooterLeft}>4th place boundary</Text>
          <Text style={styles.standingFooterRight}>Playoffs locked ✓</Text>
        </View>
      </View>
    </>
  );
}

function PresenceCard({
  label,
  status,
  size,
  imageSource,
  bubbleEmote,
  bubbleOpacity,
  bubbleTranslateY,
}: {
  label: string;
  status: "live" | "away";
  size: "you" | "live" | "away";
  imageSource?: ImageSourcePropType;
  bubbleEmote?: string | null;
  bubbleOpacity?: Animated.Value;
  bubbleTranslateY?: Animated.Value;
}) {
  const isYou = size === "you";

  return (
    <View style={styles.presenceSlot}>
      {isYou && bubbleEmote ? (
        <Animated.View
          style={[
            styles.playerEmoteBubbleWrap,
            bubbleOpacity ? { opacity: bubbleOpacity } : null,
            bubbleTranslateY
              ? { transform: [{ translateY: bubbleTranslateY }] }
              : null,
          ]}
        >
          <View style={styles.playerEmoteBubble}>
            <Text style={styles.playerEmoteBubbleText}>{bubbleEmote}</Text>
          </View>
          <View style={styles.playerEmoteBubbleTail} />
        </Animated.View>
      ) : null}
      <View
        style={[
          styles.presenceCard,
          size === "you" && styles.presenceCardYou,
          size === "live" && styles.presenceCardLive,
          size === "away" && styles.presenceCardAway,
          status === "live" && styles.presenceCardLiveOutline,
        ]}
      >
        {imageSource ? (
          <Image
            source={imageSource}
            resizeMode="contain"
            style={[
              styles.presenceAvatarAsset,
              size === "you" && styles.presenceAvatarAssetYou,
              size === "live" && styles.presenceAvatarAssetLive,
              size === "away" && styles.presenceAvatarAssetAway,
            ]}
          />
        ) : null}
      </View>
      <Text
        style={[styles.presenceName, size === "you" && styles.presenceNameYou]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.presenceStatus,
          status === "live"
            ? styles.presenceStatusLive
            : styles.presenceStatusAway,
        ]}
      >
        • {status}
      </Text>
    </View>
  );
}

function StatBlock({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "amber" | "purple";
}) {
  return (
    <View style={styles.statBlock}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={[
          styles.statValue,
          accent === "green" && styles.statValueGreen,
          accent === "amber" && styles.statValueAmber,
          accent === "purple" && styles.statValuePurple,
        ]}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MatchupTabContent() {
  return (
    <>
      <View style={styles.matchupHeroV2}>
        <View style={styles.matchupHeroSurface}>
          <View style={styles.matchupHeroTopRow}>
            <View style={[styles.matchupTopBadge, styles.matchupTopBadgeLive]}>
              <View style={styles.matchupStageLiveDot} />
              <Text style={styles.matchupStageLiveText}>LIVE · WEEK 14</Text>
            </View>
          </View>

          <View style={styles.matchupAvatarLane}>
            <View style={styles.matchupAvatarSlotV2}>
              <View
                style={[styles.matchupAvatarOrb, styles.matchupAvatarOrbLeft]}
              >
                <View style={styles.matchupAvatarInner}>
                  <Image
                    source={LEFT_CHARACTER}
                    resizeMode="contain"
                    style={styles.matchupAvatarImageLeftV2}
                  />
                </View>
              </View>
            </View>

            <View style={styles.matchupCenterStack}>
              <Text style={styles.matchupCenterVs}>VS</Text>
            </View>

            <View style={styles.matchupAvatarSlotV2}>
              <View
                style={[styles.matchupAvatarOrb, styles.matchupAvatarOrbRight]}
              >
                <View style={styles.matchupAvatarInner}>
                  <Image
                    source={RIGHT_CHARACTER}
                    resizeMode="contain"
                    style={styles.matchupAvatarImageRightV2}
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.matchupScoreLine}>
            <Text
              style={[styles.matchupScoreNumber, styles.matchupScoreNumberLeft]}
            >
              142.6
            </Text>
            <View style={styles.matchupScoreDivider} />
            <Text
              style={[
                styles.matchupScoreNumber,
                styles.matchupScoreNumberRight,
              ]}
            >
              118.4
            </Text>
          </View>

          <View style={styles.matchupTeamRow}>
            <Text style={styles.matchupTeamNameLeft}>VENOM FC</Text>
            <Text style={styles.matchupTeamNameRight}>BLITZ</Text>
          </View>

          <View style={styles.matchupProjectionRow}>
            <Text style={styles.matchupProjectionText}>Proj 168.3</Text>
            <Text style={styles.matchupProjectionLead}>
              62% Win Probability
            </Text>
            <Text style={styles.matchupProjectionText}>Proj 152.1</Text>
          </View>

          <View style={styles.matchupWinBar}>
            <View style={styles.matchupWinBarLeft} />
            <View style={styles.matchupWinBarRight} />
          </View>
        </View>
      </View>

      <View style={styles.matchupTickerRow}>
        <View style={styles.matchupTickerItem}>
          <Text style={styles.matchupTickerTitle}>
            ⚡ J. Jefferson 34-yd TD
          </Text>
          <Text style={styles.matchupTickerSub}>Scoring Play · 2:14 ago</Text>
        </View>
        <View style={styles.matchupTickerItem}>
          <Text style={styles.matchupTickerTitle}>🔒 Lineup Vote Locked</Text>
          <Text style={styles.matchupTickerSub}>Squad consensus applied</Text>
        </View>
      </View>

      <View style={styles.matchupMetricRow}>
        <View style={styles.matchupMetricCard}>
          <Text style={styles.metricLabel}>Result if final now</Text>
          <Text style={[styles.metricValue, styles.metricAccentGreen]}>
            WIN +340 XP
          </Text>
        </View>
        <View style={styles.matchupMetricCard}>
          <Text style={styles.metricLabel}>Rivalry Heat</Text>
          <Text style={[styles.metricValue, styles.metricAccentPurple]}>
            HIGH · 87%
          </Text>
        </View>
      </View>

      <View style={styles.sectionLabel}>
        <View style={styles.sectionLine} />
        <Text style={styles.sectionText}>Starting Lineup</Text>
        <View style={styles.sectionLine} />
      </View>

      {STARTERS.map((row, idx) => (
        <MatchupLine key={`starter-${idx}-${row.position}`} row={row} />
      ))}

      <View style={styles.benchLabel}>
        <View style={styles.sectionLine} />
        <Text style={[styles.sectionText, styles.benchText]}>Bench</Text>
        <View style={styles.sectionLine} />
      </View>

      {BENCH.map((row, idx) => (
        <MatchupLine key={`bench-${idx}-${row.position}`} row={row} />
      ))}
    </>
  );
}

function TeamPlayerCard({
  side,
  player,
}: {
  side: "left" | "right";
  player: SidePlayer;
}) {
  const isLeft = side === "left";
  const isZero = player.points === "0.0";
  return (
    <View
      style={[
        styles.playerCard,
        isLeft ? styles.playerCardLeft : styles.playerCardRight,
        player.scoring ? styles.playerCardScoring : null,
        player.bench ? styles.playerCardBench : null,
      ]}
    >
      <Text
        style={[
          styles.playerPoints,
          isZero
            ? styles.playerPointsZero
            : isLeft
              ? styles.playerPointsGreen
              : styles.playerPointsBlue,
        ]}
      >
        {player.points}
      </Text>

      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{player.name}</Text>
        <Text style={styles.playerMeta}>{player.meta}</Text>
      </View>

      <View
        style={[
          styles.playerAvatar,
          isLeft ? styles.avatarGreen : styles.avatarBlue,
          player.bench ? styles.avatarGray : null,
        ]}
      >
        <Text
          style={[
            styles.playerAvatarText,
            player.bench ? styles.avatarGrayText : null,
          ]}
        >
          {player.initials}
        </Text>
        {player.injury ? (
          <View
            style={[
              styles.injuryDot,
              player.injury === "Q"
                ? styles.injuryQuestionable
                : styles.injuryOut,
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

function MatchupLine({ row }: { row: MatchupRow }) {
  return (
    <View style={styles.matchupRow}>
      <TeamPlayerCard side="left" player={row.left} />
      <View
        style={[
          styles.positionPill,
          row.bench ? styles.positionPillBench : null,
        ]}
      >
        <Text
          style={[
            styles.positionPillText,
            row.bench ? styles.positionPillTextBench : null,
          ]}
        >
          {row.position}
        </Text>
      </View>
      <TeamPlayerCard side="right" player={row.right} />
    </View>
  );
}

function canPlayerFillSlot(slot: StarterSlot, playerPosition: PlayerPosition) {
  if (slot === "FLEX") return playerPosition === "RB" || playerPosition === "WR" || playerPosition === "TE";
  return slot === playerPosition;
}

function RosterTabContent() {
  const [lineup, setLineup] = useState<StarterLineupSlot[]>(INITIAL_ROSTER_STARTERS);
  const [bench, setBench] = useState<RosterPlayer[]>(INITIAL_ROSTER_BENCH);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Tap a starter slot to view intelligent bench swaps.");

  const selectedSlot = useMemo(
    () => lineup.find((slot) => slot.id === selectedSlotId) ?? null,
    [lineup, selectedSlotId]
  );

  const eligibleBench = useMemo(() => {
    if (!selectedSlot) return [];
    return bench
      .filter((player) => canPlayerFillSlot(selectedSlot.slot, player.position))
      .sort((a, b) => b.projection - a.projection);
  }, [bench, selectedSlot]);

  const projectedTotal = useMemo(
    () => lineup.reduce((sum, slot) => sum + slot.player.projection, 0),
    [lineup]
  );

  const handleStarterPress = (slotId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedSlotId((current) => (current === slotId ? null : slotId));
  };

  const executeSwap = (incomingPlayerId: string) => {
    if (!selectedSlot) return;
    const benchIndex = bench.findIndex((player) => player.id === incomingPlayerId);
    if (benchIndex < 0) return;

    const benchPlayer = bench[benchIndex];
    if (!canPlayerFillSlot(selectedSlot.slot, benchPlayer.position)) {
      setStatusMessage(`${benchPlayer.name} is not eligible for ${selectedSlot.slot}.`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }

    const outgoingPlayer = selectedSlot.player;
    setLineup((previous) =>
      previous.map((slot) =>
        slot.id === selectedSlot.id
          ? {
              ...slot,
              player: benchPlayer,
            }
          : slot
      )
    );
    setBench((previous) =>
      previous.map((player, idx) => (idx === benchIndex ? outgoingPlayer : player))
    );
    setSelectedSlotId(null);
    setStatusMessage(`Swapped ${benchPlayer.name} in for ${outgoingPlayer.name}.`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const autoOptimizeSelectedSlot = () => {
    if (!selectedSlot) return;
    if (!eligibleBench.length) {
      setStatusMessage(`No eligible bench options for ${selectedSlot.slot}.`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }

    const bestOption = eligibleBench[0];
    const delta = bestOption.projection - selectedSlot.player.projection;
    if (delta <= 0) {
      setStatusMessage(`${selectedSlot.player.name} is already your highest projection at ${selectedSlot.slot}.`);
      Haptics.selectionAsync().catch(() => {});
      return;
    }

    executeSwap(bestOption.id);
    setStatusMessage(
      `Optimized ${selectedSlot.slot}: +${delta.toFixed(1)} pts (${bestOption.name} over ${selectedSlot.player.name}).`
    );
  };

  return (
    <View style={styles.rosterWrap}>
      <View style={styles.rosterSummaryCard}>
        <View style={styles.rosterSummaryHeader}>
          <Text style={styles.rosterSummaryTitle}>Set Lineup</Text>
          <View style={styles.rosterSummaryBadge}>
            <Text style={styles.rosterSummaryBadgeText}>WEEK 14</Text>
          </View>
        </View>
        <View style={styles.rosterProjectionRow}>
          <Text style={styles.rosterProjectionLabel}>Projected Total</Text>
          <Text style={styles.rosterProjectionValue}>{projectedTotal.toFixed(1)}</Text>
        </View>
        <Text style={styles.rosterStatusText}>{statusMessage}</Text>
      </View>

      <View style={styles.rosterSectionHeader}>
        <Text style={styles.rosterSectionTitle}>Starting Lineup</Text>
        <Text style={styles.rosterSectionSub}>Tap a slot to swap</Text>
      </View>

      {lineup.map((slot) => {
        const isSelected = slot.id === selectedSlotId;
        return (
          <TouchableOpacity
            key={slot.id}
            activeOpacity={0.9}
            style={[styles.rosterSlotCard, isSelected && styles.rosterSlotCardSelected]}
            onPress={() => handleStarterPress(slot.id)}
          >
            <View style={styles.rosterSlotPill}>
              <Text style={styles.rosterSlotPillText}>{slot.slot}</Text>
            </View>
            <View style={styles.rosterSlotBody}>
              <Text style={styles.rosterPlayerName}>{slot.player.name}</Text>
              <Text style={styles.rosterPlayerMeta}>
                {slot.player.team} · {slot.player.position} · {slot.player.opponent}
              </Text>
            </View>
            <Text style={styles.rosterPlayerProjection}>{slot.player.projection.toFixed(1)}</Text>
          </TouchableOpacity>
        );
      })}

      <View style={styles.rosterSectionHeader}>
        <Text style={styles.rosterSectionTitle}>Bench</Text>
        <Text style={styles.rosterSectionSub}>All spots: BE</Text>
      </View>

      {bench.map((player) => {
        const eligible = selectedSlot ? canPlayerFillSlot(selectedSlot.slot, player.position) : false;
        return (
          <TouchableOpacity
            key={player.id}
            activeOpacity={0.9}
            disabled={!selectedSlot || !eligible}
            onPress={() => executeSwap(player.id)}
            style={[
              styles.rosterBenchCard,
              selectedSlot && eligible && styles.rosterBenchCardEligible,
              selectedSlot && !eligible && styles.rosterBenchCardDisabled,
            ]}
          >
            <View style={styles.rosterSlotPillBench}>
              <Text style={styles.rosterSlotPillText}>BE</Text>
            </View>
            <View style={styles.rosterSlotBody}>
              <Text style={styles.rosterPlayerName}>{player.name}</Text>
              <Text style={styles.rosterPlayerMeta}>
                {player.team} · {player.position} · {player.opponent}
              </Text>
            </View>
            <View style={styles.rosterBenchRight}>
              <Text style={styles.rosterPlayerProjection}>{player.projection.toFixed(1)}</Text>
              {selectedSlot ? (
                <Text style={[styles.rosterBenchAction, eligible ? styles.rosterBenchActionOn : styles.rosterBenchActionOff]}>
                  {eligible ? "Swap" : "Ineligible"}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}

      {selectedSlot ? (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.rosterAutoButton}
          onPress={autoOptimizeSelectedSlot}
        >
          <MaterialIcons name="auto-fix-high" size={16} color="#0b1e19" />
          <Text style={styles.rosterAutoButtonText}>Auto optimize {selectedSlot.slot}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <View style={styles.emptyTabWrap}>
      <Text style={styles.emptyTabTitle}>{label}</Text>
      <Text style={styles.emptyTabSub}>Coming soon in this demo build.</Text>
    </View>
  );
}

export default function LeaguePlayScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LeagueTab>("home");

  const content = useMemo(() => {
    if (activeTab === "home") return <HomeTabContent />;
    if (activeTab === "matchup") return <MatchupTabContent />;
    if (activeTab === "roster") return <RosterTabContent />;
    if (activeTab === "players") return <EmptyTab label="Players" />;
    return <EmptyTab label="League" />;
  }, [activeTab]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.root}>
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.85}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              router.replace("/(investor-demo)/home-v2" as any);
            }}
          >
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>THE PACK</Text>
          <View style={styles.topRightIcon}>
            <MaterialIcons
              name="chat-bubble-outline"
              size={16}
              color="#f0f0f0"
            />
            <View style={styles.notifDot} />
          </View>
        </View>

        <View style={styles.leagueLabelRow}>
          <Text style={styles.leagueLabelEyebrow}>LEAGUE</Text>
          <View style={styles.leaguePill}>
            <Text style={styles.leaguePillDot}>●</Text>
            <Text style={styles.leaguePillText}>Wolf Pack Dynasty</Text>
            <Text style={styles.leaguePillChevron}>⌄</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {LEAGUE_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                DISABLED_TABS.includes(tab.id) && styles.tabDisabled,
              ]}
              disabled={DISABLED_TABS.includes(tab.id)}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActiveTab(tab.id);
              }}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.tabTextActive,
                  DISABLED_TABS.includes(tab.id) && styles.tabTextDisabled,
                ]}
              >
                {tab.label}
              </Text>
              {activeTab === tab.id ? (
                <View style={styles.tabActiveLine} />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingBottom: 28,
          }}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0e1014" },
  root: { flex: 1, backgroundColor: "#0e1014" },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 8,
  },
  statusTime: {
    color: "#f0f0f0",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  statusRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  signalBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 12,
    gap: 2,
  },
  signalBar: { width: 3, borderRadius: 1, backgroundColor: "#f0f0f0" },
  battery: {
    width: 22,
    height: 12,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
    padding: 1.5,
    justifyContent: "center",
  },
  batteryFill: {
    width: "75%",
    height: "100%",
    backgroundColor: "#f0f0f0",
    borderRadius: 1,
  },

  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#13161c",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    color: "#9ca3af",
    fontSize: 22,
    lineHeight: 22,
    marginTop: -1,
  },
  pageTitle: {
    color: "#f0f0f0",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  topRightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#13161c",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#3ab298",
    borderWidth: 2,
    borderColor: "#13161c",
  },

  leagueLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  leagueLabelEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#6b7280",
  },
  leaguePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(127,101,192,0.25)",
    backgroundColor: "rgba(127,101,192,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  leaguePillDot: { color: "#7f65c0", fontSize: 9 },
  leaguePillText: { color: "#7f65c0", fontSize: 13, fontWeight: "700" },
  leaguePillChevron: { color: "#7f65c0", fontSize: 10 },

  tabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 11,
    position: "relative",
  },
  tabDisabled: { opacity: 0.45 },
  tabText: { color: "#6b7280", fontSize: 12, fontWeight: "600" },
  tabTextActive: { color: "#f0f0f0" },
  tabTextDisabled: { color: "#4b5563" },
  tabActiveLine: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: -1,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#3ab298",
  },

  scroll: { flex: 1 },

  rosterWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  rosterSummaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(58,178,152,0.28)",
    backgroundColor: "rgba(20,25,34,0.96)",
    padding: 14,
    marginBottom: 14,
  },
  rosterSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  rosterSummaryTitle: {
    color: "#f0f0f0",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  rosterSummaryBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(127,101,192,0.35)",
    backgroundColor: "rgba(127,101,192,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rosterSummaryBadgeText: {
    color: "#b7a2ff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  rosterProjectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  rosterProjectionLabel: {
    color: "#8ea1b8",
    fontSize: 13,
    fontWeight: "700",
  },
  rosterProjectionValue: {
    color: "#8dff8a",
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  rosterStatusText: {
    color: "#9ca3af",
    fontSize: 12,
    lineHeight: 17,
  },
  rosterSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 8,
  },
  rosterSectionTitle: {
    color: "#f0f0f0",
    fontSize: 17,
    fontWeight: "800",
  },
  rosterSectionSub: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  rosterSlotCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(82,98,130,0.42)",
    backgroundColor: "#131922",
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 9,
  },
  rosterSlotCardSelected: {
    borderColor: "rgba(58,178,152,0.62)",
    backgroundColor: "rgba(19,35,34,0.75)",
    shadowColor: "#3ab298",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  rosterSlotPill: {
    minWidth: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#1a1f2b",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  rosterSlotPillBench: {
    minWidth: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#1d2330",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  rosterSlotPillText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  rosterSlotBody: {
    flex: 1,
    minWidth: 0,
  },
  rosterPlayerName: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  rosterPlayerMeta: {
    color: "#93a4bd",
    fontSize: 11,
    fontWeight: "600",
  },
  rosterPlayerProjection: {
    color: "#9aff75",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 22,
    letterSpacing: -0.4,
    minWidth: 46,
    textAlign: "right",
  },
  rosterBenchCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(72,82,110,0.45)",
    backgroundColor: "#111722",
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 9,
  },
  rosterBenchCardEligible: {
    borderColor: "rgba(58,178,152,0.55)",
    backgroundColor: "rgba(23,38,41,0.82)",
  },
  rosterBenchCardDisabled: {
    opacity: 0.64,
  },
  rosterBenchRight: {
    alignItems: "flex-end",
    minWidth: 70,
  },
  rosterBenchAction: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  rosterBenchActionOn: {
    color: "#3ab298",
  },
  rosterBenchActionOff: {
    color: "#6b7280",
  },
  rosterAutoButton: {
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    backgroundColor: "#5ee2be",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
  },
  rosterAutoButtonText: {
    color: "#0b1e19",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  presenceSection: { paddingHorizontal: 20, paddingTop: 16 },
  presenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  presenceLabel: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#3ab298",
  },
  onlineText: { color: "#3ab298", fontSize: 12, fontWeight: "700" },
  presenceRoom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  presenceSlot: { alignItems: "center", gap: 2 },
  presenceCard: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#13161c",
  },
  presenceCardYou: { width: 84, height: 106, borderRadius: 18 },
  presenceCardLive: { width: 65, height: 82 },
  presenceCardAway: { width: 50, height: 63, opacity: 0.45 },
  presenceCardLiveOutline: { borderColor: "#3ab298" },
  presenceEmoji: { fontSize: 28 },
  presenceAvatarAsset: { width: "92%", height: "92%" },
  presenceAvatarAssetYou: { width: "96%", height: "96%" },
  presenceAvatarAssetLive: { width: "94%", height: "94%" },
  presenceAvatarAssetAway: { width: "88%", height: "88%" },
  presenceName: { color: "#f0f0f0", fontSize: 10, fontWeight: "700" },
  presenceNameYou: { color: "#3ab298", fontSize: 11 },
  presenceStatus: { fontSize: 9, fontWeight: "600" },
  presenceStatusLive: { color: "#3ab298" },
  presenceStatusAway: { color: "#6b7280" },
  playerEmoteBubbleWrap: {
    position: "absolute",
    top: -36,
    left: "50%",
    transform: [{ translateX: -18 }],
    alignItems: "center",
    zIndex: 10,
  },
  playerEmoteBubble: {
    minWidth: 36,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(58,178,152,0.5)",
    backgroundColor: "rgba(19,22,28,0.96)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3ab298",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  playerEmoteBubbleText: { fontSize: 18, lineHeight: 19 },
  playerEmoteBubbleTail: {
    marginTop: -1,
    width: 10,
    height: 10,
    backgroundColor: "rgba(19,22,28,0.96)",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(58,178,152,0.5)",
    transform: [{ rotate: "45deg" }],
  },

  emoteBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingTop: 16,
    paddingBottom: 6,
  },
  emoteBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#13161c",
    alignItems: "center",
    justifyContent: "center",
  },
  emoteText: { fontSize: 16 },

  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginHorizontal: 20,
    marginTop: 10,
  },

  recapCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#13161c",
    overflow: "hidden",
  },
  recapTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  recapIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(58,178,152,0.35)",
    backgroundColor: "rgba(58,178,152,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  recapBody: { flex: 1 },
  recapEyebrow: {
    color: "#3ab298",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  recapTitle: {
    color: "#f0f0f0",
    fontSize: 25,
    fontWeight: "800",
    lineHeight: 28,
  },
  recapSub: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  recapStatsRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  statValue: {
    color: "#f0f0f0",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 21,
    width: "100%",
    includeFontPadding: false,
  },
  statValueGreen: { color: "#3ab298" },
  statValueAmber: { color: "#c9943a" },
  statValuePurple: { color: "#7f65c0" },
  statLabel: {
    color: "#6b7280",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 3,
    fontWeight: "700",
  },

  standingCard: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#13161c",
    padding: 14,
  },
  standingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  standingRank: {
    color: "#3ab298",
    fontSize: 44,
    fontWeight: "800",
    lineHeight: 44,
  },
  standingBody: { flex: 1 },
  standingTitle: {
    color: "#f0f0f0",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 24,
  },
  standingSub: { color: "#9ca3af", fontSize: 17, marginTop: 2, lineHeight: 22 },
  standingBarTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#1a1e27",
    overflow: "hidden",
    marginBottom: 7,
  },
  standingBarFill: {
    width: "74%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#7f65c0",
  },
  standingFooter: { flexDirection: "row", justifyContent: "space-between" },
  standingFooterLeft: { color: "#6b7280", fontSize: 14, fontWeight: "600" },
  standingFooterRight: { color: "#3ab298", fontSize: 14, fontWeight: "700" },

  matchupHeroV2: {
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(88,95,141,0.5)",
    backgroundColor: "#131922",
    overflow: "hidden",
    shadowColor: "#7f65c0",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  matchupHeroSurface: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "rgba(13,18,28,0.92)",
  },
  matchupHeroTopRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 10,
  },
  matchupTopBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  matchupTopBadgeLive: {
    borderColor: "rgba(58,178,152,0.5)",
    backgroundColor: "rgba(58,178,152,0.14)",
  },
  matchupStageLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3ab298",
  },
  matchupStageLiveText: {
    color: "#89f0d8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  matchupAvatarLane: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  matchupAvatarSlotV2: {
    width: 132,
    height: 132,
    alignItems: "center",
    justifyContent: "center",
  },
  matchupAvatarOrb: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  matchupAvatarOrbLeft: {
    borderColor: "rgba(127,255,95,0.34)",
    backgroundColor: "rgba(127,255,95,0.08)",
  },
  matchupAvatarOrbRight: {
    borderColor: "rgba(58,178,152,0.34)",
    backgroundColor: "rgba(30,89,120,0.18)",
  },
  matchupAvatarInner: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(9,13,20,0.9)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  matchupAvatarImageLeftV2: {
    width: 108,
    height: 132,
    marginTop: 6,
  },
  matchupAvatarImageRightV2: {
    width: 108,
    height: 132,
    marginTop: 6,
  },
  matchupCenterStack: {
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    marginHorizontal: -8,
  },
  matchupCenterVs: {
    color: "#f8fafc",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  matchupScoreLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  matchupScoreNumber: {
    fontSize: 43,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  matchupScoreNumberLeft: { color: "#9aff75" },
  matchupScoreNumberRight: { color: "#71d9ff" },
  matchupScoreDivider: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(203,213,225,0.5)",
  },
  matchupTeamRow: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchupTeamNameLeft: {
    color: "#9aff75",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  matchupTeamNameRight: {
    color: "#71d9ff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  matchupProjectionRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchupProjectionText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
  },
  matchupProjectionLead: {
    color: "#c6b5ff",
    fontSize: 11,
    fontWeight: "800",
  },
  matchupWinBar: {
    marginTop: 8,
    height: 5,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(36,45,68,0.9)",
    flexDirection: "row",
  },
  matchupWinBarLeft: { width: "62%", backgroundColor: "#3ab298" },
  matchupWinBarRight: { flex: 1, backgroundColor: "#6ec7ff" },
  matchupTickerRow: {
    marginHorizontal: 14,
    marginBottom: 8,
    flexDirection: "row",
    gap: 8,
  },
  matchupTickerItem: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(72,98,140,0.45)",
    backgroundColor: "#131922",
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  matchupTickerTitle: {
    color: "#f1f5f9",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 3,
  },
  matchupTickerSub: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "600",
  },
  matchupMetricRow: {
    marginHorizontal: 14,
    marginBottom: 4,
    flexDirection: "row",
    gap: 8,
  },
  matchupMetricCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(72,98,140,0.45)",
    backgroundColor: "#131922",
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  metricLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  metricAccentGreen: { color: "#8dff8a" },
  metricAccentPurple: { color: "#c7b8ff" },

  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  sectionText: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  benchLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  benchText: { opacity: 0.7 },

  matchupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    paddingHorizontal: 12,
    marginBottom: 6,
    minHeight: 54,
  },
  playerCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: "#13161c",
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  playerCardLeft: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderRightWidth: 0,
    flexDirection: "row-reverse",
  },
  playerCardRight: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderLeftWidth: 0,
  },
  playerCardScoring: { borderColor: "rgba(127,255,95,0.22)" },
  playerCardBench: { opacity: 0.58 },
  playerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    position: "relative",
  },
  avatarGreen: {
    backgroundColor: "rgba(58,178,152,0.35)",
    borderColor: "rgba(127,255,95,0.35)",
  },
  avatarBlue: {
    backgroundColor: "rgba(59,130,246,0.35)",
    borderColor: "rgba(0,212,255,0.35)",
  },
  avatarGray: {
    backgroundColor: "#1a1e27",
    borderColor: "rgba(255,255,255,0.08)",
  },
  playerAvatarText: {
    color: "#f0f0f0",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  avatarGrayText: { color: "#6b7280" },
  injuryDot: {
    position: "absolute",
    right: -1,
    top: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#0e1014",
  },
  injuryQuestionable: { backgroundColor: "#f59e0b" },
  injuryOut: { backgroundColor: "#ef4444" },
  playerInfo: { flex: 1, minWidth: 0 },
  playerName: {
    color: "#f0f0f0",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: -0.05,
  },
  playerMeta: { color: "#6b7280", fontSize: 9, fontWeight: "500" },
  playerPoints: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 16,
    minWidth: 36,
    textAlign: "center",
  },
  playerPointsGreen: { color: "#7fff5f" },
  playerPointsBlue: { color: "#00d4ff" },
  playerPointsZero: { color: "#6b7280" },
  positionPill: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1a1e27",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  positionPillBench: { opacity: 0.45 },
  positionPillText: {
    color: "#9ca3af",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  positionPillTextBench: { color: "#6b7280" },

  emptyTabWrap: {
    marginTop: 18,
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#13161c",
    paddingVertical: 42,
    alignItems: "center",
  },
  emptyTabTitle: {
    color: "#f0f0f0",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptyTabSub: { color: "#9ca3af", fontSize: 13 },

  bottomNavWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(19,22,28,0.97)",
  },
  bottomNav: { flexDirection: "row", paddingTop: 10, paddingBottom: 0 },
  navItem: { flex: 1, alignItems: "center", gap: 4 },
  navLabel: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  navLabelActive: { color: "#3ab298" },
});
