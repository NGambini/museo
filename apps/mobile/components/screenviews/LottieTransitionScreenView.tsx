import React, { useEffect } from 'react';
import { SafeAreaView, useSafeAreaFrame } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import LottieView, { type AnimationObject } from 'lottie-react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';

/*
  LottieTransitionScreenView
  --------------------------
  A small screen used to display a centrally animated Lottie animation while
  the app prepares a museum visit. The animation translates down from the
  top and then scales up into place. Optional props allow showing the
  museum name or an error message with a back action.
*/

// Size of the square container used for the Lottie animation
const LOTTIE_SIZE = 240;

// Duration for the vertical translation animation (in milliseconds)
const TRANSLATE_DURATION_MS = 500;

// Duration for the scale-up animation that runs after translating
const SCALE_DURATION_MS = 500;

export interface LottieTransitionScreenViewProps {
  lottieSource: AnimationObject;
  museumName?: string;
  error?: string;
  onGoBack?: () => void;
}

export function LottieTransitionScreenView({ lottieSource, museumName, error, onGoBack }: LottieTransitionScreenViewProps) {
  const { height } = useSafeAreaFrame();

  // Get the usable screen height accounting for safe area insets
  const translateY = useSharedValue(0);

  // Start the Lottie slightly scaled down so it can scale up into view
  const scale = useSharedValue(0.6);

  useEffect(() => {
    // Compute the target translateY so the Lottie is vertically centered
    const targetTranslateY = height / 2 - LOTTIE_SIZE;

    // Animate the Lottie downwards into place
    translateY.value = withTiming(targetTranslateY, { duration: TRANSLATE_DURATION_MS, easing: Easing.out(Easing.cubic) });

    // After the translate completes, delay then animate the scale to 1
    scale.value = withDelay(
      TRANSLATE_DURATION_MS,
      withTiming(1, { duration: SCALE_DURATION_MS, easing: Easing.out(Easing.cubic) })
    );
  }, [height, translateY, scale]);

  // Compose the animated transform style using translateY and scale shared values
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background-0">
      {/* Centered container for the animated Lottie */}
      <Box className="flex-1 items-center justify-start">
        <Animated.View style={[{ width: LOTTIE_SIZE, height: LOTTIE_SIZE }, animatedStyle]}>
          {/* Lottie animation fills the container and loops while preparing */}
          <LottieView source={lottieSource} autoPlay loop style={{ width: '100%', height: '100%' }} />
        </Animated.View>
      </Box>

      {/*
        If there is an error, show it with a back button.
        Otherwise, when a museum name is provided show a prepping message.
      */}
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
