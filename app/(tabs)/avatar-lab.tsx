import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import UnityView from "@azesmway/react-native-unity";
import { MaterialIcons } from "@expo/vector-icons";
import { SURFACE, TEXT, BRAND, BORDER, SEMANTIC } from "@/constants/colors";

type UnityMessageEvent = NativeSyntheticEvent<{ message: string }>;

const UNITY_GAME_OBJECT = "CharacterOrbitController";
const UNITY_METHODS = {
  resetView: "ResetView",
  toggleAutoSpin: "ToggleAutoSpin",
  setBodyColor: "SetBodyColor",
  nextOutfit: "NextOutfit",
} as const;

const COLOR_PRESETS = ["#4CC9F0", "#F72585", "#F9C74F", "#90BE6D", "#B8F2E6"];
const READY_TIMEOUT_MS = 12000;

function sendUnityMessage(
  ref: React.RefObject<UnityView | null>,
  methodName: string,
  message = ""
) {
  if (!ref.current) return;
  ref.current.postMessage(UNITY_GAME_OBJECT, methodName, message);
}

export default function AvatarLabScreen() {
  const unityRef = useRef<UnityView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [didReceiveReady, setDidReceiveReady] = useState(false);
  const [autoSpinEnabled, setAutoSpinEnabled] = useState(false);
  const [unityStatusText, setUnityStatusText] = useState("Preparing Unity scene...");
  const [activeColor, setActiveColor] = useState(COLOR_PRESETS[0]);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [unityMountNonce, setUnityMountNonce] = useState(0);

  const canMountUnity = viewportSize.width > 0 && viewportSize.height > 0;

  useEffect(() => {
    if (!canMountUnity) {
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(() => {
      if (!didReceiveReady) {
        setIsLoading(false);
        setUnityStatusText(
          "Unity did not report READY yet. Tap Reload if the render area is still black."
        );
      }
    }, READY_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [canMountUnity, didReceiveReady, unityMountNonce]);

  const onUnityViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const nextWidth = Math.max(0, Math.floor(width));
    const nextHeight = Math.max(0, Math.floor(height));

    setViewportSize((previous) => {
      if (previous.width === nextWidth && previous.height === nextHeight) {
        return previous;
      }
      return { width: nextWidth, height: nextHeight };
    });
  }, []);

  const onUnityMessage = useCallback((event: UnityMessageEvent) => {
    const message = String(event?.nativeEvent?.message || "").trim();
    if (!message) return;

    if (message === "READY") {
      setDidReceiveReady(true);
      setIsLoading(false);
      setUnityStatusText("Character loaded. Drag to inspect details.");
      return;
    }

    if (message.startsWith("STATUS:")) {
      // Some Unity boots can emit STATUS before READY reaches JS.
      // Treat this as ready so the loading overlay never gets stuck.
      setDidReceiveReady(true);
      setIsLoading(false);
      setUnityStatusText(message.replace("STATUS:", "").trim());
      return;
    }

    if (message.startsWith("NATIVE_STATUS:")) {
      const normalized = message.replace("NATIVE_STATUS:", "").trim();
      setUnityStatusText(normalized);
      return;
    }

    // Fallback: any non-empty Unity message means the bridge is alive.
    setDidReceiveReady(true);
    setIsLoading(false);
    setUnityStatusText(message);
  }, []);

  const handleResetView = useCallback(() => {
    sendUnityMessage(unityRef, UNITY_METHODS.resetView);
  }, []);

  const handleReloadUnity = useCallback(() => {
    setDidReceiveReady(false);
    setUnityStatusText("Reloading Unity scene...");
    setUnityMountNonce((current) => current + 1);
  }, []);

  const handleToggleAutoSpin = useCallback(() => {
    setAutoSpinEnabled((current) => {
      const next = !current;
      sendUnityMessage(
        unityRef,
        UNITY_METHODS.toggleAutoSpin,
        JSON.stringify({ enabled: next })
      );
      return next;
    });
  }, []);

  const handleSetBodyColor = useCallback((hex: string) => {
    setActiveColor(hex);
    sendUnityMessage(unityRef, UNITY_METHODS.setBodyColor, hex);
  }, []);

  const handleNextOutfit = useCallback(() => {
    sendUnityMessage(unityRef, UNITY_METHODS.nextOutfit);
  }, []);

  const statusTone = useMemo(() => {
    if (didReceiveReady) return SEMANTIC.success;
    return isLoading ? TEXT.secondary : SEMANTIC.warning;
  }, [didReceiveReady, isLoading]);

  return (
    <View style={styles.container}>
      <View style={styles.unityFrame} onLayout={onUnityViewportLayout}>
        {canMountUnity ? (
          <UnityView
            key={`unity-${viewportSize.width}x${viewportSize.height}-${unityMountNonce}`}
            ref={unityRef}
            style={[styles.unityView, viewportSize]}
            onUnityMessage={onUnityMessage}
          />
        ) : null}

        {isLoading ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={BRAND.primary} />
            <Text style={styles.loadingTitle}>Unity loading...</Text>
            <Text style={styles.loadingSubTitle}>
              {canMountUnity
                ? "Waiting for runtime READY event from Unity scene."
                : "Preparing render viewport..."}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.controlPanel}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusTone }]} />
          <Text style={styles.statusText} numberOfLines={2}>
            {unityStatusText}
          </Text>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleResetView}
            activeOpacity={0.85}
          >
            <MaterialIcons name="restart-alt" size={16} color={TEXT.primary} />
            <Text style={styles.controlButtonText}>Reset View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, autoSpinEnabled && styles.controlButtonActive]}
            onPress={handleToggleAutoSpin}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name={autoSpinEnabled ? "pause-circle-outline" : "play-circle-outline"}
              size={16}
              color={TEXT.primary}
            />
            <Text style={styles.controlButtonText}>
              {autoSpinEnabled ? "Auto Spin On" : "Auto Spin Off"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlButton, styles.outfitButton]}
            onPress={handleNextOutfit}
            activeOpacity={0.85}
          >
            <MaterialIcons name="style" size={16} color={TEXT.primary} />
            <Text style={styles.controlButtonText}>Next Outfit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.reloadButton]}
            onPress={handleReloadUnity}
            activeOpacity={0.85}
          >
            <MaterialIcons name="refresh" size={16} color={TEXT.primary} />
            <Text style={styles.controlButtonText}>Reload</Text>
          </TouchableOpacity>

          <View style={styles.colorRow}>
            {COLOR_PRESETS.map((hex) => (
              <TouchableOpacity
                key={hex}
                activeOpacity={0.85}
                onPress={() => handleSetBodyColor(hex)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: hex },
                  activeColor === hex && styles.colorSwatchActive,
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE.background,
  },
  unityFrame: {
    flex: 1,
    minHeight: 260,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.default,
    backgroundColor: "#05070A",
  },
  unityView: {
    alignSelf: "stretch",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5, 7, 10, 0.9)",
    paddingHorizontal: 22,
  },
  loadingTitle: {
    marginTop: 14,
    color: TEXT.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  loadingSubTitle: {
    marginTop: 8,
    color: TEXT.secondary,
    fontSize: 12,
    textAlign: "center",
  },
  controlPanel: {
    borderTopWidth: 1,
    borderTopColor: BORDER.default,
    backgroundColor: SURFACE.card,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: TEXT.secondary,
    flex: 1,
    fontSize: 12,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  controlButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  controlButtonActive: {
    borderColor: BRAND.primary,
    backgroundColor: `${BRAND.primary}2E`,
  },
  controlButtonText: {
    color: TEXT.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  outfitButton: {
    maxWidth: 132,
  },
  reloadButton: {
    maxWidth: 96,
  },
  colorRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  colorSwatchActive: {
    borderColor: TEXT.primary,
    borderWidth: 2,
    transform: [{ scale: 1.08 }],
  },
});
