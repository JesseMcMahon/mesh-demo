import { MaterialIcons } from "@expo/vector-icons";

export type DemoModuleIntroKey =
  | "lineup"
  | "live_economy"
  | "battle_pass"
  | "locker_room"
  | "my_locker"
  | "crib"
  | "gems_xp"
  | "taunts"
  | "roadmap";

export type DemoModuleIntroStep = {
  title: string;
  body: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

export const MODULE_INTRO_STEPS: Record<DemoModuleIntroKey, DemoModuleIntroStep[]> = {
  lineup: [
    {
      title: "Lineup Is A Daily Habit Loop",
      body: "Start/sit decisions create recurring weekly intent. That repeat behavior drives durable session cadence.",
      icon: "tune",
    },
    {
      title: "Decisions Become Economy Inputs",
      body: "Submitting a lineup contributes XP and gems, converting core fantasy actions into progression momentum.",
      icon: "trending-up",
    },
    {
      title: "Engagement -> Monetizable Inventory",
      body: "More lineup activity supports sponsor challenge volume and cosmetic demand across the ecosystem.",
      icon: "paid",
    },
  ],
  live_economy: [
    {
      title: "Watchability Becomes A Product Surface",
      body: "Live moments trigger taunts, rewards, and sponsor progression in real time, not only at final scoring.",
      icon: "bolt",
    },
    {
      title: "One Event, Multiple Outcomes",
      body: "Each trigger updates social actions, progression, and partner value simultaneously, increasing per-session depth.",
      icon: "hub",
    },
    {
      title: "This Is The Compounding Engine",
      body: "The same moment powers retention, economy health, and sponsor ROI.",
      icon: "insights",
    },
  ],
  battle_pass: [
    {
      title: "Seasonal Motivation Track",
      body: "Battle pass rewards give players clear near-term reasons to return and complete action milestones.",
      icon: "view-carousel",
    },
    {
      title: "Milestones Convert To Identity",
      body: "Unlocked items are visible social proof, turning progression into status and personality.",
      icon: "auto-awesome",
    },
  ],
  locker_room: [
    {
      title: "Achievements Build Long-Term Identity",
      body: "Locker artifacts preserve achievement history and create durable social prestige.",
      icon: "emoji-events",
    },
    {
      title: "Prestige Protects Retention",
      body: "Players with visible status are more likely to return and defend position season over season.",
      icon: "shield",
    },
  ],
  my_locker: [
    {
      title: "Customization Is The Spend Surface",
      body: "My Locker is where progression value is realized through equip choices and visual identity.",
      icon: "inventory-2",
    },
    {
      title: "Earn -> Equip -> Flex",
      body: "Unlocks become wearable outcomes that reinforce both social competition and economy demand.",
      icon: "style",
    },
  ],
  crib: [
    {
      title: "Crib Is The Legacy Layer",
      body: "A persistent trophy space gives players long-horizon goals beyond one weekly matchup.",
      icon: "home",
    },
    {
      title: "Season History Becomes Product Value",
      body: "Historical accomplishments make each season additive, increasing reactivation likelihood.",
      icon: "history",
    },
  ],
  gems_xp: [
    {
      title: "Two-Ledger Economy",
      body: "Seasonal progression resets for fresh competition while lifetime prestige and gems carry over.",
      icon: "account-balance-wallet",
    },
    {
      title: "Cross-Format Carryover",
      body: "The same profile can progress across NFL, March Madness, and Reality TV loops.",
      icon: "alt-route",
    },
    {
      title: "This Expands LTV",
      body: "Carryover systems reduce reacquisition burden and extend user value across formats.",
      icon: "show-chart",
    },
  ],
  taunts: [
    {
      title: "Social Rivalry Amplifier",
      body: "Triggered taunts turn passive scoring into active social moments that players feel instantly.",
      icon: "campaign",
    },
    {
      title: "Emotional Peaks Drive Return",
      body: "Competitive expression raises session intensity and increases habit-forming behavior.",
      icon: "whatshot",
    },
  ],
  roadmap: [
    {
      title: "One Economy, Many Formats",
      body: "Roadmap shows the same progression framework extending into additional sports and entertainment pools.",
      icon: "map",
    },
    {
      title: "Scale Without Rebuilding Core Systems",
      body: "The expansion strategy reuses identity, rewards, and social loops as reusable platform rails.",
      icon: "architecture",
    },
  ],
};

export const MODULE_INTRO_KEYS = Object.keys(MODULE_INTRO_STEPS) as DemoModuleIntroKey[];
