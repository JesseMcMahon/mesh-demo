import { useCallback, useState } from "react";
import { Text, View, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { TopNavigation } from "@/components/TopNavigation";
import { MeshButton } from "@/components/MeshButton";
import { MeshTextInput } from "@/components/MeshTextInput";
import { ProTip } from "@/components/ProTip";
import { PageHeaderText } from "@/components/PageHeaderText";
import { PageSubText } from "@/components/PageSubText";
import { useCommunityTypes } from "@/hooks/useCommunityTypes";
import { useCreateLeague } from "@/contexts/create-league";
import { useNotification } from "@/contexts/notification";
import { useUserProfile } from "@/contexts/user-profile";
import { leagueApi } from "@/lib/api";
import { SURFACE, TEXT, SEMANTIC, BRAND, BORDER } from "@/constants/colors";
import { backOrReplace } from "@/lib/navigation";

export default function CreateLeagueStep1() {
  const router = useRouter();
  const { data, setLeagueName, setLeagueImageUrl, resetData } = useCreateLeague();
  const { accessToken } = useUserProfile();
  const { showNotification } = useNotification();
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  // Prefetch community types for step 3
  useCommunityTypes();

  // Validation: league name must be between 3 and 50 characters
  const leagueNameLength = data.leagueName.trim().length;
  const isValidLeagueName = leagueNameLength >= 3 && leagueNameLength <= 50;

  const handleCancel = () => {
    resetData();
    backOrReplace(router, "/(tabs)" as any);
  };

  const handleBack = () => {
    resetData();
    backOrReplace(router, "/(tabs)" as any);
  };

  const uploadPickedImage = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      if (!accessToken) {
        showNotification("You must be logged in to upload an image.", "error");
        return;
      }

      try {
        setIsUploadingImage(true);
        const uploadResult = await leagueApi.uploadImage(
          {
            uri: asset.uri,
            name: asset.fileName || `league-${Date.now()}.jpg`,
            type: asset.mimeType || "image/jpeg",
          },
          accessToken
        );
        const payload = uploadResult?.data || uploadResult;
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
        setIsUploadingImage(false);
      }
    },
    [accessToken, setLeagueImageUrl, showNotification]
  );

  const handlePickFromLibrary = useCallback(async () => {
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
    await uploadPickedImage(result.assets[0]);
  }, [showNotification, uploadPickedImage]);

  const handleTakePhoto = useCallback(async () => {
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
    await uploadPickedImage(result.assets[0]);
  }, [showNotification, uploadPickedImage]);

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE.background }}>
      <TopNavigation
        title="Create a League"
        showBackButton
        onBackPress={handleBack}
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
            <PageHeaderText>Name Your League</PageHeaderText>

            {/* Description */}
            <PageSubText>
              Choose a creative name for your fantasy football league. You can
              change this later if needed.
            </PageSubText>

            {/* Input Field */}
            <View className="mb-6">
              <Text className="text-white text-sm font-semibold mb-2">
                League Name
              </Text>
              <MeshTextInput
                placeholder="Enter league name..."
                value={data.leagueName}
                onChangeText={setLeagueName}
              />
              <Text
                style={{
                  color:
                    data.leagueName && !isValidLeagueName
                      ? SEMANTIC.error
                      : TEXT.secondary,
                  fontSize: 12,
                  marginTop: 6,
                }}
              >
                League name must be between 3 and 50 characters
              </Text>
            </View>

            <View className="mb-6">
              <Text className="text-white text-sm font-semibold mb-2">
                League Image (Optional)
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: BORDER.medium,
                  backgroundColor: SURFACE.card,
                }}
              >
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 12,
                    backgroundColor: SURFACE.elevated,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {data.leagueImageUrl ? (
                    <Image
                      source={{ uri: data.leagueImageUrl }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <MaterialIcons name="image" size={24} color={TEXT.secondary} />
                  )}
                </View>

                <View style={{ flex: 1, gap: 8 }}>
                  <TouchableOpacity
                    onPress={handlePickFromLibrary}
                    disabled={isUploadingImage}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <MaterialIcons name="photo-library" size={16} color={BRAND.primary} />
                    <Text style={{ color: BRAND.primary, fontWeight: "700", fontSize: 13 }}>
                      Choose from Gallery
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleTakePhoto}
                    disabled={isUploadingImage}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <MaterialIcons name="photo-camera" size={16} color={BRAND.primary} />
                    <Text style={{ color: BRAND.primary, fontWeight: "700", fontSize: 13 }}>
                      Take Photo
                    </Text>
                  </TouchableOpacity>
                  {data.leagueImageUrl ? (
                    <TouchableOpacity
                      onPress={() => setLeagueImageUrl("")}
                      disabled={isUploadingImage}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: SEMANTIC.error, fontWeight: "700", fontSize: 12 }}>
                        Remove Image
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {isUploadingImage ? (
                <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ActivityIndicator size="small" color={BRAND.primary} />
                  <Text style={{ color: TEXT.secondary, fontSize: 12 }}>Uploading image...</Text>
                </View>
              ) : (
                <Text
                  style={{
                    color: TEXT.secondary,
                    fontSize: 12,
                    marginTop: 6,
                  }}
                >
                  Use camera or gallery to set your league image.
                </Text>
              )}
            </View>

            {/* Pro Tip Section */}
            <ProTip tipText="Choose a name that reflects your organization or community. 'Fred's Bar + Customers' 'XYZ Seattle Campus' 'Pi Kapps UW'" />
          </View>

          <View className="mt-8">
            <MeshButton
              title="Continue"
              onPress={() => {
                if (isValidLeagueName) {
                  router.push("/(tabs)/create-league/step2");
                }
              }}
              variant="primary"
              disabled={!isValidLeagueName}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
