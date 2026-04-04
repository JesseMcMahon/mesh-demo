/**
 * Feature Flags
 *
 * Controls visibility and availability of features in the app.
 * Set individual flags to false to hide features that aren't ready for release.
 *
 * Currently all flags are enabled. For launch, set flags to false
 * for features that should be hidden (e.g., draft, roster, trades).
 */

export const FEATURES = {
  /** User signup / login flow */
  signup: true,
  /** League creation wizard */
  leagueCreation: true,
  /** Joining squads via invites or search */
  squadJoining: true,
  /** Invite management (create, share, revoke) */
  invites: true,
  /** Squad management (settings, kick, transfer) */
  squadManagement: true,
  /** Draft room and draft settings */
  draft: true,
  /** Roster management */
  roster: true,
  /** Trade proposals and negotiation */
  trades: true,
  /** Waiver wire */
  waivers: true,
  /** Leaderboard tab */
  leaderboard: true,
  /** Explore tab */
  explore: true,
  /** Public league search / join */
  leagueSearch: true,
  /** Deep link invite handling */
  deepLinks: true,
} as const;

export type FeatureKey = keyof typeof FEATURES;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: FeatureKey): boolean {
  return FEATURES[feature];
}
