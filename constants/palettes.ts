/**
 * Color Palettes for Mesh App
 *
 * Investor demo theme set.
 */

export type PaletteName = 'default' | 'miamiVice' | 'retro' | 'jungle';

export interface PaletteColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryBg: string;
  primaryBgMedium: string;
  primaryBgLight: string;
  primaryBgStrong: string;
  primaryBorder: string;
  gradientStart: string;
  gradientEnd: string;
  label: string;
  icon: string;
}

export const PALETTES: Record<PaletteName, PaletteColors> = {
  default: {
    primary: '#5FB7C6',
    primaryLight: '#86CBD8',
    primaryDark: '#2C6073',
    primaryBg: '#5FB7C614',
    primaryBgMedium: '#5FB7C628',
    primaryBgLight: '#5FB7C610',
    primaryBgStrong: '#5FB7C620',
    primaryBorder: '#5FB7C638',
    gradientStart: '#122838',
    gradientEnd: '#1D3B52',
    label: 'Default',
    icon: 'D',
  },
  miamiVice: {
    primary: '#38D9FF',
    primaryLight: '#7BE8FF',
    primaryDark: '#0E4D8A',
    primaryBg: '#38D9FF20',
    primaryBgMedium: '#38D9FF44',
    primaryBgLight: '#38D9FF16',
    primaryBgStrong: '#38D9FF36',
    primaryBorder: '#38D9FF46',
    gradientStart: '#FF4AA5',
    gradientEnd: '#38D9FF',
    label: 'Miami Vice',
    icon: 'M',
  },
  retro: {
    primary: '#FF9F43',
    primaryLight: '#FFC07C',
    primaryDark: '#9B4C10',
    primaryBg: '#FF9F4320',
    primaryBgMedium: '#FF9F4344',
    primaryBgLight: '#FF9F4314',
    primaryBgStrong: '#FF9F4334',
    primaryBorder: '#FF9F4346',
    gradientStart: '#6C3B2A',
    gradientEnd: '#FF9F43',
    label: 'Retro',
    icon: 'R',
  },
  jungle: {
    primary: '#48D17E',
    primaryLight: '#7BE4A4',
    primaryDark: '#1B6A3A',
    primaryBg: '#48D17E20',
    primaryBgMedium: '#48D17E42',
    primaryBgLight: '#48D17E14',
    primaryBgStrong: '#48D17E34',
    primaryBorder: '#48D17E46',
    gradientStart: '#1A3D2B',
    gradientEnd: '#48D17E',
    label: 'Jungle',
    icon: 'J',
  },
} as const;

export const DEFAULT_PALETTE: PaletteName = 'default';

export const PALETTE_NAMES: PaletteName[] = ['default', 'miamiVice', 'retro', 'jungle'];
