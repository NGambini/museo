import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from '@/components/ui/scroll-view';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Switch } from '@/components/ui/switch';
import { Header } from '@/components/Header';
import { MoonStar } from 'lucide-react-native';
import { theme } from '@/constants/theme';

export interface SettingsScreenViewProps {
  darkTheme: boolean;
  onToggleDarkTheme: () => void;
}

export function SettingsScreenView({ darkTheme, onToggleDarkTheme }: SettingsScreenViewProps) {
  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background-0">
      <Header title="Settings" />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <VStack space="xl" className="px-4 pt-4">
          <Box className="rounded-2xl border border-outline-200 bg-background-50 p-4">
            <HStack className="items-center justify-between">
              <HStack space="sm" className="items-center flex-1">
                <Box className="rounded-full bg-primary-100 p-2">
                  <MoonStar size={18} color={theme.primary} />
                </Box>
                <VStack className="flex-1 min-w-0">
                  <Text className="text-typography-900 font-spaced break-words">Thème sombre</Text>
                  <Text className="text-typography-500 text-sm break-words">Passez l’application en mode sombre.</Text>
                </VStack>
              </HStack>
              <Switch value={darkTheme} onValueChange={onToggleDarkTheme} />
            </HStack>
          </Box>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
