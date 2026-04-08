import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import {
  Animated,
  Image,
  Modal,
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
const TAUNT_JEFFERSON_GIF = require("../../assets/demo-assets/taunt-jefferson-td.gif");

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

const SLOT_START_CONFIDENCE: Record<string, number> = {
  QB: 82,
  RB1: 71,
  RB2: 66,
  WR1: 88,
  WR2: 61,
  FLEX: 57,
  TE: 73,
  DEF: 69,
  K: 64,
};

const VOTE_MEMBERS: Array<{
  id: string;
  name: string;
  avatar: ImageSourcePropType;
}> = [
  { id: "you", name: "You", avatar: LEFT_CHARACTER },
  { id: "draftwiz", name: "DraftWiz", avatar: PRESENCE_DRAFTWIZ },
  { id: "jaxon", name: "JaxonPlay", avatar: PRESENCE_JAXON },
  { id: "benchboss", name: "BenchBoss", avatar: PRESENCE_BENCH },
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
  const [isTauntPreviewOpen, setIsTauntPreviewOpen] = useState(false);

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
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.matchupTickerItem}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            setIsTauntPreviewOpen(true);
          }}
        >
          <View style={styles.matchupTickerTitleRow}>
            <Text style={styles.matchupTickerTitle}>⚡ J. Jefferson 34-yd TD</Text>
            <View style={styles.tauntChip}>
              <Text style={styles.tauntChipText}>🗣 Taunt Now</Text>
            </View>
          </View>
          <Text style={styles.matchupTickerSub}>Scoring Play · 2:14 ago</Text>
        </TouchableOpacity>
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

      <Modal
        visible={isTauntPreviewOpen}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setIsTauntPreviewOpen(false)}
      >
        <View style={styles.tauntPreviewScreen}>
          <View style={styles.tauntLetterboxTop} />
          <View style={styles.tauntLetterboxBottom} />
          <TouchableOpacity
            style={styles.tauntPreviewClose}
            onPress={() => setIsTauntPreviewOpen(false)}
            activeOpacity={0.85}
          >
            <Text style={styles.tauntPreviewCloseText}>Done</Text>
          </TouchableOpacity>
          <View style={styles.tauntPreviewHeader}>
            <Text style={styles.tauntPreviewEyebrow}>TAUNT PREVIEW</Text>
            <Text style={styles.tauntPreviewTitle}>What Your Opponent Sees</Text>
          </View>
          <View style={styles.tauntPreviewFrame}>
            <Image
              source={TAUNT_JEFFERSON_GIF}
              resizeMode="contain"
              style={styles.tauntPreviewGif}
            />
          </View>
          <Text style={styles.tauntPreviewHint}>Auto-closes after the play window.</Text>
        </View>
      </Modal>
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

