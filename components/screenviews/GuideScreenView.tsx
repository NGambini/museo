import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ---------------------------------------------------------------------------
// Figma assets (expire après 7 jours — à remplacer par des assets locaux)
// ---------------------------------------------------------------------------
const ASSETS = {
  hero: 'https://www.figma.com/api/mcp/asset/de04125b-6058-4459-8b40-ada42b63f842',
  chapter1: 'https://www.figma.com/api/mcp/asset/550753ee-b195-49b7-a1b8-badbcf1b428e',
  chapter2: 'https://www.figma.com/api/mcp/asset/4d26aca1-e7e9-43eb-ac91-03f60936bd96',
  chapter3: 'https://www.figma.com/api/mcp/asset/e016fcca-f002-4c55-a109-fde522672e49',
  iconAdmission: 'https://www.figma.com/api/mcp/asset/bab7b1b1-ed8b-4808-bda7-7c6904b4f760',
  iconChapters: 'https://www.figma.com/api/mcp/asset/b60ad9fa-ada4-44c5-8651-15cb7a152f0a',
  iconExpand: 'https://www.figma.com/api/mcp/asset/c706a746-04d3-41b3-a905-23d5d5e63050',
  iconPlay: 'https://www.figma.com/api/mcp/asset/cd97bd6a-7e4a-4d5f-8cf0-25194787c20c',
  iconPause: 'https://www.figma.com/api/mcp/asset/a1f61bf3-7600-4832-b73d-8a8cfc2ca7b0',
  iconBack: 'https://www.figma.com/api/mcp/asset/ac0489f5-0688-47b2-a1e3-31b46a543e00',
  iconShare: 'https://www.figma.com/api/mcp/asset/600af887-129e-41bd-ae0a-b2695ed6e971',
} as const;

// ---------------------------------------------------------------------------
// AudioPlayer
// ---------------------------------------------------------------------------
type AudioPlayerProps = {
  isPlaying: boolean;
  currentTime: string;
  totalTime: string;
  chapterLabel: string;
  /** Progression de 0 à 1 */
  progress: number;
};

function AudioPlayer({
  isPlaying,
  currentTime,
  totalTime,
  chapterLabel,
  progress,
}: AudioPlayerProps) {
  return (
    <View className="bg-[#f8f7f5] border border-slate-100 rounded-xl p-[17px]">
      <View className="flex-row items-center gap-4">
        {/* Bouton play / pause */}
        {isPlaying ? (
          <View
            className="w-12 h-12 rounded-full bg-[#f49d25] items-center justify-center"
            style={styles.playButtonShadow}
          >
            <Image
              source={{ uri: ASSETS.iconPlay }}
              style={{ width: 11, height: 14 }}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View className="w-12 h-12 rounded-full border-2 border-[#f49d25] items-center justify-center">
            <Image
              source={{ uri: ASSETS.iconPause }}
              style={{ width: 14, height: 14 }}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Progression */}
        <View className="flex-1 gap-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.5px]">
              {currentTime} / {totalTime}
            </Text>
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.5px]">
              {chapterLabel}
            </Text>
          </View>
          {/* Barre de progression */}
          <View className="h-[6px] rounded-full bg-[rgba(244,157,37,0.2)] overflow-hidden">
            <View
              className="h-full rounded-full bg-[#f49d25]"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ChapterCard
// ---------------------------------------------------------------------------
type ChapterCardProps = {
  number: number;
  title: string;
  description: string;
  image: string;
  isPlaying: boolean;
  currentTime: string;
  totalTime: string;
  progress: number;
};

function ChapterCard({
  number,
  title,
  description,
  image,
  isPlaying,
  currentTime,
  totalTime,
  progress,
}: ChapterCardProps) {
  return (
    <View className="gap-4">
      {/* Image */}
      <View
        className="w-full rounded-xl overflow-hidden"
        style={{ aspectRatio: 16 / 9 }}
      >
        <Image
          source={{ uri: image }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        {/* Icône agrandir */}
        <View className="absolute top-3 right-3 w-[26.5px] h-[26.5px]">
          <Image
            source={{ uri: ASSETS.iconExpand }}
            style={{ width: 26.5, height: 26.5 }}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Titre & description */}
      <View>
        <Text className="text-[18px] font-bold text-[#0f172a] leading-7">
          {number}. {title}
        </Text>
        <Text className="text-[14px] text-[#64748b] leading-5 mt-1">
          {description}
        </Text>
      </View>

      {/* Player */}
      <AudioPlayer
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalTime={totalTime}
        chapterLabel={`Chapter ${number}`}
        progress={progress}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// GuideScreenView
// ---------------------------------------------------------------------------
export function GuideScreenView() {
  return (
    <View className="flex-1 bg-[#f8f7f5]">
      {/* Header Nav */}
      <View className="bg-white/90 border-b border-slate-100 flex-row items-center justify-between px-4 pt-4 pb-[17px]">
        <Pressable className="w-10 h-10 items-center justify-center rounded-full">
          <Image
            source={{ uri: ASSETS.iconBack }}
            style={{ width: 16, height: 16 }}
            resizeMode="contain"
          />
        </Pressable>

        <Text className="text-[18px] font-bold text-[#0f172a] tracking-[-0.45px]">
          Audio Guide
        </Text>

        <Pressable className="w-10 h-10 items-end justify-center">
          <Image
            source={{ uri: ASSETS.iconShare }}
            style={{ width: 18, height: 20 }}
            resizeMode="contain"
          />
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
              source={{ uri: ASSETS.hero }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Title & Info */}
        <View className="px-4 pt-4 pb-6 border-b border-slate-100">
          {/* Nom du lieu + badge rating */}
          <View className="flex-row items-start justify-between pt-2">
            <View className="flex-1 mr-4 gap-[3.5px]">
              <Text className="text-[30px] font-bold text-[#0f172a] leading-[38px]">
                The Louvre Museum
              </Text>
              <View className="flex-row items-center gap-1">
                <Image
                  source={{ uri: ASSETS.iconAdmission }}
                  style={{ width: 11.67, height: 9.33 }}
                  resizeMode="contain"
                />
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

          {/* Histoire */}
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
          {/* Titre section */}
          <View className="flex-row items-center gap-2">
            <Image
              source={{ uri: ASSETS.iconChapters }}
              style={{ width: 19, height: 15 }}
              resizeMode="contain"
            />
            <Text className="text-[20px] font-bold text-[#0f172a] leading-7">
              Chapters
            </Text>
          </View>

          {/* Liste des chapitres */}
          <ChapterCard
            number={1}
            title="The Mona Lisa (La Gioconda)"
            description="Leonardo da Vinci's most famous masterpiece and the Enigma of her smile."
            image={ASSETS.chapter1}
            isPlaying
            currentTime="2:45"
            totalTime="8:12"
            progress={0.33}
          />

          <ChapterCard
            number={2}
            title="Venus de Milo"
            description="Discovering the Hellenistic ideal of beauty and the mystery of the missing arms."
            image={ASSETS.chapter2}
            isPlaying={false}
            currentTime="0:00"
            totalTime="5:30"
            progress={0}
          />

          <ChapterCard
            number={3}
            title="Winged Victory"
            description="The Nike of Samothrace, a masterpiece of ancient Greek sculpture from the 2nd century BC."
            image={ASSETS.chapter3}
            isPlaying
            currentTime="0:00"
            totalTime="6:45"
            progress={0}
          />
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles natifs (shadows, non supportées via NativeWind)
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  heroShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  playButtonShadow: {
    shadowColor: '#f49d25',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
});
