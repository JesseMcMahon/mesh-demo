import React from "react";
import {
  View,
  Text,
  Image,
  ImageSourcePropType,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BRAND, SURFACE, TEXT, BORDER, SEMANTIC } from "@/constants/colors";

const meshLogo: ImageSourcePropType = require("@/assets/images/meshLogo.png");

interface StandingEntry {
  squadId: string;
  rank: number;
  squadName: string;
  squadImageUrl?: string;
  record: string;
  wins: number;
  losses: number;
  streak?: string;
  waiverBudget?: string;
  waiverPriority?: number;
  pointsFor: number;
  pointsAgainst: number;
  divisionName?: string;
}

interface StandingsViewProps {
  squads: any[];
  standings?: StandingEntry[];
}

// Generate mock standings from squads for demo purposes
function generateStandings(squads: any[]): StandingEntry[] {
  if (!squads || squads.length === 0) return [];

  return squads
    .filter((s) => s.members && s.members.length > 0)
    .map((squad, index) => ({
      squadId: squad._id,
      rank: index + 1,
      squadName: squad.name || `Squad ${index + 1}`,
      record: "0-0",
      wins: 0,
      losses: 0,
      streak: "—",
      waiverBudget: "$100",
      pointsFor: 0,
      pointsAgainst: 0,
      divisionName: "Division 1",
    }));
}

const StandingRow = React.memo(function StandingRow({
  entry,
}: {
  entry: StandingEntry;
}) {
  return (
    <View style={rowStyles.container}>
      {/* Rank */}
      <Text style={rowStyles.rank}>{entry.rank}</Text>

      {/* Squad Image */}
      <View style={rowStyles.imageWrapper}>
        {entry.squadImageUrl ? (
          <Image
            source={{ uri: entry.squadImageUrl }}
            style={rowStyles.image}
            resizeMode="cover"
          />
        ) : (
          <Image
            source={meshLogo}
            style={rowStyles.image}
            resizeMode="cover"
          />
        )}
      </View>

      {/* Squad Info */}
      <View style={rowStyles.infoCol}>
        <Text style={rowStyles.name} numberOfLines={1}>
          {entry.squadName}
        </Text>
        <View style={rowStyles.recordRow}>
          <Text style={rowStyles.record}>{entry.record}</Text>
          {entry.streak && entry.streak !== "—" && (
            <>
              <Text style={rowStyles.dot}> · </Text>
              <MaterialIcons
                name={
                  entry.streak.startsWith("-") ? "arrow-downward" : "arrow-upward"
                }
                size={10}
                color={
                  entry.streak.startsWith("-") ? SEMANTIC.error : BRAND.gold
                }
              />
              <Text
                style={[
                  rowStyles.streak,
                  {
                    color: entry.streak.startsWith("-")
                      ? SEMANTIC.error
                      : BRAND.gold,
                  },
                ]}
              >
                {entry.streak}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Stats columns */}
      <Text style={rowStyles.statWaiver}>{entry.waiverBudget || "—"}</Text>
      <Text style={rowStyles.stat}>{entry.pointsFor.toFixed(2)}</Text>
      <Text style={rowStyles.stat}>{entry.pointsAgainst.toFixed(2)}</Text>
    </View>
  );
});

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.light,
  },
  rank: {
    color: TEXT.secondary,
    fontSize: 14,
    fontWeight: "600",
    width: 20,
    textAlign: "center",
  },
  imageWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: SURFACE.highest,
    overflow: "hidden",
    marginLeft: 8,
    marginRight: 10,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  infoCol: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  record: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "500",
  },
  dot: {
    color: TEXT.quaternary,
    fontSize: 12,
  },
  streak: {
    fontSize: 11,
    fontWeight: "600",
  },
  statWaiver: {
    color: TEXT.secondary,
    fontSize: 13,
    fontWeight: "500",
    width: 56,
    textAlign: "right",
  },
  stat: {
    color: TEXT.light,
    fontSize: 13,
    fontWeight: "500",
    width: 60,
    textAlign: "right",
  },
});

export const StandingsView = React.memo(function StandingsView({
  squads,
  standings: providedStandings,
}: StandingsViewProps) {
  const standings = providedStandings || generateStandings(squads);

  // Group by division
  const divisions = standings.reduce<Record<string, StandingEntry[]>>(
    (acc, entry) => {
      const div = entry.divisionName || "Division 1";
      if (!acc[div]) acc[div] = [];
      acc[div].push(entry);
      return acc;
    },
    {}
  );

  if (standings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <MaterialIcons name="emoji-events" size={40} color={TEXT.quaternary} />
          <Text style={styles.emptyTitle}>No Standings Yet</Text>
          <Text style={styles.emptyText}>
            Standings will appear once the season begins
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      {Object.entries(divisions).map(([divisionName, entries]) => (
        <View key={divisionName} style={styles.divisionCard}>
          {/* Division Header */}
          <View style={styles.divisionHeader}>
            <View style={styles.divisionIcon}>
              <MaterialIcons name="flash-on" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.divisionName}>{divisionName}</Text>
          </View>

          {/* Column Headers */}
          <View style={styles.columnHeaders}>
            <View style={styles.columnHeaderLeft} />
            <Text style={styles.colHeaderWaiver}>WAIVER</Text>
            <Text style={styles.colHeader}>PF</Text>
            <Text style={styles.colHeader}>PA</Text>
          </View>

          {/* Rows */}
          {entries.map((entry) => (
            <StandingRow key={entry.squadId} entry={entry} />
          ))}
        </View>
      ))}
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
    color: "#FFFFFF",
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
  divisionCard: {
    backgroundColor: SURFACE.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER.medium,
    overflow: "hidden",
    marginTop: 8,
  },
  divisionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  divisionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.gold,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  divisionName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  columnHeaders: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.divider,
  },
  columnHeaderLeft: {
    flex: 1,
  },
  colHeaderWaiver: {
    color: TEXT.tertiary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    width: 56,
    textAlign: "right",
  },
  colHeader: {
    color: TEXT.tertiary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    width: 60,
    textAlign: "right",
  },
});
