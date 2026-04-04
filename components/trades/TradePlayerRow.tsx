import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { BORDER, SEMANTIC, SURFACE, TEXT } from "@/constants/colors";
import { getPlayerImageUrl } from "@/lib/playerImages";

export interface TradePlayerDisplay {
  playerId: number;
  firstName?: string;
  lastName?: string;
  name?: string;
  position?: string;
  team?: string;
}

interface TradePlayerRowProps {
  player: TradePlayerDisplay;
  selected?: boolean;
  disabled?: boolean;
  badgeText?: string | null;
  onPress?: () => void;
  onInfoPress?: () => void;
  rightAccessory?: React.ReactNode;
}

function getPlayerName(player: TradePlayerDisplay): string {
  const direct = String(player?.name || "").trim();
  if (direct) return direct;
  const full = `${String(player?.firstName || "").trim()} ${String(player?.lastName || "").trim()}`.trim();
  if (full) return full;
  return `Player #${player?.playerId}`;
}

function getMeta(player: TradePlayerDisplay): string {
  const position = String(player?.position || "--").toUpperCase();
  const team = String(player?.team || "FA").toUpperCase();
  return `${position} • ${team}`;
}

export function TradePlayerRow({
  player,
  selected = false,
  disabled = false,
  badgeText,
  onPress,
  onInfoPress,
  rightAccessory,
}: TradePlayerRowProps) {
  const imageUrl = getPlayerImageUrl(player as any);

  return (
    <TouchableOpacity
      activeOpacity={disabled ? 1 : 0.75}
      disabled={!onPress || disabled}
      onPress={onPress}
      style={[
        styles.row,
        selected && styles.rowSelected,
        disabled && styles.rowDisabled,
      ]}
    >
      <View style={styles.leading}>
        {imageUrl ? (
          <ExpoImage
            source={{ uri: imageUrl }}
            style={styles.avatar}
            contentFit="cover"
            transition={100}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.avatarFallback}>
            <MaterialIcons name="person" size={17} color={TEXT.secondary} />
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>{getPlayerName(player)}</Text>
          <Text style={styles.meta}>{getMeta(player)}</Text>
          {badgeText ? (
            <View style={styles.badge}>
              <MaterialIcons name="lock-outline" size={11} color={SEMANTIC.warning} />
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.trailing}>
        {onInfoPress ? (
          <TouchableOpacity onPress={onInfoPress} style={styles.infoButton}>
            <MaterialIcons name="open-in-new" size={15} color={TEXT.secondary} />
          </TouchableOpacity>
        ) : null}

        {rightAccessory ? (
          rightAccessory
        ) : disabled ? (
          <MaterialIcons name="lock" size={17} color={SEMANTIC.warning} />
        ) : selected ? (
          <MaterialIcons name="check-circle" size={19} color={SEMANTIC.success} />
        ) : (
          <MaterialIcons name="radio-button-unchecked" size={19} color={TEXT.tertiary} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  rowSelected: {
    borderColor: `${SEMANTIC.success}bb`,
    backgroundColor: `${SEMANTIC.success}1a`,
  },
  rowDisabled: {
    borderColor: `${SEMANTIC.warning}7a`,
    backgroundColor: `${SEMANTIC.warning}12`,
    opacity: 0.9,
  },
  leading: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: SURFACE.card,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE.card,
    borderWidth: 1,
    borderColor: BORDER.medium,
  },
  body: {
    marginLeft: 10,
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: TEXT.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  meta: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 1,
  },
  badge: {
    alignSelf: "flex-start",
    marginTop: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${SEMANTIC.warning}66`,
    backgroundColor: `${SEMANTIC.warning}1a`,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeText: {
    marginLeft: 4,
    color: SEMANTIC.warning,
    fontSize: 10,
    fontWeight: "700",
  },
  trailing: {
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  infoButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER.medium,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
});
