const OBJECT_STRING_RE = /^\[object Object\]$/i;

type ApiLikeError = Error & {
  status?: number;
  code?: string | number;
  details?: string[];
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (OBJECT_STRING_RE.test(trimmed)) return null;
  return trimmed;
}

function toMessageByStatus(status?: number): string | null {
  if (!status) return null;
  if (status === 401) return "Please log in again.";
  if (status === 403) return "You are not allowed to do that.";
  if (status === 404) return "We couldn't find what you requested.";
  if (status === 409) return "This action can't be completed right now.";
  if (status === 429) return "Too many requests. Please wait a moment.";
  if (status >= 500) return "Server error. Please retry in a moment.";
  return null;
}

const CODE_MESSAGE_OVERRIDES: Record<string, string> = {
  REQUEST_TIMEOUT: "Request timed out. Please retry.",
  NETWORK_UNAVAILABLE: "Network unavailable. Check connection and retry.",
  LOCK_SOURCE_UNAVAILABLE: "Live lock status is temporarily unavailable. Please retry.",
  DRAFT_NOT_COMPLETE: "This action is available after the draft is complete.",
  TRADE_PLAYER_RESERVED: "One or more players are already in an active trade.",
  DROP_REQUIRED_FOR_ROSTER_LIMIT: "Select a player to drop before adding.",
  LEAGUE_TYPE_LOCKED: "League type can't be changed after creation.",
  LOCATION_RATE_LIMITED: "Too many location searches. Please wait a moment.",
  OFFSEASON_LOCKED: "This action is locked during offseason.",
  OFFSEASON_REACTIVATION_NOT_READY: "Season reactivation isn't available yet.",
  SEASON_ALREADY_REACTIVATED: "The next season is already active.",
  DRAFT_TYPE_LOCKED_SNAKE_ONLY: "Snake draft is required in this release.",
};

export const DEFAULT_USER_ERROR_MESSAGE = "Something went wrong. Please retry.";

export function getUserErrorCode(error: unknown): string | number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = (error as { code?: string | number }).code;
  if (candidate === undefined || candidate === null) return undefined;
  return candidate;
}

export function getUserErrorMessage(
  error: unknown,
  fallback: string = DEFAULT_USER_ERROR_MESSAGE
): string {
  const fallbackMessage = asNonEmptyString(fallback) || DEFAULT_USER_ERROR_MESSAGE;

  const code = getUserErrorCode(error);
  if (code !== undefined) {
    const override = CODE_MESSAGE_OVERRIDES[String(code).toUpperCase()];
    if (override) return override;
  }

  if (error && typeof error === "object") {
    const details = (error as ApiLikeError).details;
    if (Array.isArray(details) && details.length > 0) {
      const detailMessage = asNonEmptyString(details[0]);
      if (detailMessage) return detailMessage;
    }
  }

  if (error instanceof Error) {
    const message = asNonEmptyString(error.message);
    if (message) return message;
    const byStatus = toMessageByStatus((error as ApiLikeError).status);
    if (byStatus) return byStatus;
    return fallbackMessage;
  }

  if (typeof error === "string") {
    return asNonEmptyString(error) || fallbackMessage;
  }

  return fallbackMessage;
}
