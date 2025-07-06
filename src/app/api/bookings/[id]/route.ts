import { NextRequest, NextResponse } from "next/server";
import {
  createRouteHandlerClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { sendConsultantWhatsAppTemplate } from "@/lib/twilio-whatsapp";

// Helper function to check if user is staff - ALWAYS use service role to bypass RLS
async function isStaff(userId: string): Promise<boolean> {
  try {
    const serviceSupabase = createServiceRoleClient();
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("is_staff, role")
      .eq("id", userId)
      .single();

    return profile?.is_staff === true;
  } catch (error) {
    console.error("Error checking staff status:", error);
    return false;
  }
}

// GET /api/bookings/[id] - Get specific booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSupabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const bookingId = resolvedParams.id;
    const serviceSupabase = createServiceRoleClient();

    // Get booking with full details
    const { data: booking, error } = await serviceSupabase
      .from("bookings")
      .select(
        `
        *,
        service:services(*),
        customer_metrics(*)
      `
      )
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Fetch consultant profile separately if assigned
    let consultant = null;
    if (booking.consultant_id) {
      const { data: consultantProfile } = await serviceSupabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("id", booking.consultant_id)
        .single();

      if (consultantProfile) {
        consultant = {
          ...consultantProfile,
          // Skip email lookup to avoid permissions issues
        };
      }
    }

    // Check permissions
    const staffStatus = await isStaff(user.id);
    const isConsultantOwner = booking.consultant_id === user.id;
    const isCustomerOwner = booking.user_id === user.id;

    if (!staffStatus && !isConsultantOwner && !isCustomerOwner) {
      // For anonymous bookings, we might need a different way to verify ownership,
      // perhaps a token sent via email. For now, we only allow logged-in users.
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Transform customer_data for frontend consistency
    const transformedBooking = {
      ...booking,
      consultant,
      customer_data: {
        email: booking.customer_data?.email || "",
        firstName: booking.customer_data?.first_name || "",
        lastName: booking.customer_data?.last_name || "",
        phone: booking.customer_data?.phone || "",
        company: booking.customer_data?.company || "",
      },
    };

    return NextResponse.json({ booking: transformedBooking });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/bookings/[id] - Update booking (assignment, status, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSupabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const bookingId = resolvedParams.id;
    const body = await request.json();
    const { action, consultant_id, status } = body;

    // Check staff permissions for most operations
    const staffStatus = await isStaff(user.id);

    if (!staffStatus && action !== "update_status") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get current booking
    const { data: currentBooking, error: fetchError } = await serviceSupabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchError || !currentBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const updateData: Record<string, string | number | Date | null> = {};
    let auditMessage = "";

    switch (action) {
      case "assign":
        if (!consultant_id) {
          return NextResponse.json(
            { error: "Consultant ID required for assignment" },
            { status: 400 }
          );
        }

        // Verify consultant exists and is staff
        const { data: consultant, error: consultantError } =
          await serviceSupabase
            .from("profiles")
            .select("id, first_name, last_name, is_staff")
            .eq("id", consultant_id)
            .eq("is_staff", true)
            .single();

        if (consultantError || !consultant) {
          return NextResponse.json(
            { error: "Invalid consultant" },
            { status: 400 }
          );
        }

        updateData.consultant_id = consultant_id;
        auditMessage = `Assigned to ${consultant.first_name} ${consultant.last_name}`;
        break;

      case "unassign":
        updateData.consultant_id = null;
        auditMessage = "Unassigned from consultant";
        break;

      case "assign_to_me":
        // Staff can assign bookings to themselves
        updateData.consultant_id = user.id;
        auditMessage = "Self-assigned";
        break;

      case "update_status":
        // Consultants can update status of their own bookings
        if (!staffStatus && currentBooking.consultant_id !== user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!status) {
          return NextResponse.json(
            { error: "Status required" },
            { status: 400 }
          );
        }

        updateData.status = status;
        auditMessage = `Status updated to ${status}`;

        // Set completion timestamp if completed
        if (status === "completed") {
          updateData.completed_at = new Date().toISOString();
        }
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Add audit fields
    updateData.updated_at = new Date().toISOString();

    // Update the booking
    const { data: updatedBooking, error: updateError } = await serviceSupabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId)
      .select(
        `
        *,
        service:services(name, duration_minutes),
        consultant:profiles!bookings_consultant_id_fkey(id, first_name, last_name)
      `
      )
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update booking" },
        { status: 500 }
      );
    }

    // Send WhatsApp notification if consultant was assigned
    if (action === "assign" && consultant_id && updatedBooking) {
      try {
        // Get consultant's phone number
        const { data: consultantPhone, error: phoneError } =
          await serviceSupabase.rpc("get_user_phone", {
            user_id: consultant_id,
          });

        if (phoneError) {
          console.error("❌ Failed to get consultant phone:", phoneError);
        } else if (consultantPhone) {
          console.log(
            "📱 Sending WhatsApp notification for manual assignment:",
            {
              consultantId: consultant_id,
              bookingId: bookingId,
              bookingReference: updatedBooking.booking_reference,
            }
          );

          // Format the scheduled time
          const scheduledTimeFormatted = new Date(
            `${updatedBooking.scheduled_date}T${updatedBooking.scheduled_time}:00`
          ).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZoneName: "short",
          });

          const templateSid = process.env.TWILIO_WHATSAPP_TEMPLATE_SID;

          if (templateSid) {
            await sendConsultantWhatsAppTemplate(
              {
                consultantName: updatedBooking.consultant?.first_name
                  ? `${updatedBooking.consultant.first_name} ${updatedBooking.consultant.last_name}`
                  : "Consultant",
                consultantPhone: consultantPhone,
                customerName:
                  `${updatedBooking.customer_data?.first_name || ""} ${
                    updatedBooking.customer_data?.last_name || ""
                  }`.trim() || "Customer",
                serviceName: updatedBooking.service?.name || "Consultation",
                bookingReference: updatedBooking.booking_reference,
                scheduledDate: updatedBooking.scheduled_date,
                scheduledTime: scheduledTimeFormatted,
                duration: updatedBooking.service?.duration_minutes || 60,
                meetingUrl: updatedBooking.meeting_url || "",
              },
              templateSid
            );
            console.log("✅ WhatsApp notification sent for manual assignment");
          } else {
            console.warn(
              "⚠️ WhatsApp template SID not configured, skipping WhatsApp notification"
            );
          }
        } else {
          console.log(
            "ℹ️ Consultant has no phone number, skipping WhatsApp notification"
          );
        }
      } catch (whatsappError) {
        console.error(
          "❌ Failed to send WhatsApp notification for assignment:",
          whatsappError
        );
        // Don't fail the assignment if WhatsApp fails
      }
    }

    // Fetch updated consultant profile if assigned
    let updatedConsultant = null;
    if (updatedBooking.consultant_id) {
      const { data: consultantProfile } = await serviceSupabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("id", updatedBooking.consultant_id)
        .single();

      if (consultantProfile) {
        updatedConsultant = {
          ...consultantProfile,
          // Skip email lookup to avoid permissions issues
        };
      }
    }

    // Log the action for audit trail
    console.log(
      `📝 Booking ${bookingId} updated by ${user.id}: ${auditMessage}`
    );

    // Transform customer_data for frontend consistency
    const transformedBooking = {
      ...updatedBooking,
      consultant: updatedConsultant,
      customer_data: {
        email: updatedBooking.customer_data?.email || "",
        firstName: updatedBooking.customer_data?.first_name || "",
        lastName: updatedBooking.customer_data?.last_name || "",
        phone: updatedBooking.customer_data?.phone || "",
        company: updatedBooking.customer_data?.company || "",
      },
    };

    return NextResponse.json({
      booking: transformedBooking,
      message: auditMessage,
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
