import { Redirect } from "expo-router";
import { IS_INVESTOR_DEMO } from "@/constants/appMode";

export default function Index() {
  if (IS_INVESTOR_DEMO) {
    return <Redirect href={"/(investor-demo)/home-v2" as any} />;
  }

  return <Redirect href="/splash" />;
}
