import { createRouteHandlerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const { searchParams } = new URL(request.url);

    const serviceId = searchParams.get("service_id");
    const daysAhead = parseInt(searchParams.get("days_ahead") || "14");

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
      }
    }

    // Generate date range to check (timezone-safe)
    const availableDates = [];
    const today = new Date();
    const currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() + 1); // Start from tomorrow

    for (let i = 0; i < daysAhead; i++) {
      // Generate date string in local timezone to avoid UTC conversion issues
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;

      try {
        // Check if there are any available consultants for this date
        const { data: consultants, error } = await supabase.rpc(
          "get_available_consultants",
          {
            target_date: dateString,
            target_time: "09:00", // Check morning availability as indicator
            service_duration_minutes: serviceDuration,
          }
        );

        if (error) {
          console.error(
            `Error checking availability for ${dateString}:`,
            error
          );
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        // If we have available consultants, include this date
        if (consultants && consultants.length > 0) {
          const hasAvailableSlots = consultants.some(
            (consultant: { available_slots: number }) =>
              consultant.available_slots > 0
          );

          if (hasAvailableSlots) {
            availableDates.push({
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
              totalAvailableSlots: consultants.reduce(
                (sum: number, consultant: { available_slots?: number }) =>
                  sum + (consultant.available_slots || 0),
                0
              ),
            });
          }
        }
      } catch (dateError) {
        console.error(`Error processing date ${dateString}:`, dateError);
      }

      currentDate.setDate(currentDate.getDate() + 1);

      // Stop if we have enough available dates
      if (availableDates.length >= 10) {
        break;
      }
    }

    return NextResponse.json({
      availableDates,
      totalDatesChecked: daysAhead,
      serviceDuration,
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
