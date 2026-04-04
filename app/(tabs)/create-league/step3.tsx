import { useCreateLeague } from "@/contexts/create-league";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { TopNavigation } from "@/components/TopNavigation";
import { MeshButton } from "@/components/MeshButton";
import { PageHeaderText } from "@/components/PageHeaderText";
import { PageSubText } from "@/components/PageSubText";
import { useCommunityTypes, CommunityType } from "@/hooks/useCommunityTypes";
import { SURFACE, BRAND, BORDER } from "@/constants/colors";
import { dismissFlowAndBackOrReplace } from "@/lib/navigation";

// Map community types to icons and colors
const getCommunityTypeIcon = (
  type: string
): {
  name: keyof typeof MaterialIcons.glyphMap;
  color: string;
} => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes("greeklife") || lowerType.includes("greek")) {
    return { name: "school", color: BRAND.primary }; // Brand red
  }
  if (lowerType.includes("customer") || lowerType.includes("engagement")) {
    return { name: "restaurant", color: "#FF9800" }; // Orange
  }
  if (lowerType.includes("business")) {
    return { name: "business", color: "#2196F3" }; // Blue
  }
  if (lowerType.includes("influencer")) {
    return { name: "star", color: "#E91E63" }; // Pink
  }
  // Default/Other
  return { name: "apps", color: "#4CAF50" }; // Green
};

interface CommunityTypeCardProps {
  communityType: CommunityType;
  isSelected: boolean;
  onPress: () => void;
}

function CommunityTypeCard({
  communityType,
  isSelected,
  onPress,
}: CommunityTypeCardProps) {
  const icon = getCommunityTypeIcon(communityType.type);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-xl border-2 mb-2 p-3 flex-row items-center"
      style={{
        borderColor: isSelected ? BRAND.primary : BORDER.medium,
        backgroundColor: isSelected ? `${BRAND.primary}33` : "transparent",
      }}
    >
      <View className="mr-4">
        <MaterialIcons name={icon.name} size={32} color={icon.color} />
      </View>
      <View className="flex-1">
        <Text className="text-white font-bold text-base mb-1">
          {communityType.type}
        </Text>
        <Text className="text-gray-400 text-sm">
          {communityType.description}
        </Text>
      </View>
      <View className="ml-2">
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

export default function CreateLeagueStep3() {
  const router = useRouter();
  const { data: communityTypes, isLoading } = useCommunityTypes();
  const { data, setCommunityType, resetData } = useCreateLeague();

  const handleCancel = () => {
    resetData();
    dismissFlowAndBackOrReplace(router, "/(tabs)" as any);
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
        contentContainerStyle={{ paddingVertical: 16, flexGrow: 1 }}
      >
        <View className="flex-1 justify-between">
          <View>
            {/* Section Title */}
            <PageHeaderText>Select Community Type</PageHeaderText>

            {/* Description */}
            <PageSubText>
              Knowing your community type allows us to customize features to
              enhance the season.
            </PageSubText>

            {/* Community Type Selection */}
            <View className="mb-4">
              <Text className="text-white text-sm font-semibold mb-2">
                Community Type
              </Text>

              {isLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="large" color={BRAND.primary} />
                </View>
              ) : (
                <View>
                  {communityTypes?.map((type) => {
                    const typeId = type._id || type.id || type.type;
                    return (
                      <CommunityTypeCard
                        key={typeId}
                        communityType={type}
                        isSelected={data.communityType === typeId}
                        onPress={() => setCommunityType(typeId)}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          </View>

          <View className="mt-4">
            <MeshButton
              title="Continue"
              onPress={() => {
                if (data.communityType) {
                  router.push("/(tabs)/create-league/step4");
                }
              }}
              variant="primary"
              disabled={!data.communityType}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
