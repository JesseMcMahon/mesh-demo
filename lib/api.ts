import { API_BASE_URL as BASE_URL } from "./config";

export const getApiBaseURL = (): string => BASE_URL;

const V2_BASE = `${BASE_URL}/api/v2`;

const DEFAULT_V2_FETCH_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS || 14000);
const OBJECT_STRING_RE = /^\[object Object\]$/i;

const createClientError = (
  message: string,
  status: number,
  code: string
) => {
  const err = new Error(message) as Error & {
    status?: number;
    code?: string;
    details?: string[];
    payload?: unknown;
  };
  err.status = status;
  err.code = code;
  return err;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (OBJECT_STRING_RE.test(trimmed)) return null;
  return trimmed;
}

function normalizeDetailMessage(detail: unknown): string | null {
  if (typeof detail === "string") return asNonEmptyString(detail);
  if (detail && typeof detail === "object") {
    const directMessage = asNonEmptyString((detail as any).message);
    if (directMessage) return directMessage;
    const nestedMessage = asNonEmptyString((detail as any)?.error?.message);
    if (nestedMessage) return nestedMessage;
  }
  return null;
}

function extractValidationDetails(payload: any): string[] {
  const detailCandidates = [
    payload?.details,
    payload?.error?.details,
    payload?.error?.error?.details,
  ];
  const details: string[] = [];
  for (const candidate of detailCandidates) {
    if (!Array.isArray(candidate)) continue;
    for (const detail of candidate) {
      const message = normalizeDetailMessage(detail);
      if (message) details.push(message);
      if (details.length >= 5) return details;
    }
  }
  return details;
}

function fallbackMessageForStatus(status: number): string {
  if (status === 401) return "Please log in again.";
  if (status === 403) return "You are not allowed to do that.";
  if (status === 404) return "We couldn't find what you requested.";
  if (status === 409) return "This action can't be completed right now.";
  if (status === 429) return "Too many requests. Please wait a moment.";
  if (status >= 500) return "Server error. Please retry in a moment.";
  return "Something went wrong. Please retry.";
}

function extractApiError(payload: any, response: Response): {
  message: string;
  code?: string | number;
  details: string[];
} {
  const details = extractValidationDetails(payload);
  const messageCandidates = [
    payload?.message,
    payload?.error,
    payload?.error?.message,
    payload?.error?.error?.message,
    details[0],
  ];

  let message: string | null = null;
  for (const candidate of messageCandidates) {
    const parsed = asNonEmptyString(candidate);
    if (parsed) {
      message = parsed;
      break;
    }
  }
  if (!message) {
    message = fallbackMessageForStatus(response.status);
  }

  const code =
    payload?.code ??
    payload?.error?.code ??
    payload?.error?.errorCode ??
    payload?.error?.error?.code ??
    payload?.error?.error?.errorCode;

  return { message, code, details };
}

const v2Fetch = async (
  input: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_V2_FETCH_TIMEOUT_MS
) => {
  const controller = new AbortController();
  const safeTimeoutMs = Math.max(1000, Number(timeoutMs) || DEFAULT_V2_FETCH_TIMEOUT_MS);
  const timeoutHandle = setTimeout(() => controller.abort(), safeTimeoutMs);

  if (init.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    return await globalThis.fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw createClientError("Request timed out. Please retry.", 408, "REQUEST_TIMEOUT");
    }
    throw createClientError(
      "Network request failed. Please check your connection and retry.",
      503,
      "NETWORK_UNAVAILABLE"
    );
  } finally {
    clearTimeout(timeoutHandle);
  }
};

export type LocationScope = "local" | "nationwide";
export type LocationCaptureMode = "city_state" | "street";
export type LocationSource = "google_places" | "legacy_parse" | "manual";

export interface StructuredLocationPayload {
  scope: LocationScope;
  captureMode: LocationCaptureMode;
  source?: LocationSource;
  placeId?: string;
  formattedAddress?: string;
  street1?: string;
  city?: string;
  stateCode?: string;
  stateName?: string;
  countryCode?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
  geo?: {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
  };
}

// Helper function to clean phone number (remove all non-digits)
export const cleanPhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, "");
};

// Helper to build auth headers with accessToken
const authHeaders = (accessToken?: string | null): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["accessToken"] = accessToken;
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return headers;
};

