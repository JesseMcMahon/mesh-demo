import React from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BRAND, SURFACE, TEXT, BORDER } from "@/constants/colors";

const meshLogo: ImageSourcePropType = require("@/assets/images/meshLogo.png");

interface BracketMatchup {
  id: string;
  round: number;
  seed1?: { name: string; seed: number; score?: number; imageUrl?: string };
  seed2?: { name: string; seed: number; score?: number; imageUrl?: string };
  winnerId?: string;
}

interface PlayoffBracketViewProps {
  squads: any[];
  matchups?: BracketMatchup[];
  playoffStarted?: boolean;
}

const BracketSeed = React.memo(function BracketSeed({
  name,
  seed,
  score,
  isWinner,
  isEmpty,
}: {
  name?: string;
  seed?: number;
  score?: number;
  isWinner?: boolean;
  isEmpty?: boolean;
}) {
  if (isEmpty) {
    return (
      <View style={seedStyles.container}>
        <View style={seedStyles.seedBadge}>
          <Text style={seedStyles.seedText}>—</Text>
        </View>
        <Text style={seedStyles.emptyName}>TBD</Text>
        <Text style={seedStyles.score}>—</Text>
      </View>
    );
  }

  return (
    <View
      style={[seedStyles.container, isWinner && seedStyles.containerWinner]}
    >
      <View
        style={[seedStyles.seedBadge, isWinner && seedStyles.seedBadgeWinner]}
      >
        <Text
          style={[seedStyles.seedText, isWinner && seedStyles.seedTextWinner]}
        >
          {seed}
        </Text>
      </View>
      <View style={seedStyles.imageWrapper}>
        <Image source={meshLogo} style={seedStyles.image} resizeMode="cover" />
      </View>
      <Text
        style={[seedStyles.name, isWinner && seedStyles.nameWinner]}
        numberOfLines={1}
      >
        {name}
      </Text>
      {score !== undefined && (
        <Text style={[seedStyles.score, isWinner && seedStyles.scoreWinner]}>
          {score.toFixed(1)}
        </Text>
      )}
    </View>
  );
});

const seedStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#252A32",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.light,
  },
  containerWinner: {
    backgroundColor: '#C9A84C15',
  },
  seedBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#333840",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  seedBadgeWinner: {
    backgroundColor: BRAND.gold,
  },
  seedText: {
    color: TEXT.secondary,
    fontSize: 11,
    fontWeight: "700",
  },
  seedTextWinner: {
    color: TEXT.primary,
  },
  imageWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: SURFACE.highest,
    overflow: "hidden",
    marginRight: 8,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  name: {
    flex: 1,
    color: "#C8C9CB",
    fontSize: 13,
    fontWeight: "500",
  },
  nameWinner: {
    color: TEXT.primary,
    fontWeight: "600",
  },
  emptyName: {
    flex: 1,
    color: TEXT.quaternary,
    fontSize: 13,
    fontWeight: "500",
    fontStyle: "italic",
  },
  score: {
    color: TEXT.secondary,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
  },
  scoreWinner: {
    color: BRAND.gold,
  },
});

const MatchupCard = React.memo(function MatchupCard({
  matchup,
}: {
  matchup: BracketMatchup;
}) {
  return (
    <View style={matchupStyles.card}>
      <BracketSeed
        name={matchup.seed1?.name}
        seed={matchup.seed1?.seed}
        score={matchup.seed1?.score}
        isEmpty={!matchup.seed1}
      />
      <BracketSeed
        name={matchup.seed2?.name}
        seed={matchup.seed2?.seed}
        score={matchup.seed2?.score}
        isEmpty={!matchup.seed2}
      />
    </View>
  );
});

const matchupStyles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    overflow: "hidden",
    marginBottom: 12,
  },
});

// Generate placeholder bracket from squads
function generatePlaceholderBracket(squads: any[]): BracketMatchup[] {
  const populated = squads.filter(
    (s) => s.members && s.members.length > 0
  );
  if (populated.length < 2) return [];

  const matchups: BracketMatchup[] = [];
  const count = Math.min(populated.length, 8);
  for (let i = 0; i < count; i += 2) {
    if (i + 1 < count) {
      matchups.push({
        id: `matchup-${i}`,
        round: 1,
        seed1: {
          name: populated[i].name || `Squad ${i + 1}`,
          seed: i + 1,
        },
        seed2: {
          name: populated[i + 1].name || `Squad ${i + 2}`,
          seed: i + 2,
        },
      });
    }
  }
  return matchups;
}

