import {
  TextInput,
  TextInputProps,
  View,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { SURFACE, TEXT } from "@/constants/colors";
import { useAppTheme } from "@/contexts/theme";
import { triggerHaptic } from "@/lib/haptics";

interface MeshTextInputProps extends TextInputProps {
  startIcon?: {
    name: keyof typeof MaterialIcons.glyphMap;
    color?: string;
    size?: number;
  };
  endIcon?: {
    name: keyof typeof MaterialIcons.glyphMap;
    color?: string;
    size?: number;
    onPress?: () => void;
  };
  endElement?: ReactNode;
  error?: boolean;
}

export function MeshTextInput({
  startIcon,
  endIcon,
  endElement,
  error = false,
  className = "",
  style,
  ...textInputProps
}: MeshTextInputProps) {
  const { colors } = useAppTheme();
  const hasStartIcon = !!startIcon;
  const hasEndIcon = !!endIcon;
  const hasEndElement = !!endElement;
  const hasEndContent = hasEndIcon || hasEndElement;

  const paddingLeft = hasStartIcon ? "pl-12" : "pl-4";
  const paddingRight = hasEndContent ? "pr-12" : "pr-4";

  return (
    <View className="relative">
      {startIcon && (
        <View className="absolute left-4 top-0 bottom-0 justify-center z-10">
          <MaterialIcons
            name={startIcon.name}
            size={startIcon.size || 20}
            color={startIcon.color || colors.primary}
          />
        </View>
      )}
      <TextInput
        className={`w-full ${paddingLeft} ${paddingRight} py-4 rounded-xl text-white ${className}`}
        placeholderTextColor={TEXT.placeholder}
        style={[
          {
            backgroundColor: SURFACE.card,
            borderWidth: error ? 1 : 0,
            borderColor: error ? "#FF453A" : undefined,
          },
          style,
        ]}
        {...textInputProps}
      />
      {endIcon && (
        <TouchableOpacity
          onPress={async () => {
            await triggerHaptic("selection");
            endIcon.onPress?.();
          }}
          disabled={!endIcon.onPress}
          className="absolute right-4 top-0 bottom-0 justify-center z-10"
        >
          <MaterialIcons
            name={endIcon.name}
            size={endIcon.size || 20}
            color={endIcon.color || TEXT.placeholder}
          />
        </TouchableOpacity>
      )}
      {endElement && (
        <View className="absolute right-4 top-0 bottom-0 justify-center z-10">
          {endElement}
        </View>
      )}
    </View>
  );
}
