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
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select(
        `
        id,
        scheduled_time,
        consultant_id,
        service:services!inner(duration_minutes, buffer_before_minutes, buffer_after_minutes)
      `
      )
      .eq("scheduled_date", testDate)
      .eq("consultant_id", "123e4567-e89b-12d3-a456-426614174000");

    console.log("📅 Existing bookings for date:", {
      count: existingBookings?.length || 0,
      bookings:
        existingBookings?.map((b: Record<string, unknown>) => ({
          time: b.scheduled_time,
          consultant: b.consultant_id,
          id: b.id,
        })) || [],
    });

    // 2. Check availability templates
    const { data: templates } = await supabase
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
      templates: templatesForDay.map((t: Record<string, unknown>) => {
        const profiles = t.profiles as
          | { first_name?: string; last_name?: string }
          | undefined;
        return {
          consultant: `${profiles?.first_name || "Unknown"} ${profiles?.last_name || "Consultant"}`,
          consultantId: t.consultant_id,
          timeSlot: `${t.start_time} - ${t.end_time}`,
          maxBookings: t.max_bookings,
        };
      }),
    });

    // 3. Test specific time slots with detailed analysis
    const testTimes = ["11:00", "11:15", "11:30"];
    const detailedResults = [];

    for (const testTime of testTimes) {
      console.log(`\n🧪 DETAILED ANALYSIS FOR ${testTime}:`);

      // Get raw database function result
      const { data: consultants } = await supabase.rpc(
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
          dailyAvailability?.map(
            (a: {
              available_start: string;
              available_end: string;
              max_bookings: number;
            }) => ({
              start: a.available_start,
              end: a.available_end,
              maxBookings: a.max_bookings,
            })
          ) || [],
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
          consultants?.map((c: Record<string, unknown>) => ({
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
          (sum: number, c: { availableSlots: unknown }) =>
            sum + (typeof c.availableSlots === "number" ? c.availableSlots : 0),
          0
        ),
      });
    }

    // 4. Simulate the exact conflict detection logic
    console.log("\n🎯 MANUAL CONFLICT DETECTION SIMULATION:");

    if (existingBookings && existingBookings.length > 0) {
      const booking = existingBookings[0] as {
        scheduled_time: string;
        service: Array<{
          duration_minutes: number;
          buffer_before_minutes: number;
          buffer_after_minutes: number;
        }>;
        [key: string]: unknown;
      };
      const bufferInfo = detailedResults[0]?.bufferInfo;

      if (bufferInfo && booking.service && booking.service.length > 0) {
        const serviceInfo = booking.service[0];
        console.log("📋 Simulating conflict detection for existing booking:", {
          bookingTime: booking.scheduled_time,
          serviceDuration: serviceInfo.duration_minutes,
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
          serviceInfo.duration_minutes +
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
