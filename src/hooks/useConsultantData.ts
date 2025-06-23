import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import toast from "react-hot-toast";

// Types
export interface AvailabilityTemplate {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_bookings: number;
  timezone: string;
  template_name?: string;
  notes?: string;
  is_active: boolean;
}

export interface Booking {
  id: string;
  booking_reference: string;
  scheduled_date: string;
  scheduled_time: string;
  status:
    | "pending"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "no_show"
    | "rescheduled";
  customer_data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    company?: string;
  };
  project_description: string;
  service: {
    name: string;
    duration_minutes: number;
  };
  consultant?: {
    first_name: string;
    last_name: string;
  };
  created_at: string;
  payment_status: string;
  payment_amount?: number;
}

export interface BufferPreference {
  id?: string;
  service_id: string;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  notes?: string;
}

// API functions
const fetchBookings = async (): Promise<{ bookings: Booking[] }> => {
  const response = await fetch("/api/bookings");
  if (!response.ok) {
    throw new Error(`Failed to fetch bookings: ${response.status}`);
  }
  return response.json();
};

const fetchAvailabilityTemplates = async (): Promise<{
  templates: AvailabilityTemplate[];
}> => {
  const response = await fetch("/api/availability/templates");
  if (!response.ok) {
    throw new Error(`Failed to fetch templates: ${response.status}`);
  }
  return response.json();
};

const createAvailabilityTemplate = async (
  template: Omit<AvailabilityTemplate, "id">
) => {
  const response = await fetch("/api/availability/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(template),
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to create template");
  }
  return response.json();
};

const updateAvailabilityTemplate = async (template: AvailabilityTemplate) => {
  const response = await fetch("/api/availability/templates", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(template),
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to update template");
  }
  return response.json();
};

const deleteAvailabilityTemplate = async (id: string) => {
  const response = await fetch(`/api/availability/templates?id=${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete template");
  }
  return response.json();
};

const fetchBufferPreferences = async (): Promise<{
  preferences: BufferPreference[];
}> => {
  const response = await fetch("/api/availability/buffer-preferences");
  if (!response.ok) {
    throw new Error(`Failed to fetch buffer preferences: ${response.status}`);
  }
  return response.json();
};

const saveBufferPreferences = async (preferences: BufferPreference[]) => {
  const response = await fetch("/api/availability/buffer-preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences }),
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to save buffer preferences");
  }
  return response.json();
};

const applyTemplateSet = async (templateSetId: string) => {
  const response = await fetch("/api/availability/templates/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateSetId }),
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to apply template set");
  }
  return response.json();
};

const saveCurrentTemplateSet = async (name: string, description?: string) => {
  const response = await fetch("/api/availability/templates/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to save template set");
  }
  return response.json();
};

const copyAvailabilityDay = async (sourceDay: number, targetDay: number) => {
  const response = await fetch("/api/availability/templates/copy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceDay, targetDay }),
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to copy availability");
  }
  return response.json();
};

// Custom hooks
export function useBookings() {
  return useQuery({
    queryKey: queryKeys.bookings,
    queryFn: fetchBookings,
    staleTime: 30 * 1000, // Bookings change frequently
    select: (data) => data.bookings,
    retry: (failureCount, error: Error | unknown) => {
      // Don't retry on 401 (unauthorized)
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string" &&
        error.message.includes("401")
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useAvailabilityTemplates() {
  return useQuery({
    queryKey: queryKeys.templates,
    queryFn: fetchAvailabilityTemplates,
    staleTime: 2 * 60 * 1000, // Templates don't change very often
    select: (data) => data.templates,
  });
}

export function useCreateAvailabilityTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAvailabilityTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates });
      queryClient.invalidateQueries({ queryKey: queryKeys.availability });
      toast.success("Template added successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add template");
    },
  });
}

export function useUpdateAvailabilityTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAvailabilityTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates });
      queryClient.invalidateQueries({ queryKey: queryKeys.availability });
      toast.success("Template updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update template");
    },
  });
}

export function useDeleteAvailabilityTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAvailabilityTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates });
      queryClient.invalidateQueries({ queryKey: queryKeys.availability });
      toast.success("Template deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete template");
    },
  });
}

export function useBufferPreferences() {
  return useQuery({
    queryKey: queryKeys.bufferTimes,
    queryFn: fetchBufferPreferences,
    staleTime: 5 * 60 * 1000, // Buffer preferences don't change often
    select: (data) => data.preferences,
  });
}

export function useSaveBufferPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveBufferPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bufferTimes });
      queryClient.invalidateQueries({ queryKey: queryKeys.availability });
      toast.success("Buffer preferences saved successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save buffer preferences");
    },
  });
}

// Optimistic updates for templates
export function useOptimisticTemplates() {
  const queryClient = useQueryClient();

  const addTemplateOptimistically = (
    template: Omit<AvailabilityTemplate, "id">
  ) => {
    const optimisticTemplate: AvailabilityTemplate = {
      ...template,
      id: `temp-${Date.now()}`, // Temporary ID
    };

    queryClient.setQueryData(
      queryKeys.templates,
      (oldData: { templates?: AvailabilityTemplate[] } | undefined) => {
        if (!oldData?.templates) return oldData;
        return {
          ...oldData,
          templates: [...oldData.templates, optimisticTemplate],
        };
      }
    );

    return optimisticTemplate.id;
  };

  const removeTemplateOptimistically = (id: string) => {
    queryClient.setQueryData(
      queryKeys.templates,
      (oldData: { templates?: AvailabilityTemplate[] } | undefined) => {
        if (!oldData?.templates) return oldData;
        return {
          ...oldData,
          templates: oldData.templates.filter(
            (t: AvailabilityTemplate) => t.id !== id
          ),
        };
      }
    );
  };

  return {
    addTemplateOptimistically,
    removeTemplateOptimistically,
  };
}

// Real-time booking updates
export function useRealTimeBookings() {
  const queryClient = useQueryClient();

  const refreshBookings = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings });
  };

  // You could extend this to use WebSocket or Server-Sent Events
  // for real-time updates when bookings are created/modified

  return { refreshBookings };
}

export function useApplyTemplateSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateSetId }: { templateSetId: string }) =>
      applyTemplateSet(templateSetId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["availability-templates"],
      });
    },
  });
}

export function useSaveTemplateSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      description,
    }: {
      name: string;
      description?: string;
    }) => saveCurrentTemplateSet(name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["template-sets"],
      });
    },
  });
}

export function useCopyAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sourceDay,
      targetDay,
    }: {
      sourceDay: number;
      targetDay: number;
    }) => copyAvailabilityDay(sourceDay, targetDay),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["availability-templates"],
      });
    },
  });
}
