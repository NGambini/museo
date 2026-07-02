import React, { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { HomeScreenView, type HistoryItem, type MapPin } from '@/components/screenviews/HomeScreenView';
import { MAP_ZOOM, MAP_WIDTH, MAP_HEIGHT, MAP_SCALE, MAX_PINS, computeRadius } from '@/lib/mapUtils';

const EIFFEL_TOWER = { latitude: 48.8584, longitude: 2.2945 };

const HISTORY_ITEMS: HistoryItem[] = [
  {
    title: 'Renaissance Hall Walkthrough',
    subtitle: 'Completed 2 days ago • 45 mins',
    image: 'https://www.figma.com/api/mcp/asset/237dab6b-4282-475d-886d-ff98fcd5e19a',
  },
  {
    title: 'Egyptian Antiquities: Key Statues',
    subtitle: 'Completed 5 days ago • 1h 20m',
    image: 'https://www.figma.com/api/mcp/asset/49e7393f-8f41-49ab-af33-2c31224052d7',
  },
  {
    title: 'Main Floor Architecture Tour',
    subtitle: 'Completed 1 week ago • 30 mins',
    image: 'https://www.figma.com/api/mcp/asset/ded46baa-f577-4a0d-91f8-52b3649f9527',
  },
];

type Coords = { latitude: number; longitude: number };

type RawPlace = {
  place_id: string;
  name: string;
  geometry: { location: { lat: number; lng: number } };
  photos?: Array<{ photo_reference: string }>;
};

async function getUserCenter(): Promise<Coords> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return EIFFEL_TOWER;

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

async function fetchCulturalPlaces(center: Coords): Promise<RawPlace[]> {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const radius = computeRadius(center.latitude);
  const base = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${center.latitude},${center.longitude}&radius=${radius}&key=${key}`;

  const [r1, r2] = await Promise.all([
    fetch(`${base}&type=museum`),
    fetch(`${base}&type=tourist_attraction`),
  ]);
  const [d1, d2] = await Promise.all([r1.json(), r2.json()]);

  const seen = new Set<string>();
  return [...(d1.results ?? []), ...(d2.results ?? [])].filter((p: RawPlace) => {
    if (seen.has(p.place_id)) return false;
    seen.add(p.place_id);
    return true;
  });
}

function buildStaticMapUrl(center: Coords): string {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  return [
    `https://maps.googleapis.com/maps/api/staticmap?center=${center.latitude},${center.longitude}`,
    `zoom=${MAP_ZOOM}`,
    `size=${MAP_WIDTH}x${MAP_HEIGHT}`,
    `scale=${MAP_SCALE}`,
    'maptype=roadmap',
    `key=${key}`,
  ].join('&');
}

export default function HomeScreen() {
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<Coords | null>(null);
  const [mapPins, setMapPins] = useState<MapPin[]>([]);

  useEffect(() => {
    (async () => {
      const center = await getUserCenter().catch(() => EIFFEL_TOWER);
      const rawPlaces = await fetchCulturalPlaces(center).catch(() => []);

      const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      const pins: MapPin[] = rawPlaces.slice(0, MAX_PINS).map((p, i) => {
        const photoRef = p.photos?.[0]?.photo_reference;
        return {
          id: p.place_id,
          name: p.name,
          latitude: p.geometry.location.lat,
          longitude: p.geometry.location.lng,
          primary: i === 0,
          photoUrl: photoRef
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${key}`
            : null,
        };
      });

      setMapCenter(center);
      setMapPins(pins);
      setMapUrl(buildStaticMapUrl(center));
    })();
  }, []);

  const handlePinPress = (pin: MapPin) => {
    // TODO: navigate to place detail screen
    console.log('Pin pressed:', pin.name);
  };

  return (
    <HomeScreenView
      mapUrl={mapUrl}
      mapCenter={mapCenter}
      mapPins={mapPins}
      historyItems={HISTORY_ITEMS}
      onPinPress={handlePinPress}
    />
  );
}
