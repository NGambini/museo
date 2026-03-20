import { View, Text } from 'react-native';

export function HistoryScreenView() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold">History</Text>
      <Text className="text-gray-500 mt-2">Vos audioguides générés</Text>
    </View>
  );
}
