import {
  createRouteHandlerClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import type {
  CreateSolutionSellingPointRequest,
  UpdateSolutionSellingPointRequest,
  AdminApiResponse,
} from "@/types/admin";
import type { SolutionSellingPoint } from "@/types/solutions";

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

// GET - Fetch solution selling points
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

    console.log("🔍 Admin fetching solution selling points:", {
      userId: user.id,
      solutionId,
    });

    const serviceSupabase = createServiceRoleClient();

    // Build query
    let query = serviceSupabase
      .from("solution_selling_points")
      .select("*")
      .order("display_order", { ascending: true });

    // Filter by solution if specified
    if (solutionId) {
      query = query.eq("solution_id", solutionId);
    }

    const { data: sellingPoints, error: sellingPointsError } = await query;

    if (sellingPointsError) {
      console.error(
        "❌ Error fetching solution selling points:",
        sellingPointsError
      );
      return NextResponse.json(
        { error: "Failed to fetch solution selling points" },
        { status: 500 }
      );
    }

    console.log("✅ Solution selling points fetched successfully:", {
      totalSellingPoints: sellingPoints?.length || 0,
      solutionId,
    });

    return NextResponse.json({
      success: true,
      data: sellingPoints || [],
    } as AdminApiResponse<SolutionSellingPoint[]>);
  } catch (error) {
    console.error("💥 Admin solution selling points API error:", error);
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

// POST - Create new solution selling point
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
    const sellingPointData: CreateSolutionSellingPointRequest = body;

    console.log("🔄 Admin creating solution selling point:", {
      userId: user.id,
      solutionId: sellingPointData.solution_id,
      title: sellingPointData.title,
      emoji: sellingPointData.emoji,
    });

    // Validate required fields
    if (!sellingPointData.solution_id || !sellingPointData.title) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: solution_id and title are required",
        } as AdminApiResponse,
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify solution exists
    const { data: solution, error: solutionError } = await serviceSupabase
      .from("solutions")
      .select("id, name")
      .eq("id", sellingPointData.solution_id)
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

    // Create selling point
    const { data: newSellingPoint, error: createError } = await serviceSupabase
      .from("solution_selling_points")
      .insert({
        solution_id: sellingPointData.solution_id,
        emoji: sellingPointData.emoji || null,
        title: sellingPointData.title,
        description: sellingPointData.description || null,
        display_order: sellingPointData.display_order || 0,
      })
      .select()
      .single();

    if (createError) {
      console.error("❌ Error creating solution selling point:", createError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create solution selling point",
          details: createError.message,
        } as AdminApiResponse,
        { status: 500 }
      );
    }

    console.log("✅ Solution selling point created successfully:", {
      id: newSellingPoint.id,
      title: newSellingPoint.title,
      emoji: newSellingPoint.emoji,
    });

    return NextResponse.json(
      {
        success: true,
        data: newSellingPoint,
      } as AdminApiResponse<SolutionSellingPoint>,
      { status: 201 }
    );
  } catch (error) {
    console.error("💥 Admin create solution selling point error:", error);
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

// PUT - Update existing solution selling point
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
    const sellingPointData: UpdateSolutionSellingPointRequest = body;

    if (!sellingPointData.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Selling point ID is required for updates",
        } as AdminApiResponse,
        { status: 400 }
      );
    }

    console.log("🔄 Admin updating solution selling point:", {
      userId: user.id,
      sellingPointId: sellingPointData.id,
      title: sellingPointData.title,
      emoji: sellingPointData.emoji,
    });

    const serviceSupabase = createServiceRoleClient();

    // Check if selling point exists
    const { data: existingSellingPoint, error: fetchError } =
      await serviceSupabase
        .from("solution_selling_points")
        .select("*")
        .eq("id", sellingPointData.id)
        .single();

    if (fetchError || !existingSellingPoint) {
      return NextResponse.json(
        {
          success: false,
          error: "Solution selling point not found",
        } as AdminApiResponse,
        { status: 404 }
      );
    }

    // Prepare update data (only include defined fields)
    const updateData: Partial<CreateSolutionSellingPointRequest> = {};

    if (sellingPointData.solution_id !== undefined)
      updateData.solution_id = sellingPointData.solution_id;
    if (sellingPointData.emoji !== undefined)
      updateData.emoji = sellingPointData.emoji;
    if (sellingPointData.title !== undefined)
      updateData.title = sellingPointData.title;
    if (sellingPointData.description !== undefined)
      updateData.description = sellingPointData.description;
    if (sellingPointData.display_order !== undefined)
      updateData.display_order = sellingPointData.display_order;

    // Update selling point
    const { data: updatedSellingPoint, error: updateError } =
      await serviceSupabase
        .from("solution_selling_points")
        .update(updateData)
        .eq("id", sellingPointData.id)
        .select()
        .single();

    if (updateError) {
      console.error("❌ Error updating solution selling point:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update solution selling point",
          details: updateError.message,
        } as AdminApiResponse,
        { status: 500 }
      );
    }

    console.log("✅ Solution selling point updated successfully:", {
      id: updatedSellingPoint.id,
      title: updatedSellingPoint.title,
      emoji: updatedSellingPoint.emoji,
    });

    return NextResponse.json({
      success: true,
      data: updatedSellingPoint,
    } as AdminApiResponse<SolutionSellingPoint>);
  } catch (error) {
    console.error("💥 Admin update solution selling point error:", error);
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

// DELETE - Delete solution selling point
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
    const sellingPointId = searchParams.get("id");

    if (!sellingPointId) {
      return NextResponse.json(
        {
          success: false,
          error: "Selling point ID is required",
        } as AdminApiResponse,
        { status: 400 }
      );
    }

    console.log("🗑️ Admin deleting solution selling point:", {
      userId: user.id,
      sellingPointId,
    });

    const serviceSupabase = createServiceRoleClient();

    // Check if selling point exists
    const { data: existingSellingPoint, error: fetchError } =
      await serviceSupabase
        .from("solution_selling_points")
        .select("title, emoji")
        .eq("id", sellingPointId)
        .single();

    if (fetchError || !existingSellingPoint) {
      return NextResponse.json(
        {
          success: false,
          error: "Solution selling point not found",
        } as AdminApiResponse,
        { status: 404 }
      );
    }

    // Delete selling point
    const { error: deleteError } = await serviceSupabase
      .from("solution_selling_points")
      .delete()
      .eq("id", sellingPointId);

    if (deleteError) {
      console.error("❌ Error deleting solution selling point:", deleteError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete solution selling point",
          details: deleteError.message,
        } as AdminApiResponse,
        { status: 500 }
      );
    }

    console.log("✅ Solution selling point deleted successfully:", {
      id: sellingPointId,
      title: existingSellingPoint.title,
      emoji: existingSellingPoint.emoji,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: sellingPointId,
        title: existingSellingPoint.title,
        emoji: existingSellingPoint.emoji,
      },
    } as AdminApiResponse);
  } catch (error) {
    console.error("💥 Admin delete solution selling point error:", error);
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
