import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import DateTimePicker from "@react-native-community/datetimepicker";
import { TopNavigation } from "@/components/TopNavigation";
import { MeshButton } from "@/components/MeshButton";
import { SettingsSection } from "@/components/SettingsSection";
import { useUserProfile } from "@/contexts/user-profile";
import { useNotification } from "@/contexts/notification";
import { leagueApi } from "@/lib/api";
import { backOrReplace } from "@/lib/navigation";
import { useLeagueData } from "@/contexts/league-data";
import { useLeagueDraftSettings } from "@/hooks/useLeagueData";
import { BRAND, SURFACE, TEXT, BORDER, ACCENT } from "@/constants/colors";

/**
 * Format seconds to human-readable string
 */
function formatTimeReadable(seconds: number): string {
  if (!seconds || seconds === 0) return "Not set";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && hours === 0) parts.push(`${secs}s`);

  return parts.join(" ") || "0m";
}

interface InfoRowProps {
  label: string;
  value: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
}

type DraftOrderMode = "random" | "manual" | null;

interface DraftOrderItem {
  squadId: string;
  name: string;
  imageUrl?: string;
  draftSlot: number;
}

const InfoRow = React.memo(function InfoRow({
  label,
  value,
  icon,
}: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowLeft}>
        {icon && (
          <MaterialIcons
            name={icon}
            size={20}
            color={TEXT.secondary}
            style={styles.infoRowIcon}
          />
        )}
        <Text style={styles.infoRowLabel}>{label}</Text>
      </View>
      <Text style={styles.infoRowValue}>{value}</Text>
    </View>
  );
});

interface TimePickerButtonProps {
  label: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  hasValue: boolean;
  disabled?: boolean;
}

const TimePickerButton = React.memo(function TimePickerButton({
  label,
  value,
  icon,
  onPress,
  hasValue,
  disabled = false,
}: TimePickerButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.pickerButton, disabled && styles.pickerButtonDisabled]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View style={styles.pickerButtonLeft}>
        <View style={styles.pickerIconContainer}>
          <MaterialIcons
            name={icon}
            size={22}
            color={disabled ? TEXT.quaternary : BRAND.primary}
          />
        </View>
        <View>
          <Text style={styles.pickerLabel}>{label}</Text>
          <Text
            style={[
              styles.pickerValue,
              !hasValue && styles.pickerValuePlaceholder,
            ]}
          >
            {value}
          </Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={TEXT.quaternary} />
    </TouchableOpacity>
  );
});

