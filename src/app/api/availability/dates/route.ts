import { createRouteHandlerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const { searchParams } = new URL(request.url);

    const serviceId = searchParams.get("service_id");
    const daysAhead = parseInt(searchParams.get("days_ahead") || "14");

    console.log("🔍 DATES API - Request params:", {
      serviceId,
      daysAhead,
      timestamp: new Date().toISOString(),
    });

    // Get service duration for availability checking
    let serviceDuration = 60; // Default
    if (serviceId) {
      const { data: serviceData } = await supabase
        .from("services")
        .select("duration_minutes")
        .eq("id", serviceId)
        .single();

      if (serviceData) {
        serviceDuration = serviceData.duration_minutes;
        console.log("📋 Service data:", {
          serviceId,
          duration: serviceDuration,
        });
      }
    }

    // Generate date range to check (timezone-safe)
    const availableDates = [];
    const today = new Date();
    const currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() + 1); // Start from tomorrow

    console.log("📅 Date range generation:", {
      today: today.toISOString(),
      startDate: currentDate.toISOString(),
      daysToCheck: daysAhead,
    });

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
              consultants?.map((c: any) => ({
                id: c.consultant_id,
                name: c.consultant_name,
                availableSlots: c.available_slots,
                currentBookings: c.current_bookings,
                availableStart: c.available_start,
                availableEnd: c.available_end,
                maxBookings: c.max_bookings,
              })) || [],
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

      // Stop if we have enough available dates
      if (availableDates.length >= 10) {
        console.log("🛑 Reached maximum available dates (10), stopping search");
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
      daysChecked: daysAhead,
    });

    const response = NextResponse.json({
      availableDates,
      totalDatesChecked: daysAhead,
      serviceDuration,
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
