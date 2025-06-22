import { NextResponse } from "next/server";

export async function GET() {
  // Test the exact dates you mentioned
  const testDates = ["2025-06-23", "2025-06-24", "2025-06-25"];

  const results = testDates.map((dateString) => {
    const jsDate = new Date(dateString);
    const utcString = jsDate.toUTCString();
    const localString = jsDate.toLocaleDateString();
    const isoString = jsDate.toISOString();

    return {
      input: dateString,
      jsDate_toString: jsDate.toString(),
      utcString,
      localString,
      isoString,
      getDate: jsDate.getDate(),
      getUTCDate: jsDate.getUTCDate(),
      timezoneOffset: jsDate.getTimezoneOffset(),
    };
  });

  return NextResponse.json({
    message: "Timezone parsing test for your time-off dates",
    serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    results,
    explanation: {
      issue:
        "When you input '2025-06-25', JavaScript may interpret this as UTC midnight",
      impact: "In UTC-5, this becomes 2025-06-24 at 7:00 PM local time",
      solution: "We need to parse dates as local dates, not UTC",
    },
  });
}
