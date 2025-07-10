import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Solution,
  SolutionFeature,
  SolutionSellingPoint,
} from "@/types/solutions";
import type {
  CreateSolutionRequest,
  UpdateSolutionRequest,
  CreateSolutionFeatureRequest,
  UpdateSolutionFeatureRequest,
  CreateSolutionSellingPointRequest,
  UpdateSolutionSellingPointRequest,
  AdminApiResponse,
  SolutionManagementStats,
} from "@/types/admin";

// Extend solution type for admin management
interface AdminSolution extends Solution {
  raw_features?: SolutionFeature[];
  raw_selling_points?: SolutionSellingPoint[];
}

interface AdminSolutionsResponse {
  solutions: AdminSolution[];
  total: number;
}

// Query keys
const adminSolutionsKeys = {
  all: ["admin", "solutions"] as const,
  lists: () => [...adminSolutionsKeys.all, "list"] as const,
  list: (filters: { includeInactive?: boolean }) =>
    [...adminSolutionsKeys.lists(), filters] as const,
  details: () => [...adminSolutionsKeys.all, "detail"] as const,
  detail: (id: string) => [...adminSolutionsKeys.details(), id] as const,
  stats: () => [...adminSolutionsKeys.all, "stats"] as const,
  features: (solutionId?: string) =>
    ["admin", "solution-features", solutionId] as const,
  sellingPoints: (solutionId?: string) =>
    ["admin", "solution-selling-points", solutionId] as const,
};

// Hook to fetch admin solutions
export function useAdminSolutions(includeInactive = true) {
  return useQuery({
    queryKey: adminSolutionsKeys.list({ includeInactive }),
    queryFn: async (): Promise<AdminSolutionsResponse> => {
      console.log("🔍 Fetching admin solutions...");

      const response = await fetch(
        `/api/admin/solutions?include_inactive=${includeInactive}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch solutions: ${response.status} - ${errorText}`
        );
      }

      const result: AdminApiResponse<AdminSolutionsResponse> =
        await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch solutions");
      }

      console.log("✅ Admin solutions fetched:", {
        total: result.data?.total || 0,
        includeInactive,
      });

      return result.data || { solutions: [], total: 0 };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Hook to fetch solution management statistics
export function useAdminSolutionStats() {
  return useQuery({
    queryKey: adminSolutionsKeys.stats(),
    queryFn: async (): Promise<SolutionManagementStats> => {
      console.log("📊 Fetching solution stats...");

      const response = await fetch("/api/admin/solutions?stats_only=true");

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch stats: ${response.status} - ${errorText}`
        );
      }

      const result: AdminApiResponse<SolutionManagementStats> =
        await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch stats");
      }

      console.log("✅ Solution stats fetched:", result.data);

      return (
        result.data || {
          total_solutions: 0,
          active_solutions: 0,
          inactive_solutions: 0,
          solutions_by_type: {
            saas: 0,
            plugin: 0,
            third_party: 0,
            owned_software: 0,
          },
          total_features: 0,
          total_selling_points: 0,
        }
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

// Hook to fetch solution features
export function useAdminSolutionFeatures(solutionId?: string) {
  return useQuery({
    queryKey: adminSolutionsKeys.features(solutionId),
    queryFn: async (): Promise<SolutionFeature[]> => {
      console.log("🔍 Fetching solution features...", { solutionId });

      const url = solutionId
        ? `/api/admin/solution-features?solution_id=${solutionId}`
        : "/api/admin/solution-features";

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch features: ${response.status} - ${errorText}`
        );
      }

      const result: AdminApiResponse<SolutionFeature[]> = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch features");
      }

      console.log("✅ Solution features fetched:", {
        total: result.data?.length || 0,
        solutionId,
      });

      return result.data || [];
    },
    enabled: !!solutionId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Hook to fetch solution selling points
export function useAdminSolutionSellingPoints(solutionId?: string) {
  return useQuery({
    queryKey: adminSolutionsKeys.sellingPoints(solutionId),
    queryFn: async (): Promise<SolutionSellingPoint[]> => {
      console.log("🔍 Fetching solution selling points...", { solutionId });

      const url = solutionId
        ? `/api/admin/solution-selling-points?solution_id=${solutionId}`
        : "/api/admin/solution-selling-points";

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch selling points: ${response.status} - ${errorText}`
        );
      }

      const result: AdminApiResponse<SolutionSellingPoint[]> =
        await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch selling points");
      }

      console.log("✅ Solution selling points fetched:", {
        total: result.data?.length || 0,
        solutionId,
      });

      return result.data || [];
    },
    enabled: !!solutionId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Mutation hook to create solution
export function useCreateSolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSolutionRequest): Promise<Solution> => {
      console.log("🔄 Creating solution...", {
        name: data.name,
        type: data.solution_type,
      });

      const response = await fetch("/api/admin/solutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to create solution: ${response.status} - ${errorText}`
        );
      }

      const result: AdminApiResponse<Solution> = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to create solution");
      }

      console.log("✅ Solution created:", {
        id: result.data?.id,
        name: result.data?.name,
      });

      return result.data!;
    },
    onSuccess: () => {
      // Invalidate and refetch solutions
      queryClient.invalidateQueries({ queryKey: adminSolutionsKeys.all });
    },
  });
}

