import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { SURFACE } from "@/constants/colors";

interface SkeletonBlockProps {
  width?: ViewStyle["width"];
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBlock({
  width = "100%",
  height = 14,
  borderRadius = 8,
  style,
}: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

interface SkeletonCardListProps {
  count?: number;
  cardHeight?: number;
  style?: ViewStyle;
}

export function SkeletonCardList({
  count = 5,
  cardHeight = 82,
  style,
}: SkeletonCardListProps) {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={`skeleton-card-${index}`} style={[styles.card, { height: cardHeight }]}>
          <SkeletonBlock width={42} height={42} borderRadius={12} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <SkeletonBlock width="62%" height={15} style={{ marginBottom: 8 }} />
            <SkeletonBlock width="40%" height={12} style={{ marginBottom: 12 }} />
            <SkeletonBlock width="35%" height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: SURFACE.elevated,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: SURFACE.card,
    borderWidth: 1,
    borderColor: "#FFFFFF12",
    padding: 12,
    marginBottom: 10,
  },
});
