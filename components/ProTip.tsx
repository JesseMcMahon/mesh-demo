import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { GRADIENTS, BRAND, TEXT } from "@/constants/colors";

interface ProTipProps {
  tipText: string;
}

export function ProTip({ tipText }: ProTipProps) {
  return (
    <View
      className="rounded-xl overflow-hidden"
      style={{ borderWidth: 1, borderColor: `${BRAND.gold}4D` }}
    >
      <LinearGradient
        colors={[...GRADIENTS.proTip]}
        locations={[0, 0.9]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 0 }}
      >
        <View className="flex-row px-2 py-2 items-center">
          <MaterialIcons
            name="lightbulb"
            size={24}
            color={BRAND.gold}
            style={{ marginRight: 10 }}
          />
          <Text className="text-white font-bold text-lg">Pro Tip</Text>
        </View>
        <View className="px-4 mb-4">
          <Text style={{ color: TEXT.secondary }} className="font-semibold text-base leading-6">
            {tipText}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}
