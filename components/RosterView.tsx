import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BRAND, SURFACE, TEXT, SEMANTIC } from '@/constants/colors';
import { prefetchPlayerImages } from '@/lib/playerImages';
import { TeamHeaderCard } from './TeamHeaderCard';
import { WeekSelector } from './WeekSelector';
import { RosterPlayerCard } from './RosterPlayerCard';
import {
  RosterPlayer,
  RosterSlot,
  Position,
  VoteStatus,
} from '@/types/roster';

interface RosterViewProps {
  squadName: string;
  squadImageUrl?: string;
  record?: string;
  players: RosterPlayer[];
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
  onSettingsPress?: () => void;
  onPlayersPress?: () => void;
  onTradePress?: () => void;
  onTransactionsPress?: () => void;
  onNewsPress?: () => void;
  onPlayerPress?: (player: RosterPlayer) => void;
  // Vote-related props
  weekNumber?: number;
  voteStatus?: VoteStatus;
  onEditVotePress?: () => void;
  canEditVote?: boolean;
  lineupSubtitle?: string;
  onWeekChange?: (week: number) => void;
  // Optional: Official lineup from backend (overrides auto-assignment)
  officialStarters?: RosterSlot[];
}

// Standard lineup configuration
const STARTER_POSITIONS: { position: Position | 'FLEX'; count: number }[] = [
  { position: 'QB', count: 1 },
  { position: 'RB', count: 2 },
  { position: 'WR', count: 2 },
  { position: 'TE', count: 1 },
  { position: 'FLEX', count: 1 },
  { position: 'K', count: 1 },
  { position: 'DEF', count: 1 },
];

