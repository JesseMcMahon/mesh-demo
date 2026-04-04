import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { TopNavigation } from "@/components/TopNavigation";
import { SURFACE, TEXT, BORDER, BRAND } from "@/constants/colors";
import { useUserProfile } from "@/contexts/user-profile";
import { useSignOut } from "@/hooks/useAuthMutations";
import { userApi } from "@/lib/api";
import { SkeletonBlock } from "@/components/Skeleton";

export default function ProfileScreen() {
  const { user, accessToken } = useUserProfile();
  const signOutMutation = useSignOut();
  const displayName = user?.username || user?.name || "User";
  const { data, isLoading } = useQuery({
    queryKey: ["profile-screen", accessToken],
    enabled: !!accessToken,
    queryFn: () => userApi.getProfile(accessToken),
    staleTime: 60_000,
  });
  const profile =
    (data as any)?.output?.user ||
    (data as any)?.data?.user ||
    (data as any)?.user ||
    null;

  const handleLogout = () => {
    signOutMutation.mutate();
  };

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE.background }}>
      <TopNavigation title="Profile" />
      {isLoading ? (
        <View style={{ padding: 16 }}>
          <View
            style={{
              borderRadius: 18,
              borderWidth: 1,
              borderColor: BORDER.default,
              backgroundColor: SURFACE.card,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <SkeletonBlock width={54} height={54} borderRadius={16} />
              <View style={{ flex: 1 }}>
                <SkeletonBlock width="50%" height={18} style={{ marginBottom: 8 }} />
                <SkeletonBlock width="70%" height={12} />
              </View>
            </View>
            <View style={{ marginTop: 18 }}>
              <SkeletonBlock width="100%" height={12} style={{ marginBottom: 10 }} />
              <SkeletonBlock width="100%" height={12} style={{ marginBottom: 10 }} />
              <SkeletonBlock width="100%" height={12} />
            </View>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          <View
            style={{
              borderRadius: 18,
              borderWidth: 1,
              borderColor: BORDER.default,
              backgroundColor: SURFACE.card,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  backgroundColor: `${BRAND.primary}24`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="person" size={28} color={BRAND.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFF", fontSize: 19, fontWeight: "800" }}>{displayName}</Text>
                <Text style={{ color: TEXT.secondary, marginTop: 2 }}>
                  {profile?.email || user?.email || "No email on file"}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 16, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: TEXT.secondary }}>Username</Text>
                <Text style={{ color: "#FFF", fontWeight: "600" }}>
                  {profile?.username || user?.username || "Not set"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: TEXT.secondary }}>Phone</Text>
                <Text style={{ color: "#FFF", fontWeight: "600" }}>
                  {profile?.phoneNo || user?.phoneNumber || "Not set"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: TEXT.secondary }}>Member since</Text>
                <Text style={{ color: "#FFF", fontWeight: "600" }}>
                  {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString()
                    : "—"}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            disabled={signOutMutation.isPending}
            style={{
              marginTop: 18,
              borderRadius: 12,
              paddingVertical: 13,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#FF4D4D77",
              backgroundColor: "#7A1F1F33",
              opacity: signOutMutation.isPending ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "#FF9E9E", fontWeight: "700", fontSize: 15 }}>
              {signOutMutation.isPending ? "Signing out..." : "Sign Out"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}