export default function DraftSettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const leagueId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { accessToken } = useUserProfile();
  const { seasonId } = useLeagueData();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  // Fetch draft settings
  const { data: draftSettings, isLoading: isLoadingDraftSettings } =
    useLeagueDraftSettings(seasonId || undefined, leagueId);

  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDraftOrder, setIsSavingDraftOrder] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Form state
  const [draftTime, setDraftTime] = useState<Date | null>(null);
  const [secondsPerPick, setSecondsPerPick] = useState<number>(0);
  const [tempDateTime, setTempDateTime] = useState<Date>(new Date());

  // Time picker state
  const [timeHours, setTimeHours] = useState(0);
  const [timeMinutes, setTimeMinutes] = useState(0);
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [draftOrderMode, setDraftOrderMode] = useState<DraftOrderMode>(null);
  const [draftOrder, setDraftOrder] = useState<DraftOrderItem[]>([]);
  const [savedManualOrder, setSavedManualOrder] = useState<DraftOrderItem[]>(
    [],
  );
  const [isDraggingDraftOrder, setIsDraggingDraftOrder] = useState(false);
  const [draggedSquadId, setDraggedSquadId] = useState<string | null>(null);
  const [pressedDragHandleId, setPressedDragHandleId] = useState<string | null>(
    null,
  );
  const [droppedSquadId, setDroppedSquadId] = useState<string | null>(null);
  const lastPlaceholderIndexRef = useRef<number | null>(null);
  const draggingSquadIdRef = useRef<string | null>(null);
  const dropPulseScale = useRef(new Animated.Value(1)).current;
  const dropPulseGlow = useRef(new Animated.Value(0)).current;

  // Load draft settings data
  useEffect(() => {
    if (draftSettings) {
      const settings = draftSettings as any;

      if (settings.draftTime) {
        const date = new Date(settings.draftTime);
        setDraftTime(date);
        setTempDateTime(date);
      } else {
        setTempDateTime(new Date());
      }

      if (settings.secondsPerPick) {
        const totalSeconds = settings.secondsPerPick;
        setSecondsPerPick(totalSeconds);
        setTimeHours(Math.floor(totalSeconds / 3600));
        setTimeMinutes(Math.floor((totalSeconds % 3600) / 60));
        setTimeSeconds(totalSeconds % 60);
      }

      const mode = (settings?.draftOrderMode || null) as DraftOrderMode;
      const parsedOrder: DraftOrderItem[] = Array.isArray(settings?.draftOrder)
        ? settings.draftOrder.map((item: any, index: number) => ({
            squadId: String(item?.squadId || item?._id || item?.id || ""),
            name: String(item?.name || `Squad ${index + 1}`),
            imageUrl: item?.imageUrl ? String(item.imageUrl) : undefined,
            draftSlot: Number(item?.draftSlot || index + 1),
          }))
        : [];

      const normalizedOrder = parsedOrder
        .filter((item) => item.squadId)
        .sort((a, b) => Number(a.draftSlot || 0) - Number(b.draftSlot || 0))
        .map((item, index) => ({ ...item, draftSlot: index + 1 }));

      setDraftOrderMode(mode);
      setDraftOrder(normalizedOrder);
      setSavedManualOrder(normalizedOrder);
    }
  }, [draftSettings]);

  const draftStatus = String((draftSettings as any)?.status || "");
  const isDraftSettingsLocked =
    draftStatus === "in_progress" || draftStatus === "completed";

  const handleSave = useCallback(async () => {
    if (!leagueId || !accessToken) return;
    if (isDraftSettingsLocked) {
      showNotification(
        "Draft has started. Draft settings can no longer be edited.",
        "error",
      );
      return;
    }

    setIsSaving(true);

    try {
      const updateData: any = {};

      if (draftTime) {
        const dateWithZeroSeconds = new Date(draftTime);
        dateWithZeroSeconds.setSeconds(0, 0);
        updateData.draftTime = dateWithZeroSeconds.toISOString();
      }

      const totalSeconds = timeHours * 3600 + timeMinutes * 60 + timeSeconds;
      if (totalSeconds > 0) {
        updateData.secondsPerPick = totalSeconds;
      }

      await leagueApi.updateDraftSettings(
        {
          seasonId: seasonId || undefined,
          leagueId: seasonId ? undefined : leagueId,
        },
        updateData,
        accessToken,
      );

      await queryClient.invalidateQueries({
        queryKey: ["league-draft-settings"],
        exact: false,
      });

      showNotification("Draft settings updated successfully", "success");
      backOrReplace(router, `/(tabs)/league/${leagueId}` as any);
    } catch (error: any) {
      showNotification(
        error?.message || "Failed to update draft settings",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    leagueId,
    accessToken,
    draftTime,
    timeHours,
    timeMinutes,
    timeSeconds,
    seasonId,
    queryClient,
    showNotification,
    router,
    isDraftSettingsLocked,
  ]);

  const handleBack = useCallback(() => {
    const hasUnsavedManualOrder =
      draftOrderMode === "manual" &&
      JSON.stringify(draftOrder.map((item) => item.squadId)) !==
        JSON.stringify(savedManualOrder.map((item) => item.squadId));
    if (hasUnsavedManualOrder) {
      Alert.alert(
        "Unsaved draft order",
        "You have unsaved manual order changes. Leave without saving?",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: () =>
              backOrReplace(router, `/(tabs)/league/${leagueId}` as any),
          },
        ],
      );
      return;
    }
    backOrReplace(router, `/(tabs)/league/${leagueId}` as any);
  }, [router, leagueId, draftOrder, savedManualOrder, draftOrderMode]);

  const refreshDraftSettings = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["league-draft-settings"],
      exact: false,
    });
  }, [queryClient]);

  const handleSetDraftOrderMode = useCallback(
    async (mode: "random" | "manual") => {
      if (!leagueId || !accessToken || isDraftSettingsLocked) return;
      try {
        setIsSavingDraftOrder(true);
        const response = await leagueApi.setDraftOrderMode(
          {
            seasonId: seasonId || undefined,
            leagueId: seasonId ? undefined : leagueId,
          },
          mode,
          accessToken,
        );
        const nextOrder = Array.isArray((response as any)?.draftOrder)
          ? (response as any).draftOrder.map((item: any, index: number) => ({
              squadId: String(item?.squadId || ""),
              name: String(item?.name || `Squad ${index + 1}`),
              imageUrl: item?.imageUrl ? String(item.imageUrl) : undefined,
              draftSlot: Number(item?.draftSlot || index + 1),
            }))
          : draftOrder;
        setDraftOrderMode(mode);
        setDraftOrder(nextOrder);
        setSavedManualOrder(nextOrder);
        await refreshDraftSettings();
        showNotification(
          mode === "manual"
            ? "Manual draft order enabled"
            : "Random draft order generated",
          "success",
        );
      } catch (error: any) {
        showNotification(
          error?.message || "Could not update draft order mode",
          "error",
        );
      } finally {
        setIsSavingDraftOrder(false);
      }
    },
    [
      leagueId,
      accessToken,
      isDraftSettingsLocked,
      seasonId,
      draftOrder,
      refreshDraftSettings,
      showNotification,
    ],
  );

  const handleRandomizeManualOrder = useCallback(async () => {
    if (isDraftSettingsLocked || draftOrderMode !== "manual") return;
    const shuffled = [...draftOrder]
      .sort(() => Math.random() - 0.5)
      .map((item, index) => ({ ...item, draftSlot: index + 1 }));
    setDraftOrder(shuffled);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isDraftSettingsLocked, draftOrderMode, draftOrder]);

  const handleResetManualOrder = useCallback(() => {
    if (isDraftSettingsLocked || draftOrderMode !== "manual") return;
    setDraftOrder(savedManualOrder.map((item) => ({ ...item })));
  }, [isDraftSettingsLocked, draftOrderMode, savedManualOrder]);

  const handleSaveManualOrder = useCallback(async () => {
    if (!leagueId || !accessToken || draftOrderMode !== "manual") return;
    try {
      setIsSavingDraftOrder(true);
      const response = await leagueApi.saveManualDraftOrder(
        {
          seasonId: seasonId || undefined,
          leagueId: seasonId ? undefined : leagueId,
        },
        draftOrder.map((item) => item.squadId),
        accessToken,
      );
      const nextOrder = Array.isArray((response as any)?.draftOrder)
        ? (response as any).draftOrder.map((item: any, index: number) => ({
            squadId: String(item?.squadId || ""),
            name: String(item?.name || `Squad ${index + 1}`),
            imageUrl: item?.imageUrl ? String(item.imageUrl) : undefined,
            draftSlot: Number(item?.draftSlot || index + 1),
          }))
        : draftOrder;
      setDraftOrder(nextOrder);
      setSavedManualOrder(nextOrder);
      await refreshDraftSettings();
      showNotification("Manual draft order saved", "success");
    } catch (error: any) {
      showNotification(
        error?.message || "Failed to save manual order",
        "error",
      );
    } finally {
      setIsSavingDraftOrder(false);
    }
  }, [
    leagueId,
    accessToken,
    draftOrderMode,
    seasonId,
    draftOrder,
    refreshDraftSettings,
    showNotification,
  ]);

  const renderDraftOrderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<DraftOrderItem>) => {
      const index = (typeof getIndex === "function" ? getIndex() : null) ?? 0;
      const isHandlePressed = pressedDragHandleId === item.squadId;
      const isRowDragging = isActive || draggedSquadId === item.squadId;
      const isJustDropped = droppedSquadId === item.squadId;
      return (
        <Animated.View
          style={[
            styles.draftOrderRow,
            isRowDragging && styles.draftOrderRowActive,
            isHandlePressed && styles.draftOrderRowPressed,
            isJustDropped && styles.draftOrderRowDropped,
            isJustDropped && {
              transform: [{ scale: dropPulseScale }],
            },
          ]}
        >
          {isJustDropped ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.dropPulseOverlay,
                {
                  opacity: dropPulseGlow,
                },
              ]}
            />
          ) : null}
          <View
            style={[
              styles.draftOrderActiveRail,
              isRowDragging && styles.draftOrderActiveRailVisible,
            ]}
          />
          <View style={styles.draftOrderSlotBadge}>
            <Text style={styles.draftOrderSlotText}>{index + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.draftOrderName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.draftOrderSubtext}>Squad</Text>
          </View>
          <TouchableOpacity
            onPressIn={() => {
              if (isDraftSettingsLocked) return;
              setPressedDragHandleId(item.squadId);
            }}
            onPressOut={() => {
              setPressedDragHandleId((current) =>
                current === item.squadId ? null : current,
              );
            }}
            onLongPress={
              isDraftSettingsLocked
                ? undefined
                : () => {
                    void Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Medium,
                    );
                    setDraggedSquadId(item.squadId);
                    drag();
                  }
            }
            delayLongPress={165}
            disabled={isDraftSettingsLocked}
            activeOpacity={0.75}
            style={[
              styles.dragHandleButton,
              (isRowDragging || isHandlePressed) &&
                styles.dragHandleButtonActive,
            ]}
          >
            <MaterialIcons
              name="drag-indicator"
              size={22}
              color={
                isDraftSettingsLocked
                  ? TEXT.quaternary
                  : isRowDragging || isHandlePressed
                    ? BRAND.primary
                    : TEXT.secondary
              }
            />
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [
      draggedSquadId,
      dropPulseGlow,
      dropPulseScale,
      droppedSquadId,
      isDraftSettingsLocked,
      pressedDragHandleId,
    ],
  );

  const hasUnsavedManualOrder =
    draftOrderMode === "manual" &&
    JSON.stringify(draftOrder.map((item) => item.squadId)) !==
      JSON.stringify(savedManualOrder.map((item) => item.squadId));

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      const dateWithZeroSeconds = new Date(selectedDate);
      dateWithZeroSeconds.setSeconds(0, 0);
      setTempDateTime(dateWithZeroSeconds);
      setDraftTime(dateWithZeroSeconds);
    } else if (event.type === "dismissed") {
      setShowDatePicker(false);
    }
  }, []);

  const handleDateConfirm = useCallback(() => {
    const dateWithZeroSeconds = new Date(tempDateTime);
    dateWithZeroSeconds.setSeconds(0, 0);
    setDraftTime(dateWithZeroSeconds);
    setShowDatePicker(false);
  }, [tempDateTime]);

  const handleDateCancel = useCallback(() => {
    if (draftTime) {
      setTempDateTime(draftTime);
    }
    setShowDatePicker(false);
  }, [draftTime]);

  const handleTimeConfirm = useCallback(() => {
    const total = timeHours * 3600 + timeMinutes * 60 + timeSeconds;
    setSecondsPerPick(total);
    setShowTimePicker(false);
  }, [timeHours, timeMinutes, timeSeconds]);

  const handleTimeCancel = useCallback(() => {
    setTimeHours(Math.floor(secondsPerPick / 3600));
    setTimeMinutes(Math.floor((secondsPerPick % 3600) / 60));
    setTimeSeconds(secondsPerPick % 60);
    setShowTimePicker(false);
  }, [secondsPerPick]);

  const formatDraftTime = (date: Date | null): string => {
    if (!date) return "Not set";
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Read-only values
  const draftType = (draftSettings as any)?.draftType || "Snake";
  const autoStart = (draftSettings as any)?.autoStart ?? false;
  const rounds = (draftSettings as any)?.rounds || 15;

  if (isLoadingDraftSettings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND.primary} />
        <Text style={styles.loadingText}>Loading draft settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavigation
        title="Draft Settings"
        showBackButton
        onBackPress={handleBack}
        rightText={{
          text: isDraftSettingsLocked ? "Locked" : "Save",
          onPress: isDraftSettingsLocked ? () => {} : handleSave,
          textStyle: styles.saveButton,
        }}
      />

      <NestableScrollContainer
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isDraftSettingsLocked && (
          <View style={styles.lockedBanner}>
            <MaterialIcons
              name="lock-outline"
              size={18}
              color={ACCENT.warning}
            />
            <Text style={styles.lockedBannerText}>
              Draft has started. Draft settings are now read-only.
            </Text>
          </View>
        )}

        {/* Editable Settings */}
        <SettingsSection
          title="Draft Schedule"
          subtitle="Configure when and how your draft runs"
          icon="event"
          showDivider
        >
          <View style={styles.orderModeContainer}>
            <Text style={styles.orderModeLabel}>Draft Order Mode</Text>
            <View style={styles.orderModeButtons}>
              <TouchableOpacity
                onPress={() => handleSetDraftOrderMode("random")}
                disabled={isDraftSettingsLocked || isSavingDraftOrder}
                style={[
                  styles.orderModeButton,
                  draftOrderMode === "random" && styles.orderModeButtonSelected,
                  (isDraftSettingsLocked || isSavingDraftOrder) &&
                    styles.orderModeButtonDisabled,
                ]}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="shuffle"
                  size={16}
                  color={draftOrderMode === "random" ? "#FFF" : BRAND.primary}
                />
                <Text
                  style={[
                    styles.orderModeButtonText,
                    draftOrderMode === "random" &&
                      styles.orderModeButtonTextSelected,
                  ]}
                >
                  Random
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSetDraftOrderMode("manual")}
                disabled={isDraftSettingsLocked || isSavingDraftOrder}
                style={[
                  styles.orderModeButton,
                  draftOrderMode === "manual" && styles.orderModeButtonSelected,
                  (isDraftSettingsLocked || isSavingDraftOrder) &&
                    styles.orderModeButtonDisabled,
                ]}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="drag-indicator"
                  size={16}
                  color={draftOrderMode === "manual" ? "#FFF" : BRAND.primary}
                />
                <Text
                  style={[
                    styles.orderModeButtonText,
                    draftOrderMode === "manual" &&
                      styles.orderModeButtonTextSelected,
                  ]}
                >
                  Manual
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {draftOrderMode === "manual" && (
            <View style={styles.manualOrderWrap}>
              <Text style={styles.manualOrderHint}>
                Drag and drop squads into order. Slot 1 picks first.
              </Text>
              <Text style={styles.manualOrderSubHint}>
                Hold the drag handle on the right to reorder.
              </Text>

              <NestableDraggableFlatList
                data={draftOrder}
                keyExtractor={(item) => item.squadId}
                renderItem={renderDraftOrderItem}
                onDragBegin={(index) => {
                  const draggingItem = draftOrder[index];
                  const dragId = draggingItem?.squadId || null;
                  setIsDraggingDraftOrder(true);
                  setDraggedSquadId(dragId);
                  draggingSquadIdRef.current = dragId;
                  lastPlaceholderIndexRef.current = index;
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                onPlaceholderIndexChange={(index) => {
                  if (lastPlaceholderIndexRef.current === index) return;
                  lastPlaceholderIndexRef.current = index;
                  void Haptics.selectionAsync();
                }}
                onRelease={() => {
                  setPressedDragHandleId(null);
                }}
                onDragEnd={async ({ data }) => {
                  const normalized = data.map((item, index) => ({
                    ...item,
                    draftSlot: index + 1,
                  }));
                  const placeholderIndex = lastPlaceholderIndexRef.current;
                  const draggedId = draggingSquadIdRef.current;
                  const droppedIndex =
                    placeholderIndex !== null
                      ? placeholderIndex
                      : Math.max(
                          0,
                          normalized.findIndex(
                            (entry) => entry.squadId === draggedId,
                          ),
                        );
                  const droppedItem = normalized[droppedIndex] || null;
                  const finalDroppedSquadId =
                    droppedItem?.squadId || draggedId || null;

                  setIsDraggingDraftOrder(false);
                  setDraggedSquadId(null);
                  setPressedDragHandleId(null);
                  lastPlaceholderIndexRef.current = null;
                  draggingSquadIdRef.current = null;
                  setDraftOrder(normalized);
                  if (finalDroppedSquadId) {
                    setDroppedSquadId(finalDroppedSquadId);
                    dropPulseScale.setValue(1);
                    dropPulseGlow.setValue(0);
                    Animated.parallel([
                      Animated.sequence([
                        Animated.spring(dropPulseScale, {
                          toValue: 1.022,
                          speed: 30,
                          bounciness: 7,
                          useNativeDriver: true,
                        }),
                        Animated.spring(dropPulseScale, {
                          toValue: 1,
                          speed: 28,
                          bounciness: 6,
                          useNativeDriver: true,
                        }),
                      ]),
                      Animated.sequence([
                        Animated.timing(dropPulseGlow, {
                          toValue: 1,
                          duration: 120,
                          useNativeDriver: true,
                        }),
                        Animated.timing(dropPulseGlow, {
                          toValue: 0,
                          duration: 220,
                          useNativeDriver: true,
                        }),
                      ]),
                    ]).start(() => {
                      setDroppedSquadId(null);
                    });
                  }
                  await Haptics.selectionAsync();
                }}
                activationDistance={24}
                dragItemOverflow={false}
                autoscrollThreshold={32}
                autoscrollSpeed={90}
                animationConfig={{
                  damping: 20,
                  stiffness: 240,
                  mass: 0.28,
                  overshootClamping: false,
                }}
                scrollEnabled={false}
                contentContainerStyle={styles.draftOrderListContent}
                containerStyle={styles.draftOrderList}
              />

              {isDraggingDraftOrder ? (
                <Text style={styles.draggingHint}>
                  Release to set draft slot order.
                </Text>
              ) : null}

              <View style={styles.manualOrderActionsRow}>
                <TouchableOpacity
                  onPress={handleRandomizeManualOrder}
                  disabled={isDraftSettingsLocked || isSavingDraftOrder}
                  style={styles.manualOrderAction}
                >
                  <Text style={styles.manualOrderActionText}>Randomize</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleResetManualOrder}
                  disabled={isDraftSettingsLocked || isSavingDraftOrder}
                  style={styles.manualOrderAction}
                >
                  <Text style={styles.manualOrderActionText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveManualOrder}
                  disabled={
                    isDraftSettingsLocked ||
                    isSavingDraftOrder ||
                    !hasUnsavedManualOrder
                  }
                  style={[
                    styles.manualOrderActionPrimary,
                    (!hasUnsavedManualOrder || isDraftSettingsLocked) &&
                      styles.manualOrderActionPrimaryDisabled,
                  ]}
                >
                  <Text style={styles.manualOrderActionPrimaryText}>
                    Save Order
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TimePickerButton
            label="Draft Date & Time"
            value={formatDraftTime(draftTime)}
            icon="calendar-today"
            onPress={() => setShowDatePicker(true)}
            hasValue={draftTime !== null}
            disabled={isDraftSettingsLocked}
          />

          <TimePickerButton
            label="Time Per Pick"
            value={
              secondsPerPick > 0
                ? formatTimeReadable(secondsPerPick)
                : "Not set"
            }
            icon="timer"
            onPress={() => setShowTimePicker(true)}
            hasValue={secondsPerPick > 0}
            disabled={isDraftSettingsLocked}
          />
        </SettingsSection>

        {/* Read-Only Configuration */}
        <SettingsSection
          title="Draft Configuration"
          subtitle="These settings are configured at league creation"
          icon="settings"
        >
          <View style={styles.infoCard}>
            <InfoRow label="Draft Type" value={draftType} icon="swap-vert" />
            <InfoRow
              label="Auto Start"
              value={autoStart ? "Yes" : "No"}
              icon="play-circle-outline"
            />
            <InfoRow
              label="Total Rounds"
              value={String(rounds)}
              icon="repeat"
            />
          </View>
        </SettingsSection>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <MeshButton
            title={isDraftSettingsLocked ? "Draft Started" : "Save Changes"}
            onPress={handleSave}
            variant="primary"
            loading={isSaving}
            disabled={isSaving || isDraftSettingsLocked}
          />
        </View>
      </NestableScrollContainer>

      {/* Date/Time Picker Modal - iOS */}
      {Platform.OS === "ios" && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={handleDateCancel}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={handleDateCancel}
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Draft Date & Time</Text>
                <TouchableOpacity
                  onPress={handleDateCancel}
                  style={styles.modalCloseButton}
                >
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={TEXT.secondary}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={tempDateTime}
                  mode="datetime"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  textColor="#FFFFFF"
                  themeVariant="dark"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={handleDateCancel}
                  style={styles.modalActionSecondary}
                >
                  <Text style={styles.modalActionSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDateConfirm}
                  style={styles.modalActionPrimary}
                >
                  <Text style={styles.modalActionPrimaryText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Date/Time Picker - Android */}
      {Platform.OS === "android" && showDatePicker && (
        <DateTimePicker
          value={tempDateTime}
          mode="datetime"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Per Pick Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={handleTimeCancel}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleTimeCancel}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Time Per Pick</Text>
              <TouchableOpacity
                onPress={handleTimeCancel}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={20} color={TEXT.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.timePickerContainer}>
              {/* Hours */}
              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnLabel}>Hours</Text>
                <ScrollView
                  style={styles.timeScrollView}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.timeScrollContent}
                >
                  {Array.from({ length: 3 }, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setTimeHours(i)}
                      style={[
                        styles.timeOption,
                        timeHours === i && styles.timeOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          timeHours === i && styles.timeOptionTextSelected,
                        ]}
                      >
                        {i}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              {/* Minutes */}
              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnLabel}>Minutes</Text>
                <ScrollView
                  style={styles.timeScrollView}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.timeScrollContent}
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setTimeMinutes(i)}
                      style={[
                        styles.timeOption,
                        timeMinutes === i && styles.timeOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          timeMinutes === i && styles.timeOptionTextSelected,
                        ]}
                      >
                        {i.toString().padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              {/* Seconds */}
              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnLabel}>Seconds</Text>
                <ScrollView
                  style={styles.timeScrollView}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.timeScrollContent}
                >
                  {[0, 15, 30, 45].map((sec) => (
                    <TouchableOpacity
                      key={sec}
                      onPress={() => setTimeSeconds(sec)}
                      style={[
                        styles.timeOption,
                        timeSeconds === sec && styles.timeOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          timeSeconds === sec && styles.timeOptionTextSelected,
                        ]}
                      >
                        {sec.toString().padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Preview */}
            <View style={styles.timePreview}>
              <Text style={styles.timePreviewLabel}>Selected time:</Text>
              <Text style={styles.timePreviewValue}>
                {formatTimeReadable(
                  timeHours * 3600 + timeMinutes * 60 + timeSeconds,
                )}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={handleTimeCancel}
                style={styles.modalActionSecondary}
              >
                <Text style={styles.modalActionSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleTimeConfirm}
                style={styles.modalActionPrimary}
              >
                <Text style={styles.modalActionPrimaryText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE.background,
  },
  loadingText: {
    color: TEXT.secondary,
    fontSize: 14,
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  saveButton: {
    color: BRAND.primary,
    fontWeight: "700",
    fontSize: 16,
  },
  lockedBanner: {
    marginBottom: 16,
    backgroundColor: `${ACCENT.warning}1A`,
    borderColor: `${ACCENT.warning}66`,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lockedBannerText: {
    color: TEXT.light,
    fontSize: 13,
    flex: 1,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: SURFACE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER.medium,
    padding: 16,
    marginBottom: 12,
  },
  pickerButtonDisabled: {
    opacity: 0.55,
  },
  pickerButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  pickerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: ACCENT.redBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  pickerLabel: {
    color: TEXT.secondary,
    fontSize: 13,
    marginBottom: 2,
  },
  pickerValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  pickerValuePlaceholder: {
    color: "#606368",
  },
  infoCard: {
    backgroundColor: SURFACE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER.medium,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.lightest,
  },
  infoRowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoRowIcon: {
    marginRight: 12,
  },
  infoRowLabel: {
    color: TEXT.secondary,
    fontSize: 15,
  },
  infoRowValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonContainer: {
    marginTop: 16,
  },
  orderModeContainer: {
    marginBottom: 12,
  },
  orderModeLabel: {
    color: TEXT.secondary,
    fontSize: 13,
    marginBottom: 8,
  },
  orderModeButtons: {
    flexDirection: "row",
    gap: 10,
  },
  orderModeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.primary,
    backgroundColor: `${BRAND.primary}12`,
    paddingVertical: 10,
  },
  orderModeButtonSelected: {
    backgroundColor: BRAND.primary,
  },
  orderModeButtonDisabled: {
    opacity: 0.55,
  },
  orderModeButtonText: {
    color: BRAND.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  orderModeButtonTextSelected: {
    color: "#FFFFFF",
  },
  manualOrderWrap: {
    marginBottom: 12,
    backgroundColor: SURFACE.elevated,
    borderWidth: 1,
    borderColor: BORDER.medium,
    borderRadius: 12,
    padding: 10,
  },
  manualOrderHint: {
    color: TEXT.secondary,
    fontSize: 12,
    marginBottom: 4,
  },
  manualOrderSubHint: {
    color: TEXT.tertiary,
    fontSize: 11,
    marginBottom: 8,
  },
  draftOrderList: {
    borderRadius: 10,
    overflow: "hidden",
  },
  draftOrderListContent: {
    paddingBottom: 2,
  },
  draftOrderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: SURFACE.card,
    borderWidth: 1,
    borderColor: BORDER.medium,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    position: "relative",
  },
  draftOrderRowActive: {
    borderColor: BRAND.primary,
    backgroundColor: `${BRAND.primary}20`,
    transform: [{ scale: 1.01 }],
    shadowColor: BRAND.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  draftOrderRowPressed: {
    borderColor: `${BRAND.primary}88`,
  },
  draftOrderRowDropped: {
    borderColor: `${BRAND.primary}cc`,
  },
  dropPulseOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    backgroundColor: `${BRAND.primary}20`,
    borderWidth: 1,
    borderColor: `${BRAND.primary}88`,
  },
  draftOrderActiveRail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    backgroundColor: "transparent",
  },
  draftOrderActiveRailVisible: {
    backgroundColor: BRAND.primary,
  },
  draftOrderSlotBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: `${BRAND.primary}24`,
    alignItems: "center",
    justifyContent: "center",
  },
  draftOrderSlotText: {
    color: BRAND.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  draftOrderName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  draftOrderSubtext: {
    color: TEXT.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  dragHandleButton: {
    marginLeft: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  dragHandleButtonActive: {
    borderColor: `${BRAND.primary}aa`,
    backgroundColor: `${BRAND.primary}20`,
    transform: [{ scale: 1.03 }],
  },
  draggingHint: {
    color: BRAND.primary,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    marginBottom: 4,
  },
  manualOrderActionsRow: {
    marginTop: 4,
    flexDirection: "row",
    gap: 8,
  },
  manualOrderAction: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.card,
    paddingVertical: 9,
    alignItems: "center",
  },
  manualOrderActionText: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "700",
  },
  manualOrderActionPrimary: {
    flex: 1.2,
    borderRadius: 10,
    backgroundColor: BRAND.primary,
    paddingVertical: 9,
    alignItems: "center",
  },
  manualOrderActionPrimaryDisabled: {
    opacity: 0.5,
  },
  manualOrderActionPrimaryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: SURFACE.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.medium,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BORDER.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  timePickerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  timeColumn: {
    alignItems: "center",
    flex: 1,
  },
  timeColumnLabel: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
  },
  timeScrollView: {
    height: 160,
  },
  timeScrollContent: {
    alignItems: "center",
  },
  timeOption: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 2,
    minWidth: 60,
    alignItems: "center",
  },
  timeOptionSelected: {
    backgroundColor: BRAND.primary,
  },
  timeOptionText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "500",
  },
  timeOptionTextSelected: {
    fontWeight: "700",
  },
  timeSeparator: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 44,
    paddingHorizontal: 8,
  },
  timePreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER.medium,
  },
  timePreviewLabel: {
    color: TEXT.secondary,
    fontSize: 14,
    marginRight: 8,
  },
  timePreviewValue: {
    color: BRAND.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  modalActionSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    alignItems: "center",
  },
  modalActionSecondaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalActionPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: BRAND.primary,
    alignItems: "center",
  },
  modalActionPrimaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
