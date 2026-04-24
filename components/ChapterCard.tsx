import { AVPlaybackSource } from 'expo-av';
import { Image, StyleSheet } from 'react-native';
import { Maximize2 } from 'lucide-react-native';
import { Icon } from './ui/icon';
import { Box } from './ui/box';
import { Text } from './ui/text';
import { Heading } from './ui/heading';
import { VStack } from './ui/vstack';
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
    <VStack space="md">
      {/* Thumbnail */}
      <Box
        className="w-full rounded-xl overflow-hidden"
        style={{ aspectRatio: 16 / 9 }}
      >
        <Image
          source={image}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        {/* Expand icon */}
        <Box className="absolute top-3 right-3">
          <Icon as={Maximize2} size="sm" className="text-white" />
        </Box>
      </Box>

      {/* Title & description */}
      <VStack space="xs">
        <Heading size="md">
          {number}. {title}
        </Heading>
        <Text size="sm" className="text-typography-600">
          {description}
        </Text>
      </VStack>

      {/* Player */}
      <AudioPlayer source={source} chapterLabel={`Chapter ${number}`} />
    </VStack>
  );
}
