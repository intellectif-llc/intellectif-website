import { createRouteHandlerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const { searchParams } = new URL(request.url);

    const date = searchParams.get("date");
    const serviceId = searchParams.get("service_id");

    console.log("🔍 SLOTS API - Request params:", {
      date,
      serviceId,
      timestamp: new Date().toISOString(),
    });

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    let service = null;
    let serviceDuration = 60; // Default duration
    let totalServiceDuration = 60; // Default total duration including buffer
    let minimumAdvanceHours = 24; // Default minimum advance hours

    // Fetch service details if service ID is provided
    if (serviceId) {
      const { data: serviceData, error: serviceError } = await supabase
        .from("services")
        .select(
          "duration_minutes, buffer_before_minutes, buffer_after_minutes, name, minimum_advance_hours"
        )
        .eq("id", serviceId)
        .single();

      if (serviceError) {
        console.error("❌ Error fetching service:", serviceError);
        return NextResponse.json(
          { error: "Service not found" },
          { status: 404 }
        );
      }

      if (serviceData) {
        service = serviceData;
        serviceDuration = serviceData.duration_minutes;
        minimumAdvanceHours = serviceData.minimum_advance_hours || 24; // Use service setting or fallback to 24

        // Calculate total duration with fallback defaults
        const bufferBefore = serviceData.buffer_before_minutes ?? 0;
        const bufferAfter = serviceData.buffer_after_minutes ?? 5; // Default 5min buffer
        totalServiceDuration = serviceDuration + bufferBefore + bufferAfter;

        console.log("📋 Service details:", {
          serviceId,
          name: service.name,
          duration: serviceDuration,
          bufferBefore,
          bufferAfter,
          totalDuration: totalServiceDuration,
          minimumAdvanceHours,
          note: "Total duration determines slot intervals",
        });
      }
    }

    // Calculate minimum start datetime for this service
    const now = new Date();
    const minimumStartTime = new Date(
      now.getTime() + minimumAdvanceHours * 60 * 60 * 1000
    );

    // CORRECT LOGIC: Slot intervals MUST match total service duration
    // If consultant is unavailable for 20 minutes total, slots must be 20 minutes apart
    // This ensures no double bookings and accurate availability display
    const slotInterval = totalServiceDuration; // Dynamic from database!

    const timeSlots = [];
    const startHour = 8; // 8 AM
    const endHour = 18; // 6 PM

    console.log("🔧 CORRECT Slot generation strategy:", {
      serviceDuration,
      totalServiceDuration,
      slotInterval,
      strategy: "Dynamic intervals matching actual consultant availability",
      note: "Prevents impossible bookings during buffer time",
      example: `Service: ${serviceDuration}min + Buffer: ${
        totalServiceDuration - serviceDuration
      }min = ${totalServiceDuration}min slots`,
    });

    // Generate time slots using dynamic intervals based on actual consultant availability
    const startTimeMinutes = startHour * 60; // 8 AM = 480 minutes
    const endTimeMinutes = endHour * 60; // 6 PM = 1080 minutes

    console.log(
      `📅 Generating slots for ${date} from ${startHour}:00 to ${endHour}:00 with ${slotInterval}min intervals (CORRECT: Dynamic intervals)`
    );

    for (
      let totalMinutes = startTimeMinutes;
      totalMinutes < endTimeMinutes;
      totalMinutes += slotInterval
    ) {
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;

      // Skip if we've gone past end hour or if slot would extend beyond end hour
      if (
        hour >= endHour ||
        totalMinutes + totalServiceDuration > endTimeMinutes
      )
        break;

      const timeString = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;

      console.log(
        `\n⏰ Processing time slot: ${timeString} (needs ${totalServiceDuration}min total)`
      );

      // Check if this specific slot meets minimum advance requirement
      const slotDateTime = new Date(`${date}T${timeString}:00`);
      if (slotDateTime < minimumStartTime) {
        console.log(
          `  ⏰ Skipping ${timeString} - within minimum advance window (need ${minimumAdvanceHours}h advance)`
        );
        continue;
      }

      try {
        // Always use buffer-aware function when service ID is provided
        // This ensures proper buffer time calculations from database
        const { data: consultants, error } = serviceId
          ? await supabase.rpc("get_available_consultants_with_buffer", {
              target_date: date,
              target_time: timeString,
              service_id_param: serviceId,
            })
          : await supabase.rpc("get_available_consultants", {
              target_date: date,
              target_time: timeString,
              service_duration_minutes: serviceDuration,
            });

        if (error) {
          console.error(
            `❌ Error getting consultants for ${timeString}:`,
            error
          );
          continue;
        }

        console.log(`📊 Raw consultant data for ${timeString}:`, {
          consultantCount: consultants?.length || 0,
          consultants:
            consultants?.map(
              (c: {
                consultant_id: string;
                consultant_name: string;
                available_slots: number;
                current_bookings: number;
                available_start: string;
                available_end: string;
                max_bookings: number;
                total_duration_minutes: number;
                buffer_before: number;
                buffer_after: number;
              }) => ({
                id: c.consultant_id,
                name: c.consultant_name,
                availableSlots: c.available_slots,
                currentBookings: c.current_bookings,
                availableStart: c.available_start,
                availableEnd: c.available_end,
                maxBookings: c.max_bookings,
                ...(serviceId && {
                  totalDuration: c.total_duration_minutes,
                  bufferBefore: c.buffer_before,
                  bufferAfter: c.buffer_after,
                  requiredStartTime: `${timeString} - ${c.buffer_before}min = ${
                    new Date(`2000-01-01 ${timeString}`).getTime() -
                      c.buffer_before * 60000 >=
                    0
                      ? new Date(
                          new Date(`2000-01-01 ${timeString}`).getTime() -
                            c.buffer_before * 60000
                        )
                          .toTimeString()
                          .slice(0, 5)
                      : "INVALID"
                  }`,
                  requiredEndTime: `${timeString} + ${
                    c.total_duration_minutes
                  }min = ${new Date(
                    new Date(`2000-01-01 ${timeString}`).getTime() +
                      c.total_duration_minutes * 60000
                  )
                    .toTimeString()
                    .slice(0, 5)}`,
                }),
              })
            ) || [],
        });

        if (
          consultants &&
          Array.isArray(consultants) &&
          consultants.length > 0
        ) {
          const totalAvailableSlots = consultants.reduce(
            (
              sum: number,
              consultant: { available_slots?: number | bigint }
            ) => {
              const slots = consultant.available_slots || 0;
              return sum + (typeof slots === "bigint" ? Number(slots) : slots);
            },
            0
          );

          console.log(`📈 Calculated availability for ${timeString}:`, {
            totalAvailableSlots,
            hasAvailability: totalAvailableSlots > 0,
          });

          if (totalAvailableSlots > 0) {
            const timeSlotData = {
              time: timeString,
              display: formatTimeDisplay(timeString),
              available: true,
              availableSlots: totalAvailableSlots,
              consultants: consultants.map(
                (consultant: {
                  consultant_id: string;
                  consultant_name?: string;
                  available_slots?: number | bigint;
                  total_duration_minutes?: number;
                  buffer_before?: number;
                  buffer_after?: number;
                }) => {
                  const slots = consultant.available_slots || 0;
                  return {
                    id: consultant.consultant_id,
                    name: consultant.consultant_name || "Available Consultant",
                    availableSlots:
                      typeof slots === "bigint" ? Number(slots) : slots,
                    ...(serviceId && {
                      totalDuration: consultant.total_duration_minutes,
                      bufferBefore: consultant.buffer_before,
                      bufferAfter: consultant.buffer_after,
                    }),
                  };
                }
              ),
            };

            timeSlots.push(timeSlotData);
            console.log(`✅ Added time slot to available list:`, {
              time: timeString,
              display: timeSlotData.display,
              availableSlots: totalAvailableSlots,
              consultantCount: consultants.length,
            });
          } else {
            console.log(`❌ Time slot ${timeString} has no available slots`);
          }
        } else {
          console.log(`❌ No consultants returned for ${timeString}`);
        }
      } catch (slotError) {
        console.error(
          `💥 Error processing time slot ${timeString}:`,
          slotError
        );
        continue;
      }
    }

    console.log("\n🎯 FINAL SLOT RESULTS:", {
      totalSlots: timeSlots.length,
      availableSlots: timeSlots.filter((slot) => slot.available).length,
      date,
      serviceId,
      serviceDuration,
      totalServiceDuration,
      minimumAdvanceHours,
      timeSlots: timeSlots.map((slot) => ({
        time: slot.time,
        display: slot.display,
        available: slot.available,
        availableSlots: slot.availableSlots,
      })),
    });

    const response = NextResponse.json({
      timeSlots,
      serviceInfo: service,
      serviceDuration,
      totalServiceDuration,
      minimumAdvanceHours,
      date,
    });

    // Add cache-control headers to prevent caching of availability data
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("❌ Slots API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function formatTimeDisplay(timeString: string): string {
  const [hours, minutes] = timeString.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}
