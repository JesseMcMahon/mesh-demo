import React, { useCallback, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Image as ExpoImage } from "expo-image";
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { MaterialIcons } from '@expo/vector-icons';
import { BRAND, SURFACE, TEXT, BORDER, ACCENT, SEMANTIC } from '@/constants/colors';
import { getPlayerImageSource, prefetchPlayerImages } from '@/lib/playerImages';
import { RosterPlayer, getPositionColor, Position, INJURY_STATUS_LABELS } from '@/types/roster';

interface LineupSwapBottomSheetProps {
  isVisible: boolean;
  selectedSlot: {
    position: Position | 'FLEX';
    slotIndex: number;
    currentPlayer: RosterPlayer | null;
  } | null;
  eligiblePlayers: RosterPlayer[]; // Bench + same position starters available for swap
  onSwapPlayer: (player: RosterPlayer) => void;
  onMoveToEmpty?: () => void;
  onClose: () => void;
}

export interface LineupSwapBottomSheetRef {
  expand: () => void;
  collapse: () => void;
  close: () => void;
}

const LineupSwapBottomSheet = forwardRef<LineupSwapBottomSheetRef, LineupSwapBottomSheetProps>(
  function LineupSwapBottomSheet(
    {
      isVisible,
      selectedSlot,
      eligiblePlayers,
      onSwapPlayer,
      onMoveToEmpty,
      onClose,
    },
    ref
  ) {
    const bottomSheetRef = useRef<BottomSheet>(null);

    const snapPoints = useMemo(() => ['50%', '85%'], []);

    useImperativeHandle(ref, () => ({
      expand: () => bottomSheetRef.current?.expand(),
      collapse: () => bottomSheetRef.current?.collapse(),
      close: () => bottomSheetRef.current?.close(),
    }));

    const handleSheetChanges = useCallback(
      (index: number) => {
        if (index === -1) {
          onClose();
        }
      },
      [onClose]
    );

    // Filter eligible players based on position compatibility
    const filteredPlayers = useMemo(() => {
      if (!selectedSlot) return [];

      const slotPos = selectedSlot.position;

      return eligiblePlayers.filter((player) => {
        // FLEX slot can accept RB, WR, TE
        if (slotPos === 'FLEX') {
          return ['RB', 'WR', 'TE'].includes(player.position.toUpperCase());
        }
        // Regular position slots match position exactly
        return player.position.toUpperCase() === slotPos;
      });
    }, [eligiblePlayers, selectedSlot]);

    useEffect(() => {
      prefetchPlayerImages(filteredPlayers, 35);
    }, [filteredPlayers]);

    const renderPlayerItem = useCallback(
      ({ item: player }: { item: RosterPlayer }) => {
        const positionColor = getPositionColor(player.position);
        const injuryInfo = player.injuryStatus
          ? INJURY_STATUS_LABELS[player.injuryStatus]
          : null;
        const isCurrentPlayer =
          selectedSlot?.currentPlayer?.playerId === player.playerId;
        const playerImageSource = getPlayerImageSource(player);

        return (
          <TouchableOpacity
            style={[
              styles.playerItem,
              isCurrentPlayer && styles.currentPlayerItem,
            ]}
            onPress={() => !isCurrentPlayer && onSwapPlayer(player)}
            activeOpacity={isCurrentPlayer ? 1 : 0.7}
            disabled={isCurrentPlayer}
          >
            {/* Position Badge */}
            <View
              style={[styles.positionBadge, { backgroundColor: positionColor }]}
            >
              <Text style={styles.positionText}>{player.position}</Text>
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
                  <MaterialIcons name="person" size={20} color={TEXT.secondary} />
                </View>
              )}
            </View>

            {/* Player Info */}
            <View style={styles.playerInfo}>
              <Text style={styles.playerName} numberOfLines={1}>
                {player.firstName} {player.lastName}
              </Text>
              <View style={styles.playerMetaRow}>
                <Text style={styles.playerTeam}>{player.team}</Text>
                {injuryInfo && (
                  <View
                    style={[
                      styles.injuryBadge,
                      { backgroundColor: `${injuryInfo.color}20` },
                    ]}
                  >
                    <Text
                      style={[styles.injuryText, { color: injuryInfo.color }]}
                    >
                      {injuryInfo.label}
                    </Text>
                  </View>
                )}
              </View>
              {player.stats && (
                <Text style={styles.playerProjection}>
                  Proj: {player.stats.projected?.toFixed(1) || '--'}
                </Text>
              )}
            </View>

            {/* Current indicator or swap icon */}
            <View style={styles.actionContainer}>
              {isCurrentPlayer ? (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentText}>CURRENT</Text>
                </View>
              ) : (
                <MaterialIcons name="swap-horiz" size={24} color={BRAND.primary} />
              )}
            </View>
          </TouchableOpacity>
        );
      },
      [selectedSlot, onSwapPlayer]
    );

    const ListHeader = useCallback(() => {
      if (!selectedSlot) return null;

      const positionColor = getPositionColor(selectedSlot.position);

      return (
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View
              style={[
                styles.headerPositionBadge,
                { backgroundColor: positionColor },
              ]}
            >
              <Text style={styles.headerPositionText}>
                {selectedSlot.position}
              </Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>
                {selectedSlot.currentPlayer
                  ? `Swap ${selectedSlot.currentPlayer.firstName} ${selectedSlot.currentPlayer.lastName}`
                  : `Select ${selectedSlot.position}`}
              </Text>
              <Text style={styles.headerSubtitle}>
                Choose a player to start at {selectedSlot.position}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={TEXT.secondary} />
            </TouchableOpacity>
          </View>

          {/* Empty slot option */}
          {selectedSlot.currentPlayer && onMoveToEmpty && (
            <TouchableOpacity
              style={styles.emptyOption}
              onPress={onMoveToEmpty}
              activeOpacity={0.7}
            >
              <MaterialIcons name="remove-circle-outline" size={24} color={SEMANTIC.error} />
              <Text style={styles.emptyOptionText}>Move to Bench</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionLabel}>
            AVAILABLE PLAYERS ({filteredPlayers.length})
          </Text>
        </View>
      );
    }, [selectedSlot, filteredPlayers.length, onClose, onMoveToEmpty]);

    const ListEmpty = useCallback(
      () => (
        <View style={styles.emptyState}>
          <MaterialIcons name="person-off" size={48} color={TEXT.quaternary} />
          <Text style={styles.emptyStateText}>No eligible players</Text>
          <Text style={styles.emptyStateSubtext}>
            No players on your bench match this position
          </Text>
        </View>
      ),
      []
    );

    if (!isVisible || !selectedSlot) return null;

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetFlatList<RosterPlayer>
          data={filteredPlayers}
          keyExtractor={(item: RosterPlayer) => item.playerId.toString()}
          renderItem={renderPlayerItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: SURFACE.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: TEXT.quaternary,
    width: 40,
  },
  listContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.lightest,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerPositionBadge: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerPositionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: TEXT.secondary,
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  emptyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF453A10',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  emptyOptionText: {
    color: SEMANTIC.error,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  sectionLabel: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.lightest,
  },
  currentPlayerItem: {
    backgroundColor: '#2563EB10',
  },
  positionBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  positionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  photoContainer: {
    marginRight: 10,
  },
  playerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2F38',
  },
  placeholderPhoto: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  playerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  playerTeam: {
    color: TEXT.secondary,
    fontSize: 12,
  },
  injuryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  injuryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  playerProjection: {
    color: BRAND.primary,
    fontSize: 11,
    marginTop: 2,
  },
  actionContainer: {
    marginLeft: 8,
  },
  currentBadge: {
    backgroundColor: ACCENT.redBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  currentText: {
    color: BRAND.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: TEXT.secondary,
    fontSize: 13,
    marginTop: 4,
  },
});

export { LineupSwapBottomSheet };
export type { LineupSwapBottomSheetProps };
