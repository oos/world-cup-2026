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

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Amsterdam: { lat: 52.3676, lng: 4.9041 },
  Athens: { lat: 37.9838, lng: 23.7275 },
  Auckland: { lat: -36.8485, lng: 174.7633 },
  Bangkok: { lat: 13.7563, lng: 100.5018 },
  Barcelona: { lat: 41.3851, lng: 2.1734 },
  Beijing: { lat: 39.9042, lng: 116.4074 },
  Berlin: { lat: 52.52, lng: 13.405 },
  Bogotá: { lat: 4.711, lng: -74.0721 },
  Brisbane: { lat: -27.4698, lng: 153.0251 },
  "Buenos Aires": { lat: -34.6037, lng: -58.3816 },
  Cairo: { lat: 30.0444, lng: 31.2357 },
  "Cape Town": { lat: -33.9249, lng: 18.4241 },
  Chicago: { lat: 41.8781, lng: -87.6298 },
  Dallas: { lat: 32.7767, lng: -96.797 },
  Delhi: { lat: 28.7041, lng: 77.1025 },
  Denver: { lat: 39.7392, lng: -104.9903 },
  Dubai: { lat: 25.2048, lng: 55.2708 },
  Dublin: { lat: 53.3498, lng: -6.2603 },
  Helsinki: { lat: 60.1699, lng: 24.9384 },
  "Hong Kong": { lat: 22.3193, lng: 114.1694 },
  Houston: { lat: 29.7604, lng: -95.3698 },
  Istanbul: { lat: 41.0082, lng: 28.9784 },
  Jakarta: { lat: -6.2088, lng: 106.8456 },
  Johannesburg: { lat: -26.2041, lng: 28.0473 },
  "Kuala Lumpur": { lat: 3.139, lng: 101.6869 },
  Lagos: { lat: 6.5244, lng: 3.3792 },
  Lisbon: { lat: 38.7223, lng: -9.1393 },
  London: { lat: 51.5074, lng: -0.1278 },
  "Los Angeles": { lat: 34.0522, lng: -118.2437 },
  Madrid: { lat: 40.4168, lng: -3.7038 },
  Manila: { lat: 14.5995, lng: 120.9842 },
  Melbourne: { lat: -37.8136, lng: 144.9631 },
  "Mexico City": { lat: 19.4326, lng: -99.1332 },
  Miami: { lat: 25.7617, lng: -80.1918 },
  Montreal: { lat: 45.5017, lng: -73.5673 },
  Moscow: { lat: 55.7558, lng: 37.6173 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Nairobi: { lat: -1.2921, lng: 36.8219 },
  "New York": { lat: 40.7128, lng: -74.006 },
  Oslo: { lat: 59.9139, lng: 10.7522 },
  Paris: { lat: 48.8566, lng: 2.3522 },
  Perth: { lat: -31.9505, lng: 115.8605 },
  Prague: { lat: 50.0755, lng: 14.4378 },
  Riyadh: { lat: 24.7136, lng: 46.6753 },
  Rome: { lat: 41.9028, lng: 12.4964 },
  "San Francisco": { lat: 37.7749, lng: -122.4194 },
  Santiago: { lat: -33.4489, lng: -70.6693 },
  "São Paulo": { lat: -23.5505, lng: -46.6333 },
  Seattle: { lat: 47.6062, lng: -122.3321 },
  Seoul: { lat: 37.5665, lng: 126.978 },
  Singapore: { lat: 1.3521, lng: 103.8198 },
  Stockholm: { lat: 59.3293, lng: 18.0686 },
  Sydney: { lat: -33.8688, lng: 151.2093 },
  Tokyo: { lat: 35.6762, lng: 139.6503 },
  Toronto: { lat: 43.6532, lng: -79.3832 },
  Vancouver: { lat: 49.2827, lng: -123.1207 },
  Vienna: { lat: 48.2082, lng: 16.3738 },
  Warsaw: { lat: 52.2297, lng: 21.0122 },
  "Washington DC": { lat: 38.9072, lng: -77.0369 },
  Zurich: { lat: 47.3769, lng: 8.5417 },
};

function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestCity(lat: number, lng: number): string | null {
  let nearestCity: string | null = null;
  let minDistance = Infinity;

  for (const option of CITY_TIMEZONE_OPTIONS) {
    const coords = CITY_COORDINATES[option.city];
    if (!coords) continue;

    const distance = haversineDistanceKm(lat, lng, coords.lat, coords.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = option.city;
    }
  }

  return nearestCity;
}

const timezoneByCity = new Map(
  CITY_TIMEZONE_OPTIONS.map((option) => [option.city, option.timezone])
);

export function getTimezoneForCity(city: string): string | undefined {
  return timezoneByCity.get(city);
}

export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function resolveUserTimezone(city: string, preferredTimezone = ""): string {
  if (preferredTimezone) return preferredTimezone;
  if (city) {
    const timezone = getTimezoneForCity(city);
    if (timezone) return timezone;
  }
  return getBrowserTimezone();
}

export function getTimezoneOptions(): { value: string; label: string }[] {
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [];

  const addOption = (timezone: string) => {
    if (seen.has(timezone)) return;
    seen.add(timezone);
    options.push({
      value: timezone,
      label: formatTimezoneLabel(timezone),
    });
  };

  for (const option of CITY_TIMEZONE_OPTIONS) {
    addOption(option.timezone);
  }

  addOption(getBrowserTimezone());

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export function toTimezonePreference(city: string, selectedTimezone: string): string {
  const cityDefault = city ? getTimezoneForCity(city) : undefined;
  if (cityDefault && selectedTimezone === cityDefault) return "";
  if (!city && selectedTimezone === getBrowserTimezone()) return "";
  return selectedTimezone;
}

export function formatResolvedTimezoneLabel(
  city: string,
  preferredTimezone = "",
): string {
  const effectiveTimezone = resolveUserTimezone(city, preferredTimezone);
  const cityDefault = city ? getTimezoneForCity(city) : undefined;
  const usesCityDefault =
    Boolean(city) &&
    (!preferredTimezone || preferredTimezone === cityDefault);

  return formatTimezoneLabel(
    effectiveTimezone,
    usesCityDefault ? city : undefined,
  );
}

const TIMEZONE_LABEL_OVERRIDES: Record<string, string> = {
  "Ireland Time": "Irish Time",
  "United Kingdom Time": "British Time",
  "Türkiye Time": "Turkish Time",
  "Turkey Time": "Turkish Time",
  "Chile Time": "Chilean Time",
  "Japan Standard Time": "Japanese Standard Time",
  "China Standard Time": "Chinese Standard Time",
  "Colombia Standard Time": "Colombian Standard Time",
  "India Standard Time": "Indian Standard Time",
  "Argentina Standard Time": "Argentine Standard Time",
  "South Africa Standard Time": "South African Standard Time",
  "Malaysia Time": "Malaysian Time",
  "Singapore Standard Time": "Singaporean Standard Time",
};

function toDemonymTimezoneLabel(label: string): string {
  return TIMEZONE_LABEL_OVERRIDES[label] ?? label;
}

export function formatTimezoneLabel(timeZone: string, city?: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone,
    timeZoneName: "longGeneric",
  });
  const parts = formatter.formatToParts(new Date());
  const name =
    parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
  const label = toDemonymTimezoneLabel(name);
  return city ? `${label} (${city})` : label;
}
