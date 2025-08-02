import { createRouteHandlerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const { searchParams } = new URL(request.url);

    const serviceId = searchParams.get("service_id");
    const daysAhead = parseInt(searchParams.get("days_ahead") || "30");

    // Get service details including minimum advance hours
    let serviceDuration = 60; // Default
    let minimumAdvanceHours = 24; // Default to 24 hours if no service specified

    if (serviceId) {
      const { data: serviceData } = await supabase
        .from("services")
        .select("duration_minutes, minimum_advance_hours")
        .eq("id", serviceId)
        .single();

      if (serviceData) {
        serviceDuration = serviceData.duration_minutes;
        minimumAdvanceHours = serviceData.minimum_advance_hours || 24; // Use service setting or fallback to 24
        console.log("📋 Service data:", {
          serviceId,
          duration: serviceDuration,
          minimumAdvanceHours,
        });
      }
    }

    // Calculate minimum start datetime based on service requirements
    const now = new Date();
    const minimumStartTime = new Date(
      now.getTime() + minimumAdvanceHours * 60 * 60 * 1000
    );

    // Start checking from the date that meets minimum advance requirement
    const currentDate = new Date(minimumStartTime);
    // Reset to start of day to ensure we check full days
    currentDate.setHours(0, 0, 0, 0);

    console.log("📅 Date range generation:", {
      now: now.toISOString(),
      minimumAdvanceHours,
      minimumStartTime: minimumStartTime.toISOString(),
      startDate: currentDate.toISOString(),
      daysToCheck: daysAhead,
    });

    // Generate date range to check (timezone-safe)
    const availableDates = [];

    for (let i = 0; i < daysAhead; i++) {
      // Generate date string in local timezone to avoid UTC conversion issues
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;

      console.log(
        `\n🗓️  Checking date: ${dateString} (${currentDate.toDateString()})`
      );

      try {
        // Check multiple time slots throughout the day to determine availability
        const timeSlots = ["09:00", "12:00", "15:00"]; // Morning, noon, afternoon
        let hasAnyAvailability = false;
        let totalAvailableSlots = 0;

        for (const timeSlot of timeSlots) {
          console.log(`  ⏰ Checking time slot: ${timeSlot}`);

          // For same day as minimum start time, check if this specific slot meets advance requirement
          const slotDateTime = new Date(`${dateString}T${timeSlot}:00`);
          if (slotDateTime < minimumStartTime) {
            console.log(
              `  ⏰ Skipping ${timeSlot} - within minimum advance window`
            );
            continue;
          }

          // Use buffer-aware function if service ID is provided, otherwise use standard function
          const { data: consultants, error } = serviceId
            ? await supabase.rpc("get_available_consultants_with_buffer", {
                target_date: dateString,
                target_time: timeSlot,
                service_id_param: serviceId,
              })
            : await supabase.rpc("get_available_consultants", {
                target_date: dateString,
                target_time: timeSlot,
                service_duration_minutes: serviceDuration,
              });

          if (error) {
            console.error(
              `❌ Error checking availability for ${dateString} at ${timeSlot}:`,
              error
            );
            continue;
          }

          console.log(`  📊 Raw consultant data for ${timeSlot}:`, {
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
                }) => ({
                  id: c.consultant_id,
                  name: c.consultant_name,
                  availableSlots: c.available_slots,
                  currentBookings: c.current_bookings,
                  availableStart: c.available_start,
                  availableEnd: c.available_end,
                  maxBookings: c.max_bookings,
                })
              ) || [],
          });

          // Check if this time slot has available consultants
          if (consultants && consultants.length > 0) {
            const slotsAtThisTime = consultants.reduce(
              (
                sum: number,
                consultant: { available_slots: number | bigint }
              ) => {
                const slots = consultant.available_slots || 0;
                return (
                  sum + (typeof slots === "bigint" ? Number(slots) : slots)
                );
              },
              0
            );

            console.log(`  📈 Calculated slots for ${timeSlot}:`, {
              totalSlots: slotsAtThisTime,
              hasAvailability: slotsAtThisTime > 0,
            });

            if (slotsAtThisTime > 0) {
              hasAnyAvailability = true;
              totalAvailableSlots = Math.max(
                totalAvailableSlots,
                slotsAtThisTime
              );
            }
          } else {
            console.log(`  ❌ No consultants available for ${timeSlot}`);
          }
        }

        console.log(`📋 Date ${dateString} summary:`, {
          hasAnyAvailability,
          totalAvailableSlots,
          willBeIncluded: hasAnyAvailability,
        });

        // If any time slot has availability, include this date
        if (hasAnyAvailability) {
          const dateEntry = {
            value: dateString,
            display: currentDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            }),
            fullDate: currentDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            }),
            dayOfWeek: currentDate.getDay(),
            totalAvailableSlots: totalAvailableSlots,
          };

          availableDates.push(dateEntry);
          console.log(`✅ Added date to available list:`, dateEntry);
        } else {
          console.log(`❌ Date ${dateString} has no availability - skipped`);
        }
      } catch (dateError) {
        console.error(`💥 Error processing date ${dateString}:`, dateError);
      }

      currentDate.setDate(currentDate.getDate() + 1);

      // Stop early if we have enough dates for good UX (at least 15 available dates)
      if (availableDates.length >= 15 && i >= 21) {
        console.log(`🎯 Found ${availableDates.length} dates, stopping early for performance`);
        break;
      }
    }

    console.log("\n🎯 FINAL RESULTS:", {
      totalAvailableDates: availableDates.length,
      availableDates: availableDates.map((d) => ({
        date: d.value,
        display: d.display,
        slots: d.totalAvailableSlots,
      })),
      serviceDuration,
      minimumAdvanceHours,
      daysChecked: daysAhead,
    });

    const response = NextResponse.json({
      availableDates,
      totalDatesChecked: daysAhead,
      serviceDuration,
      minimumAdvanceHours,
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
    console.error("💥 API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
