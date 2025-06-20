"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";

interface AvailabilityTemplate {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_bookings: number;
  timezone: string;
  template_name?: string;
  notes?: string;
  is_active: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

export default function WeeklyAvailability() {
  const [templates, setTemplates] = useState<AvailabilityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<AvailabilityTemplate | null>(null);
  const [formData, setFormData] = useState({
    day_of_week: 1,
    start_time: "09:00",
    end_time: "17:00",
    max_bookings: 1,
    timezone: "UTC",
    template_name: "",
    notes: "",
  });
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceDay, setCopySourceDay] = useState<number | null>(null);
  const [selectedTargetDays, setSelectedTargetDays] = useState<number[]>([]);
  const [copyLoading, setCopyLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/availability/templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        // Handle specific error cases
        const errorData = await response.json().catch(() => ({}));
        console.error("Error fetching templates:", errorData);

        if (response.status === 500) {
          // Likely database schema issue
          console.warn(
            "Database schema may not be set up correctly for availability features"
          );
        }
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      // Set empty array to prevent crashes
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingTemplate
        ? "/api/availability/templates"
        : "/api/availability/templates";
      const method = editingTemplate ? "PUT" : "POST";
      const body = editingTemplate
        ? { ...formData, id: editingTemplate.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchTemplates();
        resetForm();
        toast.success(
          editingTemplate
            ? "Template updated successfully!"
            : "Template added successfully!"
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this availability slot?"))
      return;

    try {
      const response = await fetch(`/api/availability/templates?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchTemplates();
        toast.success("Template deleted successfully!");
      } else {
        toast.error("Failed to delete template");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleEdit = (template: AvailabilityTemplate) => {
    setEditingTemplate(template);
    setFormData({
      day_of_week: template.day_of_week,
      start_time: template.start_time,
      end_time: template.end_time,
      max_bookings: template.max_bookings,
      timezone: template.timezone,
      template_name: template.template_name || "",
      notes: template.notes || "",
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setShowAddForm(false);
    setFormData({
      day_of_week: 1,
      start_time: "09:00",
      end_time: "17:00",
      max_bookings: 1,
      timezone: "UTC",
      template_name: "",
      notes: "",
    });
  };

  const groupTemplatesByDay = () => {
    const grouped: { [key: number]: AvailabilityTemplate[] } = {};
    templates.forEach((template) => {
      if (!grouped[template.day_of_week]) {
        grouped[template.day_of_week] = [];
      }
      grouped[template.day_of_week].push(template);
    });
    return grouped;
  };

  const copyDayToOthers = async (sourceDay: number, targetDays: number[]) => {
    if (targetDays.length === 0) return;

    setCopyLoading(true);
    const toastId = toast.loading("Copying schedule...");

    try {
      const response = await fetch("/api/availability/templates/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_day: sourceDay,
          target_days: targetDays,
        }),
      });

      if (response.ok) {
        await fetchTemplates();

        toast.success(
          `Successfully copied ${
            DAYS_OF_WEEK.find((d) => d.value === sourceDay)?.label
          } schedule to ${targetDays.length} day(s)`,
          { id: toastId }
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to copy schedule", { id: toastId });
      }
    } catch (error) {
      console.error("Error copying schedule:", error);
      toast.error("Failed to copy schedule", { id: toastId });
    } finally {
      setCopyLoading(false);
    }
  };

  const handleCopyDay = (sourceDay: number) => {
    setCopySourceDay(sourceDay);
    setSelectedTargetDays([]);
    setShowCopyModal(true);
  };

  const handleCopyConfirm = async () => {
    if (copySourceDay !== null && selectedTargetDays.length > 0) {
      await copyDayToOthers(copySourceDay, selectedTargetDays);
      setShowCopyModal(false);
      setCopySourceDay(null);
      setSelectedTargetDays([]);
    }
  };

  const toggleTargetDay = (dayValue: number) => {
    setSelectedTargetDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6bdcc0]"></div>
      </div>
    );
  }

  const groupedTemplates = groupTemplatesByDay();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Weekly Schedule
          </h2>
          <p className="text-gray-300">
            Define your regular weekly availability
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAddForm(true)}>
          + Add Time Slot
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-[#6bdcc0]/20 shadow-xl">
          <h3 className="text-xl font-semibold text-white mb-4">
            {editingTemplate
              ? "Edit Availability Slot"
              : "Add New Availability Slot"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Day of Week */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Day of Week
                </label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      day_of_week: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 bg-[#051028] border border-[#6bdcc0]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]"
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Max Bookings */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Concurrent Bookings
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.max_bookings}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_bookings: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 bg-[#051028] border border-[#6bdcc0]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#051028] border border-[#6bdcc0]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#051028] border border-[#6bdcc0]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]"
                />
              </div>
            </div>

            {/* Template Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Template Name (Optional)
                <span className="block text-xs text-gray-400 font-normal mt-1">
                  Name this time slot for easy identification (e.g.,
                  &quot;Morning Shift&quot;, &quot;Extended Hours&quot;)
                </span>
              </label>
              <input
                type="text"
                value={formData.template_name}
                onChange={(e) =>
                  setFormData({ ...formData, template_name: e.target.value })
                }
                placeholder="e.g., Morning Shift, Extended Hours, Peak Time"
                className="w-full px-4 py-2 bg-[#051028] border border-[#6bdcc0]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any additional notes about this availability slot"
                rows={3}
                className="w-full px-4 py-2 bg-[#051028] border border-[#6bdcc0]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6bdcc0] resize-none"
              />
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" variant="primary">
                {editingTemplate ? "Update Slot" : "Add Slot"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Copy Modal */}
      {showCopyModal && copySourceDay !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1e293b] rounded-2xl p-6 border border-[#6bdcc0]/20 shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">
              Copy {DAYS_OF_WEEK.find((d) => d.value === copySourceDay)?.label}{" "}
              Schedule
            </h3>
            <p className="text-gray-300 mb-4">
              Select the days you want to copy this schedule to:
            </p>

            <div className="space-y-2 mb-6">
              {DAYS_OF_WEEK.filter((d) => d.value !== copySourceDay).map(
                (day) => (
                  <label
                    key={day.value}
                    className="flex items-center gap-3 p-2 rounded hover:bg-[#051028]/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTargetDays.includes(day.value)}
                      onChange={() => toggleTargetDay(day.value)}
                      className="w-4 h-4 text-[#6bdcc0] bg-[#051028] border-[#6bdcc0]/30 rounded focus:ring-[#6bdcc0]"
                    />
                    <span className="text-white">{day.label}</span>
                  </label>
                )
              )}
            </div>

            <div className="flex gap-4">
              <Button
                variant="primary"
                onClick={handleCopyConfirm}
                disabled={selectedTargetDays.length === 0 || copyLoading}
              >
                {copyLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Copying...
                  </div>
                ) : (
                  <>
                    Copy to {selectedTargetDays.length} day
                    {selectedTargetDays.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCopyModal(false)}
                disabled={copyLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Schedule Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day.value}
            className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-4 border border-[#6bdcc0]/20 shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">{day.short}</h3>
              {groupedTemplates[day.value]?.length > 0 && (
                <button
                  onClick={() => handleCopyDay(day.value)}
                  className="text-[#6bdcc0] hover:text-white transition-colors p-1 rounded hover:bg-[#6bdcc0]/20"
                  title={`Copy ${day.label} schedule to other days`}
                >
                  📋
                </button>
              )}
            </div>

            <div className="space-y-2">
              {groupedTemplates[day.value]?.map((template) => (
                <div
                  key={template.id}
                  className="bg-[#051028] rounded-lg p-3 border border-[#6bdcc0]/20"
                >
                  <div className="text-sm text-[#6bdcc0] font-medium">
                    {template.start_time} - {template.end_time}
                  </div>
                  {template.template_name && (
                    <div className="text-xs text-gray-300 mt-1">
                      {template.template_name}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    Max: {template.max_bookings} booking
                    {template.max_bookings !== 1 ? "s" : ""}
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {!groupedTemplates[day.value]?.length && (
                <div className="text-center text-gray-500 text-sm py-4">
                  No availability
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {templates.length > 0 && (
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-[#6bdcc0]/20 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-3">
            📊 Schedule Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-[#6bdcc0]">
                {templates.length}
              </div>
              <div className="text-sm text-gray-300">Total Slots</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#6bdcc0]">
                {new Set(templates.map((t) => t.day_of_week)).size}
              </div>
              <div className="text-sm text-gray-300">Active Days</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#6bdcc0]">
                {templates.reduce((sum, t) => sum + t.max_bookings, 0)}
              </div>
              <div className="text-sm text-gray-300">Weekly Capacity</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#6bdcc0]">UTC</div>
              <div className="text-sm text-gray-300">Timezone</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
