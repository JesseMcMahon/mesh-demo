import { MaterialIcons } from "@expo/vector-icons";

export interface CommunityTypeConfig {
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}

/**
 * Maps community type strings to their icon and color configuration
 */
export function getCommunityTypeConfig(type: string): CommunityTypeConfig {
  const lowerType = type.toLowerCase();

  if (lowerType.includes("greeklife") || lowerType.includes("greek")) {
    return { icon: "school", color: "#8261C2" }; // Purple
  }
  if (
    lowerType.includes("customer") ||
    lowerType.includes("engagement") ||
    lowerType.includes("restaurant") ||
    lowerType.includes("bar")
  ) {
    return { icon: "restaurant", color: "#FF9800" }; // Orange
  }
  if (lowerType.includes("business")) {
    return { icon: "business", color: "#2196F3" }; // Blue
  }
  if (lowerType.includes("influencer")) {
    return { icon: "star", color: "#E91E63" }; // Pink
  }
  // Default/Other
  return { icon: "apps", color: "#4CAF50" }; // Green
}