export const PlayoffBracketView = React.memo(function PlayoffBracketView({
  squads,
  matchups: providedMatchups,
  playoffStarted = false,
}: PlayoffBracketViewProps) {
  const matchups = providedMatchups || generatePlaceholderBracket(squads);
  const populated = squads.filter(
    (s) => s.members && s.members.length > 0
  );

  if (populated.length < 2) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <MaterialIcons name="account-tree" size={40} color={TEXT.quaternary} />
          <Text style={styles.emptyTitle}>No Playoff Bracket</Text>
          <Text style={styles.emptyText}>
            The playoff bracket will be available once the regular season
            concludes
          </Text>
        </View>
      </View>
    );
  }

  // Group by round
  const rounds: Record<number, BracketMatchup[]> = {};
  matchups.forEach((m) => {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  });

  const roundEntries = Object.entries(rounds).sort(
    ([a], [b]) => Number(a) - Number(b)
  );

  return (
    <View>
      {/* Status banner */}
      <View style={styles.statusBanner}>
        <MaterialIcons
          name={playoffStarted ? "play-circle-outline" : "schedule"}
          size={16}
          color={playoffStarted ? BRAND.gold : TEXT.secondary}
        />
        <Text
          style={[
            styles.statusText,
            playoffStarted && styles.statusTextActive,
          ]}
        >
          {playoffStarted ? "Playoffs In Progress" : "Playoff Preview"}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bracketScroll}
      >
        {roundEntries.map(([roundNum, roundMatchups]) => {
          const roundLabels: Record<string, string> = {
            "1": "Quarterfinals",
            "2": "Semifinals",
            "3": "Finals",
          };
          const label =
            roundLabels[roundNum] ||
            `Round ${roundNum}`;

          return (
            <View key={roundNum} style={styles.roundColumn}>
              <Text style={styles.roundLabel}>{label}</Text>
              <View style={styles.roundMatchups}>
                {roundMatchups.map((matchup) => (
                  <MatchupCard key={matchup.id} matchup={matchup} />
                ))}
              </View>
            </View>
          );
        })}

        {/* Championship placeholder */}
        {roundEntries.length > 0 &&
          !rounds[roundEntries.length + 1] &&
          roundEntries.length < 3 && (
            <View style={styles.roundColumn}>
              <Text style={styles.roundLabel}>
                {roundEntries.length === 1 ? "Finals" : "Championship"}
              </Text>
              <View style={styles.roundMatchups}>
                <View style={matchupStyles.card}>
                  <BracketSeed isEmpty />
                  <BracketSeed isEmpty />
                </View>
              </View>
            </View>
          )}
      </ScrollView>

      {/* Trophy / Champion section */}
      <View style={styles.championSection}>
        <View style={styles.trophyIcon}>
          <MaterialIcons name="emoji-events" size={28} color="#FFD700" />
        </View>
        <Text style={styles.championLabel}>Champion</Text>
        <Text style={styles.championTBD}>TBD</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  emptyContainer: {
    paddingTop: 12,
  },
  emptyCard: {
    backgroundColor: SURFACE.cardTransparent,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER.medium,
    padding: 32,
    alignItems: "center",
  },
  emptyTitle: {
    color: TEXT.primary,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  emptyText: {
    color: TEXT.secondary,
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginBottom: 16,
    marginTop: 8,
    gap: 6,
  },
  statusText: {
    color: TEXT.secondary,
    fontSize: 13,
    fontWeight: "600",
  },
  statusTextActive: {
    color: BRAND.gold,
  },
  bracketScroll: {
    paddingRight: 16,
  },
  roundColumn: {
    width: 200,
    marginRight: 16,
  },
  roundLabel: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
    textAlign: "center",
  },
  roundMatchups: {
    justifyContent: "space-around",
    flex: 1,
  },
  championSection: {
    alignItems: "center",
    paddingVertical: 20,
    marginTop: 8,
    backgroundColor: SURFACE.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER.medium,
  },
  trophyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFD70020",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  championLabel: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  championTBD: {
    color: TEXT.quaternary,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
    fontStyle: "italic",
  },
});
