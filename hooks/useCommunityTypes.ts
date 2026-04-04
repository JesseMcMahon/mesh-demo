import { useQuery } from "@tanstack/react-query";
import { useUserProfile } from "@/contexts/user-profile";
import { getApiBaseURL, parseApiResponse } from "@/lib/api";

export interface CommunityType {
  _id?: string;
  id?: string;
  type: string;
  description: string;
}

export function useCommunityTypes() {
  const { accessToken } = useUserProfile();

  return useQuery<CommunityType[]>({
    queryKey: ["communityTypes"],
    queryFn: async () => {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["accessToken"] = accessToken;
      }

      const response = await fetch(
        `${getApiBaseURL()}/api/v2/community-type/list`,
        {
          method: "GET",
          headers,
        }
      );

      const result = await parseApiResponse(response);

      if (Array.isArray(result)) {
        return result;
      }
      if (result.data && Array.isArray(result.data)) {
        return result.data;
      }
      if (result.success && Array.isArray(result.data)) {
        return result.data;
      }

      throw new Error("Unexpected response format from community-type/list");
    },
  });
}
