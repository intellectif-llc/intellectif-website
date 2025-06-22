import { createServiceRoleClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const consultantId = searchParams.get("consultant_id");

    if (!consultantId) {
      return NextResponse.json(
        { error: "consultant_id required" },
        { status: 400 }
      );
    }

    // Get all time-off records for this consultant
    const { data: timeoffData, error: timeoffError } = await supabase
      .from("availability_timeoff")
      .select("*")
      .eq("consultant_id", consultantId)
      .order("start_date", { ascending: true });

    // Get consultant info
    const { data: consultantData, error: consultantError } = await supabase
      .from("profiles")
      .select("first_name, last_name, is_staff")
      .eq("id", consultantId)
      .single();

    // Test the availability function for specific dates around the time-off period
    const testDates = [
      "2025-06-22",
      "2025-06-23",
      "2025-06-24",
      "2025-06-25",
      "2025-06-26",
      "2025-06-27",
    ];

    const availabilityTests = [];
    for (const date of testDates) {
      const { data: availability, error: availError } = await supabase.rpc(
        "calculate_daily_availability",
        {
          consultant_id_param: consultantId,
          target_date: date,
        }
      );

      availabilityTests.push({
        date,
        availability,
        error: availError,
        hasAvailability: availability && availability.length > 0,
      });
    }

    return NextResponse.json({
      consultant: {
        data: consultantData,
        error: consultantError,
      },
      timeoff_records: {
        data: timeoffData,
        error: timeoffError,
        count: timeoffData?.length || 0,
      },
      availability_function_tests: availabilityTests,
      debug_info: {
        consultant_id: consultantId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Time-off Debug API Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
