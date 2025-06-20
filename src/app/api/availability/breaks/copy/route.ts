import { createRouteHandlerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { source_day, target_days } = body;

    // Validate input
    if (source_day === undefined || !Array.isArray(target_days)) {
      return NextResponse.json(
        { error: "Invalid input: source_day and target_days array required" },
        { status: 400 }
      );
    }

    // Get source day breaks
    const { data: sourceBreaks, error: sourceError } = await supabase
      .from("availability_breaks")
      .select("*")
      .eq("consultant_id", user.id)
      .eq("day_of_week", source_day)
      .eq("is_active", true);

    if (sourceError) {
      console.error("Error fetching source breaks:", sourceError);
      return NextResponse.json(
        { error: "Failed to fetch source breaks" },
        { status: 500 }
      );
    }

    if (!sourceBreaks || sourceBreaks.length === 0) {
      return NextResponse.json(
        { error: "No breaks found for source day" },
        { status: 400 }
      );
    }

    let copiedCount = 0;

    // Copy to each target day
    for (const targetDay of target_days) {
      // First, delete existing breaks for target day
      await supabase
        .from("availability_breaks")
        .delete()
        .eq("consultant_id", user.id)
        .eq("day_of_week", targetDay);

      // Copy each break from source day
      for (const breakRecord of sourceBreaks) {
        const { error: insertError } = await supabase
          .from("availability_breaks")
          .insert({
            consultant_id: user.id,
            day_of_week: targetDay,
            start_time: breakRecord.start_time,
            end_time: breakRecord.end_time,
            break_type: breakRecord.break_type,
            title: breakRecord.title,
            is_recurring: breakRecord.is_recurring,
            is_active: true,
          });

        if (insertError) {
          console.error("Error copying break:", insertError);
          // Continue with other breaks instead of failing completely
        } else {
          copiedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      copied_breaks: copiedCount,
      target_days: target_days.length,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
