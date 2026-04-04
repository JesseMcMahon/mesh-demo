import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/contexts/theme";
import { triggerHaptic } from "@/lib/haptics";
import { useSpringPress } from "@/hooks/useSpringPress";

interface MeshButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  height?: "standard" | "small";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  startIcon?: {
    name: keyof typeof MaterialIcons.glyphMap;
    color?: string;
    size?: number;
  };
  endIcon?: {
    name: keyof typeof MaterialIcons.glyphMap;
    color?: string;
    size?: number;
  };
}

export function MeshButton({
  title,
  onPress,
  variant = "primary",
  height = "standard",
  disabled = false,
  loading = false,
  className = "",
  style,
  textStyle,
  startIcon,
  endIcon,
}: MeshButtonProps) {
  const { colors } = useAppTheme();
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress(0.98);
  const isPrimary = variant === "primary";
  const isDisabled = disabled || loading;

  const heightValue = height === "small" ? 40 : 52;
  const primaryText = "#FFFFFF";
  const secondaryText = colors.primary;

  const iconColor =
    startIcon?.color ||
    endIcon?.color ||
    (isPrimary ? primaryText : secondaryText);
  const iconSize = startIcon?.size || endIcon?.size || 20;

  const handlePress = async () => {
    if (isDisabled) return;
    await triggerHaptic("light");
    onPress();
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        className={`w-full rounded-xl items-center justify-center flex-row ${className}`}
        style={[
          {
            height: heightValue,
            backgroundColor: isPrimary ? colors.primary : "transparent",
            borderWidth: isPrimary ? 0 : 2,
            borderColor: isPrimary ? undefined : colors.primary,
            opacity: isDisabled ? 0.6 : 1,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={isPrimary ? primaryText : secondaryText}
            size="small"
          />
        ) : (
          <>
            {startIcon && (
              <View className="mr-2">
                <MaterialIcons
                  name={startIcon.name}
                  size={startIcon.size || iconSize}
                  color={startIcon.color || iconColor}
                />
              </View>
            )}
            <Text
              className="font-semibold text-base"
              style={[
                { color: isPrimary ? primaryText : secondaryText },
                textStyle,
              ]}
            >
              {title}
            </Text>
            {endIcon && (
              <View className="ml-2">
                <MaterialIcons
                  name={endIcon.name}
                  size={endIcon.size || iconSize}
                  color={endIcon.color || iconColor}
                />
              </View>
            )}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
