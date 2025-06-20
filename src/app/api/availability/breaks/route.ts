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

    // Get availability breaks for the consultant
    const { data: breaks, error } = await supabase
      .from("availability_breaks")
      .select("*")
      .eq("consultant_id", user.id)
      .eq("is_active", true)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching breaks:", error);
      return NextResponse.json(
        { error: "Failed to fetch breaks" },
        { status: 500 }
      );
    }

    return NextResponse.json({ breaks });
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
      day_of_week,
      start_time,
      end_time,
      break_type = "break",
      title = "Break",
      is_recurring = true,
    } = body;

    // Validate required fields
    if (day_of_week === undefined || !start_time || !end_time) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Insert new availability break
    const { data: breakRecord, error } = await supabase
      .from("availability_breaks")
      .insert({
        consultant_id: user.id,
        day_of_week,
        start_time,
        end_time,
        break_type,
        title,
        is_recurring,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating break:", error);
      return NextResponse.json(
        { error: "Failed to create break" },
        { status: 500 }
      );
    }

    return NextResponse.json({ break: breakRecord }, { status: 201 });
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
      day_of_week,
      start_time,
      end_time,
      break_type,
      title,
      is_recurring,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Break ID required" }, { status: 400 });
    }

    // Update availability break
    const { data: breakRecord, error } = await supabase
      .from("availability_breaks")
      .update({
        day_of_week,
        start_time,
        end_time,
        break_type,
        title,
        is_recurring,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("consultant_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating break:", error);
      return NextResponse.json(
        { error: "Failed to update break" },
        { status: 500 }
      );
    }

    return NextResponse.json({ break: breakRecord });
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
      return NextResponse.json({ error: "Break ID required" }, { status: 400 });
    }

    // Delete availability break
    const { error } = await supabase
      .from("availability_breaks")
      .delete()
      .eq("id", id)
      .eq("consultant_id", user.id);

    if (error) {
      console.error("Error deleting break:", error);
      return NextResponse.json(
        { error: "Failed to delete break" },
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
