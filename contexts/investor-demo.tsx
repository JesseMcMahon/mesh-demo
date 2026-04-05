import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { DEMO_FEATURES, DemoFeatureId } from "@/lib/investorDemoContent";
import {
  DemoFootballId,
  DemoProgressStep,
  DemoRevealStage,
  DemoSuitId,
  DemoUnlockItemId,
  LEVEL_UNLOCKS,
  getBattlePassLevel,
  getLevelFromXp,
} from "@/lib/demoBattlePass";

export type DemoSeasonFormat = "nfl" | "march_madness" | "reality_tv";

interface DemoState {
  seasonXp: number;
  seasonLevel: number;
  seasonKey: string;
  seasonFormat: DemoSeasonFormat;
  lifetimePrestige: number;
  lifetimeGems: number;
  lifetimeXp: number;
  formatContribution: Record<DemoSeasonFormat, number>;
  sessionActionCount: number;
  sessionXpEarned: number;
  xp: number;
  gems: number;
  level: number;
  completedFeatures: DemoFeatureId[];
  tauntsSent: number;
  progressStep: DemoProgressStep;
  battlePassLevel: number;
  unlockedItems: DemoUnlockItemId[];
  equipped: {
    suit: DemoSuitId;
    football: DemoFootballId;
  };
  hasSeenHelper: boolean;
  pendingReveal: DemoRevealStage;
  hasSeenHomeLevel5Prompt: boolean;
  hasSeenBattlePassLevel5Reveal: boolean;
  hasSeenBattlePassLevel10Reveal: boolean;
  hasSeenCinematicIntro: boolean;
}

interface InvestorDemoContextType {
  state: DemoState;
  isHydrated: boolean;
  completeFeature: (featureId: DemoFeatureId) => void;
  addXpAndGems: (xp: number, gems: number) => void;
  addSeasonProgress: (
    xp: number,
    gems: number,
    format?: DemoSeasonFormat
  ) => void;
  addLifetimeProgress: (xp: number, gems: number, format?: DemoSeasonFormat) => void;
  simulateSeasonRollover: () => void;
  setSeasonFormat: (format: DemoSeasonFormat) => void;
  triggerTaunt: () => void;
  resetDemo: () => void;
  isFeatureComplete: (featureId: DemoFeatureId) => boolean;
  nextLevelXp: number;
  startBattlePassProgression: () => void;
  completeSecondBattlePassAction: () => void;
  acknowledgeHelperPrompt: () => void;
  markHomeLevel5PromptSeen: () => void;
  markRevealSeen: (stage: Exclude<DemoRevealStage, null>) => void;
  markCinematicIntroSeen: () => void;
  equipSuit: (suit: DemoSuitId) => void;
  equipFootball: (football: DemoFootballId) => void;
  hasUnlockedItem: (itemId: DemoUnlockItemId) => boolean;
}

const SEASON_XP_PER_LEVEL = 100;
const PRESTIGE_XP_PER_LEVEL = 1200;
const LEVEL_5_XP = 400;
const LEVEL_10_XP = 900;

function getPrestigeFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / PRESTIGE_XP_PER_LEVEL) + 1);
}

function addFormatContribution(
  current: Record<DemoSeasonFormat, number>,
  format: DemoSeasonFormat,
  amount: number
): Record<DemoSeasonFormat, number> {
  return {
    ...current,
    [format]: current[format] + Math.max(1, amount),
  };
}

const initialState: DemoState = {
  seasonXp: 0,
  seasonLevel: 1,
  seasonKey: "Season 1",
  seasonFormat: "nfl",
  lifetimePrestige: 4,
  lifetimeGems: 640,
  lifetimeXp: 3600,
  formatContribution: {
    nfl: 620,
    march_madness: 230,
    reality_tv: 150,
  },
  sessionActionCount: 0,
  sessionXpEarned: 0,
  xp: 0,
  gems: 640,
  level: 1,
  completedFeatures: [],
  tauntsSent: 0,
  progressStep: "intro",
  battlePassLevel: 1,
  unlockedItems: [],
  equipped: {
    suit: "character_example",
    football: "none",
  },
  hasSeenHelper: false,
  pendingReveal: null,
  hasSeenHomeLevel5Prompt: false,
  hasSeenBattlePassLevel5Reveal: false,
  hasSeenBattlePassLevel10Reveal: false,
  hasSeenCinematicIntro: false,
};

const InvestorDemoContext = createContext<InvestorDemoContextType | undefined>(undefined);

function uniqueUnlocks(current: DemoUnlockItemId[], add: DemoUnlockItemId[]): DemoUnlockItemId[] {
  return Array.from(new Set([...current, ...add]));
}

