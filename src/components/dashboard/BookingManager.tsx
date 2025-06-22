"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

interface Booking {
  id: string;
  booking_reference: string;
  scheduled_date: string;
  scheduled_time: string;
  status:
    | "pending"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "no_show"
    | "rescheduled";
  customer_data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    company?: string;
  };
  project_description: string;
  service: {
    name: string;
    duration_minutes: number;
  };
  consultant?: {
    first_name: string;
    last_name: string;
  };
  created_at: string;
  payment_status: string;
  payment_amount?: number;
}

const STATUS_COLORS = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  confirmed: "bg-green-500/20 text-green-300 border-green-500/30",
  in_progress: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  completed: "bg-green-600/20 text-green-400 border-green-600/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
  no_show: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  rescheduled: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

const STATUS_ICONS = {
  pending: "⏳",
  confirmed: "✅",
  in_progress: "🔄",
  completed: "✨",
  cancelled: "❌",
  no_show: "👻",
  rescheduled: "📅",
};

export default function BookingManager() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/bookings");

      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      } else if (response.status === 401) {
        console.error("Unauthorized: User is not staff");
        setAccessDenied(true);
        toast.error("Access denied: Staff permissions required");
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("Failed to fetch bookings:", errorData);
        toast.error(
          `Failed to load bookings: ${errorData.error || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Network error while loading bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const formatDateTime = (date: string, time: string) => {
    try {
      // Parse as local date to avoid timezone shifting
      const dateObj = new Date(date + "T" + time);
      return {
        date: dateObj.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        time: dateObj.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        full: dateObj.toLocaleString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      };
    } catch (error) {
      console.error("Error formatting date/time:", error);
      return {
        date: "Invalid Date",
        time: "Invalid Time",
        full: "Invalid DateTime",
      };
    }
  };

  const filteredBookings = bookings.filter(
    (booking) => filterStatus === "all" || booking.status === filterStatus
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6bdcc0]"></div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
        <p className="text-gray-400 mb-6">
          You need staff permissions to access the booking management system.
        </p>
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border border-[#6bdcc0]/20 max-w-md mx-auto">
          <h4 className="text-lg font-semibold text-[#6bdcc0] mb-3">
            To get access:
          </h4>
          <ol className="text-left text-gray-300 space-y-2">
            <li>1. Contact your administrator</li>
            <li>2. Request staff permissions for your account</li>
            <li>3. They will need to run a SQL script to promote your user</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-xl p-4 border border-[#6bdcc0]/20">
          <div className="text-2xl font-bold text-[#6bdcc0]">
            {bookings.length}
          </div>
          <div className="text-sm text-gray-300">Total Bookings</div>
        </div>
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-xl p-4 border border-[#6bdcc0]/20">
          <div className="text-2xl font-bold text-yellow-400">
            {
              bookings.filter(
                (b) => b.status === "pending" || b.status === "confirmed"
              ).length
            }
          </div>
          <div className="text-sm text-gray-300">Active Bookings</div>
        </div>
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-xl p-4 border border-[#6bdcc0]/20">
          <div className="text-2xl font-bold text-green-400">
            {bookings.filter((b) => b.status === "completed").length}
          </div>
          <div className="text-sm text-gray-300">Completed</div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-xl p-4 border border-[#6bdcc0]/20">
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-300">Filter by Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1 bg-[#051028] border border-[#6bdcc0]/30 rounded text-white text-sm"
          >
            <option value="all">All Bookings</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={fetchBookings}
            className="px-3 py-1 bg-[#6bdcc0]/20 border border-[#6bdcc0]/30 rounded text-[#6bdcc0] text-sm hover:bg-[#6bdcc0]/30 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-lg">No bookings found</p>
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const dateTime = formatDateTime(
              booking.scheduled_date,
              booking.scheduled_time
            );
            return (
              <div
                key={booking.id}
                className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border border-[#6bdcc0]/20 hover:border-[#6bdcc0]/40 transition-all cursor-pointer"
                onClick={() => {
                  setSelectedBooking(booking);
                  setShowDetails(true);
                }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-semibold text-white">
                        {booking.booking_reference}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs border ${
                          STATUS_COLORS[booking.status]
                        }`}
                      >
                        {STATUS_ICONS[booking.status]}{" "}
                        {booking.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Customer:</span>
                        <p className="text-white font-medium">
                          {booking.customer_data.firstName}{" "}
                          {booking.customer_data.lastName}
                        </p>
                        <p className="text-gray-300">
                          {booking.customer_data.email}
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-400">Service:</span>
                        <p className="text-white font-medium">
                          {booking.service.name}
                        </p>
                        <p className="text-gray-300">
                          {booking.service.duration_minutes} minutes
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-400">Date & Time:</span>
                        <p className="text-white font-medium">
                          {dateTime.date}
                        </p>
                        <p className="text-[#6bdcc0]">{dateTime.time}</p>
                      </div>

                      <div>
                        <span className="text-gray-400">Consultant:</span>
                        <p className="text-white font-medium">
                          {booking.consultant
                            ? `${booking.consultant.first_name} ${booking.consultant.last_name}`
                            : "Auto-assigned"}
                        </p>
                        <p className="text-gray-300">
                          {booking.payment_amount
                            ? `$${booking.payment_amount}`
                            : "Free"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Booking Details Modal */}
      {showDetails && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#051028] rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#6bdcc0]/30">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">
                Booking Details - {selectedBooking.booking_reference}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-[#6bdcc0] mb-3">
                    Customer Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white ml-2">
                        {selectedBooking.customer_data.firstName}{" "}
                        {selectedBooking.customer_data.lastName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white ml-2">
                        {selectedBooking.customer_data.email}
                      </span>
                    </div>
                    {selectedBooking.customer_data.phone && (
                      <div>
                        <span className="text-gray-400">Phone:</span>
                        <span className="text-white ml-2">
                          {selectedBooking.customer_data.phone}
                        </span>
                      </div>
                    )}
                    {selectedBooking.customer_data.company && (
                      <div>
                        <span className="text-gray-400">Company:</span>
                        <span className="text-white ml-2">
                          {selectedBooking.customer_data.company}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-[#6bdcc0] mb-3">
                    Appointment Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-400">Service:</span>
                      <span className="text-white ml-2">
                        {selectedBooking.service.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Duration:</span>
                      <span className="text-white ml-2">
                        {selectedBooking.service.duration_minutes} minutes
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Date & Time:</span>
                      <span className="text-white ml-2">
                        {
                          formatDateTime(
                            selectedBooking.scheduled_date,
                            selectedBooking.scheduled_time
                          ).full
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Status:</span>
                      <span
                        className={`ml-2 px-2 py-1 rounded text-xs ${
                          STATUS_COLORS[selectedBooking.status]
                        }`}
                      >
                        {STATUS_ICONS[selectedBooking.status]}{" "}
                        {selectedBooking.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-[#6bdcc0] mb-3">
                  Project Description
                </h4>
                <div className="bg-[#1e293b] rounded-lg p-4 text-white text-sm">
                  {selectedBooking.project_description}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#6bdcc0]/20">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    window.open(
                      `mailto:${selectedBooking.customer_data.email}`,
                      "_blank"
                    );
                  }}
                  className="px-4 py-2 bg-[#6bdcc0] text-[#051028] rounded hover:bg-[#6bdcc0]/90 transition-colors"
                >
                  Email Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
