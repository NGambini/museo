import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from '@/components/ui/scroll-view';
import { VStack } from '@/components/ui/vstack';
import { Header } from '@/components/Header';

export function MuseumScreenView() {
  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background-0">
      <Header />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <VStack space="xl" className="px-4 pt-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
