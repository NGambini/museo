import {
  clampRegionToBounds,
  isRegionOutOfBounds,
  MARSEILLE_BOUNDS,
  MARSEILLE_REGION,
  MIN_LATITUDE_DELTA,
  type Region,
} from '../mapBounds';

const insideRegion: Region = {
  latitude: 43.2965,
  longitude: 5.3698,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

describe('clampRegionToBounds', () => {
  it('leaves a region already inside the bounds untouched', () => {
    expect(clampRegionToBounds(insideRegion)).toEqual(insideRegion);
  });

  it('pulls a region drifting north back inside', () => {
    const result = clampRegionToBounds({ ...insideRegion, latitude: 43.9 });
    expect(result.latitude).toBeCloseTo(MARSEILLE_BOUNDS.north - 0.01, 6);
  });

  it('pulls a region drifting south-west back inside', () => {
    const result = clampRegionToBounds({ ...insideRegion, latitude: 42.5, longitude: 4.1 });
    expect(result.latitude).toBeCloseTo(MARSEILLE_BOUNDS.south + 0.01, 6);
    expect(result.longitude).toBeCloseTo(MARSEILLE_BOUNDS.west + 0.01, 6);
  });

  it('caps the deltas when the user zooms out past the bounds', () => {
    const result = clampRegionToBounds({ ...insideRegion, latitudeDelta: 5, longitudeDelta: 5 });
    expect(result.latitudeDelta).toBeCloseTo(MARSEILLE_BOUNDS.north - MARSEILLE_BOUNDS.south, 6);
    expect(result.longitudeDelta).toBeCloseTo(MARSEILLE_BOUNDS.east - MARSEILLE_BOUNDS.west, 6);
  });

  it('keeps a fully zoomed out region centred on the bounds', () => {
    const result = clampRegionToBounds({ ...insideRegion, latitudeDelta: 5, longitudeDelta: 5 });
    expect(result.latitude).toBeCloseTo((MARSEILLE_BOUNDS.north + MARSEILLE_BOUNDS.south) / 2, 6);
    expect(result.longitude).toBeCloseTo((MARSEILLE_BOUNDS.east + MARSEILLE_BOUNDS.west) / 2, 6);
  });

  it('caps how far the user can zoom in', () => {
    const result = clampRegionToBounds({ ...insideRegion, latitudeDelta: 0.0001 });
    expect(result.latitudeDelta).toBe(MIN_LATITUDE_DELTA);
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
    expect(isRegionOutOfBounds({ ...insideRegion, longitude: 6.5 })).toBe(true);
  });

  it('is true when zoomed out past the bounds', () => {
    expect(isRegionOutOfBounds({ ...insideRegion, latitudeDelta: 2 })).toBe(true);
  });

  it('is true when zoomed in past the maximum', () => {
    expect(isRegionOutOfBounds({ ...insideRegion, latitudeDelta: 0.0001 })).toBe(true);
  });

  // Garde-fou anti-récursion : MapKit ne rend jamais exactement la région
  // demandée, et réagir à ces micro-écarts relançait animateToRegion en boucle.
  it('tolerates the small adjustments MapKit makes to a requested region', () => {
    const clamped = clampRegionToBounds({ ...insideRegion, latitude: 43.9 });
    const asRenderedByMapKit = {
      ...clamped,
      latitude: clamped.latitude - 2e-5,
      longitudeDelta: clamped.longitudeDelta * 1.02,
    };
    expect(isRegionOutOfBounds(asRenderedByMapKit)).toBe(false);
  });

  it('does not flag a region sitting exactly on the maximum zoom-out', () => {
    expect(
      isRegionOutOfBounds({
        latitude: (MARSEILLE_BOUNDS.north + MARSEILLE_BOUNDS.south) / 2,
        longitude: (MARSEILLE_BOUNDS.east + MARSEILLE_BOUNDS.west) / 2,
        latitudeDelta: MARSEILLE_BOUNDS.north - MARSEILLE_BOUNDS.south,
        longitudeDelta: MARSEILLE_BOUNDS.east - MARSEILLE_BOUNDS.west,
      })
    ).toBe(false);
  });
});
