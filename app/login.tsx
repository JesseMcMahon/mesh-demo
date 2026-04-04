import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useNotification } from "@/contexts/notification";
import { useSignIn } from "@/hooks/useAuthMutations";
import { SURFACE, TEXT } from "@/constants/colors";
import { useAppTheme } from "@/contexts/theme";
import { MeshBanner } from "@/components/MeshBanner";
import { MeshButton } from "@/components/MeshButton";
import { MeshTextInput } from "@/components/MeshTextInput";
import { cleanPhoneNumber } from "@/lib/api";

function formatPhoneIdentifier(rawValue: string): string {
  const cleaned = cleanPhoneNumber(rawValue);
  if (!cleaned) return "";

  const area = cleaned.slice(0, 3);
  const mid = cleaned.slice(3, 6);
  const last = cleaned.slice(6, 10);

  if (cleaned.length <= 3) return area;
  if (cleaned.length <= 6) return `${area}-${mid}`;
  return `${area}-${mid}-${last}`;
}

export default function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { showNotification } = useNotification();
  const { colors } = useAppTheme();
  const signInMutation = useSignIn();

  const handleSignIn = () => {
    if (!identifier.trim() || !password) {
      showNotification(
        "Please enter both your login and password",
        "error"
      );
      return;
    }

    const trimmed = identifier.trim();
    const isEmail = trimmed.includes("@");
    const digits = cleanPhoneNumber(trimmed);
    const looksLikePhone =
      !isEmail &&
      /^[\d+\-\s()]+$/.test(trimmed) &&
      digits.length >= 7;
    const normalizedIdentifier = isEmail
      ? trimmed.toLowerCase()
      : looksLikePhone
        ? digits
        : trimmed;

    signInMutation.mutate({ identifier: normalizedIdentifier, password });
  };

  return (
    <KeyboardAvoidingView
      behavior={undefined}
      keyboardVerticalOffset={0}
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
            <Text className="text-4xl font-bold text-white mb-2">Log In</Text>
            <Text style={{ color: TEXT.secondary }} className="mb-8 text-base">
              Welcome back! Enter your details below to access your account.
            </Text>

            <View className="mb-4">
              <Text className="text-sm font-semibold text-white mb-2">
                Phone / Username / Email
              </Text>
              <MeshTextInput
                startIcon={{ name: "person" }}
                placeholder="Eg. 111-111-1111 or johndoe"
                value={identifier}
                onChangeText={(nextValue) => {
                  const trimmed = String(nextValue || "");
                  const hasLetters = /[a-zA-Z]/.test(trimmed);
                  const hasAtSign = trimmed.includes("@");
                  const digits = cleanPhoneNumber(trimmed);
                  const canBePhone =
                    !hasLetters &&
                    !hasAtSign &&
                    /^[\d+\-\s()]*$/.test(trimmed);

                  if (canBePhone && digits.length <= 10) {
                    setIdentifier(formatPhoneIdentifier(trimmed));
                    return;
                  }
                  setIdentifier(nextValue);
                }}
                autoCapitalize="none"
                keyboardType="default"
                autoComplete="username"
              />
            </View>

            <View className="mb-2">
              <Text className="text-sm font-semibold text-white mb-2">
                Password
              </Text>
              <MeshTextInput
                startIcon={{ name: "lock" }}
                endIcon={{
                  name: showPassword ? "visibility" : "visibility-off",
                  onPress: () => setShowPassword(!showPassword),
                }}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
              />
            </View>

            <View className="mb-6 items-end">
              <TouchableOpacity onPress={() => router.push("/forgot-password" as any)}>
                <Text
                  className="underline text-sm"
                  style={{ color: colors.primary }}
                >
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            <View className="mb-6">
              <MeshButton
                title="Login"
                onPress={handleSignIn}
                loading={signInMutation.isPending}
                disabled={signInMutation.isPending}
                variant="primary"
              />
            </View>

            <View className="mb-6">
              <Text
                className="text-center text-sm"
                style={{ color: TEXT.secondary }}
              >
                By logging in, you agree to our{" "}
                <Text style={{ color: "#22C55E" }}>Terms & Conditions</Text> and{" "}
                <Text style={{ color: "#22C55E" }}>Privacy Policy.</Text>
              </Text>
            </View>

            <View className="flex-row items-center mb-6">
              <View
                className="flex-1 h-px"
                style={{ backgroundColor: SURFACE.highest }}
              />
              <Text
                className="px-4 text-sm"
                style={{ color: TEXT.secondary }}
              >
                or
              </Text>
              <View
                className="flex-1 h-px"
                style={{ backgroundColor: SURFACE.highest }}
              />
            </View>

            <View className="flex-row items-center justify-center gap-2">
              <Text style={{ color: TEXT.secondary }} className="text-base">
                New here?
              </Text>
              <Link href="/signup" asChild>
                <TouchableOpacity>
                  <Text
                    className="underline text-base font-semibold"
                    style={{ color: colors.primary }}
                  >
                    Create an Account
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
