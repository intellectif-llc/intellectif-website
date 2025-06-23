import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { stripe } from "@/lib/stripe-server";
import { headers } from "next/headers";
import { sendPaymentConfirmationEmail } from "@/lib/email-service";
import type Stripe from "stripe";

// Import helper function from bookings API
async function getOrCreateCustomerMetrics(
  supabase: ReturnType<typeof createServiceRoleClient>,
  customerData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { email } = customerData as {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    company?: string | null;
  };

  // Try to find existing customer by email
  const { data: customer, error: customerError } = await supabase
    .from("customer_metrics")
    .select("*")
    .eq("email", email.toLowerCase())
    .single();

  if (customerError && customerError.code !== "PGRST116") {
    // PGRST116 is "not found" error, which is expected for new customers
    throw customerError;
  }

  if (!customer) {
    // Create new customer metrics record
    const { data: newCustomer, error: createError } = await supabase
      .from("customer_metrics")
      .insert({
        email: email.toLowerCase(),
        lead_source: "website_booking",
        lead_quality: "qualified", // Paid booking = qualified lead
        status: "prospect",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (createError) {
      throw createError;
    }

    return newCustomer;
  }

  return customer;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      console.error("Missing Stripe signature");
      return NextResponse.json(
        { error: "Missing Stripe signature" },
        { status: 400 }
      );
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log("🔔 Stripe webhook received:", event.type);

    // Use service role client for database operations
    const supabase = createServiceRoleClient();

    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object, supabase);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object, supabase);
        break;

      case "payment_intent.canceled":
        await handlePaymentCanceled(event.data.object, supabase);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  supabase: ReturnType<typeof createServiceRoleClient>
) {
  console.log("✅ Payment succeeded:", paymentIntent.id);

  // Prevent duplicate processing for the same payment intent
  if (paymentIntent.status !== "succeeded") {
    console.log("Payment intent not in succeeded status, skipping...");
    return;
  }

  // Check if booking already exists (for existing flow)
  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("*")
    .eq("payment_reference", paymentIntent.id)
    .single();

  let booking;

  if (existingBooking) {
    // Update existing booking status
    console.log("Updating existing booking:", existingBooking.id);
    const { data: updatedBooking, error } = await supabase
      .from("bookings")
      .update({
        payment_status: "paid",
        payment_method: "card",
        status: "confirmed", // Auto-confirm paid bookings
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("payment_reference", paymentIntent.id)
      .select(
        `
        *,
        services (name, duration_minutes, price)
      `
      )
      .single();

    if (error) {
      console.error(
        "Failed to update booking after successful payment:",
        error
      );
      throw error;
    }
    booking = updatedBooking;
  } else {
    // Create new booking from payment intent metadata
    console.log("Creating new booking from payment metadata");
    const metadata = paymentIntent.metadata as Record<string, string>;

    if (
      !metadata.scheduledDate ||
      !metadata.scheduledTime ||
      !metadata.serviceId
    ) {
      console.error("Missing required booking data in payment metadata:", {
        hasScheduledDate: !!metadata.scheduledDate,
        hasScheduledTime: !!metadata.scheduledTime,
        hasServiceId: !!metadata.serviceId,
        hasCustomerEmail: !!metadata.customerEmail,
      });
      throw new Error("Missing required booking data in payment metadata");
    }

    // Create scheduled datetime
    const scheduledDateTime = new Date(
      `${metadata.scheduledDate}T${metadata.scheduledTime}:00`
    );

    // Create or get customer metrics record
    const customerMetrics = await getOrCreateCustomerMetrics(supabase, {
      email: metadata.customerEmail,
      firstName: metadata.customerFirstName,
      lastName: metadata.customerLastName,
      phone: metadata.customerPhone || null,
      company: metadata.customerCompany || null,
    });

    // Create booking with payment already confirmed
    const { data: createdBooking, error: createError } = await supabase.rpc(
      "create_booking_with_availability_check",
      {
        service_id_param: metadata.serviceId,
        scheduled_date_param: metadata.scheduledDate,
        scheduled_time_param: metadata.scheduledTime,
        scheduled_datetime_param: scheduledDateTime.toISOString(),
        customer_metrics_id_param: customerMetrics.id,
        customer_data_param: {
          email: metadata.customerEmail,
          first_name: metadata.customerFirstName,
          last_name: metadata.customerLastName,
          phone: metadata.customerPhone || null,
          company: metadata.customerCompany || null,
        },
        project_description_param: metadata.projectDescription,
        assignment_strategy_param: "optimal",
        lead_score_param: 70, // Paid service = higher lead score
      }
    );

    if (createError || !createdBooking?.success) {
      console.error("Failed to create booking from payment:", createError);
      throw new Error(createError?.message || "Failed to create booking");
    }

    // Update the newly created booking with payment info
    const { data: finalBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        payment_reference: paymentIntent.id,
        payment_status: "paid",
        payment_method: "card",
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", createdBooking.booking.id)
      .select(
        `
        *,
        services (name, duration_minutes, price)
      `
      )
      .single();

    if (updateError) {
      console.error("Failed to update booking with payment info:", updateError);
      throw updateError;
    }
    booking = finalBooking;
  }

  // Send payment confirmation email
  try {
    await sendPaymentConfirmationEmail({
      customerName: `${booking.customer_data.first_name} ${booking.customer_data.last_name}`,
      customerEmail: booking.customer_data.email,
      serviceName: booking.services.name,
      bookingReference: booking.booking_reference,
      scheduledDate: booking.scheduled_date,
      scheduledTime: booking.scheduled_time,
      duration: booking.services.duration_minutes,
      price: booking.services.price,
      meetingUrl: "https://meet.google.com/mgp-uzoc-hkz", // Your Google Meet link
    });
    console.log("✅ Payment confirmation email sent");
  } catch (emailError) {
    console.error("❌ Failed to send payment confirmation email:", emailError);
    // Don't throw here - payment was successful, email is secondary
  }
}

async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  supabase: ReturnType<typeof createServiceRoleClient>
) {
  console.log("❌ Payment failed:", paymentIntent.id);

  const { error } = await supabase
    .from("bookings")
    .update({
      payment_status: "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("payment_reference", paymentIntent.id);

  if (error) {
    console.error("Failed to update booking after failed payment:", error);
    throw error;
  }

  // TODO: Send payment failed email here
  console.log("📧 TODO: Send payment failed email");
}

async function handlePaymentCanceled(
  paymentIntent: Stripe.PaymentIntent,
  supabase: ReturnType<typeof createServiceRoleClient>
) {
  console.log("🚫 Payment canceled:", paymentIntent.id);

  const { error } = await supabase
    .from("bookings")
    .update({
      payment_status: "failed",
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("payment_reference", paymentIntent.id);

  if (error) {
    console.error("Failed to update booking after canceled payment:", error);
    throw error;
  }
}
