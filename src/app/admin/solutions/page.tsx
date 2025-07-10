"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import type {
  Solution,
  SolutionFeature,
  SolutionSellingPoint,
  SolutionType,
} from "@/types/solutions";
import type {
  CreateSolutionRequest,
  UpdateSolutionRequest,
  SolutionFormState,
  SolutionFeatureInput,
  SolutionSellingPointInput,
  AdminApiResponse,
} from "@/types/admin";

interface ExtendedSolution extends Solution {
  raw_features?: SolutionFeature[];
  raw_selling_points?: SolutionSellingPoint[];
}

export default function AdminSolutionsPage() {
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const router = useRouter();

  // State management
  const [solutions, setSolutions] = useState<ExtendedSolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSolution, setSelectedSolution] =
    useState<ExtendedSolution | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState<SolutionFormState>({
    name: "",
    slug: "",
    solution_type: "saas" as SolutionType,
    tagline: "",
    logo_url: "",
    display_order: 0,
    price: 0,
    currency: "USD",
    price_period: "",
    price_description: "",
    call_to_action_url: "",
    call_to_action_text: "",
    special_pricing_note: "",
    is_active: true,
    features: [],
    selling_points: [],
  });

  // Redirect if not admin
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [isAdmin, adminLoading, router]);

  // Fetch solutions
  const fetchSolutions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        "/api/admin/solutions?include_inactive=true"
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Failed to fetch solutions: ${response.status} - ${errorData}`
        );
      }

      const result: AdminApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch solutions");
      }

      setSolutions(result.data?.solutions || []);
    } catch (err) {
      console.error("Error fetching solutions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch solutions"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSolutions();
    }
  }, [isAdmin]);

  // Form handlers
  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      solution_type: "saas",
      tagline: "",
      logo_url: "",
      display_order: 0,
      price: 0,
      currency: "USD",
      price_period: "",
      price_description: "",
      call_to_action_url: "",
      call_to_action_text: "",
      special_pricing_note: "",
      is_active: true,
      features: [],
      selling_points: [],
    });
    setSelectedSolution(null);
    setIsEditing(false);
    setIsCreating(false);
  };

  const loadSolutionToForm = (solution: ExtendedSolution) => {
    setFormData({
      name: solution.name,
      slug: solution.slug,
      solution_type: solution.solution_type,
      tagline: solution.tagline || "",
      logo_url: solution.logo_url || "",
      display_order: solution.display_order,
      price: solution.price,
      currency: solution.currency,
      price_period: solution.price_period || "",
      price_description: solution.price_description || "",
      call_to_action_url: solution.call_to_action_url || "",
      call_to_action_text: solution.call_to_action_text || "",
      special_pricing_note: solution.special_pricing_note || "",
      is_active: solution.is_active,
      features:
        solution.raw_features?.map((f) => ({
          id: f.id,
          category: f.category,
          feature: f.feature,
          category_display_order: f.category_display_order,
          feature_display_order: f.feature_display_order,
          _action: "update" as const,
        })) || [],
      selling_points:
        solution.raw_selling_points?.map((sp) => ({
          id: sp.id,
          emoji: sp.emoji || "",
          title: sp.title,
          description: sp.description || "",
          display_order: sp.display_order,
          _action: "update" as const,
        })) || [],
    });
    setSelectedSolution(solution);
  };

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  // Handle form input changes
  const handleInputChange = (field: keyof SolutionFormState, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-generate slug when name changes
      if (field === "name" && !isEditing) {
        updated.slug = generateSlug(value);
      }

      return updated;
    });
  };

  // Add feature
  const addFeature = () => {
    const newFeature: SolutionFeatureInput = {
      category: "",
      feature: "",
      category_display_order: 0,
      feature_display_order: formData.features.length,
      _action: "create",
    };
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, newFeature],
    }));
  };

  // Update feature
  const updateFeature = (
    index: number,
    field: keyof SolutionFeatureInput,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.map((feature, i) =>
        i === index ? { ...feature, [field]: value } : feature
      ),
    }));
  };

  // Remove feature
  const removeFeature = (index: number) => {
    setFormData((prev) => {
      const feature = prev.features[index];
      const updatedFeatures = prev.features.filter((_, i) => i !== index);

      // If it's an existing feature, mark for deletion
      if (feature.id) {
        return {
          ...prev,
          features: [...updatedFeatures, { ...feature, _action: "delete" }],
        };
      }

      return {
        ...prev,
        features: updatedFeatures,
      };
    });
  };

  // Add selling point
  const addSellingPoint = () => {
    const newSellingPoint: SolutionSellingPointInput = {
      emoji: "",
      title: "",
      description: "",
      display_order: formData.selling_points.length,
      _action: "create",
    };
    setFormData((prev) => ({
      ...prev,
      selling_points: [...prev.selling_points, newSellingPoint],
    }));
  };

  // Update selling point
  const updateSellingPoint = (
    index: number,
    field: keyof SolutionSellingPointInput,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      selling_points: prev.selling_points.map((point, i) =>
        i === index ? { ...point, [field]: value } : point
      ),
    }));
  };

  // Remove selling point
  const removeSellingPoint = (index: number) => {
    setFormData((prev) => {
      const point = prev.selling_points[index];
      const updatedPoints = prev.selling_points.filter((_, i) => i !== index);

      // If it's an existing point, mark for deletion
      if (point.id) {
        return {
          ...prev,
          selling_points: [...updatedPoints, { ...point, _action: "delete" }],
        };
      }

      return {
        ...prev,
        selling_points: updatedPoints,
      };
    });
  };

  // Save solution
  const saveSolution = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!formData.name.trim() || !formData.slug.trim()) {
        throw new Error("Name and slug are required");
      }

      const solutionData: CreateSolutionRequest | UpdateSolutionRequest = {
        ...(isEditing && selectedSolution ? { id: selectedSolution.id } : {}),
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        solution_type: formData.solution_type,
        tagline: formData.tagline.trim() || undefined,
        logo_url: formData.logo_url.trim() || undefined,
        display_order: formData.display_order,
        price: formData.price,
        currency: formData.currency,
        price_period: formData.price_period.trim() || undefined,
        price_description: formData.price_description.trim() || undefined,
        call_to_action_url: formData.call_to_action_url.trim() || undefined,
        call_to_action_text: formData.call_to_action_text.trim() || undefined,
        special_pricing_note: formData.special_pricing_note.trim() || undefined,
        is_active: formData.is_active,
      };

      const method = isEditing ? "PUT" : "POST";
      const response = await fetch("/api/admin/solutions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(solutionData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Failed to save solution: ${response.status} - ${errorData}`
        );
      }

      const result: AdminApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to save solution");
      }

      const savedSolution = result.data as Solution;

      // Now handle features and selling points
      await handleRelatedData(savedSolution.id);

      await fetchSolutions();
      resetForm();

      alert(`Solution ${isEditing ? "updated" : "created"} successfully!`);
    } catch (err) {
      console.error("Error saving solution:", err);
      setError(err instanceof Error ? err.message : "Failed to save solution");
    } finally {
      setLoading(false);
    }
  };

  // Handle features and selling points
  const handleRelatedData = async (solutionId: string) => {
    // Handle features
    for (const feature of formData.features) {
      if (feature._action === "delete" && feature.id) {
        await fetch(`/api/admin/solution-features?id=${feature.id}`, {
          method: "DELETE",
        });
      } else if (feature._action === "create") {
        await fetch("/api/admin/solution-features", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            solution_id: solutionId,
            category: feature.category,
            feature: feature.feature,
            category_display_order: feature.category_display_order,
            feature_display_order: feature.feature_display_order,
          }),
        });
      } else if (feature._action === "update" && feature.id) {
        await fetch("/api/admin/solution-features", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: feature.id,
            category: feature.category,
            feature: feature.feature,
            category_display_order: feature.category_display_order,
            feature_display_order: feature.feature_display_order,
          }),
        });
      }
    }

    // Handle selling points
    for (const point of formData.selling_points) {
      if (point._action === "delete" && point.id) {
        await fetch(`/api/admin/solution-selling-points?id=${point.id}`, {
          method: "DELETE",
        });
      } else if (point._action === "create") {
        await fetch("/api/admin/solution-selling-points", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            solution_id: solutionId,
            emoji: point.emoji,
            title: point.title,
            description: point.description,
            display_order: point.display_order,
          }),
        });
      } else if (point._action === "update" && point.id) {
        await fetch("/api/admin/solution-selling-points", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: point.id,
            emoji: point.emoji,
            title: point.title,
            description: point.description,
            display_order: point.display_order,
          }),
        });
      }
    }
  };

  // Delete solution
  const deleteSolution = async (solution: ExtendedSolution) => {
    if (
      !confirm(
        `Are you sure you want to delete "${solution.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/solutions?id=${solution.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Failed to delete solution: ${response.status} - ${errorData}`
        );
      }

      const result: AdminApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to delete solution");
      }

      await fetchSolutions();
      resetForm();

      alert("Solution deleted successfully!");
    } catch (err) {
      console.error("Error deleting solution:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete solution"
      );
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-[#051028] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6bdcc0]"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#051028] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            🛠️ Solutions Management
          </h1>
          <p className="text-xl text-gray-300">
            Manage all solutions, features, and selling points
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400">❌ {error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-8 flex justify-center gap-4 flex-wrap">
          <button
            onClick={() => {
              resetForm();
              setIsCreating(true);
            }}
            className="bg-gradient-to-r from-[#6bdcc0] to-[#22d3ee] text-[#051028] px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            disabled={loading}
          >
            ➕ Create New Solution
          </button>

          <button
            onClick={fetchSolutions}
            className="bg-[#1e293b] text-[#6bdcc0] border border-[#6bdcc0]/30 px-6 py-3 rounded-xl font-semibold hover:bg-[#6bdcc0]/10 transition-colors"
            disabled={loading}
          >
            🔄 Refresh Data
          </button>

          <button
            onClick={() => window.open("/solutions", "_blank")}
            className="bg-[#1e293b] text-[#6bdcc0] border border-[#6bdcc0]/30 px-6 py-3 rounded-xl font-semibold hover:bg-[#6bdcc0]/10 transition-colors"
          >
            👁️ View Live Page
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Solutions List */}
          <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-3xl p-6 border border-[#6bdcc0]/20 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              📋 Existing Solutions
            </h2>

            {loading && !solutions.length ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6bdcc0] mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading solutions...</p>
              </div>
            ) : solutions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">
                  No solutions found. Create your first solution!
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {solutions.map((solution) => (
                  <div
                    key={solution.id}
                    className={`
                      bg-[#051028] rounded-xl p-4 border transition-all duration-300
                      ${
                        selectedSolution?.id === solution.id
                          ? "border-[#6bdcc0] bg-[#6bdcc0]/5"
                          : "border-[#6bdcc0]/10 hover:border-[#6bdcc0]/30"
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-white font-semibold">
                            {solution.name}
                          </h3>
                          <span
                            className={`
                            px-2 py-1 rounded-full text-xs font-medium
                            ${
                              solution.is_active
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }
                          `}
                          >
                            {solution.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">
                          Type: {solution.solution_type} | Order:{" "}
                          {solution.display_order}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Features: {solution.raw_features?.length || 0} |
                          Selling Points:{" "}
                          {solution.raw_selling_points?.length || 0}
                        </p>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            loadSolutionToForm(solution);
                            setIsEditing(true);
                            setIsCreating(false);
                          }}
                          className="bg-[#6bdcc0]/20 text-[#6bdcc0] px-3 py-1 rounded-lg text-sm hover:bg-[#6bdcc0]/30 transition-colors"
                          disabled={loading}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => deleteSolution(solution)}
                          className="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                          disabled={loading}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Solution Form */}
          {(isCreating || isEditing) && (
            <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-3xl p-6 border border-[#6bdcc0]/20 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                {isEditing ? "✏️ Edit Solution" : "➕ Create Solution"}
              </h2>

              <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#6bdcc0]">
                    Basic Information
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Solution Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      className="w-full bg-[#051028] border border-[#6bdcc0]/20 rounded-lg px-3 py-2 text-white focus:border-[#6bdcc0] focus:outline-none"
                      placeholder="Enter solution name..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      URL Slug *
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) =>
                        handleInputChange("slug", e.target.value)
                      }
                      className="w-full bg-[#051028] border border-[#6bdcc0]/20 rounded-lg px-3 py-2 text-white focus:border-[#6bdcc0] focus:outline-none"
                      placeholder="url-friendly-slug"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Solution Type *
                    </label>
                    <select
                      value={formData.solution_type}
                      onChange={(e) =>
                        handleInputChange(
                          "solution_type",
                          e.target.value as SolutionType
                        )
                      }
                      className="w-full bg-[#051028] border border-[#6bdcc0]/20 rounded-lg px-3 py-2 text-white focus:border-[#6bdcc0] focus:outline-none"
                    >
                      <option value="saas">SaaS</option>
                      <option value="plugin">Plugin</option>
                      <option value="third_party">Third Party</option>
                      <option value="owned_software">Owned Software</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tagline
                    </label>
                    <input
                      type="text"
                      value={formData.tagline}
                      onChange={(e) =>
                        handleInputChange("tagline", e.target.value)
                      }
                      className="w-full bg-[#051028] border border-[#6bdcc0]/20 rounded-lg px-3 py-2 text-white focus:border-[#6bdcc0] focus:outline-none"
                      placeholder="Brief description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Logo URL (S3 Key or Full URL)
                    </label>
                    <input
                      type="text"
                      value={formData.logo_url}
                      onChange={(e) =>
                        handleInputChange("logo_url", e.target.value)
                      }
                      className="w-full bg-[#051028] border border-[#6bdcc0]/20 rounded-lg px-3 py-2 text-white focus:border-[#6bdcc0] focus:outline-none"
                      placeholder="solutions/logos/example.png"
                    />
                  </div>
                </div>

                {/* Pricing & Display */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#6bdcc0]">
                    Pricing & Display
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) =>
                          handleInputChange(
                            "price",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full bg-[#051028] border border-[#6bdcc0]/20 rounded-lg px-3 py-2 text-white focus:border-[#6bdcc0] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Currency
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) =>
                          handleInputChange("currency", e.target.value)
                        }
                        className="w-full bg-[#051028] border border-[#6bdcc0]/20 rounded-lg px-3 py-2 text-white focus:border-[#6bdcc0] focus:outline-none"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Price Period
                    </label>
                    <input
                      type="text"
                      value={formData.price_period}
                      onChange={(e) =>
                        handleInputChange("price_period", e.target.value)
                      }
                      className="w-full bg-[#051028] border border-[#6bdcc0]/20 rounded-lg px-3 py-2 text-white focus:border-[#6bdcc0] focus:outline-none"
                      placeholder="per month, per year, one-time, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) =>
                        handleInputChange(
                          "display_order",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full bg-[#051028] border border-[#6bdcc0]/20 rounded-lg px-3 py-2 text-white focus:border-[#6bdcc0] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) =>
                        handleInputChange("is_active", e.target.checked)
                      }
                      className="mr-2"
                    />
                    <label
                      htmlFor="is_active"
                      className="text-sm text-gray-300"
                    >
                      Solution is active and visible
                    </label>
                  </div>
                </div>

                {/* Call to Action */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#6bdcc0]">
                    Call to Action
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      CTA URL
                    </label>
                    <input
                      type="url"
                      value={formData.call_to_action_url}
                      onChange={(e) =>
                        handleInputChange("call_to_action_url", e.target.value)
                      }
                      className="w-full bg-[#051028] border border-[#6bdcc0]/20 rounded-lg px-3 py-2 text-white focus:border-[#6bdcc0] focus:outline-none"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      CTA Text
                    </label>
                    <input
                      type="text"
                      value={formData.call_to_action_text}
                      onChange={(e) =>
                        handleInputChange("call_to_action_text", e.target.value)
                      }
                      className="w-full bg-[#051028] border border-[#6bdcc0]/20 rounded-lg px-3 py-2 text-white focus:border-[#6bdcc0] focus:outline-none"
                      placeholder="Get Started, Learn More, etc."
                    />
                  </div>
                </div>

                {/* Features Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#6bdcc0]">
                      Features
                    </h3>
                    <button
                      onClick={addFeature}
                      className="bg-[#6bdcc0]/20 text-[#6bdcc0] px-3 py-1 rounded-lg text-sm hover:bg-[#6bdcc0]/30 transition-colors"
                    >
                      ➕ Add Feature
                    </button>
                  </div>

                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {formData.features
                      .filter((f) => f._action !== "delete")
                      .map((feature, index) => (
                        <div
                          key={index}
                          className="bg-[#051028] rounded-lg p-3 border border-[#6bdcc0]/10"
                        >
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input
                              type="text"
                              placeholder="Category"
                              value={feature.category}
                              onChange={(e) =>
                                updateFeature(index, "category", e.target.value)
                              }
                              className="bg-[#1e293b] border border-[#6bdcc0]/20 rounded px-2 py-1 text-white text-sm focus:border-[#6bdcc0] focus:outline-none"
                            />
                            <input
                              type="number"
                              placeholder="Category Order"
                              value={feature.category_display_order}
                              onChange={(e) =>
                                updateFeature(
                                  index,
                                  "category_display_order",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="bg-[#1e293b] border border-[#6bdcc0]/20 rounded px-2 py-1 text-white text-sm focus:border-[#6bdcc0] focus:outline-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Feature description"
                              value={feature.feature}
                              onChange={(e) =>
                                updateFeature(index, "feature", e.target.value)
                              }
                              className="flex-1 bg-[#1e293b] border border-[#6bdcc0]/20 rounded px-2 py-1 text-white text-sm focus:border-[#6bdcc0] focus:outline-none"
                            />
                            <input
                              type="number"
                              placeholder="Order"
                              value={feature.feature_display_order}
                              onChange={(e) =>
                                updateFeature(
                                  index,
                                  "feature_display_order",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-16 bg-[#1e293b] border border-[#6bdcc0]/20 rounded px-2 py-1 text-white text-sm focus:border-[#6bdcc0] focus:outline-none"
                            />
                            <button
                              onClick={() => removeFeature(index)}
                              className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-sm hover:bg-red-500/30 transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Selling Points Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#6bdcc0]">
                      Selling Points
                    </h3>
                    <button
                      onClick={addSellingPoint}
                      className="bg-[#6bdcc0]/20 text-[#6bdcc0] px-3 py-1 rounded-lg text-sm hover:bg-[#6bdcc0]/30 transition-colors"
                    >
                      ➕ Add Point
                    </button>
                  </div>

                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {formData.selling_points
                      .filter((sp) => sp._action !== "delete")
                      .map((point, index) => (
                        <div
                          key={index}
                          className="bg-[#051028] rounded-lg p-3 border border-[#6bdcc0]/10"
                        >
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <input
                              type="text"
                              placeholder="Emoji"
                              value={point.emoji}
                              onChange={(e) =>
                                updateSellingPoint(
                                  index,
                                  "emoji",
                                  e.target.value
                                )
                              }
                              className="bg-[#1e293b] border border-[#6bdcc0]/20 rounded px-2 py-1 text-white text-sm focus:border-[#6bdcc0] focus:outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Title"
                              value={point.title}
                              onChange={(e) =>
                                updateSellingPoint(
                                  index,
                                  "title",
                                  e.target.value
                                )
                              }
                              className="bg-[#1e293b] border border-[#6bdcc0]/20 rounded px-2 py-1 text-white text-sm focus:border-[#6bdcc0] focus:outline-none"
                            />
                            <input
                              type="number"
                              placeholder="Order"
                              value={point.display_order}
                              onChange={(e) =>
                                updateSellingPoint(
                                  index,
                                  "display_order",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="bg-[#1e293b] border border-[#6bdcc0]/20 rounded px-2 py-1 text-white text-sm focus:border-[#6bdcc0] focus:outline-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <textarea
                              placeholder="Description (optional)"
                              value={point.description}
                              onChange={(e) =>
                                updateSellingPoint(
                                  index,
                                  "description",
                                  e.target.value
                                )
                              }
                              className="flex-1 bg-[#1e293b] border border-[#6bdcc0]/20 rounded px-2 py-1 text-white text-sm focus:border-[#6bdcc0] focus:outline-none resize-none"
                              rows={2}
                            />
                            <button
                              onClick={() => removeSellingPoint(index)}
                              className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-sm hover:bg-red-500/30 transition-colors self-start"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="mt-6 flex gap-4 justify-center">
                <button
                  onClick={saveSolution}
                  disabled={
                    loading || !formData.name.trim() || !formData.slug.trim()
                  }
                  className="bg-gradient-to-r from-[#6bdcc0] to-[#22d3ee] text-[#051028] px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? "Saving..."
                    : isEditing
                    ? "Update Solution"
                    : "Create Solution"}
                </button>

                <button
                  onClick={resetForm}
                  className="bg-[#1e293b] text-[#6bdcc0] border border-[#6bdcc0]/30 px-6 py-3 rounded-xl font-semibold hover:bg-[#6bdcc0]/10 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Back to Dashboard */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-[#1e293b] text-[#6bdcc0] border border-[#6bdcc0]/30 px-6 py-3 rounded-xl font-semibold hover:bg-[#6bdcc0]/10 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
