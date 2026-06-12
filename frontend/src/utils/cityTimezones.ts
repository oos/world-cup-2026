export type CityTimezoneOption = {
  city: string;
  timezone: string;
};

export const CITY_TIMEZONE_OPTIONS: CityTimezoneOption[] = [
  { city: "Amsterdam", timezone: "Europe/Amsterdam" },
  { city: "Athens", timezone: "Europe/Athens" },
  { city: "Auckland", timezone: "Pacific/Auckland" },
  { city: "Bangkok", timezone: "Asia/Bangkok" },
  { city: "Barcelona", timezone: "Europe/Madrid" },
  { city: "Beijing", timezone: "Asia/Shanghai" },
  { city: "Berlin", timezone: "Europe/Berlin" },
  { city: "Bogotá", timezone: "America/Bogota" },
  { city: "Brisbane", timezone: "Australia/Brisbane" },
  { city: "Buenos Aires", timezone: "America/Argentina/Buenos_Aires" },
  { city: "Cairo", timezone: "Africa/Cairo" },
  { city: "Cape Town", timezone: "Africa/Johannesburg" },
  { city: "Chicago", timezone: "America/Chicago" },
  { city: "Dallas", timezone: "America/Chicago" },
  { city: "Delhi", timezone: "Asia/Kolkata" },
  { city: "Denver", timezone: "America/Denver" },
  { city: "Dubai", timezone: "Asia/Dubai" },
  { city: "Dublin", timezone: "Europe/Dublin" },
  { city: "Helsinki", timezone: "Europe/Helsinki" },
  { city: "Hong Kong", timezone: "Asia/Hong_Kong" },
  { city: "Houston", timezone: "America/Chicago" },
  { city: "Istanbul", timezone: "Europe/Istanbul" },
  { city: "Jakarta", timezone: "Asia/Jakarta" },
  { city: "Johannesburg", timezone: "Africa/Johannesburg" },
  { city: "Kuala Lumpur", timezone: "Asia/Kuala_Lumpur" },
  { city: "Lagos", timezone: "Africa/Lagos" },
  { city: "Lisbon", timezone: "Europe/Lisbon" },
  { city: "London", timezone: "Europe/London" },
  { city: "Los Angeles", timezone: "America/Los_Angeles" },
  { city: "Madrid", timezone: "Europe/Madrid" },
  { city: "Manila", timezone: "Asia/Manila" },
  { city: "Melbourne", timezone: "Australia/Melbourne" },
  { city: "Mexico City", timezone: "America/Mexico_City" },
  { city: "Miami", timezone: "America/New_York" },
  { city: "Montreal", timezone: "America/Toronto" },
  { city: "Moscow", timezone: "Europe/Moscow" },
  { city: "Mumbai", timezone: "Asia/Kolkata" },
  { city: "Nairobi", timezone: "Africa/Nairobi" },
  { city: "New York", timezone: "America/New_York" },
  { city: "Oslo", timezone: "Europe/Oslo" },
  { city: "Paris", timezone: "Europe/Paris" },
  { city: "Perth", timezone: "Australia/Perth" },
  { city: "Prague", timezone: "Europe/Prague" },
  { city: "Riyadh", timezone: "Asia/Riyadh" },
  { city: "Rome", timezone: "Europe/Rome" },
  { city: "San Francisco", timezone: "America/Los_Angeles" },
  { city: "Santiago", timezone: "America/Santiago" },
  { city: "São Paulo", timezone: "America/Sao_Paulo" },
  { city: "Seattle", timezone: "America/Los_Angeles" },
  { city: "Seoul", timezone: "Asia/Seoul" },
  { city: "Singapore", timezone: "Asia/Singapore" },
  { city: "Stockholm", timezone: "Europe/Stockholm" },
  { city: "Sydney", timezone: "Australia/Sydney" },
  { city: "Tokyo", timezone: "Asia/Tokyo" },
  { city: "Toronto", timezone: "America/Toronto" },
  { city: "Vancouver", timezone: "America/Vancouver" },
  { city: "Vienna", timezone: "Europe/Vienna" },
  { city: "Warsaw", timezone: "Europe/Warsaw" },
  { city: "Washington DC", timezone: "America/New_York" },
  { city: "Zurich", timezone: "Europe/Zurich" },
].sort((a, b) => a.city.localeCompare(b.city));

const timezoneByCity = new Map(
  CITY_TIMEZONE_OPTIONS.map((option) => [option.city, option.timezone])
);

export function getTimezoneForCity(city: string): string | undefined {
  return timezoneByCity.get(city);
}

export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function resolveUserTimezone(city: string): string {
  if (city) {
    const timezone = getTimezoneForCity(city);
    if (timezone) return timezone;
  }
  return getBrowserTimezone();
}

export function formatTimezoneLabel(timeZone: string, city?: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone,
    timeZoneName: "longGeneric",
  });
  const parts = formatter.formatToParts(new Date());
  const name =
    parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
  return city ? `${name} (${city})` : name;
}
