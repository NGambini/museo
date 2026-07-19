import React from 'react';
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
import type { Audioguide } from '@/api/audioguides';

export interface MuseumScreenViewProps {
  image?: string;
  name?: string;
  audioguide?: Audioguide;
  chapters?: Chapter[];
  chapter?: Chapter;
  chapterIndex?: number;
  onPreviousChapter?: () => void;
  onNextChapter?: () => void;
}

export interface Chapter {
  chapter_number: number;
  title: string;
  text: string;
  lines?: string[];
  transcript?: string;
  description?: string;
  image_url?: string;
  audio_url?: string;
  image_search_query?: string;
}

export function MuseumScreenView({
  image,
  name,
  audioguide,
  chapters = [],
  chapter,
  chapterIndex = 0,
  onPreviousChapter,
  onNextChapter,
}: MuseumScreenViewProps) {

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background-0">
      <Header />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
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
          {chapter ? (
            <VStack space="lg" className="w-full">
              <HStack space="sm" className="items-center">
                <Box className="bg-primary-500 h-1 w-8 rounded-full" />
                <Heading className="text-typography-900" size="lg">
                  #{chapter.title}
                </Heading>
              </HStack>

              <VStack space="lg" className="w-full">
                {chapter.image_url ? (
                  <Box className="w-full h-72 rounded-3xl overflow-hidden border border-outline-200/10 shadow-hard-5 bg-background-100">
                    <Image
                      source={{ uri: chapter.image_url }}
                      size="none"
                      className="w-full h-full"
                      resizeMode="cover"
                      alt={chapter.title}
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

                  {chapter.audio_url && chapter.transcript ? (
                    <AudioPlayer
                      source={{ uri: chapter.audio_url }}
                      chapterLabel={`Chapter ${chapter.chapter_number}: ${chapter.title}`}
                      transcript={chapter.transcript}
                    />
                  ) : (
                    <>
                      <Text className="text-typography-900 leading-6" size="md">
                        {chapter.text}
                      </Text>

                      {chapter.audio_url ? (
                        <Box className="w-full border-t border-outline-200/30 pt-4">
                          <AudioPlayer
                            source={{ uri: chapter.audio_url }}
                            chapterLabel={`Chapter ${chapter.chapter_number}: ${chapter.title}`}
                          />
                        </Box>
                      ) : null}
                    </>
                  )}
                </VStack>
              </VStack>

              {chapters.length > 1 ? (
                <HStack className="w-full items-center justify-between border-t border-outline-200/20 pt-6">
                  <Button
                    variant="outline"
                    action="secondary"
                    className="rounded-full border-outline-200 px-4 py-2"
                    isDisabled={chapterIndex === 0}
                    onPress={onPreviousChapter}
                  >
                    <ButtonIcon as={ChevronLeft} className="text-typography-600" />
                    <ButtonText className="text-typography-600">Previous</ButtonText>
                  </Button>

                  <HStack space="xs" className="items-center">
                    {chapters.map((c, i) => (
                      <Box
                        key={c.chapter_number}
                        className={`h-2 w-2 rounded-full ${i === chapterIndex ? 'bg-primary-500' : 'bg-background-200'}`}
                      />
                    ))}
                  </HStack>

                  <Button
                    className="rounded-full px-6 py-2 shadow-hard-5"
                    isDisabled={chapterIndex === chapters.length - 1}
                    onPress={onNextChapter}
                  >
                    <ButtonText>Next</ButtonText>
                    <ButtonIcon as={ChevronRight} className="text-white" />
                  </Button>
                </HStack>
              ) : null}
            </VStack>
          ) : null}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
