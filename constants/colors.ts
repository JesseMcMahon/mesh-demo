/**
 * Mesh App Color System
 *
 * Updated to match Home V3 design language.
 */

import { DEFAULT_PALETTE, PALETTES } from './palettes';

const defaultPalette = PALETTES[DEFAULT_PALETTE];

export const BRAND = {
  primary: defaultPalette.primary,
  gold: '#EBCB78',
} as const;

export const SURFACE = {
  background: '#070D15',
  card: '#101724',
  cardTransparent: '#101724D9',
  elevated: '#162132',
  highest: '#1E2B3F',
  overlay: 'rgba(5, 10, 17, 0.84)',
  nested: '#080D16CC',
} as const;

export const TEXT = {
  primary: '#EEF2F7',
  secondary: '#9AA7BC',
  tertiary: '#7F90A7',
  quaternary: '#66748C',
  light: '#E0E8F3',
  placeholder: '#8796AD',
} as const;

export const BORDER = {
  default: '#27354A',
  medium: '#31445D',
  light: '#1F2A3F',
  lightest: '#1F2A3FCC',
  strong: '#3A506C',
  divider: '#1F2B40',
} as const;

export const SEMANTIC = {
  success: '#34C759',
  error: '#FF5A5F',
  warning: '#F3B649',
  info: '#52D1C6',
} as const;

export const ACCENT = {
  primary: defaultPalette.primary,
  primaryBg: defaultPalette.primaryBg,
  primaryBgMedium: defaultPalette.primaryBgMedium,
  primaryBgLight: defaultPalette.primaryBgLight,
  primaryBgStrong: defaultPalette.primaryBgStrong,
  primaryBorder: defaultPalette.primaryBorder,
  gold: BRAND.gold,
  goldBg: '#F5C51822',
  goldBgLight: '#F5C51818',
  warning: SEMANTIC.warning,
  redBg: `${SEMANTIC.error}20`,
  redBgMedium: `${SEMANTIC.error}40`,
  redBgLight: `${SEMANTIC.error}15`,
  redBgStrong: `${SEMANTIC.error}30`,
  redBorder: `${SEMANTIC.error}45`,
} as const;

export const GRADIENTS = {
  action: [defaultPalette.gradientStart, defaultPalette.gradientEnd] as const,
  proTip: [`${defaultPalette.primary}33`, `${defaultPalette.primary}10`] as const,
  create: [`${defaultPalette.primary}20`, `${defaultPalette.primary}10`] as const,
} as const;

export const TAB_BAR = {
  background: '#0A111C',
  border: '#1D2A40',
  selectedBg: '#162235',
  unselectedBg: 'transparent',
  selectedIcon: '#6EDBD1',
  unselectedIcon: '#68758F',
  profileBg: '#162235',
  profileIcon: '#68758F',
} as const;

export const NOTIFICATION = {
  successBorder: SEMANTIC.success,
  errorBorder: SEMANTIC.error,
  background: SURFACE.card,
} as const;

export const INPUT = {
  background: SURFACE.card,
  iconColor: defaultPalette.primary,
  placeholderColor: TEXT.placeholder,
} as const;

export const BUTTON = {
  primaryBg: defaultPalette.primaryDark,
  primaryText: '#FFFFFF',
  secondaryBg: 'transparent',
  secondaryBorder: defaultPalette.primary,
  secondaryText: defaultPalette.primary,
} as const;

export const ACTIVITY_COLORS = {
  vote: defaultPalette.primary,
  trade: '#F18F01',
  pickup: SEMANTIC.success,
  drop: SEMANTIC.error,
  win: BRAND.gold,
  loss: TEXT.secondary,
  matchup: '#5688C7',
  milestone: BRAND.gold,
} as const;

const Colors = {
  brand: BRAND,
  surface: SURFACE,
  text: TEXT,
  border: BORDER,
  semantic: SEMANTIC,
  accent: ACCENT,
  gradients: GRADIENTS,
  tabBar: TAB_BAR,
  notification: NOTIFICATION,
  input: INPUT,
  button: BUTTON,
  activity: ACTIVITY_COLORS,
} as const;

export default Colors;
