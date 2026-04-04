import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Image as ExpoImage } from "expo-image";
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND, SURFACE, TEXT, BORDER, ACCENT, SEMANTIC } from '@/constants/colors';
import { getPlayerImageSource, prefetchPlayerImages } from '@/lib/playerImages';
import {
  RosterPlayer,
  Position,
  getPositionColor,
  INJURY_STATUS_LABELS,
} from '@/types/roster';

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

const normalizeLineupPosition = (position?: string | null): string => {
  const normalized = String(position || '').trim().toUpperCase();
  if (!normalized) return '';
  if (normalized === 'DST' || normalized === 'D') return 'DEF';
  return normalized;
};

interface LineupVoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitVote: (starters: { position: Position | 'FLEX'; slotIndex: number; playerId: number }[]) => Promise<void>;
  players: RosterPlayer[];
  currentUserVote?: { position: Position | 'FLEX'; slotIndex: number; playerId: number }[] | null;
  weekNumber: number;
  isSubmitting?: boolean;
  onPlayerDetailsPress?: (player: RosterPlayer) => void;
}

// Helper to get ordinal suffix
const getOrdinalSuffix = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

// Full player card component (matches RosterPlayerCard style)
interface FullPlayerCardProps {
  player: RosterPlayer;
  slotPosition: Position | 'FLEX';
  onPress: () => void;
  isSelected?: boolean;
  isCurrentInSlot?: boolean;
  showSwapIndicator?: boolean;
  onDetailsPress?: () => void;
}

const FullPlayerCard = React.memo(function FullPlayerCard({
  player,
  slotPosition,
  onPress,
  isSelected = false,
  isCurrentInSlot = false,
  showSwapIndicator = false,
  onDetailsPress,
}: FullPlayerCardProps) {
  const positionColor = getPositionColor(slotPosition);
  const injuryInfo = player.injuryStatus
    ? INJURY_STATUS_LABELS[player.injuryStatus]
    : null;
  const playerImageSource = getPlayerImageSource(player);
  const gameInfo = player.gameInfo;
  const stats = player.stats;
  const isFavorableMatchup =
    gameInfo?.opponentRank !== undefined && gameInfo.opponentRank <= 10;
  const isToughMatchup =
    gameInfo?.opponentRank !== undefined && gameInfo.opponentRank >= 25;

  const formatOpponent = () => {
    if (!gameInfo) return null;
    const prefix = gameInfo.isHome ? 'vs' : '@';
    const rank = gameInfo.opponentRank ? ` (${gameInfo.opponentRank}${getOrdinalSuffix(gameInfo.opponentRank)})` : '';
    return `${prefix} ${gameInfo.opponent}${rank}`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.playerCard,
        isSelected && styles.playerCardSelected,
        isCurrentInSlot && styles.playerCardCurrent,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Position Badge */}
      <View style={[styles.positionBadge, { backgroundColor: positionColor }]}>
        <Text style={styles.positionText}>{slotPosition}</Text>
      </View>

      {/* Player Photo */}
      <View style={styles.photoContainer}>
        {playerImageSource ? (
          <ExpoImage
            source={playerImageSource}
            style={styles.playerPhoto}
            contentFit="cover"
            transition={100}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.playerPhoto, styles.placeholderPhoto]}>
            <MaterialIcons name="person" size={24} color={TEXT.secondary} />
          </View>
        )}
      </View>

      {/* Player Info */}
      <View style={styles.playerInfo}>
        {/* Name and basic info row */}
        <View style={styles.nameRow}>
          <Text style={styles.playerName} numberOfLines={1}>
            {player.firstName} {player.lastName}
          </Text>
          <Text style={styles.playerMeta}>
            {player.position} - {player.team}
            {player.byeWeek ? ` (${player.byeWeek})` : ''}
          </Text>
        </View>

        {/* Game info row */}
        <View style={styles.gameInfoRow}>
          {gameInfo && (
            <>
              <Text style={styles.gameTime}>{gameInfo.gameTime}</Text>
              <Text style={[
                styles.opponent,
                isFavorableMatchup ? styles.goodMatchup : undefined,
                isToughMatchup ? styles.badMatchup : undefined,
              ]}>
                {formatOpponent()}
              </Text>
            </>
          )}
          {injuryInfo && (
            <View style={[styles.injuryBadge, { backgroundColor: `${injuryInfo.color}20` }]}>
              <MaterialIcons name="healing" size={12} color={injuryInfo.color} />
            </View>
          )}
        </View>

        {/* Ownership stats row */}
        {stats && (
          <View style={styles.ownershipRow}>
            {stats.rosteredPct !== undefined && (
              <Text style={styles.ownershipText}>
                {stats.rosteredPct}% Rostered
              </Text>
            )}
            {stats.startPct !== undefined && (
              <>
                <Text style={styles.ownershipDivider}>|</Text>
                <Text style={styles.ownershipText}>
                  {stats.startPct}% Start
                </Text>
              </>
            )}
          </View>
        )}
      </View>

      {/* Points/Status Section */}
      <View style={styles.pointsContainer}>
        {!!onDetailsPress && (
          <TouchableOpacity style={styles.detailsButton} onPress={onDetailsPress} activeOpacity={0.75}>
            <MaterialIcons name="open-in-new" size={14} color={TEXT.secondary} />
          </TouchableOpacity>
        )}
        {isCurrentInSlot ? (
          <View style={styles.currentBadge}>
            <MaterialIcons name="check-circle" size={18} color={SEMANTIC.success} />
            <Text style={styles.currentText}>CURRENT</Text>
          </View>
        ) : showSwapIndicator ? (
          <View style={styles.swapIndicator}>
            <MaterialIcons name="swap-vert" size={18} color={BRAND.primary} />
            <Text style={styles.swapText}>STARTER</Text>
          </View>
        ) : (
          <>
            <Text style={styles.projectedLabel}>PROJ</Text>
            <Text style={styles.pointsValue}>
              {stats?.projected !== undefined ? stats.projected.toFixed(1) : '--'}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
});