function hashToInt(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getPlayerVoteMeta(playerId: string, playerProjection: number) {
  const baseSeed = hashToInt(playerId);
  const support =
    Math.min(92, Math.max(54, Math.round(48 + playerProjection * 1.55 + (baseSeed % 16))));
  const voterCount = Math.min(
    VOTE_MEMBERS.length,
    Math.max(1, Math.round((support / 100) * VOTE_MEMBERS.length))
  );
  const startIndex = baseSeed % VOTE_MEMBERS.length;
  const voters = Array.from({ length: voterCount }, (_, idx) => {
    const member = VOTE_MEMBERS[(startIndex + idx) % VOTE_MEMBERS.length];
    return member;
  });
  return { support, voters };
}

function RosterTabContent() {
  const [lineup, setLineup] = useState<StarterLineupSlot[]>(INITIAL_ROSTER_STARTERS);
  const [bench, setBench] = useState<RosterPlayer[]>(INITIAL_ROSTER_BENCH);
  const [statusMessage, setStatusMessage] = useState(
    "Tap any starter or bench player to open the swap sheet."
  );
  const [swapSheet, setSwapSheet] = useState<
    | { visible: false; source: null; starterId: null; benchId: null }
    | { visible: true; source: "starter"; starterId: string; benchId: null }
    | { visible: true; source: "bench"; starterId: null; benchId: string }
  >({ visible: false, source: null, starterId: null, benchId: null });

  const projectedTotal = useMemo(
    () => lineup.reduce((sum, slot) => sum + slot.player.projection, 0),
    [lineup]
  );

  const selectedStarter = useMemo(() => {
    if (swapSheet.source !== "starter" || !swapSheet.starterId) return null;
    return lineup.find((slot) => slot.id === swapSheet.starterId) ?? null;
  }, [lineup, swapSheet]);

  const selectedBench = useMemo(() => {
    if (swapSheet.source !== "bench" || !swapSheet.benchId) return null;
    return bench.find((player) => player.id === swapSheet.benchId) ?? null;
  }, [bench, swapSheet]);

  const starterEligibleBench = useMemo(() => {
    if (!selectedStarter) return [];
    return bench
      .filter((player) => canPlayerFillSlot(selectedStarter.slot, player.position))
      .sort((a, b) => b.projection - a.projection);
  }, [bench, selectedStarter]);

  const benchEligibleStarters = useMemo(() => {
    if (!selectedBench) return [];
    return lineup.filter((slot) => canPlayerFillSlot(slot.slot, selectedBench.position));
  }, [lineup, selectedBench]);

  const openStarterSwapSheet = (slotId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSwapSheet({
      visible: true,
      source: "starter",
      starterId: slotId,
      benchId: null,
    });
  };

  const openBenchSwapSheet = (benchPlayerId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSwapSheet({
      visible: true,
      source: "bench",
      starterId: null,
      benchId: benchPlayerId,
    });
  };

  const closeSwapSheet = () =>
    setSwapSheet({ visible: false, source: null, starterId: null, benchId: null });

  const swapStarterWithBench = (starterSlotId: string, benchPlayerId: string) => {
    const starter = lineup.find((slot) => slot.id === starterSlotId);
    if (!starter) return;
    const benchIndex = bench.findIndex((player) => player.id === benchPlayerId);
    if (benchIndex < 0) return;

    const benchPlayer = bench[benchIndex];
    if (!canPlayerFillSlot(starter.slot, benchPlayer.position)) {
      setStatusMessage(`${benchPlayer.name} is not eligible for ${starter.slot}.`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }

    const outgoingPlayer = starter.player;
    setLineup((previous) =>
      previous.map((slot) =>
        slot.id === starter.id
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
    setStatusMessage(`Swapped ${benchPlayer.name} in for ${outgoingPlayer.name}.`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    closeSwapSheet();
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
        <View style={styles.rosterSummarySocialRow}>
          <View style={styles.rosterSummaryAvatarStack}>
            {VOTE_MEMBERS.map((member, idx) => (
              <Image
                key={`summary-voter-${member.id}`}
                source={member.avatar}
                resizeMode="contain"
                style={[
                  styles.rosterSummaryAvatar,
                  idx > 0 && { marginLeft: -7 },
                ]}
              />
            ))}
          </View>
          <Text style={styles.rosterSummarySocialText}>4/4 squadmates submitted lineup votes</Text>
        </View>
        <Text style={styles.rosterStatusText}>{statusMessage}</Text>
      </View>

      <View style={styles.rosterSectionHeader}>
        <Text style={styles.rosterSectionTitle}>Starting Lineup</Text>
        <Text style={styles.rosterSectionSub}>Tap any player to swap</Text>
      </View>

      {lineup.map((slot, index) => {
        const voteMeta = getPlayerVoteMeta(slot.player.id, slot.player.projection);
        const slotConfidence = SLOT_START_CONFIDENCE[slot.id] ?? 65;
        const leftMiniAvatar = voteMeta.voters[0]?.avatar ?? VOTE_MEMBERS[index % VOTE_MEMBERS.length]?.avatar;
        const rightMiniAvatar =
          voteMeta.voters[1]?.avatar ??
          VOTE_MEMBERS[(index + 1) % VOTE_MEMBERS.length]?.avatar;
        return (
          <TouchableOpacity
            key={slot.id}
            activeOpacity={0.9}
            style={styles.rosterSlotCard}
            onPress={() => openStarterSwapSheet(slot.id)}
          >
            <View style={styles.rosterSlotPill}>
              <Text style={styles.rosterSlotPillText}>{slot.slot}</Text>
            </View>
            <View style={styles.rosterSlotBody}>
              <Text style={styles.rosterPlayerName}>{slot.player.name}</Text>
              <Text style={styles.rosterPlayerMeta}>
                {slot.player.team} · {slot.player.position} · {slot.player.opponent}
              </Text>
              <View style={styles.rosterSlotVoteRow}>
                <View style={styles.rosterSlotMiniAvatars}>
                  <Image source={leftMiniAvatar} resizeMode="contain" style={styles.rosterSlotMiniAvatar} />
                  <Image source={rightMiniAvatar} resizeMode="contain" style={styles.rosterSlotMiniAvatarOverlap} />
                </View>
                <Text style={styles.rosterSlotVoteText}>
                  {slotConfidence}% squad start vote
                </Text>
              </View>
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
        const hasStarterPath = lineup.some((slot) =>
          canPlayerFillSlot(slot.slot, player.position)
        );
        return (
          <TouchableOpacity
            key={player.id}
            activeOpacity={0.9}
            onPress={() => {
              if (!hasStarterPath) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
                setStatusMessage(`${player.name} has no eligible starter slot.`);
                return;
              }
              openBenchSwapSheet(player.id);
            }}
            style={[
              styles.rosterBenchCard,
              hasStarterPath && styles.rosterBenchCardEligible,
              !hasStarterPath && styles.rosterBenchCardDisabled,
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
              <Text style={[styles.rosterBenchAction, hasStarterPath ? styles.rosterBenchActionOn : styles.rosterBenchActionOff]}>
                {hasStarterPath ? "Swap" : "Ineligible"}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <Modal
        visible={swapSheet.visible}
        transparent
        animationType="slide"
        onRequestClose={closeSwapSheet}
      >
        <View style={styles.rosterSheetOverlay}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.rosterSheetBackdrop}
            onPress={closeSwapSheet}
          />
          <View style={styles.rosterSheetCard}>
            <View style={styles.rosterSheetHandle} />
            <View style={styles.rosterSheetHeader}>
              <Text style={styles.rosterSheetTitle}>Swap Player</Text>
              <TouchableOpacity activeOpacity={0.8} onPress={closeSwapSheet}>
                <MaterialIcons name="close" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {selectedStarter ? (
              <>
                <Text style={styles.rosterSheetSub}>
                  {selectedStarter.slot} currently starting
                </Text>
                <View style={styles.rosterSheetSelectedCard}>
                  <View style={styles.rosterSlotPill}>
                    <Text style={styles.rosterSlotPillText}>{selectedStarter.slot}</Text>
                  </View>
                  <View style={styles.rosterSlotBody}>
                    <Text style={styles.rosterPlayerName}>{selectedStarter.player.name}</Text>
                    <Text style={styles.rosterPlayerMeta}>
                      {selectedStarter.player.team} · {selectedStarter.player.position} ·{" "}
                      {selectedStarter.player.opponent}
                    </Text>
                  </View>
                  <Text style={styles.rosterPlayerProjection}>
                    {selectedStarter.player.projection.toFixed(1)}
                  </Text>
                </View>

                <Text style={styles.rosterSheetSectionLabel}>Eligible bench options</Text>
                <ScrollView style={styles.rosterSheetList} showsVerticalScrollIndicator={false}>
                  {starterEligibleBench.map((player) => {
                    const voteMeta = getPlayerVoteMeta(player.id, player.projection);
                    return (
                      <TouchableOpacity
                        key={player.id}
                        style={styles.rosterSheetOptionCard}
                        activeOpacity={0.88}
                        onPress={() => swapStarterWithBench(selectedStarter.id, player.id)}
                      >
                        <View style={styles.rosterSheetOptionTop}>
                          <View style={styles.rosterSlotPillBench}>
                            <Text style={styles.rosterSlotPillText}>BE</Text>
                          </View>
                          <View style={styles.rosterSlotBody}>
                            <Text style={styles.rosterPlayerName}>{player.name}</Text>
                            <Text style={styles.rosterPlayerMeta}>
                              {player.team} · {player.position} · {player.opponent}
                            </Text>
                          </View>
                          <Text style={styles.rosterPlayerProjection}>
                            {player.projection.toFixed(1)}
                          </Text>
                        </View>
                        <View style={styles.rosterSheetVoteRow}>
                          <Text style={styles.rosterSheetVoteText}>
                            {voteMeta.support}% want this player to start
                          </Text>
                          <View style={styles.rosterSheetSwapChip}>
                            <Text style={styles.rosterSheetSwapChipText}>Tap to swap</Text>
                          </View>
                          <View style={styles.rosterSheetVoters}>
                            {voteMeta.voters.map((voter, idx) => (
                              <Image
                                key={`${player.id}-${voter.id}-${idx}`}
                                source={voter.avatar}
                                resizeMode="contain"
                                style={styles.rosterSheetVoterAvatar}
                              />
                            ))}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}

            {selectedBench ? (
              <>
                <Text style={styles.rosterSheetSub}>Bench player selected</Text>
                <View style={styles.rosterSheetSelectedCard}>
                  <View style={styles.rosterSlotPillBench}>
                    <Text style={styles.rosterSlotPillText}>BE</Text>
                  </View>
                  <View style={styles.rosterSlotBody}>
                    <Text style={styles.rosterPlayerName}>{selectedBench.name}</Text>
                    <Text style={styles.rosterPlayerMeta}>
                      {selectedBench.team} · {selectedBench.position} · {selectedBench.opponent}
                    </Text>
                  </View>
                  <Text style={styles.rosterPlayerProjection}>
                    {selectedBench.projection.toFixed(1)}
                  </Text>
                </View>

                <Text style={styles.rosterSheetSectionLabel}>Eligible starter slots</Text>
                <ScrollView style={styles.rosterSheetList} showsVerticalScrollIndicator={false}>
                  {benchEligibleStarters.map((starterSlot) => {
                    const voteMeta = getPlayerVoteMeta(
                      starterSlot.player.id,
                      starterSlot.player.projection
                    );
                    return (
                      <TouchableOpacity
                        key={starterSlot.id}
                        style={styles.rosterSheetOptionCard}
                        activeOpacity={0.88}
                        onPress={() => swapStarterWithBench(starterSlot.id, selectedBench.id)}
                      >
                        <View style={styles.rosterSheetOptionTop}>
                          <View style={styles.rosterSlotPill}>
                            <Text style={styles.rosterSlotPillText}>{starterSlot.slot}</Text>
                          </View>
                          <View style={styles.rosterSlotBody}>
                            <Text style={styles.rosterPlayerName}>{starterSlot.player.name}</Text>
                            <Text style={styles.rosterPlayerMeta}>
                              {starterSlot.player.team} · {starterSlot.player.position} ·{" "}
                              {starterSlot.player.opponent}
                            </Text>
                          </View>
                          <Text style={styles.rosterPlayerProjection}>
                            {starterSlot.player.projection.toFixed(1)}
                          </Text>
                        </View>
                        <View style={styles.rosterSheetVoteRow}>
                          <Text style={styles.rosterSheetVoteText}>
                            {voteMeta.support}% voted to keep this starter
                          </Text>
                          <View style={styles.rosterSheetSwapChip}>
                            <Text style={styles.rosterSheetSwapChipText}>Tap to swap</Text>
                          </View>
                          <View style={styles.rosterSheetVoters}>
                            {voteMeta.voters.map((voter, idx) => (
                              <Image
                                key={`${starterSlot.id}-${voter.id}-${idx}`}
                                source={voter.avatar}
                                resizeMode="contain"
                                style={styles.rosterSheetVoterAvatar}
                              />
                            ))}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
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
    marginBottom: 7,
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
  rosterSummarySocialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 7,
  },
  rosterSummaryAvatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  rosterSummaryAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(15,23,42,0.85)",
    borderWidth: 1,
    borderColor: "rgba(99,114,140,0.4)",
  },
  rosterSummarySocialText: {
    color: "#8ea1b8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  rosterStatusText: {
    color: "#9ca3af",
    fontSize: 12,
    lineHeight: 17,
  },
  rosterVoteCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(105,132,189,0.34)",
    backgroundColor: "#121927",
    padding: 12,
    marginBottom: 12,
  },
  rosterVoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  rosterVoteTitle: {
    color: "#f1f5f9",
    fontSize: 16,
    fontWeight: "800",
  },
  rosterVoteBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(127,101,192,0.45)",
    backgroundColor: "rgba(127,101,192,0.18)",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  rosterVoteBadgeText: {
    color: "#cabaff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  rosterVoteBars: {
    marginBottom: 10,
  },
  rosterVoteTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#1e293b",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    marginBottom: 6,
  },
  rosterVoteFillKeep: {
    backgroundColor: "#3ab298",
    height: "100%",
  },
  rosterVoteFillSwap: {
    backgroundColor: "#7f65c0",
    height: "100%",
  },
  rosterVoteSplitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  rosterVoteSplitKeep: {
    color: "#8ef2dd",
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  rosterVoteSplitSwap: {
    color: "#cabaff",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
    flex: 1,
  },
  rosterVoteWhoLabel: {
    color: "#7b8da8",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    marginBottom: 6,
  },
  rosterVoterGrid: {
    gap: 7,
  },
  rosterVoterCard: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(90,109,145,0.34)",
    backgroundColor: "rgba(16,22,34,0.86)",
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rosterVoterAvatar: {
    width: 22,
    height: 22,
  },
  rosterVoterTextWrap: {
    flex: 1,
  },
  rosterVoterName: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 1,
  },
  rosterVoterPick: {
    fontSize: 10,
    fontWeight: "700",
  },
  rosterVoterPickKeep: {
    color: "#82e9d2",
  },
  rosterVoterPickSwap: {
    color: "#ccb9ff",
  },
  rosterVoteEmptyState: {
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
  rosterSlotVoteRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rosterSlotMiniAvatars: {
    width: 30,
    height: 16,
    position: "relative",
  },
  rosterSlotMiniAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(15,23,42,0.8)",
    borderWidth: 1,
    borderColor: "rgba(99,114,140,0.45)",
    position: "absolute",
    left: 0,
    top: 0,
  },
  rosterSlotMiniAvatarOverlap: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(15,23,42,0.8)",
    borderWidth: 1,
    borderColor: "rgba(99,114,140,0.45)",
    position: "absolute",
    left: 12,
    top: 0,
  },
  rosterSlotVoteText: {
    color: "#7fd4c0",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
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
  rosterSheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  rosterSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 14, 0.58)",
  },
  rosterSheetCard: {
    maxHeight: "76%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(96,116,150,0.42)",
    backgroundColor: "#0F1522",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 16,
  },
  rosterSheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(156,163,175,0.45)",
    alignSelf: "center",
    marginBottom: 10,
  },
  rosterSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  rosterSheetTitle: {
    color: "#f8fafc",
    fontSize: 19,
    fontWeight: "800",
  },
  rosterSheetSub: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: 8,
  },
  rosterSheetSelectedCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(58,178,152,0.35)",
    backgroundColor: "rgba(21,33,42,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 9,
  },
  rosterSheetSectionLabel: {
    color: "#7f65c0",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  rosterSheetList: {
    maxHeight: 290,
  },
  rosterSheetOptionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(80,99,130,0.4)",
    backgroundColor: "#131C2A",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  rosterSheetOptionTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  rosterSheetVoteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  rosterSheetVoteText: {
    color: "#88cfc0",
    fontSize: 10,
    fontWeight: "700",
    flex: 1,
  },
  rosterSheetSwapChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(58,178,152,0.4)",
    backgroundColor: "rgba(58,178,152,0.15)",
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  rosterSheetSwapChipText: {
    color: "#97efda",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  rosterSheetVoters: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rosterSheetVoterAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(15,23,42,0.82)",
    borderWidth: 1,
    borderColor: "rgba(99,114,140,0.42)",
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
  matchupTickerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 3,
  },
  matchupTickerTitle: {
    color: "#f1f5f9",
    fontSize: 11,
    fontWeight: "800",
    flex: 1,
  },
  matchupTickerSub: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "600",
  },
  tauntChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(127,101,192,0.55)",
    backgroundColor: "rgba(127,101,192,0.16)",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tauntChipText: {
    color: "#c7b8ff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  tauntPreviewScreen: {
    flex: 1,
    backgroundColor: "#02050B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    overflow: "hidden",
  },
  tauntLetterboxTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(56, 189, 248, 0.18)",
  },
  tauntLetterboxBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: "#000000",
    borderTopWidth: 1,
    borderTopColor: "rgba(56, 189, 248, 0.18)",
  },
  tauntPreviewClose: {
    position: "absolute",
    top: 68,
    right: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
    backgroundColor: "rgba(2,6,12,0.84)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    zIndex: 2,
  },
  tauntPreviewCloseText: {
    color: "#D6E2F4",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  tauntPreviewHeader: {
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  tauntPreviewEyebrow: {
    color: "#6FD3CC",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 4,
  },
  tauntPreviewTitle: {
    color: "#F1F6FF",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  tauntPreviewFrame: {
    width: "100%",
    maxWidth: 860,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.22)",
    backgroundColor: "#060B14",
    paddingHorizontal: 6,
    paddingVertical: 6,
    shadowColor: "#000000",
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },
  tauntPreviewGif: {
    width: "100%",
    height: 420,
    borderRadius: 8,
  },
  tauntPreviewHint: {
    marginTop: 12,
    color: "#8FA4C2",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
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
