import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentIntentId = searchParams.get("payment_intent");

  if (!paymentIntentId) {
    return NextResponse.json(
      { error: "payment_intent parameter is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceRoleClient();

    // Check if booking exists with this payment reference
    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        services (name, duration_minutes, price),
        customer_metrics (email, total_bookings, total_revenue)
      `
      )
      .eq("payment_reference", paymentIntentId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found
      throw error;
    }

    return NextResponse.json({
      success: true,
      payment_intent_id: paymentIntentId,
      booking_found: !!booking,
      booking_details: booking
        ? {
            id: booking.id,
            booking_reference: booking.booking_reference,
            status: booking.status,
            payment_status: booking.payment_status,
            scheduled_date: booking.scheduled_date,
            scheduled_time: booking.scheduled_time,
            service: booking.services,
            customer_email: booking.customer_data?.email,
            created_at: booking.created_at,
            confirmed_at: booking.confirmed_at,
          }
        : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Payment status check error:", error);
    return NextResponse.json(
      {
        error: "Failed to check payment status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
