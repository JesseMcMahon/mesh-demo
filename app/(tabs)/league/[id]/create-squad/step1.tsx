import { Text, View, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { TopNavigation } from "@/components/TopNavigation";
import { MeshButton } from "@/components/MeshButton";
import { MeshTextInput } from "@/components/MeshTextInput";
import { ProTip } from "@/components/ProTip";
import { PageHeaderText } from "@/components/PageHeaderText";
import { PageSubText } from "@/components/PageSubText";
import { useCreateSquad } from "@/contexts/create-squad";
import { useLeagueData } from "@/contexts/league-data";
import { SURFACE, TEXT, SEMANTIC } from "@/constants/colors";
import { backOrReplace } from "@/lib/navigation";

export default function CreateSquadStep1() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string | string[];
    squadId?: string | string[];
  }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const squadIdParam = Array.isArray(params.squadId)
    ? params.squadId[0]
    : params.squadId;
  const { data, setSquadName, resetData } = useCreateSquad();
  const { leagueDetails } = useLeagueData();

  const leagueName = leagueDetails?.name || "League Name";

  // Validation: squad name must be between 3 and 20 characters
  const squadNameLength = data.squadName.trim().length;
  const isValidSquadName = squadNameLength >= 3 && squadNameLength <= 20;

  const handleCancel = () => {
    resetData();
    backOrReplace(router, `/(tabs)/league/${id}` as any);
  };

  const handleBack = () => {
    resetData();
    backOrReplace(router, `/(tabs)/league/${id}` as any);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE.background }}>
      <TopNavigation
        title={leagueName}
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
            <PageHeaderText>Name Your Squad</PageHeaderText>

            {/* Description */}
            <PageSubText>
              Choose a creative name for your fantasy football squad. You can
              change this later if needed.
            </PageSubText>

            {/* Input Field */}
            <View className="mb-6">
              <Text className="text-white text-sm font-semibold mb-2">
                Squad Name
              </Text>
              <MeshTextInput
                placeholder="Enter squad name..."
                value={data.squadName}
                onChangeText={setSquadName}
              />
              <Text
                style={{
                  color:
                    data.squadName && !isValidSquadName ? SEMANTIC.error : TEXT.secondary,
                  fontSize: 12,
                  marginTop: 6,
                }}
              >
                Squad name must be between 3 and 20 characters
              </Text>
            </View>

            {/* Pro Tip Section */}
            <ProTip tipText="Choose a name that reflects your group within your community." />
          </View>

          <View className="mt-8">
            <MeshButton
              title="Continue"
              onPress={() => {
                if (isValidSquadName) {
                  router.push({
                    pathname: `/(tabs)/league/${id}/create-squad/step2`,
                    params: squadIdParam
                      ? { squadId: String(squadIdParam) }
                      : undefined,
                  } as any);
                }
              }}
              variant="primary"
              disabled={!isValidSquadName}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
