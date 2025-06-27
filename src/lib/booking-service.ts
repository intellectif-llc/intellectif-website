import { createServiceRoleClient } from "@/lib/supabase-server";

// Comprehensive booking types aligned with database schema
export interface BookingData {
  id: string;
  booking_reference: string;
  user_id?: string;
  customer_metrics_id: string;
  customer_data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    company?: string;
  };
  project_description: string;
  service_id: string;
  scheduled_date: string;
  scheduled_time: string;
  scheduled_datetime: string;
  actual_start_time?: string;
  actual_end_time?: string;
  status:
    | "pending"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "no_show"
    | "rescheduled";
  booking_source: string;
  payment_status:
    | "pending"
    | "processing"
    | "paid"
    | "failed"
    | "refunded"
    | "waived";
  payment_amount?: number;
  payment_method?: string;
  payment_reference?: string;
  meeting_platform?: string;
  meeting_url?: string;
  meeting_id?: string;
  meeting_password?: string;
  consultant_id?: string;
  lead_score?: number;
  estimated_project_value?: number;
  follow_up_required: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  meeting_recording_url?: string;
  meeting_transcript?: string;
  ai_insights?: Record<string, unknown>;
  google_meet_space_name?: string;
  google_meet_config?: Record<string, unknown>;
  // Joined data
  service?: {
    id: string;
    name: string;
    duration_minutes: number;
    price: number;
    description?: string;
  };
  consultant?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string; // Optional - not fetched for security reasons
  };
  customer_metrics?: {
    id: string;
    email: string;
    lead_source: string;
    lead_quality: string;
    total_bookings: number;
    total_revenue: number;
    status: string;
  };
}

export interface BookingFilters {
  consultantId?: string;
  customerId?: string;
  status?: string;
  unassigned?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface BookingUpdate {
  consultant_id?: string | null;
  status?: string;
  meeting_url?: string;
  meeting_platform?: string;
  follow_up_notes?: string;
  completed_at?: string;
}

// Helper function to check if user is staff
async function isStaff(userId: string): Promise<boolean> {
  try {
    const serviceSupabase = createServiceRoleClient();
    const { data } = await serviceSupabase
      .from("profiles")
      .select("is_staff")
      .eq("id", userId)
      .single();
    return data?.is_staff || false;
  } catch {
    return false;
  }
}

// Helper function to fetch consultant profiles for bookings
async function fetchConsultantProfiles(
  supabase: ReturnType<typeof createServiceRoleClient>,
  consultantIds: string[]
): Promise<Record<string, BookingData["consultant"]>> {
  if (consultantIds.length === 0) return {};

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", consultantIds);

  return (profiles || []).reduce(
    (acc, profile) => {
      acc[profile.id] = {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        // Skip email lookup to avoid permissions issues with auth.users table
      };
      return acc;
    },
    {} as Record<string, BookingData["consultant"]>
  );
}

// Core booking service class
export class BookingService {
  // Get single booking by ID
  static async getBooking(
    bookingId: string,
    userContext?: { userId: string; isStaff: boolean }
  ): Promise<BookingData | null> {
    const serviceSupabase = createServiceRoleClient();

    // Get booking with service and customer_metrics
    const { data: booking, error } = await serviceSupabase
      .from("bookings")
      .select(
        `
        *,
        service:services(*),
        customer_metrics(*)
      `
      )
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return null;
    }

    // Check permissions if user context provided
    if (userContext && !userContext.isStaff) {
      const isOwner =
        booking.consultant_id === userContext.userId ||
        booking.user_id === userContext.userId;
      if (!isOwner) {
        return null;
      }
    }

    // Fetch consultant profile if assigned
    let consultant: BookingData["consultant"] | undefined;
    if (booking.consultant_id) {
      const consultantProfiles = await fetchConsultantProfiles(
        serviceSupabase,
        [booking.consultant_id]
      );
      consultant = consultantProfiles[booking.consultant_id];
    }

    // Transform customer_data for consistency
    const transformedCustomerData = {
      email: booking.customer_data?.email || "",
      firstName: booking.customer_data?.first_name || "",
      lastName: booking.customer_data?.last_name || "",
      phone: booking.customer_data?.phone || "",
      company: booking.customer_data?.company || "",
    };

    return {
      ...booking,
      customer_data: transformedCustomerData,
      consultant,
    };
  }

