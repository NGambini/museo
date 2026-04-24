import { Pause, Play } from 'lucide-react-native';
import { useRef } from 'react';
import { GestureResponderEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AVPlaybackSource } from 'expo-av';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { Icon } from './ui/icon';

export type AudioPlayerProps = {
  source: AVPlaybackSource;
  chapterLabel: string;
};

export function AudioPlayer({ source, chapterLabel }: AudioPlayerProps) {
  const { isPlaying, progress, currentTime, totalTime, toggle, seekTo } = useAudioPlayer(source);
  const barWidthRef = useRef(0);

  function handleSeek(e: GestureResponderEvent) {
    const ratio = e.nativeEvent.locationX / barWidthRef.current;
    seekTo(Math.min(1, Math.max(0, ratio)));
  }

  return (
    <View className="bg-[#f8f7f5] border border-slate-100 rounded-xl p-[17px]">
      <View className="flex-row items-center gap-4">
        {/* Play / pause button */}
        <TouchableOpacity onPress={toggle} activeOpacity={0.8}>
          {isPlaying ? (
            <View
              className="w-12 h-12 rounded-full bg-[#f49d25] items-center justify-center"
              style={styles.playButtonShadow}
            >
              <Icon as={Pause} size="xs" className="text-white fill-white" />
            </View>
          ) : (
            <View className="w-12 h-12 rounded-full border-2 border-[#f49d25] items-center justify-center">
              <Icon as={Play} size="xs" className="text-[#f49d25] fill-[#f49d25]" />
            </View>
          )}
        </TouchableOpacity>

        {/* Progress */}
        <View className="flex-1 gap-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.5px]">
              {currentTime} / {totalTime}
            </Text>
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.5px]">
              {chapterLabel}
            </Text>
          </View>
          {/* Progress bar (tappable) */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleSeek}
            onLayout={(e) => { barWidthRef.current = e.nativeEvent.layout.width; }}
            className="h-[6px] rounded-full bg-[rgba(244,157,37,0.2)] overflow-hidden"
          >
            <View
              className="h-full rounded-full bg-[#f49d25]"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  playButtonShadow: {
    shadowColor: '#f49d25',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
});