const RosterView = React.memo(function RosterView({
  squadName,
  squadImageUrl,
  record = '0-0',
  players,
  isLoading = false,
  onRefresh,
  onSettingsPress,
  onPlayersPress,
  onTradePress,
  onTransactionsPress,
  onNewsPress,
  onPlayerPress,
  weekNumber = 1,
  voteStatus,
  onEditVotePress,
  canEditVote = true,
  lineupSubtitle = "Official lineup based on squad votes",
  onWeekChange,
  officialStarters,
}: RosterViewProps) {
  const [refreshing, setRefreshing] = useState(false);
  const reveal = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    prefetchPlayerImages(players, 45);
  }, [players]);

  useEffect(() => {
    Animated.timing(reveal, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [reveal]);

  // Organize players into starters and bench
  // If officialStarters is provided, use that; otherwise auto-assign
  const { starterSlots, benchPlayers } = useMemo(() => {
    if (officialStarters && officialStarters.length > 0) {
      // Use official lineup from backend
      const starterPlayerIds = new Set(
        officialStarters.map((s) => s.player?.playerId).filter(Boolean)
      );
      const bench = players.filter(
        (p) => !starterPlayerIds.has(p.playerId)
      );
      return { starterSlots: officialStarters, benchPlayers: bench };
    }

    // Auto-assign players to positions (fallback)
    const slots: RosterSlot[] = [];
    const assignedPlayerIds = new Set<number>();
    let slotIndex = 0;

    STARTER_POSITIONS.forEach(({ position, count }) => {
      for (let i = 0; i < count; i++) {
        let matchedPlayer: RosterPlayer | null = null;

        if (position === 'FLEX') {
          matchedPlayer = players.find(
            (p) =>
              !assignedPlayerIds.has(p.playerId) &&
              ['RB', 'WR', 'TE'].includes(p.position.toUpperCase())
          ) || null;
        } else {
          matchedPlayer = players.find(
            (p) =>
              !assignedPlayerIds.has(p.playerId) &&
              p.position.toUpperCase() === position
          ) || null;
        }

        if (matchedPlayer) {
          assignedPlayerIds.add(matchedPlayer.playerId);
        }

        slots.push({
          position,
          label: position,
          player: matchedPlayer,
          isStarter: true,
          slotIndex: slotIndex++,
          consensusPercent: undefined,
        });
      }
    });

    const bench = players.filter(
      (p) => !assignedPlayerIds.has(p.playerId)
    );

    return { starterSlots: slots, benchPlayers: bench };
  }, [players, officialStarters]);

  const handleRefresh = useCallback(async () => {
    if (refreshing || !onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, refreshing]);

  if (isLoading && players.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND.primary} />
        <Text style={styles.loadingText}>Loading roster...</Text>
      </View>
    );
  }

  const hasVoted = voteStatus?.hasVoted ?? false;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={BRAND.primary}
            colors={[BRAND.primary]}
            progressViewOffset={10}
          />
        }
      >
        <Animated.View
          style={{
            opacity: reveal,
            transform: [
              {
                translateY: reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              },
            ],
          }}
        >
          <TeamHeaderCard
            teamName={squadName}
            teamImageUrl={squadImageUrl}
            record={record}
            onSettingsPress={onSettingsPress}
            onPlayersPress={onPlayersPress}
            onTradePress={onTradePress}
            onTransactionsPress={onTransactionsPress}
            onNewsPress={onNewsPress}
          />

        {/* Edit My Lineup Vote Button */}
        {canEditVote && onEditVotePress && (
          <TouchableOpacity
            style={styles.voteButton}
            onPress={onEditVotePress}
            activeOpacity={0.8}
          >
            <View style={styles.voteButtonContent}>
              <MaterialIcons
                name={hasVoted ? 'how-to-vote' : 'ballot'}
                size={22}
                color="#FFFFFF"
              />
              <View style={styles.voteButtonTextContainer}>
                <Text style={styles.voteButtonTitle}>
                  {hasVoted ? 'Edit My Vote' : 'Cast My Lineup Vote'}
                </Text>
                <Text style={styles.voteButtonSubtitle}>
                  {hasVoted
                    ? 'Update your starter preferences'
                    : 'Vote for who should start this week'}
                </Text>
              </View>
            </View>
            {hasVoted && (
              <View style={styles.votedBadge}>
                <MaterialIcons name="check-circle" size={20} color={SEMANTIC.success} />
                <Text style={styles.votedBadgeText}>Voted</Text>
              </View>
            )}
            {!hasVoted && (
              <MaterialIcons name="chevron-right" size={24} color={BRAND.primary} />
            )}
          </TouchableOpacity>
        )}

        {/* Starters Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Squad Lineup</Text>
              <TouchableOpacity style={styles.exportButton}>
                <MaterialIcons name="ios-share" size={18} color={TEXT.secondary} />
              </TouchableOpacity>
            </View>
            <WeekSelector
              currentWeek={weekNumber}
              maxWeek={18}
              onPreviousWeek={() => onWeekChange?.(Math.max(1, weekNumber - 1))}
              onNextWeek={() => onWeekChange?.(Math.min(18, weekNumber + 1))}
            />
          </View>

          <Text style={styles.sectionSubtitle}>
            {lineupSubtitle}
          </Text>

          {/* Starter Slots - Read Only with Consensus */}
          <View style={styles.playerList}>
            {starterSlots.map((slot) => (
              <RosterPlayerCard
                key={`starter-${slot.position}-${slot.slotIndex}`}
                player={slot.player}
                slotPosition={slot.position}
                slotLabel={slot.label}
                isStarter={true}
                isInteractive={false}
                consensusPercent={slot.consensusPercent}
                voterNames={slot.voterNames}
                onPlayerPress={onPlayerPress}
              />
            ))}
          </View>
        </View>

        {/* Bench Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bench</Text>
            <Text style={styles.benchCount}>
              {benchPlayers.length} players
            </Text>
          </View>

          <View style={styles.playerList}>
            {benchPlayers.length > 0 ? (
              benchPlayers.map((player) => (
                <RosterPlayerCard
                  key={`bench-${player.playerId}`}
                  player={player}
                  slotPosition={player.position as Position}
                  isStarter={false}
                  isInteractive={false}
                  onPlayerPress={onPlayerPress}
                />
              ))
            ) : (
              <View style={styles.emptyBench}>
                <MaterialIcons name="event-seat" size={32} color={TEXT.quaternary} />
                <Text style={styles.emptyBenchText}>Bench is empty</Text>
              </View>
            )}
          </View>
        </View>

          <View style={styles.bottomSpacer} />
        </Animated.View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SURFACE.background,
  },
  loadingText: {
    color: TEXT.secondary,
    fontSize: 14,
    marginTop: 12,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BRAND.primary,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  voteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  voteButtonTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  voteButtonTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  voteButtonSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  votedBadgeText: {
    color: SEMANTIC.success,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E2D40',
    backgroundColor: SURFACE.card,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  exportButton: {
    marginLeft: 8,
    padding: 4,
  },
  sectionSubtitle: {
    color: TEXT.secondary,
    fontSize: 13,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  benchCount: {
    color: TEXT.secondary,
    fontSize: 14,
  },
  playerList: {
    backgroundColor: 'rgba(8,12,18,0.76)',
    borderRadius: 12,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1E2D40',
    overflow: 'hidden',
  },
  emptyBench: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyBenchText: {
    color: TEXT.secondary,
    fontSize: 14,
    marginTop: 8,
  },
  bottomSpacer: {
    height: 40,
  },
});

export { RosterView };
export type { RosterViewProps };
