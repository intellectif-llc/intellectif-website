import { DateTime, Settings } from "luxon";

// Configure Luxon to use UTC as default
Settings.defaultZone = "utc";

export interface TimezoneInfo {
  timezone: string;
  offset: string;
  abbreviation: string;
  isDst: boolean;
}

export interface FormattedDateTime {
  date: string;
  time: string;
  dateTime: string;
  iso: string;
  timezone: string;
  offset: string;
}

export class TimezoneService {
  /**
   * Detect user's timezone using browser APIs
   */
  static detectUserTimezone(): string {
    try {
      // Primary method: Intl.DateTimeFormat
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone) {
        return timezone;
      }
    } catch (error) {
      console.warn("Failed to detect timezone via Intl.DateTimeFormat:", error);
    }

    // Fallback: return UTC if detection fails
    return "UTC";
  }

  /**
   * Get timezone information for a given timezone
   */
  static getTimezoneInfo(timezone: string): TimezoneInfo {
    const now = DateTime.now().setZone(timezone);

    return {
      timezone,
      offset: now.toFormat("ZZ"),
      abbreviation: now.toFormat("ZZZZ"),
      isDst: now.isInDST,
    };
  }

  /**
   * Convert a date/time to a specific timezone with consistent formatting
   */
  static formatDateTime(
    dateInput: string | Date,
    timeInput?: string,
    targetTimezone?: string
  ): FormattedDateTime {
    let dateTime: DateTime;
    const userTimezone = targetTimezone || this.detectUserTimezone();

    if (typeof dateInput === "string" && timeInput) {
      // Handle separate date and time strings
      const combinedString = `${dateInput}T${timeInput}:00`;
      dateTime = DateTime.fromISO(combinedString, { zone: "utc" });
    } else if (typeof dateInput === "string") {
      // Handle ISO string or timestamp
      dateTime = DateTime.fromISO(dateInput, { zone: "utc" });
    } else {
      // Handle Date object
      dateTime = DateTime.fromJSDate(dateInput, { zone: "utc" });
    }

    // Convert to target timezone
    const localDateTime = dateTime.setZone(userTimezone);

    return {
      date: localDateTime.toFormat("MMMM d, yyyy"),
      time: localDateTime.toFormat("h:mm a"),
      dateTime: localDateTime.toFormat("MMMM d, yyyy 'at' h:mm a"),
      iso: localDateTime.toISO() || localDateTime.toUTC().toISO() || "",
      timezone: userTimezone,
      offset: localDateTime.toFormat("ZZZZ"),
    };
  }

  /**
   * Format for email templates with timezone name
   */
  static formatForEmail(
    dateInput: string | Date,
    timeInput?: string,
    targetTimezone?: string
  ): string {
    const formatted = this.formatDateTime(dateInput, timeInput, targetTimezone);
    return `${formatted.dateTime} ${formatted.offset}`;
  }

  /**
   * Format for modal display - consistent with email format
   */
  static formatForModal(
    dateInput: string | Date,
    timeInput?: string,
    targetTimezone?: string
  ): FormattedDateTime {
    return this.formatDateTime(dateInput, timeInput, targetTimezone);
  }

  /**
   * Convert user's local time to UTC for database storage
   */
  static convertToUTC(
    dateInput: string | Date,
    timeInput?: string,
    sourceTimezone?: string
  ): DateTime {
    const userTimezone = sourceTimezone || this.detectUserTimezone();
    let localDateTime: DateTime;

    if (typeof dateInput === "string" && timeInput) {
      // Handle separate date and time strings
      const combinedString = `${dateInput}T${timeInput}:00`;
      localDateTime = DateTime.fromISO(combinedString, { zone: userTimezone });
    } else if (typeof dateInput === "string") {
      // Handle ISO string
      localDateTime = DateTime.fromISO(dateInput, { zone: userTimezone });
    } else {
      // Handle Date object
      localDateTime = DateTime.fromJSDate(dateInput, { zone: userTimezone });
    }

    return localDateTime.toUTC();
  }

  /**
   * Create a combined datetime string from date and time components
   */
  static createScheduledDateTime(
    date: string,
    time: string,
    timezone?: string
  ): {
    scheduledDate: string;
    scheduledTime: string;
    scheduledDateTime: string;
    utcDateTime: DateTime;
  } {
    const userTimezone = timezone || this.detectUserTimezone();

    // Create datetime in user's timezone
    const combinedString = `${date}T${time}:00`;
    const localDateTime = DateTime.fromISO(combinedString, {
      zone: userTimezone,
    });

    // Convert to UTC for storage
    const utcDateTime = localDateTime.toUTC();

    return {
      scheduledDate: date,
      scheduledTime: time,
      scheduledDateTime:
        utcDateTime.toISO() || utcDateTime.toUTC().toISO() || "",
      utcDateTime,
    };
  }

  /**
   * Get timezone offset for a specific timezone
   */
  static getTimezoneOffset(timezone: string): string {
    const now = DateTime.now().setZone(timezone);
    return now.toFormat("ZZ");
  }

  /**
   * Check if a timezone is valid
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      DateTime.now().setZone(timezone);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get list of common timezones for dropdown
   */
  static getCommonTimezones(): Array<{
    value: string;
    label: string;
    offset: string;
  }> {
    const timezones = [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Toronto",
      "America/Vancouver",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Rome",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Asia/Kolkata",
      "Australia/Sydney",
      "Australia/Melbourne",
      "UTC",
    ];

    return timezones.map((tz) => {
      const now = DateTime.now().setZone(tz);
      return {
        value: tz,
        label: `${tz.replace("_", " ")} (${now.toFormat("ZZZZ")})`,
        offset: now.toFormat("ZZ"),
      };
    });
  }

  /**
   * Check if two datetimes are in the same day in a specific timezone
   */
  static isSameDay(
    date1: string | Date,
    date2: string | Date,
    timezone?: string
  ): boolean {
    const tz = timezone || this.detectUserTimezone();
    const dt1 =
      typeof date1 === "string"
        ? DateTime.fromISO(date1)
        : DateTime.fromJSDate(date1);
    const dt2 =
      typeof date2 === "string"
        ? DateTime.fromISO(date2)
        : DateTime.fromJSDate(date2);

    return dt1.setZone(tz).hasSame(dt2.setZone(tz), "day");
  }

  /**
   * Format duration in minutes to human readable format
   */
  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    }

    return `${hours} hour${hours !== 1 ? "s" : ""} ${remainingMinutes} minute${
      remainingMinutes !== 1 ? "s" : ""
    }`;
  }

  /**
   * Add timezone context to booking data
   */
  static addTimezoneContext(bookingData: any, customerTimezone?: string): any {
    const timezone = customerTimezone || this.detectUserTimezone();

    return {
      ...bookingData,
      customer_timezone: timezone,
      scheduled_date: bookingData.scheduled_date,
      timezone_offset: this.getTimezoneOffset(timezone),
    };
  }
}

// Export for easy access
export { DateTime } from "luxon";
