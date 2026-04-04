import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SURFACE, TEXT, BORDER, ACTIVITY_COLORS } from "@/constants/colors";

export type ActivityType = "vote" | "trade" | "pickup" | "drop" | "win" | "loss" | "matchup" | "milestone";

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  subtitle?: string;
  timestamp: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
}

interface ActivityFeedCardProps {
  title?: string;
  activities: ActivityItem[];
  onViewAllPress?: () => void;
  onActivityPress?: (activity: ActivityItem) => void;
  maxItems?: number;
  emptyMessage?: string;
}

const getActivityConfig = (type: ActivityType) => {
  switch (type) {
    case "vote":
      return { icon: "how-to-vote", color: ACTIVITY_COLORS.vote };
    case "trade":
      return { icon: "swap-horiz", color: ACTIVITY_COLORS.trade };
    case "pickup":
      return { icon: "add-circle", color: ACTIVITY_COLORS.pickup };
    case "drop":
      return { icon: "remove-circle", color: ACTIVITY_COLORS.drop };
    case "win":
      return { icon: "emoji-events", color: ACTIVITY_COLORS.win };
    case "loss":
      return { icon: "sentiment-dissatisfied", color: ACTIVITY_COLORS.loss };
    case "matchup":
      return { icon: "sports-football", color: ACTIVITY_COLORS.matchup };
    case "milestone":
      return { icon: "stars", color: ACTIVITY_COLORS.milestone };
    default:
      return { icon: "info", color: TEXT.secondary };
  }
};

export const ActivityFeedCard = React.memo(function ActivityFeedCard({
  title = "Recent Activity",
  activities,
  onViewAllPress,
  onActivityPress,
  maxItems = 5,
  emptyMessage = "No recent activity",
}: ActivityFeedCardProps) {
  const displayedActivities = activities.slice(0, maxItems);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onViewAllPress && activities.length > maxItems && (
          <TouchableOpacity onPress={onViewAllPress} activeOpacity={0.7}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Activity List */}
      {displayedActivities.length > 0 ? (
        <View style={styles.list}>
          {displayedActivities.map((activity, index) => {
            const config = getActivityConfig(activity.type);
            const isLast = index === displayedActivities.length - 1;

            return (
              <TouchableOpacity
                key={activity.id}
                style={[styles.activityItem, !isLast && styles.activityItemBorder]}
                onPress={() => onActivityPress?.(activity)}
                activeOpacity={onActivityPress ? 0.7 : 1}
              >
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: `${config.color}20` },
                  ]}
                >
                  <MaterialIcons
                    name={(activity.icon || config.icon) as keyof typeof MaterialIcons.glyphMap}
                    size={18}
                    color={config.color}
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {activity.title}
                  </Text>
                  {activity.subtitle && (
                    <Text style={styles.activitySubtitle} numberOfLines={1}>
                      {activity.subtitle}
                    </Text>
                  )}
                </View>
                <Text style={styles.activityTimestamp}>{activity.timestamp}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons name="inbox" size={32} color={TEXT.quaternary} />
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACE.cardTransparent,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER.medium,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.medium,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  viewAll: {
    color: ACTIVITY_COLORS.vote,
    fontSize: 14,
    fontWeight: "600",
  },
  list: {},
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER.lightest,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  activitySubtitle: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  activityTimestamp: {
    color: TEXT.tertiary,
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    color: TEXT.secondary,
    fontSize: 14,
    marginTop: 8,
  },
});
