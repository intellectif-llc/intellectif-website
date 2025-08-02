import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  invalidateAvailabilityQueries,
  invalidateBookingQueries,
} from "@/lib/react-query";
import toast from "react-hot-toast";


// Types
export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string;
  features: string[];
  popular?: boolean;
  slug: string;
  requiresPayment?: boolean;
}

export interface TimeSlot {
  time: string;
  display: string;
  available: boolean;
  availableSlots: number;
  consultants: Array<{
    id: string;
    name: string;
    availableSlots: number;
    totalDuration?: number;
    bufferBefore?: number;
    bufferAfter?: number;
  }>;
}

export interface AvailableDate {
  value: string;
  display: string;
  fullDate: string;
  dayOfWeek: number;
  totalAvailableSlots: number;
}

export interface BookingData {
  serviceId: string;
  scheduledDate: string;
  scheduledTime: string;
  customerData: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    company?: string;
    timezone?: string;
  };
  projectDescription: string;
  assignmentStrategy?: string;
  customerTimezone?: string;
  scheduledTimezone?: string;
}

// Add proper booking response types
export interface BookingConsultant {
  id: string;
  name: string;
  assignmentReason: string;
  confidenceScore: number;
}

export interface BookingResponse {
  booking: {
    id: string;
    bookingReference: string;
    status: string;
    scheduledDateTime: string;
    service: Record<string, unknown>; // More specific than any
    consultant: BookingConsultant;
    paymentStatus: string;
    paymentAmount: number;
  };
}

// API functions
const fetchServices = async (): Promise<{ services: Service[] }> => {
  const response = await fetch("/api/services");
  if (!response.ok) {
    throw new Error(`Failed to fetch services: ${response.status}`);
  }
  return response.json();
};

const fetchAvailableDates = async (
  serviceId?: string,
  daysAhead: number = 30
): Promise<{
  availableDates: AvailableDate[];
  serviceDuration: number;
  totalDatesChecked: number;
}> => {
  const params = new URLSearchParams();
  if (serviceId) {
    params.append("service_id", serviceId);
  }
  params.append("days_ahead", daysAhead.toString());

  const response = await fetch(`/api/availability/dates?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch available dates: ${response.status}`);
  }
  return response.json();
};

const fetchTimeSlots = async (
  date: string,
  serviceId?: string
): Promise<{
  timeSlots: TimeSlot[];
  date: string;
  serviceDuration: number;
  service?: {
    name: string;
    duration: number;
    totalDuration: number;
    bufferBefore: number;
    bufferAfter: number;
  };
}> => {
  const params = new URLSearchParams({ date });
  if (serviceId) {
    params.append("service_id", serviceId);
  }

  const response = await fetch(`/api/availability/slots?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch time slots: ${response.status}`);
  }
  return response.json();
};

const createBooking = async (
  bookingData: BookingData
): Promise<BookingResponse> => {
  const response = await fetch("/api/bookings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bookingData),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || `Booking failed: ${response.status}`);
  }

  return response.json();
};

// Custom hooks
export function useServices() {
  return useQuery({
    queryKey: queryKeys.services,
    queryFn: fetchServices,
    staleTime: 10 * 60 * 1000, // Services don't change often - 10 minutes
    gcTime: 30 * 60 * 1000, // Keep services in cache for 30 minutes
    select: (data) => data.services,
  });
}

export function useAvailableDates(serviceId?: string, daysAhead: number = 30) {
  return useQuery({
    queryKey: queryKeys.availableDates(serviceId, daysAhead),
    queryFn: () => fetchAvailableDates(serviceId, daysAhead),
    enabled: !!serviceId, // Only fetch when serviceId is available
    staleTime: 3 * 60 * 1000, // Dates change less frequently - 3 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    select: (data) => data.availableDates,
  });
}

export function useTimeSlots(date: string, serviceId?: string) {
  return useQuery({
    queryKey: queryKeys.timeSlots(date, serviceId),
    queryFn: () => fetchTimeSlots(date, serviceId),
    enabled: !!date && !!serviceId, // Only fetch when both date and serviceId are available
    staleTime: 1 * 60 * 1000, // Time slots change frequently - 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    // Enable refetch on window focus for time slots since they're most critical
    refetchOnWindowFocus: true,
    select: (data) => ({
      timeSlots: data.timeSlots,
      serviceDuration: data.serviceDuration,
      serviceInfo: data.service,
    }),
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation<BookingResponse, Error, BookingData>({
    mutationFn: createBooking,
    onSuccess: (_data: BookingResponse) => {
      // Invalidate and refetch availability data
      invalidateAvailabilityQueries();
      invalidateBookingQueries();

      toast.success("Booking created successfully!");

      // Optionally, you can also invalidate specific queries
      queryClient.invalidateQueries({ queryKey: queryKeys.availability });
    },
    onError: (error: Error) => {
      console.error("Booking creation failed:", error);
      toast.error(error.message || "Failed to create booking");
    },
  });
}

// Optimistic updates for better UX
export function useOptimisticTimeSlots(date: string, serviceId?: string) {
  const queryClient = useQueryClient();

  const updateTimeSlotOptimistically = (
    timeSlot: string,
    reduce: boolean = true
  ) => {
    const queryKey = queryKeys.timeSlots(date, serviceId);

    queryClient.setQueryData(
      queryKey,
      (oldData: { timeSlots?: TimeSlot[] } | undefined) => {
        if (!oldData?.timeSlots) return oldData;

        return {
          ...oldData,
          timeSlots: oldData.timeSlots.map((slot: TimeSlot) => {
            if (slot.time === timeSlot && slot.availableSlots > 0) {
              return {
                ...slot,
                availableSlots: reduce
                  ? Math.max(0, slot.availableSlots - 1)
                  : slot.availableSlots + 1,
                available: reduce ? slot.availableSlots > 1 : true,
              };
            }
            return slot;
          }),
        };
      }
    );
  };

  return { updateTimeSlotOptimistically };
}


