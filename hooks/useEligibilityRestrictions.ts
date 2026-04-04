import { useQuery } from "@tanstack/react-query";
import { useUserProfile } from "@/contexts/user-profile";
import { leagueApi } from "@/lib/api";

export interface EligibilityRestriction {
  _id: string;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useEligibilityRestrictions() {
  const { accessToken } = useUserProfile();

  return useQuery<EligibilityRestriction[]>({
    queryKey: ["eligibility-restrictions", accessToken],
    queryFn: async () => {
      if (!accessToken) {
        return [];
      }

      try {
        const response =
          await leagueApi.getEligibilityRestrictions(accessToken);

        // Handle different response structures
        if (Array.isArray(response)) {
          return response;
        }
        if (response.data && Array.isArray(response.data)) {
          return response.data;
        }
        if (response.success && Array.isArray(response.data)) {
          return response.data;
        }

        return [];
      } catch (error) {
        throw error; // Re-throw so React Query can handle it
      }
    },
    enabled: !!accessToken,
    retry: 1,
  });
}
