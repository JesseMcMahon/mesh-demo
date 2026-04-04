import { TextStyle } from "react-native";

export const UI_FONT_REGULAR = "PlusJakartaSans-Regular";
export const UI_FONT_MEDIUM = "PlusJakartaSans-Medium";
export const UI_FONT_SEMIBOLD = "PlusJakartaSans-SemiBold";
export const UI_FONT_BOLD = "PlusJakartaSans-Bold";

export const FONT_BY_WEIGHT: Record<string, string> = {
  "400": UI_FONT_REGULAR,
  "500": UI_FONT_MEDIUM,
  "600": UI_FONT_SEMIBOLD,
  "700": UI_FONT_BOLD,
  normal: UI_FONT_REGULAR,
  bold: UI_FONT_BOLD,
};

export function resolveUIFont(style?: TextStyle | TextStyle[]): string {
  if (!style) return UI_FONT_REGULAR;
  const styles = Array.isArray(style) ? style : [style];
  for (let i = styles.length - 1; i >= 0; i -= 1) {
    const weight = styles[i]?.fontWeight;
    if (!weight) continue;
    const key = String(weight);
    if (FONT_BY_WEIGHT[key]) {
      return FONT_BY_WEIGHT[key];
    }
  }
  return UI_FONT_REGULAR;
}
