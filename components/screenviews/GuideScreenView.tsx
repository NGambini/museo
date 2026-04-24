import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { ArrowLeft, Headphones, Share2, Ticket } from 'lucide-react-native';
import { Icon } from '../ui/icon';
import { Box } from '../ui/box';
import { Text } from '../ui/text';
import { Heading } from '../ui/heading';
import { HStack } from '../ui/hstack';
import { VStack } from '../ui/vstack';
import { ChapterCard } from '../ChapterCard';

const IMAGES = {
  hero: require('../../assets/images/placeholder/pyramide.jpg'),
  chapter1: require('../../assets/images/placeholder/joconde.jpg'),
  chapter2: require('../../assets/images/placeholder/pyramide.jpg'),
  chapter3: require('../../assets/images/placeholder/victoire.jpg'),
};

const AUDIO = require('../../assets/sounds/paris-louvre-museum.mp3');

// ---------------------------------------------------------------------------
// GuideScreenView
// ---------------------------------------------------------------------------
export function GuideScreenView() {
  return (
    <Box className="flex-1 bg-background-50">
      {/* Header Nav */}
      <Box className="bg-background-0/90 border-b border-outline-100 flex-row items-center justify-between px-4 pt-4 pb-[17px]">
        <Pressable className="w-10 h-10 items-center justify-center rounded-full">
          <Icon as={ArrowLeft} size="sm" className="text-typography-950" />
        </Pressable>

        <Heading size="lg" className="tracking-tight">
          Audio Guide
        </Heading>

        <Pressable className="w-10 h-10 items-end justify-center">
          <Icon as={Share2} size="sm" className="text-typography-950" />
        </Pressable>
      </Box>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Hero Section */}
        <Box className="px-4 pt-4">
          <Box className="rounded-xl overflow-hidden" style={[{ height: 256 }, styles.heroShadow]}>
            <Image
              source={IMAGES.hero}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </Box>
        </Box>

        {/* Title & Info */}
        <Box className="px-4 pt-4 pb-6 border-b border-outline-100">
          <HStack className="items-start justify-between pt-2">
            <VStack className="flex-1 mr-4" space="xs">
              <Heading size="3xl">
                The Louvre Museum
              </Heading>
              <HStack className="items-center" space="xs">
                <Icon as={Ticket} size="xs" className="text-primary-500" />
                <Text size="md" className="text-primary-500">
                  Admission: €22
                </Text>
              </HStack>
            </VStack>

            <Box className="bg-primary-50 px-3 py-1 rounded-full">
              <Text size="sm" className="font-bold text-primary-500">
                4.9 ★
              </Text>
            </Box>
          </HStack>

          {/* History */}
          <VStack className="mt-6" space="xs">
            <Heading size="lg">History</Heading>
            <Text size="sm" className="text-typography-600 leading-relaxed">
              Originally built as a fortress in the late 12th century under
              Philip II, the Louvre was converted into a royal palace in the
              14th century. Today, it stands as the world's largest art museum
              and a historic monument in Paris.
            </Text>
          </VStack>
        </Box>

        {/* Chapters Section */}
        <VStack className="px-4 py-8" space="2xl">
          <HStack className="items-center" space="sm">
            <Icon as={Headphones} size="sm" className="text-typography-950" />
            <Heading size="xl">Chapters</Heading>
          </HStack>

          <ChapterCard
            number={1}
            title="The Mona Lisa (La Gioconda)"
            description="Leonardo da Vinci's most famous masterpiece and the Enigma of her smile."
            image={IMAGES.chapter1}
            source={AUDIO}
          />

          <ChapterCard
            number={2}
            title="Venus de Milo"
            description="Discovering the Hellenistic ideal of beauty and the mystery of the missing arms."
            image={IMAGES.chapter2}
            source={AUDIO}
          />

          <ChapterCard
            number={3}
            title="Winged Victory"
            description="The Nike of Samothrace, a masterpiece of ancient Greek sculpture from the 2nd century BC."
            image={IMAGES.chapter3}
            source={AUDIO}
          />
        </VStack>
      </ScrollView>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Native styles (shadows non supportés via NativeWind)
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  heroShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
});
