import {
  createRouteHandlerClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import type {
  CreateSolutionRequest,
  UpdateSolutionRequest,
  AdminApiResponse,
  SolutionManagementStats,
} from "@/types/admin";
import type { Solution } from "@/types/solutions";

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

// GET - Fetch all solutions for admin management
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
    const includeInactive = searchParams.get("include_inactive") === "true";
    const statsOnly = searchParams.get("stats_only") === "true";

    console.log("🔍 Admin fetching solutions:", {
      userId: user.id,
      includeInactive,
      statsOnly,
    });

    const serviceSupabase = createServiceRoleClient();

    // If only stats requested
    if (statsOnly) {
      const { data: stats, error: statsError } = await serviceSupabase.rpc(
        "get_solution_management_stats"
      );

      if (statsError) {
        console.error("❌ Error fetching solution stats:", statsError);
        return NextResponse.json(
          { error: "Failed to fetch solution statistics" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: stats,
      } as AdminApiResponse<SolutionManagementStats>);
    }

    // Build base query
    let query = serviceSupabase
      .from("solutions")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    // Apply filters
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data: solutions, error: solutionsError } = await query;

    if (solutionsError) {
      console.error("❌ Error fetching solutions:", solutionsError);
      return NextResponse.json(
        { error: "Failed to fetch solutions" },
        { status: 500 }
      );
    }

    // Get solution IDs for fetching related data
    const solutionIds = (solutions || []).map((solution) => solution.id);

    let features = [];
    let sellingPoints = [];

    if (solutionIds.length > 0) {
      // Fetch features
      const { data: featuresData, error: featuresError } = await serviceSupabase
        .from("solution_features")
        .select("*")
        .in("solution_id", solutionIds)
        .order("category_display_order", { ascending: true })
        .order("feature_display_order", { ascending: true });

      if (featuresError) {
        console.error("❌ Error fetching features:", featuresError);
      } else {
        features = featuresData || [];
      }

      // Fetch selling points
      const { data: sellingPointsData, error: sellingPointsError } =
        await serviceSupabase
          .from("solution_selling_points")
          .select("*")
          .in("solution_id", solutionIds)
          .order("display_order", { ascending: true });

      if (sellingPointsError) {
        console.error("❌ Error fetching selling points:", sellingPointsError);
      } else {
        sellingPoints = sellingPointsData || [];
      }
    }

    // Structure the data
    const structuredSolutions = (solutions || []).map((solution) => {
      const solutionFeatures = features.filter(
        (feature) => feature.solution_id === solution.id
      );
      const solutionSellingPoints = sellingPoints.filter(
        (point) => point.solution_id === solution.id
      );

      // Group features by category
      const featureGroups = [];
      const categoryMap = new Map();

      solutionFeatures.forEach((feature) => {
        if (!categoryMap.has(feature.category)) {
          categoryMap.set(feature.category, {
            category: feature.category,
            category_display_order: feature.category_display_order,
            items: [],
          });
        }
        categoryMap.get(feature.category).items.push(feature.feature);
      });

      featureGroups.push(...Array.from(categoryMap.values()));
      featureGroups.sort(
        (a, b) => a.category_display_order - b.category_display_order
      );

      return {
        ...solution,
        features: featureGroups,
        selling_points: solutionSellingPoints,
        raw_features: solutionFeatures, // For admin editing
        raw_selling_points: solutionSellingPoints, // For admin editing
      };
    });

    console.log("✅ Admin solutions fetched successfully:", {
      totalSolutions: structuredSolutions.length,
      includeInactive,
    });

    return NextResponse.json({
      success: true,
      data: {
        solutions: structuredSolutions,
        total: structuredSolutions.length,
      },
    } as AdminApiResponse);
  } catch (error) {
    console.error("💥 Admin solutions API error:", error);
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

// POST - Create new solution
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
    const solutionData: CreateSolutionRequest = body;

    console.log("🔄 Admin creating solution:", {
      userId: user.id,
      solutionName: solutionData.name,
      solutionType: solutionData.solution_type,
    });

    // Validate required fields
    if (
      !solutionData.name ||
      !solutionData.slug ||
      !solutionData.solution_type
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: name, slug, and solution_type are required",
        } as AdminApiResponse,
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Check for duplicate slug
    const { data: existingSolution } = await serviceSupabase
      .from("solutions")
      .select("id")
      .eq("slug", solutionData.slug)
      .single();

    if (existingSolution) {
      return NextResponse.json(
        {
          success: false,
          error: "A solution with this slug already exists",
        } as AdminApiResponse,
        { status: 409 }
      );
    }

    // Create solution
    const { data: newSolution, error: createError } = await serviceSupabase
      .from("solutions")
      .insert({
        name: solutionData.name,
        slug: solutionData.slug,
        solution_type: solutionData.solution_type,
        tagline: solutionData.tagline || null,
        logo_url: solutionData.logo_url || null,
        display_order: solutionData.display_order || 0,
        price: solutionData.price || 0,
        currency: solutionData.currency || "USD",
        price_period: solutionData.price_period || null,
        price_description: solutionData.price_description || null,
        call_to_action_url: solutionData.call_to_action_url || null,
        call_to_action_text: solutionData.call_to_action_text || null,
        special_pricing_note: solutionData.special_pricing_note || null,
        is_active: solutionData.is_active ?? true,
      })
      .select()
      .single();

    if (createError) {
      console.error("❌ Error creating solution:", createError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create solution",
          details: createError.message,
        } as AdminApiResponse,
        { status: 500 }
      );
    }

    console.log("✅ Solution created successfully:", {
      id: newSolution.id,
      name: newSolution.name,
      slug: newSolution.slug,
    });

    return NextResponse.json(
      {
        success: true,
        data: newSolution,
      } as AdminApiResponse<Solution>,
      { status: 201 }
    );
  } catch (error) {
    console.error("💥 Admin create solution error:", error);
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

// PUT - Update existing solution
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
    const solutionData: UpdateSolutionRequest = body;

    if (!solutionData.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Solution ID is required for updates",
        } as AdminApiResponse,
        { status: 400 }
      );
    }

    console.log("🔄 Admin updating solution:", {
      userId: user.id,
      solutionId: solutionData.id,
      solutionName: solutionData.name,
    });

    const serviceSupabase = createServiceRoleClient();

    // Check if solution exists
    const { data: existingSolution, error: fetchError } = await serviceSupabase
      .from("solutions")
      .select("*")
      .eq("id", solutionData.id)
      .single();

    if (fetchError || !existingSolution) {
      return NextResponse.json(
        {
          success: false,
          error: "Solution not found",
        } as AdminApiResponse,
        { status: 404 }
      );
    }

    // Check for duplicate slug (if slug is being updated)
    if (solutionData.slug && solutionData.slug !== existingSolution.slug) {
      const { data: duplicateSlug } = await serviceSupabase
        .from("solutions")
        .select("id")
        .eq("slug", solutionData.slug)
        .neq("id", solutionData.id)
        .single();

      if (duplicateSlug) {
        return NextResponse.json(
          {
            success: false,
            error: "A solution with this slug already exists",
          } as AdminApiResponse,
          { status: 409 }
        );
      }
    }

    // Prepare update data (only include defined fields)
    const updateData: Partial<CreateSolutionRequest> & { updated_at?: string } =
      {};

    if (solutionData.name !== undefined) updateData.name = solutionData.name;
    if (solutionData.slug !== undefined) updateData.slug = solutionData.slug;
    if (solutionData.solution_type !== undefined)
      updateData.solution_type = solutionData.solution_type;
    if (solutionData.tagline !== undefined)
      updateData.tagline = solutionData.tagline;
    if (solutionData.logo_url !== undefined)
      updateData.logo_url = solutionData.logo_url;
    if (solutionData.display_order !== undefined)
      updateData.display_order = solutionData.display_order;
    if (solutionData.price !== undefined) updateData.price = solutionData.price;
    if (solutionData.currency !== undefined)
      updateData.currency = solutionData.currency;
    if (solutionData.price_period !== undefined)
      updateData.price_period = solutionData.price_period;
    if (solutionData.price_description !== undefined)
      updateData.price_description = solutionData.price_description;
    if (solutionData.call_to_action_url !== undefined)
      updateData.call_to_action_url = solutionData.call_to_action_url;
    if (solutionData.call_to_action_text !== undefined)
      updateData.call_to_action_text = solutionData.call_to_action_text;
    if (solutionData.special_pricing_note !== undefined)
      updateData.special_pricing_note = solutionData.special_pricing_note;
    if (solutionData.is_active !== undefined)
      updateData.is_active = solutionData.is_active;

    // Add timestamp
    updateData.updated_at = new Date().toISOString();

    // Update solution
    const { data: updatedSolution, error: updateError } = await serviceSupabase
      .from("solutions")
      .update(updateData)
      .eq("id", solutionData.id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Error updating solution:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update solution",
          details: updateError.message,
        } as AdminApiResponse,
        { status: 500 }
      );
    }

    console.log("✅ Solution updated successfully:", {
      id: updatedSolution.id,
      name: updatedSolution.name,
    });

    return NextResponse.json({
      success: true,
      data: updatedSolution,
    } as AdminApiResponse<Solution>);
  } catch (error) {
    console.error("💥 Admin update solution error:", error);
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

// DELETE - Delete solution
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
    const solutionId = searchParams.get("id");

    if (!solutionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Solution ID is required",
        } as AdminApiResponse,
        { status: 400 }
      );
    }

    console.log("🗑️ Admin deleting solution:", {
      userId: user.id,
      solutionId,
    });

    const serviceSupabase = createServiceRoleClient();

    // Check if solution exists
    const { data: existingSolution, error: fetchError } = await serviceSupabase
      .from("solutions")
      .select("name")
      .eq("id", solutionId)
      .single();

    if (fetchError || !existingSolution) {
      return NextResponse.json(
        {
          success: false,
          error: "Solution not found",
        } as AdminApiResponse,
        { status: 404 }
      );
    }

    // Delete solution (this will cascade to features and selling points)
    const { error: deleteError } = await serviceSupabase
      .from("solutions")
      .delete()
      .eq("id", solutionId);

    if (deleteError) {
      console.error("❌ Error deleting solution:", deleteError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete solution",
          details: deleteError.message,
        } as AdminApiResponse,
        { status: 500 }
      );
    }

    console.log("✅ Solution deleted successfully:", {
      id: solutionId,
      name: existingSolution.name,
    });

    return NextResponse.json({
      success: true,
      data: { id: solutionId, name: existingSolution.name },
    } as AdminApiResponse);
  } catch (error) {
    console.error("💥 Admin delete solution error:", error);
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
