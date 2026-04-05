import { useMemo } from "react";
import { Platform } from "react-native";
import { PALETTE_NAMES, PALETTES, PaletteName } from "@/constants/palettes";
import { useAppTheme } from "@/contexts/theme";

export type DemoThemeId = PaletteName;

export interface DemoThemeTokens {
  id: DemoThemeId;
  name: string;
  description: string;
  headerGradient: readonly [string, string, string];
  appBackground: string;
  orbLeft: string;
  orbRight: string;
  kicker: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primarySoft: string;
  primarySoftStrong: string;
  primaryBorder: string;
  card: string;
  surface: string;
  surfaceElevated: string;
  glass: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  displayFont: string;
  bodyFont: string;
  labelFont: string;
  buttonFont: string;
}

function iosFont(fontName: string): string {
  return Platform.select({
    ios: fontName,
    default: "System",
  }) as string;
}

const DEMO_THEME_META: Record<
  DemoThemeId,
  Omit<
    DemoThemeTokens,
    | "id"
    | "name"
    | "primary"
    | "primaryLight"
    | "primaryDark"
    | "primarySoft"
    | "primarySoftStrong"
    | "primaryBorder"
  >
> = {
  default: {
    description: "Mesh web-inspired dark navy + electric purple premium system.",
    headerGradient: ["#0A111B", "#0A111B", "#0A111B"],
    appBackground: "#070D15",
    orbLeft: "rgba(122, 107, 255, 0.15)",
    orbRight: "rgba(182, 171, 255, 0.10)",
    kicker: "#B8AEFF",
    card: "#101724",
    surface: "#0E1622",
    surfaceElevated: "#162132",
    glass: "rgba(14, 22, 34, 0.86)",
    textPrimary: "#EEF3FA",
    textSecondary: "#909AAF",
    textMuted: "#75839E",
    displayFont: iosFont("AvenirNext-Heavy"),
    bodyFont: iosFont("AvenirNext-Regular"),
    labelFont: iosFont("AvenirNext-DemiBold"),
    buttonFont: iosFont("AvenirNext-Bold"),
  },
  miamiVice: {
    description: "Neon cyan + hot pink nights with bold contrast.",
    headerGradient: ["#3A1142", "#171B4E", "#0A1A33"],
    appBackground: "#0B0F1D",
    orbLeft: "rgba(56, 217, 255, 0.2)",
    orbRight: "rgba(255, 74, 165, 0.16)",
    kicker: "#8DEFFF",
    card: "#12182A",
    surface: "#131B30",
    surfaceElevated: "#1B2743",
    glass: "rgba(18, 27, 49, 0.74)",
    textPrimary: "#F9F1FF",
    textSecondary: "#C7D4F4",
    textMuted: "#A4B5DB",
    displayFont: iosFont("Futura-CondensedExtraBold"),
    bodyFont: iosFont("AvenirNext-Medium"),
    labelFont: iosFont("AvenirNext-DemiBold"),
    buttonFont: iosFont("AvenirNext-Bold"),
  },
  retro: {
    description: "Warm sunset arcade tones with nostalgic punch.",
    headerGradient: ["#4F251C", "#2F2A20", "#191A17"],
    appBackground: "#11100D",
    orbLeft: "rgba(255, 159, 67, 0.2)",
    orbRight: "rgba(255, 209, 102, 0.14)",
    kicker: "#FFD4A1",
    card: "#1B1714",
    surface: "#221911",
    surfaceElevated: "#2D221A",
    glass: "rgba(35, 26, 19, 0.74)",
    textPrimary: "#FFEAD0",
    textSecondary: "#D8C2A4",
    textMuted: "#B6987B",
    displayFont: iosFont("AmericanTypewriter-Bold"),
    bodyFont: iosFont("AmericanTypewriter"),
    labelFont: iosFont("AmericanTypewriter-Semibold"),
    buttonFont: iosFont("AmericanTypewriter-Bold"),
  },
  jungle: {
    description: "Deep rainforest greens with high-energy lime accents.",
    headerGradient: ["#0F2F23", "#11291C", "#0B1A14"],
    appBackground: "#0B120F",
    orbLeft: "rgba(72, 209, 126, 0.2)",
    orbRight: "rgba(113, 187, 96, 0.14)",
    kicker: "#B5F3CC",
    card: "#121E18",
    surface: "#102017",
    surfaceElevated: "#173126",
    glass: "rgba(13, 28, 21, 0.74)",
    textPrimary: "#E6F7EC",
    textSecondary: "#B6D8C0",
    textMuted: "#8DB8A2",
    displayFont: iosFont("GillSans-Bold"),
    bodyFont: iosFont("GillSans"),
    labelFont: iosFont("GillSans-SemiBold"),
    buttonFont: iosFont("GillSans-Bold"),
  },
};

export interface DemoThemeOption {
  id: DemoThemeId;
  name: string;
  icon: string;
  description: string;
  primary: string;
  primaryLight: string;
  gradientStart: string;
  gradientEnd: string;
}

export const DEMO_THEME_OPTIONS: DemoThemeOption[] = PALETTE_NAMES.map((id) => ({
  id,
  name: PALETTES[id].label,
  icon: PALETTES[id].icon,
  description: DEMO_THEME_META[id].description,
  primary: PALETTES[id].primary,
  primaryLight: PALETTES[id].primaryLight,
  gradientStart: PALETTES[id].gradientStart,
  gradientEnd: PALETTES[id].gradientEnd,
}));

export function useDemoTheme(): DemoThemeTokens {
  const { palette, colors } = useAppTheme();

  return useMemo(() => {
    const meta = DEMO_THEME_META[palette];

    return {
      id: palette,
      name: colors.label,
      description: meta.description,
      headerGradient: meta.headerGradient,
      appBackground: meta.appBackground,
      orbLeft: meta.orbLeft,
      orbRight: meta.orbRight,
      kicker: meta.kicker,
      primary: colors.primary,
      primaryLight: colors.primaryLight,
      primaryDark: colors.primaryDark,
      primarySoft: colors.primaryBg,
      primarySoftStrong: colors.primaryBgStrong,
      primaryBorder: colors.primaryBorder,
      card: meta.card,
      surface: meta.surface,
      surfaceElevated: meta.surfaceElevated,
      glass: meta.glass,
      textPrimary: meta.textPrimary,
      textSecondary: meta.textSecondary,
      textMuted: meta.textMuted,
      displayFont: meta.displayFont,
      bodyFont: meta.bodyFont,
      labelFont: meta.labelFont,
      buttonFont: meta.buttonFont,
    };
  }, [palette, colors]);
}
