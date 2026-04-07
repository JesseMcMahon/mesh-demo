import React from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const LEFT_CHARACTER = require("../../assets/demo-assets/home-hero-character.png");
const RIGHT_CHARACTER = require("../../assets/demo-assets/home-hero-character.png");

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

const STARTERS: MatchupRow[] = [
  {
    position: "QB",
    left: { name: "J. Burrow", meta: "CIN · vs LAR", points: "28.4", initials: "JB", scoring: true },
    right: { name: "L. Jackson", meta: "BAL · vs PIT", points: "21.2", initials: "LJ" },
  },
  {
    position: "RB",
    left: { name: "C. McCaffrey", meta: "SF · at SEA", points: "18.7", initials: "CM" },
    right: { name: "D. Adams", meta: "KC · at LV · Q", points: "4.1", initials: "DA", injury: "Q" },
  },
  {
    position: "RB",
    left: { name: "B. Robinson", meta: "ATL · vs TB", points: "12.3", initials: "BR" },
    right: { name: "A. Jones", meta: "MIN · vs GB", points: "9.8", initials: "AJ" },
  },
  {
    position: "WR",
    left: { name: "J. Jefferson", meta: "MIN · vs GB 🔥", points: "24.6", initials: "JJ", scoring: true },
    right: { name: "S. Thomas", meta: "NO · vs CAR", points: "14.2", initials: "ST" },
  },
  {
    position: "WR",
    left: { name: "D. Adams", meta: "LV · at KC", points: "11.2", initials: "DA" },
    right: { name: "T. Hill", meta: "MIA · vs BUF", points: "22.1", initials: "TH" },
  },
  {
    position: "TE",
    left: { name: "T. Kelce", meta: "KC · vs LV", points: "16.4", initials: "TK" },
    right: { name: "M. Hockenson", meta: "MIN · vs GB", points: "8.2", initials: "MH" },
  },
  {
    position: "FLX",
    left: { name: "G. Pickens", meta: "PIT · at BAL", points: "15.0", initials: "GP" },
    right: { name: "J. Waddle", meta: "MIA · vs BUF", points: "16.4", initials: "JW" },
  },
  {
    position: "K",
    left: { name: "E. McPherson", meta: "CIN · vs LAR", points: "8.0", initials: "EM" },
    right: { name: "T. Tucker", meta: "BAL · vs PIT", points: "6.0", initials: "TT" },
  },
  {
    position: "DEF",
    left: { name: "SF Defense", meta: "at SEA", points: "8.0", initials: "DEF" },
    right: { name: "BUF Defense", meta: "at MIA", points: "16.4", initials: "DEF" },
  },
];

const BENCH: MatchupRow[] = [
  {
    position: "RB",
    bench: true,
    left: { name: "D. Henry", meta: "TEN · vs JAX", points: "6.2", initials: "DH", bench: true },
    right: { name: "C. Lamb", meta: "DAL · at NYG · O", points: "0.0", initials: "CL", injury: "O", bench: true },
  },
  {
    position: "WR",
    bench: true,
    left: { name: "A. Cooper", meta: "CLE · at DEN", points: "4.8", initials: "AC", bench: true },
    right: { name: "K. Allen", meta: "LAC · at IND", points: "7.3", initials: "KA", bench: true },
  },
];

function TeamPlayerCard({ side, player }: { side: "left" | "right"; player: SidePlayer }) {
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
      <Text style={[styles.playerPoints, isZero ? styles.playerPointsZero : isLeft ? styles.playerPointsGreen : styles.playerPointsBlue]}>
        {player.points}
      </Text>

      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>
          {player.name}
        </Text>
        <Text style={styles.playerMeta}>
          {player.meta}
        </Text>
      </View>

      <View style={[styles.playerAvatar, isLeft ? styles.avatarGreen : styles.avatarBlue, player.bench ? styles.avatarGray : null]}>
        <Text style={[styles.playerAvatarText, player.bench ? styles.avatarGrayText : null]}>{player.initials}</Text>
        {player.injury ? (
          <View style={[styles.injuryDot, player.injury === "Q" ? styles.injuryQuestionable : styles.injuryOut]} />
        ) : null}
      </View>
    </View>
  );
}

function MatchupLine({ row }: { row: MatchupRow }) {
  return (
    <View style={styles.matchupRow}>
      <TeamPlayerCard side="left" player={row.left} />
      <View style={[styles.positionPill, row.bench ? styles.positionPillBench : null]}>
        <Text style={[styles.positionPillText, row.bench ? styles.positionPillTextBench : null]}>{row.position}</Text>
      </View>
      <TeamPlayerCard side="right" player={row.right} />
    </View>
  );
}

