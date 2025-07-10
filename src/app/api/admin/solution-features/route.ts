import {
  createRouteHandlerClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import type {
  CreateSolutionFeatureRequest,
  UpdateSolutionFeatureRequest,
  AdminApiResponse,
} from "@/types/admin";
import type { SolutionFeature } from "@/types/solutions";

// Helper function to check admin status
async function isAdmin(userId: string): Promise<boolean> {
  try {
    const serviceSupabase = createServiceRoleClient();
    const { data } = await serviceSupabase
      .from("profiles")
      .select("role, is_staff")
      .eq("id", userId)
      .single();

    return data?.role === "admin" && data?.is_staff === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// GET - Fetch solution features
export async function GET(request: NextRequest) {
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

    // Check admin status
    if (!(await isAdmin(user.id))) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const solutionId = searchParams.get("solution_id");

    console.log("🔍 Admin fetching solution features:", {
      userId: user.id,
      solutionId,
    });

    const serviceSupabase = createServiceRoleClient();

    // Build query
    let query = serviceSupabase
      .from("solution_features")
      .select("*")
      .order("category_display_order", { ascending: true })
      .order("feature_display_order", { ascending: true });

    // Filter by solution if specified
    if (solutionId) {
      query = query.eq("solution_id", solutionId);
    }

    const { data: features, error: featuresError } = await query;

    if (featuresError) {
      console.error("❌ Error fetching solution features:", featuresError);
      return NextResponse.json(
        { error: "Failed to fetch solution features" },
        { status: 500 }
      );
    }

    console.log("✅ Solution features fetched successfully:", {
      totalFeatures: features?.length || 0,
      solutionId,
    });

    return NextResponse.json({
      success: true,
      data: features || [],
    } as AdminApiResponse<SolutionFeature[]>);
  } catch (error) {
    console.error("💥 Admin solution features API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      } as AdminApiResponse,
      { status: 500 }
    );
  }
}

// POST - Create new solution feature
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

    // Check admin status
    if (!(await isAdmin(user.id))) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const featureData: CreateSolutionFeatureRequest = body;

    console.log("🔄 Admin creating solution feature:", {
      userId: user.id,
      solutionId: featureData.solution_id,
      category: featureData.category,
      feature: featureData.feature,
    });

    // Validate required fields
    if (
      !featureData.solution_id ||
      !featureData.category ||
      !featureData.feature
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: solution_id, category, and feature are required",
        } as AdminApiResponse,
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify solution exists
    const { data: solution, error: solutionError } = await serviceSupabase
      .from("solutions")
      .select("id, name")
      .eq("id", featureData.solution_id)
      .single();

    if (solutionError || !solution) {
      return NextResponse.json(
        {
          success: false,
          error: "Solution not found",
        } as AdminApiResponse,
        { status: 404 }
      );
    }

    // Create feature
    const { data: newFeature, error: createError } = await serviceSupabase
      .from("solution_features")
      .insert({
        solution_id: featureData.solution_id,
        category: featureData.category,
        feature: featureData.feature,
        category_display_order: featureData.category_display_order || 0,
        feature_display_order: featureData.feature_display_order || 0,
      })
      .select()
      .single();

    if (createError) {
      console.error("❌ Error creating solution feature:", createError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create solution feature",
          details: createError.message,
        } as AdminApiResponse,
        { status: 500 }
      );
    }

    console.log("✅ Solution feature created successfully:", {
      id: newFeature.id,
      category: newFeature.category,
      feature: newFeature.feature,
    });

    return NextResponse.json(
      {
        success: true,
        data: newFeature,
      } as AdminApiResponse<SolutionFeature>,
      { status: 201 }
    );
  } catch (error) {
    console.error("💥 Admin create solution feature error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      } as AdminApiResponse,
      { status: 500 }
    );
  }
}

// PUT - Update existing solution feature
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

    // Check admin status
    if (!(await isAdmin(user.id))) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const featureData: UpdateSolutionFeatureRequest = body;

    if (!featureData.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Feature ID is required for updates",
        } as AdminApiResponse,
        { status: 400 }
      );
    }

    console.log("🔄 Admin updating solution feature:", {
      userId: user.id,
      featureId: featureData.id,
      category: featureData.category,
      feature: featureData.feature,
    });

    const serviceSupabase = createServiceRoleClient();

    // Check if feature exists
    const { data: existingFeature, error: fetchError } = await serviceSupabase
      .from("solution_features")
      .select("*")
      .eq("id", featureData.id)
      .single();

    if (fetchError || !existingFeature) {
      return NextResponse.json(
        {
          success: false,
          error: "Solution feature not found",
        } as AdminApiResponse,
        { status: 404 }
      );
    }

    // Prepare update data (only include defined fields)
    const updateData: Partial<CreateSolutionFeatureRequest> = {};

    if (featureData.solution_id !== undefined)
      updateData.solution_id = featureData.solution_id;
    if (featureData.category !== undefined)
      updateData.category = featureData.category;
    if (featureData.feature !== undefined)
      updateData.feature = featureData.feature;
    if (featureData.category_display_order !== undefined)
      updateData.category_display_order = featureData.category_display_order;
    if (featureData.feature_display_order !== undefined)
      updateData.feature_display_order = featureData.feature_display_order;

    // Update feature
    const { data: updatedFeature, error: updateError } = await serviceSupabase
      .from("solution_features")
      .update(updateData)
      .eq("id", featureData.id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Error updating solution feature:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update solution feature",
          details: updateError.message,
        } as AdminApiResponse,
        { status: 500 }
      );
    }

    console.log("✅ Solution feature updated successfully:", {
      id: updatedFeature.id,
      category: updatedFeature.category,
      feature: updatedFeature.feature,
    });

    return NextResponse.json({
      success: true,
      data: updatedFeature,
    } as AdminApiResponse<SolutionFeature>);
  } catch (error) {
    console.error("💥 Admin update solution feature error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      } as AdminApiResponse,
      { status: 500 }
    );
  }
}

// DELETE - Delete solution feature
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

    // Check admin status
    if (!(await isAdmin(user.id))) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const featureId = searchParams.get("id");

    if (!featureId) {
      return NextResponse.json(
        {
          success: false,
          error: "Feature ID is required",
        } as AdminApiResponse,
        { status: 400 }
      );
    }

    console.log("🗑️ Admin deleting solution feature:", {
      userId: user.id,
      featureId,
    });

    const serviceSupabase = createServiceRoleClient();

    // Check if feature exists
    const { data: existingFeature, error: fetchError } = await serviceSupabase
      .from("solution_features")
      .select("category, feature")
      .eq("id", featureId)
      .single();

    if (fetchError || !existingFeature) {
      return NextResponse.json(
        {
          success: false,
          error: "Solution feature not found",
        } as AdminApiResponse,
        { status: 404 }
      );
    }

    // Delete feature
    const { error: deleteError } = await serviceSupabase
      .from("solution_features")
      .delete()
      .eq("id", featureId);

    if (deleteError) {
      console.error("❌ Error deleting solution feature:", deleteError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete solution feature",
          details: deleteError.message,
        } as AdminApiResponse,
        { status: 500 }
      );
    }

    console.log("✅ Solution feature deleted successfully:", {
      id: featureId,
      category: existingFeature.category,
      feature: existingFeature.feature,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: featureId,
        category: existingFeature.category,
        feature: existingFeature.feature,
      },
    } as AdminApiResponse);
  } catch (error) {
    console.error("💥 Admin delete solution feature error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      } as AdminApiResponse,
      { status: 500 }
    );
  }
}
