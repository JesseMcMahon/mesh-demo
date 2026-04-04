import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Link } from "expo-router";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNotification } from "@/contexts/notification";
import {
  useSendOTP,
  useVerifyOTP,
  useUpdateProfile,
} from "@/hooks/useAuthMutations";
import { SURFACE, SEMANTIC, TEXT } from "@/constants/colors";
import { useAppTheme } from "@/contexts/theme";
import { MeshBanner } from "@/components/MeshBanner";
import { MeshButton } from "@/components/MeshButton";
import { MeshTextInput } from "@/components/MeshTextInput";
import { MeshPhoneInput } from "@/components/MeshPhoneInput";
import { Country } from "@/components/CountryCodeSelector";
import { userApi } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

interface SignupData {
  phoneNumber: string;
  countryCode: string;
  fullName: string;
  email: string;
  dateOfBirth: string;
  username: string;
  password: string;
  confirmPassword: string;
  locationShared: boolean;
}

interface FieldErrors {
  phoneNumber?: string;
  fullName?: string;
  email?: string;
  dateOfBirth?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

const DEFAULT_COUNTRY: Country = {
  code: "US",
  dialCode: "+1",
  flag: "\u{1F1FA}\u{1F1F8}",
  name: "United States",
};

// Validation helpers
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,30}$/.test(username);
}