  // Get multiple bookings with filters
  static async getBookings(
    filters: BookingFilters = {},
    userContext?: { userId: string; isStaff: boolean }
  ): Promise<BookingData[]> {
    const serviceSupabase = createServiceRoleClient();

    let query = serviceSupabase
      .from("bookings")
      .select(
        `
        *,
        service:services(id, name, duration_minutes, price, description),
        customer_metrics(id, email, lead_source, lead_quality, total_bookings, total_revenue, status)
      `
      )
      .order("created_at", { ascending: false });

    // Apply filters
    if (filters.consultantId) {
      query = query.eq("consultant_id", filters.consultantId);
    }

    if (filters.customerId) {
      query = query.eq("user_id", filters.customerId);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.unassigned) {
      query = query.is("consultant_id", null);
    }

    if (filters.dateFrom) {
      query = query.gte("scheduled_date", filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte("scheduled_date", filters.dateTo);
    }

    // Apply user context permissions
    if (userContext && !userContext.isStaff) {
      // Non-staff users can only see their own bookings (as customer or consultant)
      query = query.or(
        `consultant_id.eq.${userContext.userId},user_id.eq.${userContext.userId}`
      );
    }

    const { data: bookings, error } = await query.limit(100);

    if (error || !bookings) {
      throw new Error(
        `Failed to fetch bookings: ${error?.message || "Unknown error"}`
      );
    }

    // Get unique consultant IDs and fetch their profiles
    const uniqueConsultantIds = [
      ...new Set(
        bookings
          .map((booking) => booking.consultant_id)
          .filter(Boolean) as string[]
      ),
    ];

    const consultantProfiles = await fetchConsultantProfiles(
      serviceSupabase,
      uniqueConsultantIds
    );

    // Transform bookings
    return bookings.map((booking) => {
      const transformedCustomerData = {
        email: booking.customer_data?.email || "",
        firstName: booking.customer_data?.first_name || "",
        lastName: booking.customer_data?.last_name || "",
        phone: booking.customer_data?.phone || "",
        company: booking.customer_data?.company || "",
      };

      return {
        ...booking,
        customer_data: transformedCustomerData,
        consultant: booking.consultant_id
          ? consultantProfiles[booking.consultant_id]
          : undefined,
      };
    });
  }

  // Update booking
  static async updateBooking(
    bookingId: string,
    updates: BookingUpdate,
    userContext: { userId: string; isStaff: boolean }
  ): Promise<BookingData | null> {
    const serviceSupabase = createServiceRoleClient();

    // Get current booking for permission check
    const currentBooking = await this.getBooking(bookingId);
    if (!currentBooking) {
      throw new Error("Booking not found");
    }

    // Check permissions
    if (!userContext.isStaff) {
      const isConsultant = currentBooking.consultant_id === userContext.userId;
      // Non-staff can only update status of their own bookings
      if (
        !isConsultant ||
        Object.keys(updates).some(
          (key) => key !== "status" && key !== "follow_up_notes"
        )
      ) {
        throw new Error("Insufficient permissions");
      }
    }

    // Prepare update data
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Set completion timestamp if marking as completed
    if (updates.status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    // Perform update
    const { error } = await serviceSupabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId);

    if (error) {
      throw new Error(`Failed to update booking: ${error.message}`);
    }

    // Return updated booking
    return this.getBooking(bookingId, userContext);
  }

  // Get user's role and permissions
  static async getUserRole(
    userId: string
  ): Promise<{ isStaff: boolean; isConsultant: boolean }> {
    const staffStatus = await isStaff(userId);

    // Check if user has any bookings assigned to them (consultant)
    const serviceSupabase = createServiceRoleClient();
    const { data: consultantBookings } = await serviceSupabase
      .from("bookings")
      .select("id")
      .eq("consultant_id", userId)
      .limit(1);

    const isConsultant = Boolean(
      consultantBookings && consultantBookings.length > 0
    );

    return { isStaff: staffStatus, isConsultant };
  }

  // Get bookings for current user (role-aware)
  static async getUserBookings(userId: string): Promise<BookingData[]> {
    const { isStaff, isConsultant } = await this.getUserRole(userId);

    if (isStaff) {
      // Staff can see all bookings
      return this.getBookings({}, { userId, isStaff: true });
    } else if (isConsultant) {
      // Consultants see bookings assigned to them
      return this.getBookings(
        { consultantId: userId },
        { userId, isStaff: false }
      );
    } else {
      // Customers see bookings they created
      return this.getBookings(
        { customerId: userId },
        { userId, isStaff: false }
      );
    }
  }

  // Assign consultant to booking
  static async assignConsultant(
    bookingId: string,
    consultantId: string | null,
    userContext: { userId: string; isStaff: boolean }
  ): Promise<BookingData | null> {
    if (!userContext.isStaff) {
      throw new Error("Only staff can assign consultants");
    }

    return this.updateBooking(
      bookingId,
      { consultant_id: consultantId },
      userContext
    );
  }

  // Get booking statistics
  static async getBookingStats(userContext?: {
    userId: string;
    isStaff: boolean;
  }): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    unassigned: number;
  }> {
    const bookings = userContext
      ? await this.getUserBookings(userContext.userId)
      : await this.getBookings();

    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === "pending").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      completed: bookings.filter((b) => b.status === "completed").length,
      unassigned: bookings.filter((b) => !b.consultant_id).length,
    };
  }
}
