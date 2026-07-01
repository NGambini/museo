import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from '@/components/ui/scroll-view';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Image } from '@/components/ui/image';
import { Pressable } from '@/components/ui/pressable';
import { Divider } from '@/components/ui/divider';
import { Search, Clock, ChevronRight, User, ChevronDown } from 'lucide-react-native';

const buildStaticMapUrl = () => {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const params = [
    'center=48.8606,2.3376',
    'zoom=14',
    'size=640x480',
    'scale=2',
    'maptype=roadmap',
    'markers=color:0xf49d25|label:L|48.8606,2.3376',
    'markers=color:0xf49d25|size:small|48.8600,2.3266',
    'markers=color:0xf49d25|size:small|48.8554,2.3450',
    'markers=color:0xf49d25|size:small|48.8462,2.3508',
    `key=${key}`,
  ].join('&');
  return `https://maps.googleapis.com/maps/api/staticmap?${params}`;
};

const HISTORY_ITEMS = [
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

export interface HomeScreenViewProps {}

export function HomeScreenView({}: HomeScreenViewProps) {
  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-[#f9f9ff]">
      {/* Header */}
      <HStack className="items-center justify-between px-4 h-16 bg-[rgba(249,249,255,0.9)]">
        <Heading className="text-[#f49d25]" size="2xl">
          Museo
        </Heading>
        <Pressable className="flex-row items-center p-2 rounded-full">
          <User size={20} color="#6b7280" />
          <ChevronDown size={12} color="#6b7280" />
        </Pressable>
      </HStack>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <VStack space="xl" className="px-4 pt-4">

          {/* Search bar */}
          <HStack className="items-center bg-[#f1f3ff] rounded-full px-4 py-3 shadow-sm">
            <Search size={18} color="#6b7280" />
            <Text className="ml-3 text-[#6b7280]" size="md">
              Find a place
            </Text>
          </HStack>

          {/* Map section */}
          <Box className="w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-md">
            <Image
              source={{ uri: buildStaticMapUrl() }}
              size="none"
              className="w-full h-full"
              resizeMode="cover"
              alt="Paris map"
            />
          </Box>

          {/* History section */}
          <Box className="bg-[#f1f3ff] rounded-3xl p-6">
            <HStack className="items-center gap-3 mb-6">
              <Clock size={21} color="#f49d25" />
              <Text className="text-[#f49d25]" size="md">
                +Historique
              </Text>
            </HStack>

            <VStack>
              {HISTORY_ITEMS.map((item, index) => (
                <Box key={index}>
                  {index > 0 && <Divider orientation="horizontal" className="bg-[rgba(217,195,174,0.3)]" />}
                  <Pressable>
                    <HStack className="items-center justify-between py-4">
                      <HStack className="items-center gap-4 flex-1 mr-3">
                        <Image
                          source={{ uri: item.image }}
                          size="none"
                          className="w-12 h-12 rounded-xl bg-[#dce2f7]"
                          resizeMode="cover"
                          alt={item.title}
                        />
                        <VStack className="flex-1">
                          <Text className="text-[#141b2b] font-bold" size="sm" numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text className="text-[#6b7280] mt-0.5" size="xs">
                            {item.subtitle}
                          </Text>
                        </VStack>
                      </HStack>
                      <ChevronRight size={16} color="#6b7280" />
                    </HStack>
                  </Pressable>
                </Box>
              ))}
            </VStack>
          </Box>

        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
