export const MAP_ZOOM = 14;
export const MAP_WIDTH = 640;
export const MAP_HEIGHT = 480;
export const MAP_SCALE = 2;
export const MAX_PINS = 10;

function latLngToWorldPixel(lat: number, lng: number, zoom: number) {
  const worldSize = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * worldSize;
  const latRad = (lat * Math.PI) / 180;
  const y =
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) /
    2 *
    worldSize;
  return { x, y };
}

/**
 * Converts a geographic coordinate to a pixel position within the displayed
 * Static Maps image, given the map's center, zoom, and container dimensions.
 */
export function pinToDisplayCoords(
  pinLat: number,
  pinLng: number,
  centerLat: number,
  centerLng: number,
  displayWidth: number,
  displayHeight: number,
  zoom = MAP_ZOOM,
): { x: number; y: number } {
  const worldCenter = latLngToWorldPixel(centerLat, centerLng, zoom);
  const worldPin = latLngToWorldPixel(pinLat, pinLng, zoom);

  const dx = worldPin.x - worldCenter.x;
  const dy = worldPin.y - worldCenter.y;

  return {
    x: displayWidth / 2 + dx * (displayWidth / MAP_WIDTH),
    y: displayHeight / 2 + dy * (displayHeight / MAP_HEIGHT),
  };
}

export function computeRadius(latitude: number): number {
  const metersPerPixel =
    (156543.03392 * Math.cos((latitude * Math.PI) / 180)) /
    Math.pow(2, MAP_ZOOM);
  return Math.round(((MAP_WIDTH * MAP_SCALE) / 2) * metersPerPixel);
}
