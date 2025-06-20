"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";

interface AvailabilityBreak {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_type: "break" | "lunch" | "meeting" | "buffer" | "personal";
  title: string;
  is_recurring: boolean;
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

const BREAK_TYPES = [
  { value: "break", label: "Break", icon: "☕", color: "bg-blue-500" },
  { value: "lunch", label: "Lunch", icon: "🍽️", color: "bg-green-500" },
  { value: "meeting", label: "Meeting", icon: "👥", color: "bg-purple-500" },
  { value: "buffer", label: "Buffer Time", icon: "⏱️", color: "bg-yellow-500" },
  { value: "personal", label: "Personal", icon: "🏠", color: "bg-pink-500" },
];

export default function BreakManager() {
  const [breaks, setBreaks] = useState<AvailabilityBreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBreak, setEditingBreak] = useState<AvailabilityBreak | null>(
    null
  );
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceDay, setCopySourceDay] = useState<number | null>(null);
  const [selectedTargetDays, setSelectedTargetDays] = useState<number[]>([]);
  const [copyLoading, setCopyLoading] = useState(false);
  const [formData, setFormData] = useState<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    break_type: "break" | "lunch" | "meeting" | "buffer" | "personal";
    title: string;
    is_recurring: boolean;
  }>({
    day_of_week: 1,
    start_time: "12:00",
    end_time: "13:00",
    break_type: "lunch",
    title: "Lunch Break",
    is_recurring: true,
  });

  useEffect(() => {
    fetchBreaks();
  }, []);

  const fetchBreaks = async () => {
    try {
      const response = await fetch("/api/availability/breaks");
      if (response.ok) {
        const data = await response.json();
        setBreaks(data.breaks || []);
      }
    } catch (error) {
      console.error("Error fetching breaks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = "/api/availability/breaks";
      const method = editingBreak ? "PUT" : "POST";
      const body = editingBreak
        ? { ...formData, id: editingBreak.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchBreaks();
        resetForm();
        toast.success(
          editingBreak
            ? "Break updated successfully!"
            : "Break added successfully!"
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save break");
      }
    } catch (error) {
      console.error("Error saving break:", error);
      toast.error("Failed to save break");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this break?")) return;

    try {
      const response = await fetch(`/api/availability/breaks?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchBreaks();
        toast.success("Break deleted successfully!");
      } else {
        toast.error("Failed to delete break");
      }
    } catch (error) {
      console.error("Error deleting break:", error);
      toast.error("Failed to delete break");
    }
  };

  const handleEdit = (breakRecord: AvailabilityBreak) => {
    setEditingBreak(breakRecord);
    setFormData({
      day_of_week: breakRecord.day_of_week,
      start_time: breakRecord.start_time,
      end_time: breakRecord.end_time,
      break_type: breakRecord.break_type,
      title: breakRecord.title,
      is_recurring: breakRecord.is_recurring,
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setEditingBreak(null);
    setShowAddForm(false);
    setFormData({
      day_of_week: 1,
      start_time: "12:00",
      end_time: "13:00",
      break_type: "lunch",
      title: "Lunch Break",
      is_recurring: true,
    });
  };

  const groupBreaksByDay = () => {
    const grouped: { [key: number]: AvailabilityBreak[] } = {};
    breaks.forEach((breakRecord) => {
      if (!grouped[breakRecord.day_of_week]) {
        grouped[breakRecord.day_of_week] = [];
      }
      grouped[breakRecord.day_of_week].push(breakRecord);
    });
    return grouped;
  };

  const getBreakTypeInfo = (type: string) => {
    return BREAK_TYPES.find((bt) => bt.value === type) || BREAK_TYPES[0];
  };

  const copyDayToOthers = async (sourceDay: number, targetDays: number[]) => {
    if (targetDays.length === 0) return;

    setCopyLoading(true);
    const toastId = toast.loading("Copying breaks...");

    try {
      const response = await fetch("/api/availability/breaks/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_day: sourceDay,
          target_days: targetDays,
        }),
      });

      if (response.ok) {
        await fetchBreaks();

        toast.success(
          `Successfully copied ${
            DAYS_OF_WEEK.find((d) => d.value === sourceDay)?.label
          } breaks to ${targetDays.length} day(s)`,
          { id: toastId }
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to copy breaks", { id: toastId });
      }
    } catch (error) {
      console.error("Error copying breaks:", error);
      toast.error("Failed to copy breaks", { id: toastId });
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

  const groupedBreaks = groupBreaksByDay();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Break Management
          </h2>
          <p className="text-gray-300">
            Define breaks within your daily availability
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAddForm(true)}>
          + Add Break
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-[#6bdcc0]/20 shadow-xl">
          <h3 className="text-xl font-semibold text-white mb-4">
            {editingBreak ? "Edit Break" : "Add New Break"}
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

              {/* Break Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Break Type
                </label>
                <select
                  value={formData.break_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      break_type: e.target
                        .value as AvailabilityBreak["break_type"],
                      title:
                        BREAK_TYPES.find((bt) => bt.value === e.target.value)
                          ?.label || "Break",
                    })
                  }
                  className="w-full px-4 py-2 bg-[#051028] border border-[#6bdcc0]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]"
                >
                  {BREAK_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
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

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Break Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Lunch Break, Team Meeting"
                className="w-full px-4 py-2 bg-[#051028] border border-[#6bdcc0]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]"
              />
            </div>

            {/* Recurring */}
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_recurring}
                  onChange={(e) =>
                    setFormData({ ...formData, is_recurring: e.target.checked })
                  }
                  className="w-5 h-5 text-[#6bdcc0] bg-[#051028] border-[#6bdcc0]/30 rounded focus:ring-[#6bdcc0]"
                />
                <span className="text-sm font-medium text-gray-300">
                  Recurring (applies every week)
                </span>
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" variant="primary">
                {editingBreak ? "Update Break" : "Add Break"}
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
              Breaks
            </h3>
            <p className="text-gray-300 mb-4">
              Select the days you want to copy these breaks to:
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

      {/* Weekly Breaks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day.value}
            className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-4 border border-[#6bdcc0]/20 shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">{day.short}</h3>
              {groupedBreaks[day.value]?.length > 0 && (
                <button
                  onClick={() => handleCopyDay(day.value)}
                  className="text-[#6bdcc0] hover:text-white transition-colors p-1 rounded hover:bg-[#6bdcc0]/20"
                  title={`Copy ${day.label} breaks to other days`}
                >
                  📋
                </button>
              )}
            </div>

            <div className="space-y-2">
              {groupedBreaks[day.value]?.map((breakRecord) => {
                const typeInfo = getBreakTypeInfo(breakRecord.break_type);
                return (
                  <div
                    key={breakRecord.id}
                    className="bg-[#051028] rounded-lg p-3 border border-[#6bdcc0]/20"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{typeInfo.icon}</span>
                      <div className="text-sm text-[#6bdcc0] font-medium">
                        {breakRecord.start_time} - {breakRecord.end_time}
                      </div>
                    </div>

                    <div className="text-sm text-white mb-1">
                      {breakRecord.title}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`w-2 h-2 rounded-full ${typeInfo.color}`}
                      ></div>
                      <div className="text-xs text-gray-400">
                        {typeInfo.label}
                      </div>
                      {breakRecord.is_recurring && (
                        <div className="text-xs text-blue-400">🔄 Weekly</div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleEdit(breakRecord)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(breakRecord.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}

              {!groupedBreaks[day.value]?.length && (
                <div className="text-center text-gray-500 text-sm py-4">
                  No breaks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Break Types Legend */}
      <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-[#6bdcc0]/20 shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-4">
          📋 Break Types
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {BREAK_TYPES.map((type) => (
            <div key={type.value} className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${type.color}`}></div>
              <span className="text-lg">{type.icon}</span>
              <span className="text-sm text-gray-300">{type.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      {breaks.length > 0 && (
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-[#6bdcc0]/20 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-3">
            📊 Break Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-[#6bdcc0]">
                {breaks.length}
              </div>
              <div className="text-sm text-gray-300">Total Breaks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#6bdcc0]">
                {breaks.filter((b) => b.is_recurring).length}
              </div>
              <div className="text-sm text-gray-300">Recurring</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#6bdcc0]">
                {new Set(breaks.map((b) => b.day_of_week)).size}
              </div>
              <div className="text-sm text-gray-300">Active Days</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#6bdcc0]">
                {Math.round(
                  (breaks.reduce((total, b) => {
                    const start = new Date(`1970-01-01T${b.start_time}`);
                    const end = new Date(`1970-01-01T${b.end_time}`);
                    return (
                      total + (end.getTime() - start.getTime()) / (1000 * 60)
                    );
                  }, 0) /
                    60) *
                    10
                ) / 10}
                h
              </div>
              <div className="text-sm text-gray-300">Weekly Break Time</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
