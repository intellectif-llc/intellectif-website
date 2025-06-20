import { createRouteHandlerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const { searchParams } = new URL(request.url);

    const date = searchParams.get("date");
    const serviceId = searchParams.get("service_id");

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    // Validate date format
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Get service details if provided
    let serviceDuration = 60; // Default 60 minutes
    let service = null;

    if (serviceId) {
      const { data: serviceData, error: serviceError } = await supabase
        .from("services")
        .select(
          "duration_minutes, buffer_before_minutes, buffer_after_minutes, name"
        )
        .eq("id", serviceId)
        .single();

      if (serviceError) {
        console.error("Error fetching service:", serviceError);
        return NextResponse.json(
          { error: "Service not found" },
          { status: 404 }
        );
      }

      if (serviceData) {
        service = serviceData;
        serviceDuration = serviceData.duration_minutes;
      }
    }

    // Generate time slots for the date
    const timeSlots = [];
    const startHour = 8; // 8 AM
    const endHour = 18; // 6 PM

    // Calculate TRULY dynamic slot interval based on service + buffer
    let slotInterval = serviceDuration; // Default to service duration

    if (service) {
      // Calculate the ACTUAL total time needed per booking slot
      const bufferBefore = service.buffer_before_minutes || 0;
      const bufferAfter = service.buffer_after_minutes || 0;
      const totalTimeNeeded = serviceDuration + bufferBefore + bufferAfter;

      // This is the key: the interval should be the total time needed
      // 15min meeting + 5min buffer = 20min intervals
      // 55min meeting + 5min buffer = 60min intervals
      slotInterval = totalTimeNeeded;

      // Round to nearest 5 minutes for clean time slots
      slotInterval = Math.ceil(slotInterval / 5) * 5;

      console.log(
        `🔧 Service: ${service.name}, Duration: ${serviceDuration}min, Buffer: ${bufferBefore}+${bufferAfter}min, Total: ${totalTimeNeeded}min, Interval: ${slotInterval}min`
      );
    } else {
      // Fallback: minimum 15 minutes for services without buffer info
      slotInterval = Math.max(15, serviceDuration);
    }

    // Generate time slots properly considering cross-hour intervals
    const startTimeMinutes = startHour * 60; // 8 AM = 480 minutes
    const endTimeMinutes = endHour * 60; // 6 PM = 1080 minutes

    console.log(
      `📅 Generating slots from ${startHour}:00 to ${endHour}:00 with ${slotInterval}min intervals`
    );

    for (
      let totalMinutes = startTimeMinutes;
      totalMinutes < endTimeMinutes;
      totalMinutes += slotInterval
    ) {
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;

      // Skip if we've gone past end hour
      if (hour >= endHour) break;

      const timeString = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;

      try {
        // Use buffer-aware function if service ID is provided, otherwise use standard function
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
          console.error(`Error getting consultants for ${timeString}:`, error);
          continue;
        }

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

          if (totalAvailableSlots > 0) {
            timeSlots.push({
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
            });
          }
        }
      } catch (slotError) {
        console.error(`Error processing time slot ${timeString}:`, slotError);
        continue;
      }
    }

    return NextResponse.json({
      date,
      timeSlots,
      totalSlots: timeSlots.length,
      serviceDuration,
      slotInterval, // Include the calculated interval for debugging
      service: service
        ? {
            name: service.name,
            duration: serviceDuration,
            bufferBefore: service.buffer_before_minutes || 0,
            bufferAfter: service.buffer_after_minutes || 5,
            totalTimeNeeded:
              serviceDuration +
              (service.buffer_before_minutes || 0) +
              (service.buffer_after_minutes || 0),
          }
        : null,
      debug: {
        intervalCalculation: service
          ? {
              serviceDuration,
              bufferBefore: service.buffer_before_minutes || 0,
              bufferAfter: service.buffer_after_minutes || 0,
              totalTimeNeeded:
                serviceDuration +
                (service.buffer_before_minutes || 0) +
                (service.buffer_after_minutes || 0),
              finalInterval: slotInterval,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
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
