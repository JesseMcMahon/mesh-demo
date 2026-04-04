import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { authClient } from "@/lib/auth";
import { User, AuthError, SignInCredentials } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      // When backend is ready, uncomment this:
      // const session = await authClient.getSession();
      // if (session?.user) {
      //   setUser(session.user);
      // } else {
      //   setUser(null);
      // }

      // TODO: Remove this mock when backend is ready
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    const { email, password } = credentials;

    // Basic validation
    if (!email || !email.includes("@")) {
      throw new AuthError(
        "Please enter a valid email address",
        "INVALID_EMAIL"
      );
    }
    if (!password || password.length < 6) {
      throw new AuthError(
        "Password must be at least 6 characters",
        "INVALID_PASSWORD"
      );
    }

    try {
      // When backend is ready, uncomment this:
      // const result = await authClient.signIn.email({
      //   email: email.trim().toLowerCase(),
      //   password,
      // });
      //
      // if (!result.user) {
      //   throw new AuthError("Invalid email or password", "INVALID_CREDENTIALS", 401);
      // }
      //
      // setUser(result.user);

      // TODO: Remove this mock when backend is ready
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock: In production, this would be set from the API response
      // setUser({ id: "1", email });
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof Error) {
        if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          throw new AuthError(
            "Network error. Please check your connection.",
            "NETWORK_ERROR",
            0
          );
        }
      }

      // Generic error
      throw new AuthError(
        "An error occurred during sign in. Please try again.",
        "SIGN_IN_ERROR"
      );
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // When backend is ready, uncomment this:
      // await authClient.signOut();
      setUser(null);
    } catch {
      // Even if sign out fails on backend, clear local state
      setUser(null);

      // Don't throw - we've cleared local state
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      // When backend is ready, uncomment this:
      // const session = await authClient.getSession();
      // if (session?.user) {
      //   setUser(session.user);
      // } else {
      //   setUser(null);
      // }

      // For now, just re-check auth
      await checkAuth();
    } catch {
      setUser(null);
    }
  }, [checkAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
