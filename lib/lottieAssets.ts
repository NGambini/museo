// ---------------------------------------------------------------------------
// Metro doit pouvoir analyser statiquement les require() des assets Lottie :
// un require dynamique avec une variable ne fonctionne pas. On passe donc
// par cette table de correspondance id -> module, utilisée avec l'id retourné
// par findLottieForMuseum (lib/lottieMatcher.ts).
// ---------------------------------------------------------------------------

import type { AnimationObject } from 'lottie-react-native';

const LOTTIE_ASSETS: Record<string, AnimationObject> = {
  'abstract-painting': require('@/assets/lottie/abstract-painting.json'),
  'african-mask': require('@/assets/lottie/african-mask.json'),
  aquarium: require('@/assets/lottie/aquarium.json'),
  archeologist: require('@/assets/lottie/archeologist.json'),
  boat: require('@/assets/lottie/boat.json'),
  book: require('@/assets/lottie/book.json'),
  'crown-treasury': require('@/assets/lottie/crown-treasury.json'),
  dinosaur: require('@/assets/lottie/dinosaur.json'),
  dinosaur2: require('@/assets/lottie/dinosaur2.json'),
  egypt: require('@/assets/lottie/egypt.json'),
  egypt2: require('@/assets/lottie/egypt2.json'),
  'expensive-crystal': require('@/assets/lottie/expensive-crystal.json'),
  greek: require('@/assets/lottie/greek.json'),
  japanese: require('@/assets/lottie/japanese.json'),
  jewels: require('@/assets/lottie/jewels.json'),
  'mammoth-bones': require('@/assets/lottie/mammoth-bones.json'),
  mayan: require('@/assets/lottie/mayan.json'),
  'middle-eastern-pottery': require('@/assets/lottie/middle-eastern-pottery.json'),
  mummy: require('@/assets/lottie/mummy.json'),
  painting: require('@/assets/lottie/painting.json'),
  painting2: require('@/assets/lottie/painting2.json'),
  pottery: require('@/assets/lottie/pottery.json'),
  'pottery-restauration': require('@/assets/lottie/pottery-restauration.json'),
  rock: require('@/assets/lottie/rock.json'),
  'science-planets': require('@/assets/lottie/science-planets.json'),
  sculpture: require('@/assets/lottie/sculpture.json'),
  sculpture2: require('@/assets/lottie/sculpture2.json'),
  sculpture3: require('@/assets/lottie/sculpture3.json'),
  sword: require('@/assets/lottie/sword.json'),
  'treasure-gold-coins': require('@/assets/lottie/treasure-gold-coins.json'),
};

const DEFAULT_LOTTIE_ID = 'sculpture';

export function getLottieAsset(id: string): AnimationObject {
  return LOTTIE_ASSETS[id] ?? LOTTIE_ASSETS[DEFAULT_LOTTIE_ID];
}
