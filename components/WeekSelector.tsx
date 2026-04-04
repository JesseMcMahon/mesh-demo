import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BRAND, TEXT } from '@/constants/colors';

interface WeekSelectorProps {
  currentWeek: number;
  maxWeek?: number;
  onPreviousWeek?: () => void;
  onNextWeek?: () => void;
  onWeekPress?: () => void; // For opening a week picker
}

const WeekSelector = memo(function WeekSelector({
  currentWeek,
  maxWeek = 18,
  onPreviousWeek,
  onNextWeek,
  onWeekPress,
}: WeekSelectorProps) {
  const canGoPrevious = currentWeek > 1;
  const canGoNext = currentWeek < maxWeek;

  return (
    <View style={styles.container}>
      {/* Previous Week Button */}
      <TouchableOpacity
        style={[styles.arrowButton, !canGoPrevious && styles.arrowButtonDisabled]}
        onPress={canGoPrevious ? onPreviousWeek : undefined}
        activeOpacity={canGoPrevious ? 0.7 : 1}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons
          name="chevron-left"
          size={24}
          color={canGoPrevious ? BRAND.primary : TEXT.quaternary}
        />
      </TouchableOpacity>

      {/* Week Display */}
      <TouchableOpacity
        style={styles.weekDisplay}
        onPress={onWeekPress}
        activeOpacity={0.7}
      >
        <Text style={styles.weekText}>WEEK {currentWeek}</Text>
      </TouchableOpacity>

      {/* Next Week Button */}
      <TouchableOpacity
        style={[styles.arrowButton, !canGoNext && styles.arrowButtonDisabled]}
        onPress={canGoNext ? onNextWeek : undefined}
        activeOpacity={canGoNext ? 0.7 : 1}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons
          name="chevron-right"
          size={24}
          color={canGoNext ? BRAND.primary : TEXT.quaternary}
        />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowButton: {
    padding: 4,
  },
  arrowButtonDisabled: {
    opacity: 0.5,
  },
  weekDisplay: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  weekText: {
    color: BRAND.primary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export { WeekSelector };
export type { WeekSelectorProps };
