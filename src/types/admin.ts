import type { SolutionType } from "./solutions";

// Admin Solution Management Types
export interface CreateSolutionRequest {
  name: string;
  slug: string;
  solution_type: SolutionType;
  tagline?: string;
  logo_url?: string;
  display_order: number;
  price: number;
  currency: string;
  price_period?: string;
  price_description?: string;
  call_to_action_url?: string;
  call_to_action_text?: string;
  special_pricing_note?: string;
  is_active: boolean;
}

export interface UpdateSolutionRequest extends Partial<CreateSolutionRequest> {
  id: string;
}

export interface CreateSolutionFeatureRequest {
  solution_id: string;
  category: string;
  feature: string;
  category_display_order: number;
  feature_display_order: number;
}

export interface UpdateSolutionFeatureRequest
  extends Partial<CreateSolutionFeatureRequest> {
  id: string;
}

export interface CreateSolutionSellingPointRequest {
  solution_id: string;
  emoji?: string;
  title: string;
  description?: string;
  display_order: number;
}

export interface UpdateSolutionSellingPointRequest
  extends Partial<CreateSolutionSellingPointRequest> {
  id: string;
}

// Batch operations for features and selling points
export interface SolutionFeatureInput {
  id?: string; // For updates
  category: string;
  feature: string;
  category_display_order: number;
  feature_display_order: number;
  _action?: "create" | "update" | "delete";
}

export interface SolutionSellingPointInput {
  id?: string; // For updates
  emoji?: string;
  title: string;
  description?: string;
  display_order: number;
  _action?: "create" | "update" | "delete";
}

export interface CompleteSolutionRequest {
  solution: CreateSolutionRequest | UpdateSolutionRequest;
  features: SolutionFeatureInput[];
  selling_points: SolutionSellingPointInput[];
}

// API Response Types
export interface AdminApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export interface SolutionManagementStats {
  total_solutions: number;
  active_solutions: number;
  inactive_solutions: number;
  solutions_by_type: Record<SolutionType, number>;
  total_features: number;
  total_selling_points: number;
}

// Form State Types
export interface SolutionFormState {
  // Basic solution info
  name: string;
  slug: string;
  solution_type: SolutionType;
  tagline: string;
  logo_url: string;
  display_order: number;

  // Pricing
  price: number;
  currency: string;
  price_period: string;
  price_description: string;

  // Call to action
  call_to_action_url: string;
  call_to_action_text: string;
  special_pricing_note: string;

  // Status
  is_active: boolean;

  // Related data
  features: SolutionFeatureInput[];
  selling_points: SolutionSellingPointInput[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Admin Dashboard Types
export interface AdminDashboardTab {
  id: string;
  label: string;
  icon: string;
  requiresAdmin: boolean;
}

// File Upload Types (for logo management)
export interface FileUploadResult {
  success: boolean;
  file_url?: string;
  file_key?: string;
  error?: string;
}

// Audit/Activity Types
export interface SolutionActivity {
  id: string;
  action: "created" | "updated" | "deleted" | "activated" | "deactivated";
  solution_id: string;
  solution_name: string;
  user_id: string;
  user_name: string;
  timestamp: string;
  changes?: Record<string, { from: any; to: any }>;
}

// Bulk Operations
export interface BulkUpdateRequest {
  solution_ids: string[];
  updates: Partial<CreateSolutionRequest>;
}

export interface BulkDeleteRequest {
  solution_ids: string[];
}

export interface BulkOperationResult {
  success_count: number;
  failure_count: number;
  failures: Array<{
    id: string;
    error: string;
  }>;
}
