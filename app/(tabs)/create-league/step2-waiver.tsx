import { Text, View, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { TopNavigation } from "@/components/TopNavigation";
import { MeshButton } from "@/components/MeshButton";
import { MeshTextInput } from "@/components/MeshTextInput";
import { PageHeaderText } from "@/components/PageHeaderText";
import { PageSubText } from "@/components/PageSubText";
import { ProTip } from "@/components/ProTip";
import { useCreateLeague } from "@/contexts/create-league";
import { SURFACE, BRAND, BORDER, TEXT } from "@/constants/colors";
import { dismissFlowAndBackOrReplace } from "@/lib/navigation";

interface WaiverOptionProps {
  title: string;
  subtitle: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

function WaiverOption({
  title,
  subtitle,
  description,
  selected,
  onPress,
}: WaiverOptionProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-xl border-2 mb-4 p-4"
      style={{
        borderColor: selected ? BRAND.primary : BORDER.medium,
        backgroundColor: selected ? `${BRAND.primary}26` : "transparent",
      }}
      activeOpacity={0.8}
    >
      <Text className="text-white font-bold text-base">{title}</Text>
      <Text className="text-gray-400 text-sm mt-1">{subtitle}</Text>
      <Text className="text-gray-400 text-xs mt-2 leading-5">{description}</Text>
    </TouchableOpacity>
  );
}

export default function CreateLeagueStep2Waiver() {
  const router = useRouter();
  const { data, setWaiverType, setFaabBudgetDefault, resetData } = useCreateLeague();
  const faabBudgetText = String(Number(data.faabBudgetDefault || 100));

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
            <PageHeaderText>Waiver Rules</PageHeaderText>
            <PageSubText>
              Choose how player claims process once waivers run for this season.
            </PageSubText>

            <View className="mb-4">
              <Text className="text-white text-sm font-semibold mb-3">Waiver Type</Text>

              <WaiverOption
                title="Reverse Standings (Default)"
                subtitle="Highest waiver priority goes to lowest-ranked team."
                description="Priority resets weekly from reverse standings. Winning a claim drops that team to the end immediately."
                selected={data.waiverType === "reverse_standings"}
                onPress={() => setWaiverType("reverse_standings")}
              />

              <WaiverOption
                title="FAAB"
                subtitle="Blind bid waiver claims."
                description="Highest bid wins. Ties break by waiver priority order. Winning teams move to the end of priority."
                selected={data.waiverType === "faab"}
                onPress={() => setWaiverType("faab")}
              />
            </View>

            {data.waiverType === "faab" ? (
              <View className="mb-6">
                <Text className="text-white text-sm font-semibold mb-2">
                  Default FAAB Budget
                </Text>
                <MeshTextInput
                  placeholder="100"
                  value={faabBudgetText}
                  keyboardType="number-pad"
                  onChangeText={(value) => {
                    const parsed = Number(String(value || "").replace(/[^\d]/g, ""));
                    setFaabBudgetDefault(Number.isFinite(parsed) ? parsed : 0);
                  }}
                />
                <Text style={{ color: TEXT.secondary, fontSize: 12, marginTop: 6 }}>
                  Applied per squad at draft completion.
                </Text>
              </View>
            ) : null}

            <ProTip tipText="Waiver type is locked once the draft starts." />
          </View>

          <View className="mt-8">
            <MeshButton
              title="Continue"
              onPress={() => router.push("/(tabs)/create-league/step3")}
              variant="primary"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