// Mutation hook to update solution
export function useUpdateSolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateSolutionRequest): Promise<Solution> => {
      console.log("🔄 Updating solution...", { id: data.id, name: data.name });

      const response = await fetch("/api/admin/solutions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to update solution: ${response.status} - ${errorText}`
        );
      }

      const result: AdminApiResponse<Solution> = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to update solution");
      }

      console.log("✅ Solution updated:", {
        id: result.data?.id,
        name: result.data?.name,
      });

      return result.data!;
    },
    onSuccess: (data) => {
      // Update specific solution in cache and invalidate lists
      queryClient.setQueryData(adminSolutionsKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: adminSolutionsKeys.lists() });
    },
  });
}

// Mutation hook to delete solution
export function useDeleteSolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      solutionId: string
    ): Promise<{ id: string; name: string }> => {
      console.log("🗑️ Deleting solution...", { id: solutionId });

      const response = await fetch(`/api/admin/solutions?id=${solutionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to delete solution: ${response.status} - ${errorText}`
        );
      }

      const result: AdminApiResponse<{ id: string; name: string }> =
        await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to delete solution");
      }

      console.log("✅ Solution deleted:", result.data);

      return result.data!;
    },
    onSuccess: (data) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({
        queryKey: adminSolutionsKeys.detail(data.id),
      });
      queryClient.invalidateQueries({ queryKey: adminSolutionsKeys.lists() });
    },
  });
}

// Mutation hook to create solution feature
export function useCreateSolutionFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: CreateSolutionFeatureRequest
    ): Promise<SolutionFeature> => {
      console.log("🔄 Creating solution feature...", {
        solutionId: data.solution_id,
        category: data.category,
        feature: data.feature,
      });

      const response = await fetch("/api/admin/solution-features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to create feature: ${response.status} - ${errorText}`
        );
      }

      const result: AdminApiResponse<SolutionFeature> = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to create feature");
      }

      console.log("✅ Solution feature created:", { id: result.data?.id });

      return result.data!;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: adminSolutionsKeys.features(data.solution_id),
      });
      queryClient.invalidateQueries({ queryKey: adminSolutionsKeys.lists() });
    },
  });
}

// Mutation hook to update solution feature
export function useUpdateSolutionFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: UpdateSolutionFeatureRequest
    ): Promise<SolutionFeature> => {
      console.log("🔄 Updating solution feature...", { id: data.id });

      const response = await fetch("/api/admin/solution-features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to update feature: ${response.status} - ${errorText}`
        );
      }

      const result: AdminApiResponse<SolutionFeature> = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to update feature");
      }

      console.log("✅ Solution feature updated:", { id: result.data?.id });

      return result.data!;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: adminSolutionsKeys.features(data.solution_id),
      });
      queryClient.invalidateQueries({ queryKey: adminSolutionsKeys.lists() });
    },
  });
}

