export type DemoUnlockItemId =
  | "red_armor"
  | "blue_armor"
  | "common_football"
  | "chrome_football";

export type DemoSuitId = "character_example" | "red_armor" | "blue_armor";
export type DemoFootballId = "none" | "common_football" | "chrome_football";
type DemoAvatarComboKey = `${DemoSuitId}__${DemoFootballId}`;

export type DemoProgressStep =
  | "intro"
  | "ready_for_first_action"
  | "first_unlock_done"
  | "ready_for_second_action"
  | "second_unlock_done"
  | "go_to_locker";

export type DemoRevealStage = "level5" | "level10" | null;

export interface DemoUnlockItemDefinition {
  id: DemoUnlockItemId;
  name: string;
  kind: "suit" | "football";
  rarity: "common" | "rare";
  unlockLevel: 5 | 10;
  image: number;
  lane: "Free" | "Premium";
  description: string;
}

export interface DemoBattlePassTier {
  level: number;
  challenge: string;
  rewards: Array<
    | {
        type: "unlockable";
        itemId: DemoUnlockItemId;
      }
    | {
        type: "meta";
        id: string;
        name: string;
        lane: "Free" | "Premium";
        icon: string;
      }
  >;
}

export const DEMO_AVATAR_IMAGES: Record<DemoSuitId, number> = {
  character_example: require("../assets/demo-assets/base-character-no-items.png"),
  red_armor: require("../assets/demo-assets/red-armor-unlockable.png"),
  blue_armor: require("../assets/demo-assets/blue-armor-unlockable.png"),
};

export const DEMO_FOOTBALL_IMAGES: Record<Exclude<DemoFootballId, "none">, number> = {
  common_football: require("../assets/demo-assets/common-football-unlockable.png"),
  chrome_football: require("../assets/demo-assets/chrome-football-unlockable.png"),
};

const DEMO_AVATAR_COMBO_IMAGES: Record<DemoAvatarComboKey, number> = {
  character_example__none: require("../assets/demo-assets/base-character-no-items.png"),
  character_example__common_football: require("../assets/demo-assets/base-character-common-football.png"),
  character_example__chrome_football: require("../assets/demo-assets/base-character-chrome-football.png"),
  red_armor__none: require("../assets/demo-assets/red-suit-no-football.png"),
  red_armor__common_football: require("../assets/demo-assets/red-suit-common-football.png"),
  red_armor__chrome_football: require("../assets/demo-assets/red-suit-chrome-football.png"),
  blue_armor__none: require("../assets/demo-assets/blue-suit-no-football.png"),
  blue_armor__common_football: require("../assets/demo-assets/blue-suit-common-football.png"),
  blue_armor__chrome_football: require("../assets/demo-assets/blue-suit-chrome-football.png"),
};

export function getDemoAvatarPreviewImage(suit: DemoSuitId, football: DemoFootballId): number {
  return DEMO_AVATAR_COMBO_IMAGES[`${suit}__${football}`];
}

export const DEMO_UNLOCK_ITEMS: Record<DemoUnlockItemId, DemoUnlockItemDefinition> = {
  red_armor: {
    id: "red_armor",
    name: "Crimson Rival Suit",
    kind: "suit",
    rarity: "common",
    unlockLevel: 5,
    image: require("../assets/demo-assets/red-armor-unlockable.png"),
    lane: "Free",
    description: "Aggressive red game-day armor for rivalry weeks.",
  },
  common_football: {
    id: "common_football",
    name: "Classic Gridiron Ball",
    kind: "football",
    rarity: "common",
    unlockLevel: 5,
    image: require("../assets/demo-assets/common-football-unlockable.png"),
    lane: "Premium",
    description: "Starter football skin unlocked with your first progression milestone.",
  },
  blue_armor: {
    id: "blue_armor",
    name: "Neon Velocity Suit",
    kind: "suit",
    rarity: "rare",
    unlockLevel: 10,
    image: require("../assets/demo-assets/blue-armor-unlockable.png"),
    lane: "Premium",
    description: "High-tier suit variant with electric trim and elite status vibes.",
  },
  chrome_football: {
    id: "chrome_football",
    name: "Chrome Pulse Football",
    kind: "football",
    rarity: "rare",
    unlockLevel: 10,
    image: require("../assets/demo-assets/chrome-football-unlockable.png"),
    lane: "Free",
    description: "Mirror-finish football skin reserved for higher battle pass tiers.",
  },
};

export const LEVEL_UNLOCKS: Record<5 | 10, DemoUnlockItemId[]> = {
  5: ["red_armor", "common_football"],
  10: ["chrome_football", "blue_armor"],
};

export const DEMO_BATTLE_PASS_TIERS: DemoBattlePassTier[] = [
  {
    level: 1,
    challenge: "Enter demo season and prepare your loadout.",
    rewards: [
      {
        type: "meta",
        id: "tier1-gems",
        name: "+50 Gems",
        lane: "Free",
        icon: "diamond",
      },
    ],
  },
  {
    level: 3,
    challenge: "Finish your first guided progression action.",
    rewards: [
      {
        type: "meta",
        id: "tier3-theme",
        name: "Neon Card Accent",
        lane: "Premium",
        icon: "auto-awesome",
      },
    ],
  },
  {
    level: 5,
    challenge: "Unlock your first battle pass bundle.",
    rewards: [
      { type: "unlockable", itemId: "red_armor" },
      { type: "unlockable", itemId: "common_football" },
    ],
  },
  {
    level: 7,
    challenge: "Keep momentum and complete the next challenge.",
    rewards: [
      {
        type: "meta",
        id: "tier7-banner",
        name: "Victory Nameplate",
        lane: "Free",
        icon: "emoji-events",
      },
    ],
  },
  {
    level: 10,
    challenge: "Complete the second action and earn rare cosmetics.",
    rewards: [
      { type: "unlockable", itemId: "chrome_football" },
      { type: "unlockable", itemId: "blue_armor" },
    ],
  },
  {
    level: 12,
    challenge: "Next season content preview tier.",
    rewards: [
      {
        type: "meta",
        id: "tier12-pack",
        name: "Future Drop Slot",
        lane: "Premium",
        icon: "lock",
      },
    ],
  },
];

export function getLevelFromXp(xp: number, xpPerLevel: number): number {
  return Math.max(1, Math.floor(xp / xpPerLevel) + 1);
}

export function getBattlePassLevel(level: number): number {
  if (level >= 10) return 10;
  if (level >= 5) return 5;
  return 1;
}

export function getUnlockItemsForLevel(level: 5 | 10): DemoUnlockItemDefinition[] {
  return LEVEL_UNLOCKS[level].map((itemId) => DEMO_UNLOCK_ITEMS[itemId]);
}
