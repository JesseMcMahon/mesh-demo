import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PaletteName,
  PaletteColors,
  PALETTES,
  DEFAULT_PALETTE,
} from '@/constants/palettes';
import { IS_INVESTOR_DEMO } from '@/constants/appMode';

const THEME_STORAGE_KEY = '@mesh_theme_palette';

interface ThemeContextType {
  palette: PaletteName;
  colors: PaletteColors;
  setPalette: (name: PaletteName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeColorProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<PaletteName>(DEFAULT_PALETTE);

  // Load persisted palette on mount
  useEffect(() => {
    if (IS_INVESTOR_DEMO) {
      setPaletteState(DEFAULT_PALETTE);
      return;
    }

    const loadPalette = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored && stored in PALETTES) {
          setPaletteState(stored as PaletteName);
        }
      } catch {
        // Use default
      }
    };
    loadPalette();
  }, []);

  const setPalette = useCallback((name: PaletteName) => {
    if (IS_INVESTOR_DEMO) {
      setPaletteState(DEFAULT_PALETTE);
      return;
    }
    setPaletteState(name);
    AsyncStorage.setItem(THEME_STORAGE_KEY, name).catch(() => {});
  }, []);

  const colors = PALETTES[palette];

  return (
    <ThemeContext.Provider value={{ palette, colors, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useAppTheme must be used within a ThemeColorProvider');
  }
  return context;
}
