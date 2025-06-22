import { createRouteHandlerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const { searchParams } = new URL(request.url);

    const testDate = searchParams.get("date") || "2025-06-26";
    const serviceId =
      searchParams.get("service_id") || "9164798e-8a6f-433b-9794-a97adf7f572a";

    console.log("🔍 DEBUG: Comprehensive buffer logic analysis", {
      testDate,
      serviceId,
    });

    // 1. Check existing bookings for the date
    const { data: existingBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(
        `
        id,
        scheduled_time,
        consultant_id,
        status,
        service_id,
        services!inner(name, duration_minutes)
      `
      )
      .eq("scheduled_date", testDate)
      .in("status", ["confirmed", "pending"])
      .order("scheduled_time");

    console.log("📋 Existing bookings for", testDate, ":", {
      count: existingBookings?.length || 0,
      bookings:
        existingBookings?.map((b: any) => ({
          time: b.scheduled_time,
          consultant: b.consultant_id,
          service: b.services?.name,
          duration: b.services?.duration_minutes,
          status: b.status,
        })) || [],
    });

    // 2. Check availability templates
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
        profiles!inner(first_name, last_name)
      `
      )
      .eq("is_active", true)
      .order("consultant_id, day_of_week, start_time");

    const targetDayOfWeek = new Date(testDate).getDay();
    const templatesForDay =
      templates?.filter((t) => t.day_of_week === targetDayOfWeek) || [];

    console.log("🗓️ Availability templates for day", targetDayOfWeek, ":", {
      totalTemplates: templates?.length || 0,
      templatesForTargetDay: templatesForDay.length,
      templates: templatesForDay.map((t) => ({
        consultant: `${t.profiles?.first_name} ${t.profiles?.last_name}`,
        consultantId: t.consultant_id,
        timeSlot: `${t.start_time} - ${t.end_time}`,
        maxBookings: t.max_bookings,
      })),
    });

    // 3. Test specific time slots with detailed analysis
    const testTimes = ["11:00", "11:15", "11:30"];
    const detailedResults = [];

    for (const testTime of testTimes) {
      console.log(`\n🧪 DETAILED ANALYSIS FOR ${testTime}:`);

      // Get raw database function result
      const { data: consultants, error } = await supabase.rpc(
        "get_available_consultants_with_buffer",
        {
          target_date: testDate,
          target_time: testTime,
          service_id_param: serviceId,
        }
      );

      // Also test the daily availability calculation directly
      const { data: dailyAvailability, error: dailyError } = await supabase.rpc(
        "calculate_daily_availability",
        {
          consultant_id_param: "70e38933-140f-4229-a957-fee6bb9cac78", // Use the consultant ID from logs
          target_date: testDate,
        }
      );

      console.log(`📊 Daily availability for consultant:`, {
        error: dailyError,
        availability:
          dailyAvailability?.map((a) => ({
            start: a.available_start,
            end: a.available_end,
            maxBookings: a.max_bookings,
          })) || [],
      });

      // Check buffer preferences for this consultant-service combination
      const { data: bufferInfo, error: bufferError } = await supabase.rpc(
        "get_effective_buffer_time",
        {
          consultant_id_param: "70e38933-140f-4229-a957-fee6bb9cac78",
          service_id_param: serviceId,
        }
      );

      console.log(`🔧 Buffer info for consultant-service:`, {
        error: bufferError,
        bufferInfo: bufferInfo?.[0] || null,
      });

      const result = {
        time: testTime,
        consultants:
          consultants?.map((c: any) => ({
            id: c.consultant_id,
            name: c.consultant_name,
            availableSlots: c.available_slots,
            currentBookings: c.current_bookings,
            totalDuration: c.total_duration_minutes,
            bufferBefore: c.buffer_before,
            bufferAfter: c.buffer_after,
            availableStart: c.available_start,
            availableEnd: c.available_end,
            maxBookings: c.max_bookings,
          })) || [],
        rawConsultantCount: consultants?.length || 0,
        dailyAvailabilityWindows: dailyAvailability?.length || 0,
        bufferInfo: bufferInfo?.[0] || null,
      };

      detailedResults.push(result);
      console.log(`📊 Result summary for ${testTime}:`, {
        availableConsultants: result.consultants.length,
        totalSlots: result.consultants.reduce(
          (sum, c) => sum + c.availableSlots,
          0
        ),
      });
    }

    // 4. Simulate the exact conflict detection logic
    console.log("\n🎯 MANUAL CONFLICT DETECTION SIMULATION:");

    if (existingBookings && existingBookings.length > 0) {
      const booking = existingBookings[0]; // Assume the 11:00 AM booking
      const bufferInfo = detailedResults[0]?.bufferInfo;

      if (bufferInfo) {
        console.log("📋 Simulating conflict detection for existing booking:", {
          bookingTime: booking.scheduled_time,
          serviceDuration: booking.services?.duration_minutes,
          bufferBefore: bufferInfo.buffer_before_minutes,
          bufferAfter: bufferInfo.buffer_after_minutes,
        });

        // Test conflict with 11:15 AM
        const testTime1115 = "11:15";
        const requiredStart1115 = testTime1115; // 11:15 - 0 min buffer
        const requiredEnd1115 = "11:35"; // 11:15 + 20 min total

        const bookingStart = booking.scheduled_time;
        const bookingEnd = `${parseInt(booking.scheduled_time.split(":")[0])}:${
          parseInt(booking.scheduled_time.split(":")[1]) +
          booking.services?.duration_minutes +
          bufferInfo.buffer_after_minutes
        }`;

        console.log("🔍 Conflict check for 11:15 AM:", {
          requestedRange: `${requiredStart1115} - ${requiredEnd1115}`,
          existingBookingRange: `${bookingStart} - ${bookingEnd}`,
          condition1: `${bookingStart} <= ${requiredEnd1115}`,
          condition2: `${bookingEnd} >= ${requiredStart1115}`,
          hasConflict: "Should be TRUE && TRUE = conflict detected",
        });
      }
    }

    return NextResponse.json({
      testDate,
      serviceId,
      existingBookings: existingBookings || [],
      templatesForDay,
      detailedResults,
      message:
        "Comprehensive debug analysis completed - check server logs for detailed breakdown",
    });
  } catch (error) {
    console.error("💥 Debug API Error:", error);
    return NextResponse.json(
      {
        error: "Debug test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
