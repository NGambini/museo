import { AVPlaybackSource } from 'expo-av';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Maximize2 } from 'lucide-react-native';
import { Icon } from './ui/icon';
import { AudioPlayer } from './AudioPlayer';

export type ChapterCardProps = {
  number: number;
  title: string;
  description: string;
  image: number;
  source: AVPlaybackSource;
};

export function ChapterCard({ number, title, description, image, source }: ChapterCardProps) {
  return (
    <View className="gap-4">
      {/* Thumbnail */}
      <View
        className="w-full rounded-xl overflow-hidden"
        style={{ aspectRatio: 16 / 9 }}
      >
        <Image
          source={image}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        {/* Expand icon */}
        <View className="absolute top-3 right-3">
          <Icon as={Maximize2} size="sm" className="text-white" />
        </View>
      </View>

      {/* Title & description */}
      <View>
        <Text className="text-[18px] font-bold text-[#0f172a] leading-7">
          {number}. {title}
        </Text>
        <Text className="text-[14px] text-[#64748b] leading-5 mt-1">
          {description}
        </Text>
      </View>

      {/* Player */}
      <AudioPlayer source={source} chapterLabel={`Chapter ${number}`} />
    </View>
  );
}
