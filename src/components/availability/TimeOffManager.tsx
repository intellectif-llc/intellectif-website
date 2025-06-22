"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";

interface TimeOffPeriod {
  id: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  timeoff_type:
    | "vacation"
    | "sick"
    | "personal"
    | "conference"
    | "training"
    | "holiday";
  title: string;
  description?: string;
  is_approved: boolean;
}

const TIMEOFF_TYPES = [
  { value: "vacation", label: "Vacation", icon: "🏖️", color: "bg-blue-500" },
  { value: "sick", label: "Sick Leave", icon: "🤒", color: "bg-red-500" },
  { value: "personal", label: "Personal", icon: "👤", color: "bg-gray-500" },
  {
    value: "conference",
    label: "Conference",
    icon: "🎯",
    color: "bg-purple-500",
  },
  { value: "training", label: "Training", icon: "📚", color: "bg-green-500" },
  { value: "holiday", label: "Holiday", icon: "🎉", color: "bg-yellow-500" },
];

export default function TimeOffManager() {
  const [timeOffPeriods, setTimeOffPeriods] = useState<TimeOffPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTimeOff, setEditingTimeOff] = useState<TimeOffPeriod | null>(
    null
  );
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    timeoff_type: "vacation" as TimeOffPeriod["timeoff_type"],
    title: "",
    description: "",
    is_all_day: true,
  });

  useEffect(() => {
    fetchTimeOff();
  }, []);

  const fetchTimeOff = async () => {
    try {
      const response = await fetch("/api/availability/timeoff");
      if (response.ok) {
        const data = await response.json();
        setTimeOffPeriods(data.timeoff || []);
      } else {
        console.error("Error fetching timeoff");
      }
    } catch (error) {
      console.error("Error fetching timeoff:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = "/api/availability/timeoff";
      const method = editingTimeOff ? "PUT" : "POST";
      const body = {
        ...formData,
        start_time: formData.is_all_day ? null : formData.start_time,
        end_time: formData.is_all_day ? null : formData.end_time,
        id: editingTimeOff?.id,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchTimeOff();
        resetForm();
        toast.success(
          editingTimeOff
            ? "Time off updated successfully!"
            : "Time off added successfully!"
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save time off");
      }
    } catch (error) {
      console.error("Error saving time off:", error);
      toast.error("Failed to save time off");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this time off period?"))
      return;

    try {
      const response = await fetch(`/api/availability/timeoff?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchTimeOff();
        toast.success("Time off deleted successfully!");
      } else {
        toast.error("Failed to delete time off");
      }
    } catch (error) {
      console.error("Error deleting time off:", error);
      toast.error("Failed to delete time off");
    }
  };

  const handleEdit = (timeOff: TimeOffPeriod) => {
    setEditingTimeOff(timeOff);
    setFormData({
      start_date: timeOff.start_date,
      end_date: timeOff.end_date,
      start_time: timeOff.start_time || "",
      end_time: timeOff.end_time || "",
      timeoff_type: timeOff.timeoff_type,
      title: timeOff.title,
      description: timeOff.description || "",
      is_all_day: !timeOff.start_time,
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setEditingTimeOff(null);
    setShowAddForm(false);
    setFormData({
      start_date: "",
      end_date: "",
      start_time: "",
      end_time: "",
      timeoff_type: "vacation",
      title: "",
      description: "",
      is_all_day: true,
    });
  };

  const getTypeInfo = (type: string) => {
    return TIMEOFF_TYPES.find((t) => t.value === type) || TIMEOFF_TYPES[0];
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    // Parse dates as local dates to avoid timezone shifting
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");

    if (startDate === endDate) {
      return start.toLocaleDateString();
    }

    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6bdcc0]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Time Off Management
          </h2>
          <p className="text-gray-300">
            Schedule vacation, sick days, and other time off
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAddForm(true)}>
          + Add Time Off
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-[#6bdcc0]/20 shadow-xl">
          <h3 className="text-xl font-semibold text-white mb-4">
            {editingTimeOff ? "Edit Time Off" : "Add New Time Off"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={formData.timeoff_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      timeoff_type: e.target
                        .value as TimeOffPeriod["timeoff_type"],
                      title:
                        TIMEOFF_TYPES.find((t) => t.value === e.target.value)
                          ?.label || "",
                    })
                  }
                  className="w-full px-4 py-2 bg-[#051028] border border-[#6bdcc0]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]"
                >
                  {TIMEOFF_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* All Day Toggle */}
              <div className="flex items-center">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.is_all_day}
                    onChange={(e) =>
                      setFormData({ ...formData, is_all_day: e.target.checked })
                    }
                    className="w-5 h-5 text-[#6bdcc0] bg-[#051028] border-[#6bdcc0]/30 rounded focus:ring-[#6bdcc0]"
                  />
                  <span className="text-sm font-medium text-gray-300">
                    All Day
                  </span>
                </label>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 bg-[#051028] border border-[#6bdcc0]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 bg-[#051028] border border-[#6bdcc0]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]"
                />
              </div>

              {/* Start Time (if not all day) */}
              {!formData.is_all_day && (
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
              )}

              {/* End Time (if not all day) */}
              {!formData.is_all_day && (
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
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Summer Vacation, Doctor Appointment"
                required
                className="w-full px-4 py-2 bg-[#051028] border border-[#6bdcc0]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Additional details about your time off"
                rows={3}
                className="w-full px-4 py-2 bg-[#051028] border border-[#6bdcc0]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6bdcc0] resize-none"
              />
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" variant="primary">
                {editingTimeOff ? "Update Time Off" : "Add Time Off"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Time Off List */}
      <div className="space-y-4">
        {timeOffPeriods.length > 0 ? (
          timeOffPeriods.map((timeOff) => {
            const typeInfo = getTypeInfo(timeOff.timeoff_type);
            return (
              <div
                key={timeOff.id}
                className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-[#6bdcc0]/20 shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{typeInfo.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {timeOff.title}
                      </h3>
                      <div className="text-sm text-[#6bdcc0] mb-2">
                        {formatDateRange(timeOff.start_date, timeOff.end_date)}
                        {timeOff.start_time && timeOff.end_time && (
                          <span className="ml-2">
                            ({timeOff.start_time} - {timeOff.end_time})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`w-3 h-3 rounded-full ${typeInfo.color}`}
                        ></div>
                        <span className="text-sm text-gray-300">
                          {typeInfo.label}
                        </span>
                        {timeOff.is_approved && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                            ✓ Approved
                          </span>
                        )}
                      </div>
                      {timeOff.description && (
                        <p className="text-sm text-gray-400 mt-2">
                          {timeOff.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(timeOff)}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors px-3 py-1 rounded hover:bg-blue-500/20"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(timeOff.id)}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors px-3 py-1 rounded hover:bg-red-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 border border-[#6bdcc0]/20 shadow-xl text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No Time Off Scheduled
            </h3>
            <p className="text-gray-300 mb-4">
              You haven&apos;t scheduled any time off yet. Add your vacation
              days, sick leave, or other time off periods.
            </p>
            <Button variant="primary" onClick={() => setShowAddForm(true)}>
              Add Your First Time Off
            </Button>
          </div>
        )}
      </div>

      {/* Types Legend */}
      <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-[#6bdcc0]/20 shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-4">
          📋 Time Off Types
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {TIMEOFF_TYPES.map((type) => (
            <div key={type.value} className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${type.color}`}></div>
              <span className="text-lg">{type.icon}</span>
              <span className="text-sm text-gray-300">{type.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