function validateAge(dob: string, minAge: number = 18): boolean {
  const parts = dob.split("/");
  if (parts.length !== 3) return false;
  const month = parseInt(parts[0]) - 1;
  const day = parseInt(parts[1]);
  const year = parseInt(parts[2]);
  const birthDate = new Date(year, month, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= minAge;
}

export default function SignupScreen() {
  const { showNotification } = useNotification();
  const { colors } = useAppTheme();
  const sendOTPMutation = useSendOTP();
  const verifyOTPMutation = useVerifyOTP();
  const updateProfileMutation = useUpdateProfile();
  const scrollViewRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [hasVerified, setHasVerified] = useState(false);
  const otpInputRefs = useRef<(TextInput | null)[]>([]);
  const [selectedCountry, setSelectedCountry] =
    useState<Country>(DEFAULT_COUNTRY);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState<SignupData>({
    phoneNumber: "",
    countryCode: "+1",
    fullName: "",
    email: "",
    dateOfBirth: "",
    username: "",
    password: "",
    confirmPassword: "",
    locationShared: false,
  });

  const trimmedUsername = formData.username.trim();
  const debouncedUsername = useDebouncedValue(trimmedUsername, 450);
  const shouldCheckUsername =
    step === 4 &&
    debouncedUsername.length >= 3 &&
    validateUsername(debouncedUsername);
  const usernameAvailabilityQuery = useQuery({
    queryKey: ["username-availability", debouncedUsername],
    queryFn: () => userApi.checkUsernameAvailability(debouncedUsername),
    enabled: shouldCheckUsername,
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
  });
  const usernameAvailable = shouldCheckUsername
    ? Boolean((usernameAvailabilityQuery.data as any)?.available)
    : null;

  const updateFormData = (field: keyof SignupData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (field in errors) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const parseDateFromString = (dateString: string): Date | null => {
    if (!dateString) return null;
    const parts = dateString.split("/");
    if (parts.length === 3) {
      const month = parseInt(parts[0]) - 1;
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
    return null;
  };

  useEffect(() => {
    if (formData.dateOfBirth && !selectedDate) {
      const parsed = parseDateFromString(formData.dateOfBirth);
      if (parsed) setSelectedDate(parsed);
    }
  }, [formData.dateOfBirth, selectedDate]);

  const validateStep = (): boolean => {
    const newErrors: FieldErrors = {};

    switch (step) {
      case 1:
        if (!formData.phoneNumber.trim() || formData.phoneNumber.replace(/\D/g, "").length < 7) {
          newErrors.phoneNumber = "Enter a valid phone number";
        }
        break;
      case 2:
        const otpString = otp.join("");
        if (!otpString || otpString.length !== 6) {
          showNotification("Please enter the 6-digit code", "error");
          return false;
        }
        return true;
      case 3:
        if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
          newErrors.fullName = "Enter your full name";
        }
        if (!formData.email.trim() || !validateEmail(formData.email)) {
          newErrors.email = "Enter a valid email address";
        }
        if (!formData.dateOfBirth.trim()) {
          newErrors.dateOfBirth = "Select your date of birth";
        } else if (!validateAge(formData.dateOfBirth)) {
          newErrors.dateOfBirth = "You must be at least 18 years old";
        }
        break;
      case 4:
        if (!formData.username.trim()) {
          newErrors.username = "Choose a username";
        } else if (!validateUsername(formData.username)) {
          newErrors.username = "3-30 characters, letters, numbers, and underscores only";
        } else if (usernameAvailabilityQuery.isFetching) {
          newErrors.username = "Checking username availability...";
        } else if (usernameAvailable === false) {
          newErrors.username = "Username is already taken";
        }
        if (!formData.password.trim() || formData.password.length < 6) {
          newErrors.password = "Password must be at least 6 characters";
        }
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match";
        }
        break;
      case 5:
        return true;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      showNotification(firstError || "Please fix the errors above", "error");
      return false;
    }
    return true;
  };

  const handleSendOTP = () => {
    if (!validateStep()) return;

    sendOTPMutation.mutate(
      {
        phoneNumber: formData.phoneNumber,
        countryCode: formData.countryCode,
      },
      {
        onSuccess: () => {
          showNotification("Verification code sent!", "success");
          setResendCountdown(60);
          setOtp(["", "", "", "", "", ""]);
          setHasVerified(false);
          setStep(2);
        },
      }
    );
  };

  const handleVerifyOTP = useCallback(
    (otpCode: string) => {
      if (
        !otpCode ||
        otpCode.length !== 6 ||
        verifyOTPMutation.isPending ||
        hasVerified
      )
        return;

      verifyOTPMutation.mutate(
        {
          phoneNumber: formData.phoneNumber,
          countryCode: formData.countryCode,
          code: otpCode,
        },
        {
          onSuccess: () => {
            setHasVerified(true);
            setStep(3);
          },
          onError: () => {
            setOtp(["", "", "", "", "", ""]);
            otpInputRefs.current[0]?.focus();
          },
        }
      );
    },
    [
      verifyOTPMutation,
      hasVerified,
      formData.phoneNumber,
      formData.countryCode,
    ]
  );

  const otpString = useMemo(() => otp.join(""), [otp]);

  // Countdown timer
  useEffect(() => {
    if (step === 2 && resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, resendCountdown]);

  // Auto-verify OTP
  useEffect(() => {
    if (
      otpString.length === 6 &&
      !verifyOTPMutation.isPending &&
      !hasVerified &&
      step === 2
    ) {
      handleVerifyOTP(otpString);
    }
  }, [
    otpString,
    verifyOTPMutation.isPending,
    hasVerified,
    step,
    handleVerifyOTP,
  ]);

  const handleNext = async () => {
    if (!validateStep()) return;

    if (step === 1) {
      handleSendOTP();
    } else if (step === 4 && usernameAvailabilityQuery.isFetching) {
      showNotification("Still checking username availability. Please wait.", "info");
      return;
    } else if (step < 5) {
      setStep(step + 1);
    } else {
      updateProfileMutation.mutate(formData);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleLocationPermission = async (shouldRequest: boolean) => {
    if (shouldRequest) {
      try {
        const foregroundStatus = await Location.getForegroundPermissionsAsync();
        let finalStatus = foregroundStatus.status;

        if (foregroundStatus.status !== "granted") {
          const result = await Location.requestForegroundPermissionsAsync();
          finalStatus = result.status;
        }

        if (finalStatus === "granted") {
          await Location.requestBackgroundPermissionsAsync();
          updateFormData("locationShared", true);
          updateProfileMutation.mutate({ ...formData, locationShared: true });
        } else {
          showNotification(
            "Location access is optional. You can enable it later in Settings.",
            "info"
          );
          updateProfileMutation.mutate({ ...formData, locationShared: false });
        }
      } catch {
        updateProfileMutation.mutate({ ...formData, locationShared: false });
      }
    } else {
      updateProfileMutation.mutate({ ...formData, locationShared: false });
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, "");

    if (digitsOnly.length > 1) {
      const digits = digitsOnly.slice(0, 6);
      const newOtp = [...otp];
      digits.split("").forEach((digit, i) => {
        if (index + i < 6) newOtp[index + i] = digit;
      });
      setOtp(newOtp);
      const lastIndex = Math.min(index + digits.length - 1, 5);
      otpInputRefs.current[lastIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = digitsOnly;
    setOtp(newOtp);

    if (digitsOnly && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return "";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const handleDateChange = (_event: any, date?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      updateFormData("dateOfBirth", formatDate(date));
    }
  };

  // ── Step Renderers ───────────────────────────

  const renderStep1 = () => (
    <View>
      <Text className="text-4xl font-bold text-white mb-2">Get Started</Text>
      <Text style={{ color: TEXT.secondary }} className="mb-8 text-base">
        Join Mesh and unlock a new era of fantasy sports.
      </Text>

      <View className="mb-6">
        <Text className="text-sm font-semibold text-white mb-2">
          Phone Number
        </Text>
        <MeshPhoneInput
          phoneNumber={formData.phoneNumber}
          countryCode={selectedCountry}
          onPhoneNumberChange={(value) => updateFormData("phoneNumber", value)}
          onCountryCodeChange={(country) => {
            setSelectedCountry(country);
            updateFormData("countryCode", country.dialCode);
          }}
          placeholder="111-123-4567"
          autoComplete="tel"
        />
        {errors.phoneNumber && (
          <Text className="text-xs mt-1" style={{ color: SEMANTIC.error }}>
            {errors.phoneNumber}
          </Text>
        )}
      </View>

      <View className="mb-6">
        <MeshButton
          title="Create an account"
          onPress={handleNext}
          loading={sendOTPMutation.isPending}
          disabled={sendOTPMutation.isPending}
          variant="primary"
        />
      </View>

      <View className="mb-6">
        <Text className="text-center text-sm" style={{ color: TEXT.secondary }}>
          By continuing, you agree to our{" "}
          <Text style={{ color: SEMANTIC.success }}>Terms & Conditions</Text>{" "}
          and <Text style={{ color: SEMANTIC.success }}>Privacy Policy.</Text>
        </Text>
      </View>

      <View className="flex-row items-center mb-6">
        <View className="flex-1 h-px" style={{ backgroundColor: SURFACE.highest }} />
        <Text className="px-4 text-sm" style={{ color: TEXT.secondary }}>
          or
        </Text>
        <View className="flex-1 h-px" style={{ backgroundColor: SURFACE.highest }} />
      </View>

      <View className="flex-row items-center justify-center gap-2">
        <Text style={{ color: TEXT.secondary }} className="text-base">
          Have an account?
        </Text>
        <Link href="/login" asChild>
          <TouchableOpacity>
            <Text
              className="underline text-base font-semibold"
              style={{ color: colors.primary }}
            >
              Log In
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );

  const renderStep2 = () => {
    const phoneLast4 = formData.phoneNumber.slice(-4);

    return (
      <View>
        <Text className="text-4xl font-bold text-white mb-2">
          Verify your number
        </Text>
        <Text style={{ color: TEXT.secondary }} className="mb-8 text-base">
          We sent a 6-digit code to your number ending in {phoneLast4}
        </Text>

        <View className="flex-row justify-between mb-6">
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                otpInputRefs.current[index] = ref;
              }}
              value={digit}
              onChangeText={(value) => handleOtpChange(index, value)}
              onKeyPress={({ nativeEvent }) =>
                handleOtpKeyPress(index, nativeEvent.key)
              }
              keyboardType="number-pad"
              maxLength={6}
              className="w-12 h-14 rounded-xl text-center text-2xl font-bold"
              style={{
                backgroundColor: SURFACE.card,
                color: "#FFFFFF",
                borderWidth: digit ? 1 : 0,
                borderColor: digit ? colors.primary : undefined,
              }}
              autoFocus={index === 0}
              editable={!verifyOTPMutation.isPending}
              selectTextOnFocus
              textContentType="oneTimeCode"
              autoComplete={
                Platform.OS === "android"
                  ? "sms-otp"
                  : "one-time-code"
              }
              importantForAutofill="yes"
            />
          ))}
        </View>

        {verifyOTPMutation.isPending && (
          <View className="items-center mb-6">
            <Text
              className="text-base font-semibold mb-2"
              style={{ color: SEMANTIC.success }}
            >
              Verifying...
            </Text>
            <ActivityIndicator size="small" color={SEMANTIC.success} />
          </View>
        )}

        <View className="mb-4">
          <MeshButton
            title={
              resendCountdown > 0
                ? `Resend code (${resendCountdown}s)`
                : "Resend code"
            }
            onPress={handleSendOTP}
            disabled={resendCountdown > 0 || sendOTPMutation.isPending}
            loading={sendOTPMutation.isPending}
            variant="secondary"
          />
        </View>
      </View>
    );
  };

  const renderStep3 = () => {
    const displayDate = selectedDate
      ? formatDate(selectedDate)
      : formData.dateOfBirth;

    return (
      <View>
        <Text className="text-4xl font-bold text-white mb-2">
          Account Details
        </Text>
        <Text style={{ color: TEXT.secondary }} className="mb-8 text-base">
          Tell us a bit about yourself to get started.
        </Text>

        <View className="mb-4">
          <Text className="text-sm font-semibold text-white mb-2">
            Full Name
          </Text>
          <MeshTextInput
            placeholder="John Doe"
            value={formData.fullName}
            onChangeText={(value) => updateFormData("fullName", value)}
            autoCapitalize="words"
            autoComplete="name"
            error={!!errors.fullName}
          />
          {errors.fullName && (
            <Text className="text-xs mt-1" style={{ color: SEMANTIC.error }}>
              {errors.fullName}
            </Text>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-sm font-semibold text-white mb-2">Email</Text>
          <MeshTextInput
            placeholder="john@example.com"
            value={formData.email}
            onChangeText={(value) => updateFormData("email", value)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={!!errors.email}
          />
          {errors.email && (
            <Text className="text-xs mt-1" style={{ color: SEMANTIC.error }}>
              {errors.email}
            </Text>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-sm font-semibold text-white mb-2">
            Date of Birth
          </Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <MeshTextInput
              placeholder="MM/DD/YYYY"
              value={displayDate}
              editable={false}
              error={!!errors.dateOfBirth}
              endElement={
                <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color={TEXT.placeholder}
                  />
                </TouchableOpacity>
              }
            />
          </TouchableOpacity>
          {errors.dateOfBirth ? (
            <Text className="text-xs mt-1" style={{ color: SEMANTIC.error }}>
              {errors.dateOfBirth}
            </Text>
          ) : (
            <Text className="text-xs mt-1" style={{ color: TEXT.tertiary }}>
              You must be at least 18 years old.
            </Text>
          )}
        </View>

        {showDatePicker && (
          <>
            {Platform.OS === "ios" ? (
              <Modal
                visible={showDatePicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View className="flex-1 justify-end" style={{ backgroundColor: SURFACE.overlay }}>
                  <TouchableOpacity
                    className="flex-1"
                    activeOpacity={1}
                    onPress={() => setShowDatePicker(false)}
                  />
                  <View
                    className="rounded-t-3xl p-6"
                    style={{ backgroundColor: SURFACE.card }}
                  >
                    <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-white text-lg font-semibold">
                        Select Date
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text
                          className="text-lg font-semibold"
                          style={{ color: colors.primary }}
                        >
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={selectedDate || new Date(2000, 0, 1)}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                      textColor="#FFFFFF"
                    />
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={selectedDate || new Date(2000, 0, 1)}
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
          </>
        )}
      </View>
    );
  };

  const renderStep4 = () => (
    <View>
      <Text className="text-4xl font-bold text-white mb-2">
        Username & Password
      </Text>
      <Text style={{ color: TEXT.secondary }} className="mb-8 text-base">
        Pick a unique username and create a secure password.
      </Text>

      <View className="mb-4">
        <Text className="text-sm font-semibold text-white mb-2">Username</Text>
        <MeshTextInput
          startIcon={{ name: "alternate-email" }}
          placeholder="johndoe123"
          value={formData.username}
          onChangeText={(value) => updateFormData("username", value)}
          autoCapitalize="none"
          autoComplete="username"
          error={!!errors.username}
        />
        {errors.username ? (
          <Text className="text-xs mt-1" style={{ color: SEMANTIC.error }}>
            {errors.username}
          </Text>
        ) : (
          <Text className="text-xs mt-1" style={{ color: TEXT.tertiary }}>
            3-30 characters. Letters, numbers, and underscores.
          </Text>
        )}
        {trimmedUsername.length > 0 && validateUsername(trimmedUsername) ? (
          <Text
            className="text-xs mt-1"
            style={{
              color: usernameAvailabilityQuery.isFetching
                ? TEXT.tertiary
                : usernameAvailable
                  ? SEMANTIC.success
                  : SEMANTIC.error,
            }}
          >
            {usernameAvailabilityQuery.isFetching
              ? "Checking username..."
              : usernameAvailable
                ? "Username is available"
                : "Username is already taken"}
          </Text>
        ) : null}
      </View>

      <View className="mb-4">
        <Text className="text-sm font-semibold text-white mb-2">Password</Text>
        <MeshTextInput
          startIcon={{ name: "lock" }}
          endIcon={{
            name: showPassword ? "visibility" : "visibility-off",
            onPress: () => setShowPassword(!showPassword),
          }}
          placeholder="At least 6 characters"
          value={formData.password}
          onChangeText={(value) => updateFormData("password", value)}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="password-new"
          error={!!errors.password}
        />
        {errors.password && (
          <Text className="text-xs mt-1" style={{ color: SEMANTIC.error }}>
            {errors.password}
          </Text>
        )}
      </View>

      <View className="mb-4">
        <Text className="text-sm font-semibold text-white mb-2">
          Confirm Password
        </Text>
        <MeshTextInput
          startIcon={{ name: "lock" }}
          endIcon={{
            name: showConfirmPassword ? "visibility" : "visibility-off",
            onPress: () => setShowConfirmPassword(!showConfirmPassword),
          }}
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChangeText={(value) => updateFormData("confirmPassword", value)}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          autoComplete="password-new"
          error={!!errors.confirmPassword}
        />
        {errors.confirmPassword && (
          <Text className="text-xs mt-1" style={{ color: SEMANTIC.error }}>
            {errors.confirmPassword}
          </Text>
        )}
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View>
      <Text className="text-4xl font-bold text-white mb-2">
        Location Access
      </Text>
      <Text style={{ color: TEXT.secondary }} className="mb-8 text-base">
        Some leagues are location-specific. Enable location to join local
        leagues near you.
      </Text>

      <View
        className="rounded-2xl p-5 mb-8"
        style={{ backgroundColor: SURFACE.card }}
      >
        <View className="flex-row items-center mb-3">
          <MaterialIcons name="location-on" size={24} color={colors.primary} />
          <Text className="text-white font-semibold ml-2 text-base">
            Why we need this
          </Text>
        </View>
        <Text style={{ color: TEXT.secondary }} className="text-sm leading-5">
          Local leagues require members to be in the area. Your location helps
          us verify eligibility. You can always change this in Settings.
        </Text>
      </View>

      <View className="flex-row gap-4">
        <View className="flex-1">
          <MeshButton
            title="Skip for now"
            onPress={() => handleLocationPermission(false)}
            variant="secondary"
            loading={updateProfileMutation.isPending}
          />
        </View>
        <View className="flex-1">
          <MeshButton
            title="Allow"
            onPress={() => handleLocationPermission(true)}
            variant="primary"
            loading={updateProfileMutation.isPending}
          />
        </View>
      </View>
    </View>
  );

  // ── Progress bar ─────────────────────────────

  const progressSteps = [1, 2, 3, 4, 5];

  return (
    <KeyboardAvoidingView
      behavior={undefined}
      keyboardVerticalOffset={0}
      className="flex-1"
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 150 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={false}
      >
        <MeshBanner />
        <View className="px-6 py-8">
          <View className="w-full max-w-sm mx-auto">
            {/* Progress bar */}
            {step > 1 && (
              <View className="flex-row mb-8 gap-1.5">
                {progressSteps.map((s) => (
                  <View
                    key={s}
                    className="flex-1 h-1 rounded-full"
                    style={{
                      backgroundColor:
                        s <= step ? colors.primary : SURFACE.highest,
                    }}
                  />
                ))}
              </View>
            )}

            {/* Step content */}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}

            {step === 2 && (
              <View className="mt-6 mb-8">
                <MeshButton title="Back" onPress={handleBack} variant="secondary" />
              </View>
            )}

            {/* Navigation buttons for steps 3 & 4 */}
            {step > 2 && step < 5 && (
              <View className="mt-8 mb-8 flex-row gap-4">
                <View className="flex-1">
                  <MeshButton
                    title="Back"
                    onPress={handleBack}
                    variant="secondary"
                  />
                </View>
                <View className="flex-1">
                  <MeshButton
                    title="Next"
                    onPress={handleNext}
                    variant="primary"
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
