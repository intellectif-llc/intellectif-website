// Comprehensive timezone list organized by regions
export interface TimezoneOption {
  value: string;
  label: string;
  region: string;
  offset?: string; // UTC offset for display purposes
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  // North America
  {
    value: "America/New_York",
    label: "Eastern Time (New York)",
    region: "North America",
    offset: "UTC-5/-4",
  },
  {
    value: "America/Chicago",
    label: "Central Time (Chicago)",
    region: "North America",
    offset: "UTC-6/-5",
  },
  {
    value: "America/Denver",
    label: "Mountain Time (Denver)",
    region: "North America",
    offset: "UTC-7/-6",
  },
  {
    value: "America/Los_Angeles",
    label: "Pacific Time (Los Angeles)",
    region: "North America",
    offset: "UTC-8/-7",
  },
  {
    value: "America/Phoenix",
    label: "Arizona Time (Phoenix)",
    region: "North America",
    offset: "UTC-7",
  },
  {
    value: "America/Anchorage",
    label: "Alaska Time (Anchorage)",
    region: "North America",
    offset: "UTC-9/-8",
  },
  {
    value: "Pacific/Honolulu",
    label: "Hawaii Time (Honolulu)",
    region: "North America",
    offset: "UTC-10",
  },
  {
    value: "America/Toronto",
    label: "Eastern Time (Toronto)",
    region: "North America",
    offset: "UTC-5/-4",
  },
  {
    value: "America/Vancouver",
    label: "Pacific Time (Vancouver)",
    region: "North America",
    offset: "UTC-8/-7",
  },

  // Central & South America
  {
    value: "America/Mexico_City",
    label: "Central Time (Mexico City)",
    region: "Central America",
    offset: "UTC-6",
  },
  {
    value: "America/Bogota",
    label: "Colombia Time (Bogotá)",
    region: "South America",
    offset: "UTC-5",
  },
  {
    value: "America/Caracas",
    label: "Venezuela Time (Caracas)",
    region: "South America",
    offset: "UTC-4",
  },
  {
    value: "America/Lima",
    label: "Peru Time (Lima)",
    region: "South America",
    offset: "UTC-5",
  },
  {
    value: "America/Santiago",
    label: "Chile Time (Santiago)",
    region: "South America",
    offset: "UTC-3/-4",
  },
  {
    value: "America/Argentina/Buenos_Aires",
    label: "Argentina Time (Buenos Aires)",
    region: "South America",
    offset: "UTC-3",
  },
  {
    value: "America/Sao_Paulo",
    label: "Brazil Time (São Paulo)",
    region: "South America",
    offset: "UTC-3",
  },

  // Europe
  {
    value: "Europe/London",
    label: "Greenwich Mean Time (London)",
    region: "Europe",
    offset: "UTC+0/+1",
  },
  {
    value: "Europe/Dublin",
    label: "Irish Time (Dublin)",
    region: "Europe",
    offset: "UTC+0/+1",
  },
  {
    value: "Europe/Paris",
    label: "Central European Time (Paris)",
    region: "Europe",
    offset: "UTC+1/+2",
  },
  {
    value: "Europe/Berlin",
    label: "Central European Time (Berlin)",
    region: "Europe",
    offset: "UTC+1/+2",
  },
  {
    value: "Europe/Madrid",
    label: "Central European Time (Madrid)",
    region: "Europe",
    offset: "UTC+1/+2",
  },
  {
    value: "Europe/Rome",
    label: "Central European Time (Rome)",
    region: "Europe",
    offset: "UTC+1/+2",
  },
  {
    value: "Europe/Amsterdam",
    label: "Central European Time (Amsterdam)",
    region: "Europe",
    offset: "UTC+1/+2",
  },
  {
    value: "Europe/Zurich",
    label: "Central European Time (Zurich)",
    region: "Europe",
    offset: "UTC+1/+2",
  },
  {
    value: "Europe/Stockholm",
    label: "Central European Time (Stockholm)",
    region: "Europe",
    offset: "UTC+1/+2",
  },
  {
    value: "Europe/Helsinki",
    label: "Eastern European Time (Helsinki)",
    region: "Europe",
    offset: "UTC+2/+3",
  },
  {
    value: "Europe/Athens",
    label: "Eastern European Time (Athens)",
    region: "Europe",
    offset: "UTC+2/+3",
  },
  {
    value: "Europe/Moscow",
    label: "Moscow Time (Moscow)",
    region: "Europe",
    offset: "UTC+3",
  },

