import {
  createRouteHandlerClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import { sendBookingConfirmationEmail } from "@/lib/email-service";
import {
  GoogleMeetService,
  type CreateMeetingOptions,
} from "@/lib/google-meet-service";

// Define proper types to replace 'any'
interface BookingRecord {
  id: string;
  booking_reference: string;
  user_id?: string;
  consultant_id?: string;
  customer_data: {
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    company?: string;
  };
  scheduled_date: string;
  scheduled_time: string;
  scheduled_datetime: string;
  status: string;
  service: {
    name: string;
    duration_minutes: number;
  };
  created_at: string;
}

interface ConsultantProfile {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface TransformedBooking extends BookingRecord {
  customer_data: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    company: string;
  };
  consultant?: ConsultantProfile | null;
}

// Helper function to check if user is staff - ALWAYS use service role to bypass RLS
async function isStaff(userId: string): Promise<boolean> {
  try {
    const serviceSupabase = createServiceRoleClient();
    const { data } = await serviceSupabase
      .from("profiles")
      .select("is_staff")
      .eq("id", userId)
      .single();

    return data?.is_staff || false;
  } catch (error) {
    console.error("Error checking staff status:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // DEBUG: Check environment variables
    console.log("Environment check:", {
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV,
    });

    // Use service role client for booking creation (triggers access auth.uid())
    const supabase = createServiceRoleClient();
    const body = await request.json();

    const {
      serviceId,
      scheduledDate,
      scheduledTime,
      customerData,
      projectDescription,
      _preferredConsultant, // Optional: if customer has a preference (not used in current implementation)
      assignmentStrategy = "optimal", // 'optimal', 'balanced', 'random', 'specific'
    } = body;

    // Validate required fields
    if (
      !serviceId ||
      !scheduledDate ||
      !scheduledTime ||
      !customerData ||
      !projectDescription
    ) {
      return NextResponse.json(
        { error: "Missing required booking information" },
        { status: 400 }
      );
    }

    // Validate customer data
    if (
      !customerData.email ||
      !customerData.firstName ||
      !customerData.lastName
    ) {
      return NextResponse.json(
        { error: "Missing required customer information" },
        { status: 400 }
      );
    }

    // Get service details
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("*")
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // FIXED: Atomic booking creation with race condition protection
    // Instead of separate availability check + booking creation, use a single atomic operation
    console.log("🔧 Creating booking with atomic availability check:", {
      target_date: scheduledDate,
      target_time: scheduledTime,
      service_id_param: serviceId,
      assignment_strategy: assignmentStrategy || "optimal",
    });

    // Create scheduled datetime
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);

    // Create or get customer metrics record using service role
    console.log("🔧 Creating service role client for customer metrics...");
    const serviceSupabase = createServiceRoleClient();
    console.log(
      "✅ Service role client created, calling getOrCreateCustomerMetrics..."
    );
    const customerMetrics = await getOrCreateCustomerMetrics(
      serviceSupabase,
      customerData
    );
    console.log("✅ Customer metrics retrieved:", {
      id: customerMetrics.id,
      email: customerMetrics.email,
    });

    // 🚀 PRE-CREATE GOOGLE MEET MEETING FOR CONSULTANT
    let googleMeetData = null;
    let assignedConsultant = null;

    // First, get the optimal consultant assignment
    const { data: consultantAssignment } = await supabase.rpc(
      "get_optimal_consultant_assignment",
      {
        target_date: scheduledDate,
        target_time: scheduledTime,
        service_id_param: serviceId,
        assignment_strategy: assignmentStrategy || "optimal",
      }
    );

    if (consultantAssignment && consultantAssignment.length > 0) {
      assignedConsultant = consultantAssignment[0];
      console.log("🎯 Assigned consultant:", {
        id: assignedConsultant.consultant_id,
        name: assignedConsultant.consultant_name,
      });

      // Create Google Meet meeting for the booking
      try {
        // Check if consultant has Google account connected
        const isConnected = await GoogleMeetService.isConsultantConnected(
          assignedConsultant.consultant_id
        );

        if (isConnected) {
          const startTime = new Date(
            `${scheduledDate}T${scheduledTime}:00.000Z`
          );
          const endTime = new Date(
            startTime.getTime() + service.duration_minutes * 60000
          );

          const meetingOptions: CreateMeetingOptions = {
            title: `${service.name} - ${customerData.firstName} ${customerData.lastName}`,
            description: `Consultation meeting for: ${projectDescription}`,
            start: startTime,
            end: endTime,
            consultantId: assignedConsultant.consultant_id,
            customerEmail: customerData.email,
            customerName: `${customerData.firstName} ${customerData.lastName}`,
          };

          const meetingDetails = await GoogleMeetService.createMeeting(
            meetingOptions
          );

          if (meetingDetails) {
            googleMeetData = meetingDetails; // Use the complete payload as returned by the service

            console.log("✅ Google Meet created successfully:", {
              meetingUri: meetingDetails.meetingUri,
              meetingCode: meetingDetails.meetingCode,
              spaceName: meetingDetails.name,
            });
          } else {
            console.log("⚠️ Google Meet creation failed");
          }
        } else {
          console.log(
            "⚠️ Consultant has not connected Google account, skipping Google Meet creation"
          );
        }
      } catch (meetingError) {
        console.error("❌ Error creating Google Meet:", meetingError);
        console.log("⚠️ Booking will be created without Google Meet");
      }
    }

    // FIXED: Use atomic booking creation function with Google Meet data
    const { data: bookingResult, error: bookingError } = await supabase.rpc(
      "create_booking_with_availability_check",
      {
        service_id_param: serviceId,
        scheduled_date_param: scheduledDate,
        scheduled_time_param: scheduledTime,
        scheduled_datetime_param: scheduledDateTime.toISOString(),
        customer_metrics_id_param: customerMetrics.id,
        customer_data_param: {
          email: customerData.email,
          first_name: customerData.firstName,
          last_name: customerData.lastName,
          phone: customerData.phone || null,
          company: customerData.company || null,
        },
        project_description_param: projectDescription,
        assignment_strategy: assignmentStrategy || "optimal",
        lead_score_param: calculateLeadScore(
          service.price,
          customerData.company,
          projectDescription
        ),
        google_meet_payload_param: googleMeetData,
      }
    );

    if (bookingError || !bookingResult?.success) {
      console.error("Error creating booking atomically:", bookingError);
      const errorMessage =
        bookingResult?.error ||
        bookingError?.message ||
        "Failed to create booking";

      // Return specific error codes for different failure types
      if (
        errorMessage.includes("No available consultants") ||
        errorMessage.includes("time slot")
      ) {
        return NextResponse.json(
          {
            error:
              "The selected time slot is no longer available. Please choose another time.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const booking = bookingResult.booking;
    const consultant = bookingResult.consultant;

    console.log("📋 Booking created successfully:", {
      id: booking.id,
      bookingReference: booking.booking_reference,
      status: booking.status,
      meetingUrl: booking.meeting_url,
      meetingPlatform: booking.meeting_platform,
      meetingId: booking.meeting_id,
      googleMeetSpaceName: booking.google_meet_space_name,
      consultantId: consultant.consultant_id,
      consultantName: consultant.consultant_name,
    });

    // Send confirmation email for all bookings (free and paid)
    try {
      // Format the scheduled time properly
      const scheduledTimeFormatted = new Date(
        `${scheduledDate}T${scheduledTime}:00`
      ).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZoneName: "short",
      });

      await sendBookingConfirmationEmail({
        customerName: `${customerData.firstName} ${customerData.lastName}`,
        customerEmail: customerData.email,
        serviceName: service.name,
        bookingReference: booking.booking_reference,
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTimeFormatted,
        duration: service.duration_minutes,
        price: service.requires_payment ? service.price : undefined,
        meetingUrl: booking.meeting_url, // Uses Google Meet URL from booking or fallback
      });
      console.log("✅ Booking confirmation email sent successfully");
    } catch (emailError) {
      console.error(
        "❌ Failed to send booking confirmation email:",
        emailError
      );
      // Don't fail the booking if email fails - booking was successful
    }

    // Create follow-up task if required
    if (booking.follow_up_required) {
      await createFollowUpTask(supabase, booking);
    }

    return NextResponse.json(
      {
        booking: {
          id: booking.id,
          bookingReference: booking.booking_reference,
          status: booking.status,
          scheduledDateTime: booking.scheduled_datetime,
          service: booking.service,
          consultant: {
            id: consultant.consultant_id,
            name: consultant.consultant_name,
            assignmentReason: consultant.assignment_reason,
            confidenceScore: consultant.confidence_score,
          },
          paymentStatus: booking.payment_status,
          paymentAmount: booking.payment_amount,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Booking API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // First, authenticate with route handler client (uses cookies)
    const authSupabase = await createRouteHandlerClient();
    const { searchParams } = new URL(request.url);

    // Get current user (for staff to view all bookings)
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    const bookingId = searchParams.get("id");
    const customerEmail = searchParams.get("customer_email");
    const consultantId = searchParams.get("consultant_id");
    const unassigned = searchParams.get("unassigned");

    if (bookingId) {
      // For single booking access, check staff status with service role client
      if (!user || !(await isStaff(user.id))) {
        if (!customerEmail) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // Non-staff users can only access their own bookings - use auth client
        const { data: booking, error } = await authSupabase
          .from("bookings")
          .select(
            `
            *,
            service:services(*),
            customer_metrics(*)
          `
          )
          .eq("id", bookingId)
          .eq("customer_data->>email", customerEmail)
          .single();

        if (error || !booking) {
          return NextResponse.json(
            { error: "Booking not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({ booking });
      }

      // Staff users can access any booking - use service role client
      const serviceSupabase = createServiceRoleClient();
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

      // If booking found and has consultant, fetch consultant profile separately
      if (booking && booking.consultant_id) {
        const { data: consultantProfile } = await serviceSupabase
          .from("profiles")
          .select("first_name, last_name, id")
          .eq("id", booking.consultant_id)
          .single();

        if (consultantProfile) {
          booking.consultant = consultantProfile;
        }
      }

      if (error || !booking) {
        return NextResponse.json(
          { error: "Booking not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ booking });
    }

    // List bookings with role-based access control
    console.log("🔍 Checking staff status for user:", user?.id);
    const staffStatus = user ? await isStaff(user.id) : false;
    console.log("📊 Staff check result:", {
      userId: user?.id,
      isStaff: staffStatus,
    });

    if (!user) {
      console.log("❌ Access denied - no user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (staffStatus) {
      // STAFF USERS: Use service role client to bypass RLS and see all bookings
      console.log("✅ Staff user - using service role client for full access");
      const serviceSupabase = createServiceRoleClient();

      // Build query based on query parameters
      let query = serviceSupabase
        .from("bookings")
        .select(
          `
          *,
          service:services(name, duration_minutes)
        `
        )
        .order("created_at", { ascending: false });

      if (consultantId) {
        // Filter by specific consultant
        query = query.eq("consultant_id", consultantId);
        console.log("🔍 Filtering by consultant_id:", consultantId);
      } else if (unassigned === "true") {
        // Filter for unassigned bookings
        query = query.is("consultant_id", null);
        console.log("🔍 Filtering for unassigned bookings");
      }

      const { data: bookings, error } = await query;

      if (error) {
        console.error("❌ Error fetching staff bookings:", error);
        return NextResponse.json(
          {
            error: "Failed to fetch bookings",
            details: error.message || "Database error",
          },
          { status: 500 }
        );
      }

      // Get consultant info for all unique consultant IDs
      const uniqueConsultantIds = [
        ...new Set(
          (bookings || [])
            .map((booking: BookingRecord) => booking.consultant_id)
            .filter(Boolean)
        ),
      ];

      let consultantProfiles: Record<string, ConsultantProfile> = {};
      if (uniqueConsultantIds.length > 0) {
        const { data: profiles } = await serviceSupabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", uniqueConsultantIds);

        if (profiles) {
          consultantProfiles = profiles.reduce(
            (
              acc: Record<string, ConsultantProfile>,
              profile: ConsultantProfile
            ) => {
              acc[profile.id] = {
                id: profile.id,
                first_name: profile.first_name,
                last_name: profile.last_name,
                // Skip email lookup for now to avoid permissions issues
              };
              return acc;
            },
            {}
          );
        }
      }

      // Transform the data for consistent format
      const transformedBookings = (bookings || []).map(
        (booking: BookingRecord): TransformedBooking => {
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
            service: booking.service || {
              name: "Unknown Service",
              duration_minutes: 60,
            },
            consultant: booking.consultant_id
              ? consultantProfiles[booking.consultant_id] || null
              : null,
          };
        }
      );

      console.log(
        `✅ Retrieved ${transformedBookings.length} bookings for staff user`
      );
      return NextResponse.json({ bookings: transformedBookings });
    } else {
      // NON-STAFF USERS: Determine if they are consultant or customer
      console.log("👤 Non-staff user - determining user type");

      // Check if this user is a consultant (has bookings assigned to them)
      const { data: consultantBookings } = await authSupabase
        .from("bookings")
        .select("id")
        .eq("consultant_id", user.id)
        .limit(1);

      const isConsultant = consultantBookings && consultantBookings.length > 0;

      if (isConsultant) {
        // CONSULTANT USER: Show bookings assigned to them with consultant info
        console.log("👨‍💼 Consultant user - fetching assigned bookings");

        // Use service role client for consultants to bypass RLS for consultant profile join
        // This allows consultants to see their own profile info with their bookings
        const serviceSupabase = createServiceRoleClient();
        const { data: bookings, error } = await serviceSupabase
          .from("bookings")
          .select(
            `
            *,
            service:services(name, duration_minutes)
          `
          )
          .eq("consultant_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) {
          console.error("❌ Error fetching consultant bookings:", error);
          return NextResponse.json(
            {
              error: "Failed to fetch bookings",
              details: error.message || "Database error",
            },
            { status: 500 }
          );
        }

        // Get consultant's own profile info using service role client
        const { data: consultantProfile } = await serviceSupabase
          .from("profiles")
          .select("id, first_name, last_name")
          .eq("id", user.id)
          .single();

        const transformedBookings = (bookings || []).map(
          (booking: BookingRecord): TransformedBooking => {
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
              service: booking.service || {
                name: "Unknown Service",
                duration_minutes: 60,
              },
              consultant: consultantProfile || null,
            };
          }
        );

        console.log(
          `✅ Retrieved ${transformedBookings.length} bookings for consultant`
        );
        return NextResponse.json({ bookings: transformedBookings });
      } else {
        // CUSTOMER USER: Show bookings they created (via user_id)
        console.log(
          "👤 Customer user - fetching their bookings for user_id:",
          user.id
        );

        const { data: bookings, error } = await authSupabase
          .from("bookings")
          .select(
            `
            *,
            service:services(name, duration_minutes)
          `
          )
          .eq("user_id", user.id) // ✅ FIX: This line is added to filter by the user's ID
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) {
          console.error("❌ Error fetching customer bookings:", error);
          return NextResponse.json(
            {
              error: "Failed to fetch bookings",
              details: error.message || "Database error",
            },
            { status: 500 }
          );
        }

        // Fetch consultant profiles for assigned bookings using service role client
        const uniqueConsultantIds = [
          ...new Set(
            (bookings || [])
              .map((booking: BookingRecord) => booking.consultant_id)
              .filter(Boolean)
          ),
        ];

        let consultantProfiles: Record<string, ConsultantProfile> = {};
        if (uniqueConsultantIds.length > 0) {
          // Always use service role client to avoid RLS policy recursion
          const serviceSupabase = createServiceRoleClient();
          const { data: profiles } = await serviceSupabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", uniqueConsultantIds);

          if (profiles) {
            consultantProfiles = profiles.reduce(
              (
                acc: Record<string, ConsultantProfile>,
                profile: ConsultantProfile
              ) => {
                acc[profile.id] = {
                  ...profile,
                  // Skip email for customer users - they don't need consultant emails
                };
                return acc;
              },
              {}
            );
          }
        }

        // Transform the bookings with consultant data
        const transformedBookings = (bookings || []).map(
          (booking: BookingRecord): TransformedBooking => {
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
              service: booking.service || {
                name: "Unknown Service",
                duration_minutes: 60,
              },
              consultant: booking.consultant_id
                ? consultantProfiles[booking.consultant_id] || null
                : null,
            };
          }
        );

        console.log(
          `✅ Retrieved ${transformedBookings.length} bookings for customer`
        );
        return NextResponse.json({ bookings: transformedBookings });
      }
    }
  } catch (error) {
    console.error("❌ Unexpected error in GET /api/bookings:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Note: Consultant assignment is now handled by the database function get_optimal_consultant_assignment

// Helper function to get or create customer metrics
async function getOrCreateCustomerMetrics(
  supabase:
    | Awaited<ReturnType<typeof createRouteHandlerClient>>
    | ReturnType<typeof createServiceRoleClient>,
  customerData: Record<string, unknown>
) {
  console.log(
    "🔍 getOrCreateCustomerMetrics called with email:",
    customerData.email
  );

  // First try to find existing customer by email
  console.log("🔧 Searching for existing customer...");
  const { data: existingCustomers, error: selectError } = await supabase
    .from("customer_metrics")
    .select("*")
    .eq("email", customerData.email);

  console.log("📊 Existing customer search result:", {
    found: existingCustomers && existingCustomers.length > 0,
    error: selectError,
    customerId: existingCustomers?.[0]?.id,
    count: existingCustomers?.length || 0,
  });

  if (selectError) {
    console.error("❌ Error searching for existing customer:", selectError);
    throw new Error(`Failed to search for customer: ${selectError.message}`);
  }

  if (existingCustomers && existingCustomers.length > 0) {
    console.log(
      "✅ Found existing customer, returning:",
      existingCustomers[0].id
    );
    return existingCustomers[0];
  }

  // Create new customer metrics record
  console.log("🔧 Creating new customer record...");
  const { data: newCustomer, error } = await supabase
    .from("customer_metrics")
    .insert({
      email: customerData.email,
      lead_source: "website_booking",
      lead_quality: "unqualified",
    })
    .select()
    .single();

  console.log("📊 New customer creation result:", {
    success: !!newCustomer,
    error: error,
    customerId: newCustomer?.id,
    errorCode: error?.code,
    errorMessage: error?.message,
  });

  if (error) {
    console.error("❌ Failed to create customer record:", error);
    throw new Error("Failed to create customer record");
  }

  console.log("✅ New customer created successfully:", newCustomer.id);
  return newCustomer;
}

// Helper function to calculate lead score
function calculateLeadScore(
  price: number,
  company: string,
  description: string
): number {
  let score = 30; // Base score

  // Price indicates intent
  if (price > 0) score += 40;

  // Company indicates business customer
  if (company && company.trim()) score += 20;

  // Detailed description indicates serious intent
  if (description && description.length > 100) score += 10;

  return Math.min(score, 100);
}

// Helper function to create follow-up task
async function createFollowUpTask(
  supabase:
    | Awaited<ReturnType<typeof createRouteHandlerClient>>
    | ReturnType<typeof createServiceRoleClient>,
  booking: Record<string, unknown>
) {
  const bookingData = booking as {
    id: string;
    scheduled_datetime: string;
    customer_metrics_id: string;
    consultant_id: string;
    service: { name: string };
  };

  const followUpDate = new Date(bookingData.scheduled_datetime);
  followUpDate.setDate(followUpDate.getDate() + 1); // Next day

  await supabase.from("follow_ups").insert({
    booking_id: bookingData.id,
    customer_metrics_id: bookingData.customer_metrics_id,
    assigned_to: bookingData.consultant_id,
    follow_up_type: "email",
    title: `Follow up on ${bookingData.service.name} consultation`,
    scheduled_date: followUpDate.toISOString(),
    priority: "medium",
  });
}
