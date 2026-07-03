import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { AppThemeProvider } from '@/providers/AppThemeProvider';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import '@/global.css';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { LogBox } from 'react-native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, asyncStoragePersister } from '@/lib/queryClient';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

// NativeWind registers style interop on RN's deprecated SafeAreaView getter on load,
// even though the app only uses SafeAreaView from react-native-safe-area-context.
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <GluestackUIProvider mode="light">
        <AppThemeProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </AppThemeProvider>
      </GluestackUIProvider>
    </PersistQueryClientProvider>
  );
}

function RootNavigator() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') return null;

  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