const authHeadersWithoutContentType = (
  accessToken?: string | null
): HeadersInit => {
  const headers: HeadersInit = {};
  if (accessToken) {
    headers["accessToken"] = accessToken;
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return headers;
};

const withLeagueAccessHeader = (
  headers: HeadersInit,
  leagueAccessToken?: string | null
): HeadersInit => {
  if (!leagueAccessToken) return headers;
  return {
    ...headers,
    "x-league-access-token": leagueAccessToken,
  };
};

// Helper function to parse API response
export const parseApiResponse = async (response: Response) => {
  const responseText = await response.text();
  let result: any = null;

  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch {
    const fallbackMessage = response.ok
      ? "Received an unexpected server response."
      : fallbackMessageForStatus(response.status);
    const err = createClientError(fallbackMessage, response.status, "INVALID_RESPONSE");
    err.payload = responseText?.substring(0, 200);
    throw err;
  }

  if (!response.ok) {
    const extracted = extractApiError(result, response);
    const err = new Error(extracted.message) as Error & {
      status?: number;
      code?: string | number;
      details?: string[];
      payload?: any;
      lockedPlayerIds?: number[];
      conflictingTradeIds?: string[];
    };
    err.status = response.status;
    err.code = extracted.code;
    err.details = extracted.details;
    err.payload = result;
    if (Array.isArray(result.lockedPlayerIds)) {
      err.lockedPlayerIds = result.lockedPlayerIds;
    }
    if (Array.isArray(result.conflictingTradeIds)) {
      err.conflictingTradeIds = result.conflictingTradeIds;
    }
    throw err;
  }

  return result;
};

// ──────────────────────────────────────────────
// AUTH API — signup, OTP, password
// ──────────────────────────────────────────────
export const authApi = {
  /**
   * Sign in with email/phone/username + password
   * POST /api/v2/auth/sign-in
   */
  signIn: async (credentials: {
    identifier?: string;
    email?: string;
    phone?: string;
    password: string;
  }) => {
    const response = await v2Fetch(`${V2_BASE}/auth/sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    return parseApiResponse(response);
  },

  /**
   * Send OTP to phone number for signup/login
   * POST /api/v2/user/signup
   */
  sendOTP: async (data: { countryCode: string; mobileNo: string }) => {
    const response = await v2Fetch(`${V2_BASE}/user/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        countryCode: data.countryCode,
        mobileNo: data.mobileNo,
      }),
    });
    return parseApiResponse(response);
  },

  /**
   * Verify OTP code
   * POST /api/v2/user/verify-otp
   */
  verifyOTP: async (data: { phoneNo: string; otp: string }) => {
    const response = await v2Fetch(`${V2_BASE}/user/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNo: data.phoneNo,
        otp: data.otp,
      }),
    });
    return parseApiResponse(response);
  },

  /**
   * Set password for user
   * POST /api/v2/user/set-password
   */
  setPassword: async (data: { phoneNo: string; password: string }) => {
    const response = await v2Fetch(`${V2_BASE}/user/set-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNo: data.phoneNo,
        password: data.password,
      }),
    });
    return parseApiResponse(response);
  },

  forgotPassword: async (data: { phoneNo: string }) => {
    const response = await v2Fetch(`${V2_BASE}/user/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  forgotPasswordVerify: async (data: { phoneNo: string; otp: string }) => {
    const response = await v2Fetch(`${V2_BASE}/user/forgot-password/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  getSession: async (accessToken?: string | null) => {
    const response = await v2Fetch(`${V2_BASE}/auth/session`, {
      method: "GET",
      headers: authHeaders(accessToken),
    });
    return parseApiResponse(response);
  },

  signOut: async (accessToken?: string | null) => {
    const response = await v2Fetch(`${V2_BASE}/auth/sign-out`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({}),
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      return { success: true };
    }

    if (!response.ok) {
      throw new Error(result?.message || "Failed to sign out");
    }
    return result;
  },
};

export const pushApi = {
  register: async (
    data: {
      deviceId: string;
      expoPushToken: string;
      platform?: "ios" | "android" | "unknown";
      appVersion?: string;
    },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/push/register`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  unregister: async (
    data: { deviceId?: string; expoPushToken?: string },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/push/unregister`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },
};

// ──────────────────────────────────────────────
// USER API — profile
// ──────────────────────────────────────────────
export const userApi = {
  /**
   * Create/update user profile (final signup step)
   * POST /api/v2/user/update-profile
   * Returns accessToken on success
   */
  updateProfile: async (data: {
    phoneNumber: string;
    countryCode: string;
    username: string;
    email: string;
    dateOfBirth: string;
    fullName: string;
    password: string;
    locationShared?: boolean;
  }) => {
    const response = await v2Fetch(`${V2_BASE}/user/update-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: data.phoneNumber,
        countryCode: data.countryCode,
        username: data.username,
        email: data.email,
        dateOfBirth: data.dateOfBirth,
        fullName: data.fullName,
        password: data.password,
        locationShared: data.locationShared ?? false,
      }),
    });
    return parseApiResponse(response);
  },

  getProfile: async (accessToken?: string | null) => {
    const response = await v2Fetch(`${V2_BASE}/user/profile`, {
      method: "GET",
      headers: authHeaders(accessToken),
    });
    return parseApiResponse(response);
  },

  updateAccount: async (
    data: {
      username?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      dob?: string;
      profilePicture?: string;
      isPublic?: boolean;
    },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/user/account`, {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  checkUsernameAvailability: async (username: string) => {
    const response = await v2Fetch(
      `${V2_BASE}/user/username-availability?username=${encodeURIComponent(
        username
      )}`,
      { method: "GET", headers: { "Content-Type": "application/json" } }
    );
    return parseApiResponse(response);
  },

  changePassword: async (
    data: { newPassword: string },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/user/change-password`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },
};

// ──────────────────────────────────────────────
// LEAGUE API
// ──────────────────────────────────────────────
export type HomeSnapshotStateKey =
  | "preseason"
  | "drafting"
  | "in_season"
  | "finalizing"
  | "season_complete"
  | "offseason_locked"
  | "ready_for_reactivation";

export interface SeasonLifecycleState {
  key?: HomeSnapshotStateKey;
  label?: string;
  week?: number | null;
  draftStatus?: "not_scheduled" | "scheduled" | "in_progress" | "completed" | null;
  weekStatus?: "upcoming" | "active" | "processing" | "complete" | null;
  activeSeasonYear?: number;
  nextSeasonYear?: number;
  reactivationWindowTimezone?: string;
  reactivationWindowStartsAt?: string;
  reactivationEligible?: boolean;
  offseasonLocked?: boolean;
}

export interface LeagueHomeSnapshot {
  state?: SeasonLifecycleState;
  matchup?: {
    week: number;
    status: "scheduled" | "active" | "final";
    mySquadId: string;
    mySquadName: string;
    mySquadImageUrl: string;
    opponentSquadId: string;
    opponentSquadName: string;
    opponentSquadImageUrl: string;
    myScores: { projected: number; live: number; final: number };
    opponentScores: { projected: number; live: number; final: number };
    displayScoreMode: "projected" | "live" | "final";
  } | null;
  cta?: {
    type: "join_squad" | "view_league" | null;
    label: string | null;
  };
}

export interface MyLeagueMembership {
  league: any;
  roles: string[];
  squadId: string | null;
  squad: { name: string; imageUrl: string } | null;
  membershipId: string;
  joinedAt: string;
  homeSnapshot?: LeagueHomeSnapshot | null;
  seasonLifecycle?: SeasonLifecycleState | null;
}

export const leagueApi = {
  create: async (
    data: {
      name: string;
      imageUrl?: string;
      description: string;
      address: string;
      leagueSize: number | null;
      communityType: string | null;
      isPublic: boolean;
      privatePasskey?: string;
      leagueType?: "squad" | "solo";
      locationPayload?: StructuredLocationPayload;
      waiverSettings?: {
        type?: "faab" | "reverse_standings";
        budgetDefault?: number;
        voteThresholdPct?: number;
        priorityResetMode?: "weekly_reverse_standings" | "rolling";
      };
      creator: string | undefined;
    },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/league/create`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  uploadImage: async (
    data: {
      uri: string;
      name?: string;
      type?: string;
      leagueId?: string;
    },
    accessToken?: string | null
  ) => {
    const formData = new FormData();
    formData.append("image", {
      uri: data.uri,
      name: data.name || `league-${Date.now()}.jpg`,
      type: data.type || "image/jpeg",
    } as any);
    if (data.leagueId) {
      formData.append("leagueId", data.leagueId);
    }

    const response = await v2Fetch(
      `${V2_BASE}/league/upload-image`,
      {
        method: "POST",
        headers: authHeadersWithoutContentType(accessToken),
        body: formData as any,
      },
      30_000
    );
    return parseApiResponse(response);
  },

  getMyLeagues: async (
    accessToken?: string | null
  ): Promise<MyLeagueMembership[]> => {
    const response = await v2Fetch(`${V2_BASE}/league/my-leagues`, {
      method: "GET",
      headers: authHeaders(accessToken),
    });
    return parseApiResponse(response) as Promise<MyLeagueMembership[]>;
  },

  getDetails: async (
    leagueId: string,
    accessToken?: string | null,
    options: { leagueAccessToken?: string | null } = {}
  ) => {
    const response = await v2Fetch(
      `${V2_BASE}/league/details?leagueId=${leagueId}`,
      {
        method: "GET",
        headers: withLeagueAccessHeader(
          authHeaders(accessToken),
          options.leagueAccessToken
        ),
      }
    );
    return parseApiResponse(response);
  },

  getUserProfile: async (leagueId: string, accessToken?: string | null) => {
    const response = await v2Fetch(
      `${V2_BASE}/league/user-profile?leagueId=${leagueId}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },

  getSquads: async (
    leagueId: string,
    accessToken?: string | null,
    options: { leagueAccessToken?: string | null } = {}
  ) => {
    const response = await v2Fetch(
      `${V2_BASE}/league/squads?leagueId=${leagueId}`,
      {
        method: "GET",
        headers: withLeagueAccessHeader(
          authHeaders(accessToken),
          options.leagueAccessToken
        ),
      }
    );
    return parseApiResponse(response);
  },

  /**
   * Search public leagues
   */
  searchPublicLeagues: async (
    queryOrFilters:
      | string
      | {
          q?: string;
          nameQuery?: string;
          cityStateQuery?: string;
        },
    accessToken?: string | null,
    options: { page?: number; pageLimit?: number } = {}
  ) => {
    const url = new URL(`${V2_BASE}/league/search`);
    if (typeof queryOrFilters === "string") {
      url.searchParams.append("q", queryOrFilters || "");
    } else {
      if (queryOrFilters?.q) {
        url.searchParams.append("q", queryOrFilters.q);
      }
      if (queryOrFilters?.nameQuery) {
        url.searchParams.append("nameQuery", queryOrFilters.nameQuery);
      }
      if (queryOrFilters?.cityStateQuery) {
        url.searchParams.append("cityStateQuery", queryOrFilters.cityStateQuery);
      }
    }
    if (options.page) {
      url.searchParams.append("page", String(options.page));
    }
    if (options.pageLimit) {
      url.searchParams.append("pageLimit", String(options.pageLimit));
    }

    const response = await v2Fetch(
      url.toString(),
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },

  joinSquadAsFirstMember: async (
    data: { squadId: string; name: string; isPublic: boolean },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(
      `${V2_BASE}/league/join-squad-as-first-member`,
      {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify(data),
      }
    );
    return parseApiResponse(response);
  },

  leaveSquad: async (
    data: { leagueId: string; squadId: string },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/league/leave-squad`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  verifyPrivatePasskey: async (
    data: { leagueId: string; passkey: string },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/league/private-passkey/verify`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  deleteLeague: async (leagueId: string, accessToken?: string | null) => {
    const response = await v2Fetch(`${V2_BASE}/league/delete`, {
      method: "DELETE",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ leagueId }),
    });
    return parseApiResponse(response);
  },

  getDraftSettings: async (
    options: { seasonId?: string; leagueId?: string },
    accessToken?: string | null
  ) => {
    const queryParam = options.seasonId
      ? `seasonId=${options.seasonId}`
      : options.leagueId
        ? `leagueId=${options.leagueId}`
        : "";
    if (!queryParam) throw new Error("Either seasonId or leagueId must be provided");

    const response = await v2Fetch(
      `${V2_BASE}/league/draft-settings?${queryParam}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },

  updateDraftSettings: async (
    options: { seasonId?: string; leagueId?: string },
    data: {
      draftTime?: string;
      autoStart?: boolean;
      draftType?: string;
      rounds?: number;
      secondsPerPick?: number;
      draftOrderMode?: "random" | "manual" | null;
      draftOrderSquadIds?: string[];
    },
    accessToken?: string | null
  ) => {
    const requestBody: Record<string, unknown> = { ...data };
    if (options.seasonId) requestBody.seasonId = options.seasonId;
    else if (options.leagueId) requestBody.leagueId = options.leagueId;
    else throw new Error("Either seasonId or leagueId must be provided");

    const response = await v2Fetch(`${V2_BASE}/league/draft-settings`, {
      method: "PUT",
      headers: authHeaders(accessToken),
      body: JSON.stringify(requestBody),
    });
    return parseApiResponse(response);
  },

  setDraftOrderMode: async (
    options: { seasonId?: string; leagueId?: string },
    draftOrderMode: "random" | "manual",
    accessToken?: string | null
  ) => {
    const requestBody: Record<string, unknown> = { draftOrderMode };
    if (options.seasonId) requestBody.seasonId = options.seasonId;
    else if (options.leagueId) requestBody.leagueId = options.leagueId;
    else throw new Error("Either seasonId or leagueId must be provided");

    const response = await v2Fetch(`${V2_BASE}/league/draft-order/mode`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(requestBody),
    });
    return parseApiResponse(response);
  },

  saveManualDraftOrder: async (
    options: { seasonId?: string; leagueId?: string },
    squadIds: string[],
    accessToken?: string | null
  ) => {
    const requestBody: Record<string, unknown> = { squadIds };
    if (options.seasonId) requestBody.seasonId = options.seasonId;
    else if (options.leagueId) requestBody.leagueId = options.leagueId;
    else throw new Error("Either seasonId or leagueId must be provided");

    const response = await v2Fetch(`${V2_BASE}/league/draft-order/manual`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(requestBody),
    });
    return parseApiResponse(response);
  },

  randomizeDraftOrder: async (
    options: { seasonId?: string; leagueId?: string },
    accessToken?: string | null
  ) => {
    const requestBody: Record<string, unknown> = {};
    if (options.seasonId) requestBody.seasonId = options.seasonId;
    else if (options.leagueId) requestBody.leagueId = options.leagueId;
    else throw new Error("Either seasonId or leagueId must be provided");

    const response = await v2Fetch(`${V2_BASE}/league/draft-order/randomize`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(requestBody),
    });
    return parseApiResponse(response);
  },

  getCommissionerMembers: async (
    leagueId: string,
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(
      `${V2_BASE}/league/commissioner/members?leagueId=${encodeURIComponent(leagueId)}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },

  removeLeagueMemberByCommissioner: async (
    data: { leagueId: string; memberUserId: string },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/league/commissioner/remove-member`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  transferLeagueCommissioner: async (
    data: { leagueId: string; newCommissionerUserId: string },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/league/commissioner/transfer`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  update: async (
    leagueId: string,
    data: {
      name?: string;
      imageUrl?: string;
      description?: string;
      address?: string;
      leagueSize?: number | null;
      maxSquadSize?: number | null;
      communityType?: string | null;
      isPublic?: boolean;
      privatePasskey?: string | null;
      userEligibility?: string | null;
      leagueType?: "squad" | "solo";
      locationPayload?: StructuredLocationPayload;
      waiverSettings?: {
        type?: "faab" | "reverse_standings";
        budgetDefault?: number;
        voteThresholdPct?: number;
        priorityResetMode?: "weekly_reverse_standings" | "rolling";
      };
    },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/league/update`, {
      method: "PUT",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ leagueId, ...data }),
    });
    return parseApiResponse(response);
  },

  getEligibilityRestrictions: async (accessToken?: string | null) => {
    const response = await v2Fetch(`${V2_BASE}/eligibility-restriction/list`, {
      method: "GET",
      headers: authHeaders(accessToken),
    });
    return parseApiResponse(response);
  },

  getSeasonByLeagueAndYear: async (
    leagueId: string,
    year: number,
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(
      `${V2_BASE}/league/season?leagueId=${leagueId}&year=${year}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },

  getSeasonRosters: async (accessToken: string, seasonId: string) => {
    const response = await v2Fetch(
      `${V2_BASE}/league/season-rosters?seasonId=${seasonId}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },

  getSeasonLifecycle: async (
    leagueId: string,
    accessToken?: string | null
  ): Promise<{
    leagueId: string;
    season: any | null;
    lifecycle: SeasonLifecycleState;
    permissions?: { canReactivate?: boolean };
  }> => {
    const response = await v2Fetch(
      `${V2_BASE}/league/season-lifecycle?leagueId=${leagueId}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },

  reactivateSeason: async (
    leagueId: string,
    accessToken?: string | null
  ): Promise<{
    success: boolean;
    leagueId: string;
    season: any;
    lifecycle: SeasonLifecycleState;
  }> => {
    const response = await v2Fetch(`${V2_BASE}/league/season/reactivate`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ leagueId }),
    });
    return parseApiResponse(response);
  },

  getSeasonHistory: async (
    leagueId: string,
    accessToken?: string | null
  ): Promise<{
    leagueId: string;
    items: any[];
  }> => {
    const response = await v2Fetch(
      `${V2_BASE}/league/season-history?leagueId=${leagueId}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },
};

export const locationApi = {
  autocomplete: async (
    input: string,
    mode: LocationCaptureMode,
    sessionToken?: string,
    accessToken?: string | null,
    options?: {
      signal?: AbortSignal;
      timeoutMs?: number;
    }
  ) => {
    const url = new URL(`${V2_BASE}/location/autocomplete`);
    url.searchParams.append("input", input || "");
    url.searchParams.append("mode", mode);
    if (sessionToken) {
      url.searchParams.append("sessionToken", sessionToken);
    }
    const response = await v2Fetch(url.toString(), {
      method: "GET",
      headers: authHeaders(accessToken),
      signal: options?.signal,
    }, options?.timeoutMs);
    return parseApiResponse(response);
  },

  getPlaceDetails: async (
    placeId: string,
    mode: LocationCaptureMode,
    sessionToken?: string,
    accessToken?: string | null,
    options?: {
      signal?: AbortSignal;
      timeoutMs?: number;
    }
  ) => {
    const url = new URL(`${V2_BASE}/location/place-details`);
    url.searchParams.append("placeId", placeId);
    url.searchParams.append("mode", mode);
    if (sessionToken) {
      url.searchParams.append("sessionToken", sessionToken);
    }
    const response = await v2Fetch(url.toString(), {
      method: "GET",
      headers: authHeaders(accessToken),
      signal: options?.signal,
    }, options?.timeoutMs);
    return parseApiResponse(response);
  },
};

// ──────────────────────────────────────────────
// INVITE API — squad & league invites
// ──────────────────────────────────────────────
export const inviteApi = {
  /**
   * Create a squad invite
   * POST /api/v2/invite/squad/create
   */
  createSquadInvite: async (squadId: string, accessToken: string) => {
    const response = await v2Fetch(`${V2_BASE}/invite/squad/create`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ squadId }),
    });
    return parseApiResponse(response);
  },

  /**
   * Validate a squad invite code (public, no auth needed)
   * GET /api/v2/deep-link/squad/{code}
   */
  validateSquadInvite: async (code: string) => {
    const response = await v2Fetch(`${V2_BASE}/deep-link/squad/${code}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return parseApiResponse(response);
  },

  /**
   * Join a squad via invite code
   * POST /api/v2/invite/squad/join
   */
  joinSquadViaInvite: async (
    data: { code: string; password?: string },
    accessToken: string
  ) => {
    const response = await v2Fetch(`${V2_BASE}/invite/squad/join`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  /**
   * Create a league invite
   * POST /api/v2/invite/league/create
   */
  createLeagueInvite: async (leagueId: string, accessToken: string) => {
    const response = await v2Fetch(`${V2_BASE}/invite/league/create`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ leagueId }),
    });
    return parseApiResponse(response);
  },

  /**
   * Validate a league invite code (public)
   * GET /api/v2/deep-link/league/{code}
   */
  validateLeagueInvite: async (code: string) => {
    const response = await v2Fetch(`${V2_BASE}/deep-link/league/${code}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return parseApiResponse(response);
  },

  /**
   * Join a league via invite code
   * POST /api/v2/invite/league/join
   */
  joinLeagueViaInvite: async (
    code: string,
    accessToken: string,
    passkey?: string
  ) => {
    const response = await v2Fetch(`${V2_BASE}/invite/league/join`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ code, passkey }),
    });
    return parseApiResponse(response);
  },
};

