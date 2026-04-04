import { Image } from "react-native";

const prefetchedPlayerImages = new Set<string>();
const prefetchBatchTimestamps = new Map<string, number>();

const PREFETCH_BATCH_DEDUPE_WINDOW_MS = 20_000;

export function getPlayerImageUrl(player: any): string | null {
  if (!player) return null;

  const candidates = [
    player.photoUrl,
    player.PhotoUrl,
    player.usaTodayHeadshotNoBackgroundUrl,
    player.USATodayHeadshotNoBackgroundUrl,
    player.usaTodayHeadshotUrl,
    player.USATodayHeadshotUrl,
    player.headshotUrl,
    player.imageUrl,
  ];

  for (const value of candidates) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }

  return null;
}

export function getPlayerImageSource(
  player: any
): { uri: string } | null {
  const imageUrl = getPlayerImageUrl(player);
  if (!imageUrl) return null;
  return { uri: imageUrl };
}

export function prefetchPlayerImage(player: any): void {
  const imageUrl = getPlayerImageUrl(player);
  if (!imageUrl || prefetchedPlayerImages.has(imageUrl)) return;

  prefetchedPlayerImages.add(imageUrl);
  const promise = Image.prefetch(imageUrl);
  promise.catch(() => {
    // Keep as prefetched to avoid repeated failing network requests.
  });
}

export function prefetchPlayerImages(players: any[] = [], limit = 40): void {
  if (!Array.isArray(players) || players.length === 0) return;

  const capped = players.slice(0, Math.max(0, limit));
  const batchKey = capped
    .map((player: any) => String(player?.playerId || player?._id || ""))
    .filter(Boolean)
    .join("|");

  if (batchKey) {
    const lastBatchAt = prefetchBatchTimestamps.get(batchKey) || 0;
    if (Date.now() - lastBatchAt < PREFETCH_BATCH_DEDUPE_WINDOW_MS) {
      return;
    }
    prefetchBatchTimestamps.set(batchKey, Date.now());
  }

  capped.forEach((player) => {
    prefetchPlayerImage(player);
  });
}
