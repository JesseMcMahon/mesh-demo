import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useUserProfile } from "@/contexts/user-profile";
import { useNotification } from "@/contexts/notification";
import { authApi, userApi, cleanPhoneNumber } from "@/lib/api";
import { getUserErrorMessage } from "@/lib/errorMessages";
import {
  getAndClearPendingLeagueRedirect,
  getAndClearPendingInviteRedirect,
} from "@/lib/redirect";
import { unregisterPushRegistration } from "@/lib/pushNotifications";

/**
 * Sign in with email/phone/username + password
 * POST /api/v2/auth/sign-in
 */
export function useSignIn() {
  const router = useRouter();
  const { setUser, setAccessToken } = useUserProfile();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: async (credentials: {
      identifier?: string;
      password: string;
    }) => {
      return authApi.signIn(credentials);
    },
    onSuccess: async (result) => {
      if (result.data?.user) {
        setUser({
          id: result.data.user.id || result.data.user._id,
          username: result.data.user.username,
          name: result.data.user.name?.firstName
            ? `${result.data.user.name.firstName} ${result.data.user.name.lastName}`.trim()
            : result.data.user.fullName || result.data.user.name,
          email: result.data.user.email,
          phoneNumber: result.data.user.phoneNumber || result.data.user.phone,
          phoneVerified: result.data.user.phoneVerified,
          emailVerified: result.data.user.emailVerified,
        });
      }

      const token =
        result.data?.accessToken ||
        result.data?.session?.accessToken ||
        result.accessToken;
      if (token) {
        setAccessToken(token);
      }

      // Check for pending invite redirect first
      const pendingInvite = await getAndClearPendingInviteRedirect();
      if (pendingInvite) {
        if (pendingInvite.type === "squad") {
          router.replace(
            `/(tabs)/join-squad?code=${pendingInvite.code}` as any
          );
        } else {
          router.replace(
            `/(tabs)/join-league?code=${pendingInvite.code}` as any
          );
        }
        return;
      }

      const leagueId = await getAndClearPendingLeagueRedirect();
      if (leagueId) {
        router.replace(`/(tabs)/league/${leagueId}` as any);
      } else {
        router.replace("/(tabs)" as any);
      }
    },
    onError: (error: Error) => {
      showNotification(getUserErrorMessage(error, "Invalid credentials. Please try again."), "error");
    },
  });
}

/**
 * Send OTP for signup/login
 * Uses new POST /api/v2/user/signup endpoint
 */
export function useSendOTP() {
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: async (data: { phoneNumber: string; countryCode: string }) => {
      const cleanedPhone = cleanPhoneNumber(data.phoneNumber);
      return authApi.sendOTP({
        countryCode: data.countryCode,
        mobileNo: cleanedPhone,
      });
    },
    onError: (error: Error) => {
      showNotification(getUserErrorMessage(error, "Failed to send OTP. Please try again."), "error");
    },
  });
}

/**
 * Verify OTP code
 * Uses new POST /api/v2/user/verify-otp endpoint
 */
export function useVerifyOTP() {
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: async (data: {
      phoneNumber: string;
      countryCode: string;
      code: string;
    }) => {
      const cleanedPhone = cleanPhoneNumber(data.phoneNumber);
      // Backend expects phoneNo as combined format: "+11234567890"
      const phoneNo = `${data.countryCode}${cleanedPhone}`;
      return authApi.verifyOTP({
        phoneNo,
        otp: data.code,
      });
    },
    onError: (error: Error) => {
      showNotification(getUserErrorMessage(error, "Invalid OTP. Please try again."), "error");
    },
  });
}

/**
 * Set password after OTP verification
 * Uses POST /api/v2/user/set-password
 */
export function useSetPassword() {
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: async (data: {
      phoneNumber: string;
      countryCode: string;
      password: string;
    }) => {
      const cleanedPhone = cleanPhoneNumber(data.phoneNumber);
      const phoneNo = `${data.countryCode}${cleanedPhone}`;
      return authApi.setPassword({
        phoneNo,
        password: data.password,
      });
    },
    onError: (error: Error) => {
      showNotification(getUserErrorMessage(error, "Failed to set password. Please try again."), "error");
    },
  });
}

/**
 * Update profile (final signup step)
 * POST /api/v2/user/update-profile
 * Returns accessToken on success
 */
export function useUpdateProfile() {
  const router = useRouter();
  const { setUser, setAccessToken } = useUserProfile();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: async (data: {
      phoneNumber: string;
      countryCode: string;
      fullName: string;
      email: string;
      dateOfBirth: string;
      username: string;
      password: string;
      locationShared?: boolean;
      confirmPassword?: string;
    }) => {
      return userApi.updateProfile({
        phoneNumber: cleanPhoneNumber(data.phoneNumber),
        countryCode: data.countryCode,
        fullName: data.fullName,
        email: data.email,
        dateOfBirth: data.dateOfBirth,
        username: data.username,
        password: data.password,
        locationShared: data.locationShared,
      });
    },
    onSuccess: async (result, variables) => {
      // Store user data
      if (result.data?.user) {
        setUser({
          id: result.data.user.id || result.data.user._id,
          username: result.data.user.username,
          name:
            result.data.user.fullName ||
            (result.data.user.name?.firstName
              ? `${result.data.user.name.firstName} ${result.data.user.name.lastName}`.trim()
              : result.data.user.name) ||
            variables.fullName,
          email: result.data.user.email || variables.email,
          phoneNumber:
            result.data.user.phoneNumber ||
            result.data.user.phone ||
            variables.phoneNumber,
          phoneVerified: result.data.user.phoneVerified ?? true,
          emailVerified: result.data.user.emailVerified,
        });
      }

      // Store access token
      const token =
        result.data?.accessToken ||
        result.data?.session?.accessToken ||
        result.accessToken;
      if (token) {
        setAccessToken(token);
      }

      // Check for pending invite redirect first
      const pendingInvite = await getAndClearPendingInviteRedirect();
      if (pendingInvite) {
        if (pendingInvite.type === "squad") {
          router.replace(
            `/(tabs)/join-squad?code=${pendingInvite.code}` as any
          );
        } else {
          router.replace(
            `/(tabs)/join-league?code=${pendingInvite.code}` as any
          );
        }
        return;
      }

      // Check for pending league redirect
      const leagueId = await getAndClearPendingLeagueRedirect();
      if (leagueId) {
        router.replace(`/(tabs)/league/${leagueId}` as any);
      } else {
        router.replace("/(tabs)" as any);
      }
    },
    onError: (error: Error) => {
      showNotification(getUserErrorMessage(error, "Failed to create account. Please try again."), "error");
    },
  });
}

/**
 * Sign out
 */
export function useSignOut() {
  const router = useRouter();
  const { clearUser, accessToken } = useUserProfile();

  return useMutation({
    mutationFn: async () => {
      await unregisterPushRegistration(accessToken);
      return authApi.signOut(accessToken);
    },
    onSuccess: () => {
      clearUser();
      router.replace("/login" as any);
    },
    onError: () => {
      // Even on error, clear local state and redirect
      clearUser();
      router.replace("/login" as any);
    },
  });
}