// ──────────────────────────────────────────────
// SQUAD API — settings, management
// ──────────────────────────────────────────────
export const squadApi = {
  /**
   * Get squad details
   * GET /api/v2/squad/details?squadId=xxx
   */
  getDetails: async (squadId: string, accessToken?: string | null) => {
    const response = await v2Fetch(`${V2_BASE}/squad/details?squadId=${squadId}`, {
      method: "GET",
      headers: authHeaders(accessToken),
    });
    return parseApiResponse(response);
  },

  /**
   * Join a squad
   * POST /api/v2/squad/join
   */
  join: async (
    data: { squadId: string; password?: string },
    accessToken: string
  ) => {
    const response = await v2Fetch(`${V2_BASE}/squad/join`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  /**
   * Update squad settings
   * PUT /api/v2/squad/settings
   */
  updateSettings: async (
    data: {
      squadId: string;
      name?: string;
      isPublic?: boolean;
      password?: string;
      minCapacity?: number;
      maxCapacity?: number;
      imageUrl?: string;
    },
    accessToken: string
  ) => {
    const response = await v2Fetch(`${V2_BASE}/squad/settings`, {
      method: "PUT",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  /**
   * Kick a member from squad
   * POST /api/v2/squad/kick-member
   */
  kickMember: async (
    data: { squadId: string; memberUserId: string },
    accessToken: string
  ) => {
    const response = await v2Fetch(`${V2_BASE}/squad/kick-member`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  /**
   * Transfer head coach role
   * POST /api/v2/squad/transfer-head-coach
   */
  transferHeadCoach: async (
    data: { squadId: string; newHeadCoachUserId: string },
    accessToken: string
  ) => {
    const response = await v2Fetch(`${V2_BASE}/squad/transfer-head-coach`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },
};

// ──────────────────────────────────────────────
// PLAYER INGEST API (development only)
// ──────────────────────────────────────────────
export const playerIngestApi = {
  triggerIngest: async (accessToken: string) => {
    const response = await v2Fetch(`${V2_BASE}/player-ingest/trigger`, {
      method: "POST",
      headers: authHeaders(accessToken),
    });
    return parseApiResponse(response);
  },

  getPlayers: async (accessToken: string, category?: string) => {
    const url = new URL(`${V2_BASE}/player-ingest/players`);
    if (category) url.searchParams.append("category", category);

    const response = await v2Fetch(url.toString(), {
      method: "GET",
      headers: authHeaders(accessToken),
    });
    return parseApiResponse(response);
  },
};

export const playerApiV2 = {
  list: async (
    params: { search?: string; position?: string; limit?: number } = {},
    accessToken?: string | null
  ) => {
    const url = new URL(`${V2_BASE}/player/list`);
    if (params.search) url.searchParams.append("search", params.search);
    if (params.position) url.searchParams.append("position", params.position);
    if (typeof params.limit === "number") {
      url.searchParams.append("limit", String(params.limit));
    }

    const response = await v2Fetch(url.toString(), {
      method: "GET",
      headers: authHeaders(accessToken),
    });
    return parseApiResponse(response);
  },

  getDetails: async (
    params: { playerId: number; leagueId?: string; seasonYear?: number },
    accessToken?: string | null
  ) => {
    const url = new URL(`${V2_BASE}/player/details`);
    url.searchParams.append("playerId", String(params.playerId));
    if (params.leagueId) {
      url.searchParams.append("leagueId", params.leagueId);
    }
    if (typeof params.seasonYear === "number") {
      url.searchParams.append("seasonYear", String(params.seasonYear));
    }

    const response = await v2Fetch(url.toString(), {
      method: "GET",
      headers: authHeaders(accessToken),
    });
    return parseApiResponse(response);
  },
};

// ──────────────────────────────────────────────
// DRAFT API
// ──────────────────────────────────────────────
export const draftApi = {
  getDraftState: async (accessToken: string, draftId: string) => {
    const url = new URL(`${V2_BASE}/draft/state`);
    url.searchParams.append("draftId", draftId);

    const response = await v2Fetch(url.toString(), {
      method: "GET",
      headers: authHeaders(accessToken),
    });
    return parseApiResponse(response);
  },

  getAvailablePlayers: async (
    accessToken: string,
    seasonId: string,
    options: {
      draftId?: string;
      searchText?: string;
      position?: string;
      page?: number;
      pageLimit?: number;
    } = {}
  ) => {
    const url = new URL(`${V2_BASE}/draft/available-players`);
    url.searchParams.append("seasonId", seasonId);
    if (options.draftId) {
      url.searchParams.append("draftId", options.draftId);
    }
    if (options.searchText) {
      url.searchParams.append("searchText", options.searchText);
    }
    if (options.position && options.position !== "ALL") {
      url.searchParams.append("position", options.position);
    }
    if (options.page) {
      url.searchParams.append("page", String(options.page));
    }
    if (options.pageLimit) {
      url.searchParams.append("pageLimit", String(options.pageLimit));
    }

    const response = await v2Fetch(url.toString(), {
      method: "GET",
      headers: authHeaders(accessToken),
    });
    return parseApiResponse(response);
  },

  manualPick: async (
    accessToken: string,
    draftId: string,
    playerId: string
  ) => {
    const response = await v2Fetch(`${V2_BASE}/draft/manual-pick`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ draftId, playerId }),
    });
    return parseApiResponse(response);
  },

  castVote: async (
    accessToken: string,
    draftId: string,
    playerId: string
  ) => {
    const response = await v2Fetch(`${V2_BASE}/draft/vote`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ draftId, playerId }),
    });
    return parseApiResponse(response);
  },

  getVotes: async (accessToken: string, draftId: string) => {
    const url = new URL(`${V2_BASE}/draft/votes`);
    url.searchParams.append("draftId", draftId);

    const response = await v2Fetch(url.toString(), {
      method: "GET",
      headers: authHeaders(accessToken),
    });
    return parseApiResponse(response);
  },

  getDraftBoard: async (accessToken: string, draftId: string) => {
    const url = new URL(`${V2_BASE}/draft/draft-board`);
    url.searchParams.append("draftId", draftId);

    const response = await v2Fetch(url.toString(), {
      method: "GET",
      headers: authHeaders(accessToken),
    });
    return parseApiResponse(response);
  },
};

export const leaderboardApi = {
  getLargestLeagues: async (limit = 10) => {
    const response = await v2Fetch(
      `${V2_BASE}/leaderboard/largest-leagues?limit=${encodeURIComponent(String(limit))}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    return parseApiResponse(response);
  },
  getHighestScoringSquads: async (limit = 10) => {
    const response = await v2Fetch(
      `${V2_BASE}/leaderboard/highest-scoring-squads?limit=${encodeURIComponent(String(limit))}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    return parseApiResponse(response);
  },
  getTopPerformers: async (limit = 10) => {
    const response = await v2Fetch(
      `${V2_BASE}/leaderboard/top-performers?limit=${encodeURIComponent(String(limit))}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    return parseApiResponse(response);
  },
};

// ──────────────────────────────────────────────
// FANTASY V2 API — week, matchup, lineup, waivers, trades, leaderboard
// ──────────────────────────────────────────────
export const weekApi = {
  getState: async (leagueId: string, accessToken?: string | null) => {
    const response = await v2Fetch(
      `${V2_BASE}/week/state?leagueId=${encodeURIComponent(leagueId)}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },
  recompute: async (
    data: { leagueId: string; week?: number },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/week/recompute`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },
};

export const matchupApi = {
  getWeek: async (
    leagueId: string,
    week: number,
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(
      `${V2_BASE}/matchup/week?leagueId=${encodeURIComponent(leagueId)}&week=${encodeURIComponent(String(week))}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },
  getLive: async (matchupId: string, accessToken?: string | null) => {
    const response = await v2Fetch(
      `${V2_BASE}/matchup/live?matchupId=${encodeURIComponent(matchupId)}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },
  getSeason: async (leagueId: string, accessToken?: string | null) => {
    const response = await v2Fetch(
      `${V2_BASE}/matchup/season?leagueId=${encodeURIComponent(leagueId)}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },
  getCenter: async (
    leagueId: string,
    week?: number | null,
    rows: "selected" | "all" = "selected",
    accessToken?: string | null
  ) => {
    const url = new URL(`${V2_BASE}/matchup/center`);
    url.searchParams.append("leagueId", leagueId);
    if (week && Number.isFinite(Number(week)) && Number(week) > 0) {
      url.searchParams.append("week", String(week));
    }
    url.searchParams.append("rows", rows);

    const response = await v2Fetch(url.toString(), {
      method: "GET",
      headers: authHeaders(accessToken),
    });
    return parseApiResponse(response);
  },
  getCenterLive: async (
    leagueId: string,
    week: number,
    cursor?: string | null,
    rows: "selected" | "all" = "selected",
    accessToken?: string | null
  ) => {
    const url = new URL(`${V2_BASE}/matchup/center/live`);
    url.searchParams.append("leagueId", leagueId);
    url.searchParams.append("week", String(week));
    url.searchParams.append("rows", rows);
    if (cursor) {
      url.searchParams.append("cursor", cursor);
    }

    const response = await v2Fetch(url.toString(), {
      method: "GET",
      headers: authHeaders(accessToken),
    });
    return parseApiResponse(response);
  },
};

export const lineupApi = {
  vote: async (
    data: {
      leagueId: string;
      squadId?: string;
      week: number;
      slot: string;
      playerId: number;
      projectedPoints?: number;
      injuryStatus?: string;
    },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/lineup/vote`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },
  updateVote: async (
    data: {
      leagueId: string;
      squadId?: string;
      week: number;
      slot: string;
      playerId: number;
      projectedPoints?: number;
      injuryStatus?: string;
    },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/lineup/vote`, {
      method: "PUT",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },
  resolve: async (
    data: {
      leagueId: string;
      squadId: string;
      week: number;
      starters?: any[];
      bench?: any[];
    },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/lineup/resolve`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },
  getWeek: async (
    data: { squadId: string; week: number },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(
      `${V2_BASE}/lineup/week?squadId=${encodeURIComponent(data.squadId)}&week=${encodeURIComponent(String(data.week))}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },
  submit: async (
    data: {
      leagueId: string;
      squadId?: string;
      week: number;
      starters: {
        slot?: string;
        position?: string;
        slotIndex?: number;
        playerId: number;
      }[];
    },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/lineup/submit`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },
  getContext: async (
    data: { leagueId: string; squadId?: string; week: number; includeVoteDetails?: boolean },
    accessToken?: string | null
  ) => {
    const params = new URLSearchParams({
      leagueId: data.leagueId,
      week: String(data.week),
    });
    if (data.squadId) {
      params.set("squadId", data.squadId);
    }
    if (data.includeVoteDetails) {
      params.set("includeVoteDetails", "true");
    }
    const response = await v2Fetch(`${V2_BASE}/lineup/context?${params.toString()}`, {
      method: "GET",
      headers: authHeaders(accessToken),
    });
    return parseApiResponse(response);
  },
};

export const waiverApi = {
  claim: async (
    data: {
      leagueId: string;
      addPlayerId: number;
      dropPlayerId?: number | null;
      bidAmount: number;
      week?: number;
      mode?: "auto" | "waiver" | "immediate";
    },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/waiver/claim`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },
  vote: async (
    data: { claimId: string; vote: "approve" | "reject" },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/waiver/vote`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },
  getPending: async (leagueId: string, accessToken?: string | null) => {
    const response = await v2Fetch(
      `${V2_BASE}/waiver/pending?leagueId=${encodeURIComponent(leagueId)}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },
  getHistory: async (leagueId: string, accessToken?: string | null) => {
    const response = await v2Fetch(
      `${V2_BASE}/waiver/history?leagueId=${encodeURIComponent(leagueId)}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },
  getPlayerPool: async (
    params: {
      leagueId: string;
      searchText?: string;
      position?: string;
      page?: number;
      pageLimit?: number;
      week?: number;
    },
    accessToken?: string | null
  ) => {
    const url = new URL(`${V2_BASE}/waiver/player-pool`);
    url.searchParams.append("leagueId", params.leagueId);
    if (params.searchText) {
      url.searchParams.append("searchText", params.searchText);
    }
    if (params.position) {
      url.searchParams.append("position", params.position);
    }
    if (Number.isFinite(Number(params.page)) && Number(params.page) > 0) {
      url.searchParams.append("page", String(params.page));
    }
    if (Number.isFinite(Number(params.pageLimit)) && Number(params.pageLimit) > 0) {
      url.searchParams.append("pageLimit", String(params.pageLimit));
    }
    if (Number.isFinite(Number(params.week)) && Number(params.week) > 0) {
      url.searchParams.append("week", String(params.week));
    }

    const response = await v2Fetch(url.toString(), {
      method: "GET",
      headers: authHeaders(accessToken),
    });
    return parseApiResponse(response);
  },
};

export const tradeApiV2 = {
  propose: async (
    data: {
      leagueId: string;
      receiverSquadId: string;
      offeredAssets: { type: "player"; playerId: number; fromSquadId: string }[];
      requestedAssets: { type: "player"; playerId: number; fromSquadId: string }[];
    },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/trade/propose`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },
  vote: async (
    data: { tradeProposalId: string; vote: "approve" | "reject" },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/trade/vote`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },
  receiverDecision: async (
    data: { tradeProposalId: string; decision: "accept" | "reject" },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/trade/receiver-decision`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },
  getPending: async (leagueId: string, accessToken?: string | null) => {
    const response = await v2Fetch(
      `${V2_BASE}/trade/pending?leagueId=${encodeURIComponent(leagueId)}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },
  getHistory: async (leagueId: string, accessToken?: string | null) => {
    const response = await v2Fetch(
      `${V2_BASE}/trade/history?leagueId=${encodeURIComponent(leagueId)}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },
};

export const leaderboardApiV2 = {
  getStandings: async (leagueId: string, accessToken?: string | null) => {
    const response = await v2Fetch(
      `${V2_BASE}/leaderboard/standings?leagueId=${encodeURIComponent(leagueId)}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },
  getWeeklyHighScore: async (
    leagueId: string,
    week: number,
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(
      `${V2_BASE}/leaderboard/weekly-high-score?leagueId=${encodeURIComponent(leagueId)}&week=${encodeURIComponent(String(week))}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },
  getStartSitAccuracy: async (
    leagueId: string,
    range: string = "season",
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(
      `${V2_BASE}/leaderboard/start-sit-accuracy-v2?leagueId=${encodeURIComponent(leagueId)}&range=${encodeURIComponent(range)}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },
};

// ──────────────────────────────────────────────
// SIMULATION API (development / admin only)
// ──────────────────────────────────────────────
export const simApi = {
  startRun: async (
    data: {
      leagueId: string;
      seasonId?: string;
      sportsSeason?: number;
      seed?: number;
      dryRun?: boolean;
    },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/sim/run/start`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  stepRun: async (
    data: {
      runId: string;
      action?: "advance_week";
    },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/sim/run/step`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  batchRun: async (
    data: {
      leagueIds: string[];
      seasons?: number[];
      maxLeagues?: number;
      seed?: number;
      dryRun?: boolean;
    },
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(`${V2_BASE}/sim/run/batch`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    return parseApiResponse(response);
  },

  getRunStatus: async (
    runId: string,
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(
      `${V2_BASE}/sim/run/status?runId=${encodeURIComponent(runId)}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },

  getRunLogs: async (
    runId: string,
    limit: number = 200,
    accessToken?: string | null
  ) => {
    const response = await v2Fetch(
      `${V2_BASE}/sim/run/logs?runId=${encodeURIComponent(runId)}&limit=${encodeURIComponent(String(limit))}`,
      { method: "GET", headers: authHeaders(accessToken) }
    );
    return parseApiResponse(response);
  },
};
