import { Text, View, ScrollView, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { TopNavigation } from "@/components/TopNavigation";
import { MeshButton } from "@/components/MeshButton";
import { PageHeaderText } from "@/components/PageHeaderText";
import { PageSubText } from "@/components/PageSubText";
import { ProTip } from "@/components/ProTip";
import { useCreateSquad } from "@/contexts/create-squad";
import { useLeagueData } from "@/contexts/league-data";
import { useUserProfile } from "@/contexts/user-profile";
import { useNotification } from "@/contexts/notification";
import { leagueApi } from "@/lib/api";
import { useState } from "react";
import { SURFACE, BRAND, BORDER } from "@/constants/colors";
import { dismissFlowAndBackOrReplace } from "@/lib/navigation";

type JoinabilityType = "public" | "private";

interface JoinabilityOptionProps {
  type: JoinabilityType;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  isSelected: boolean;
  onPress: () => void;
}

function JoinabilityOption({
  title,
  subtitle,
  description,
  icon,
  iconColor,
  isSelected,
  onPress,
}: JoinabilityOptionProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-xl border-2 mb-4 p-4 flex-row items-start"
      style={{
        borderColor: isSelected ? BRAND.primary : BORDER.medium,
        backgroundColor: isSelected ? `${BRAND.primary}33` : "transparent",
      }}
    >
      <View className="mr-4 mt-1">
        <MaterialIcons name={icon} size={32} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-white font-bold text-base mb-1">{title}</Text>
        <Text className="text-gray-400 text-sm mb-2">{subtitle}</Text>
        <Text className="text-gray-400 text-sm leading-5">{description}</Text>
      </View>
      <View className="ml-2 mt-1">
        <View
          className="rounded-full border-2"
          style={{
            width: 24,
            height: 24,
            borderColor: isSelected ? BRAND.primary : BORDER.medium,
            backgroundColor: isSelected ? BRAND.primary : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isSelected && (
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: "#FFFFFF",
              }}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CreateSquadStep2() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    id: string | string[];
    squadId?: string | string[];
  }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const squadIdParam = params.squadId
    ? Array.isArray(params.squadId)
      ? params.squadId[0]
      : params.squadId
    : null;
  const { data, setJoinability, resetData } = useCreateSquad();
  const { leagueDetails, squads } = useLeagueData();
  const { accessToken } = useUserProfile();
  const { showNotification } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const isSoloLeague = leagueDetails?.leagueType === "solo";

  const leagueName = leagueDetails?.name || "League Name";

  const handleCancel = () => {
    resetData();
    dismissFlowAndBackOrReplace(router, `/(tabs)/league/${id}` as any);
  };

  const handleCreateSquad = async () => {
    if (!data.squadName || (!isSoloLeague && !data.joinability)) {
      showNotification("Please fill in all required fields", "error");
      return;
    }

    // Get squadId from params, or find an empty squad from the list
    let squadId = squadIdParam;

    // If no squadId in params, try to find an empty squad
    if (!squadId && squads && squads.length > 0) {
      // Look for an empty squad (one with no members or a specific indicator)
      const emptySquad = squads.find(
        (squad: any) =>
          !squad.members || squad.members.length === 0 || squad.isEmpty
      );
      if (emptySquad && emptySquad._id) {
        squadId = emptySquad._id;
      }
    }

    if (!squadId) {
      showNotification("Unable to find squad. Please try again.", "error");
      return;
    }

    setIsLoading(true);

    try {
      await leagueApi.joinSquadAsFirstMember(
        {
          squadId,
          name: data.squadName,
          isPublic: isSoloLeague ? true : data.joinability === "public",
        },
        accessToken
      );

      // Invalidate and immediately refetch squad queries
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["league-squads", id, accessToken],
        }),
        queryClient.invalidateQueries({
          queryKey: ["league-user-profile", id, accessToken],
        }),
        queryClient.invalidateQueries({
          queryKey: ["league-details", id, accessToken],
        }),
        queryClient.invalidateQueries({
          queryKey: ["my-leagues"],
        }),
      ]);

      // Force immediate refetch of active queries
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ["league-squads", id, accessToken],
          type: "active",
        }),
        queryClient.refetchQueries({
          queryKey: ["league-user-profile", id, accessToken],
          type: "active",
        }),
        queryClient.refetchQueries({
          queryKey: ["league-details", id, accessToken],
          type: "active",
        }),
      ]);

      // Success: reset form data, navigate back, and show success notification
      resetData();
      dismissFlowAndBackOrReplace(router, `/(tabs)/league/${id}` as any);
      showNotification("Squad created successfully!", "success");
    } catch (error) {
      // Error: show error notification
      showNotification(
        error instanceof Error
          ? error.message
          : "Failed to create squad. Please try again.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE.background }}>
      <TopNavigation
        title={leagueName}
        showBackButton
        rightText={{ text: "Cancel", onPress: handleCancel }}
      />

      <ScrollView
        className="flex-1 px-6"
        style={{ backgroundColor: SURFACE.background }}
        contentContainerStyle={{ paddingVertical: 20, flexGrow: 1 }}
      >
        <View className="flex-1 justify-between">
          <View>
            {/* Section Title */}
            <PageHeaderText>{isSoloLeague ? "Create Team" : "Choose Joinability"}</PageHeaderText>

            {/* Description */}
            <PageSubText>
              {isSoloLeague
                ? "Solo leagues allow one owner per team, so team invites and privacy settings are disabled."
                : "Please select how you would like others to join your squad. You can change this later if needed."}
            </PageSubText>

            {!isSoloLeague && (
              <View className="mb-6">
                <Text className="text-white text-sm font-semibold mb-3">
                  Joinability
                </Text>
                <JoinabilityOption
                  type="public"
                  title="Public"
                  subtitle="Open to everyone"
                  description="Anyone can join your squad. Meet, connect, & strategize with others throughout the fantasy season."
                  icon="public"
                  iconColor={BRAND.gold}
                  isSelected={data.joinability === "public"}
                  onPress={() => setJoinability("public")}
                />

                <JoinabilityOption
                  type="private"
                  title="Private"
                  subtitle="Invite/request only"
                  description="Users must request to join through private QR codes/invite links."
                  icon="lock"
                  iconColor="#FF9800"
                  isSelected={data.joinability === "private"}
                  onPress={() => setJoinability("private")}
                />
              </View>
            )}

            {/* Pro Tip Section */}
            <ProTip
              tipText={
                isSoloLeague
                  ? "Solo leagues use direct team ownership. No squad invites or voting are required."
                  : "You can manage squad members and permissions in the squad settings after creation."
              }
            />
          </View>

          <View className="mt-8">
            <MeshButton
              title="Create Squad"
              onPress={handleCreateSquad}
              variant="primary"
              disabled={!data.squadName || (!isSoloLeague && !data.joinability) || isLoading}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
