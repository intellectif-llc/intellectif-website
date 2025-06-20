import React, { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import toast from "react-hot-toast";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  allow_custom_buffer: boolean;
}

interface BufferPreference {
  id: string;
  service_id: string;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  notes: string;
  is_active: boolean;
}

export default function BufferTimeManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [preferences, setPreferences] = useState<BufferPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select(
          "id, name, duration_minutes, buffer_before_minutes, buffer_after_minutes, allow_custom_buffer"
        )
        .eq("is_active", true)
        .order("name");

      if (servicesError) throw servicesError;

      // Fetch current user's buffer preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from("consultant_buffer_preferences")
        .select("*")
        .eq("is_active", true);

      if (preferencesError) throw preferencesError;

      setServices(servicesData || []);
      setPreferences(preferencesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load buffer time settings");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getPreferenceForService = (serviceId: string) => {
    return preferences.find((p) => p.service_id === serviceId);
  };

  const updateBufferPreference = async (
    serviceId: string,
    bufferBefore: number,
    bufferAfter: number,
    notes: string = ""
  ) => {
    try {
      setSaving(serviceId);

      const existingPreference = getPreferenceForService(serviceId);

      if (existingPreference) {
        // Update existing preference
        const { error } = await supabase
          .from("consultant_buffer_preferences")
          .update({
            buffer_before_minutes: bufferBefore,
            buffer_after_minutes: bufferAfter,
            notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingPreference.id);

        if (error) throw error;

        setPreferences((prev) =>
          prev.map((p) =>
            p.id === existingPreference.id
              ? {
                  ...p,
                  buffer_before_minutes: bufferBefore,
                  buffer_after_minutes: bufferAfter,
                  notes,
                }
              : p
          )
        );
      } else {
        // Create new preference
        const { data, error } = await supabase
          .from("consultant_buffer_preferences")
          .insert({
            service_id: serviceId,
            buffer_before_minutes: bufferBefore,
            buffer_after_minutes: bufferAfter,
            notes,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;

        setPreferences((prev) => [...prev, data]);
      }

      toast.success("Buffer time preferences updated");
    } catch (error) {
      console.error("Error updating buffer preference:", error);
      toast.error("Failed to update buffer time preferences");
    } finally {
      setSaving(null);
    }
  };

  const resetToDefault = async (serviceId: string) => {
    try {
      setSaving(serviceId);

      const existingPreference = getPreferenceForService(serviceId);
      if (existingPreference) {
        const { error } = await supabase
          .from("consultant_buffer_preferences")
          .update({ is_active: false })
          .eq("id", existingPreference.id);

        if (error) throw error;

        setPreferences((prev) =>
          prev.filter((p) => p.id !== existingPreference.id)
        );
      }

      toast.success("Reset to service default");
    } catch (error) {
      console.error("Error resetting preference:", error);
      toast.error("Failed to reset buffer time");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6bdcc0]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Buffer Time Management
        </h2>
        <p className="text-[#64748b]">
          Customize buffer times between meetings for each service type
        </p>
      </div>

      <div className="grid gap-6">
        {services.map((service) => {
          const preference = getPreferenceForService(service.id);
          const currentBufferBefore =
            preference?.buffer_before_minutes ?? service.buffer_before_minutes;
          const currentBufferAfter =
            preference?.buffer_after_minutes ?? service.buffer_after_minutes;
          const isCustomized = !!preference;

          return (
            <div
              key={service.id}
              className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {service.name}
                  </h3>
                  <p className="text-sm text-[#64748b]">
                    Duration: {service.duration_minutes} minutes
                  </p>
                  {!service.allow_custom_buffer && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠️ Custom buffer times not allowed for this service
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {isCustomized && (
                    <span className="px-2 py-1 bg-[#6bdcc0]/20 text-[#6bdcc0] text-xs rounded-full">
                      Customized
                    </span>
                  )}
                  <span className="px-2 py-1 bg-[#64748b]/20 text-[#64748b] text-xs rounded-full">
                    Total:{" "}
                    {service.duration_minutes +
                      currentBufferBefore +
                      currentBufferAfter}{" "}
                    min
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Buffer Before (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={currentBufferBefore}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      updateBufferPreference(
                        service.id,
                        value,
                        currentBufferAfter,
                        preference?.notes || ""
                      );
                    }}
                    disabled={
                      !service.allow_custom_buffer || saving === service.id
                    }
                    className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#6bdcc0] disabled:opacity-50"
                  />
                  <p className="text-xs text-[#64748b] mt-1">
                    Default: {service.buffer_before_minutes} minutes
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Buffer After (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={currentBufferAfter}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      updateBufferPreference(
                        service.id,
                        currentBufferBefore,
                        value,
                        preference?.notes || ""
                      );
                    }}
                    disabled={
                      !service.allow_custom_buffer || saving === service.id
                    }
                    className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#6bdcc0] disabled:opacity-50"
                  />
                  <p className="text-xs text-[#64748b] mt-1">
                    Default: {service.buffer_after_minutes} minutes
                  </p>
                </div>
              </div>

              {service.allow_custom_buffer && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={preference?.notes || ""}
                    onChange={(e) => {
                      updateBufferPreference(
                        service.id,
                        currentBufferBefore,
                        currentBufferAfter,
                        e.target.value
                      );
                    }}
                    disabled={saving === service.id}
                    placeholder="Why do you need different buffer times for this service?"
                    className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#6bdcc0] disabled:opacity-50 resize-none"
                    rows={2}
                  />
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="text-sm text-[#64748b]">
                  <span className="font-medium">Meeting Block:</span>{" "}
                  {currentBufferBefore}min + {service.duration_minutes}min +{" "}
                  {currentBufferAfter}min ={" "}
                  {currentBufferBefore +
                    service.duration_minutes +
                    currentBufferAfter}
                  min total
                </div>

                {isCustomized && service.allow_custom_buffer && (
                  <button
                    onClick={() => resetToDefault(service.id)}
                    disabled={saving === service.id}
                    className="px-3 py-1 text-sm text-[#64748b] hover:text-white border border-[#334155] hover:border-[#6bdcc0] rounded-lg transition-colors duration-200 disabled:opacity-50"
                  >
                    {saving === service.id
                      ? "Resetting..."
                      : "Reset to Default"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
        <h3 className="text-lg font-semibold text-white mb-3">
          💡 Buffer Time Tips
        </h3>
        <div className="space-y-2 text-sm text-[#64748b]">
          <p>
            • <strong>Buffer Before:</strong> Time to prepare, review client
            info, or transition between meetings
          </p>
          <p>
            • <strong>Buffer After:</strong> Time to take notes, decompress, or
            handle follow-up tasks
          </p>
          <p>
            • <strong>Recommended:</strong> 0-5 minutes before, 5-10 minutes
            after for most services
          </p>
          <p>
            • <strong>Note:</strong> Buffer times affect your available booking
            slots and prevent back-to-back meetings
          </p>
        </div>
      </div>
    </div>
  );
}
