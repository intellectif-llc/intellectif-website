"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Booking {
  id: string;
  booking_reference: string;
  scheduled_date: string;
  scheduled_time: string;
  scheduled_datetime?: string;
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
    id?: string;
  };
  consultant_id?: string;
  created_at: string;
  payment_status: string;
  payment_amount?: number;
  // Google Meet integration fields
  meeting_url?: string;
  meeting_platform?: string;
  google_calendar_event_id?: string;
  google_calendar_link?: string;
}

interface UserProfile {
  id: string;
  is_staff: boolean;
  role: string;
  first_name?: string;
  last_name?: string;
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

const ASSIGNMENT_INDICATORS = {
  mine: { icon: "👤", label: "My Booking", color: "text-green-400" },
  others: { icon: "👥", label: "Team Member", color: "text-blue-400" },
  unassigned: { icon: "❓", label: "Unassigned", color: "text-orange-400" },
  auto: { icon: "🤖", label: "Auto-assigned", color: "text-purple-400" },
};

type BookingView = "my" | "team" | "unassigned" | "all";

export default function BookingManager() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [bookingView, setBookingView] = useState<BookingView>("my");
  const [accessDenied, setAccessDenied] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Fetch user profile to determine role and permissions
  const fetchUserProfile = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setUserProfile({
          id: user.id,
          is_staff: data.profile?.is_staff || false,
          role: data.profile?.role || "customer",
          first_name: data.profile?.first_name,
          last_name: data.profile?.last_name,
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  }, [user]);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);

      // Build query parameters based on view and user permissions
      const params = new URLSearchParams();

      if (userProfile?.is_staff) {
        // Staff users can choose their view
        switch (bookingView) {
          case "my":
            params.append("consultant_id", user!.id);
            break;
          case "unassigned":
            params.append("unassigned", "true");
            break;
          case "team":
          case "all":
            // No additional params - get all bookings
            break;
        }
      } else {
        // Non-staff users only see their own bookings
        params.append("consultant_id", user!.id);
      }

      const url = `/api/bookings${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const response = await fetch(url);

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
          .catch(() => ({ error: "Network error" }));
        console.error("Failed to fetch bookings:", errorData);
        const errorMessage =
          errorData.details || errorData.error || "Unknown error";
        toast.error(`Failed to load bookings: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Network error while loading bookings");
    } finally {
      setLoading(false);
    }
  }, [bookingView, userProfile, user]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    if (userProfile) {
      fetchBookings();
    }
  }, [fetchBookings, userProfile]);

  const getAssignmentStatus = (booking: Booking) => {
    if (!booking.consultant_id) {
      return ASSIGNMENT_INDICATORS.unassigned;
    }
    if (booking.consultant_id === user?.id) {
      return ASSIGNMENT_INDICATORS.mine;
    }
    if (
      booking.consultant?.first_name === "Auto-assigned" ||
      !booking.consultant?.first_name
    ) {
      return ASSIGNMENT_INDICATORS.auto;
    }
    return ASSIGNMENT_INDICATORS.others;
  };

  const getMeetingStatus = (booking: Booking) => {
    const now = new Date();
    const bookingDateTime = new Date(
      booking.scheduled_datetime ||
        `${booking.scheduled_date}T${booking.scheduled_time}:00`
    );
    const endDateTime = new Date(
      bookingDateTime.getTime() + booking.service.duration_minutes * 60000
    );

    if (now < bookingDateTime) {
      return { status: "upcoming", color: "text-blue-400", icon: "🕐" };
    } else if (now >= bookingDateTime && now <= endDateTime) {
      return { status: "active", color: "text-green-400", icon: "🔴" };
    } else {
      return { status: "past", color: "text-gray-400", icon: "✅" };
    }
  };

  const getMeetingTimeStatus = (booking: Booking) => {
    const now = new Date();
    const bookingDateTime = new Date(
      booking.scheduled_datetime ||
        `${booking.scheduled_date}T${booking.scheduled_time}:00`
    );
    const diffMinutes = Math.floor(
      (bookingDateTime.getTime() - now.getTime()) / 60000
    );

    if (diffMinutes <= 0) {
      return { text: "Meeting time", urgent: false };
    } else if (diffMinutes <= 15) {
      return { text: `Starting in ${diffMinutes}m`, urgent: true };
    } else if (diffMinutes <= 60) {
      return { text: `Starting in ${diffMinutes}m`, urgent: false };
    } else {
      return {
        text: `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`,
        urgent: false,
      };
    }
  };

  const formatDateTime = (date: string, time: string) => {
    try {
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

  const getViewStats = () => {
    const myBookings = bookings.filter((b) => b.consultant_id === user?.id);
    const unassignedBookings = bookings.filter((b) => !b.consultant_id);
    const teamBookings = bookings.filter(
      (b) => b.consultant_id && b.consultant_id !== user?.id
    );

    return {
      my: myBookings.length,
      unassigned: unassignedBookings.length,
      team: teamBookings.length,
      all: bookings.length,
    };
  };

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

  const stats = getViewStats();
  const isAdmin = userProfile?.role === "admin";

  return (
    <div className="space-y-6">
      {/* Professional Header with Role-Based Views */}
      <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border border-[#6bdcc0]/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Booking Management
            </h2>
            <p className="text-gray-300">
              {isAdmin
                ? "Manage all bookings and assignments"
                : "View and manage your assigned bookings"}
            </p>
          </div>

          {/* View Selector for Staff */}
          {userProfile?.is_staff && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setBookingView("my")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  bookingView === "my"
                    ? "bg-[#6bdcc0] text-[#051028]"
                    : "bg-[#051028] text-gray-300 hover:text-white border border-[#6bdcc0]/30"
                }`}
              >
                👤 My Bookings ({stats.my})
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={() => setBookingView("unassigned")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      bookingView === "unassigned"
                        ? "bg-orange-500 text-white"
                        : "bg-[#051028] text-gray-300 hover:text-white border border-orange-500/30"
                    }`}
                  >
                    ❓ Unassigned ({stats.unassigned})
                  </button>

                  <button
                    onClick={() => setBookingView("team")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      bookingView === "team"
                        ? "bg-blue-500 text-white"
                        : "bg-[#051028] text-gray-300 hover:text-white border border-blue-500/30"
                    }`}
                  >
                    👥 Team ({stats.team})
                  </button>

                  <button
                    onClick={() => setBookingView("all")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      bookingView === "all"
                        ? "bg-purple-500 text-white"
                        : "bg-[#051028] text-gray-300 hover:text-white border border-purple-500/30"
                    }`}
                  >
                    📊 All Bookings ({stats.all})
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-xl p-4 border border-[#6bdcc0]/20">
          <div className="text-2xl font-bold text-[#6bdcc0]">
            {filteredBookings.length}
          </div>
          <div className="text-sm text-gray-300">Current View</div>
        </div>
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/20">
          <div className="text-2xl font-bold text-yellow-400">
            {
              filteredBookings.filter(
                (b) => b.status === "pending" || b.status === "confirmed"
              ).length
            }
          </div>
          <div className="text-sm text-gray-300">Active</div>
        </div>
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-xl p-4 border border-green-500/20">
          <div className="text-2xl font-bold text-green-400">
            {filteredBookings.filter((b) => b.status === "completed").length}
          </div>
          <div className="text-sm text-gray-300">Completed</div>
        </div>
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-xl p-4 border border-orange-500/20">
          <div className="text-2xl font-bold text-orange-400">
            {bookingView === "all"
              ? stats.unassigned
              : filteredBookings.filter((b) => !b.consultant_id).length}
          </div>
          <div className="text-sm text-gray-300">Unassigned</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-300">Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1 bg-[#051028] border border-[#6bdcc0]/30 rounded text-white text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button
          onClick={fetchBookings}
          className="px-3 py-1 bg-[#6bdcc0]/20 border border-[#6bdcc0]/30 rounded text-[#6bdcc0] text-sm hover:bg-[#6bdcc0]/30 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Professional Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-6xl mb-4">
              {bookingView === "my"
                ? "👤"
                : bookingView === "unassigned"
                  ? "❓"
                  : "📅"}
            </div>
            <p className="text-lg">
              No{" "}
              {bookingView === "my"
                ? "assigned"
                : bookingView === "unassigned"
                  ? "unassigned"
                  : ""}{" "}
              bookings found
            </p>
            {bookingView === "my" && (
              <p className="text-sm text-gray-500 mt-2">
                Bookings assigned to you will appear here
              </p>
            )}
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const dateTime = formatDateTime(
              booking.scheduled_date,
              booking.scheduled_time
            );
            const assignment = getAssignmentStatus(booking);

            return (
              <div
                key={booking.id}
                className={`bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border transition-all cursor-pointer ${
                  assignment === ASSIGNMENT_INDICATORS.mine
                    ? "border-[#6bdcc0]/40 hover:border-[#6bdcc0]/60"
                    : assignment === ASSIGNMENT_INDICATORS.unassigned
                      ? "border-orange-500/40 hover:border-orange-500/60"
                      : "border-[#6bdcc0]/20 hover:border-[#6bdcc0]/40"
                }`}
                onClick={() => {
                  setSelectedBooking(booking);
                  setShowDetails(true);
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
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
                      <span
                        className={`px-2 py-1 rounded-full text-xs border border-current ${assignment.color}`}
                      >
                        {assignment.icon} {assignment.label}
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
                        <span className="text-gray-400">Meeting:</span>
                        {(() => {
                          const meetingStatus = getMeetingStatus(booking);
                          const timeStatus = getMeetingTimeStatus(booking);
                          return (
                            <>
                              <p
                                className={`font-medium ${meetingStatus.color}`}
                              >
                                {meetingStatus.icon} {meetingStatus.status}
                              </p>
                              <p
                                className={`text-sm ${
                                  timeStatus.urgent
                                    ? "text-orange-400 animate-pulse"
                                    : "text-gray-300"
                                }`}
                              >
                                {timeStatus.text}
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meeting Action Buttons */}
                {booking.meeting_url && (
                  <div className="mt-4 pt-4 border-t border-gray-600/30 flex gap-2">
                    <a
                      href={booking.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      🎥 Join Meeting
                    </a>
                    {booking.google_calendar_link && (
                      <a
                        href={booking.google_calendar_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        📅 Calendar
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(
                          booking.meeting_url || ""
                        );
                        toast.success("Meeting URL copied to clipboard!");
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      📋 Copy URL
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Enhanced Booking Details Modal */}
      {showDetails && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#051028] rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#6bdcc0]/30">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  Booking Details - {selectedBooking.booking_reference}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  {(() => {
                    const assignment = getAssignmentStatus(selectedBooking);
                    return (
                      <span
                        className={`px-3 py-1 rounded-full text-sm border border-current ${assignment.color}`}
                      >
                        {assignment.icon} {assignment.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Customer Information */}
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

              {/* Appointment Details */}
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
                  <div>
                    <span className="text-gray-400">Assigned Consultant:</span>
                    <span className="text-white ml-2">
                      {selectedBooking.consultant
                        ? `${selectedBooking.consultant.first_name} ${selectedBooking.consultant.last_name}`
                        : "Unassigned"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Meeting Information */}
              <div>
                <h4 className="text-lg font-semibold text-[#6bdcc0] mb-3">
                  Meeting Information
                </h4>
                <div className="space-y-3">
                  {/* Meeting Status */}
                  <div className="flex items-center gap-3">
                    {(() => {
                      const meetingStatus = getMeetingStatus(selectedBooking);
                      const timeStatus = getMeetingTimeStatus(selectedBooking);
                      return (
                        <>
                          <span
                            className={`px-3 py-1 rounded-full text-sm border border-current ${meetingStatus.color}`}
                          >
                            {meetingStatus.icon} {meetingStatus.status}
                          </span>
                          <span
                            className={`text-sm ${
                              timeStatus.urgent
                                ? "text-orange-400 font-semibold"
                                : "text-gray-300"
                            }`}
                          >
                            {timeStatus.text}
                          </span>
                        </>
                      );
                    })()}
                  </div>

                  {/* Meeting Platform */}
                  <div>
                    <span className="text-gray-400">Platform:</span>
                    <span className="text-white ml-2">
                      {selectedBooking.meeting_platform || "Google Meet"}
                      {selectedBooking.google_calendar_event_id &&
                        " (Google Calendar)"}
                    </span>
                  </div>

                  {/* Meeting URL */}
                  {selectedBooking.meeting_url && (
                    <div>
                      <span className="text-gray-400">Meeting URL:</span>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-white text-sm font-mono bg-[#1e293b] px-2 py-1 rounded truncate max-w-xs">
                          {selectedBooking.meeting_url}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              selectedBooking.meeting_url || ""
                            );
                            toast.success("Meeting URL copied to clipboard!");
                          }}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Meeting Actions */}
                  <div className="flex gap-2 pt-2">
                    {selectedBooking.meeting_url && (
                      <a
                        href={selectedBooking.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        🎥 Join Meeting
                      </a>
                    )}
                    {selectedBooking.google_calendar_link && (
                      <a
                        href={selectedBooking.google_calendar_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        📅 Open Calendar
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Project Description */}
              <div>
                <h4 className="text-lg font-semibold text-[#6bdcc0] mb-3">
                  Project Description
                </h4>
                <div className="bg-[#1e293b] rounded-lg p-4 text-white text-sm">
                  {selectedBooking.project_description}
                </div>
              </div>

              {/* Action Buttons */}
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
                  📧 Email Customer
                </button>
                {isAdmin && selectedBooking.consultant_id !== user?.id && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          `/api/bookings/${selectedBooking.id}`,
                          {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "assign_to_me" }),
                          }
                        );

                        if (response.ok) {
                          const data = await response.json();
                          toast.success(`✅ ${data.message}`);

                          // Update the booking in state
                          setSelectedBooking({
                            ...selectedBooking,
                            consultant_id: user!.id,
                            consultant: {
                              first_name: userProfile?.first_name || "You",
                              last_name: userProfile?.last_name || "",
                            },
                          });

                          // Refresh the bookings list
                          fetchBookings();
                        } else {
                          const errorData = await response.json();
                          toast.error(`❌ ${errorData.error}`);
                        }
                      } catch (error) {
                        console.error("Assignment error:", error);
                        toast.error("❌ Failed to assign booking");
                      }
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    👤 Assign to Me
                  </button>
                )}
                {isAdmin && selectedBooking.consultant_id && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          `/api/bookings/${selectedBooking.id}`,
                          {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "unassign" }),
                          }
                        );

                        if (response.ok) {
                          const data = await response.json();
                          toast.success(`✅ ${data.message}`);

                          // Update the booking in state
                          setSelectedBooking({
                            ...selectedBooking,
                            consultant_id: undefined,
                            consultant: undefined,
                          });

                          // Refresh the bookings list
                          fetchBookings();
                        } else {
                          const errorData = await response.json();
                          toast.error(`❌ ${errorData.error}`);
                        }
                      } catch (error) {
                        console.error("Unassignment error:", error);
                        toast.error("❌ Failed to unassign booking");
                      }
                    }}
                    className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                  >
                    ❌ Unassign
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
