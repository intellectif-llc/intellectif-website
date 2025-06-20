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

    // Get source day templates
    const { data: sourceTemplates, error: sourceError } = await supabase
      .from("availability_templates")
      .select("*")
      .eq("consultant_id", user.id)
      .eq("day_of_week", source_day)
      .eq("is_active", true);

    if (sourceError) {
      console.error("Error fetching source templates:", sourceError);
      return NextResponse.json(
        { error: "Failed to fetch source templates" },
        { status: 500 }
      );
    }

    if (!sourceTemplates || sourceTemplates.length === 0) {
      return NextResponse.json(
        { error: "No availability found for source day" },
        { status: 400 }
      );
    }

    let copiedCount = 0;

    // Copy to each target day
    for (const targetDay of target_days) {
      // First, delete existing templates for target day
      await supabase
        .from("availability_templates")
        .delete()
        .eq("consultant_id", user.id)
        .eq("day_of_week", targetDay);

      // Copy each template from source day
      for (const template of sourceTemplates) {
        const { error: insertError } = await supabase
          .from("availability_templates")
          .insert({
            consultant_id: user.id,
            day_of_week: targetDay,
            start_time: template.start_time,
            end_time: template.end_time,
            max_bookings: template.max_bookings,
            timezone: template.timezone,
            template_name: template.template_name,
            notes: template.notes,
            is_active: true,
          });

        if (insertError) {
          console.error("Error copying template:", insertError);
          // Continue with other templates instead of failing completely
        } else {
          copiedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      copied_templates: copiedCount,
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
