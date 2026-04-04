import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { SURFACE, TEXT, BORDER, SEMANTIC, BRAND } from "@/constants/colors";
import { useAppTheme } from "@/contexts/theme";
import { useUserProfile } from "@/contexts/user-profile";
import { squadApi, inviteApi } from "@/lib/api";
import { getUserErrorMessage } from "@/lib/errorMessages";
import { useNotification } from "@/contexts/notification";
import { TopNavigation } from "@/components/TopNavigation";
import { MeshTextInput } from "@/components/MeshTextInput";
import { MeshButton } from "@/components/MeshButton";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export default function SquadSettingsScreen() {
  const params = useLocalSearchParams<{
    squadId: string;
    leagueId: string;
    readonly?: string;
  }>();
  const { colors } = useAppTheme();
  const { accessToken, user } = useUserProfile();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  const [squadName, setSquadName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [activeSection, setActiveSection] = useState<
    "settings" | "members" | "invites"
  >("settings");
  const [showKickModal, setShowKickModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const { data: squadDetailsData, isLoading: isLoadingSquadDetails } = useQuery({
    queryKey: ["squad-details", params.squadId, accessToken],
    enabled: !!params.squadId && !!accessToken,
    queryFn: () => squadApi.getDetails(params.squadId!, accessToken),
    staleTime: 30_000,
  });

  const squadDetails = (squadDetailsData as any)?.data || {};
  const squad = squadDetails?.squad || null;
  const members = Array.isArray(squadDetails?.members) ? squadDetails.members : [];
  const isReadOnlyView = String(params?.readonly || "") === "1";
  const myMember = members.find(
    (member: any) =>
      String(member?.userId || "") === String(user?.id || "")
  );
  const isHeadCoach = Boolean(myMember?.roles?.includes?.("HeadCoach"));
  const isLeagueAdmin = Boolean(myMember?.roles?.includes?.("LeagueAdmin"));
  const canManageMembers = !isReadOnlyView && (isHeadCoach || isLeagueAdmin);

  useEffect(() => {
    if (isReadOnlyView) {
      setActiveSection("members");
    }
  }, [isReadOnlyView]);

  useEffect(() => {
    if (!squad) return;
    setSquadName(squad?.name || "");
    setIsPublic(squad?.isPublic ?? true);
  }, [squad]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      const data: any = { squadId: params.squadId };
      if (squadName.trim()) data.name = squadName.trim();
      data.isPublic = isPublic;
      if (!isPublic && password.trim()) data.password = password.trim();
      return squadApi.updateSettings(data, accessToken!);
    },
    onSuccess: () => {
      showNotification("Squad settings updated!", "success");
      queryClient.invalidateQueries({ queryKey: ["squad-details", params.squadId, accessToken] });
      queryClient.invalidateQueries({ queryKey: ["league-squads"], exact: false });
    },
    onError: (error: Error) => {
      showNotification(getUserErrorMessage(error, "Failed to update settings"), "error");
    },
  });

  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: async () => {
      return inviteApi.createSquadInvite(params.squadId!, accessToken!);
    },
    onSuccess: async (result) => {
      const link = result.data?.links?.universalLink;
      const squadNameValue = result.data?.squad?.name || "our squad";

      if (link) {
        try {
          await Share.share({
            message: `Join my squad "${squadNameValue}" on Mesh! ${link}`,
            url: link,
          });
        } catch {
          // User cancelled share
        }
      }
      showNotification("Invite created!", "success");
    },
    onError: (error: Error) => {
      showNotification(getUserErrorMessage(error, "Failed to create invite"), "error");
    },
  });

  // Kick member mutation
  const kickMemberMutation = useMutation({
    mutationFn: async (memberUserId: string) => {
      return squadApi.kickMember(
        { squadId: params.squadId!, memberUserId },
        accessToken!
      );
    },
    onSuccess: () => {
      showNotification("Member removed from squad", "success");
      setShowKickModal(false);
      setSelectedMember(null);
      queryClient.invalidateQueries({ queryKey: ["squad-details", params.squadId, accessToken] });
      queryClient.invalidateQueries({ queryKey: ["league-squads"], exact: false });
    },
    onError: (error: Error) => {
      showNotification(getUserErrorMessage(error, "Failed to remove member"), "error");
    },
  });

  // Transfer head coach mutation
  const transferMutation = useMutation({
    mutationFn: async (newHeadCoachUserId: string) => {
      return squadApi.transferHeadCoach(
        { squadId: params.squadId!, newHeadCoachUserId },
        accessToken!
      );
    },
    onSuccess: () => {
      showNotification("Head coach role transferred!", "success");
      setShowTransferModal(false);
      setSelectedMember(null);
      queryClient.invalidateQueries({ queryKey: ["squad-details", params.squadId, accessToken] });
      queryClient.invalidateQueries({ queryKey: ["league-squads"], exact: false });
    },
    onError: (error: Error) => {
      showNotification(getUserErrorMessage(error, "Failed to transfer role"), "error");
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate();
  };

  const handleKickMember = (member: any) => {
    setSelectedMember(member);
    setShowKickModal(true);
  };

  const handleTransferCoach = (member: any) => {
    setSelectedMember(member);
    setShowTransferModal(true);
  };

  const sections: { key: typeof activeSection; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
    { key: "settings", label: "Settings", icon: "settings" },
    { key: "members", label: "Members", icon: "group" },
    { key: "invites", label: "Invites", icon: "share" },
  ];

  const sectionDescription = useMemo(() => {
    if (!squad) return "Configure your squad settings.";
    return `${squad.name} • ${members.length} member${members.length === 1 ? "" : "s"} • ${
      squad.isPublic ? "Public" : "Private"
    }`;
  }, [members.length, squad]);

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE.background }}>
      <TopNavigation
        title={isReadOnlyView ? "Squad Details" : "Squad Management"}
        showBackButton
      />

      {/* Section tabs */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 20,
          paddingTop: 16,
          gap: 8,
        }}
      >
        {sections.map((section) => (
          <TouchableOpacity
            key={section.key}
            onPress={() => setActiveSection(section.key)}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 10,
              borderRadius: 10,
              gap: 6,
              backgroundColor:
                activeSection === section.key
                  ? colors.primary
                  : SURFACE.elevated,
            }}
          >
            <MaterialIcons
              name={section.icon}
              size={16}
              color={activeSection === section.key ? "#FFF" : TEXT.secondary}
            />
            <Text
              style={{
                color: activeSection === section.key ? "#FFF" : TEXT.secondary,
                fontWeight: "600",
                fontSize: 13,
              }}
            >
              {section.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoadingSquadDetails && (
          <View style={{ paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ color: TEXT.secondary }}>Loading squad details...</Text>
          </View>
        )}

        <View
          style={{
            backgroundColor: SURFACE.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: BORDER.default,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 15 }}>
            {squad?.name || "Squad"}
          </Text>
          <Text style={{ color: TEXT.secondary, marginTop: 2 }}>{sectionDescription}</Text>
        </View>

        {activeSection === "settings" && (
          <View>
            {isReadOnlyView && (
              <View
                style={{
                  backgroundColor: SURFACE.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: BORDER.default,
                  padding: 12,
                  marginBottom: 14,
                }}
              >
                <Text style={{ color: TEXT.secondary, fontSize: 13 }}>
                  This is a read-only view for another squad.
                </Text>
              </View>
            )}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  color: "#FFF",
                  fontSize: 15,
                  fontWeight: "600",
                  marginBottom: 8,
                }}
              >
                Squad Name
              </Text>
              <MeshTextInput
                placeholder="Enter squad name"
                value={squadName}
                onChangeText={setSquadName}
                editable={!isReadOnlyView}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  color: "#FFF",
                  fontSize: 15,
                  fontWeight: "600",
                  marginBottom: 12,
                }}
              >
                Privacy
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {[
                  { label: "Public", value: true, icon: "public" as keyof typeof MaterialIcons.glyphMap },
                  { label: "Private", value: false, icon: "lock" as keyof typeof MaterialIcons.glyphMap },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    onPress={() => setIsPublic(option.value)}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 14,
                      borderRadius: 12,
                      gap: 8,
                      backgroundColor:
                        isPublic === option.value
                          ? `${colors.primary}20`
                          : SURFACE.card,
                      borderWidth: 1,
                      borderColor:
                        isPublic === option.value
                          ? colors.primary
                          : BORDER.default,
                    }}
                  >
                    <MaterialIcons
                      name={option.icon}
                      size={18}
                      color={
                        isPublic === option.value
                          ? colors.primary
                          : TEXT.secondary
                      }
                    />
                    <Text
                      style={{
                        color:
                          isPublic === option.value
                            ? colors.primary
                            : TEXT.secondary,
                        fontWeight: "600",
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {!isPublic && (
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: 15,
                    fontWeight: "600",
                    marginBottom: 8,
                  }}
                >
                  Squad Password
                </Text>
                <Text
                  style={{
                    color: TEXT.secondary,
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  Set a password that members need to join your squad.
                </Text>
                <MeshTextInput
                  startIcon={{ name: "lock" }}
                  placeholder="Enter squad password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isReadOnlyView}
                />
              </View>
            )}

            <MeshButton
              title="Save Settings"
              onPress={handleSaveSettings}
              loading={updateSettingsMutation.isPending}
              disabled={
                isReadOnlyView ||
                updateSettingsMutation.isPending ||
                !canManageMembers
              }
            />
            {!isReadOnlyView && !canManageMembers && (
              <Text style={{ color: TEXT.secondary, marginTop: 8, textAlign: "center" }}>
                Only head coaches or league admins can edit squad settings.
              </Text>
            )}
          </View>
        )}

        {activeSection === "members" && (
          <View>
            <Text
              style={{
                color: TEXT.secondary,
                fontSize: 14,
                marginBottom: 16,
              }}
            >
              {isReadOnlyView
                ? "Roster and role view for this squad."
                : "Manage your squad members. As head coach, you can remove members or transfer leadership."}
            </Text>

            {members.length === 0 ? (
              <View
                style={{
                  backgroundColor: SURFACE.card,
                  borderRadius: 14,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: BORDER.default,
                  alignItems: "center",
                }}
              >
                <MaterialIcons name="group-off" size={38} color={TEXT.tertiary} />
                <Text style={{ color: TEXT.secondary, marginTop: 10 }}>No members found.</Text>
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: SURFACE.card,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: BORDER.default,
                  overflow: "hidden",
                }}
              >
                {members.map((member: any, index: number) => {
                  const isSelf = String(member?.userId || "") === String(user?.id || "");
                  return (
                    <View
                      key={`member-${member?.membershipId || member?.userId || index}`}
                      style={{
                        padding: 14,
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: BORDER.lightest,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text style={{ color: "#FFF", fontWeight: "700" }}>
                            {member?.name || member?.username || "Squad Member"}
                            {isSelf ? " (You)" : ""}
                          </Text>
                          <Text style={{ color: TEXT.secondary, fontSize: 12, marginTop: 2 }}>
                            {(member?.roles || []).join(", ") || "Member"}
                          </Text>
                        </View>

                        {canManageMembers && !isSelf ? (
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            {!member?.isHeadCoach && (
                              <TouchableOpacity
                                onPress={() => handleTransferCoach(member)}
                                style={{
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: `${BRAND.gold}66`,
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                }}
                              >
                                <Text style={{ color: BRAND.gold, fontSize: 12, fontWeight: "700" }}>
                                  Make HC
                                </Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              onPress={() => handleKickMember(member)}
                              style={{
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: `${SEMANTIC.error}66`,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                              }}
                            >
                              <Text style={{ color: SEMANTIC.error, fontSize: 12, fontWeight: "700" }}>
                                Remove
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {activeSection === "invites" && (
          <View>
            <Text
              style={{
                color: TEXT.secondary,
                fontSize: 14,
                marginBottom: 16,
              }}
            >
              Create and share invite links to grow your squad.
            </Text>

            <MeshButton
              title="Create & Share Invite"
              onPress={() => createInviteMutation.mutate()}
              loading={createInviteMutation.isPending}
              disabled={isReadOnlyView}
              startIcon={{ name: "share" }}
            />

            {createInviteMutation.data?.data?.invite?.code && (
              <View
                style={{
                  backgroundColor: SURFACE.card,
                  borderRadius: 14,
                  padding: 16,
                  marginTop: 20,
                  borderWidth: 1,
                  borderColor: BORDER.default,
                }}
              >
                <Text
                  style={{
                    color: TEXT.secondary,
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  Invite Code
                </Text>
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: 28,
                    fontWeight: "800",
                    letterSpacing: 4,
                    textAlign: "center",
                    marginVertical: 8,
                  }}
                >
                  {createInviteMutation.data.data.invite.code}
                </Text>
                {createInviteMutation.data.data.invite.expiresAt && (
                  <Text
                    style={{
                      color: TEXT.tertiary,
                      fontSize: 12,
                      textAlign: "center",
                    }}
                  >
                    Expires:{" "}
                    {new Date(
                      createInviteMutation.data.data.invite.expiresAt
                    ).toLocaleDateString()}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Kick confirmation modal */}
      <ConfirmationModal
        visible={showKickModal}
        title="Remove Member"
        message={`Are you sure you want to remove ${selectedMember?.name || selectedMember?.username || "this member"} from the squad?`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={() => {
          if (selectedMember?.userId || selectedMember?._id) {
            kickMemberMutation.mutate(
              selectedMember.userId || selectedMember._id
            );
          }
        }}
        onCancel={() => {
          setShowKickModal(false);
          setSelectedMember(null);
        }}
        confirmColor={SEMANTIC.error}
      />

      {/* Transfer confirmation modal */}
      <ConfirmationModal
        visible={showTransferModal}
        title="Transfer Head Coach"
        message={`Are you sure you want to make ${selectedMember?.name || selectedMember?.username || "this member"} the new head coach? You will lose head coach privileges.`}
        confirmText="Transfer"
        cancelText="Cancel"
        onConfirm={() => {
          if (selectedMember?.userId || selectedMember?._id) {
            transferMutation.mutate(
              selectedMember.userId || selectedMember._id
            );
          }
        }}
        onCancel={() => {
          setShowTransferModal(false);
          setSelectedMember(null);
        }}
        confirmColor={SEMANTIC.warning}
      />
    </View>
  );
}
