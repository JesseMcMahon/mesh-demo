/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Brand colors (default palette — runtime switching uses inline styles)
        meshPrimary: "#2563EB",
        meshGold: "#C9A84C",

        // Semantic colors
        yesGreen: "#34C759",
        noRed: "#FF453A",

        // Surface / Background
        meshDarkBackground: "#0C0C0E",
        meshCardBgColor: "#161618CC",
        meshCardBorderColor: "#FFFFFF14",

        // Text
        meshSubSectionHeaderColor: "#8E8E93",
      },
    },
  },
  plugins: [],
};