// Empty slot component
interface EmptySlotCardProps {
  position: Position | 'FLEX';
  onPress: () => void;
  isSelected?: boolean;
}

const EmptySlotCard = React.memo(function EmptySlotCard({
  position,
  onPress,
  isSelected = false,
}: EmptySlotCardProps) {
  const positionColor = getPositionColor(position);

  return (
    <TouchableOpacity
      style={[styles.playerCard, isSelected && styles.playerCardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.positionBadge, { backgroundColor: positionColor }]}>
        <Text style={styles.positionText}>{position}</Text>
      </View>
      <View style={styles.emptySlotContent}>
        <Text style={styles.emptySlotText}>Empty</Text>
        <Text style={styles.emptySlotSubtext}>Tap to select player</Text>
      </View>
    </TouchableOpacity>
  );
});

const LineupVoteModal = React.memo(function LineupVoteModal({
  visible,
  onClose,
  onSubmitVote,
  players,
  currentUserVote,
  weekNumber,
  isSubmitting = false,
  onPlayerDetailsPress,
}: LineupVoteModalProps) {
  const insets = useSafeAreaInsets();

  // Track which slot is being edited
  const [selectedSlot, setSelectedSlot] = useState<{
    position: Position | 'FLEX';
    slotIndex: number;
  } | null>(null);

  // Track user's lineup selections
  const [lineupSelections, setLineupSelections] = useState<Map<string, number>>(
    new Map()
  );

  const enrichedPlayers = useMemo(() => players, [players]);

  useEffect(() => {
    if (!visible) return;
    prefetchPlayerImages(enrichedPlayers, 40);
  }, [visible, enrichedPlayers]);

  // Auto-fill lineup based on player positions
  const autoFillLineup = useCallback(() => {
    const selections = new Map<string, number>();
    const usedPlayerIds = new Set<number>();

    STARTER_POSITIONS.forEach(({ position, count }) => {
      for (let i = 0; i < count; i++) {
        const slotKey = `${position}-${i}`;
        let eligiblePlayers: RosterPlayer[];

        if (position === 'FLEX') {
          eligiblePlayers = enrichedPlayers.filter(
            (p) =>
              !usedPlayerIds.has(p.playerId) &&
              ['RB', 'WR', 'TE'].includes(normalizeLineupPosition(p.position))
          );
        } else {
          eligiblePlayers = enrichedPlayers.filter(
            (p) =>
              !usedPlayerIds.has(p.playerId) &&
              normalizeLineupPosition(p.position) === position
          );
        }

        if (eligiblePlayers.length > 0) {
          const player = eligiblePlayers[0];
          selections.set(slotKey, player.playerId);
          usedPlayerIds.add(player.playerId);
        }
      }
    });

    setLineupSelections(selections);
  }, [enrichedPlayers]);

  // Initialize lineup from current user vote
  useEffect(() => {
    if (visible && currentUserVote) {
      const selections = new Map<string, number>();
      currentUserVote.forEach((vote) => {
        const key = `${vote.position}-${vote.slotIndex}`;
        selections.set(key, vote.playerId);
      });
      setLineupSelections(selections);
      setSelectedSlot(null);
    } else if (visible && !currentUserVote) {
      autoFillLineup();
      setSelectedSlot(null);
    }
  }, [visible, currentUserVote, autoFillLineup]);

  // Get player by ID
  const getPlayerById = useCallback(
    (playerId: number) => enrichedPlayers.find((p) => p.playerId === playerId),
    [enrichedPlayers]
  );

  // Get all assigned player IDs
  const assignedPlayerIds = useMemo(() => {
    return new Set(lineupSelections.values());
  }, [lineupSelections]);

  // Get eligible players for a slot (including those already starting)
  const getEligiblePlayers = useCallback(
    (position: Position | 'FLEX') => {
      if (position === 'FLEX') {
        return enrichedPlayers.filter((p) =>
          ['RB', 'WR', 'TE'].includes(normalizeLineupPosition(p.position))
        );
      }
      return enrichedPlayers.filter((p) => normalizeLineupPosition(p.position) === position);
    },
    [enrichedPlayers]
  );

  // Get bench players (not in any starter slot)
  const benchPlayers = useMemo(() => {
    return enrichedPlayers.filter((p) => !assignedPlayerIds.has(p.playerId));
  }, [enrichedPlayers, assignedPlayerIds]);

  // Handle slot selection
  const handleSlotPress = useCallback((position: Position | 'FLEX', slotIndex: number) => {
    setSelectedSlot((prev) => {
      // Toggle off if same slot is clicked
      if (prev?.position === position && prev?.slotIndex === slotIndex) {
        return null;
      }
      return { position, slotIndex };
    });
  }, []);

  // Handle player selection for a slot
  const handlePlayerSelect = useCallback(
    (playerId: number) => {
      if (!selectedSlot) return;

      const slotKey = `${selectedSlot.position}-${selectedSlot.slotIndex}`;

      // Check if this player is already assigned to another slot
      const existingSlotKey = Array.from(lineupSelections.entries()).find(
        ([, pid]) => pid === playerId
      )?.[0];

      setLineupSelections((prev) => {
        const newSelections = new Map(prev);

        // If player is in another slot, swap them
        if (existingSlotKey && existingSlotKey !== slotKey) {
          const currentPlayerId = prev.get(slotKey);
          if (currentPlayerId) {
            newSelections.set(existingSlotKey, currentPlayerId);
          } else {
            newSelections.delete(existingSlotKey);
          }
        }

        newSelections.set(slotKey, playerId);
        return newSelections;
      });

      setSelectedSlot(null);
    },
    [selectedSlot, lineupSelections]
  );

  // Handle submit
  const handleSubmit = useCallback(async () => {
    const starters = Array.from(lineupSelections.entries()).map(([key, playerId]) => {
      const [position, slotIndex] = key.split('-');
      return {
        position: position as Position | 'FLEX',
        slotIndex: parseInt(slotIndex, 10),
        playerId,
      };
    });

    await onSubmitVote(starters);
  }, [lineupSelections, onSubmitVote]);

  // Count filled slots
  const filledSlotsCount = lineupSelections.size;
  const totalSlotsCount = STARTER_POSITIONS.reduce((sum, { count }) => sum + count, 0);
  const isLineupComplete = filledSlotsCount === totalSlotsCount;

  // Render starter slots
  const renderStarterSlots = () => {
    const slots: React.ReactNode[] = [];

    STARTER_POSITIONS.forEach(({ position, count }) => {
      for (let i = 0; i < count; i++) {
        const slotKey = `${position}-${i}`;
        const playerId = lineupSelections.get(slotKey);
        const player = playerId ? getPlayerById(playerId) : null;
        const isSelected = selectedSlot?.position === position && selectedSlot?.slotIndex === i;

        if (player) {
          slots.push(
            <FullPlayerCard
              key={slotKey}
              player={player}
              slotPosition={position}
              onPress={() => handleSlotPress(position, i)}
              isSelected={isSelected}
              onDetailsPress={() => onPlayerDetailsPress?.(player)}
            />
          );
        } else {
          slots.push(
            <EmptySlotCard
              key={slotKey}
              position={position}
              onPress={() => handleSlotPress(position, i)}
              isSelected={isSelected}
            />
          );
        }
      }
    });

    return slots;
  };

  // Render eligible players for selection
  const renderEligiblePlayers = () => {
    if (!selectedSlot) return null;

    const eligiblePlayers = getEligiblePlayers(selectedSlot.position);
    const slotKey = `${selectedSlot.position}-${selectedSlot.slotIndex}`;
    const currentSlotPlayerId = lineupSelections.get(slotKey);

    return (
      <View style={styles.selectionPanel}>
        <View style={styles.selectionHeader}>
          <View style={styles.selectionHeaderLeft}>
            <View style={[styles.selectionPositionBadge, { backgroundColor: getPositionColor(selectedSlot.position) }]}>
              <Text style={styles.selectionPositionText}>{selectedSlot.position}</Text>
            </View>
            <Text style={styles.selectionTitle}>
              Select {selectedSlot.position}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setSelectedSlot(null)}
            style={styles.selectionCloseButton}
          >
            <MaterialIcons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.selectionList}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {eligiblePlayers.map((player) => {
            const isCurrentInSlot = player.playerId === currentSlotPlayerId;
            // Check if player is in another starting slot
            const otherSlotKey = Array.from(lineupSelections.entries()).find(
              ([key, pid]) => pid === player.playerId && key !== slotKey
            )?.[0];
            const isInOtherSlot = !!otherSlotKey;

            return (
              <FullPlayerCard
                key={player.playerId}
                player={player}
                slotPosition={selectedSlot.position}
                onPress={() => handlePlayerSelect(player.playerId)}
                isCurrentInSlot={isCurrentInSlot}
                showSwapIndicator={isInOtherSlot && !isCurrentInSlot}
                onDetailsPress={() => onPlayerDetailsPress?.(player)}
              />
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>My Lineup Vote</Text>
            <Text style={styles.headerSubtitle}>Week {weekNumber}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.slotCounter}>
              {filledSlotsCount}/{totalSlotsCount}
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Left/Top: Starters */}
          <ScrollView
            style={[styles.startersSection, selectedSlot && styles.startersSectionWithSelection]}
            contentContainerStyle={styles.startersContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <MaterialIcons name="how-to-vote" size={20} color={BRAND.primary} />
              <Text style={styles.infoBannerText}>
                Tap a position to change your selection. Your vote combines with your squad.
              </Text>
            </View>

            {/* Starters Section */}
            <Text style={styles.sectionTitle}>MY STARTERS</Text>
            <View style={styles.slotsContainer}>
              {renderStarterSlots()}
            </View>

            {/* Bench Section (only show when no slot selected) */}
            {!selectedSlot && benchPlayers.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                  BENCH ({benchPlayers.length})
                </Text>
                <View style={styles.slotsContainer}>
                  {benchPlayers.map((player) => (
                    <FullPlayerCard
                      key={player.playerId}
                      player={player}
                      slotPosition={player.position as Position}
                      onPress={() => onPlayerDetailsPress?.(player)}
                      onDetailsPress={() => onPlayerDetailsPress?.(player)}
                    />
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          {/* Selection Panel (appears when slot is selected) */}
          {renderEligiblePlayers()}
        </View>

        {/* Submit Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!isLineupComplete || isSubmitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isLineupComplete || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <MaterialIcons name="how-to-vote" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>
                  {currentUserVote ? 'Update My Vote' : 'Submit My Vote'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.medium,
  },
  closeButton: {
    padding: 4,
    width: 40,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: BRAND.primary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  slotCounter: {
    color: TEXT.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
  },
  startersSection: {
    flex: 1,
  },
  startersSectionWithSelection: {
    maxHeight: '45%',
  },
  startersContent: {
    padding: 16,
    paddingBottom: 32,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: ACCENT.redBgLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  infoBannerText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 10,
  },
  sectionTitle: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  slotsContainer: {
    backgroundColor: SURFACE.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  // Player Card Styles (matching RosterPlayerCard)
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: SURFACE.card,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.lightest,
  },
  playerCardSelected: {
    backgroundColor: ACCENT.redBgStrong,
  },
  playerCardCurrent: {
    backgroundColor: '#34C75915',
  },
  positionBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  positionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  photoContainer: {
    marginRight: 12,
  },
  playerPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2F38',
  },
  placeholderPhoto: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  playerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 6,
  },
  playerMeta: {
    color: TEXT.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  gameInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  gameTime: {
    color: TEXT.secondary,
    fontSize: 12,
    marginRight: 6,
  },
  opponent: {
    color: BRAND.gold,
    fontSize: 12,
    fontWeight: '600',
  },
  goodMatchup: {
    color: SEMANTIC.success,
  },
  badMatchup: {
    color: SEMANTIC.error,
  },
  injuryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  ownershipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownershipText: {
    color: TEXT.secondary,
    fontSize: 11,
  },
  ownershipDivider: {
    color: TEXT.secondary,
    fontSize: 11,
    marginHorizontal: 6,
  },
  pointsContainer: {
    alignItems: 'flex-end',
    minWidth: 55,
  },
  detailsButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  projectedLabel: {
    color: TEXT.secondary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pointsValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  currentBadge: {
    alignItems: 'center',
  },
  currentText: {
    color: SEMANTIC.success,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  swapIndicator: {
    alignItems: 'center',
  },
  swapText: {
    color: BRAND.primary,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  emptySlotContent: {
    flex: 1,
    justifyContent: 'center',
  },
  emptySlotText: {
    color: TEXT.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  emptySlotSubtext: {
    color: TEXT.tertiary,
    fontSize: 12,
  },
  // Selection Panel
  selectionPanel: {
    flex: 1,
    backgroundColor: SURFACE.card,
    borderTopWidth: 1,
    borderTopColor: BRAND.primary,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: SURFACE.card,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.medium,
  },
  selectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionPositionBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  selectionPositionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  selectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  selectionCloseButton: {
    padding: 4,
  },
  selectionList: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER.medium,
    backgroundColor: SURFACE.background,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.primary,
    borderRadius: 12,
    paddingVertical: 16,
  },
  submitButtonDisabled: {
    backgroundColor: TEXT.quaternary,
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export { LineupVoteModal };
export type { LineupVoteModalProps };
