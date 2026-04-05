export type DemoFeatureId =
  | "lineup"
  | "locker"
  | "crib"
  | "economy"
  | "battlepass"
  | "gems"
  | "taunts";

export interface DemoFeature {
  id: DemoFeatureId;
  title: string;
  subtitle: string;
  route: string;
  xpReward: number;
  gemReward: number;
}

export const DEMO_FEATURES: DemoFeature[] = [
  {
    id: "lineup",
    title: "Set Lineup Impact",
    subtitle: "See how lineup decisions move projections in real time.",
    route: "/(investor-demo)/lineup-demo",
    xpReward: 120,
    gemReward: 25,
  },
  {
    id: "locker",
    title: "Locker Room",
    subtitle: "Achievement wall with rarity, streaks, and prestige rewards.",
    route: "/(investor-demo)/locker-room",
    xpReward: 90,
    gemReward: 20,
  },
  {
    id: "crib",
    title: "Crib Showcase",
    subtitle: "Personal trophy room inspired by classic sports game progression.",
    route: "/(investor-demo)/crib",
    xpReward: 100,
    gemReward: 22,
  },
  {
    id: "economy",
    title: "Live Economy Engine",
    subtitle:
      "Live moments, sponsor rewards, and squad progression in one reactive loop.",
    route: "/(investor-demo)/live-economy",
    xpReward: 130,
    gemReward: 28,
  },
  {
    id: "battlepass",
    title: "Battle Pass",
    subtitle: "Scrollable seasonal track for cosmetics, themes, and packs.",
    route: "/(investor-demo)/battle-pass",
    xpReward: 110,
    gemReward: 24,
  },
  {
    id: "gems",
    title: "Gems + XP Loop",
    subtitle: "Every action feeds progression and unlock momentum.",
    route: "/(investor-demo)/gems-xp",
    xpReward: 80,
    gemReward: 18,
  },
  {
    id: "taunts",
    title: "Taunt Triggers",
    subtitle: "Contextual taunts fire at hype gameplay moments.",
    route: "/(investor-demo)/taunts",
    xpReward: 95,
    gemReward: 21,
  },
];

export const TAUNT_TRIGGERS = [
  "Saquon Barkley just scored his second touchdown!",
  "Harrison Butker just made a 60-yard field goal!",
  "Puka Nacua just scored a 50-yard touchdown!",
  "Your squad just crossed 150 points!",
];

export function getFeatureById(featureId: DemoFeatureId) {
  return DEMO_FEATURES.find((feature) => feature.id === featureId) || null;
}

export function getNextFeature(featureId: DemoFeatureId) {
  const index = DEMO_FEATURES.findIndex((feature) => feature.id === featureId);
  if (index < 0 || index >= DEMO_FEATURES.length - 1) {
    return null;
  }
  return DEMO_FEATURES[index + 1];
}
