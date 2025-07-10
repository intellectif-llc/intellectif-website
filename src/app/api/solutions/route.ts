import { createRouteHandlerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import type {
  Solution,
  SolutionFeature,
  SolutionFeatureGroup,
  SolutionSellingPoint,
  SolutionsApiResponse,
} from "@/types/solutions";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    console.log("🔍 Fetching active solutions from database...");

    // Fetch all active solutions ordered by display_order
    const { data: solutions, error: solutionsError } = await supabase
      .from("solutions")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (solutionsError) {
      console.error("❌ Error fetching solutions:", solutionsError);
      return NextResponse.json(
        { error: "Failed to fetch solutions" },
        { status: 500 }
      );
    }

    if (!solutions || solutions.length === 0) {
      console.log("ℹ️ No active solutions found");
      return NextResponse.json({
        solutions: [],
        total: 0,
      } as SolutionsApiResponse);
    }

    console.log(`✅ Found ${solutions.length} active solutions`);

    // Get all solution IDs for batch fetching
    const solutionIds = solutions.map((solution) => solution.id);

    // Fetch features for all solutions
    const { data: features, error: featuresError } = await supabase
      .from("solution_features")
      .select("*")
      .in("solution_id", solutionIds)
      .order("category_display_order", { ascending: true })
      .order("feature_display_order", { ascending: true });

    if (featuresError) {
      console.error("❌ Error fetching solution features:", featuresError);
      return NextResponse.json(
        { error: "Failed to fetch solution features" },
        { status: 500 }
      );
    }

    // Fetch selling points for all solutions
    const { data: sellingPoints, error: sellingPointsError } = await supabase
      .from("solution_selling_points")
      .select("*")
      .in("solution_id", solutionIds)
      .order("display_order", { ascending: true });

    if (sellingPointsError) {
      console.error("❌ Error fetching selling points:", sellingPointsError);
      return NextResponse.json(
        { error: "Failed to fetch solution selling points" },
        { status: 500 }
      );
    }

    console.log(
      `📋 Found ${features?.length || 0} features and ${
        sellingPoints?.length || 0
      } selling points`
    );

    // Process and structure the data
    const structuredSolutions: Solution[] = solutions.map((solution) => {
      // Group features by category for this solution
      const solutionFeatures = (features || []).filter(
        (feature: SolutionFeature) => feature.solution_id === solution.id
      );

      const featureGroups: SolutionFeatureGroup[] = [];
      const categoryMap = new Map<string, SolutionFeatureGroup>();

      solutionFeatures.forEach((feature: SolutionFeature) => {
        if (!categoryMap.has(feature.category)) {
          categoryMap.set(feature.category, {
            category: feature.category,
            category_display_order: feature.category_display_order,
            items: [],
          });
        }
        categoryMap.get(feature.category)!.items.push(feature.feature);
      });

      // Convert map to array and sort by display order
      featureGroups.push(...Array.from(categoryMap.values()));
      featureGroups.sort(
        (a, b) => a.category_display_order - b.category_display_order
      );

      // Get selling points for this solution
      const solutionSellingPoints = (sellingPoints || []).filter(
        (point: SolutionSellingPoint) => point.solution_id === solution.id
      );

      return {
        ...solution,
        features: featureGroups,
        selling_points: solutionSellingPoints,
      };
    });

    console.log("🎯 Successfully structured solution data:", {
      totalSolutions: structuredSolutions.length,
      solutionNames: structuredSolutions.map((s) => s.name),
    });

    return NextResponse.json({
      solutions: structuredSolutions,
      total: structuredSolutions.length,
    } as SolutionsApiResponse);
  } catch (error) {
    console.error("💥 Unexpected error in solutions API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
