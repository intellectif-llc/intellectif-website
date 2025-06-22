import { createRouteHandlerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    // Fetch all active services from the database
    const { data: services, error } = await supabase
      .from("services")
      .select(
        `
        id,
        slug,
        name,
        description,
        short_description,
        price,
        duration_minutes,
        features,
        is_popular,
        requires_payment,
        buffer_before_minutes,
        buffer_after_minutes,
        allow_custom_buffer
      `
      )
      .eq("is_active", true)
      .order("is_popular", { ascending: false }) // Popular services first
      .order("price", { ascending: true }); // Then by price (free first)

    if (error) {
      console.error("Error fetching services:", error);
      return NextResponse.json(
        { error: "Failed to fetch services" },
        { status: 500 }
      );
    }

    // Transform the data to match the frontend interface
    const transformedServices = services.map((service) => ({
      id: service.id,
      slug: service.slug,
      name: service.name,
      price: Number(service.price),
      duration: service.duration_minutes,
      description: service.description,
      features: Array.isArray(service.features) ? service.features : [],
      popular: service.is_popular,
      requiresPayment: service.requires_payment,

      // Buffer-related fields for BufferTimeManager
      duration_minutes: service.duration_minutes,
      buffer_before_minutes: service.buffer_before_minutes || 0,
      buffer_after_minutes: service.buffer_after_minutes || 5,
      allow_custom_buffer: service.allow_custom_buffer,
    }));

    return NextResponse.json({
      services: transformedServices,
      total: transformedServices.length,
    });
  } catch (error) {
    console.error("Services API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    // Check if user is staff (only staff can create services)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_staff")
      .eq("id", user.id)
      .single();

    if (!profile?.is_staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      slug,
      name,
      description,
      short_description,
      price,
      duration_minutes,
      features,
      is_popular,
      requires_payment,
      buffer_before_minutes,
      buffer_after_minutes,
      allow_custom_buffer,
    } = body;

    // Validate required fields
    if (!slug || !name || !description || duration_minutes === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create the service
    const { data: service, error } = await supabase
      .from("services")
      .insert({
        slug,
        name,
        description,
        short_description,
        price: price || 0,
        duration_minutes,
        features: features || [],
        is_popular: is_popular || false,
        requires_payment: requires_payment || false,
        buffer_before_minutes: buffer_before_minutes || 0,
        buffer_after_minutes: buffer_after_minutes || 5,
        allow_custom_buffer: allow_custom_buffer !== false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating service:", error);
      return NextResponse.json(
        { error: "Failed to create service" },
        { status: 500 }
      );
    }

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error("Services POST API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
