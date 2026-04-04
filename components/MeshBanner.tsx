import { View, Image, ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SURFACE } from "@/constants/colors";

interface MeshBannerProps {
  height?: number;
  className?: string;
}

export function MeshBanner({ height = 120, className = "" }: MeshBannerProps) {
  const insets = useSafeAreaInsets();
  const bannerBackground: ImageSourcePropType = require("@/assets/images/meshBannerBackground.png");
  const meshLogo: ImageSourcePropType = require("@/assets/images/meshLogo.png");

  return (
    <View className={`relative w-full ${className}`} style={{ height, backgroundColor: SURFACE.background }}>
      <Image
        source={bannerBackground}
        className="w-full h-full"
        resizeMode="cover"
        style={{ opacity: 0.4 }}
      />
      <View
        className="absolute inset-x-0 items-center justify-center"
        style={{ top: insets.top, bottom: 0 }}
      >
        <Image source={meshLogo} className="w-32 h-32" resizeMode="contain" />
      </View>
    </View>
  );
}
