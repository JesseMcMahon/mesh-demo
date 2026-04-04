import { useCallback, useRef } from "react";
import { Animated } from "react-native";

export function useSpringPress(scaleTo = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: scaleTo,
      damping: 18,
      stiffness: 260,
      mass: 0.5,
      useNativeDriver: true,
    }).start();
  }, [scale, scaleTo]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 16,
      stiffness: 240,
      mass: 0.5,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return {
    animatedStyle: {
      transform: [{ scale }],
    },
    onPressIn,
    onPressOut,
  };
}
