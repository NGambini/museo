import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react-native';
import { ScrollView } from '@/components/ui/scroll-view';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Image } from '@/components/ui/image';
import { Icon } from '@/components/ui/icon';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { AudioPlayer } from '@/components/AudioPlayer';
import type { Audioguide, AudioguideChapter } from '@/types/audioguide';

export interface MuseumScreenViewProps {
  image?: string;
  name?: string;
  audioguide?: Audioguide;
  chapterIndex?: number;
  onPreviousChapter?: () => void;
  onNextChapter?: () => void;
}

export function MuseumScreenView({
  image,
  name,
  audioguide,
  chapterIndex = 0,
  onPreviousChapter,
  onNextChapter,
}: MuseumScreenViewProps) {
  const chapters = audioguide?.attributes?.chapters ?? [];

  const insets = useSafeAreaInsets();
  const currentChapter = chapters[chapterIndex];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']} className="bg-background-0">
      <Header />

      <Box className="flex-1">
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          <VStack space="2xl" className="px-4 pt-4">
            {/* Intro block */}
            <VStack space="lg" className="w-full">
              {image ? (
                <Box className="w-full h-56 rounded-3xl overflow-hidden border border-outline-200/10 shadow-hard-5 bg-background-100">
                  <Image
                    source={{ uri: image }}
                    size="none"
                    className="w-full h-full"
                    resizeMode="cover"
                    alt={name ?? 'Musée'}
                  />
                </Box>
              ) : null}

              <VStack space="sm" className="w-full">
                <Text className="text-primary-500 font-bold uppercase tracking-widest" size="xs">
                  Audioguide personnalisé
                </Text>

                {name ? (
                  <Heading className="text-typography-900" size="2xl">
                    {name}
                  </Heading>
                ) : null}

                {audioguide?.attributes?.history ? (
                  <Text className="text-typography-600 leading-6" size="md">
                    {audioguide.attributes.history}
                  </Text>
                ) : null}
              </VStack>
            </VStack>

            {/* Chapter */}
            {currentChapter ? (
              <VStack space="lg" className="w-full">
                <HStack space="sm" className="items-center">
                  <Box className="bg-primary-500 h-1 w-8 rounded-full" />
                  <Heading className="text-typography-900" size="lg">
                    {currentChapter.title}
                  </Heading>
                </HStack>

                <VStack space="lg" className="w-full">
                  {currentChapter.image_url ? (
                    <Box className="w-full h-72 rounded-3xl overflow-hidden border border-outline-200/10 shadow-hard-5 bg-background-100">
                      <Image
                        source={{ uri: currentChapter.image_url }}
                        size="none"
                        className="w-full h-full"
                        resizeMode="cover"
                        alt={currentChapter.title}
                      />
                    </Box>
                  ) : null}

                  <VStack space="md" className="w-full bg-background-50 rounded-3xl p-6">
                    <HStack space="sm" className="items-center">
                      <Icon as={FileText} size="sm" className="text-primary-500" />
                      <Text className="text-primary-500 font-bold uppercase tracking-widest" size="xs">
                        Transcript
                      </Text>
                    </HStack>

                    {currentChapter.audio_url ? (
                      <AudioPlayer
                        key={currentChapter.chapter_number}
                        source={{ uri: currentChapter.audio_url }}
                        chapterLabel={`Chapter ${currentChapter.chapter_number}: ${currentChapter.title}`}
                        transcript={currentChapter.transcript}
                      />
                    ) : (
                      <Text className="text-typography-900 leading-6" size="md">
                        {currentChapter.text}
                      </Text>
                    )}
                  </VStack>
                </VStack>
              </VStack>
            ) : null}
          </VStack>
        </ScrollView>

        {currentChapter && chapters.length > 1 ? (
          <Box className="border-t border-outline-200/20 bg-background-0 px-4 pt-4 shadow-soft-1" style={{ paddingBottom: insets.bottom ?? 0 }}>
            <HStack className="w-full items-center">
              <Box className="flex-1 flex-row justify-start">
                <Button
                  variant="outline"
                  action="secondary"
                  className="rounded-full border-outline-200 px-4 py-2 items-center"
                  isDisabled={chapterIndex === 0}
                  onPress={onPreviousChapter}
                >
                  <ButtonIcon as={ChevronLeft} className="text-typography-600 self-center" />
                  <ButtonText className="text-typography-600 leading-5">Previous</ButtonText>
                </Button>
              </Box>

              <Box className="flex-row items-center justify-center">
                <HStack space="xs" className="items-center">
                  {chapters.map((c, i) => (
                    <Box
                      key={c.chapter_number}
                      className={`h-2 w-2 rounded-full ${i === chapterIndex ? 'bg-primary-500' : 'bg-background-200'}`}
                    />
                  ))}
                </HStack>
              </Box>

              <Box className="flex-1 flex-row justify-end">
                <Button
                  className="rounded-full px-6 py-2 shadow-hard-5 items-center"
                  isDisabled={chapterIndex === chapters.length - 1}
                  onPress={onNextChapter}
                >
                  <ButtonText className="leading-">Next</ButtonText>
                  <ButtonIcon as={ChevronRight} className="self-center" />
                </Button>
              </Box>
            </HStack>
          </Box>
        ) : null}
      </Box>
    </SafeAreaView>
  );
}
