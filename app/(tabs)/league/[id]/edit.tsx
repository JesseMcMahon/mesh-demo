import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image as ExpoImage } from "expo-image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TopNavigation } from "@/components/TopNavigation";
import { MeshButton } from "@/components/MeshButton";
import { MeshTextInput } from "@/components/MeshTextInput";
import { LocationAutocompleteField } from "@/components/LocationAutocompleteField";
import { SettingsSection } from "@/components/SettingsSection";
import { useUserProfile } from "@/contexts/user-profile";
import { useNotification } from "@/contexts/notification";
import { useCommunityTypes, CommunityType } from "@/hooks/useCommunityTypes";
import { useEligibilityRestrictions } from "@/hooks/useEligibilityRestrictions";
import { leagueApi } from "@/lib/api";
import { backOrReplace } from "@/lib/navigation";
import { getCommunityTypeConfig } from "@/constants/communityTypes";
import { BRAND, SURFACE, TEXT, BORDER, SEMANTIC, ACCENT } from "@/constants/colors";

const LEAGUE_SIZES = [6, 8, 10, 12, 14, 16];
const MAX_DESCRIPTION_LENGTH = 100;

function requiresStreetAddressByType(typeName: string) {
  const normalized = String(typeName || "").toLowerCase();
  return (
    normalized.includes("customer") ||
    normalized.includes("engagement") ||
    normalized.includes("bar") ||
    normalized.includes("restaurant")
  );
}

const US_STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

function deriveDisplayStateCode(location: any): string {
  const normalized = String(location?.stateCode || "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(normalized)) return normalized;
  const candidates = [
    String(location?.formattedAddress || ""),
    String(location?.stateName || ""),
  ];
  for (const candidate of candidates) {
    const input = candidate.trim();
    if (!input) continue;
    const leadingMatch = input.match(/^([A-Z]{2})(?:\b|,|\s)/i);
    if (leadingMatch?.[1]) return leadingMatch[1].toUpperCase();
    const delimitedMatch = input.match(/(?:,\s*|\s)([A-Z]{2})(?:\b|,)/i);
    if (delimitedMatch?.[1]) return delimitedMatch[1].toUpperCase();
    const lowered = input.toLowerCase();
    for (const [stateName, stateCode] of Object.entries(US_STATE_NAME_TO_CODE)) {
      if (lowered.includes(stateName)) return stateCode;
    }
  }
  return normalized;
}

function parseCityStateText(input: string): { city: string; stateCode: string | null } {
  const raw = String(input || "").trim();
  if (!raw) return { city: "", stateCode: null };
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const city = parts[0];
    const stateToken = parts[1];
    const upperState = stateToken.toUpperCase();
    if (/^[A-Z]{2}$/.test(upperState)) {
      return { city, stateCode: upperState };
    }
    const mapped = US_STATE_NAME_TO_CODE[stateToken.toLowerCase()] || null;
    return { city, stateCode: mapped };
  }
  const trailingState = raw.match(/(.+?)\s+([A-Za-z]{2})$/);
  if (trailingState?.[1] && trailingState?.[2]) {
    return {
      city: trailingState[1].trim(),
      stateCode: trailingState[2].trim().toUpperCase(),
    };
  }
  return { city: raw, stateCode: null };
}

interface SelectableCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  isSelected: boolean;
  onPress: () => void;
  compact?: boolean;
  disabled?: boolean;
}

const SelectableCard = React.memo(function SelectableCard({
  title,
  subtitle,
  description,
  icon,
  iconColor,
  isSelected,
  onPress,
  compact = false,
  disabled = false,
}: SelectableCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.selectableCard,
        compact && styles.selectableCardCompact,
        isSelected && styles.selectableCardSelected,
        disabled && styles.selectableCardDisabled,
      ]}
      activeOpacity={0.7}
    >
      <View style={[styles.selectableIconContainer, { backgroundColor: `${iconColor}20` }]}>
        <MaterialIcons name={icon} size={compact ? 24 : 28} color={iconColor} />
      </View>
      <View style={styles.selectableContent}>
        <Text style={styles.selectableTitle}>{title}</Text>
        {subtitle && <Text style={styles.selectableSubtitle}>{subtitle}</Text>}
        {description && !compact && (
          <Text style={styles.selectableDescription}>{description}</Text>
        )}
      </View>
      <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
        {isSelected && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
});

interface CommunityTypeCardProps {
  communityType: CommunityType;
  isSelected: boolean;
  onPress: () => void;
}

const CommunityTypeCard = React.memo(function CommunityTypeCard({
  communityType,
  isSelected,
  onPress,
}: CommunityTypeCardProps) {
  const config = getCommunityTypeConfig(communityType.type);

  return (
    <SelectableCard
      title={communityType.type}
      subtitle={communityType.description}
      icon={config.icon}
      iconColor={config.color}
      isSelected={isSelected}
      onPress={onPress}
      compact
    />
  );
});

