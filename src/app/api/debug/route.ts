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
      return NextResponse.json(
        {
          error: "Not authenticated",
          userError: userError?.message,
        },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Get all profiles to see what exists
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, is_staff")
      .limit(10);

    // Test the isStaff function
    let isStaffResult = null;
    try {
      const { data: staffCheck } = await supabase.rpc("is_staff_user", {
        user_id: user.id,
      });
      isStaffResult = staffCheck;
    } catch (staffError) {
      isStaffResult = `Error: ${staffError}`;
    }

    return NextResponse.json({
      debug: {
        timestamp: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          created_at: user.created_at,
          user_metadata: user.user_metadata,
        },
        profile: {
          found: !!profile,
          data: profile,
          error: profileError?.message,
        },
        staff_check: {
          is_staff_from_profile: profile?.is_staff || false,
          is_staff_from_function: isStaffResult,
        },
        all_profiles: {
          count: allProfiles?.length || 0,
          data: allProfiles,
          error: allProfilesError?.message,
        },
      },
    });
  } catch (error) {
    console.error("Debug API Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
