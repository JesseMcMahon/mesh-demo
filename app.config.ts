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
const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "976e79fe-d8d1-4ad0-8971-b2e92ac54332";
const demoAppIcon = "./assets/images/demo-app-icon.jpg";

const config: ExpoConfig = {
  ...baseConfig,
  name: isInvestorDemo ? "Mesh Product Demo" : baseConfig.name,
  slug: isInvestorDemo ? "mesh-demo" : baseConfig.slug,
  icon: isInvestorDemo ? demoAppIcon : baseConfig.icon,
  scheme: isInvestorDemo ? "hfsdemo" : baseConfig.scheme,
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    ...(baseConfig.updates || {}),
    url: "https://u.expo.dev/976e79fe-d8d1-4ad0-8971-b2e92ac54332",
  },
  ios: {
    ...baseConfig.ios,
    icon: isInvestorDemo ? demoAppIcon : baseConfig.ios?.icon,
    bundleIdentifier: isInvestorDemo
      ? demoBundleId
      : baseConfig.ios?.bundleIdentifier,
    associatedDomains: isInvestorDemo ? [] : baseConfig.ios?.associatedDomains,
    infoPlist: {
      ...(baseConfig.ios?.infoPlist || {}),
      CFBundleDisplayName: isInvestorDemo
        ? "Mesh Product Demo"
        : (baseConfig.ios?.infoPlist as any)?.CFBundleDisplayName,
      CFBundleName: isInvestorDemo
        ? "Mesh Product Demo"
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
    eas: {
      ...((baseConfig.extra as any)?.eas || {}),
      projectId: easProjectId,
    },
    appMode,
  },
};

export default config;
