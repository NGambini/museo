import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

/**
 * Requests location permission on first render. We do not fetch the position
 * ourselves: react-native-maps handles it through showsUserLocation once the
 * permission is granted.
 */
export function useUserLocationPermission(): boolean {
  const [isGranted, setIsGranted] = useState(false);

  useEffect(() => {
    let active = true;

    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => {
        if (active) setIsGranted(status === Location.PermissionStatus.GRANTED);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  return isGranted;
}
