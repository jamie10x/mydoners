const EARTH_RADIUS_METERS = 6_371_000;

// Straight-line distance underestimates a real route through city streets.
// 1.35 is a reasonable factor for Namangan's grid; it is a tuning constant,
// not a measurement.
const URBAN_DETOUR_FACTOR = 1.35;
// ~20 km/h — a scooter in city traffic, including lights and turns.
const AVG_SPEED_METERS_PER_SECOND = 5.5;
// Parking, finding the entrance, walking up, handing over.
const HANDOFF_MINUTES = 2;

export interface Point {
  latitude: number;
  longitude: number;
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversineMeters(a: Point, b: Point): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h)));
}

/**
 * Rough arrival estimate from straight-line distance.
 *
 * Deliberately not a routing API: the free tiers either forbid production use
 * or cap daily requests, and this runs on every position tick for every
 * in-flight order — a slow or rate-limited third party would stall the whole
 * fan-out. A detour factor plus an average speed lands within a few minutes
 * over a single-city delivery radius, which is all the UI shows anyway (it
 * rounds to 5-minute buckets behind a "~").
 *
 * Once order_logs is being read for real ON_THE_WAY→DELIVERED durations, the
 * speed constant can be replaced with a measured value.
 */
export function estimateEtaMinutes(straightLineMeters: number): number {
  const roadMeters = straightLineMeters * URBAN_DETOUR_FACTOR;
  const travelMinutes = roadMeters / AVG_SPEED_METERS_PER_SECOND / 60;
  return Math.min(Math.max(Math.ceil(travelMinutes) + HANDOFF_MINUTES, 1), 60);
}
