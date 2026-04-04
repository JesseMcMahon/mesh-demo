import { Text, View, ScrollView, TouchableOpacity } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { TopNavigation } from "@/components/TopNavigation";
import { MeshButton } from "@/components/MeshButton";
import { PageHeaderText } from "@/components/PageHeaderText";
import { PageSubText } from "@/components/PageSubText";
import { ProTip } from "@/components/ProTip";
import { useCreateLeague } from "@/contexts/create-league";
import { SURFACE, BRAND, BORDER } from "@/constants/colors";
import { dismissFlowAndBackOrReplace } from "@/lib/navigation";

const LEAGUE_SIZES = [6, 8, 10, 12, 14, 16];
const DEFAULT_LEAGUE_SIZE = 10;

export default function CreateLeagueStep2() {
  const router = useRouter();
  const { data, setLeagueSize, setLeagueType, resetData } = useCreateLeague();

  // Ensure default league size is selected when component mounts
  useEffect(() => {
    if (!data.leagueSize) {
      setLeagueSize(DEFAULT_LEAGUE_SIZE);
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
            <PageHeaderText>League Setup</PageHeaderText>

            {/* Description */}
            <PageSubText>
              Choose the league format and how many teams should compete.
            </PageSubText>

            <View className="mb-6">
              <Text className="text-white text-sm font-semibold mb-3">
                League Format
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setLeagueType("squad")}
                  className="flex-1 rounded-lg border-2 px-4 py-3"
                  style={{
                    borderColor:
                      data.leagueType === "squad" ? BRAND.primary : BORDER.medium,
                    backgroundColor:
                      data.leagueType === "squad" ? `${BRAND.primary}33` : "transparent",
                  }}
                >
                  <Text className="text-white font-semibold text-base">Squad</Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    Multiple members per team, with voting and invites.
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setLeagueType("solo")}
                  className="flex-1 rounded-lg border-2 px-4 py-3"
                  style={{
                    borderColor:
                      data.leagueType === "solo" ? BRAND.primary : BORDER.medium,
                    backgroundColor:
                      data.leagueType === "solo" ? `${BRAND.primary}33` : "transparent",
                  }}
                >
                  <Text className="text-white font-semibold text-base">Solo</Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    One user per team, direct lineup control, no invites.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* League Size Selection */}
            <View className="mb-6">
              <Text className="text-white text-sm font-semibold mb-3">
                League Size
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {LEAGUE_SIZES.map((size) => (
                  <TouchableOpacity
                    key={size}
                    onPress={() => setLeagueSize(size)}
                    className="rounded-lg border-2 items-center justify-center"
                    style={{
                      width: 50,
                      height: 50,
                      borderColor:
                        data.leagueSize === size ? BRAND.primary : BORDER.medium,
                      backgroundColor:
                        data.leagueSize === size ? `${BRAND.primary}33` : "transparent",
                    }}
                  >
                    <Text
                      className="text-white font-semibold"
                      style={{ fontSize: 16 }}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Pro Tip Section */}
            <ProTip tipText="League size sets the number of teams competing. In solo leagues each team can only have one owner." />
          </View>

          <View className="mt-8">
            <MeshButton
              title="Continue"
              onPress={() => router.push("/(tabs)/create-league/step2-waiver" as any)}
              variant="primary"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
