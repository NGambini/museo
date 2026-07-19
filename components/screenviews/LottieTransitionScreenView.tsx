import React, { useEffect } from 'react';
import { SafeAreaView, useSafeAreaFrame } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import LottieView, { type AnimationObject } from 'lottie-react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';

const LOTTIE_SIZE = 240;
const TRANSLATE_DURATION_MS = 500;
const SCALE_DURATION_MS = 500;

export interface LottieTransitionScreenViewProps {
  lottieSource: AnimationObject;
  museumName?: string;
  error?: string;
  onGoBack?: () => void;
}

export function LottieTransitionScreenView({ lottieSource, museumName, error, onGoBack }: LottieTransitionScreenViewProps) {
  const { height } = useSafeAreaFrame();

  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    const targetTranslateY = height / 2 - LOTTIE_SIZE;

    translateY.value = withTiming(targetTranslateY, { duration: TRANSLATE_DURATION_MS, easing: Easing.out(Easing.cubic) });
    scale.value = withDelay(
      TRANSLATE_DURATION_MS,
      withTiming(1, { duration: SCALE_DURATION_MS, easing: Easing.out(Easing.cubic) })
    );
  }, [height, translateY, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background-0">
      <Box className="flex-1 items-center justify-start">
        <Animated.View style={[{ width: LOTTIE_SIZE, height: LOTTIE_SIZE }, animatedStyle]}>
          <LottieView source={lottieSource} autoPlay loop style={{ width: '100%', height: '100%' }} />
        </Animated.View>
      </Box>

      {error ? (
        <Box className="items-center mb-8 px-6">
          <Text className="text-center text-error-500 mb-4" size="md">
            {error}
          </Text>
          <Pressable onPress={onGoBack}>
            <Text className="text-primary-500" size="sm">Retour</Text>
          </Pressable>
        </Box>
      ) : museumName ? (
        <Box className="items-center mb-8">
          <Text className="text-center text-typography-500" size="md">
            Préparation de la visite de {museumName}...
          </Text>
        </Box>
      ) : null}
    </SafeAreaView>
  );
}
