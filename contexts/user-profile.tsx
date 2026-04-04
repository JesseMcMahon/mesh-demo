import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApi } from "@/lib/api";
import { syncPushRegistration } from "@/lib/pushNotifications";

interface User {
  id: string;
  username?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
}

interface UserProfileContextType {
  user: User | null;
  accessToken: string | null;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  updateUser: (updates: Partial<User>) => void;
  clearUser: () => void;
  isAuthenticated: boolean;
  validateSession: () => Promise<boolean>;
  setLeagueAccessToken: (leagueId: string, token: string) => void;
  getLeagueAccessToken: (leagueId: string) => string | null;
  clearLeagueAccessTokens: () => void;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(
  undefined
);

const ACCESS_TOKEN_KEY = "@mesh_access_token";
const USER_KEY = "@mesh_user";

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [leagueAccessTokens, setLeagueAccessTokens] = useState<
    Record<string, string>
  >({});

  // Load persisted data on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(ACCESS_TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (storedToken) {
          setAccessToken(storedToken);
        }

        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {
            // Silently fail parsing
          }
        }
      } catch (error) {
        // Silently fail loading
      } finally {
        setIsHydrated(true);
      }
    };

    loadPersistedData();
  }, []);

  // Persist access token when it changes
  useEffect(() => {
    const persistToken = async () => {
      if (accessToken) {
        try {
          await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        } catch (error) {
          // Silently fail storage
        }
      } else {
        try {
          await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
        } catch (error) {
          // Silently fail removal
        }
      }
    };

    if (isHydrated) {
      persistToken();
    }
  }, [accessToken, isHydrated]);

  // Persist user when it changes
  useEffect(() => {
    const persistUser = async () => {
      if (user) {
        try {
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
        } catch (error) {
          // Silently fail storage
        }
      } else {
        try {
          await AsyncStorage.removeItem(USER_KEY);
        } catch (error) {
          // Silently fail removal
        }
      }
    };

    if (isHydrated) {
      persistUser();
    }
  }, [user, isHydrated]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const clearLeagueAccessTokens = useCallback(() => {
    setLeagueAccessTokens({});
  }, []);

  const setLeagueAccessToken = useCallback((leagueId: string, token: string) => {
    const key = String(leagueId || "").trim();
    const nextToken = String(token || "").trim();
    if (!key || !nextToken) return;
    setLeagueAccessTokens((prev) => ({ ...prev, [key]: nextToken }));
  }, []);

  const getLeagueAccessToken = useCallback(
    (leagueId: string) => {
      const key = String(leagueId || "").trim();
      if (!key) return null;
      return leagueAccessTokens[key] || null;
    },
    [leagueAccessTokens]
  );

  const clearUser = useCallback(async () => {
    setUser(null);
    setAccessToken(null);
    clearLeagueAccessTokens();
    try {
      await Promise.all([
        AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);
    } catch (error) {
      // Silently fail clearing
    }
  }, [clearLeagueAccessTokens]);

  const validateSession = useCallback(async () => {
    if (!accessToken) return false;
    try {
      const response = await authApi.getSession(accessToken);
      const payload = response?.data || response;
      const sessionUser = payload?.user || payload?.data?.user || null;
      if (!sessionUser) {
        throw new Error("Session user missing");
      }

      setUser({
        id: sessionUser.id || sessionUser._id,
        username: sessionUser.username || undefined,
        name: sessionUser.name || undefined,
        email: sessionUser.email || undefined,
        phoneNumber: sessionUser.phone || sessionUser.phoneNumber || undefined,
        phoneVerified: sessionUser.phoneVerified,
        emailVerified: sessionUser.emailVerified,
      });
      return true;
    } catch {
      await clearUser();
      return false;
    }
  }, [accessToken, clearUser]);

  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    void validateSession();
  }, [isHydrated, accessToken, validateSession]);

  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    void syncPushRegistration(accessToken);
  }, [isHydrated, accessToken]);

  useEffect(() => {
    if (!isHydrated) return;
    let isValidating = false;
    let lastValidatedAt = 0;

    const maybeValidate = async (state: AppStateStatus) => {
      if (state !== "active") return;
      if (!accessToken || isValidating) return;
      const now = Date.now();
      if (now - lastValidatedAt < 15000) return;
      isValidating = true;
      lastValidatedAt = now;
      try {
        await validateSession();
        await syncPushRegistration(accessToken);
      } finally {
        isValidating = false;
      }
    };

    const subscription = AppState.addEventListener("change", (state) => {
      void maybeValidate(state);
    });
    return () => {
      subscription.remove();
    };
  }, [accessToken, isHydrated, validateSession]);

  return (
    <UserProfileContext.Provider
      value={{
        user,
        accessToken,
        isHydrated,
        setUser,
        setAccessToken,
        updateUser,
        clearUser,
        isAuthenticated: !!user && !!accessToken,
        validateSession,
        setLeagueAccessToken,
        getLeagueAccessToken,
        clearLeagueAccessTokens,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error("useUserProfile must be used within a UserProfileProvider");
  }
  return context;
}
