import React, { memo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND, SURFACE, TEXT, BORDER, ACCENT } from '@/constants/colors';

interface TeamHeaderCardProps {
  teamName: string;
  teamImageUrl?: string;
  record?: string;
  onSettingsPress?: () => void;
  onPlayersPress?: () => void;
  onTradePress?: () => void;
  onTransactionsPress?: () => void;
  onNewsPress?: () => void;
}

interface ActionButtonProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress?: () => void;
}

const ActionButton = memo(function ActionButton({
  icon,
  label,
  onPress,
}: ActionButtonProps) {
  if (!onPress) return null;

  return (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.actionIconContainer}>
        <MaterialIcons name={icon} size={18} color={BRAND.primary} />
      </View>
      <Text style={styles.actionLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
});

const TeamHeaderCard = memo(function TeamHeaderCard({
  teamName,
  teamImageUrl,
  record = '0-0',
  onSettingsPress,
  onPlayersPress,
  onTradePress,
  onTransactionsPress,
  onNewsPress,
}: TeamHeaderCardProps) {
  const actions = [
    { icon: 'person-add' as const, label: '+ Players', onPress: onPlayersPress },
    { icon: 'swap-horiz' as const, label: 'Trade', onPress: onTradePress },
    { icon: 'receipt-long' as const, label: 'Trans.', onPress: onTransactionsPress },
    { icon: 'newspaper' as const, label: 'News', onPress: onNewsPress },
  ].filter((entry) => !!entry.onPress);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(27,108,168,0.22)', 'rgba(13,24,37,0.68)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.teamInfoRow}>
          <View style={styles.avatarContainer}>
            {teamImageUrl ? (
              <Image
                source={{ uri: teamImageUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <MaterialIcons name="groups" size={26} color={BRAND.primary} />
              </View>
            )}
          </View>

          <View style={styles.teamDetails}>
            <View style={styles.teamNameRow}>
              <Text style={styles.teamName} numberOfLines={1}>
                {teamName}
              </Text>
              {onSettingsPress ? (
                <TouchableOpacity
                  onPress={onSettingsPress}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="settings" size={18} color={TEXT.secondary} />
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.record}>Record {record}</Text>
          </View>

          <View style={styles.recordPill}>
            <Text style={styles.recordPillText}>{record}</Text>
          </View>
        </View>

        {!!actions.length ? (
          <View style={styles.actionsRow}>
            {actions.map((action) => (
              <ActionButton
                key={`${action.icon}-${action.label}`}
                icon={action.icon}
                label={action.label}
                onPress={action.onPress}
              />
            ))}
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER.medium,
    overflow: 'hidden',
    backgroundColor: SURFACE.card,
  },
  gradient: {
    padding: 16,
  },
  teamInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 15,
    backgroundColor: SURFACE.highest,
  },
  placeholderAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ACCENT.primaryBg,
    borderWidth: 1,
    borderColor: ACCENT.primaryBorder,
  },
  teamDetails: {
    flex: 1,
  },
  teamNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.35,
  },
  record: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  recordPill: {
    borderRadius: 12,
    backgroundColor: ACCENT.primaryBgStrong,
    borderWidth: 1,
    borderColor: ACCENT.primaryBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  recordPillText: {
    color: BRAND.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  actionButton: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.default,
    backgroundColor: 'rgba(8,12,18,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: ACCENT.primaryBg,
    borderWidth: 1,
    borderColor: ACCENT.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
});

export { TeamHeaderCard };
export type { TeamHeaderCardProps };
