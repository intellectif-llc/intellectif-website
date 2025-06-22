"use client";

import { useState, useEffect } from "react";
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
  id?: string;
  service_id: string;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  notes?: string;
  is_active: boolean;
}

interface BufferTimeManagerProps {
  consultantId: string;
}

export default function BufferTimeManager({
  consultantId,
}: BufferTimeManagerProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [bufferPreferences, setBufferPreferences] = useState<
    BufferPreference[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch services and existing buffer preferences
  useEffect(() => {
    fetchData();
  }, [consultantId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch services
      const servicesResponse = await fetch("/api/services");
      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json();
        setServices(servicesData.services || []);
      }

      // Fetch existing buffer preferences
      const preferencesResponse = await fetch(
        `/api/availability/buffer-preferences?consultant_id=${consultantId}`
      );
      if (preferencesResponse.ok) {
        const preferencesData = await preferencesResponse.json();
        setBufferPreferences(preferencesData.preferences || []);
      }
    } catch (error) {
      console.error("Error fetching buffer data:", error);
      toast.error("Failed to load buffer preferences");
    } finally {
      setLoading(false);
    }
  };

  const getPreferenceForService = (serviceId: string): BufferPreference => {
    const existing = bufferPreferences.find(
      (p) => p.service_id === serviceId && p.is_active
    );
    const service = services.find((s) => s.id === serviceId);

    return (
      existing || {
        service_id: serviceId,
        buffer_before_minutes: service?.buffer_before_minutes || 0,
        buffer_after_minutes: service?.buffer_after_minutes || 5,
        is_active: true,
      }
    );
  };

  const updatePreference = (
    serviceId: string,
    field: keyof BufferPreference,
    value: any
  ) => {
    const currentPreferences = [...bufferPreferences];
    const existingIndex = currentPreferences.findIndex(
      (p) => p.service_id === serviceId && p.is_active
    );

    if (existingIndex >= 0) {
      // Update existing preference
      currentPreferences[existingIndex] = {
        ...currentPreferences[existingIndex],
        [field]: value,
      };
    } else {
      // Create new preference for this service
      const service = services.find((s) => s.id === serviceId);
      const newPreference: BufferPreference = {
        service_id: serviceId,
        buffer_before_minutes: service?.buffer_before_minutes || 0,
        buffer_after_minutes: service?.buffer_after_minutes || 5,
        is_active: true,
        [field]: value, // Apply the specific field being updated
      };
      currentPreferences.push(newPreference);
    }

    setBufferPreferences(currentPreferences);
  };

  const savePreferences = async () => {
    try {
      setSaving(true);

      // Create preferences for all services that have been modified
      const preferencesToSave = services.map((service) => {
        const preference = getPreferenceForService(service.id);
        return {
          service_id: service.id,
          buffer_before_minutes: preference.buffer_before_minutes,
          buffer_after_minutes: preference.buffer_after_minutes,
          notes: preference.notes || "",
          is_active: true,
        };
      });

      console.log("Saving preferences:", preferencesToSave); // Debug log

      const response = await fetch("/api/availability/buffer-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consultant_id: consultantId,
          preferences: preferencesToSave,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Save successful:", result); // Debug log
        toast.success("Buffer preferences saved successfully!");
        await fetchData(); // Refresh data
      } else {
        const error = await response.json();
        console.error("Save failed:", error); // Debug log
        toast.error(error.error || "Failed to save preferences");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save buffer preferences");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      updatePreference(
        serviceId,
        "buffer_before_minutes",
        service.buffer_before_minutes
      );
      updatePreference(
        serviceId,
        "buffer_after_minutes",
        service.buffer_after_minutes
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6bdcc0]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Buffer Time Preferences
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Customize buffer times between meetings for each service type
          </p>
        </div>
        <button
          onClick={savePreferences}
          disabled={saving}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            saving
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : "bg-[#6bdcc0] text-[#051028] hover:bg-[#5bc7b0]"
          }`}
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>

      <div className="grid gap-4">
        {services.map((service) => {
          const preference = getPreferenceForService(service.id);
          const totalTime =
            service.duration_minutes +
            preference.buffer_before_minutes +
            preference.buffer_after_minutes;

          return (
            <div
              key={service.id}
              className="p-6 rounded-xl"
              style={{
                background: "rgba(30, 41, 59, 0.4)",
                border: "1px solid rgba(107, 220, 192, 0.2)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-white font-medium">{service.name}</h4>
                  <p className="text-sm text-gray-400">
                    Base duration: {service.duration_minutes} minutes
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[#6bdcc0] font-medium">
                    Total: {totalTime} minutes
                  </p>
                  <button
                    onClick={() => resetToDefaults(service.id)}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Reset to defaults
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Buffer Before (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={preference.buffer_before_minutes}
                    onChange={(e) =>
                      updatePreference(
                        service.id,
                        "buffer_before_minutes",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#1e293b] border border-gray-600 text-white focus:border-[#6bdcc0] focus:outline-none"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Time before the meeting starts
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Buffer After (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={preference.buffer_after_minutes}
                    onChange={(e) =>
                      updatePreference(
                        service.id,
                        "buffer_after_minutes",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#1e293b] border border-gray-600 text-white focus:border-[#6bdcc0] focus:outline-none"
                    placeholder="5"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Time after the meeting ends
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={preference.notes || ""}
                  onChange={(e) =>
                    updatePreference(service.id, "notes", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#1e293b] border border-gray-600 text-white focus:border-[#6bdcc0] focus:outline-none resize-none"
                  rows={2}
                  placeholder="Add any notes about this buffer configuration..."
                />
              </div>

              {/* Visual Timeline */}
              <div className="mt-4 p-3 bg-[#0f172a] rounded-lg">
                <p className="text-xs text-gray-400 mb-2">Timeline Preview:</p>
                <div className="flex items-center space-x-2 text-xs">
                  {preference.buffer_before_minutes > 0 && (
                    <div className="px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded">
                      {preference.buffer_before_minutes}m prep
                    </div>
                  )}
                  <div className="px-2 py-1 bg-[#6bdcc0]/20 text-[#6bdcc0] rounded">
                    {service.duration_minutes}m meeting
                  </div>
                  {preference.buffer_after_minutes > 0 && (
                    <div className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded">
                      {preference.buffer_after_minutes}m buffer
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {services.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">
            No services found. Create services first to configure buffer times.
          </p>
        </div>
      )}
    </div>
  );
}
