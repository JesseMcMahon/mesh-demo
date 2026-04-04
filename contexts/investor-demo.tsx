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

interface DemoState {
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

const XP_PER_LEVEL = 100;
const LEVEL_5_XP = 400;
const LEVEL_10_XP = 900;

const initialState: DemoState = {
  xp: 0,
  gems: 0,
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

  const addXpAndGems = useCallback((xp: number, gems: number) => {
    setState((previous) => {
      const shouldProgressXp = previous.progressStep === "go_to_locker";
      const nextXp = shouldProgressXp ? previous.xp + Math.max(0, xp) : previous.xp;
      const nextLevel = shouldProgressXp ? getLevelFromXp(nextXp, XP_PER_LEVEL) : previous.level;

      return {
        ...previous,
        xp: nextXp,
        level: nextLevel,
        battlePassLevel: shouldProgressXp ? getBattlePassLevel(nextLevel) : previous.battlePassLevel,
        gems: previous.gems + Math.max(0, gems),
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
        gems: previous.gems + feature.gemReward,
        completedFeatures: [...previous.completedFeatures, featureId],
      };
    });
  }, []);

  const triggerTaunt = useCallback(() => {
    setState((previous) => ({
      ...previous,
      tauntsSent: previous.tauntsSent + 1,
      gems: previous.gems + 12,
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

      return {
        ...previous,
        xp: LEVEL_5_XP,
        level: 5,
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

      return {
        ...previous,
        xp: LEVEL_10_XP,
        level: 10,
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

  const nextLevelXp = useMemo(() => state.level * XP_PER_LEVEL, [state.level]);

  return (
    <InvestorDemoContext.Provider
      value={{
        state,
        isHydrated: true,
        completeFeature,
        addXpAndGems,
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
