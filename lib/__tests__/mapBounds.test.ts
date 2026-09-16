import {
  clampRegionToBounds,
  isRegionOutOfBounds,
  regionForCoordinates,
  scaleToFitBounds,
  MARSEILLE_BOUNDS,
  MARSEILLE_REGION,
  MIN_LATITUDE_DELTA,
  type Region,
} from '../mapBounds';

const BOUNDS_HEIGHT = MARSEILLE_BOUNDS.north - MARSEILLE_BOUNDS.south;
const BOUNDS_WIDTH = MARSEILLE_BOUNDS.east - MARSEILLE_BOUNDS.west;

// MapKit always renders the region at the view's aspect ratio: in Marseille,
// for a square view, a longitude delta is roughly 1.37x the latitude delta.
const VIEW_RATIO = 1.37;

function regionAt(latitudeDelta: number, latitude = 43.2965, longitude = 5.3698): Region {
  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta: latitudeDelta * VIEW_RATIO,
  };
}

const insideRegion = regionAt(0.02);

describe('scaleToFitBounds', () => {
  it('leaves a fitting region alone', () => {
    expect(scaleToFitBounds(insideRegion)).toBe(1);
  });

  it('shrinks a region zoomed out past the bounds', () => {
    expect(scaleToFitBounds(regionAt(1))).toBeLessThan(1);
  });

  it('grows a region zoomed in past the maximum', () => {
    expect(scaleToFitBounds(regionAt(0.0005))).toBeGreaterThan(1);
  });

  it('is driven by whichever axis is tightest', () => {
    // A very wide view saturates in longitude well before it does in latitude.
    const wide: Region = { ...insideRegion, latitudeDelta: 0.1, longitudeDelta: 0.9 };
    expect(scaleToFitBounds(wide)).toBeCloseTo(BOUNDS_WIDTH / 0.9, 6);
  });
});

describe('clampRegionToBounds', () => {
  it('leaves a region already inside the bounds untouched', () => {
    expect(clampRegionToBounds(insideRegion)).toEqual(insideRegion);
  });

  it('pulls a region drifting north back inside', () => {
    const result = clampRegionToBounds(regionAt(0.02, 43.9));
    expect(result.latitude).toBeCloseTo(MARSEILLE_BOUNDS.north - 0.01, 6);
  });

  it('pulls a region drifting south-west back inside', () => {
    const result = clampRegionToBounds(regionAt(0.02, 42.5, 4.1));
    expect(result.latitude).toBeCloseTo(MARSEILLE_BOUNDS.south + 0.01, 6);
    expect(result.longitude).toBeCloseTo(MARSEILLE_BOUNDS.west + (0.02 * VIEW_RATIO) / 2, 6);
  });

  // The regression that broke clamping: correcting a single axis made MapKit
  // restore the other one, and the correction looped forever.
  it('preserves the aspect ratio of the region it corrects', () => {
    const tooWide = regionAt(1);
    const result = clampRegionToBounds(tooWide);
    expect(result.longitudeDelta / result.latitudeDelta).toBeCloseTo(VIEW_RATIO, 6);
  });

  // Longitude saturates before latitude at this ratio: it is exactly centred,
  // while latitude keeps a tiny bit of wiggle room.
  it('centres on the bounds once the view is as wide as them', () => {
    const result = clampRegionToBounds(regionAt(1, 43.9, 4.1));
    expect(result.longitude).toBeCloseTo((MARSEILLE_BOUNDS.east + MARSEILLE_BOUNDS.west) / 2, 9);
    expect(result.latitude).toBeCloseTo((MARSEILLE_BOUNDS.north + MARSEILLE_BOUNDS.south) / 2, 3);
  });

  it('never returns a region larger than the bounds', () => {
    const result = clampRegionToBounds(regionAt(5, 43.9, 4.1));
    expect(result.latitudeDelta).toBeLessThanOrEqual(BOUNDS_HEIGHT + 1e-9);
    expect(result.longitudeDelta).toBeLessThanOrEqual(BOUNDS_WIDTH + 1e-9);
  });

  it('caps how far the user can zoom in', () => {
    const result = clampRegionToBounds(regionAt(0.0005));
    expect(result.latitudeDelta).toBeCloseTo(MIN_LATITUDE_DELTA, 9);
  });

  // A clamp that does not converge in one go restarts the animation forever.
  it('is idempotent', () => {
    const once = clampRegionToBounds(regionAt(3, 43.9, 4.1));
    expect(clampRegionToBounds(once)).toEqual(once);
  });
});

describe('isRegionOutOfBounds', () => {
  it('is false for the default Marseille region', () => {
    expect(isRegionOutOfBounds(MARSEILLE_REGION)).toBe(false);
  });

  it('is false for a region inside the bounds', () => {
    expect(isRegionOutOfBounds(insideRegion)).toBe(false);
  });

  it('is true once the region escapes the bounds', () => {
    expect(isRegionOutOfBounds(regionAt(0.02, 43.2965, 6.5))).toBe(true);
  });

  it('is true when zoomed out past the bounds', () => {
    expect(isRegionOutOfBounds(regionAt(1))).toBe(true);
  });

  it('is true when zoomed in past the maximum', () => {
    expect(isRegionOutOfBounds(regionAt(0.0005))).toBe(true);
  });

  // Anti-loop guard: the region MapKit renders is never exactly the one we
  // asked for.
  it('accepts the region it just produced, however MapKit rounds it', () => {
    const clamped = clampRegionToBounds(regionAt(1, 43.9, 4.1));
    expect(
      isRegionOutOfBounds({
        ...clamped,
        latitude: clamped.latitude - 2e-5,
        latitudeDelta: clamped.latitudeDelta * 1.005,
        longitudeDelta: clamped.longitudeDelta * 1.005,
      })
    ).toBe(false);
  });
});

describe('regionForCoordinates', () => {
  const audioguides = [
    { latitude: 43.3001517, longitude: 5.3678971 },
    { latitude: 43.2992976, longitude: 5.3647017 },
    { latitude: 43.2903502, longitude: 5.3655664 },
  ];

  it('returns null without coordinates', () => {
    expect(regionForCoordinates([])).toBeNull();
  });

  it('centres on the middle of the points', () => {
    const region = regionForCoordinates(audioguides)!;
    expect(region.latitude).toBeCloseTo((43.3001517 + 43.2903502) / 2, 6);
    expect(region.longitude).toBeCloseTo((5.3678971 + 5.3647017) / 2, 6);
  });

  it('spans wider than the points themselves so none sits on the edge', () => {
    const region = regionForCoordinates(audioguides)!;
    expect(region.latitudeDelta).toBeGreaterThan(43.3001517 - 43.2903502);
  });

  it('falls back to the maximum zoom for a single point', () => {
    const region = regionForCoordinates([audioguides[0]])!;
    expect(region.latitudeDelta).toBe(MIN_LATITUDE_DELTA);
    expect(region.longitudeDelta).toBe(MIN_LATITUDE_DELTA);
  });

  it('produces a region that already sits inside the bounds', () => {
    const region = regionForCoordinates(audioguides)!;
    expect(isRegionOutOfBounds(region)).toBe(false);
  });
});