export default function LineupDemoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.root}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 96 + Math.max(insets.bottom, 12) }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statusBar}>
            <Text style={styles.statusTime}>9:41</Text>
            <View style={styles.statusRight}>
              <View style={styles.signalBars}>
                <View style={[styles.signalBar, { height: 4 }]} />
                <View style={[styles.signalBar, { height: 6 }]} />
                <View style={[styles.signalBar, { height: 9 }]} />
                <View style={[styles.signalBar, { height: 12 }]} />
              </View>
              <MaterialIcons name="wifi" size={14} color="#f0f0f0" />
              <View style={styles.battery}>
                <View style={styles.batteryFill} />
              </View>
            </View>
          </View>

          <View style={styles.topHeader}>
            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.85}
              onPress={() => router.replace("/(investor-demo)/home-v2" as any)}
            >
              <Text style={styles.backBtnText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE · WEEK 14</Text>
            </View>
          </View>

          <View style={styles.matchupHero}>
            <View style={styles.heroTeams}>
              <View style={styles.teamSideLeft}>
                <View style={styles.characterGlowLeft} />
                <Image source={LEFT_CHARACTER} resizeMode="contain" style={styles.characterImage} />
              </View>

              <View style={styles.heroCenter}>
                <Text style={styles.vsBadge}>VS</Text>
                <Text style={styles.timerBadge}>Q3 · 8:42</Text>
              </View>

              <View style={styles.teamSideRight}>
                <View style={styles.characterGlowRight} />
                <Image source={RIGHT_CHARACTER} resizeMode="contain" style={styles.characterImage} />
              </View>
            </View>

            <View style={styles.scoreBar}>
              <View style={styles.scoreTeam}>
                <Text style={[styles.teamName, styles.teamNameGreen]}>VENOM FC</Text>
                <Text style={styles.ownerName}>Marcus · LVL 12</Text>
              </View>
              <View style={styles.scoreCenter}>
                <Text style={styles.scoreValue}>142.6</Text>
                <View style={styles.scoreDot} />
                <Text style={styles.scoreValue}>118.4</Text>
              </View>
              <View style={[styles.scoreTeam, styles.scoreTeamRight]}>
                <Text style={[styles.teamName, styles.teamNameBlue]}>BLITZ KINGS</Text>
                <Text style={styles.ownerName}>Jordan · LVL 9</Text>
              </View>
            </View>

            <View style={styles.projectedRow}>
              <Text style={styles.projectedLabel}>
                Proj: <Text style={styles.projectedValueLeading}>168.3</Text>
              </Text>
              <Text style={styles.projectedLead}>▲ +24.2 lead</Text>
              <Text style={styles.projectedLabel}>
                Proj: <Text style={styles.projectedValue}>152.1</Text>
              </Text>
            </View>

            <View style={styles.probabilityWrap}>
              <View style={styles.probabilityLabels}>
                <Text style={styles.probabilityLeft}>62%</Text>
                <Text style={styles.probabilityCenter}>Win Probability</Text>
                <Text style={styles.probabilityRight}>38%</Text>
              </View>
              <View style={styles.probabilityBar}>
                <View style={styles.probabilityFillGreen} />
                <View style={styles.probabilityFillBlue} />
              </View>
            </View>
          </View>

          <View style={styles.scoringToast}>
            <Text style={styles.toastIcon}>⚡</Text>
            <Text style={styles.toastText}>J. Jefferson caught 34-yd TD</Text>
            <Text style={styles.toastPoints}>+6.0</Text>
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
        </ScrollView>

        <View style={[styles.bottomNavWrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.bottomNav}>
            <View style={styles.navItem}>
              <MaterialIcons name="home" size={20} color="#6b7280" />
              <Text style={styles.navLabel}>Home</Text>
            </View>
            <View style={styles.navItem}>
              <MaterialIcons name="flag" size={20} color="#3ab298" />
              <Text style={[styles.navLabel, styles.navLabelActive]}>Leagues</Text>
            </View>
            <View style={styles.navItem}>
              <MaterialIcons name="explore" size={20} color="#6b7280" />
              <Text style={styles.navLabel}>Explore</Text>
            </View>
            <View style={styles.navItem}>
              <MaterialIcons name="diamond" size={20} color="#6b7280" />
              <Text style={styles.navLabel}>Avatar</Text>
            </View>
            <View style={styles.navItem}>
              <MaterialIcons name="person" size={20} color="#6b7280" />
              <Text style={styles.navLabel}>Profile</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0e1014" },
  root: { flex: 1 },
  scroll: { flex: 1, backgroundColor: "#0e1014" },
  scrollContent: { paddingTop: 4, paddingBottom: 20 },

  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 8,
  },
  statusTime: { color: "#f0f0f0", fontSize: 13, fontWeight: "600", letterSpacing: 0.2 },
  statusRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  signalBars: { flexDirection: "row", alignItems: "flex-end", height: 12, gap: 2 },
  signalBar: { width: 3, borderRadius: 1, backgroundColor: "#f0f0f0" },
  battery: { width: 22, height: 12, borderRadius: 3, borderWidth: 1.5, borderColor: "#f0f0f0", padding: 1.5, justifyContent: "center" },
  batteryFill: { width: "75%", height: "100%", backgroundColor: "#f0f0f0", borderRadius: 1 },

  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    backgroundColor: "rgba(239,68,68,0.14)",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ef4444" },
  liveBadgeText: { color: "#f87171", fontSize: 10, fontWeight: "800", letterSpacing: 0.9 },

  matchupHero: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    marginBottom: 8,
    backgroundColor: "#13161c",
    paddingTop: 6,
  },
  heroTeams: {
    height: 242,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    overflow: "hidden",
    position: "relative",
  },
  teamSideLeft: {
    width: 150,
    height: 236,
    alignItems: "flex-start",
    justifyContent: "flex-end",
    paddingLeft: 2,
    position: "relative",
  },
  teamSideRight: {
    width: 150,
    height: 236,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    paddingRight: 2,
    position: "relative",
  },
  characterGlowLeft: {
    position: "absolute",
    bottom: 0,
    left: -30,
    width: 200,
    height: 200,
    borderRadius: 200,
    backgroundColor: "rgba(127,255,95,0.14)",
  },
  characterGlowRight: {
    position: "absolute",
    bottom: 0,
    right: -30,
    width: 200,
    height: 200,
    borderRadius: 200,
    backgroundColor: "rgba(0,212,255,0.12)",
  },
  characterImage: {
    width: 142,
    height: 216,
  },
  heroCenter: {
    position: "absolute",
    left: "50%",
    bottom: 24,
    transform: [{ translateX: -28 }],
    alignItems: "center",
    gap: 2,
  },
  vsBadge: {
    color: "#f0f0f0",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1,
  },
  timerBadge: {
    color: "#9ca3af",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  scoreBar: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#13161c",
    gap: 10,
  },
  scoreTeam: { gap: 2, width: 96 },
  scoreTeamRight: { alignItems: "flex-end" },
  teamName: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.9,
  },
  teamNameGreen: { color: "#7fff5f" },
  teamNameBlue: { color: "#00d4ff" },
  ownerName: { color: "#6b7280", fontSize: 10, fontWeight: "500", letterSpacing: 0.4 },
  scoreCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  scoreValue: { color: "#f0f0f0", fontSize: 26, fontWeight: "800", lineHeight: 26 },
  scoreDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#6b7280" },

  projectedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: "rgba(26,30,39,0.65)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  projectedLabel: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  projectedValue: { color: "#9ca3af" },
  projectedValueLeading: { color: "#3ab298" },
  projectedLead: { color: "#3ab298", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },

  probabilityWrap: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#13161c",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  probabilityLabels: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  probabilityLeft: { color: "#3ab298", fontSize: 11, fontWeight: "800" },
  probabilityCenter: { color: "#6b7280", fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  probabilityRight: { color: "#00d4ff", fontSize: 11, fontWeight: "800" },
  probabilityBar: { height: 4, borderRadius: 999, overflow: "hidden", backgroundColor: "#1a1e27", flexDirection: "row" },
  probabilityFillGreen: { width: "62%", backgroundColor: "#3ab298" },
  probabilityFillBlue: { flex: 1, backgroundColor: "#00d4ff" },

  scoringToast: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(127,255,95,0.2)",
    backgroundColor: "rgba(127,255,95,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toastIcon: { fontSize: 14 },
  toastText: { color: "#7fff5f", fontSize: 11, fontWeight: "700", flex: 1 },
  toastPoints: { color: "#7fff5f", fontSize: 16, fontWeight: "800" },

  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.07)" },
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
  avatarGreen: { backgroundColor: "rgba(58,178,152,0.35)", borderColor: "rgba(127,255,95,0.35)" },
  avatarBlue: { backgroundColor: "rgba(59,130,246,0.35)", borderColor: "rgba(0,212,255,0.35)" },
  avatarGray: { backgroundColor: "#1a1e27", borderColor: "rgba(255,255,255,0.08)" },
  playerAvatarText: { color: "#f0f0f0", fontSize: 12, fontWeight: "800", letterSpacing: -0.2 },
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
  playerName: { color: "#f0f0f0", fontSize: 11, fontWeight: "800", letterSpacing: -0.05 },
  playerMeta: { color: "#6b7280", fontSize: 9, fontWeight: "500" },
  playerPoints: { fontSize: 16, fontWeight: "800", lineHeight: 16, minWidth: 36, textAlign: "center" },
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

  bottomNavWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(19,22,28,0.97)",
  },
  bottomNav: { flexDirection: "row", paddingTop: 10 },
  navItem: { flex: 1, alignItems: "center", gap: 4 },
  navLabel: { color: "#6b7280", fontSize: 10, fontWeight: "600", letterSpacing: 0.3 },
  navLabelActive: { color: "#3ab298" },
});
