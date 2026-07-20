import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { HomeScreenView } from '@/components/screenviews/HomeScreenView';
import type { MapPin } from '@/components/map';
import { MAP_ZOOM, MAP_WIDTH, MAP_HEIGHT, MAP_SCALE, MAX_PINS, computeRadius } from '@/lib/mapUtils';
import { fetchPlaceSuggestions, fetchPlaceDetails, type PlaceSuggestion } from '@/lib/placesApi';
import { useGenerateAudioguide } from '@/api/audioguides';
import { getHistory, type HistoryItem as StoredHistoryItem } from '@/lib/historyStore';

const SEARCH_DEBOUNCE_MS = 300;

const EIFFEL_TOWER = { latitude: 48.8584, longitude: 2.2945 };

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
  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: location.coords.latitude, longitude: location.coords.longitude };
}

async function fetchCulturalPlaces(center: Coords): Promise<RawPlace[]> {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const radius = computeRadius(center.latitude);
  const base = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${center.latitude},${center.longitude}&radius=${radius}&key=${key}`;
  const [r1, r2] = await Promise.all([fetch(`${base}&type=museum`), fetch(`${base}&type=tourist_attraction`)]);
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
  const router = useRouter();
  const mapRef = useRef<View>(null) as React.RefObject<View>;
  const generateAudioguide = useGenerateAudioguide();

  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<Coords | null>(null);
  const [mapPins, setMapPins] = useState<MapPin[]>([]);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [historyItems, setHistoryItems] = useState<StoredHistoryItem[]>([]);
  const searchQueryRef = useRef('');
  const suppressNextSearchRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setSearchQuery('');
      setSuggestions([]);

      const loadHistory = async () => {
        const storedHistory = await getHistory().catch(() => []);
        if (active) {
          setHistoryItems(storedHistory);
        }
      };

      loadHistory();

      return () => {
        active = false;
      };
    }, [])
  );

  useEffect(() => {
    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false;
      return;
    }
    const query = searchQuery.trim();
    if (!query) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timeout = setTimeout(async () => {
      const results = await fetchPlaceSuggestions(query).catch(() => []);
      if (searchQueryRef.current === query) {
        setSuggestions(results);
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    (async () => {
      const storedHistory = await getHistory().catch(() => []);
      setHistoryItems(storedHistory);
    })();
  }, []);

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

  const handlePinSelect = (pin: MapPin, localCoords: { x: number; y: number }) => {
    if (selectedPin?.id === pin.id) {
      setSelectedPin(null);
      setTooltipPos(null);
      return;
    }
    mapRef.current?.measure((_fx, _fy, _w, _h, pageX, pageY) => {
      setSelectedPin(pin);
      setTooltipPos({
        x: pageX + localCoords.x,
        y: pageY + localCoords.y - 10,
      });
    });
  };

  const dismissTooltip = () => {
    setSelectedPin(null);
    setTooltipPos(null);
  };

  const handlePinPress = (pin: MapPin) => {
    generateAudioguide.mutate({ place_id: pin.id });
    router.push({
      pathname: '/LottieTransitionScreen',
      params: { placeId: pin.id, image: pin.photoUrl ?? '', name: pin.name },
    });
  };

  const handleTapHistoryItem = (placeId: string) => {
    router.push({
      pathname: '/MuseumScreen',
      params: { id: placeId },
    });
  };

  const handleSearchQueryChange = (text: string) => {
    searchQueryRef.current = text.trim();
    setSearchQuery(text);
  };

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    suppressNextSearchRef.current = true;
    setSearchQuery(suggestion.mainText);
    setSuggestions([]);

    const place = await fetchPlaceDetails(suggestion.placeId).catch(() => null);
    if (!place) return;

    const pin: MapPin = {
      id: place.placeId,
      name: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      photoUrl: place.photoUrl,
    };
    const center = { latitude: pin.latitude, longitude: pin.longitude };
    setMapCenter(center);
    setMapUrl(buildStaticMapUrl(center));
    setMapPins((prev) => [pin, ...prev.filter((p) => p.id !== pin.id)].slice(0, MAX_PINS));
    handlePinPress(pin);
  };

  return (
    <HomeScreenView
      mapRef={mapRef}
      mapUrl={mapUrl}
      mapCenter={mapCenter}
      mapPins={mapPins}
      historyItems={historyItems}
      selectedPin={selectedPin}
      tooltipPos={tooltipPos}
      onPinSelect={handlePinSelect}
      onPinPress={handlePinPress}
      onDismiss={dismissTooltip}      onTapHistoryItem={handleTapHistoryItem}      searchQuery={searchQuery}
      onSearchQueryChange={handleSearchQueryChange}
      suggestions={suggestions}
      isSearching={isSearching}
      onSelectSuggestion={handleSelectSuggestion}
    />
  );
}
