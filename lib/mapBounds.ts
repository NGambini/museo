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

/** Zoom maximum, exprimé en delta : ~500 m de haut à l'écran. */
export const MIN_LATITUDE_DELTA = 0.005;

// Tolérances volontairement larges. MapKit réajuste toujours la région qu'on
// lui demande pour coller au ratio de la vue : comparer au strict provoquerait
// un aller-retour sans fin animateToRegion -> onRegionChangeComplete.
const CENTER_EPSILON = 1e-4; // ~11 m
const DELTA_TOLERANCE = 1.05; // 5 % de marge sur les deltas

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Ramène une région à l'intérieur des bounds : réduit d'abord le niveau de
 * dézoom pour que la zone visible tienne dans le cadre, puis recentre.
 */
export function clampRegionToBounds(region: Region, bounds: Bounds = MARSEILLE_BOUNDS): Region {
  const maxLatitudeDelta = bounds.north - bounds.south;
  const maxLongitudeDelta = bounds.east - bounds.west;

  const latitudeDelta = clamp(region.latitudeDelta, MIN_LATITUDE_DELTA, maxLatitudeDelta);
  const longitudeDelta = Math.min(region.longitudeDelta, maxLongitudeDelta);

  return {
    latitudeDelta,
    longitudeDelta,
    latitude: clamp(region.latitude, bounds.south + latitudeDelta / 2, bounds.north - latitudeDelta / 2),
    longitude: clamp(region.longitude, bounds.west + longitudeDelta / 2, bounds.east - longitudeDelta / 2),
  };
}

/**
 * True seulement si l'écart justifie vraiment de recadrer la caméra. Les
 * tolérances évitent de réagir aux micro-ajustements de MapKit.
 */
export function isRegionOutOfBounds(region: Region, bounds: Bounds = MARSEILLE_BOUNDS): boolean {
  const clamped = clampRegionToBounds(region, bounds);

  if (Math.abs(clamped.latitude - region.latitude) > CENTER_EPSILON) return true;
  if (Math.abs(clamped.longitude - region.longitude) > CENTER_EPSILON) return true;

  return (
    region.latitudeDelta > (bounds.north - bounds.south) * DELTA_TOLERANCE ||
    region.longitudeDelta > (bounds.east - bounds.west) * DELTA_TOLERANCE ||
    region.latitudeDelta < MIN_LATITUDE_DELTA / DELTA_TOLERANCE
  );
}
