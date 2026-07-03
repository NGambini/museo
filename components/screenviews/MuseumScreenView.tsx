import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from '@/components/ui/scroll-view';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Image } from '@/components/ui/image';
import { Header } from '@/components/Header';

export interface MuseumScreenViewProps {
  placeId?: string;
  image?: string;
  name?: string;
}

export function MuseumScreenView({ image, name }: MuseumScreenViewProps) {
  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background-0">
      <Header />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <VStack space="xl" className="px-4 pt-4">
          {image ? (
            <Image
              source={{ uri: image }}
              size="none"
              className="w-full h-48 rounded-2xl bg-background-100"
              resizeMode="cover"
              alt={name ?? 'Musée'}
            />
          ) : null}

          {name ? (
            <Text className="text-typography-900 font-bold" size="xl">
              {name}
            </Text>
          ) : null}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
