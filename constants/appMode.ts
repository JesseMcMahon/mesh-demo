export const APP_MODE =
  process.env.EXPO_PUBLIC_APP_MODE === "investor_demo" ? "investor_demo" : "main";

export const IS_INVESTOR_DEMO = APP_MODE === "investor_demo";
