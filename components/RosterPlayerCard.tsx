import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Image as ExpoImage } from "expo-image";
import { MaterialIcons } from '@expo/vector-icons';
import { SURFACE, TEXT, BORDER, BRAND } from '@/constants/colors';
import { getPlayerImageSource } from '@/lib/playerImages';
import {
  RosterPlayer,
  getPositionColor,
  INJURY_STATUS_LABELS,
  Position,
} from '@/types/roster';

interface RosterPlayerCardProps {
  player: RosterPlayer | null;
  slotPosition: Position | 'FLEX';
  slotLabel?: string;
  onPositionPress?: () => void;
  isStarter?: boolean;
  showEmptySlot?: boolean;
  // Vote-related props
  consensusPercent?: number; // Show consensus % for group voting
  voterNames?: string[];
  isInteractive?: boolean;   // Whether position badge is tappable
  onPlayerPress?: (player: RosterPlayer) => void;
}

const RosterPlayerCard = memo(function RosterPlayerCard({
  player,
  slotPosition,
  slotLabel,
  onPositionPress,
  isStarter = true,
  showEmptySlot = true,
  consensusPercent,
  voterNames = [],
  isInteractive = true,
  onPlayerPress,
}: RosterPlayerCardProps) {
  const positionColor = getPositionColor(slotPosition);
  const displayLabel = slotLabel || slotPosition;

  // Get consensus color based on percentage
  const getConsensusColor = (percent: number) => {
    if (percent >= 80) return '#61C263'; // Green - strong consensus
    if (percent >= 60) return '#F5C842'; // Yellow - moderate consensus
    return '#FF9800'; // Orange - weak consensus
  };

  // If no player assigned, show empty slot
  if (!player) {
    if (!showEmptySlot) return null;

    const PositionWrapper = isInteractive ? TouchableOpacity : View;
    const positionWrapperProps = isInteractive
      ? { onPress: onPositionPress, activeOpacity: 0.7 }
      : {};

    return (
      <View style={styles.container}>
        <PositionWrapper
          style={[styles.positionBadge, { backgroundColor: positionColor }]}
          {...positionWrapperProps}
        >
          <Text style={styles.positionText}>{displayLabel}</Text>
        </PositionWrapper>

        <View style={styles.emptySlotContent}>
          <Text style={styles.emptySlotText}>Empty</Text>
          <Text style={styles.emptySlotSubtext}>
            {isStarter ? 'No consensus yet' : 'Bench slot'}
          </Text>
        </View>
      </View>
    );
  }

  const injuryInfo = player.injuryStatus
    ? INJURY_STATUS_LABELS[player.injuryStatus]
    : null;

  const gameInfo = player.gameInfo;
  const stats = player.stats;
  const isFavorableMatchup =
    gameInfo?.opponentRank !== undefined && gameInfo.opponentRank <= 10;
  const isToughMatchup =
    gameInfo?.opponentRank !== undefined && gameInfo.opponentRank >= 25;

  // Format opponent display (e.g., "vs MIA (13th)" or "@ NE (11th)")
  const formatOpponent = () => {
    if (!gameInfo) return null;
    const prefix = gameInfo.isHome ? 'vs' : '@';
    const rank = gameInfo.opponentRank ? ` (${gameInfo.opponentRank}${getOrdinalSuffix(gameInfo.opponentRank)})` : '';
    return `${prefix} ${gameInfo.opponent}${rank}`;
  };

  const getOrdinalSuffix = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  const PositionBadgeWrapper = isInteractive ? TouchableOpacity : View;
  const positionBadgeProps = isInteractive
    ? { onPress: onPositionPress, activeOpacity: 0.7 }
    : {};
  const playerImageSource = getPlayerImageSource(player);

  const content = (
    <>
      {/* Position Badge - Optionally Tappable */}
      <PositionBadgeWrapper
        style={[styles.positionBadge, { backgroundColor: positionColor }]}
        {...positionBadgeProps}
      >
        <Text style={styles.positionText}>{displayLabel}</Text>
      </PositionBadgeWrapper>

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
        {/* Team logo overlay could go here */}
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

        {/* Game info and stats row */}
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
              {/* <Text style={[styles.injuryText, { color: injuryInfo.color }]}>
                {injuryInfo.label}
              </Text> */}
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

      {/* Points/Consensus Section */}
      <View style={styles.pointsContainer}>
        {isStarter && consensusPercent !== undefined ? (
          // Show consensus percentage for starters in group voting mode
          <>
            <View
              style={[
                styles.consensusBadge,
                { backgroundColor: `${getConsensusColor(consensusPercent)}20` },
              ]}
            >
              <Text
                style={[
                  styles.consensusPercent,
                  { color: getConsensusColor(consensusPercent) },
                ]}
              >
                {consensusPercent}%
              </Text>
            </View>
            <Text style={styles.consensusLabel}>consensus</Text>
            {!!voterNames.length && (
              <Text style={styles.consensusVoters} numberOfLines={1}>
                {voterNames.length > 2
                  ? `${voterNames.slice(0, 2).join(', ')} +${voterNames.length - 2}`
                  : voterNames.join(', ')}
              </Text>
            )}
          </>
        ) : (
          // Show points for bench players or when no consensus data
          <>
            <Text style={styles.projectedLabel}>-</Text>
            <Text style={styles.pointsValue}>
              {stats?.points !== undefined ? stats.points.toFixed(2) : '--'}
            </Text>
          </>
        )}
      </View>
    </>
  );

  if (onPlayerPress) {
    return (
      <TouchableOpacity style={styles.container} onPress={() => onPlayerPress(player)} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.container}>{content}</View>;
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: SURFACE.card,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.lightest,
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
    position: 'relative',
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
    color: '#61C263',
  },
  badMatchup: {
    color: '#FF4F4F',
  },
  injuryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  injuryText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 2,
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
    minWidth: 50,
  },
  projectedLabel: {
    color: TEXT.secondary,
    fontSize: 12,
    marginBottom: 2,
  },
  pointsValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  consensusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 2,
  },
  consensusPercent: {
    fontSize: 15,
    fontWeight: '700',
  },
  consensusLabel: {
    color: TEXT.tertiary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  consensusVoters: {
    color: TEXT.quaternary,
    fontSize: 10,
    marginTop: 2,
    maxWidth: 110,
  },
});

export { RosterPlayerCard };
export type { RosterPlayerCardProps };
