import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface MeshChipProps {
  color: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  text: string;
}

export function MeshChip({ color, icon, text }: MeshChipProps) {
  return (
    <View
      className="flex-row items-center px-3 py-1.5 rounded-full"
      style={{
        backgroundColor: `${color}20`,
        borderWidth: 1,
        borderColor: color,
        alignSelf: "flex-start",
      }}
    >
      <MaterialIcons name={icon} size={16} color={color} />
      <Text
        className="ml-1.5 text-xs font-semibold"
        style={{ color }}
      >
        {text}
      </Text>
    </View>
  );
}




