import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname, useSegments } from "expo-router";
import * as Linking from "expo-linking";
import { useUserProfile } from "@/contexts/user-profile";
import {
  setPendingLeagueRedirect,
  setPendingInviteRedirect,
} from "@/lib/redirect";

/**
 * Component that handles deep links for league sharing and invite codes.
 * Supports:
 * - hfsapp://invite/squad/{code}
 * - hfsapp://invite/league/{code}
 * - https://app.huddlefantasy.com/invite/squad/{code}
 * - https://app.huddlefantasy.com/invite/league/{code}
 * - Legacy: huddle://league/{id} and meshclient://league/{id}
 */
export function DeepLinkHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const { isAuthenticated } = useUserProfile();
  const [hasHandledInitialUrl, setHasHandledInitialUrl] = useState(false);

  const handleDeepLink = useCallback(
    async (url: string) => {
      const parsed = Linking.parse(url);

      // Check for squad invite: /invite/squad/{code}
      const squadInvite = extractInviteCode(parsed, "squad");
      if (squadInvite) {
        if (!isAuthenticated) {
          await setPendingInviteRedirect({ type: "squad", code: squadInvite });
          router.replace("/signup" as any);
        } else {
          router.push(`/(tabs)/join-squad?code=${squadInvite}` as any);
        }
        return;
      }

      // Check for league invite: /invite/league/{code}
      const leagueInvite = extractInviteCode(parsed, "league");
      if (leagueInvite) {
        if (!isAuthenticated) {
          await setPendingInviteRedirect({ type: "league", code: leagueInvite });
          router.replace("/signup" as any);
        } else {
          router.push(`/(tabs)/join-league?code=${leagueInvite}` as any);
        }
        return;
      }

      // Legacy: direct league link
      const leagueId = extractLeagueIdFromUrl(parsed);
      if (leagueId) {
        if (!isAuthenticated) {
          await setPendingLeagueRedirect(leagueId);
          router.replace("/signup" as any);
        } else {
          router.replace(`/(tabs)/league/${leagueId}` as any);
        }
      }
    },
    [isAuthenticated, router]
  );

  // Handle initial URL when app opens from a deep link
  useEffect(() => {
    const handleInitialUrl = async () => {
      if (hasHandledInitialUrl) return;

      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          await handleDeepLink(initialUrl);
        }
      } catch {
        // Silently handle deep link errors
      } finally {
        setHasHandledInitialUrl(true);
      }
    };

    handleInitialUrl();
  }, [hasHandledInitialUrl, handleDeepLink]);

  // Handle URL changes while app is running
  useEffect(() => {
    const subscription = Linking.addEventListener("url", async (event) => {
      await handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  // Protect league routes from unauthenticated access
  useEffect(() => {
    const isOnAuthScreen = pathname === "/login" || pathname === "/signup";
    if (isOnAuthScreen) return;

    const isLeagueRoute = segments.some((segment) => segment === "league");
    if (isLeagueRoute && pathname) {
      const leagueIdMatch = pathname.match(/league\/([^/]+)/);
      const leagueId = leagueIdMatch?.[1];

      if (leagueId && !isAuthenticated) {
        setPendingLeagueRedirect(leagueId);
        router.replace("/signup" as any);
      }
    }
  }, [pathname, segments, isAuthenticated, router]);

  return null;
}

/**
 * Extract invite code from a parsed URL
 * Supports: /invite/squad/{code} and /invite/league/{code}
 */
function extractInviteCode(
  parsed: Linking.ParsedURL,
  type: "squad" | "league"
): string | null {
  const host = String((parsed as any)?.hostname || "").toLowerCase();
  if (host === "invite" && parsed.path) {
    const hostPathMatch = String(parsed.path).match(new RegExp(`^${type}/([^/]+)`));
    if (hostPathMatch) return hostPathMatch[1];
  }

  if (parsed.path) {
    const regex = new RegExp(`/invite/${type}/([^/]+)`);
    const match = parsed.path.match(regex);
    if (match) return match[1];

    // Also try without leading slash
    const regex2 = new RegExp(`invite/${type}/([^/]+)`);
    const match2 = parsed.path.match(regex2);
    if (match2) return match2[1];
  }
  return null;
}

/**
 * Extract league ID from a parsed URL (legacy support)
 */
function extractLeagueIdFromUrl(parsed: Linking.ParsedURL): string | null {
  const host = String((parsed as any)?.hostname || "").toLowerCase();
  if (host === "league" && parsed.path) {
    return String(parsed.path).replace(/^\/+/, "").split("/")[0] || null;
  }

  if (parsed.path) {
    const leagueMatch = parsed.path.match(/\/?league\/([^/]+)/);
    if (leagueMatch) return leagueMatch[1];
  }
  if (parsed.queryParams?.leagueId) {
    return parsed.queryParams.leagueId as string;
  }
  return null;
}
