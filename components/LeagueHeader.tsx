import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { LeagueChip } from "./LeagueChip";
import { getCommunityTypeConfig } from "@/constants/communityTypes";
import { NotificationType } from "./MeshNotification";
import { BRAND, SURFACE, TEXT, BORDER, ACCENT, SEMANTIC } from "@/constants/colors";

interface LeagueHeaderProps {
  leagueName: string;
  leagueImageUrl?: string | null;
  description?: string;
  location?: string;
  communityType?: string;
  isPublic: boolean;
  squadCount: number;
  leagueSize: number;
  shareUrl: string;
  isLeagueAdmin?: boolean;
  onSharePress?: () => void;
  onQRCodePress?: () => void;
  onEditPress?: () => void;
  showNotification?: (message: string, type: NotificationType) => void;
}

const meshLogo: ImageSourcePropType = require("@/assets/images/meshLogo.png");

export function LeagueHeader({
  leagueName,
  leagueImageUrl,
  description,
  location,
  communityType,
  isPublic,
  squadCount,
  leagueSize,
  shareUrl,
  isLeagueAdmin = false,
  onSharePress,
  onQRCodePress,
  onEditPress,
  showNotification,
}: LeagueHeaderProps) {
  const handleSharePress = async () => {
    try {
      await Clipboard.setStringAsync(shareUrl);
      showNotification?.("Link copied to clipboard!", "success");
      onSharePress?.();
    } catch (error) {
      showNotification?.("Failed to copy link", "error");
    }
  };

  const handleQRCodePress = () => {
    // TODO: Implement QR code functionality
    onQRCodePress?.();
  };

  const communityTypeConfig = communityType
    ? getCommunityTypeConfig(communityType)
    : null;

  return (
    <View className="px-6 pt-6 pb-4" style={{ backgroundColor: SURFACE.background }}>
      {/* Top Section: Logo, Name, and Action Buttons */}
      <View className="flex-row items-start mb-4">
        {/* League Logo */}
        <View
          className="rounded-2xl overflow-hidden mr-4"
          style={{
            width: 80,
            height: 80,
            backgroundColor: SURFACE.card,
          }}
        >
          <Image
            source={leagueImageUrl ? { uri: leagueImageUrl } : meshLogo}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>

        {/* League Name */}
        <View className="flex-1">
          <Text
            className="text-white font-bold"
            style={{ fontSize: 24, lineHeight: 28 }}
            numberOfLines={2}
          >
            {leagueName}
          </Text>
        </View>

        {/* Action Buttons - Stacked Vertically */}
        <View className="flex-col gap-2 ml-2">
          {/* Edit Button (only show if admin) */}
          {isLeagueAdmin && (
            <TouchableOpacity
              onPress={onEditPress}
              className="flex-row items-center"
            >
              <Text
                className="font-semibold"
                style={{
                  color: BRAND.primary,
                  fontSize: 14,
                  marginRight: 4,
                }}
              >
                Edit
              </Text>
              <MaterialIcons name="edit" size={18} color={BRAND.primary} />
            </TouchableOpacity>
          )}

          {/* Share Button */}
          <TouchableOpacity
            onPress={handleSharePress}
            className="rounded-full items-center justify-center"
            style={{
              width: 40,
              height: 40,
              backgroundColor: ACCENT.redBgStrong,
            }}
          >
            <MaterialIcons name="link" size={20} color={BRAND.primary} />
          </TouchableOpacity>

          {/* QR Code Button */}
          <TouchableOpacity
            onPress={handleQRCodePress}
            className="rounded-full items-center justify-center"
            style={{
              width: 40,
              height: 40,
              backgroundColor: ACCENT.redBgStrong,
            }}
          >
            <MaterialIcons name="qr-code-2" size={20} color={BRAND.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Description */}
      {description ? (
        <Text
          className="text-gray-400 mb-3"
          style={{ fontSize: 14, lineHeight: 20 }}
        >
          {description}
        </Text>
      ) : (
        <Text
          className="text-gray-500 italic mb-3"
          style={{ fontSize: 14, lineHeight: 20 }}
        >
          (Description) Tell others why they should join your league & about
          your community.
        </Text>
      )}

      {/* Location */}
      {location && (
        <View className="flex-row items-center mb-4">
          <MaterialIcons name="location-on" size={16} color={TEXT.secondary} />
          <Text className="text-gray-400 ml-1" style={{ fontSize: 14 }}>
            {location}
          </Text>
        </View>
      )}

      {/* Chips Row */}
      <View className="flex-row flex-wrap gap-2">
        {/* Community Type Chip */}
        {communityTypeConfig && (
          <LeagueChip
            icon={communityTypeConfig.icon}
            text={communityType}
            backgroundColor={`${communityTypeConfig.color}33`}
            textColor={communityTypeConfig.color}
            borderColor={communityTypeConfig.color}
          />
        )}

        {/* Public/Private Chip */}
        <LeagueChip
          icon={isPublic ? "public" : "lock"}
          text={isPublic ? "Public" : "Private"}
          backgroundColor={isPublic ? `${BRAND.gold}33` : `${SEMANTIC.warning}33`}
          textColor={isPublic ? BRAND.gold : SEMANTIC.warning}
          borderColor={isPublic ? BRAND.gold : SEMANTIC.warning}
        />
      </View>
    </View>
  );
}
