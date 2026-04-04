import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND, SURFACE, TEXT, BORDER, ACCENT, GRADIENTS } from "@/constants/colors";

interface DraftRulesCardProps {
  draftSettings: any;
  isLeagueAdmin: boolean;
  onSettingsPress?: () => void;
  onSetTimePress?: () => void;
  onDraftRoomPress?: () => void;
}

/**
 * Format seconds to a human-readable string like "2 minutes per pick" or "1 hour 30 minutes per pick"
 */
function formatTimeFromSeconds(seconds: number): string {
  if (!seconds || seconds === 0) {
    return "0 minutes";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(hours === 1 ? "1 hour" : `${hours} hours`);
  }

  if (minutes > 0) {
    parts.push(minutes === 1 ? "1 minute" : `${minutes} minutes`);
  }

  // Only show seconds if there are no hours or minutes, or if seconds are significant
  if (secs > 0 && hours === 0 && minutes === 0) {
    parts.push(secs === 1 ? "1 second" : `${secs} seconds`);
  }

  if (parts.length === 0) {
    return "0 minutes";
  }

  // Join with proper grammar
  if (parts.length === 1) {
    return parts[0];
  } else if (parts.length === 2) {
    return `${parts[0]} ${parts[1]}`;
  } else {
    return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  }
}

export function DraftRulesCard({
  draftSettings,
  isLeagueAdmin,
  onSettingsPress,
  onSetTimePress,
  onDraftRoomPress,
}: DraftRulesCardProps) {
  const draftTime = draftSettings?.draftTime;
  const draftType = draftSettings?.draftType || "Snake";
  // Handle both timePerPick and secondsPerPick field names
  const timePerPick =
    draftSettings?.timePerPick || draftSettings?.secondsPerPick || 0;

  const hasDraftTime = draftTime != null;

  return (
    <View
      className="rounded-2xl p-4 mb-3 border"
      style={{
        backgroundColor: SURFACE.cardTransparent,
        borderColor: BORDER.medium,
      }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 20,
            fontWeight: "700",
          }}
        >
          Draft & Rules
        </Text>
        {isLeagueAdmin && (
          <TouchableOpacity
            onPress={onSettingsPress}
            className="flex-row items-center"
            activeOpacity={0.7}
          >
            <MaterialIcons name="settings" size={18} color={BRAND.primary} />
            <Text
              style={{
                color: BRAND.primary,
                fontSize: 15,
                fontWeight: "600",
                marginLeft: 4,
              }}
            >
              Settings
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Draft Date Section */}
      <View className="mb-4">
        <Text
          style={{
            color: TEXT.secondary,
            fontSize: 13,
            fontWeight: "500",
            marginBottom: 4,
          }}
        >
          Draft Date
        </Text>
        {hasDraftTime ? (
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 15,
              fontWeight: "600",
            }}
          >
            {new Date(draftTime).toLocaleString("en-US", {
              month: "numeric",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </Text>
        ) : (
          <View className="flex-row items-center">
            <Text
              style={{
                color: "#FF4444",
                fontSize: 15,
                fontWeight: "600",
                marginRight: 8,
              }}
            >
              No Draft Day/Time Selected
            </Text>
            {isLeagueAdmin && (
              <TouchableOpacity onPress={onSetTimePress} activeOpacity={0.7}>
                <View
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: BRAND.primary,
                    alignSelf: "flex-start",
                  }}
                >
                  <Text
                    style={{
                      color: BRAND.primary,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    (Set time)
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Format Section */}
      <View className="mb-4">
        <Text
          style={{
            color: TEXT.secondary,
            fontSize: 13,
            fontWeight: "500",
            marginBottom: 4,
          }}
        >
          Format
        </Text>
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: "500",
            marginBottom: 2,
          }}
        >
          {draftType} Draft • {formatTimeFromSeconds(timePerPick)} per pick
        </Text>
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: "500",
          }}
        >
          PPR Scoring
        </Text>
      </View>

      {/* Draft Room Button */}
      <TouchableOpacity
        onPress={onDraftRoomPress}
        activeOpacity={0.8}
        style={{
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={[...GRADIENTS.action]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="event" size={20} color="#FFFFFF" />
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 16,
              fontWeight: "700",
              marginLeft: 8,
            }}
          >
            Draft Room
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}
