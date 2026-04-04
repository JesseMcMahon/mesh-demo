import { useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { SURFACE, TEXT, BORDER, SEMANTIC, BRAND } from "@/constants/colors";
import { useAppTheme } from "@/contexts/theme";
import { useUserProfile } from "@/contexts/user-profile";
import { inviteApi, squadApi } from "@/lib/api";
import { useNotification } from "@/contexts/notification";
import { TopNavigation } from "@/components/TopNavigation";
import { MeshTextInput } from "@/components/MeshTextInput";
import { MeshButton } from "@/components/MeshButton";

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function normalizeId(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed;
}

export default function JoinSquadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string | string[];
    squadId?: string | string[];
    leagueId?: string | string[];
    squadName?: string | string[];
    isPublic?: string | string[];
  }>();

  const inviteCodeParam = firstParam(params.code);
  const directSquadId = normalizeId(firstParam(params.squadId));
  const directLeagueId = firstParam(params.leagueId);
  const directSquadName = firstParam(params.squadName);
  const directIsPublicParam = firstParam(params.isPublic);

  const isDirectJoin = !!directSquadId;

  const { colors } = useAppTheme();
  const { accessToken } = useUserProfile();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  const [inviteCode, setInviteCode] = useState(inviteCodeParam || "");
  const [password, setPassword] = useState("");

  const {
    data: inviteData,
    isLoading: isValidatingInvite,
    isError: isInviteError,
    error: inviteError,
  } = useQuery({
    queryKey: ["validate-squad-invite", inviteCode],
    queryFn: () => inviteApi.validateSquadInvite(inviteCode),
    enabled: !isDirectJoin && inviteCode.length >= 3,
    retry: false,
  });

  const {
    data: directSquadData,
    isLoading: isLoadingDirectSquad,
    isError: isDirectSquadError,
  } = useQuery({
    queryKey: ["squad-details", directSquadId, accessToken],
    queryFn: () => squadApi.getDetails(directSquadId, accessToken),
    enabled: isDirectJoin && !!directSquadId,
    retry: false,
  });

  const squadInfo = useMemo(() => {
    if (isDirectJoin) {
      const directSquad = (directSquadData as any)?.data?.squad;
      const isPublicFromParams = directIsPublicParam === "true";
      const isPublic = directSquad?.isPublic ?? isPublicFromParams;

      return {
        squad: {
          _id: directSquadId,
          name: directSquad?.name || directSquadName || "Squad",
          isPublic,
          requiresPassword: !isPublic,
        },
        league: {
          _id: directLeagueId || directSquad?.leagueId,
          id: directLeagueId || directSquad?.leagueId,
          name: directSquad?.leagueName || "League",
          communityType: null,
          userEligibility: null,
        },
      };
    }

    return (inviteData as any)?.data || null;
  }, [
    directIsPublicParam,
    directLeagueId,
    directSquadData,
    directSquadId,
    directSquadName,
    inviteData,
    isDirectJoin,
  ]);

  const requiresPassword = !!squadInfo?.squad?.requiresPassword;
  const isExpired = (inviteError as any)?.status === 410;

  const isLoadingInfo = isDirectJoin ? isLoadingDirectSquad : isValidatingInvite;
  const hasInfoError =
    isDirectJoin
      ? isDirectSquadError && !directSquadName
      : isInviteError;

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error("Authentication required");
      }

      if (isDirectJoin) {
        const payload: { squadId: string; password?: string } = {
          squadId: directSquadId,
        };
        if (requiresPassword && password.trim()) {
          payload.password = password.trim();
        }
        return squadApi.join(payload, accessToken);
      }

      const payload: { code: string; password?: string } = {
        code: inviteCode.trim(),
      };
      if (requiresPassword && password.trim()) {
        payload.password = password.trim();
      }
      return inviteApi.joinSquadViaInvite(payload, accessToken);
    },
    onSuccess: async (result) => {
      showNotification("Successfully joined the squad!", "success");

      const leagueId =
        directLeagueId ||
        (result as any)?.data?.leagueId ||
        squadInfo?.league?._id ||
        squadInfo?.league?.id;

      if (leagueId && accessToken) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["league-user-profile", leagueId, accessToken],
          }),
          queryClient.invalidateQueries({
            queryKey: ["league-squads", leagueId, accessToken],
          }),
          queryClient.invalidateQueries({ queryKey: ["my-leagues"] }),
        ]);
      }

      if (leagueId) {
        router.replace(`/(tabs)/league/${leagueId}` as any);
      } else {
        router.replace("/(tabs)" as any);
      }
    },
    onError: (error: Error & { status?: number }) => {
      let message = error.message || "Failed to join squad";

      if (error.status === 410) {
        message = "This invite has expired or been revoked.";
      } else if (error.status === 401) {
        message = "Incorrect password. Please try again.";
      } else if (error.status === 403) {
        message = "You are not eligible for this league.";
      } else if (error.status === 400 && /password/i.test(error.message || "")) {
        message = "This private squad requires a password.";
      } else if (error.status === 400) {
        message = "You may already be in a squad in this league, or the squad is full.";
      }

      showNotification(message, "error");
    },
  });

  const handleJoin = () => {
    if (isDirectJoin) {
      if (!directSquadId) {
        showNotification("Squad ID is missing", "error");
        return;
      }
    } else if (!inviteCode.trim()) {
      showNotification("Please enter an invite code", "error");
      return;
    }

    if (requiresPassword && !password.trim()) {
      showNotification("This squad requires a password", "error");
      return;
    }

    joinMutation.mutate();
  };

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE.background }}>
      <TopNavigation title="Join Squad" showBackButton />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {!isDirectJoin && !inviteCodeParam && (
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{ color: TEXT.secondary, fontSize: 14, marginBottom: 12 }}
            >
              Enter the squad invite code shared with you.
            </Text>
            <MeshTextInput
              startIcon={{ name: "vpn-key" }}
              placeholder="Enter invite code"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        )}

        {isLoadingInfo && (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={{ color: TEXT.secondary, fontSize: 14, marginTop: 12 }}
            >
              {isDirectJoin ? "Loading squad..." : "Validating invite..."}
            </Text>
          </View>
        )}

        {hasInfoError && (
          <View className="items-center py-12">
            <MaterialIcons name="link-off" size={56} color={TEXT.tertiary} />
            <Text
              style={{
                color: "#FFF",
                fontSize: 20,
                fontWeight: "700",
                marginTop: 16,
              }}
            >
              {isDirectJoin
                ? "Squad Unavailable"
                : isExpired
                  ? "Invite Expired"
                  : "Invalid Invite"}
            </Text>
            <Text
              style={{
                color: TEXT.secondary,
                fontSize: 15,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              {isDirectJoin
                ? "We couldn't load this squad right now. Please try again."
                : isExpired
                  ? "This invite link has expired. Ask the squad leader for a new one."
                  : "This invite code is not valid. Double-check and try again."}
            </Text>
          </View>
        )}

        {squadInfo && !hasInfoError && (
          <View>
            <View
              style={{
                backgroundColor: SURFACE.card,
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: BORDER.default,
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name="shield" size={28} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: "#FFF", fontSize: 20, fontWeight: "700" }}
                    numberOfLines={1}
                  >
                    {squadInfo.squad?.name || "Squad"}
                  </Text>
                  <Text
                    style={{
                      color: TEXT.secondary,
                      fontSize: 14,
                      marginTop: 2,
                    }}
                  >
                    {squadInfo.squad?.isPublic ? "Public" : "Private"} Squad
                  </Text>
                </View>
              </View>

              {squadInfo.league?.name && (
                <View
                  style={{
                    backgroundColor: SURFACE.elevated,
                    borderRadius: 12,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <MaterialIcons
                    name="emoji-events"
                    size={20}
                    color={BRAND.gold}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#FFF",
                        fontSize: 15,
                        fontWeight: "600",
                      }}
                    >
                      {squadInfo.league.name}
                    </Text>
                    {!isDirectJoin && squadInfo.league.communityType && (
                      <Text style={{ color: TEXT.secondary, fontSize: 13 }}>
                        {squadInfo.league.communityType}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {!isDirectJoin && squadInfo.league?.userEligibility === "21+" && (
                <View
                  style={{
                    backgroundColor: `${SEMANTIC.warning}15`,
                    borderRadius: 10,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  <MaterialIcons
                    name="warning"
                    size={20}
                    color={SEMANTIC.warning}
                  />
                  <Text
                    style={{ color: SEMANTIC.warning, fontSize: 13, flex: 1 }}
                  >
                    This league requires members to be 21 or older.
                  </Text>
                </View>
              )}
            </View>

            {requiresPassword && (
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
                    marginBottom: 12,
                  }}
                >
                  This is a private squad. Enter the password provided by the
                  head coach.
                </Text>
                <MeshTextInput
                  startIcon={{ name: "lock" }}
                  placeholder="Enter squad password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            )}

            <MeshButton
              title="Join Squad"
              onPress={handleJoin}
              loading={joinMutation.isPending}
              disabled={joinMutation.isPending || (requiresPassword && !password.trim())}
            />

            {joinMutation.isError && (
              <Text
                style={{
                  color: SEMANTIC.error,
                  fontSize: 14,
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                {(joinMutation.error as Error)?.message || "Failed to join squad"}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
