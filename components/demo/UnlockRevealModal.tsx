import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface RevealItem {
  id: string;
  name: string;
  kind: "suit" | "football";
  rarity: "common" | "rare";
  image: number;
}

interface UnlockRevealModalProps {
  visible: boolean;
  title: string;
  subtitle: string;
  items: RevealItem[];
  accent: string;
  accentLight: string;
  textPrimary: string;
  textSecondary: string;
  bodyFont: string;
  labelFont: string;
  buttonFont: string;
  ctaLabel: string;
  onCta: () => void;
  onClose?: () => void;
  dismissible?: boolean;
}

export function UnlockRevealModal({
  visible,
  title,
  subtitle,
  items,
  accent,
  accentLight,
  textPrimary,
  textSecondary,
  bodyFont,
  labelFont,
  buttonFont,
  ctaLabel,
  onCta,
  onClose,
  dismissible = true,
}: UnlockRevealModalProps) {
  const intro = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const aura = useRef(new Animated.Value(0)).current;
  const lastVisible = useRef(false);

  useEffect(() => {
    if (!visible) {
      intro.setValue(0);
      spin.setValue(0);
      aura.setValue(0);
      lastVisible.current = false;
      return;
    }

    if (!lastVisible.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      lastVisible.current = true;
    }

    const introAnim = Animated.timing(intro, {
      toValue: 1,
      duration: 430,
      useNativeDriver: true,
    });

    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 2800,
        useNativeDriver: true,
      })
    );

    const auraLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(aura, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(aura, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    );

    introAnim.start();
    spinLoop.start();
    auraLoop.start();

    return () => {
      spinLoop.stop();
      auraLoop.stop();
      spin.setValue(0);
      aura.setValue(0);
    };
  }, [visible, intro, spin, aura]);

  const overlayOpacity = intro.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const cardScale = intro.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  const cardOpacity = intro.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const spinDeg = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const auraScale = aura.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.16],
  });

  const auraOpacity = aura.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.42],
  });

  const particles = useMemo(() => [0, 1, 2, 3, 4], []);

  const particleAnimations = useMemo(
    () =>
      particles.map((_, index) => ({
        translateY: aura.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10 - index * 2],
        }),
        opacity: aura.interpolate({
          inputRange: [0, 1],
          outputRange: [0.1, 0.5],
        }),
      })),
    [particles, aura]
  );

  const itemAnimations = useMemo(
    () =>
      items.map((_, index) => ({
        opacity: intro.interpolate({
          inputRange: [index * 0.15, Math.min(1, index * 0.15 + 0.45)],
          outputRange: [0, 1],
          extrapolate: "clamp",
        }),
        translateY: intro.interpolate({
          inputRange: [index * 0.15, Math.min(1, index * 0.15 + 0.45)],
          outputRange: [18, 0],
          extrapolate: "clamp",
        }),
      })),
    [items, intro]
  );

  const handleClose = () => {
    Haptics.selectionAsync().catch(() => {});
    onClose?.();
  };

  const handleCta = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onCta();
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}> 
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissible ? handleClose : undefined} />

        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: cardScale }],
              opacity: cardOpacity,
              borderColor: `${accent}88`,
              backgroundColor: "rgba(7, 17, 28, 0.97)",
            },
          ]}
        >
          <Animated.View
            style={[
              styles.aura,
              {
                backgroundColor: `${accent}22`,
                transform: [{ scale: auraScale }],
                opacity: auraOpacity,
              },
            ]}
          />

          <View pointerEvents="none" style={styles.particleLayer}>
            {particles.map((particle, index) => (
              <Animated.View
                key={`particle-${particle}`}
                style={[
                  styles.particle,
                  {
                    left: `${12 + index * 18}%`,
                    backgroundColor: index % 2 === 0 ? accent : accentLight,
                    opacity: particleAnimations[index]?.opacity,
                    transform: [{ translateY: particleAnimations[index]?.translateY ?? 0 }],
                  },
                ]}
              />
            ))}
          </View>

          {dismissible ? (
            <TouchableOpacity onPress={handleClose} activeOpacity={0.8} style={styles.closeButton}>
              <MaterialIcons name="close" size={18} color={textPrimary} />
            </TouchableOpacity>
          ) : null}

          <View style={styles.headerRow}>
            <Animated.View
              style={[
                styles.spinningHalo,
                {
                  borderColor: `${accent}88`,
                  transform: [{ rotate: spinDeg }],
                },
              ]}
            />
            <View style={[styles.dotCore, { backgroundColor: accent }]} />
            <Text style={[styles.title, { color: textPrimary, fontFamily: labelFont }]}>{title}</Text>
          </View>

          <Text style={[styles.subtitle, { color: textSecondary, fontFamily: bodyFont }]}>{subtitle}</Text>

          <View style={styles.itemsGrid}>
            {items.map((item, index) => (
              <Animated.View
                key={item.id}
                style={[
                  styles.itemCard,
                  {
                    borderColor: `${accent}55`,
                    opacity: itemAnimations[index]?.opacity,
                    transform: [{ translateY: itemAnimations[index]?.translateY ?? 0 }],
                  },
                ]}
              >
                <Image source={item.image} resizeMode="contain" style={styles.itemImage} />
                <View style={styles.itemMeta}>
                  <Text style={[styles.itemName, { color: textPrimary, fontFamily: labelFont }]}>{item.name}</Text>
                  <Text style={[styles.itemType, { color: accentLight, fontFamily: bodyFont }]}>
                    {item.rarity.toUpperCase()} {item.kind === "suit" ? "SUIT" : "FOOTBALL"}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleCta}
            activeOpacity={0.88}
            style={[styles.ctaButton, { backgroundColor: accent }]}
          >
            <Text style={[styles.ctaText, { color: "#07111C", fontFamily: buttonFont }]}>{ctaLabel}</Text>
            <MaterialIcons name="arrow-forward" size={17} color="#07111C" />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(3, 10, 17, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
    overflow: "hidden",
  },
  aura: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 999,
    top: -110,
    left: -28,
  },
  particleLayer: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    height: 40,
  },
  particle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(170, 193, 217, 0.16)",
    zIndex: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  spinningHalo: {
    position: "absolute",
    left: -2,
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  dotCore: {
    width: 26,
    height: 26,
    borderRadius: 999,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
    paddingRight: 28,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  itemsGrid: {
    gap: 10,
  },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(20, 38, 59, 0.72)",
    overflow: "hidden",
  },
  itemImage: {
    width: "100%",
    height: 188,
    backgroundColor: "rgba(8,20,32,0.6)",
  },
  itemMeta: {
    padding: 9,
    gap: 3,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "800",
  },
  itemType: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.25,
  },
  ctaButton: {
    marginTop: 4,
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
