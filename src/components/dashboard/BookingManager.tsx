"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
// Note: Currently using direct API calls instead of centralized hooks due to RLS policy conflicts
import { BookingData } from "@/lib/booking-service";

// Use centralized BookingData type
type Booking = BookingData;

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
      }
      // Note: Non-staff users (customers/consultants) are handled automatically by the API

      const url = `/api/bookings${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
        setAccessDenied(false); // Reset access denied state on successful fetch
      } else if (response.status === 401) {
        console.error("Unauthorized: Authentication required");
        setAccessDenied(true);
        toast.error("Authentication required");
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Network error" }));
        console.error("Failed to fetch bookings:", errorData);

        // Handle different error scenarios
        let errorMessage = "Unknown error occurred";
        if (errorData.details && typeof errorData.details === "string") {
          errorMessage = errorData.details;
        } else if (errorData.error && typeof errorData.error === "string") {
          errorMessage = errorData.error;
        } else if (response.status === 500) {
          errorMessage = "Database error - please try again or contact support";
        } else if (response.status === 403) {
          errorMessage = "Access denied - insufficient permissions";
        }

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
      bookingDateTime.getTime() +
        (booking.service?.duration_minutes || 60) * 60000
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

  // Note: Removed unused isMeetingAccessible function

  const getMeetingAccessStatus = (booking: Booking) => {
    const now = new Date();
    const bookingDateTime = new Date(
      booking.scheduled_datetime ||
        `${booking.scheduled_date}T${booking.scheduled_time}:00`
    );
    const accessStartTime = new Date(bookingDateTime.getTime() - 15 * 60000); // 15 minutes before
    const endDateTime = new Date(
      bookingDateTime.getTime() +
        (booking.service?.duration_minutes || 60) * 60000
    );
    const graceEndTime = new Date(endDateTime.getTime() + 30 * 60000); // 30 minute grace period

    if (!booking.meeting_url) {
      return {
        canJoin: false,
        message: "Meeting link not available",
        color: "text-gray-400",
        hideJoinButton: false,
      };
    }

    if (booking.status !== "confirmed") {
      return {
        canJoin: false,
        message: "Meeting not confirmed",
        color: "text-yellow-400",
        hideJoinButton: false,
      };
    }

    if (now < accessStartTime) {
      const minutesUntilAccess = Math.floor(
        (accessStartTime.getTime() - now.getTime()) / 60000
      );
      if (minutesUntilAccess > 60) {
        const hoursUntilAccess = Math.floor(minutesUntilAccess / 60);
        return {
          canJoin: false,
          message: `Available in ${hoursUntilAccess}h ${
            minutesUntilAccess % 60
          }m`,
          color: "text-blue-400",
          hideJoinButton: false,
        };
      }
      return {
        canJoin: false,
        message: `Available in ${minutesUntilAccess}m`,
        color: "text-blue-400",
        hideJoinButton: false,
      };
    }

    if (now >= accessStartTime && now <= bookingDateTime) {
      return {
        canJoin: true,
        message: "Ready to join",
        color: "text-green-400",
        hideJoinButton: false,
      };
    }

    if (now > bookingDateTime && now <= endDateTime) {
      return {
        canJoin: true,
        message: "Meeting in progress",
        color: "text-green-400",
        hideJoinButton: false,
      };
    }

    // NEW: Grace period for late arrivals or technical issues
    if (now > endDateTime && now <= graceEndTime) {
      const minutesLeft = Math.floor(
        (graceEndTime.getTime() - now.getTime()) / 60000
      );
      return {
        canJoin: true,
        message: `Grace period: ${minutesLeft}m remaining`,
        color: "text-orange-400",
        hideJoinButton: false,
      };
    }

    // After grace period - completely hide join button
    if (now > graceEndTime) {
      return {
        canJoin: false,
        message: "Meeting ended",
        color: "text-gray-400",
        hideJoinButton: true,
      };
    }

    return {
      canJoin: false,
      message: "Meeting not accessible",
      color: "text-gray-400",
      hideJoinButton: false,
    };
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
        <h3 className="text-xl font-semibold text-white mb-2">
          Authentication Required
        </h3>
        <p className="text-gray-400 mb-6">
          Please sign in to view your bookings and consultations.
        </p>
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border border-[#6bdcc0]/20 max-w-md mx-auto">
          <h4 className="text-lg font-semibold text-[#6bdcc0] mb-3">
            To access your bookings:
          </h4>
          <ol className="text-left text-gray-300 space-y-2">
            <li>1. Make sure you&apos;re signed in to your account</li>
            <li>2. Use the same email address you used for booking</li>
            <li>3. Contact support if you continue having issues</li>
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
              {userProfile?.is_staff ? "Booking Management" : "My Bookings"}
            </h2>
            <p className="text-gray-300">
              {userProfile?.is_staff
                ? isAdmin
                  ? "Manage all bookings and assignments"
                  : "View and manage your assigned bookings"
                : "View your scheduled consultations and meetings"}
            </p>
          </div>

          {/* View Selector for Staff Only */}
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
                      {/* Only show assignment indicator to staff */}
                      {userProfile?.is_staff && (
                        <span
                          className={`px-2 py-1 rounded-full text-xs border border-current ${assignment.color}`}
                        >
                          {assignment.icon} {assignment.label}
                        </span>
                      )}
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
                          {booking.service?.name || "Unknown Service"}
                        </p>
                        <p className="text-gray-300">
                          {booking.service?.duration_minutes || 60} minutes
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
                  <div className="mt-4 pt-4 border-t border-gray-600/30">
                    {(() => {
                      const meetingAccess = getMeetingAccessStatus(booking);
                      return (
                        <div className="space-y-3">
                          {/* Meeting Status Indicator */}
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${meetingAccess.color}`}
                            >
                              🎥 {meetingAccess.message}
                            </span>
                            {booking.status === "confirmed" && (
                              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                                ✅ Confirmed
                              </span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 flex-wrap">
                            {(() => {
                              const meetingAccess =
                                getMeetingAccessStatus(booking);
                              return (
                                <>
                                  {!meetingAccess.hideJoinButton &&
                                    (meetingAccess.canJoin ? (
                                      <a
                                        href={booking.meeting_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 animate-pulse"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        🎥 Join Meeting
                                      </a>
                                    ) : (
                                      <button
                                        disabled
                                        className="px-4 py-2 bg-gray-600 text-gray-300 rounded-lg text-sm font-medium cursor-not-allowed flex items-center gap-2"
                                        title={meetingAccess.message}
                                      >
                                        🎥 Join Meeting
                                      </button>
                                    ))}

                                  {(userProfile?.is_staff ||
                                    !meetingAccess.hideJoinButton) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(
                                          booking.meeting_url || ""
                                        );
                                        toast.success(
                                          "Meeting URL copied to clipboard!"
                                        );
                                      }}
                                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                      📋 Copy URL
                                    </button>
                                  )}

                                  {/* Customer-specific help */}
                                  {!userProfile?.is_staff &&
                                    !meetingAccess.hideJoinButton && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toast.success(
                                            "💡 Tip: The 'Join Meeting' button becomes active 15 minutes before your consultation and remains available for 30 minutes after the scheduled end time!"
                                          );
                                        }}
                                        className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-blue-500/30"
                                      >
                                        💡 Help
                                      </button>
                                    )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })()}
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
                  {/* Only show assignment status to staff */}
                  {userProfile?.is_staff &&
                    (() => {
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
                      {selectedBooking.service?.name || "Unknown Service"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Duration:</span>
                    <span className="text-white ml-2">
                      {selectedBooking.service?.duration_minutes || 60} minutes
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
                  {/* Only show consultant assignment info to staff */}
                  {userProfile?.is_staff && (
                    <div>
                      <span className="text-gray-400">
                        Assigned Consultant:
                      </span>
                      <span className="text-white ml-2">
                        {selectedBooking.consultant
                          ? `${selectedBooking.consultant.first_name} ${selectedBooking.consultant.last_name}`
                          : "Unassigned"}
                      </span>
                    </div>
                  )}
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
                        {(userProfile?.is_staff ||
                          !getMeetingAccessStatus(selectedBooking)
                            .hideJoinButton) && (
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
                        )}
                      </div>
                    </div>
                  )}

                  {/* Meeting Actions */}
                  <div className="space-y-3">
                    {/* Meeting Status Indicator */}
                    {(() => {
                      const meetingAccess =
                        getMeetingAccessStatus(selectedBooking);
                      return (
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${meetingAccess.color}`}
                          >
                            🎥 {meetingAccess.message}
                          </span>
                          {selectedBooking.status === "confirmed" && (
                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                              ✅ Confirmed
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {(() => {
                        const meetingAccess =
                          getMeetingAccessStatus(selectedBooking);
                        return (
                          <>
                            {!meetingAccess.hideJoinButton &&
                              (meetingAccess.canJoin ? (
                                <a
                                  href={selectedBooking.meeting_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 animate-pulse"
                                >
                                  🎥 Join Meeting
                                </a>
                              ) : (
                                <button
                                  disabled
                                  className="px-4 py-2 bg-gray-600 text-gray-300 rounded-lg text-sm font-medium cursor-not-allowed flex items-center gap-2"
                                  title={meetingAccess.message}
                                >
                                  🎥 Join Meeting
                                </button>
                              ))}

                            {(userProfile?.is_staff ||
                              !meetingAccess.hideJoinButton) && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    selectedBooking.meeting_url || ""
                                  );
                                  toast.success(
                                    "Meeting URL copied to clipboard!"
                                  );
                                }}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                              >
                                📋 Copy URL
                              </button>
                            )}

                            {/* Customer-specific help */}
                            {!userProfile?.is_staff &&
                              !meetingAccess.hideJoinButton && (
                                <button
                                  onClick={() => {
                                    toast.success(
                                      "💡 Tip: The 'Join Meeting' button becomes active 15 minutes before your consultation and remains available for 30 minutes after the scheduled end time!"
                                    );
                                  }}
                                  className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-blue-500/30"
                                >
                                  💡 Help
                                </button>
                              )}
                          </>
                        );
                      })()}
                    </div>
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
                {/* Only show Email Customer button for staff */}
                {userProfile?.is_staff && (
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
                )}
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
                              id: user!.id,
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
