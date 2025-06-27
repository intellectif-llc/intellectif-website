import {
  createRouteHandlerClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    const authSupabase = await createRouteHandlerClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await authSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service role client to bypass RLS for profile lookup
    const serviceSupabase = createServiceRoleClient();
    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      // Return basic user info if profile doesn't exist yet
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
        },
        profile: null,
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
      },
      profile,
    });
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
    // 1. Create a standard client to authenticate the user
    const routeHandlerClient = await createRouteHandlerClient();
    const {
      data: { user },
      error: userError,
    } = await routeHandlerClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Create the service role client for the privileged operation
    const supabase = createServiceRoleClient();

    const body = await request.json();
    const {
      first_name,
      last_name,
      phone,
      company,
      timezone,
      preferred_contact_method,
      marketing_consent,
    } = body;

    // --- DIAGNOSTIC LOG 1: Log parameters being sent ---
    console.log("🚀 Calling update_user_profile with params:", {
      user_id: user.id,
      first_name_param: first_name,
      last_name_param: last_name,
      phone_param: phone,
      company_param: company,
      timezone_param: timezone,
      preferred_contact_method_param: preferred_contact_method,
      marketing_consent_param: marketing_consent,
    });

    // Use the database function to update profile
    const { data, error } = await supabase.rpc("update_user_profile", {
      user_id: user.id,
      first_name_param: first_name,
      last_name_param: last_name,
      phone_param: phone,
      company_param: company,
      timezone_param: timezone,
      preferred_contact_method_param: preferred_contact_method,
      marketing_consent_param: marketing_consent,
    });

    // --- DIAGNOSTIC LOG 2: Log the full response from the RPC ---
    console.log("📦 Response from update_user_profile RPC:", { data, error });

    // Handle RPC-level errors (e.g., database constraints)
    if (error) {
      console.error("RPC Error updating profile:", error);
      // Check for unique constraint violation on the phone number
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This phone number is already in use by another account." },
          { status: 409 } // 409 Conflict
        );
      }
      return NextResponse.json(
        { error: "Failed to update profile due to a server issue." },
        { status: 500 }
      );
    }

    // Handle function-level errors (e.g., custom logic failure)
    if (data && !data.success) {
      console.error("Function Error updating profile:", data.error);

      // Check for the unique phone number constraint violation
      if (data.error_code === "23505") {
        return NextResponse.json(
          { error: "This phone number is already in use by another account." },
          { status: 409 } // 409 Conflict
        );
      }

      return NextResponse.json(
        {
          error:
            data.error || "An unexpected error occurred during the update.",
        },
        { status: 400 } // 400 Bad Request
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
