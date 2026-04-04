import React, { memo } from "react";
import { Image as ExpoImage, type ImageProps } from "expo-image";
import { SURFACE } from "@/constants/colors";

type MeshImageProps = Omit<ImageProps, "source"> & {
  source?: ImageProps["source"];
  uri?: string | null;
  fallbackSource?: ImageProps["source"];
};

function MeshImageBase({
  source,
  uri,
  fallbackSource,
  style,
  contentFit = "cover",
  cachePolicy = "memory-disk",
  transition = 100,
  ...rest
}: MeshImageProps) {
  const resolvedSource = source ?? (uri ? { uri } : fallbackSource);

  if (!resolvedSource) {
    return null;
  }

  return (
    <ExpoImage
      source={resolvedSource}
      style={[{ backgroundColor: SURFACE.elevated }, style]}
      contentFit={contentFit}
      cachePolicy={cachePolicy}
      transition={transition}
      {...rest}
    />
  );
}

export const MeshImage = memo(MeshImageBase);
