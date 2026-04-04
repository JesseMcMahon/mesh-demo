import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_LEAGUE_REDIRECT_KEY = "@mesh_pending_league_redirect";
const PENDING_INVITE_KEY = "@mesh_pending_invite";

/**
 * Store a league ID that the user should be redirected to after authentication
 */
export async function setPendingLeagueRedirect(
  leagueId: string
): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_LEAGUE_REDIRECT_KEY, leagueId);
  } catch {
    // Silently fail storage
  }
}

/**
 * Get and clear the pending league redirect
 */
export async function getAndClearPendingLeagueRedirect(): Promise<
  string | null
> {
  try {
    const leagueId = await AsyncStorage.getItem(PENDING_LEAGUE_REDIRECT_KEY);
    if (leagueId) {
      await AsyncStorage.removeItem(PENDING_LEAGUE_REDIRECT_KEY);
      return leagueId;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if there's a pending league redirect without clearing it
 */
export async function hasPendingLeagueRedirect(): Promise<boolean> {
  try {
    const leagueId = await AsyncStorage.getItem(PENDING_LEAGUE_REDIRECT_KEY);
    return !!leagueId;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────
// Invite deep link redirect support
// ──────────────────────────────────────────────

export interface PendingInvite {
  type: "squad" | "league";
  code: string;
}

/**
 * Store a pending invite that should be handled after authentication
 */
export async function setPendingInviteRedirect(
  invite: PendingInvite
): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(invite));
  } catch {
    // Silently fail
  }
}

/**
 * Get and clear the pending invite redirect
 */
export async function getAndClearPendingInviteRedirect(): Promise<PendingInvite | null> {
  try {
    const stored = await AsyncStorage.getItem(PENDING_INVITE_KEY);
    if (stored) {
      await AsyncStorage.removeItem(PENDING_INVITE_KEY);
      return JSON.parse(stored) as PendingInvite;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if there's a pending invite without clearing it
 */
export async function hasPendingInviteRedirect(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(PENDING_INVITE_KEY);
    return !!stored;
  } catch {
    return false;
  }
}
