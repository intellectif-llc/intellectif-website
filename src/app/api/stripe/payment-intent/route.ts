import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-server";
import { stripe, formatAmountForStripe } from "@/lib/stripe-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const body = await request.json();

    const { serviceId, customerEmail, customerName, bookingId, bookingData } =
      body;

    // Validate required fields
    if (!serviceId || !customerEmail || !customerName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get service details
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("*")
      .eq("id", serviceId)
      .eq("requires_payment", true)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: "Service not found or does not require payment" },
        { status: 404 }
      );
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(service.price),
      currency: "usd",
      payment_method_types: ["card"],
      metadata: {
        serviceId: service.id,
        serviceName: service.name,
        serviceSlug: service.slug,
        customerEmail,
        customerName,
        bookingId: bookingId || "",
        // Store booking data for webhook processing (if provided)
        ...(bookingData && {
          scheduledDate: bookingData.scheduledDate,
          scheduledTime: bookingData.scheduledTime,
          customerFirstName: bookingData.customerData.firstName,
          customerLastName: bookingData.customerData.lastName,
          customerPhone: bookingData.customerData.phone || "",
          customerCompany: bookingData.customerData.company || "",
          projectDescription: bookingData.projectDescription,
        }),
      },
      description: `Payment for ${service.name} - ${customerName}`,
      receipt_email: customerEmail,
    });

    // If we have a booking ID, update the booking with payment intent
    if (bookingId) {
      await supabase
        .from("bookings")
        .update({
          payment_reference: paymentIntent.id,
          payment_status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: service.price,
      currency: "usd",
    });
  } catch (error) {
    console.error("Payment Intent Error:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
