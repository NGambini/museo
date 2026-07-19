export type PlaceSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

export type PlaceDetails = {
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
  photoUrl: string | null;
};

// Google place types considered relevant for an audioguide: museums, cultural
// venues, places of worship and other landmark-type buildings.
const CULTURAL_TYPES = new Set([
  'museum',
  'art_gallery',
  'church',
  'hindu_temple',
  'mosque',
  'synagogue',
  'place_of_worship',
  'tourist_attraction',
  'city_hall',
  'courthouse',
]);

type AutocompletePrediction = {
  place_id: string;
  description: string;
  types?: string[];
  structured_formatting?: { main_text: string; secondary_text?: string };
};

export async function fetchPlaceSuggestions(input: string): Promise<PlaceSuggestion[]> {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const params = new URLSearchParams({
    input,
    key: key ?? '',
    components: 'country:fr',
    language: 'fr',
    types: 'establishment',
  });
  const res = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`);
  const data = await res.json();
  const predictions: AutocompletePrediction[] = data.predictions ?? [];

  return predictions
    .filter((p) => p.types?.some((t) => CULTURAL_TYPES.has(t)))
    .map((p) => ({
      placeId: p.place_id,
      mainText: p.structured_formatting?.main_text ?? p.description,
      secondaryText: p.structured_formatting?.secondary_text ?? '',
    }));
}

export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  const params = new URLSearchParams({
    place_id: placeId,
    key: key ?? '',
    fields: 'place_id,name,geometry,photos',
  });

  const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`);
  const data = await res.json();

  const result = data.result as {
    place_id: string;
    name: string;
    geometry: { location: { lat: number; lng: number } };
    photos?: Array<{ photo_reference: string }>;
  } | undefined;
  if (!result) return null;

  const photoRef = result.photos?.[0]?.photo_reference;
  return {
    placeId: result.place_id,
    name: result.name,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    photoUrl: photoRef
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${key}`
      : null,
  };
}
