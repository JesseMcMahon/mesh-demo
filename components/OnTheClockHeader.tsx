import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { BRAND, SURFACE, TEXT, BORDER, ACCENT, SEMANTIC } from "@/constants/colors";

interface OnTheClockHeaderProps {
  squadName: string;
  squadImageUrl?: string;
  pickDeadline: string;
  isMyTurn: boolean;
  pickNumber: number;
  currentRound: number;
  totalRounds: number;
  isLocking?: boolean;
  lockCountdown?: number | null;
}

export const OnTheClockHeader = React.memo(function OnTheClockHeader({
  squadName,
  squadImageUrl,
  pickDeadline,
  isMyTurn,
  pickNumber,
  currentRound,
  totalRounds,
  isLocking = false,
  lockCountdown = null,
}: OnTheClockHeaderProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    minutes: number;
    seconds: number;
  } | null>(null);

  const calculateTimeRemaining = useCallback(() => {
    const now = new Date().getTime();
    const deadlineTime = new Date(pickDeadline).getTime();
    const difference = deadlineTime - now;

    if (difference <= 0) {
      return { minutes: 0, seconds: 0 };
    }

    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { minutes, seconds };
  }, [pickDeadline]);

  useEffect(() => {
    // Calculate immediately
    setTimeRemaining(calculateTimeRemaining());

    // Update every second
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateTimeRemaining]);

  const formatTime = (value: number) => value.toString().padStart(2, "0");

  // Get initials for avatar placeholder
  const getInitials = (name: string) => {
    if (!name || !name.trim()) return "TM";
    const words = name.split(" ");
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isTimeUp =
    timeRemaining &&
    timeRemaining.minutes === 0 &&
    timeRemaining.seconds === 0;

  return (
    <View style={[styles.container, isMyTurn && styles.myTurnContainer]}>
      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <MaterialIcons name="layers" size={13} color={TEXT.secondary} />
          <Text style={styles.metaPillText}>
            Round {currentRound}/{totalRounds}
          </Text>
        </View>
        <View style={styles.metaPill}>
          <MaterialIcons name="confirmation-number" size={13} color={TEXT.secondary} />
          <Text style={styles.metaPillText}>Pick {pickNumber}</Text>
        </View>
        {isMyTurn && (
          <View style={styles.yourTurnBadge}>
            <Text style={styles.yourTurnText}>YOUR TURN</Text>
          </View>
        )}
      </View>

      <View style={styles.contentRow}>
        <View style={styles.squadIdentity}>
          <View style={styles.avatarSection}>
            {squadImageUrl ? (
              <ExpoImage
                source={{ uri: squadImageUrl }}
                style={styles.avatar}
                contentFit="cover"
                transition={120}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.avatarPlaceholder, isMyTurn && styles.myTurnAvatarPlaceholder]}>
                <Text style={styles.avatarInitials}>{getInitials(squadName)}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.onTheClockLabel}>ON THE CLOCK</Text>
            <Text style={styles.squadName} numberOfLines={1}>
              {squadName}
            </Text>
            <Text style={styles.pickInfo}>
              Make your selection before time expires
            </Text>
          </View>
        </View>

        <View style={styles.timerSection}>
          <Text style={styles.timerLabel}>Time</Text>
          {isLocking && lockCountdown !== null ? (
            <View style={styles.lockingContainer}>
              <MaterialIcons name="lock" size={18} color="#F5C842" />
              <Text style={styles.lockingText}>{formatTime(lockCountdown)}</Text>
            </View>
          ) : isTimeUp ? (
            <View style={styles.timeUpContainer}>
              <MaterialIcons name="timer-off" size={22} color={SEMANTIC.error} />
              <Text style={styles.timeUpText}>AUTO</Text>
            </View>
          ) : timeRemaining ? (
            <View style={styles.timerContainer}>
              <MaterialIcons
                name="schedule"
                size={18}
                color={isMyTurn ? BRAND.primary : TEXT.secondary}
              />
              <Text style={[styles.timerText, isMyTurn && styles.myTurnTimerText]}>
                {formatTime(timeRemaining.minutes)}:{formatTime(timeRemaining.seconds)}
              </Text>
            </View>
          ) : (
            <Text style={styles.loadingText}>--:--</Text>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: SURFACE.card,
    borderWidth: 1,
    borderColor: BORDER.medium,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
  },
  myTurnContainer: {
    backgroundColor: ACCENT.primaryBgLight,
    borderColor: ACCENT.primaryBorder,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaPillText: {
    color: TEXT.secondary,
    fontSize: 11,
    fontWeight: "700",
  },
  yourTurnBadge: {
    marginLeft: "auto",
    backgroundColor: BRAND.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  yourTurnText: {
    color: TEXT.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  squadIdentity: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  avatarSection: {
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: SURFACE.card,
    borderWidth: 1,
    borderColor: BORDER.medium,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: SURFACE.highest,
    justifyContent: "center",
    alignItems: "center",
  },
  myTurnAvatarPlaceholder: {
    backgroundColor: BRAND.primary,
  },
  avatarInitials: {
    color: TEXT.primary,
    fontSize: 17,
    fontWeight: "800",
  },
  infoSection: {
    flex: 1,
    minWidth: 0,
  },
  onTheClockLabel: {
    color: TEXT.secondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  squadName: {
    color: TEXT.primary,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 3,
  },
  pickInfo: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "500",
  },
  timerSection: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 112,
    gap: 4,
  },
  timerLabel: {
    color: TEXT.secondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE.elevated,
    borderWidth: 1,
    borderColor: BORDER.medium,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    gap: 6,
    minWidth: 112,
  },
  timerText: {
    color: TEXT.primary,
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  myTurnTimerText: {
    color: BRAND.primary,
  },
  lockingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5C84220",
    borderWidth: 1,
    borderColor: "#F5C84266",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    gap: 6,
    minWidth: 112,
  },
  lockingText: {
    color: "#F5C842",
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  timeUpContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${SEMANTIC.error}20`,
    borderWidth: 1,
    borderColor: `${SEMANTIC.error}55`,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    minWidth: 112,
  },
  timeUpText: {
    color: SEMANTIC.error,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
  },
  loadingText: {
    color: TEXT.secondary,
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "monospace",
  },
});
