import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useNotification } from "@/contexts/notification";
import { useAppTheme } from "@/contexts/theme";
import { MeshBanner } from "@/components/MeshBanner";
import { MeshButton } from "@/components/MeshButton";
import { MeshPhoneInput } from "@/components/MeshPhoneInput";
import { Country } from "@/components/CountryCodeSelector";
import { MeshTextInput } from "@/components/MeshTextInput";
import { authApi, cleanPhoneNumber, userApi } from "@/lib/api";
import { getUserErrorMessage } from "@/lib/errorMessages";
import { TEXT } from "@/constants/colors";

const DEFAULT_COUNTRY: Country = {
  code: "US",
  dialCode: "+1",
  flag: "\u{1F1FA}\u{1F1F8}",
  name: "United States",
};

type Step = "phone" | "otp" | "password";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { showNotification } = useNotification();
  const { colors } = useAppTheme();

  const [step, setStep] = useState<Step>("phone");
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const otpInputRefs = useRef<(TextInput | null)[]>([]);

  const fullPhoneNo = useMemo(
    () => `${selectedCountry.dialCode}${cleanPhoneNumber(phoneNumber)}`,
    [phoneNumber, selectedCountry.dialCode]
  );

  const onSendCode = async () => {
    const digits = cleanPhoneNumber(phoneNumber);
    if (digits.length < 7) {
      showNotification("Enter a valid phone number.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.forgotPassword({ phoneNo: fullPhoneNo });
      setStep("otp");
      setOtp(["", "", "", "", "", ""]);
      setResendCountdown(60);
      showNotification("Verification code sent.", "success");
    } catch (error: any) {
      showNotification(getUserErrorMessage(error, "Failed to send verification code."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      showNotification("Enter the 6-digit code.", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await authApi.forgotPasswordVerify({
        phoneNo: fullPhoneNo,
        otp: code,
      });
      const payload = result?.data || result;
      const token =
        payload?.accessToken ||
        payload?.data?.accessToken ||
        payload?.session?.accessToken ||
        null;
      if (!token) {
        throw new Error("Could not verify reset code.");
      }
      setSessionToken(token);
      setStep("password");
      showNotification("Code verified. Set a new password.", "success");
    } catch (error: any) {
      setOtp(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
      showNotification(getUserErrorMessage(error, "Invalid or expired code."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onChangePassword = async () => {
    if (!sessionToken) {
      showNotification("Reset session expired. Start again.", "error");
      setStep("phone");
      return;
    }
    if (newPassword.length < 6) {
      showNotification("Password must be at least 6 characters.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification("Passwords do not match.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await userApi.changePassword({ newPassword }, sessionToken);
      showNotification("Password updated. Please log in.", "success");
      router.replace("/login" as any);
    } catch (error: any) {
      showNotification(getUserErrorMessage(error, "Failed to update password."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, "");
    if (digitsOnly.length > 1) {
      const digits = digitsOnly.slice(0, 6);
      const nextOtp = [...otp];
      digits.split("").forEach((digit, offset) => {
        const targetIndex = index + offset;
        if (targetIndex < 6) nextOtp[targetIndex] = digit;
      });
      setOtp(nextOtp);
      const lastIndex = Math.min(index + digits.length - 1, 5);
      otpInputRefs.current[lastIndex]?.focus();
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = digitsOnly;
    setOtp(nextOtp);
    if (digitsOnly && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const onOtpKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    if (step !== "otp") return;
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown, step]);

  useEffect(() => {
    if (step !== "otp") return;
    if (otp.join("").length !== 6) return;
    if (isSubmitting) return;
    void verifyOtp();
  }, [otp, step]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <KeyboardAvoidingView
      behavior={undefined}
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={false}
      >
        <MeshBanner />
        <View className="flex-1 px-6 py-8">
          <View className="w-full max-w-sm mx-auto">
            <TouchableOpacity
              onPress={() => {
                if (step === "phone") {
                  router.back();
                  return;
                }
                if (step === "otp") {
                  setStep("phone");
                  return;
                }
                setStep("otp");
              }}
              className="mb-6 flex-row items-center"
              activeOpacity={0.8}
            >
              <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, marginLeft: 6 }}>Back</Text>
            </TouchableOpacity>

            <Text className="text-4xl font-bold text-white mb-2">Reset Password</Text>
            <Text style={{ color: TEXT.secondary }} className="mb-8 text-base">
              {step === "phone"
                ? "Enter your phone number to receive a reset code."
                : step === "otp"
                  ? "Enter the 6-digit verification code."
                  : "Set your new password."}
            </Text>

            {step === "phone" ? (
              <>
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-white mb-2">Phone Number</Text>
                  <MeshPhoneInput
                    phoneNumber={phoneNumber}
                    countryCode={selectedCountry}
                    onPhoneNumberChange={setPhoneNumber}
                    onCountryCodeChange={setSelectedCountry}
                    placeholder="111-123-4567"
                    autoComplete="tel"
                  />
                </View>
                <MeshButton
                  title="Send code"
                  onPress={onSendCode}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  variant="primary"
                />
              </>
            ) : null}

            {step === "otp" ? (
              <>
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
                        onOtpKeyPress(index, nativeEvent.key)
                      }
                      keyboardType="number-pad"
                      maxLength={6}
                      className="w-12 h-14 rounded-xl text-center text-2xl font-bold"
                      style={{
                        backgroundColor: "#1A1F2A",
                        color: "#FFFFFF",
                        borderWidth: digit ? 1 : 0,
                        borderColor: digit ? colors.primary : undefined,
                      }}
                      autoFocus={index === 0}
                      editable={!isSubmitting}
                      selectTextOnFocus
                      textContentType="oneTimeCode"
                      autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
                    />
                  ))}
                </View>

                <MeshButton
                  title="Verify code"
                  onPress={() => void verifyOtp()}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  variant="primary"
                />

                <View className="mt-4">
                  <MeshButton
                    title={resendCountdown > 0 ? `Resend (${resendCountdown}s)` : "Resend code"}
                    onPress={onSendCode}
                    disabled={resendCountdown > 0 || isSubmitting}
                    variant="secondary"
                  />
                </View>
              </>
            ) : null}

            {step === "password" ? (
              <>
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-white mb-2">New Password</Text>
                  <MeshTextInput
                    startIcon={{ name: "lock" }}
                    endIcon={{
                      name: showPassword ? "visibility" : "visibility-off",
                      onPress: () => setShowPassword((prev) => !prev),
                    }}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                </View>

                <View className="mb-6">
                  <Text className="text-sm font-semibold text-white mb-2">
                    Confirm Password
                  </Text>
                  <MeshTextInput
                    startIcon={{ name: "lock" }}
                    endIcon={{
                      name: showConfirmPassword ? "visibility" : "visibility-off",
                      onPress: () => setShowConfirmPassword((prev) => !prev),
                    }}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                </View>

                <MeshButton
                  title="Update password"
                  onPress={onChangePassword}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  variant="primary"
                />
              </>
            ) : null}

            <Text style={{ color: TEXT.tertiary, marginTop: 16, fontSize: 12 }}>
              Need help? Contact support if you no longer have access to this phone number.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
