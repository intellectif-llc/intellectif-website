import { createRouteHandlerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const { searchParams } = new URL(request.url);
    const consultantId = searchParams.get("consultant_id");

    if (!consultantId) {
      return NextResponse.json(
        { error: "Consultant ID is required" },
        { status: 400 }
      );
    }

    // Get current user to verify authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is accessing their own preferences or is staff
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_staff")
      .eq("id", user.id)
      .single();

    if (user.id !== consultantId && !profile?.is_staff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch buffer preferences
    const { data: preferences, error } = await supabase
      .from("consultant_buffer_preferences")
      .select(
        `
        id,
        service_id,
        buffer_before_minutes,
        buffer_after_minutes,
        notes,
        is_active,
        services(name, duration_minutes)
      `
      )
      .eq("consultant_id", consultantId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching buffer preferences:", error);
      return NextResponse.json(
        { error: "Failed to fetch preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json({ preferences: preferences || [] });
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
    const body = await request.json();
    const { consultant_id, preferences } = body;

    console.log("🔧 Buffer Preferences API - Received data:", {
      consultant_id,
      preferences,
      preferencesCount: preferences?.length,
    });

    if (!consultant_id || !preferences || !Array.isArray(preferences)) {
      console.error("❌ Missing required data:", {
        consultant_id,
        preferences,
      });
      return NextResponse.json(
        { error: "Consultant ID and preferences array are required" },
        { status: 400 }
      );
    }

    // Get current user to verify authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("❌ Auth error:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Check if user is updating their own preferences or is staff
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_staff")
      .eq("id", user.id)
      .single();

    if (user.id !== consultant_id && !profile?.is_staff) {
      console.error("❌ Authorization failed:", {
        userId: user.id,
        consultantId: consultant_id,
        isStaff: profile?.is_staff,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("✅ Authorization passed");

    // Validate preferences
    for (const pref of preferences) {
      if (
        !pref.service_id ||
        typeof pref.buffer_before_minutes !== "number" ||
        typeof pref.buffer_after_minutes !== "number" ||
        pref.buffer_before_minutes < 0 ||
        pref.buffer_after_minutes < 0 ||
        pref.buffer_before_minutes > 60 ||
        pref.buffer_after_minutes > 60
      ) {
        console.error("❌ Invalid preference data:", pref);
        return NextResponse.json(
          { error: "Invalid preference data" },
          { status: 400 }
        );
      }
    }

    console.log("✅ Preferences validation passed");

    // Start transaction by deactivating all existing preferences
    console.log("🔄 Deactivating existing preferences...");
    const { error: deactivateError } = await supabase
      .from("consultant_buffer_preferences")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("consultant_id", consultant_id);

    if (deactivateError) {
      console.error(
        "❌ Error deactivating existing preferences:",
        deactivateError
      );
      return NextResponse.json(
        { error: "Failed to update preferences" },
        { status: 500 }
      );
    }

    console.log("✅ Existing preferences deactivated");

    // Insert new preferences
    const newPreferences = preferences.map((pref) => ({
      consultant_id,
      service_id: pref.service_id,
      buffer_before_minutes: pref.buffer_before_minutes,
      buffer_after_minutes: pref.buffer_after_minutes,
      notes: pref.notes || null,
      is_active: true,
    }));

    console.log("🔄 Inserting new preferences:", newPreferences);

    const { data: insertedPreferences, error: insertError } = await supabase
      .from("consultant_buffer_preferences")
      .insert(newPreferences)
      .select();

    if (insertError) {
      console.error("❌ Error inserting new preferences:", insertError);
      return NextResponse.json(
        { error: "Failed to save preferences", details: insertError.message },
        { status: 500 }
      );
    }

    console.log("✅ Preferences inserted successfully:", insertedPreferences);

    return NextResponse.json({
      success: true,
      preferences: insertedPreferences,
      message: `Successfully saved ${
        insertedPreferences?.length || 0
      } buffer preferences`,
    });
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