  // Asia
  {
    value: "Asia/Dubai",
    label: "Gulf Standard Time (Dubai)",
    region: "Asia",
    offset: "UTC+4",
  },
  {
    value: "Asia/Kolkata",
    label: "India Standard Time (Mumbai)",
    region: "Asia",
    offset: "UTC+5:30",
  },
  {
    value: "Asia/Dhaka",
    label: "Bangladesh Time (Dhaka)",
    region: "Asia",
    offset: "UTC+6",
  },
  {
    value: "Asia/Bangkok",
    label: "Indochina Time (Bangkok)",
    region: "Asia",
    offset: "UTC+7",
  },
  {
    value: "Asia/Singapore",
    label: "Singapore Time (Singapore)",
    region: "Asia",
    offset: "UTC+8",
  },
  {
    value: "Asia/Hong_Kong",
    label: "Hong Kong Time (Hong Kong)",
    region: "Asia",
    offset: "UTC+8",
  },
  {
    value: "Asia/Shanghai",
    label: "China Standard Time (Shanghai)",
    region: "Asia",
    offset: "UTC+8",
  },
  {
    value: "Asia/Tokyo",
    label: "Japan Standard Time (Tokyo)",
    region: "Asia",
    offset: "UTC+9",
  },
  {
    value: "Asia/Seoul",
    label: "Korea Standard Time (Seoul)",
    region: "Asia",
    offset: "UTC+9",
  },

  // Africa
  {
    value: "Africa/Cairo",
    label: "Eastern European Time (Cairo)",
    region: "Africa",
    offset: "UTC+2",
  },
  {
    value: "Africa/Lagos",
    label: "West Africa Time (Lagos)",
    region: "Africa",
    offset: "UTC+1",
  },
  {
    value: "Africa/Johannesburg",
    label: "South Africa Time (Johannesburg)",
    region: "Africa",
    offset: "UTC+2",
  },

  // Oceania
  {
    value: "Australia/Sydney",
    label: "Australian Eastern Time (Sydney)",
    region: "Oceania",
    offset: "UTC+10/+11",
  },
  {
    value: "Australia/Melbourne",
    label: "Australian Eastern Time (Melbourne)",
    region: "Oceania",
    offset: "UTC+10/+11",
  },
  {
    value: "Australia/Perth",
    label: "Australian Western Time (Perth)",
    region: "Oceania",
    offset: "UTC+8",
  },
  {
    value: "Pacific/Auckland",
    label: "New Zealand Time (Auckland)",
    region: "Oceania",
    offset: "UTC+12/+13",
  },
];

// Group timezones by region for better UX
export const TIMEZONES_BY_REGION = TIMEZONE_OPTIONS.reduce((acc, timezone) => {
  if (!acc[timezone.region]) {
    acc[timezone.region] = [];
  }
  acc[timezone.region].push(timezone);
  return acc;
}, {} as Record<string, TimezoneOption[]>);

// Most common timezones for quick access
export const POPULAR_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "America/Bogota", // Added per user request
];

// Helper function to get timezone label
export const getTimezoneLabel = (value: string): string => {
  const timezone = TIMEZONE_OPTIONS.find((tz) => tz.value === value);
  return timezone ? timezone.label : value;
};

// Helper function to detect user's timezone
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn("Could not detect user timezone:", error);
    return "UTC";
  }
};

// Helper function to get timezone with fallback
export const getTimezoneWithFallback = (preferredTimezone?: string): string => {
  if (
    preferredTimezone &&
    TIMEZONE_OPTIONS.some((tz) => tz.value === preferredTimezone)
  ) {
    return preferredTimezone;
  }

  const userTimezone = getUserTimezone();
  if (TIMEZONE_OPTIONS.some((tz) => tz.value === userTimezone)) {
    return userTimezone;
  }

  return "America/New_York"; // Default fallback
};
