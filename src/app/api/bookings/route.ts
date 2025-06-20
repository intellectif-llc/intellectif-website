import { createRouteHandlerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
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
    const { data: consultantAssignment, error: consultantError } =
      await supabase.rpc("get_optimal_consultant_assignment", {
        target_date: scheduledDate,
        target_time: scheduledTime,
        service_id_param: serviceId,
        assignment_strategy: assignmentStrategy || "optimal",
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

    // Create or get customer metrics record
    const customerMetrics = await getOrCreateCustomerMetrics(
      supabase,
      customerData
    );

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
        service:services(*),
        consultant:profiles!consultant_id(first_name, last_name, email)
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
          consultant: booking.consultant,
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
    const supabase = await createRouteHandlerClient();
    const { searchParams } = new URL(request.url);

    // Get current user (for staff to view all bookings)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const bookingId = searchParams.get("id");
    const customerEmail = searchParams.get("customer_email");

    if (bookingId) {
      // Get specific booking
      let query = supabase
        .from("bookings")
        .select(
          `
          *,
          service:services(*),
          consultant:profiles!consultant_id(first_name, last_name, email),
          customer_metrics(*)
        `
        )
        .eq("id", bookingId);

      // Add access control
      if (!user || !(await isStaff(supabase, user.id))) {
        if (!customerEmail) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        query = query.eq("customer_data->>email", customerEmail);
      }

      const { data: booking, error } = await query.single();

      if (error || !booking) {
        return NextResponse.json(
          { error: "Booking not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ booking });
    }

    // List bookings (staff only)
    if (!user || !(await isStaff(supabase, user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        service:services(name, duration_minutes),
        consultant:profiles!consultant_id(first_name, last_name)
      `
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Booking GET API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Note: Consultant assignment is now handled by the database function get_optimal_consultant_assignment

// Helper function to get or create customer metrics
async function getOrCreateCustomerMetrics(
  supabase: Awaited<ReturnType<typeof createRouteHandlerClient>>,
  customerData: Record<string, unknown>
) {
  // First try to find existing customer by email
  const { data: existing } = await supabase
    .from("customer_metrics")
    .select("*")
    .eq("email", customerData.email)
    .single();

  if (existing) {
    return existing;
  }

  // Create new customer metrics record
  const { data: newCustomer, error } = await supabase
    .from("customer_metrics")
    .insert({
      email: customerData.email,
      lead_source: "website_booking",
      lead_quality: "unqualified",
    })
    .select()
    .single();

  if (error) {
    throw new Error("Failed to create customer record");
  }

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
  supabase: Awaited<ReturnType<typeof createRouteHandlerClient>>,
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

// Helper function to check if user is staff
async function isStaff(
  supabase: Awaited<ReturnType<typeof createRouteHandlerClient>>,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("is_staff")
    .eq("id", userId)
    .single();

  return data?.is_staff || false;
}
