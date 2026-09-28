export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type Bounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

/** Marseille intra-muros, un peu élargi pour ne pas coller aux quartiers de bord. */
export const MARSEILLE_BOUNDS: Bounds = {
  north: 43.3910,
  south: 43.1690,
  east: 5.5320,
  west: 5.2280,
};

export const MARSEILLE_REGION: Region = {
  latitude: 43.2965,
  longitude: 5.3698,
  latitudeDelta: 0.09,
  longitudeDelta: 0.09,
};

/** Maximum zoom, expressed as a latitude delta: ~500 m tall on screen. */
export const MIN_LATITUDE_DELTA = 0.005;

// Deliberately loose tolerances: MapKit never renders exactly the region we
// asked for, and reacting to those tiny deviations would re-trigger
// animateToRegion in a loop.
const CENTER_EPSILON = 1e-4; // ~11 m
const DELTA_TOLERANCE = 1.02; // 2 %

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Re-centres one axis. When the visible area is wider than the frame,
 * constraining it makes no sense: we centre it on the frame instead.
 */
function clampCenter(center: number, delta: number, min: number, max: number): number {
  if (delta >= max - min) return (min + max) / 2;
  return clamp(center, min + delta / 2, max - delta / 2);
}

/**
 * Scale factor to apply to both deltas so that the region fits inside the
 * frame, without ever exceeding the maximum zoom.
 *
 * The crucial point: both deltas get the SAME scale. MapKit always renders a
 * region at its view's aspect ratio; if we only correct one axis, it restores
 * the other on the next render, the region escapes the frame again, and we go
 * for another round — that is what kept the clamping from "sticking".
 */
export function scaleToFitBounds(region: Region, bounds: Bounds = MARSEILLE_BOUNDS): number {
  const maxScale = Math.min(
    (bounds.north - bounds.south) / region.latitudeDelta,
    (bounds.east - bounds.west) / region.longitudeDelta
  );

  // Zoomed out too far: tighten down to the frame.
  if (maxScale < 1) return maxScale;

  // Zoomed in too far: loosen up, without ever exceeding the frame.
  if (region.latitudeDelta < MIN_LATITUDE_DELTA) {
    return Math.min(MIN_LATITUDE_DELTA / region.latitudeDelta, maxScale);
  }

  return 1;
}

/** Brings a region back inside the frame, keeping its ratio, then re-centres it. */
export function clampRegionToBounds(region: Region, bounds: Bounds = MARSEILLE_BOUNDS): Region {
  const scale = scaleToFitBounds(region, bounds);

  const latitudeDelta = region.latitudeDelta * scale;
  const longitudeDelta = region.longitudeDelta * scale;

  return {
    latitudeDelta,
    longitudeDelta,
    latitude: clampCenter(region.latitude, latitudeDelta, bounds.south, bounds.north),
    longitude: clampCenter(region.longitude, longitudeDelta, bounds.west, bounds.east),
  };
}

/**
 * True only when the deviation really warrants reframing the camera.
 */
export function isRegionOutOfBounds(region: Region, bounds: Bounds = MARSEILLE_BOUNDS): boolean {
  const scale = scaleToFitBounds(region, bounds);
  if (scale < 1 / DELTA_TOLERANCE || scale > DELTA_TOLERANCE) return true;

  const clamped = clampRegionToBounds(region, bounds);
  return (
    Math.abs(clamped.latitude - region.latitude) > CENTER_EPSILON ||
    Math.abs(clamped.longitude - region.longitude) > CENTER_EPSILON
  );
}

/** Region enclosing a list of points, with a relative margin. */
export function regionForCoordinates(
  coordinates: Array<{ latitude: number; longitude: number }>,
  paddingRatio = 0.35
): Region | null {
  if (coordinates.length === 0) return null;

  const latitudes = coordinates.map((c) => c.latitude);
  const longitudes = coordinates.map((c) => c.longitude);

  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);

  // A single point, or several overlapping ones: fall back to the maximum zoom.
  const latitudeDelta = Math.max((north - south) * (1 + paddingRatio), MIN_LATITUDE_DELTA);
  const longitudeDelta = Math.max((east - west) * (1 + paddingRatio), MIN_LATITUDE_DELTA);

  return {
    latitude: (north + south) / 2,
    longitude: (east + west) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}
