import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, Headphones, Share2, Ticket } from 'lucide-react-native';
import { Icon } from '../ui/icon';
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
    <View className="flex-1 bg-[#f8f7f5]">
      {/* Header Nav */}
      <View className="bg-white/90 border-b border-slate-100 flex-row items-center justify-between px-4 pt-4 pb-[17px]">
        <Pressable className="w-10 h-10 items-center justify-center rounded-full">
          <Icon as={ArrowLeft} size="sm" className="text-[#0f172a]" />
        </Pressable>

        <Text className="text-[18px] font-bold text-[#0f172a] tracking-[-0.45px]">
          Audio Guide
        </Text>

        <Pressable className="w-10 h-10 items-end justify-center">
          <Icon as={Share2} size="sm" className="text-[#0f172a]" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Hero Section */}
        <View className="px-4 pt-4">
          <View className="rounded-xl overflow-hidden" style={[{ height: 256 }, styles.heroShadow]}>
            <Image
              source={IMAGES.hero}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Title & Info */}
        <View className="px-4 pt-4 pb-6 border-b border-slate-100">
          {/* Venue name + rating badge */}
          <View className="flex-row items-start justify-between pt-2">
            <View className="flex-1 mr-4 gap-[3.5px]">
              <Text className="text-[30px] font-bold text-[#0f172a] leading-[38px]">
                The Louvre Museum
              </Text>
              <View className="flex-row items-center gap-1">
                <Icon as={Ticket} size="xs" className="text-[#f49d25]" />
                <Text className="text-[16px] text-[#f49d25] leading-6">
                  Admission: €22
                </Text>
              </View>
            </View>
            <View className="bg-[rgba(244,157,37,0.1)] px-3 py-1 rounded-full">
              <Text className="text-[14px] font-bold text-[#f49d25] leading-5">
                4.9 ★
              </Text>
            </View>
          </View>

          {/* History */}
          <View className="mt-6 gap-2">
            <Text className="text-[18px] font-bold text-[#0f172a] leading-7">
              History
            </Text>
            <Text className="text-[14px] text-[#475569] leading-[22.75px]">
              Originally built as a fortress in the late 12th century under
              Philip II, the Louvre was converted into a royal palace in the
              14th century. Today, it stands as the world's largest art museum
              and a historic monument in Paris.
            </Text>
          </View>
        </View>

        {/* Chapters Section */}
        <View className="px-4 py-8 gap-10">
          {/* Section title */}
          <View className="flex-row items-center gap-2">
            <Icon as={Headphones} size="sm" className="text-[#0f172a]" />
            <Text className="text-[20px] font-bold text-[#0f172a] leading-7">
              Chapters
            </Text>
          </View>

          {/* Chapter list */}
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
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Native styles (shadows are not supported via NativeWind)
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
