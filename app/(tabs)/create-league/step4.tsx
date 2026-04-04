import { Text, View, ScrollView, TouchableOpacity } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { TopNavigation } from "@/components/TopNavigation";
import { MeshButton } from "@/components/MeshButton";
import { MeshTextInput } from "@/components/MeshTextInput";
import { PageHeaderText } from "@/components/PageHeaderText";
import { PageSubText } from "@/components/PageSubText";
import { ProTip } from "@/components/ProTip";
import { useCreateLeague } from "@/contexts/create-league";
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

export default function CreateLeagueStep4() {
  const router = useRouter();
  const { data, setJoinability, setPrivatePasskey, resetData } = useCreateLeague();

  // Ensure default joinability is selected when component mounts
  useEffect(() => {
    if (!data.joinability) {
      setJoinability("public");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        contentContainerStyle={{ paddingVertical: 20, flexGrow: 1 }}
      >
        <View className="flex-1 justify-between">
          <View>
            {/* Section Title */}
            <PageHeaderText>Choose Joinability</PageHeaderText>

            {/* Description */}
            <PageSubText>
              Please select how you would like others to create squad in your
              league. You can change this later if needed.
            </PageSubText>

            {/* Joinability Options */}
            <View className="mb-6">
              <JoinabilityOption
                type="public"
                title="Public"
                subtitle="Open to everyone."
                description="Users can create and join squads through your league page, invite codes, and QR codes. Perfect for bars & community leagues."
                icon="public"
                iconColor={BRAND.gold}
                isSelected={data.joinability === "public"}
                onPress={() => {
                  setJoinability("public");
                  setPrivatePasskey("");
                }}
              />

              <JoinabilityOption
                type="private"
                title="Private"
                subtitle="Invite/request only."
                description="Users must request to join through private QR codes/invite links. Ideal for businesses, fraternities, and private communities."
                icon="lock"
                iconColor="#FF9800"
                isSelected={data.joinability === "private"}
                onPress={() => setJoinability("private")}
              />
            </View>

            {data.joinability === "private" && (
              <View className="mb-6">
                <Text className="text-white text-sm font-semibold mb-2">
                  Private League Passkey
                </Text>
                <MeshTextInput
                  placeholder="Enter a passkey (4-64 chars)"
                  value={data.privatePasskey}
                  onChangeText={setPrivatePasskey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
                <Text className="text-gray-400 text-xs mt-2">
                  Members joining by invite will need this passkey.
                </Text>
              </View>
            )}

            {/* Pro Tip Section */}
            <ProTip tipText="You can add required location or age criteria in the admin league view to ensure the types of users who join your leagues." />
          </View>

          <View className="mt-8">
            <MeshButton
              title="Continue"
              onPress={() => router.push("/(tabs)/create-league/step5")}
              disabled={
                data.joinability === "private" &&
                data.privatePasskey.trim().length < 4
              }
              variant="primary"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
