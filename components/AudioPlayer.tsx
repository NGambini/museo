import { Pause, Play, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { GestureResponderEvent, StyleSheet, TouchableOpacity } from 'react-native';
import { AVPlaybackSource } from 'expo-av';
import { Motion } from '@legendapp/motion';
import { Karaoke } from 'react-native-transcript-karaoke';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { Icon } from './ui/icon';
import { Box } from './ui/box';
import { Text } from './ui/text';
import { HStack } from './ui/hstack';
import { VStack } from './ui/vstack';
import { theme } from '../constants/theme';

export type AudioPlayerProps = {
  source: AVPlaybackSource;
  chapterLabel: string;
  transcript?: string;
  onTranscriptVisibilityChange?: (isOpen: boolean) => void;
};

export function AudioPlayer({ source, chapterLabel, transcript, onTranscriptVisibilityChange }: AudioPlayerProps) {
  const { isPlaying, progress, currentTime, totalTime, positionMillis, durationMillis, toggle, seekTo } =
    useAudioPlayer(source);
  const barWidthRef = useRef(0);

  function handleSeek(e: GestureResponderEvent) {
    const ratio = e.nativeEvent.locationX / barWidthRef.current;
    seekTo(Math.min(1, Math.max(0, ratio)));
  }

  function handleKaraokeSeek(seekToMillis: number) {
    if (durationMillis === 0) return;
    seekTo(Math.min(1, Math.max(0, seekToMillis / durationMillis)));
  }

  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  return (
    <Box className="bg-background-50 border border-outline-100 rounded-xl p-[17px]">
      <HStack space="md" className="items-center">
        {/* Play / pause button */}
        <TouchableOpacity onPress={toggle} activeOpacity={0.8}>
          {isPlaying ? (
            <Box
              className="w-12 h-12 rounded-full bg-primary-500 items-center justify-center"
              style={styles.playButtonShadow}
            >
              <Icon as={Pause} size="xs" className="text-white fill-white" />
            </Box>
          ) : (
            <Box className="w-12 h-12 rounded-full border-2 border-primary-500 items-center justify-center">
              <Icon as={Play} size="xs" className="text-primary-500 fill-primary-500" />
            </Box>
          )}
        </TouchableOpacity>

        {/* Progress */}
        <VStack className="flex-1" space="xs">
          <HStack className="items-center justify-between">
            <Text size="xs" className="font-bold text-typography-400 uppercase tracking-widest max-w-[60%]">
              {chapterLabel}
            </Text>
            <Text size="xs" className="font-bold text-typography-400 uppercase tracking-widest">
              {currentTime} / {totalTime}
            </Text>

          </HStack>

          {/* Progress bar (tappable) */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleSeek}
            onLayout={(e) => { barWidthRef.current = e.nativeEvent.layout.width; }}
            className="mt-2 h-[6px] rounded-full bg-primary-100 overflow-hidden"
          >
            <Box
              className="h-full rounded-full bg-primary-500"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </TouchableOpacity>
        </VStack>
      </HStack>

      {transcript ? (
        <Box className="w-full border-t border-outline-100 mt-4 pt-4">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              const nextValue = !isTranscriptOpen;
              setIsTranscriptOpen(nextValue);
              onTranscriptVisibilityChange?.(nextValue);
            }}
            className="flex-row items-center justify-between"
          >
            <Text size="sm" className="font-semibold text-typography-900">
              {isTranscriptOpen ? 'Masquer le transcript' : 'Afficher le transcript'}
            </Text>
            <Icon
              as={isTranscriptOpen ? ChevronUp : ChevronDown}
              size="sm"
              className="text-typography-600"
            />
          </TouchableOpacity>

          <Motion.View
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: isTranscriptOpen ? 1 : 0, y: isTranscriptOpen ? 0 : 8 }}
            transition={{ type: 'timing', duration: 220, easing: 'easeOut' }}
          >
            {isTranscriptOpen ? (
              <Box className="mt-4">
                <Karaoke
                  transcript={transcript}
                  progress={positionMillis}
                  progressType="milliseconds"
                  style={styles.transcriptLine}
                  activeStyle={styles.transcriptLineActive}
                  onSeekTo={handleKaraokeSeek}
                />
              </Box>
            ) : null}
          </Motion.View>
        </Box>
      ) : null}
    </Box>
  );
}

// Karaoke renders raw RN `Text` internally and only accepts TextStyle props,
// so these can't be expressed as NativeWind classNames.
const styles = StyleSheet.create({
  playButtonShadow: {
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  transcriptLine: {
    color: theme.secondary,
    opacity: 0.6,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 4,
    fontWeight: '600',
    fontFamily: 'KGNeatlyPrinted',
  },
  transcriptLineActive: {
    color: theme.primary,
    opacity: 1,
    fontWeight: '600',
    fontFamily: 'KGNeatlyPrinted',
  },
});
