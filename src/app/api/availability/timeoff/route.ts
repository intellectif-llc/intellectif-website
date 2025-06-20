import { createRouteHandlerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
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

    // Get time off periods
    const { data: timeoff, error } = await supabase
      .from("availability_timeoff")
      .select("*")
      .eq("consultant_id", user.id)
      .order("start_date", { ascending: true });

    if (error) {
      console.error("Error fetching timeoff:", error);
      return NextResponse.json(
        { error: "Failed to fetch time off" },
        { status: 500 }
      );
    }

    return NextResponse.json({ timeoff: timeoff || [] });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const {
      start_date,
      end_date,
      start_time,
      end_time,
      timeoff_type,
      title,
      description,
    } = body;

    // Validate required fields
    if (!start_date || !end_date || !timeoff_type || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Insert new time off period
    const { data, error } = await supabase
      .from("availability_timeoff")
      .insert({
        consultant_id: user.id,
        start_date,
        end_date,
        start_time: start_time || null,
        end_time: end_time || null,
        timeoff_type,
        title,
        description: description || null,
        is_approved: true, // Auto-approve for now
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating timeoff:", error);
      return NextResponse.json(
        { error: "Failed to create time off" },
        { status: 500 }
      );
    }

    return NextResponse.json({ timeoff: data });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const {
      id,
      start_date,
      end_date,
      start_time,
      end_time,
      timeoff_type,
      title,
      description,
    } = body;

    // Validate required fields
    if (!id || !start_date || !end_date || !timeoff_type || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Update time off period
    const { data, error } = await supabase
      .from("availability_timeoff")
      .update({
        start_date,
        end_date,
        start_time: start_time || null,
        end_time: end_time || null,
        timeoff_type,
        title,
        description: description || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("consultant_id", user.id) // Ensure user can only update their own time off
      .select()
      .single();

    if (error) {
      console.error("Error updating timeoff:", error);
      return NextResponse.json(
        { error: "Failed to update time off" },
        { status: 500 }
      );
    }

    return NextResponse.json({ timeoff: data });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing time off ID" },
        { status: 400 }
      );
    }

    // Delete time off period
    const { error } = await supabase
      .from("availability_timeoff")
      .delete()
      .eq("id", id)
      .eq("consultant_id", user.id); // Ensure user can only delete their own time off

    if (error) {
      console.error("Error deleting timeoff:", error);
      return NextResponse.json(
        { error: "Failed to delete time off" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
