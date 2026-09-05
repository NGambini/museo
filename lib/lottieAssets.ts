// ---------------------------------------------------------------------------
// Metro needs to statically analyze Lottie asset require() calls: a dynamic
// require with a variable does not work. Hence this list of statically
// required animations (assets/lottie), from which one is picked at random.
// ---------------------------------------------------------------------------

import type { AnimationObject } from 'lottie-react-native';

const LOTTIE_ASSETS: AnimationObject[] = [
  require('@/assets/lottie/abstract-painting.json'),
  require('@/assets/lottie/african-mask.json'),
  require('@/assets/lottie/aquarium.json'),
  require('@/assets/lottie/archeologist.json'),
  require('@/assets/lottie/boat.json'),
  require('@/assets/lottie/book.json'),
  require('@/assets/lottie/crown-treasury.json'),
  require('@/assets/lottie/dinosaur.json'),
  require('@/assets/lottie/dinosaur2.json'),
  require('@/assets/lottie/egypt.json'),
  require('@/assets/lottie/egypt2.json'),
  require('@/assets/lottie/expensive-crystal.json'),
  require('@/assets/lottie/greek.json'),
  require('@/assets/lottie/japanese.json'),
  require('@/assets/lottie/jewels.json'),
  require('@/assets/lottie/mammoth-bones.json'),
  require('@/assets/lottie/mayan.json'),
  require('@/assets/lottie/middle-eastern-pottery.json'),
  require('@/assets/lottie/mummy.json'),
  require('@/assets/lottie/painting.json'),
  require('@/assets/lottie/painting2.json'),
  require('@/assets/lottie/pottery.json'),
  require('@/assets/lottie/pottery-restauration.json'),
  require('@/assets/lottie/rock.json'),
  require('@/assets/lottie/science-planets.json'),
  require('@/assets/lottie/sculpture.json'),
  require('@/assets/lottie/sculpture2.json'),
  require('@/assets/lottie/sculpture3.json'),
  require('@/assets/lottie/sword.json'),
  require('@/assets/lottie/treasure-gold-coins.json'),
];

export function getRandomLottieAsset(): AnimationObject {
  return LOTTIE_ASSETS[Math.floor(Math.random() * LOTTIE_ASSETS.length)];
}
