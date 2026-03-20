import { View, Text } from 'react-native';

export function GuideScreenView() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold">Guide</Text>
      <Text className="text-gray-500 mt-2">Votre audioguide</Text>
    </View>
  );
}
