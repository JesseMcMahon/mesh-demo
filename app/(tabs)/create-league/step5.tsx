import { useState } from "react";
import { Text, View, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TopNavigation } from "@/components/TopNavigation";
import { MeshButton } from "@/components/MeshButton";
import { PageHeaderText } from "@/components/PageHeaderText";
import { PageSubText } from "@/components/PageSubText";
import { ProTip } from "@/components/ProTip";
import { LocationAutocompleteField } from "@/components/LocationAutocompleteField";
import { useCreateLeague } from "@/contexts/create-league";
import { useUserProfile } from "@/contexts/user-profile";
import { useNotification } from "@/contexts/notification";
import { useCommunityTypes } from "@/hooks/useCommunityTypes";
import { leagueApi, StructuredLocationPayload } from "@/lib/api";
import { MY_LEAGUES_QUERY_KEY } from "@/app/(tabs)/index";
import { SURFACE, BRAND, BORDER } from "@/constants/colors";
import { dismissFlowAndBackOrReplace } from "@/lib/navigation";

function requiresStreetAddressByType(typeName: string) {
  const normalized = String(typeName || "").toLowerCase();
  return (
    normalized.includes("customer") ||
    normalized.includes("engagement") ||
    normalized.includes("bar") ||
    normalized.includes("restaurant")
  );
}

function buildManualCityStatePayload(cityState: string): StructuredLocationPayload | null {
  const cleaned = String(cityState || "").trim();
  if (!cleaned.includes(",")) return null;
  const parts = cleaned
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  const city = parts[0];
  const stateCode = parts[1].slice(0, 2).toUpperCase();
  if (!city || !stateCode) return null;
  return {
    scope: "local",
    captureMode: "city_state",
    source: "manual",
    city,
    stateCode,
    countryCode: "US",
    formattedAddress: `${city}, ${stateCode}`,
  };
}

