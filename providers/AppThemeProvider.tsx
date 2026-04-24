import { vars } from 'nativewind';
import { useColorScheme } from 'nativewind';
import { View } from 'react-native';
import { theme } from '@/constants/theme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

/** Mélange deux couleurs RGB. Retourne une chaîne 'R G B' pour nativewind vars(). */
function mix(
  a: [number, number, number],
  b: [number, number, number],
  amount: number,
): string {
  return [
    Math.round(a[0] + (b[0] - a[0]) * amount),
    Math.round(a[1] + (b[1] - a[1]) * amount),
    Math.round(a[2] + (b[2] - a[2]) * amount),
  ].join(' ');
}

/**
 * Génère une palette de 12 teintes (0 → 950) depuis une couleur hex.
 * Convention Gluestack : en light mode, 0 = plus clair, 950 = plus foncé.
 */
function buildLightPalette(hex: string) {
  const c = hexToRgb(hex);
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [0, 0, 0];
  return {
    '0':   mix(c, white, 0.97),
    '50':  mix(c, white, 0.92),
    '100': mix(c, white, 0.85),
    '200': mix(c, white, 0.70),
    '300': mix(c, white, 0.50),
    '400': mix(c, white, 0.25),
    '500': mix(c, white, 0),     // couleur de base
    '600': mix(c, black, 0.15),
    '700': mix(c, black, 0.30),
    '800': mix(c, black, 0.50),
    '900': mix(c, black, 0.65),
    '950': mix(c, black, 0.75),
  };
}

/**
 * En dark mode, Gluestack inverse l'échelle (0 = plus foncé, 950 = plus clair).
 */
function buildDarkPalette(
  lightPalette: ReturnType<typeof buildLightPalette>,
) {
  return {
    '0':   lightPalette['950'],
    '50':  lightPalette['900'],
    '100': lightPalette['800'],
    '200': lightPalette['700'],
    '300': lightPalette['600'],
    '400': lightPalette['500'],
    '500': lightPalette['400'],
    '600': lightPalette['300'],
    '700': lightPalette['200'],
    '800': lightPalette['100'],
    '900': lightPalette['50'],
    '950': lightPalette['0'],
  };
}

function paletteToVars(p: ReturnType<typeof buildLightPalette>, prefix: string) {
  return {
    [`--color-${prefix}-0`]:   p['0'],
    [`--color-${prefix}-50`]:  p['50'],
    [`--color-${prefix}-100`]: p['100'],
    [`--color-${prefix}-200`]: p['200'],
    [`--color-${prefix}-300`]: p['300'],
    [`--color-${prefix}-400`]: p['400'],
    [`--color-${prefix}-500`]: p['500'],
    [`--color-${prefix}-600`]: p['600'],
    [`--color-${prefix}-700`]: p['700'],
    [`--color-${prefix}-800`]: p['800'],
    [`--color-${prefix}-900`]: p['900'],
    [`--color-${prefix}-950`]: p['950'],
  };
}

// ---------------------------------------------------------------------------
// Calcul des palettes (effectué une seule fois au chargement du module)
// ---------------------------------------------------------------------------

const primaryLight = buildLightPalette(theme.primary);
const primaryDark = buildDarkPalette(primaryLight);
const secondaryLight = buildLightPalette(theme.secondary);
const secondaryDark = buildDarkPalette(secondaryLight);

const themeVars = {
  light: vars({
    ...paletteToVars(primaryLight, 'primary'),
    ...paletteToVars(secondaryLight, 'secondary'),
  }),
  dark: vars({
    ...paletteToVars(primaryDark, 'primary'),
    ...paletteToVars(secondaryDark, 'secondary'),
  }),
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useColorScheme();
  const mode = colorScheme === 'dark' ? 'dark' : 'light';

  return (
    <View style={[themeVars[mode], { flex: 1 }]}>
      {children}
    </View>
  );
}
