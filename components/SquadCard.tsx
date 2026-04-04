import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { MeshChip } from "./MeshChip";
import { BRAND, SURFACE, TEXT, BORDER, ACCENT, SEMANTIC } from "@/constants/colors";

interface SquadCardProps {
  squad?: {
    _id: string;
    name?: string;
    isPublic?: boolean;
    members?: any[];
    slotNumber?: number;
  };
  isUserSquad?: boolean;
  isUserInSquad?: boolean;
  onPress: () => void;
  onJoinPress?: () => void;
  onLeavePress?: () => void;
  variant?: "empty" | "create" | "populated";
  emptyLabel?: string;
}

export const SquadCard = React.memo(function SquadCard({
  squad,
  isUserSquad = false,
  isUserInSquad = false,
  onPress,
  onJoinPress,
  onLeavePress,
  variant = "populated",
  emptyLabel,
}: SquadCardProps) {
  const hasMembers = squad?.members && squad.members.length > 0;
  const memberCount = squad?.members?.length || 0;
  const isCreate = variant === "create";
  const isEmpty = variant === "empty" || (!hasMembers && !isCreate);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            hasMembers ? styles.iconPopulated : styles.iconEmpty,
          ]}
        >
          <MaterialIcons
            name={hasMembers ? "group" : "add"}
            size={24}
            color="#FFFFFF"
          />
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          {isEmpty ? (
            <>
              <Text style={styles.emptyTitle}>{emptyLabel || "Empty"}</Text>
              <Text style={styles.emptySubtitle}>
                {emptyLabel
                  ? "Tap to claim this team and name your squad"
                  : "Share the league link so others can create squads"}
              </Text>
            </>
          ) : isCreate ? (
            <>
              <Text style={styles.createTitle}>Create your squad</Text>
              <Text style={styles.createSubtitle}>
                Want to be part of the league? Join the action!
              </Text>
            </>
          ) : (
            <>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={1}>
                  {squad?.name || "Squad Name"}
                </Text>
                {squad?.isPublic !== undefined && (
                  <MeshChip
                    color={squad.isPublic ? BRAND.gold : "#FF9800"}
                    icon={squad.isPublic ? "public" : "lock"}
                    text={squad.isPublic ? "Public" : "Private"}
                  />
                )}
              </View>
              <Text style={styles.memberCount}>
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </Text>
              {!isUserInSquad && !isUserSquad && onJoinPress && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    onJoinPress();
                  }}
                  style={styles.joinButton}
                >
                  <Text style={styles.joinText}>Join Squad</Text>
                </TouchableOpacity>
              )}
              {isUserSquad && onLeavePress && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    onLeavePress();
                  }}
                  style={styles.leaveButton}
                >
                  <Text style={styles.leaveText}>Leave Squad</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACE.cardTransparent,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER.medium,
    padding: 14,
    marginBottom: 10,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  iconEmpty: {
    borderColor: BRAND.primary,
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },
  iconPopulated: {
    borderColor: BRAND.primary,
    borderStyle: "solid",
    backgroundColor: ACCENT.redBgStrong,
  },
  textContainer: {
    flex: 1,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptySubtitle: {
    color: TEXT.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  createTitle: {
    color: BRAND.primary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  createSubtitle: {
    color: TEXT.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  memberCount: {
    color: TEXT.secondary,
    fontSize: 14,
  },
  leaveButton: {
    marginTop: 12,
  },
  joinButton: {
    marginTop: 12,
  },
  joinText: {
    color: BRAND.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  leaveText: {
    color: SEMANTIC.error,
    fontSize: 14,
    fontWeight: "600",
  },
});