// Mutation hook to delete solution feature
export function useDeleteSolutionFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      featureId: string
    ): Promise<{ id: string; category: string; feature: string }> => {
      console.log("🗑️ Deleting solution feature...", { id: featureId });

      const response = await fetch(
        `/api/admin/solution-features?id=${featureId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to delete feature: ${response.status} - ${errorText}`
        );
      }

      const result: AdminApiResponse<{
        id: string;
        category: string;
        feature: string;
      }> = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to delete feature");
      }

      console.log("✅ Solution feature deleted:", result.data);

      return result.data!;
    },
    onSuccess: () => {
      // Invalidate all features and solutions queries
      queryClient.invalidateQueries({
        queryKey: ["admin", "solution-features"],
      });
      queryClient.invalidateQueries({ queryKey: adminSolutionsKeys.lists() });
    },
  });
}

// Mutation hook to create solution selling point
export function useCreateSolutionSellingPoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: CreateSolutionSellingPointRequest
    ): Promise<SolutionSellingPoint> => {
      console.log("🔄 Creating solution selling point...", {
        solutionId: data.solution_id,
        title: data.title,
      });

      const response = await fetch("/api/admin/solution-selling-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to create selling point: ${response.status} - ${errorText}`
        );
      }

      const result: AdminApiResponse<SolutionSellingPoint> =
        await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to create selling point");
      }

      console.log("✅ Solution selling point created:", {
        id: result.data?.id,
      });

      return result.data!;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: adminSolutionsKeys.sellingPoints(data.solution_id),
      });
      queryClient.invalidateQueries({ queryKey: adminSolutionsKeys.lists() });
    },
  });
}

// Mutation hook to update solution selling point
export function useUpdateSolutionSellingPoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: UpdateSolutionSellingPointRequest
    ): Promise<SolutionSellingPoint> => {
      console.log("🔄 Updating solution selling point...", { id: data.id });

      const response = await fetch("/api/admin/solution-selling-points", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to update selling point: ${response.status} - ${errorText}`
        );
      }

      const result: AdminApiResponse<SolutionSellingPoint> =
        await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to update selling point");
      }

      console.log("✅ Solution selling point updated:", {
        id: result.data?.id,
      });

      return result.data!;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: adminSolutionsKeys.sellingPoints(data.solution_id),
      });
      queryClient.invalidateQueries({ queryKey: adminSolutionsKeys.lists() });
    },
  });
}

// Mutation hook to delete solution selling point
export function useDeleteSolutionSellingPoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      sellingPointId: string
    ): Promise<{ id: string; title: string; emoji: string }> => {
      console.log("🗑️ Deleting solution selling point...", {
        id: sellingPointId,
      });

      const response = await fetch(
        `/api/admin/solution-selling-points?id=${sellingPointId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to delete selling point: ${response.status} - ${errorText}`
        );
      }

      const result: AdminApiResponse<{
        id: string;
        title: string;
        emoji: string;
      }> = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to delete selling point");
      }

      console.log("✅ Solution selling point deleted:", result.data);

      return result.data!;
    },
    onSuccess: () => {
      // Invalidate all selling points and solutions queries
      queryClient.invalidateQueries({
        queryKey: ["admin", "solution-selling-points"],
      });
      queryClient.invalidateQueries({ queryKey: adminSolutionsKeys.lists() });
    },
  });
}

// Utility function to invalidate all admin solution caches
export function useInvalidateAdminSolutionQueries() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: adminSolutionsKeys.all });
    queryClient.invalidateQueries({ queryKey: ["admin", "solution-features"] });
    queryClient.invalidateQueries({
      queryKey: ["admin", "solution-selling-points"],
    });
  };
}
