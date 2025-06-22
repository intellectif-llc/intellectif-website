import {
  createRouteHandlerClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

// Helper function to check if user is staff
async function isStaff(
  supabase: Awaited<ReturnType<typeof createRouteHandlerClient>>,
  userId: string
): Promise<boolean> {
  try {
    const { data } = await supabase
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

    // Find optimal consultant assignment using database function
    console.log("🔧 Calling get_optimal_consultant_assignment with params:", {
      target_date: scheduledDate,
      target_time: scheduledTime,
      service_id_param: serviceId,
      assignment_strategy: assignmentStrategy || "optimal",
    });

    const { data: consultantAssignment, error: consultantError } =
      await supabase.rpc("get_optimal_consultant_assignment", {
        target_date: scheduledDate,
        target_time: scheduledTime,
        service_id_param: serviceId,
        assignment_strategy: assignmentStrategy || "optimal",
      });

    console.log("📊 Consultant assignment result:", {
      data: consultantAssignment,
      error: consultantError,
      dataLength: consultantAssignment?.length || 0,
    });

    if (
      consultantError ||
      !consultantAssignment ||
      consultantAssignment.length === 0
    ) {
      console.error("Error finding consultant:", consultantError);
      return NextResponse.json(
        { error: "No available consultants for the selected time slot" },
        { status: 409 }
      );
    }

    const consultant = consultantAssignment[0]; // Get the best assignment

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

    // Create scheduled datetime
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        service_id: serviceId,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        scheduled_datetime: scheduledDateTime.toISOString(),
        customer_metrics_id: customerMetrics.id,
        customer_data: {
          email: customerData.email,
          first_name: customerData.firstName,
          last_name: customerData.lastName,
          phone: customerData.phone || null,
          company: customerData.company || null,
        },
        project_description: projectDescription,
        consultant_id: consultant.consultant_id,
        status: service.auto_confirm ? "confirmed" : "pending",
        payment_status: service.requires_payment ? "pending" : "waived",
        payment_amount: service.price,
        lead_score: calculateLeadScore(
          service.price,
          customerData.company,
          projectDescription
        ),
        booking_source: "website_booking",
      })
      .select(
        `
        *,
        service:services(*)
      `
      )
      .single();

    if (bookingError) {
      console.error("Error creating booking:", bookingError);
      return NextResponse.json(
        { error: "Failed to create booking" },
        { status: 500 }
      );
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

    if (bookingId) {
      // For single booking access, check staff status with auth client
      if (!user || !(await isStaff(authSupabase, user.id))) {
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
          consultant:profiles!consultant_id(first_name, last_name, email),
          customer_metrics(*)
        `
        )
        .eq("id", bookingId)
        .single();

      if (error || !booking) {
        return NextResponse.json(
          { error: "Booking not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ booking });
    }

    // List bookings (staff only)
    console.log("🔍 Checking staff status for user:", user?.id);
    const staffStatus = user ? await isStaff(authSupabase, user.id) : false;
    console.log("📊 Staff check result:", {
      userId: user?.id,
      isStaff: staffStatus,
    });

    if (!user || !staffStatus) {
      console.log("❌ Access denied - user not staff");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(
      "✅ User authorized, using service role client for bookings..."
    );

    // Use service role client for staff operations
    const serviceSupabase = createServiceRoleClient();

    // First, let's check if there are any bookings at all
    const { data: bookingCount, error: countError } = await serviceSupabase
      .from("bookings")
      .select("id", { count: "exact", head: true });

    console.log("📊 Booking count check:", {
      count: bookingCount,
      error: countError,
    });

    // Try a simple query first
    const { data: simpleBookings, error: simpleError } = await serviceSupabase
      .from("bookings")
      .select("*")
      .limit(5);

    console.log("📊 Simple bookings query:", {
      found: simpleBookings?.length || 0,
      error: simpleError,
      sample: simpleBookings?.[0],
    });

    // Now try with services join
    const { data: bookings, error } = await serviceSupabase
      .from("bookings")
      .select(
        `
        *,
        service:services(name, duration_minutes)
      `
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("❌ Supabase error fetching bookings:", {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json(
        { error: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("❌ Booking GET API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
