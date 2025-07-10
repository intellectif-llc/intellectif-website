import { useQuery } from "@tanstack/react-query";
import type { SolutionsApiResponse } from "@/types/solutions";

const fetchSolutions = async (): Promise<SolutionsApiResponse> => {
  console.log("🔍 Fetching solutions from API...");

  const response = await fetch("/api/solutions", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(
      errorData.error || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  const data = await response.json();
  console.log("✅ Solutions fetched successfully:", { total: data.total });

  return data;
};

export function useSolutions() {
  return useQuery<SolutionsApiResponse, Error>({
    queryKey: ["solutions"],
    queryFn: fetchSolutions,
    staleTime: 5 * 60 * 1000, // 5 minutes - solutions don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in newer versions)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