function deriveDisplayStateCode(location: StructuredLocationPayload): string {
  const normalized = String(location.stateCode || "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(normalized)) return normalized;
  const fallback = String(location.formattedAddress || "").match(
    /(?:,\s*|\s)([A-Z]{2})(?:\b|,)/
  );
  return fallback?.[1]?.toUpperCase() || normalized;
}

function inferStateCodeFromText(value: string): string {
  const input = String(value || "").trim();
  if (!input) return "";
  const leadingMatch = input.match(/^([A-Z]{2})(?:\b|,|\s)/i);
  if (leadingMatch?.[1]) return leadingMatch[1].toUpperCase();
  const delimitedMatch = input.match(/(?:,\s*|\s)([A-Z]{2})(?:\b|,)/i);
  if (delimitedMatch?.[1]) return delimitedMatch[1].toUpperCase();
  return "";
}

export default function CreateLeagueStep5() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    data,
    setLocationType,
    setCityState,
    setCity,
    setState,
    setZip,
    setStreetAddress,
    setLocationPayload,
    clearLocationPayload,
    resetData,
  } = useCreateLeague();
  const { user, accessToken } = useUserProfile();
  const { showNotification } = useNotification();
  const { data: communityTypes } = useCommunityTypes();
  const [isLoading, setIsLoading] = useState(false);
  const [lastResolvedLocation, setLastResolvedLocation] =
    useState<StructuredLocationPayload | null>(
      (data.locationPayload as StructuredLocationPayload | null) || null
    );

  const selectedCommunityType = communityTypes?.find(
    (type) => (type._id || type.id || type.type) === data.communityType
  );
  const selectedCommunityTypeName = String(selectedCommunityType?.type || "");
  const requiresStreetAddress = requiresStreetAddressByType(selectedCommunityTypeName);
  const locationMode = requiresStreetAddress ? "street" : "city_state";

  const handleCancel = () => {
    resetData();
    dismissFlowAndBackOrReplace(router, "/(tabs)" as any);
  };

  const handleLocalSelect = () => {
    setLocationType("local");
  };

  const handleNationwideSelect = () => {
    setLocationType("nationwide");
  };

  const handleCreateLeague = async () => {
    if (!user?.id) {
      showNotification("You must be logged in to create a league", "error");
      return;
    }

    if (!data.locationType) {
      showNotification("Please select local or nationwide", "error");
      return;
    }

    let effectiveLocalPayload =
      (lastResolvedLocation as StructuredLocationPayload | null) ||
      (data.locationPayload as StructuredLocationPayload | null);

    if (data.locationType === "local") {
      if (!effectiveLocalPayload && !requiresStreetAddress) {
        const manualPayload = buildManualCityStatePayload(data.cityState);
        if (manualPayload) {
          effectiveLocalPayload = manualPayload;
          setLocationPayload(manualPayload as any);
          setLastResolvedLocation(manualPayload);
          setCity(String(manualPayload.city || ""));
          setState(String(manualPayload.stateCode || ""));
        }
      }

      if (effectiveLocalPayload && !requiresStreetAddress) {
        const currentStateCode = String(effectiveLocalPayload.stateCode || "")
          .trim()
          .toUpperCase();
        if (!/^[A-Z]{2}$/.test(currentStateCode)) {
          const parsedStateCode = inferStateCodeFromText(
            data.cityState || String(effectiveLocalPayload.formattedAddress || "")
          );
          if (parsedStateCode) {
            const patchedPayload = {
              ...effectiveLocalPayload,
              stateCode: parsedStateCode,
            };
            effectiveLocalPayload = patchedPayload;
            setLocationPayload(patchedPayload as any);
            setLastResolvedLocation(patchedPayload);
            setState(parsedStateCode);
          }
        }
      }

      if (!effectiveLocalPayload) {
        showNotification(
          requiresStreetAddress
            ? "Please tap an exact street suggestion to continue"
            : "Please tap a city and state suggestion to continue",
          "error"
        );
        return;
      }

      if (
        !requiresStreetAddress &&
        !/^[A-Z]{2}$/.test(
          String(effectiveLocalPayload.stateCode || "").trim().toUpperCase()
        )
      ) {
        showNotification("Please select a city and state suggestion", "error");
        return;
      }

      if (
        requiresStreetAddress &&
        effectiveLocalPayload.captureMode !== "street"
      ) {
        showNotification("This league type requires a street address", "error");
        return;
      }

      if (
        !requiresStreetAddress &&
        effectiveLocalPayload.captureMode !== "city_state"
      ) {
        showNotification("This league type only allows city and state", "error");
        return;
      }
    }

    if (
      data.joinability === "private" &&
      data.privatePasskey.trim().length < 4
    ) {
      showNotification("Private leagues require a passkey (min 4 chars)", "error");
      return;
    }

    const nationwideLocationPayload = {
      scope: "nationwide" as const,
      captureMode: "city_state" as const,
      source: "manual" as const,
      formattedAddress: "Nationwide",
      countryCode: "US",
    };

    const resolvedLocationPayload: StructuredLocationPayload =
      data.locationType === "nationwide"
        ? nationwideLocationPayload
        : (effectiveLocalPayload as StructuredLocationPayload);

    const address =
      data.locationType === "nationwide"
        ? "Nationwide"
        : data.cityState || effectiveLocalPayload?.formattedAddress || "";

    const payload = {
      name: data.leagueName,
      imageUrl: String(data.leagueImageUrl || "").trim(),
      description: "",
      address,
      locationPayload: resolvedLocationPayload,
      leagueSize: data.leagueSize,
      communityType: data.communityType,
      isPublic: data.joinability === "public",
      privatePasskey:
        data.joinability === "private" ? data.privatePasskey.trim() : undefined,
      leagueType: data.leagueType,
      waiverSettings: {
        type: data.waiverType,
        budgetDefault: Math.max(0, Number(data.faabBudgetDefault || 100)),
      },
      creator: user.id,
    };

    setIsLoading(true);

    try {
      const response = await leagueApi.create(payload, accessToken);
      const result = response?.data || response;
      const league = result?.league;
      const season = result?.season;

      const seasonId =
        season?._id ||
        season?.id ||
        (typeof season === "string" ? season : null);
      if (seasonId) {
        try {
          await AsyncStorage.setItem("currentSeasonId", seasonId);
        } catch {
          // no-op
        }
      }

      queryClient.invalidateQueries({ queryKey: MY_LEAGUES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["search-leagues"] });
      queryClient.invalidateQueries({ queryKey: ["explore-leagues"] });

      resetData();
      const leagueId = league?._id || league?.id || result?._id || result?.id;
      if (leagueId) {
        router.dismissAll();
        router.replace(`/(tabs)/league/${leagueId}` as any);
      } else {
        dismissFlowAndBackOrReplace(router, "/(tabs)" as any);
      }
      showNotification("League created successfully!", "success");
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Failed to create league. Please try again.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE.background }}>
      <TopNavigation
        title="Create a League"
        showBackButton
        rightText={{ text: "Cancel", onPress: handleCancel }}
      />

      <ScrollView
        className="flex-1 px-6"
        style={{ backgroundColor: SURFACE.background }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingVertical: 20, flexGrow: 1 }}
      >
        <View className="flex-1 justify-between">
          <View>
            <PageHeaderText>Select Location</PageHeaderText>

            <PageSubText>
              {requiresStreetAddress
                ? "This community type requires an exact street address for local leagues."
                : "For local leagues, choose a city and state. For nationwide, no local target is required."}
            </PageSubText>

            <View className="mb-6">
              <Text className="text-white text-sm font-semibold mb-3">
                League Location
              </Text>

              <View
                className="rounded-xl border-2 mb-4 p-4"
                style={{
                  borderColor:
                    data.locationType === "local" ? BRAND.primary : BORDER.medium,
                  backgroundColor:
                    data.locationType === "local"
                      ? `${BRAND.primary}33`
                      : "transparent",
                }}
              >
                <TouchableOpacity
                  onPress={handleLocalSelect}
                  activeOpacity={0.85}
                  className="flex-row items-center justify-between mb-2"
                >
                  <Text className="text-white text-sm font-semibold">
                    {requiresStreetAddress ? "Exact Street Address" : "City, State"}
                  </Text>
                  <View
                    className="rounded-full border-2"
                    style={{
                      width: 20,
                      height: 20,
                      borderColor:
                        data.locationType === "local" ? BRAND.primary : BORDER.medium,
                      backgroundColor:
                        data.locationType === "local" ? BRAND.primary : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {data.locationType === "local" ? (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: "#FFFFFF",
                        }}
                      />
                    ) : null}
                  </View>
                </TouchableOpacity>
                <LocationAutocompleteField
                  mode={locationMode}
                  accessToken={accessToken}
                  value={data.cityState}
                  onValueChange={(nextValue) => {
                    setCityState(nextValue);
                    setLastResolvedLocation(null);
                    handleLocalSelect();
                  }}
                  onLocationCleared={() => {
                    clearLocationPayload();
                    setLastResolvedLocation(null);
                  }}
                  onLocationResolved={(location) => {
                    const city = String(location.city || "").trim();
                    const stateCode =
                      deriveDisplayStateCode(location) ||
                      inferStateCodeFromText(
                        String(location.formattedAddress || "")
                      );
                    const label =
                      locationMode === "street"
                        ? String(location.formattedAddress || "").trim() ||
                          [
                            String(location.street1 || "").trim(),
                            city,
                            stateCode,
                          ]
                            .filter(Boolean)
                            .join(", ")
                        : [city, stateCode].filter(Boolean).join(", ");

                    const localPayload = {
                      ...location,
                      scope: "local" as const,
                      captureMode: locationMode,
                      stateCode: stateCode || location.stateCode || "",
                    } as StructuredLocationPayload;

                    setCityState(label);
                    setCity(city);
                    setState(stateCode);
                    setZip(String(location.postalCode || "").trim());
                    setStreetAddress(String(location.street1 || "").trim());
                    setLocationPayload(localPayload as any);
                    setLastResolvedLocation(localPayload);
                    handleLocalSelect();
                  }}
                  disabled={data.locationType === "nationwide"}
                />
              </View>

              <View className="flex-row items-center mb-4">
                <View className="flex-1 h-px bg-gray-700" />
                <Text className="px-4 text-gray-400 text-sm">or</Text>
                <View className="flex-1 h-px bg-gray-700" />
              </View>

              <TouchableOpacity
                onPress={handleNationwideSelect}
                className="rounded-xl border-2 p-4 flex-row items-center"
                style={{
                  borderColor:
                    data.locationType === "nationwide"
                      ? BRAND.primary
                      : BORDER.medium,
                  backgroundColor:
                    data.locationType === "nationwide"
                      ? `${BRAND.primary}33`
                      : "transparent",
                }}
              >
                <View className="mr-4">
                  <MaterialIcons name="flag" size={32} color={BRAND.gold} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-base mb-1">
                    Nationwide
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    Users from across the US can join this league.
                  </Text>
                </View>
                <View className="ml-2">
                  <View
                    className="rounded-full border-2"
                    style={{
                      width: 24,
                      height: 24,
                      borderColor:
                        data.locationType === "nationwide"
                          ? BRAND.primary
                          : BORDER.medium,
                      backgroundColor:
                        data.locationType === "nationwide"
                          ? BRAND.primary
                          : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {data.locationType === "nationwide" && (
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
            </View>

            <ProTip tipText="Local leagues enable targeted sponsor opportunities by market. Nationwide leagues remain broadly discoverable." />
          </View>

          <View className="mt-8">
            <MeshButton
              title="Create League"
              onPress={handleCreateLeague}
              variant="primary"
              loading={isLoading}
              disabled={isLoading}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