export function InvestorDemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(initialState);

  const setSeasonFormat = useCallback((format: DemoSeasonFormat) => {
    setState((previous) => ({
      ...previous,
      seasonFormat: format,
    }));
  }, []);

  const addSeasonProgress = useCallback(
    (xp: number, gems: number, format?: DemoSeasonFormat) => {
      setState((previous) => {
        const xpGain = Math.max(0, xp);
        const gemGain = Math.max(0, gems);
        const appliedFormat = format ?? previous.seasonFormat;

        const nextSeasonXp = previous.seasonXp + xpGain;
        const nextSeasonLevel = getLevelFromXp(nextSeasonXp, SEASON_XP_PER_LEVEL);

        const nextLifetimeXp = previous.lifetimeXp + xpGain;
        const nextLifetimeGems = previous.lifetimeGems + gemGain;
        const nextLifetimePrestige = getPrestigeFromXp(nextLifetimeXp);

        return {
          ...previous,
          seasonXp: nextSeasonXp,
          seasonLevel: nextSeasonLevel,
          lifetimeXp: nextLifetimeXp,
          lifetimeGems: nextLifetimeGems,
          lifetimePrestige: nextLifetimePrestige,
          formatContribution: addFormatContribution(
            previous.formatContribution,
            appliedFormat,
            Math.max(1, Math.round(xpGain / 10))
          ),
          sessionActionCount: previous.sessionActionCount + 1,
          sessionXpEarned: previous.sessionXpEarned + xpGain,
          xp: nextSeasonXp,
          level: nextSeasonLevel,
          gems: nextLifetimeGems,
        };
      });
    },
    []
  );

  const addLifetimeProgress = useCallback(
    (xp: number, gems: number, format: DemoSeasonFormat = "nfl") => {
      setState((previous) => {
        const xpGain = Math.max(0, xp);
        const gemGain = Math.max(0, gems);
        const nextLifetimeXp = previous.lifetimeXp + xpGain;
        const nextLifetimeGems = previous.lifetimeGems + gemGain;

        return {
          ...previous,
          lifetimeXp: nextLifetimeXp,
          lifetimeGems: nextLifetimeGems,
          lifetimePrestige: getPrestigeFromXp(nextLifetimeXp),
          formatContribution: addFormatContribution(
            previous.formatContribution,
            format,
            Math.max(1, Math.round(xpGain / 10))
          ),
          gems: nextLifetimeGems,
        };
      });
    },
    []
  );

  const addXpAndGems = useCallback((xp: number, gems: number) => {
    addSeasonProgress(xp, gems);
  }, [addSeasonProgress]);

  const simulateSeasonRollover = useCallback(() => {
    setState((previous) => {
      const seasonNumberMatch = previous.seasonKey.match(/(\d+)/);
      const nextSeasonNumber = seasonNumberMatch
        ? Number(seasonNumberMatch[1]) + 1
        : 2;
      const nextSeasonKey = `Season ${nextSeasonNumber}`;

      return {
        ...previous,
        seasonKey: nextSeasonKey,
        seasonXp: 0,
        seasonLevel: 1,
        battlePassLevel: 1,
        sessionActionCount: 0,
        sessionXpEarned: 0,
        xp: 0,
        level: 1,
      };
    });
  }, []);

  const completeFeature = useCallback((featureId: DemoFeatureId) => {
    const feature = DEMO_FEATURES.find((entry) => entry.id === featureId);
    if (!feature) return;

    setState((previous) => {
      if (previous.completedFeatures.includes(featureId)) {
        return previous;
      }

      return {
        ...previous,
        lifetimeGems: previous.lifetimeGems + feature.gemReward,
        gems: previous.lifetimeGems + feature.gemReward,
        completedFeatures: [...previous.completedFeatures, featureId],
      };
    });
  }, []);

  const triggerTaunt = useCallback(() => {
    setState((previous) => ({
      ...previous,
      tauntsSent: previous.tauntsSent + 1,
      lifetimeGems: previous.lifetimeGems + 12,
      gems: previous.lifetimeGems + 12,
    }));
  }, []);

  const startBattlePassProgression = useCallback(() => {
    setState((previous) => {
      if (previous.battlePassLevel >= 5) {
        return {
          ...previous,
          hasSeenHelper: true,
          hasSeenHomeLevel5Prompt: false,
        };
      }

      const unlocks = uniqueUnlocks(previous.unlockedItems, LEVEL_UNLOCKS[5]);
      const xpDelta = Math.max(0, LEVEL_5_XP - previous.seasonXp);
      const nextLifetimeXp = previous.lifetimeXp + xpDelta;

      return {
        ...previous,
        seasonXp: LEVEL_5_XP,
        seasonLevel: 5,
        xp: LEVEL_5_XP,
        level: 5,
        lifetimeXp: nextLifetimeXp,
        lifetimePrestige: getPrestigeFromXp(nextLifetimeXp),
        formatContribution: addFormatContribution(
          previous.formatContribution,
          previous.seasonFormat,
          Math.max(1, Math.round(xpDelta / 10))
        ),
        sessionActionCount: previous.sessionActionCount + 1,
        sessionXpEarned: previous.sessionXpEarned + xpDelta,
        battlePassLevel: 5,
        progressStep: "first_unlock_done",
        unlockedItems: unlocks,
        hasSeenHelper: true,
        hasSeenHomeLevel5Prompt: false,
        pendingReveal: "level5",
      };
    });
  }, []);

  const completeSecondBattlePassAction = useCallback(() => {
    setState((previous) => {
      if (previous.battlePassLevel >= 10) {
        return previous;
      }

      if (!["ready_for_second_action", "first_unlock_done"].includes(previous.progressStep)) {
        return previous;
      }

      const unlocks = uniqueUnlocks(previous.unlockedItems, LEVEL_UNLOCKS[10]);
      const xpDelta = Math.max(0, LEVEL_10_XP - previous.seasonXp);
      const nextLifetimeXp = previous.lifetimeXp + xpDelta;

      return {
        ...previous,
        seasonXp: LEVEL_10_XP,
        seasonLevel: 10,
        xp: LEVEL_10_XP,
        level: 10,
        lifetimeXp: nextLifetimeXp,
        lifetimePrestige: getPrestigeFromXp(nextLifetimeXp),
        formatContribution: addFormatContribution(
          previous.formatContribution,
          previous.seasonFormat,
          Math.max(1, Math.round(xpDelta / 10))
        ),
        sessionActionCount: previous.sessionActionCount + 1,
        sessionXpEarned: previous.sessionXpEarned + xpDelta,
        battlePassLevel: 10,
        progressStep: "second_unlock_done",
        unlockedItems: unlocks,
        pendingReveal: "level10",
      };
    });
  }, []);

  const acknowledgeHelperPrompt = useCallback(() => {
    setState((previous) => ({
      ...previous,
      hasSeenHelper: true,
      progressStep: previous.progressStep === "intro" ? "ready_for_first_action" : previous.progressStep,
    }));
  }, []);

  const markHomeLevel5PromptSeen = useCallback(() => {
    setState((previous) => ({
      ...previous,
      hasSeenHomeLevel5Prompt: true,
    }));
  }, []);

  const markRevealSeen = useCallback((stage: Exclude<DemoRevealStage, null>) => {
    setState((previous) => {
      if (stage === "level5") {
        return {
          ...previous,
          pendingReveal: previous.pendingReveal === "level5" ? null : previous.pendingReveal,
          hasSeenBattlePassLevel5Reveal: true,
          progressStep:
            previous.progressStep === "first_unlock_done"
              ? "ready_for_second_action"
              : previous.progressStep,
        };
      }

      return {
        ...previous,
        pendingReveal: previous.pendingReveal === "level10" ? null : previous.pendingReveal,
        hasSeenBattlePassLevel10Reveal: true,
        progressStep: "go_to_locker",
      };
    });
  }, []);

  const markCinematicIntroSeen = useCallback(() => {
    setState((previous) => {
      if (previous.hasSeenCinematicIntro) {
        return previous;
      }

      return {
        ...previous,
        hasSeenCinematicIntro: true,
      };
    });
  }, []);

  const hasUnlockedItem = useCallback(
    (itemId: DemoUnlockItemId) => state.unlockedItems.includes(itemId),
    [state.unlockedItems]
  );

  const equipSuit = useCallback((suit: DemoSuitId) => {
    setState((previous) => {
      if (suit === "character_example") {
        return {
          ...previous,
          equipped: {
            ...previous.equipped,
            suit,
          },
        };
      }

      if (!previous.unlockedItems.includes(suit)) {
        return previous;
      }

      return {
        ...previous,
        equipped: {
          ...previous.equipped,
          suit,
        },
      };
    });
  }, []);

  const equipFootball = useCallback((football: DemoFootballId) => {
    setState((previous) => {
      if (football === "none") {
        return {
          ...previous,
          equipped: {
            ...previous.equipped,
            football,
          },
        };
      }

      if (!previous.unlockedItems.includes(football)) {
        return previous;
      }

      return {
        ...previous,
        equipped: {
          ...previous.equipped,
          football,
        },
      };
    });
  }, []);

  const resetDemo = useCallback(() => {
    setState((previous) => ({
      ...initialState,
      hasSeenCinematicIntro: previous.hasSeenCinematicIntro,
    }));
  }, []);

  const isFeatureComplete = useCallback(
    (featureId: DemoFeatureId) => state.completedFeatures.includes(featureId),
    [state.completedFeatures]
  );

  const nextLevelXp = useMemo(
    () => state.seasonLevel * SEASON_XP_PER_LEVEL,
    [state.seasonLevel]
  );

  return (
    <InvestorDemoContext.Provider
      value={{
        state,
        isHydrated: true,
        completeFeature,
        addXpAndGems,
        addSeasonProgress,
        addLifetimeProgress,
        simulateSeasonRollover,
        setSeasonFormat,
        triggerTaunt,
        resetDemo,
        isFeatureComplete,
        nextLevelXp,
        startBattlePassProgression,
        completeSecondBattlePassAction,
        acknowledgeHelperPrompt,
        markHomeLevel5PromptSeen,
        markRevealSeen,
        markCinematicIntroSeen,
        equipSuit,
        equipFootball,
        hasUnlockedItem,
      }}
    >
      {children}
    </InvestorDemoContext.Provider>
  );
}

export function useInvestorDemo() {
  const context = useContext(InvestorDemoContext);
  if (!context) {
    throw new Error("useInvestorDemo must be used within InvestorDemoProvider");
  }
  return context;
}
