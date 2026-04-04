import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { TEXT, SEMANTIC } from "@/constants/colors";

interface CountdownTimerProps {
  deadline: string; // ISO string
  onComplete?: () => void;
}

export function CountdownTimer({ deadline, onComplete }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const deadlineTime = new Date(deadline).getTime();
      const difference = deadlineTime - now;

      if (difference <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (onComplete) {
          onComplete();
        }
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [deadline, onComplete]);

  if (timeRemaining === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Calculating...</Text>
      </View>
    );
  }

  const { days, hours, minutes, seconds } = timeRemaining;

  // If all time is 0, show "Time's Up"
  if (days === 0 && hours === 0 && minutes === 0 && seconds === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.text, styles.expiredText]}>Time&apos;s Up</Text>
      </View>
    );
  }

  // Format with leading zeros for single digits
  const formatTime = (value: number) => value.toString().padStart(2, "0");

  return (
    <View style={styles.container}>
      {days > 0 && (
        <View style={styles.timeBlock}>
          <Text style={styles.timeValue}>{formatTime(days)}</Text>
          <Text style={styles.timeLabel}>Day{days !== 1 ? "s" : ""}</Text>
        </View>
      )}
      <View style={styles.timeBlock}>
        <Text style={styles.timeValue}>{formatTime(hours)}</Text>
        <Text style={styles.timeLabel}>Hour{hours !== 1 ? "s" : ""}</Text>
      </View>
      <View style={styles.timeBlock}>
        <Text style={styles.timeValue}>{formatTime(minutes)}</Text>
        <Text style={styles.timeLabel}>Min{minutes !== 1 ? "s" : ""}</Text>
      </View>
      <View style={styles.timeBlock}>
        <Text style={styles.timeValue}>{formatTime(seconds)}</Text>
        <Text style={styles.timeLabel}>Sec{seconds !== 1 ? "s" : ""}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  timeBlock: {
    alignItems: "center",
    minWidth: 60,
  },
  timeValue: {
    color: TEXT.primary,
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  timeLabel: {
    color: TEXT.secondary,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  text: {
    color: TEXT.primary,
    fontSize: 24,
    fontWeight: "600",
  },
  expiredText: {
    color: SEMANTIC.error,
    fontSize: 28,
    fontWeight: "700",
  },
});
