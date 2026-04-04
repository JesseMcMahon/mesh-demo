import type { ExpoConfig } from "expo/config";

const appJson = require("./app.json");
const baseConfig = appJson.expo as ExpoConfig;

const appMode =
  process.env.EXPO_PUBLIC_APP_MODE === "main"
    ? "main"
    : process.env.EXPO_PUBLIC_APP_MODE === "investor_demo"
      ? "investor_demo"
      : "investor_demo";

const isInvestorDemo = appMode === "investor_demo";

const demoBundleId = process.env.EXPO_PUBLIC_DEMO_BUNDLE_ID || "com.hfs.huddle.demo";
const demoAndroidPackage =
  process.env.EXPO_PUBLIC_DEMO_ANDROID_PACKAGE || "com.hfs.huddle.demo";

const config: ExpoConfig = {
  ...baseConfig,
  name: isInvestorDemo ? "Mesh Demo" : baseConfig.name,
  slug: isInvestorDemo ? "mesh-demo" : baseConfig.slug,
  scheme: isInvestorDemo ? "hfsdemo" : baseConfig.scheme,
  ios: {
    ...baseConfig.ios,
    bundleIdentifier: isInvestorDemo
      ? demoBundleId
      : baseConfig.ios?.bundleIdentifier,
    associatedDomains: isInvestorDemo ? [] : baseConfig.ios?.associatedDomains,
    infoPlist: {
      ...(baseConfig.ios?.infoPlist || {}),
      CFBundleDisplayName: isInvestorDemo
        ? "Mesh Demo"
        : (baseConfig.ios?.infoPlist as any)?.CFBundleDisplayName,
      CFBundleName: isInvestorDemo
        ? "Mesh Demo"
        : (baseConfig.ios?.infoPlist as any)?.CFBundleName,
    },
  },
  android: {
    ...baseConfig.android,
    package: isInvestorDemo ? demoAndroidPackage : baseConfig.android?.package,
    intentFilters: isInvestorDemo ? [] : baseConfig.android?.intentFilters,
    permissions: isInvestorDemo ? [] : baseConfig.android?.permissions,
  },
  extra: {
    ...(baseConfig.extra || {}),
    appMode,
  },
};

export default config;
