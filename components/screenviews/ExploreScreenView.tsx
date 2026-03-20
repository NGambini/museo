import { View, Text } from 'react-native';

export function ExploreScreenView() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold">Explore</Text>
      <Text className="text-gray-500 mt-2">Rechercher un lieu ou explorer la carte</Text>
    </View>
  );
}
