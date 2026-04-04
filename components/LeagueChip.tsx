import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface LeagueChipProps {
  icon?: keyof typeof MaterialIcons.glyphMap;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  size?: "small" | "medium" | "large";
}

export function LeagueChip({
  icon,
  text,
  backgroundColor = "transparent",
  textColor = "#FFFFFF",
  borderColor = "#FFFFFF1A",
  size = "medium",
}: LeagueChipProps) {
  const sizeConfig = {
    small: { padding: 8, iconSize: 14, fontSize: 11 },
    medium: { padding: 10, iconSize: 16, fontSize: 12 },
    large: { padding: 12, iconSize: 18, fontSize: 14 },
  };

  const config = sizeConfig[size];

  return (
    <View
      className="flex-row items-center rounded-full"
      style={{
        backgroundColor,
        borderWidth: 1,
        borderColor,
        paddingHorizontal: config.padding,
        paddingVertical: config.padding / 2,
        alignSelf: "flex-start",
      }}
    >
      {icon && (
        <MaterialIcons
          name={icon}
          size={config.iconSize}
          color={textColor}
          style={{ marginRight: text ? 6 : 0 }}
        />
      )}
      {text && (
        <Text
          className="font-semibold"
          style={{
            color: textColor,
            fontSize: config.fontSize,
          }}
        >
          {text}
        </Text>
      )}
    </View>
  );
}
