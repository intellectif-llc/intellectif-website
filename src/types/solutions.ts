export type SolutionType = "saas" | "plugin" | "third_party" | "owned_software";

export interface Solution {
  id: string;
  name: string;
  slug: string;
  solution_type: SolutionType;
  tagline?: string;
  logo_url?: string;
  is_active: boolean;
  display_order: number;
  price: number;
  currency: string;
  price_period?: string;
  price_description?: string;
  call_to_action_url?: string;
  call_to_action_text?: string;
  special_pricing_note?: string;
  created_at: string;
  updated_at: string;
  // Nested data from joins
  features: SolutionFeatureGroup[];
  selling_points: SolutionSellingPoint[];
}

export interface SolutionFeature {
  id: string;
  solution_id: string;
  category: string;
  feature: string;
  category_display_order: number;
  feature_display_order: number;
  created_at: string;
}

export interface SolutionFeatureGroup {
  category: string;
  category_display_order: number;
  items: string[];
}

export interface SolutionSellingPoint {
  id: string;
  solution_id: string;
  emoji?: string;
  title: string;
  description?: string;
  display_order: number;
  created_at: string;
}

export interface SolutionsApiResponse {
  solutions: Solution[];
  total: number;
}