export default function EditLeagueScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const leagueId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { accessToken, user } = useUserProfile();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  const { data: communityTypes, isLoading: isLoadingCommunityTypes } =
    useCommunityTypes();
  const { data: eligibilityRestrictions, isLoading: isLoadingEligibility } =
    useEligibilityRestrictions();
  const showSimulationTools = true;

  // Loading states
  const [isLoadingLeague, setIsLoadingLeague] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showEligibilityDropdown, setShowEligibilityDropdown] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [leagueImageUrl, setLeagueImageUrl] = useState("");
  const [isUploadingLeagueImage, setIsUploadingLeagueImage] = useState(false);
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [locationType, setLocationType] = useState<"local" | "nationwide">("local");
  const [locationPayload, setLocationPayload] = useState<any | null>(null);
  const [leagueSize, setLeagueSize] = useState<number | null>(null);
  const [maxSquadSize, setMaxSquadSize] = useState<string>("");
  const [communityType, setCommunityType] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [leagueType, setLeagueType] = useState<"squad" | "solo">("squad");
  const [waiverType, setWaiverType] = useState<"faab" | "reverse_standings">("reverse_standings");
  const [waiverBudgetDefault, setWaiverBudgetDefault] = useState("100");
  const [waiverSettingsLocked, setWaiverSettingsLocked] = useState(false);
  const [privatePasskey, setPrivatePasskey] = useState("");
  const [hasPrivatePasskey, setHasPrivatePasskey] = useState(false);
  const [showPrivatePasskey, setShowPrivatePasskey] = useState(false);
  const [userEligibility, setUserEligibility] = useState<string | null>(null);
  const [cachedLocalAddress, setCachedLocalAddress] = useState("");
  const [cachedLocalLocationPayload, setCachedLocalLocationPayload] = useState<any | null>(
    null
  );
  const leagueTypeLocked = true;
  const currentUserId = String((user as any)?.id || (user as any)?._id || "");

  const {
    data: commissionerMembersData,
    isLoading: isLoadingCommissionerMembers,
    refetch: refetchCommissionerMembers,
  } = useQuery({
    queryKey: ["commissioner-members", leagueId, accessToken],
    enabled: !!leagueId && !!accessToken,
    queryFn: () => leagueApi.getCommissionerMembers(String(leagueId), accessToken),
    staleTime: 20_000,
  });
  const commissionerMembers = Array.isArray((commissionerMembersData as any)?.members)
    ? ((commissionerMembersData as any).members as any[])
    : [];

  const removeMemberMutation = useMutation({
    mutationFn: async (memberUserId: string) =>
      leagueApi.removeLeagueMemberByCommissioner(
        { leagueId: String(leagueId), memberUserId },
        accessToken
      ),
    onSuccess: async () => {
      showNotification("Member removed from league", "success");
      await Promise.all([
        refetchCommissionerMembers(),
        queryClient.invalidateQueries({ queryKey: ["league-details"] }),
        queryClient.invalidateQueries({ queryKey: ["league-squads"] }),
      ]);
    },
    onError: (error: any) => {
      showNotification(error?.message || "Failed to remove member", "error");
    },
  });

  const transferCommissionerMutation = useMutation({
    mutationFn: async (newCommissionerUserId: string) =>
      leagueApi.transferLeagueCommissioner(
        { leagueId: String(leagueId), newCommissionerUserId },
        accessToken
      ),
    onSuccess: async () => {
      showNotification("Commissioner role transferred", "success");
      await Promise.all([
        refetchCommissionerMembers(),
        queryClient.invalidateQueries({ queryKey: ["league-details"] }),
      ]);
    },
    onError: (error: any) => {
      showNotification(
        error?.message || "Failed to transfer commissioner role",
        "error"
      );
    },
  });

  const selectedCommunityTypeName = useMemo(() => {
    if (!communityType || !communityTypes?.length) return "";
    const selected = communityTypes.find(
      (type) => (type._id || type.id || type.type) === communityType
    );
    return String(selected?.type || "");
  }, [communityTypes, communityType]);

  const requiresStreetAddress = requiresStreetAddressByType(
    selectedCommunityTypeName
  );
  const locationMode: "street" | "city_state" = requiresStreetAddress
    ? "street"
    : "city_state";

  // Load league data
  useEffect(() => {
    const loadLeagueData = async () => {
      if (!leagueId || !accessToken) return;

      try {
        setIsLoadingLeague(true);
        const [response, draftSettingsResponse] = await Promise.all([
          leagueApi.getDetails(leagueId, accessToken),
          leagueApi.getDraftSettings({ leagueId }, accessToken).catch(() => null),
        ]);
        const league = response?.data || response;
        const draftSettings = (draftSettingsResponse as any)?.draftSettings || draftSettingsResponse;

        if (league) {
          setName(league.name || "");
          setLeagueImageUrl(String(league.imageUrl || league.leagueImageUrl || ""));
          setDescription(league.description || "");
          setAddress(league.address || "");
          const leagueLocation = league?.location || null;
          setLocationPayload(leagueLocation);
          setLocationType(
            String(leagueLocation?.scope || "").toLowerCase() === "nationwide"
              ? "nationwide"
              : "local"
          );
          setLeagueSize(league.leagueSize || null);
          setMaxSquadSize(league.maxSquadSize ? String(league.maxSquadSize) : "");

          const communityTypeValue =
            typeof league.communityType === "string"
              ? league.communityType
              : league.communityType?._id ||
                league.communityType?.id ||
                league.communityType?.type ||
                null;
          setCommunityType(communityTypeValue);
          setIsPublic(league.isPublic ?? true);
          setLeagueType(league.leagueType === "solo" ? "solo" : "squad");
          const waiverTypeFromLeague =
            league?.waiverConfig?.type ||
            league?.waiverSettings?.type ||
            league?.waiverSettings?.model ||
            "reverse_standings";
          setWaiverType(waiverTypeFromLeague === "faab" ? "faab" : "reverse_standings");
          setWaiverBudgetDefault(
            String(
              Number(
                league?.waiverConfig?.budgetDefault ??
                league?.waiverSettings?.budgetDefault ??
                100
              )
            )
          );
          setHasPrivatePasskey(Boolean(league.hasPrivatePasskey));
          setPrivatePasskey("");
          setShowPrivatePasskey(false);
          setWaiverSettingsLocked(
            String(draftSettings?.status || "").toLowerCase() === "in_progress" ||
            String(draftSettings?.status || "").toLowerCase() === "completed"
          );
          if (
            String(leagueLocation?.scope || "").toLowerCase() !== "nationwide" &&
            (league.address || leagueLocation)
          ) {
            setCachedLocalAddress(league.address || "");
            setCachedLocalLocationPayload(leagueLocation || null);
          }

          let eligibilityValue =
            typeof league.userEligibility === "string"
              ? league.userEligibility
              : league.userEligibility?._id || league.userEligibility?.id || null;

          if (!eligibilityValue && eligibilityRestrictions) {
            const noneOption = eligibilityRestrictions.find(
              (r) => r.name.toLowerCase() === "none"
            );
            eligibilityValue = noneOption?._id || null;
          }

          setUserEligibility(eligibilityValue);
        }
      } catch (error) {
        showNotification("Failed to load league data", "error");
      } finally {
        setIsLoadingLeague(false);
      }
    };

    loadLeagueData();
  }, [leagueId, accessToken, showNotification, eligibilityRestrictions]);

  useEffect(() => {
    if (locationType !== "local") return;
    if (!locationPayload?.captureMode) return;
    if (locationPayload.captureMode === locationMode) return;

    setLocationPayload(null);
    setAddress("");
  }, [locationMode, locationPayload, locationType]);

  const uploadLeagueImageFromAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      if (!accessToken || !leagueId) {
        showNotification("You must be logged in to upload an image.", "error");
        return;
      }

      try {
        setIsUploadingLeagueImage(true);
        const result = await leagueApi.uploadImage(
          {
            uri: asset.uri,
            name: asset.fileName || `league-${Date.now()}.jpg`,
            type: asset.mimeType || "image/jpeg",
            leagueId,
          },
          accessToken
        );
        const payload = result?.data || result;
        const uploadedUrl = String(payload?.imageUrl || "").trim();
        if (!uploadedUrl) {
          throw new Error("Image upload failed");
        }
        setLeagueImageUrl(uploadedUrl);
        showNotification("League image uploaded.", "success");
      } catch (error: any) {
        showNotification(
          error?.message || "Could not upload league image.",
          "error"
        );
      } finally {
        setIsUploadingLeagueImage(false);
      }
    },
    [accessToken, leagueId, showNotification]
  );

  const handlePickLeagueImageFromLibrary = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showNotification("Photo library permission is required.", "error");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.length) return;
    await uploadLeagueImageFromAsset(result.assets[0]);
  }, [showNotification, uploadLeagueImageFromAsset]);

  const handleTakeLeagueImagePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showNotification("Camera permission is required.", "error");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.length) return;
    await uploadLeagueImageFromAsset(result.assets[0]);
  }, [showNotification, uploadLeagueImageFromAsset]);

  const handleCommissionerRemoveMember = useCallback(
    (member: any) => {
      const memberUserId = String(member?.userId || "");
      if (!memberUserId) return;
      const memberName = String(member?.name || member?.username || "this member");
      Alert.alert(
        "Remove Member",
        `Remove ${memberName} from the league?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => removeMemberMutation.mutate(memberUserId),
          },
        ]
      );
    },
    [removeMemberMutation]
  );

  const handleTransferCommissionerRole = useCallback(
    (member: any) => {
      const memberUserId = String(member?.userId || "");
      if (!memberUserId) return;
      const memberName = String(member?.name || member?.username || "this member");
      Alert.alert(
        "Transfer Commissioner",
        `Transfer commissioner role to ${memberName}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Transfer",
            onPress: () => transferCommissionerMutation.mutate(memberUserId),
          },
        ]
      );
    },
    [transferCommissionerMutation]
  );

  const handleSave = useCallback(async () => {
    if (!leagueId || !accessToken) return;

    if (!name.trim()) {
      showNotification("League name is required", "error");
      return;
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      showNotification(
        `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`,
        "error"
      );
      return;
    }

    if (!waiverSettingsLocked && waiverType === "faab") {
      const parsedBudget = Number(waiverBudgetDefault || 0);
      if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
        showNotification("FAAB budget must be 0 or greater", "error");
        return;
      }
    }

    let normalizedLocationPayload = locationPayload;
    if (
      locationType === "local" &&
      !normalizedLocationPayload &&
      !requiresStreetAddress
    ) {
      const parsed = parseCityStateText(address);
      if (parsed.city && parsed.stateCode) {
        normalizedLocationPayload = {
          scope: "local",
          captureMode: "city_state",
          source: "manual",
          city: parsed.city,
          stateCode: parsed.stateCode,
          countryCode: "US",
          formattedAddress: `${parsed.city}, ${parsed.stateCode}`,
        } as any;
      }
    }

    if (locationType === "local") {
      if (!normalizedLocationPayload) {
        showNotification(
          requiresStreetAddress
            ? "Please select a valid street address"
            : "Please select a valid city and state",
          "error"
        );
        return;
      }
      if (
        requiresStreetAddress &&
        String((normalizedLocationPayload as any)?.captureMode || "") !== "street"
      ) {
        showNotification("This community type requires a street address", "error");
        return;
      }
      if (
        !requiresStreetAddress &&
        String((normalizedLocationPayload as any)?.captureMode || "") !== "city_state"
      ) {
        showNotification("This community type only allows city/state", "error");
        return;
      }
    }

    setIsSaving(true);

    try {
      const updateData: any = { name: name.trim() };
      updateData.imageUrl = String(leagueImageUrl || "").trim();

      if (description.trim()) updateData.description = description.trim();
      if (leagueSize !== null) updateData.leagueSize = leagueSize;
      if (leagueType === "solo") {
        updateData.maxSquadSize = 1;
      } else if (maxSquadSize && !isNaN(parseInt(maxSquadSize, 10))) {
        updateData.maxSquadSize = parseInt(maxSquadSize, 10);
      }

      if (locationType === "nationwide") {
        updateData.address = "Nationwide";
        updateData.locationPayload = {
          scope: "nationwide",
          captureMode: "city_state",
          source: "manual",
          formattedAddress: "Nationwide",
          countryCode: "US",
        };
      } else if (normalizedLocationPayload) {
        const fallbackAddress =
          locationMode === "street"
            ? String((normalizedLocationPayload as any).formattedAddress || "").trim() || address.trim()
            : [
                String((normalizedLocationPayload as any).city || "").trim(),
                String((normalizedLocationPayload as any).stateCode || "").trim().toUpperCase(),
              ]
                .filter(Boolean)
                .join(", ");

        updateData.address = fallbackAddress || address.trim();
        updateData.locationPayload = {
          ...normalizedLocationPayload,
          scope: "local",
          captureMode: locationMode,
        };
      } else if (address.trim()) {
        updateData.address = address.trim();
      }
      if (communityType) updateData.communityType = communityType;
      updateData.isPublic = isPublic;
      updateData.leagueType = leagueType;
      if (!waiverSettingsLocked) {
        updateData.waiverSettings = {
          type: waiverType,
          budgetDefault: Math.max(0, Number(waiverBudgetDefault || 0)),
        };
      }

      if (!isPublic) {
        const trimmedPasskey = privatePasskey.trim();
        if (!trimmedPasskey && !hasPrivatePasskey) {
          showNotification("Private leagues require a passkey", "error");
          setIsSaving(false);
          return;
        }
        if (trimmedPasskey) {
          if (trimmedPasskey.length < 4) {
            showNotification("Passkey must be at least 4 characters", "error");
            setIsSaving(false);
            return;
          }
          updateData.privatePasskey = trimmedPasskey;
        }
      } else {
        updateData.privatePasskey = null;
      }

      if (userEligibility) {
        updateData.userEligibility = userEligibility;
      } else {
        const noneOption = eligibilityRestrictions?.find(
          (r) => r.name.toLowerCase() === "none"
        );
        updateData.userEligibility = noneOption?._id || null;
      }

      await leagueApi.update(leagueId, updateData, accessToken);

      await queryClient.invalidateQueries({
        queryKey: ["league-details", leagueId, accessToken],
      });
      await queryClient.invalidateQueries({ queryKey: ["my-leagues"] });

      showNotification("League updated successfully", "success");
      backOrReplace(router, `/(tabs)/league/${leagueId}` as any);
    } catch (error: any) {
      if (String(error?.code || "") === "WAIVER_SETTINGS_LOCKED_AFTER_DRAFT_START") {
        setWaiverSettingsLocked(true);
      }
      showNotification(
        error?.message || "Failed to update league. Please try again.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    leagueId,
    accessToken,
    name,
    leagueImageUrl,
    isUploadingLeagueImage,
    description,
    address,
    locationType,
    locationPayload,
    locationMode,
    requiresStreetAddress,
    leagueSize,
    maxSquadSize,
    communityType,
    isPublic,
    leagueType,
    waiverType,
    waiverBudgetDefault,
    waiverSettingsLocked,
    privatePasskey,
    hasPrivatePasskey,
    userEligibility,
    eligibilityRestrictions,
    queryClient,
    showNotification,
    router,
  ]);

  const handleBack = useCallback(() => {
    backOrReplace(router, `/(tabs)/league/${leagueId}` as any);
  }, [router, leagueId]);

  if (isLoadingLeague) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND.primary} />
        <Text style={styles.loadingText}>Loading league settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavigation
        title="League Settings"
        showBackButton
        onBackPress={handleBack}
        rightText={{
          text: "Save",
          onPress: handleSave,
          textStyle: styles.saveButton,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information Section */}
        <SettingsSection title="Basic Information" icon="info" showDivider>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>League Name</Text>
            <MeshTextInput
              placeholder="Enter league name..."
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <MeshTextInput
              placeholder="Tell others about your league..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            <Text style={styles.charCount}>
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>League Image</Text>
            <View style={styles.leagueImageCard}>
              <View style={styles.leagueImagePreviewWrap}>
                {leagueImageUrl ? (
                  <ExpoImage
                    source={{ uri: leagueImageUrl }}
                    style={styles.leagueImagePreview}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={styles.leagueImagePlaceholder}>
                    <MaterialIcons name="image" size={24} color={TEXT.secondary} />
                  </View>
                )}
              </View>

              <View style={styles.leagueImageActions}>
                <TouchableOpacity
                  onPress={handlePickLeagueImageFromLibrary}
                  disabled={isUploadingLeagueImage}
                  activeOpacity={0.8}
                  style={styles.leagueImageAction}
                >
                  <MaterialIcons name="photo-library" size={16} color={BRAND.primary} />
                  <Text style={styles.leagueImageActionText}>Choose from Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleTakeLeagueImagePhoto}
                  disabled={isUploadingLeagueImage}
                  activeOpacity={0.8}
                  style={styles.leagueImageAction}
                >
                  <MaterialIcons name="photo-camera" size={16} color={BRAND.primary} />
                  <Text style={styles.leagueImageActionText}>Take Photo</Text>
                </TouchableOpacity>
                {leagueImageUrl ? (
                  <TouchableOpacity
                    onPress={() => setLeagueImageUrl("")}
                    disabled={isUploadingLeagueImage}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.leagueImageRemoveText}>Remove Image</Text>
                  </TouchableOpacity>
                ) : null}
                {isUploadingLeagueImage ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ActivityIndicator size="small" color={BRAND.primary} />
                    <Text style={{ color: TEXT.secondary, fontSize: 12 }}>
                      Uploading image...
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <View style={styles.locationScopeRow}>
              <TouchableOpacity
                style={[
                  styles.locationScopeButton,
                  locationType === "local" && styles.locationScopeButtonSelected,
                ]}
                onPress={() => {
                  setLocationType("local");
                  setAddress(cachedLocalAddress || "");
                  setLocationPayload(cachedLocalLocationPayload || null);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.locationScopeButtonText,
                    locationType === "local" && styles.locationScopeButtonTextSelected,
                  ]}
                >
                  Local
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.locationScopeButton,
                  locationType === "nationwide" &&
                    styles.locationScopeButtonSelected,
                ]}
                onPress={() => {
                  if (locationType === "local") {
                    setCachedLocalAddress(address || "");
                    setCachedLocalLocationPayload(locationPayload || null);
                  }
                  setLocationType("nationwide");
                  setAddress("Nationwide");
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.locationScopeButtonText,
                    locationType === "nationwide" &&
                      styles.locationScopeButtonTextSelected,
                  ]}
                >
                  Nationwide
                </Text>
              </TouchableOpacity>
            </View>
            {locationType === "local" ? (
              <>
                <Text style={styles.locationRuleText}>
                  {requiresStreetAddress
                    ? "Exact street address required for this community type."
                    : "City and state only for this community type."}
                </Text>
                <LocationAutocompleteField
                  mode={locationMode}
                  accessToken={accessToken}
                  value={address}
                  onValueChange={setAddress}
                  onLocationCleared={() => setLocationPayload(null)}
                  onLocationResolved={(resolvedLocation) => {
                    const stateCode = deriveDisplayStateCode(resolvedLocation);
                    setLocationPayload({
                      ...resolvedLocation,
                      stateCode,
                      scope: "local",
                      captureMode: locationMode,
                    });
                    if (locationMode === "city_state") {
                      const city = String(resolvedLocation.city || "").trim();
                      setAddress([city, stateCode].filter(Boolean).join(", "));
                      return;
                    }
                    const fallbackStreetAddress = [
                      String(resolvedLocation.street1 || "").trim(),
                      String(resolvedLocation.city || "").trim(),
                      stateCode,
                    ]
                      .filter(Boolean)
                      .join(", ");
                    setAddress(
                      String(resolvedLocation.formattedAddress || "").trim() ||
                        fallbackStreetAddress
                    );
                  }}
                />
              </>
            ) : (
              <Text style={styles.locationRuleText}>
                Nationwide leagues are discoverable across the US.
              </Text>
            )}
          </View>
        </SettingsSection>

        {/* League Configuration Section */}
        <SettingsSection title="Configuration" icon="settings" showDivider>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>League Size</Text>
            <View style={styles.sizeGrid}>
              {LEAGUE_SIZES.map((size) => (
                <TouchableOpacity
                  key={size}
                  onPress={() => setLeagueSize(size)}
                  style={[
                    styles.sizeButton,
                    leagueSize === size && styles.sizeButtonSelected,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.sizeButtonText,
                      leagueSize === size && styles.sizeButtonTextSelected,
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>League Format</Text>
            <View style={styles.lockedBanner}>
              <MaterialIcons name="lock-outline" size={14} color={TEXT.secondary} />
              <Text style={styles.lockedBannerText}>
                League format is locked after league creation.
              </Text>
            </View>
            <View style={styles.optionsList}>
              <SelectableCard
                title="Squad"
                subtitle="Multiple members per team"
                icon="groups"
                iconColor={BRAND.primary}
                isSelected={leagueType === "squad"}
                onPress={() => {
                  if (leagueTypeLocked) return;
                  setLeagueType("squad");
                  if (maxSquadSize === "1") {
                    setMaxSquadSize("");
                  }
                }}
                compact
                disabled={leagueTypeLocked}
              />
              <SelectableCard
                title="Solo"
                subtitle="One owner per team"
                icon="person"
                iconColor={BRAND.gold}
                isSelected={leagueType === "solo"}
                onPress={() => {
                  if (leagueTypeLocked) return;
                  setLeagueType("solo");
                  setMaxSquadSize("1");
                }}
                compact
                disabled={leagueTypeLocked}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Waiver Type</Text>
            {waiverSettingsLocked ? (
              <View style={styles.lockedBanner}>
                <MaterialIcons name="lock-outline" size={14} color={TEXT.secondary} />
                <Text style={styles.lockedBannerText}>
                  Waiver settings are locked once the draft starts.
                </Text>
              </View>
            ) : null}
            <View style={styles.optionsList}>
              <SelectableCard
                title="Reverse Standings"
                subtitle="Default waiver order each week"
                icon="format-list-numbered"
                iconColor={BRAND.primary}
                isSelected={waiverType === "reverse_standings"}
                onPress={() => setWaiverType("reverse_standings")}
                compact
                disabled={waiverSettingsLocked}
              />
              <SelectableCard
                title="FAAB"
                subtitle="Blind bid claims"
                icon="attach-money"
                iconColor={BRAND.gold}
                isSelected={waiverType === "faab"}
                onPress={() => setWaiverType("faab")}
                compact
                disabled={waiverSettingsLocked}
              />
            </View>
          </View>

          {waiverType === "faab" ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>FAAB Budget</Text>
              <MeshTextInput
                placeholder="100"
                value={waiverBudgetDefault}
                onChangeText={setWaiverBudgetDefault}
                keyboardType="number-pad"
                editable={!waiverSettingsLocked}
              />
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Max Squad Size</Text>
            <MeshTextInput
              placeholder={leagueType === "solo" ? "1 (solo locked)" : "None (suggested)"}
              value={maxSquadSize}
              onChangeText={setMaxSquadSize}
              keyboardType="number-pad"
              editable={leagueType !== "solo"}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age Requirement</Text>
            <TouchableOpacity
              onPress={() => setShowEligibilityDropdown(true)}
              style={styles.dropdownButton}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dropdownText,
                  !userEligibility && styles.dropdownPlaceholder,
                ]}
              >
                {userEligibility
                  ? eligibilityRestrictions?.find((r) => r._id === userEligibility)?.name
                  : eligibilityRestrictions?.find((r) => r.name.toLowerCase() === "none")?.name || "None"}
              </Text>
              <MaterialIcons name="expand-more" size={24} color={TEXT.secondary} />
            </TouchableOpacity>
          </View>
        </SettingsSection>

        {/* Community Type Section */}
        <SettingsSection title="Community Type" icon="groups" showDivider>
          {isLoadingCommunityTypes ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="small" color={BRAND.primary} />
            </View>
          ) : (
            <View style={styles.optionsList}>
              {communityTypes?.map((type) => {
                const typeId = type._id || type.id || type.type;
                return (
                  <CommunityTypeCard
                    key={typeId}
                    communityType={type}
                    isSelected={communityType === typeId}
                    onPress={() => setCommunityType(typeId)}
                  />
                );
              })}
            </View>
          )}
        </SettingsSection>

        {/* Privacy Section */}
        <SettingsSection title="Privacy" icon="lock">
          <SelectableCard
            title="Public"
            subtitle="Open to everyone"
            description="Anyone can find and join your league through the app."
            icon="public"
            iconColor={BRAND.gold}
            isSelected={isPublic}
            onPress={() => setIsPublic(true)}
          />
          <SelectableCard
            title="Private"
            subtitle="Invite only"
            description="Users must be invited or request to join your league."
            icon="lock"
            iconColor="#FF9800"
            isSelected={!isPublic}
            onPress={() => setIsPublic(false)}
          />

          {!isPublic && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>League Passkey</Text>
              <MeshTextInput
                placeholder={
                  hasPrivatePasskey
                    ? "Enter new passkey to change"
                    : "Set passkey (4-64 characters)"
                }
                value={privatePasskey}
                onChangeText={setPrivatePasskey}
                secureTextEntry={!showPrivatePasskey}
                autoCapitalize="none"
                autoCorrect={false}
                endIcon={{
                  name: showPrivatePasskey ? "visibility" : "visibility-off",
                  onPress: () => setShowPrivatePasskey((prev) => !prev),
                }}
              />
              {hasPrivatePasskey && !privatePasskey.trim() ? (
                <Text style={styles.charCount}>Existing passkey will stay unchanged.</Text>
              ) : null}
            </View>
          )}
        </SettingsSection>

        <SettingsSection title="Commissioner Tools" icon="admin-panel-settings" showDivider>
          <Text style={styles.sectionHint}>
            Manage league members across all squads.
          </Text>
          {isLoadingCommissionerMembers ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="small" color={BRAND.primary} />
            </View>
          ) : (
            <View style={styles.commissionerList}>
              {commissionerMembers.map((member) => {
                const memberUserId = String(member?.userId || "");
                const isSelf = memberUserId === currentUserId;
                const isLeagueAdminRole = Array.isArray(member?.roles)
                  ? member.roles.includes("LeagueAdmin")
                  : false;
                return (
                  <View key={memberUserId || String(member?.membershipId)} style={styles.commissionerRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.commissionerName}>
                        {member?.name || member?.username || "Member"}
                        {isSelf ? " (You)" : ""}
                      </Text>
                      <Text style={styles.commissionerMeta}>
                        {member?.squadName || "No squad"} · {(member?.roles || []).join(", ") || "Member"}
                      </Text>
                    </View>
                    {!isSelf ? (
                      <View style={styles.commissionerActions}>
                        {!isLeagueAdminRole && (
                          <TouchableOpacity
                            style={styles.commissionerTransferBtn}
                            onPress={() => handleTransferCommissionerRole(member)}
                            disabled={transferCommissionerMutation.isPending}
                          >
                            <Text style={styles.commissionerTransferText}>Make Commish</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.commissionerRemoveBtn}
                          onPress={() => handleCommissionerRemoveMember(member)}
                          disabled={removeMemberMutation.isPending}
                        >
                          <Text style={styles.commissionerRemoveText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                );
              })}
              {commissionerMembers.length === 0 ? (
                <Text style={styles.commissionerEmpty}>No members found.</Text>
              ) : null}
            </View>
          )}
        </SettingsSection>

        {showSimulationTools && (
          <SettingsSection title="Simulation" icon="science" showDivider>
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/league/${leagueId}/simulation` as any)}
              style={styles.simulationCard}
              activeOpacity={0.8}
            >
              <View style={styles.simulationCardContent}>
                <View style={styles.simulationIconWrap}>
                  <MaterialIcons name="science" size={20} color={BRAND.gold} />
                </View>
                <View style={styles.simulationTextWrap}>
                  <Text style={styles.simulationTitle}>Open Simulation Console</Text>
                  <Text style={styles.simulationSubtitle}>
                    Run deterministic season replays (dev/admin only).
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={TEXT.secondary} />
              </View>
            </TouchableOpacity>
          </SettingsSection>
        )}

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <MeshButton
            title="Save Changes"
            onPress={handleSave}
            variant="primary"
            loading={isSaving}
            disabled={isSaving}
          />
        </View>
      </ScrollView>

      {/* Age Requirement Modal */}
      <Modal
        visible={showEligibilityDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEligibilityDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowEligibilityDropdown(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Age Requirement</Text>
              <TouchableOpacity
                onPress={() => setShowEligibilityDropdown(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={20} color={TEXT.secondary} />
              </TouchableOpacity>
            </View>

            {isLoadingEligibility ? (
              <View style={styles.loadingSection}>
                <ActivityIndicator size="small" color={BRAND.primary} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {eligibilityRestrictions?.map((restriction) => {
                  const noneOptionId = eligibilityRestrictions.find(
                    (r) => r.name.toLowerCase() === "none"
                  )?._id;
                  const isSelected =
                    userEligibility === restriction._id ||
                    (userEligibility === null && restriction._id === noneOptionId);

                  return (
                    <TouchableOpacity
                      key={restriction._id}
                      onPress={() => {
                        setUserEligibility(restriction._id);
                        setShowEligibilityDropdown(false);
                      }}
                      style={[
                        styles.modalOption,
                        isSelected && styles.modalOptionSelected,
                      ]}
                      activeOpacity={0.7}
                    >
                      <View style={styles.modalOptionContent}>
                        <Text style={styles.modalOptionTitle}>{restriction.name}</Text>
                        <Text style={styles.modalOptionDescription}>
                          {restriction.description}
                        </Text>
                      </View>
                      {isSelected && (
                        <MaterialIcons name="check-circle" size={24} color={BRAND.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE.background,
  },
  loadingText: {
    color: TEXT.secondary,
    fontSize: 14,
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  saveButton: {
    color: BRAND.primary,
    fontWeight: "700",
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  charCount: {
    color: "#606368",
    fontSize: 12,
    textAlign: "right",
    marginTop: 6,
  },
  leagueImageCard: {
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    borderRadius: 12,
    padding: 12,
    backgroundColor: SURFACE.card,
    alignItems: "center",
  },
  leagueImagePreviewWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: SURFACE.elevated,
  },
  leagueImagePreview: {
    width: "100%",
    height: "100%",
  },
  leagueImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  leagueImageActions: {
    flex: 1,
    gap: 8,
  },
  leagueImageAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  leagueImageActionText: {
    color: BRAND.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  leagueImageRemoveText: {
    color: SEMANTIC.error,
    fontSize: 12,
    fontWeight: "700",
  },
  locationScopeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  locationScopeButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER.medium,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: SURFACE.card,
  },
  locationScopeButtonSelected: {
    borderColor: BRAND.primary,
    backgroundColor: `${BRAND.primary}22`,
  },
  locationScopeButtonText: {
    color: TEXT.secondary,
    fontSize: 13,
    fontWeight: "700",
  },
  locationScopeButtonTextSelected: {
    color: BRAND.primary,
  },
  locationRuleText: {
    color: TEXT.secondary,
    fontSize: 12,
    marginBottom: 8,
  },
  sizeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sizeButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BORDER.medium,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  sizeButtonSelected: {
    borderColor: BRAND.primary,
    backgroundColor: ACCENT.redBg,
  },
  sizeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  sizeButtonTextSelected: {
    color: BRAND.primary,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: SURFACE.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  dropdownPlaceholder: {
    color: TEXT.secondary,
  },
  loadingSection: {
    padding: 24,
    alignItems: "center",
  },
  optionsList: {
    gap: 10,
  },
  sectionHint: {
    color: TEXT.secondary,
    fontSize: 12,
    marginBottom: 10,
  },
  commissionerList: {
    gap: 8,
  },
  commissionerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER.medium,
    borderRadius: 12,
    backgroundColor: SURFACE.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  commissionerName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  commissionerMeta: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  commissionerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commissionerTransferBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${BRAND.primary}66`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: `${BRAND.primary}14`,
  },
  commissionerTransferText: {
    color: BRAND.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  commissionerRemoveBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${SEMANTIC.error}66`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: `${SEMANTIC.error}16`,
  },
  commissionerRemoveText: {
    color: SEMANTIC.error,
    fontSize: 11,
    fontWeight: "700",
  },
  commissionerEmpty: {
    color: TEXT.secondary,
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
  },
  selectableCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: SURFACE.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: BORDER.medium,
    padding: 16,
    marginBottom: 10,
  },
  selectableCardCompact: {
    padding: 14,
  },
  selectableCardSelected: {
    borderColor: BRAND.primary,
    backgroundColor: ACCENT.redBg,
  },
  selectableCardDisabled: {
    opacity: 0.55,
  },
  selectableIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  selectableContent: {
    flex: 1,
  },
  selectableTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  selectableSubtitle: {
    color: TEXT.secondary,
    fontSize: 13,
  },
  selectableDescription: {
    color: "#606368",
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BORDER.medium,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  radioOuterSelected: {
    borderColor: BRAND.primary,
    backgroundColor: BRAND.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
  },
  buttonContainer: {
    marginTop: 16,
  },
  lockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.card,
  },
  lockedBannerText: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "500",
  },
  simulationCard: {
    borderWidth: 1,
    borderColor: `${BRAND.gold}55`,
    backgroundColor: `${BRAND.gold}12`,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  simulationCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  simulationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${BRAND.gold}22`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  simulationTextWrap: {
    flex: 1,
  },
  simulationTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  simulationSubtitle: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: SURFACE.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: Dimensions.get("window").height * 0.6,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.medium,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BORDER.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.lightest,
  },
  modalOptionSelected: {
    backgroundColor: ACCENT.redBg,
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOptionDescription: {
    color: TEXT.secondary,
    fontSize: 13,
    marginTop: 2,
  },
});
