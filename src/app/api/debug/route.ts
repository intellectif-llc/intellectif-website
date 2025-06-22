import { createRouteHandlerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const { searchParams } = new URL(request.url);
    const targetDate =
      searchParams.get("date") || new Date().toISOString().split("T")[0];

    console.log("🔍 DEBUG API - Checking database state for date:", targetDate);

    // 1. Check existing bookings for the target date
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(
        `
        id,
        booking_reference,
        scheduled_date,
        scheduled_time,
        status,
        consultant_id,
        service_id,
        services!inner(name, duration_minutes)
      `
      )
      .eq("scheduled_date", targetDate)
      .order("scheduled_time");

    console.log("📋 Existing bookings for", targetDate, ":", {
      count: bookings?.length || 0,
      bookings:
        bookings?.map((b: any) => ({
          reference: b.booking_reference,
          time: b.scheduled_time,
          status: b.status,
          consultant: b.consultant_id,
          service: b.services?.name,
          duration: b.services?.duration_minutes,
        })) || [],
    });

    // 2. Check availability templates for consultants
    const { data: templates, error: templatesError } = await supabase
      .from("availability_templates")
      .select(
        `
        consultant_id,
        day_of_week,
        start_time,
        end_time,
        max_bookings,
        is_active,
        profiles!inner(first_name, last_name, is_staff)
      `
      )
      .eq("is_active", true)
      .order("consultant_id, day_of_week, start_time");

    const targetDayOfWeek = new Date(targetDate).getDay();
    const templatesForDay =
      templates?.filter((t) => t.day_of_week === targetDayOfWeek) || [];

    console.log("🗓️ Availability templates for day", targetDayOfWeek, ":", {
      totalTemplates: templates?.length || 0,
      templatesForTargetDay: templatesForDay.length,
      templates: templatesForDay.map((t: any) => ({
        consultant: `${t.profiles?.first_name} ${t.profiles?.last_name}`,
        consultantId: t.consultant_id,
        timeSlot: `${t.start_time} - ${t.end_time}`,
        maxBookings: t.max_bookings,
      })),
    });

    // 3. Check consultant profiles
    const { data: consultants, error: consultantsError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, is_staff")
      .eq("is_staff", true);

    console.log("👥 Staff consultants:", {
      count: consultants?.length || 0,
      consultants:
        consultants?.map((c) => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name}`,
          isStaff: c.is_staff,
        })) || [],
    });

    // 4. Check services
    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("id, name, duration_minutes, is_active")
      .eq("is_active", true);

    console.log("🛠️ Active services:", {
      count: services?.length || 0,
      services:
        services?.map((s) => ({
          id: s.id,
          name: s.name,
          duration: s.duration_minutes,
        })) || [],
    });

    // 5. Test the availability function directly
    const testTime = "09:00";
    const testServiceId = services?.[0]?.id; // Use first service for testing
    let availabilityTest = null;
    let availabilityError = null;

    if (testServiceId) {
      console.log(
        `\n🧪 Testing availability function for ${targetDate} at ${testTime} with service ${testServiceId}`
      );

      const result = await supabase.rpc(
        "get_available_consultants_with_buffer",
        {
          target_date: targetDate,
          target_time: testTime,
          service_id_param: testServiceId,
        }
      );

      availabilityTest = result.data;
      availabilityError = result.error;

      console.log("🔬 Direct function test results:", {
        error: availabilityError,
        consultantCount: availabilityTest?.length || 0,
        results:
          availabilityTest?.map((c: any) => ({
            id: c.consultant_id,
            name: c.consultant_name,
            availableSlots: c.available_slots,
            currentBookings: c.current_bookings,
            maxBookings: c.max_bookings,
            availableStart: c.available_start,
            availableEnd: c.available_end,
            totalDuration: c.total_duration_minutes,
            bufferBefore: c.buffer_before,
            bufferAfter: c.buffer_after,
          })) || [],
      });
    }

    return NextResponse.json({
      targetDate,
      targetDayOfWeek,
      bookings: {
        count: bookings?.length || 0,
        data: bookings || [],
        error: bookingsError,
      },
      templates: {
        total: templates?.length || 0,
        forTargetDay: templatesForDay.length,
        data: templatesForDay,
        error: templatesError,
      },
      consultants: {
        count: consultants?.length || 0,
        data: consultants || [],
        error: consultantsError,
      },
      services: {
        count: services?.length || 0,
        data: services || [],
        error: servicesError,
      },
      availabilityTest: testServiceId
        ? {
            serviceId: testServiceId,
            testTime,
            error: availabilityError,
            results: availabilityTest || [],
          }
        : null,
    });
  } catch (error) {
    console.error("💥 DEBUG API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
