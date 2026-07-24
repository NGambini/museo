import { vars } from 'nativewind';
import { useColorScheme } from 'nativewind';
import { View } from 'react-native';
import { theme } from '@/constants/theme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SHADE_KEYS = ['0', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const;
const SHADE_DEFINITIONS = [
  { shade: '0', amount: 0.97, target: 'white' as const },
  { shade: '50', amount: 0.92, target: 'white' as const },
  { shade: '100', amount: 0.85, target: 'white' as const },
  { shade: '200', amount: 0.70, target: 'white' as const },
  { shade: '300', amount: 0.50, target: 'white' as const },
  { shade: '400', amount: 0.25, target: 'white' as const },
  { shade: '500', amount: 0, target: 'white' as const },
  { shade: '600', amount: 0.15, target: 'black' as const },
  { shade: '700', amount: 0.30, target: 'black' as const },
  { shade: '800', amount: 0.50, target: 'black' as const },
  { shade: '900', amount: 0.65, target: 'black' as const },
  { shade: '950', amount: 0.75, target: 'black' as const },
] as const;

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

/** Mix two RGB colors and return an 'R G B' string for nativewind vars(). */
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
 * Generate a 12-shade palette (0 → 950) from a hex color.
 * Gluestack convention: in light mode, 0 = lightest, 950 = darkest.
 */
function buildLightPalette(hex: string) {
  const c = hexToRgb(hex);
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [0, 0, 0];
  const palette: Record<string, string> = {};

  for (const definition of SHADE_DEFINITIONS) {
    const target = definition.target === 'black' ? black : white;
    palette[definition.shade] = mix(c, target, definition.amount);
  }

  return palette;
}

/**
 * In dark mode, Gluestack reverses the scale (0 = darkest, 950 = lightest).
 */
function buildDarkPalette(lightPalette: ReturnType<typeof buildLightPalette>) {
  const palette: Record<string, string> = {};

  for (let index = 0; index < SHADE_KEYS.length; index += 1) {
    const shade = SHADE_KEYS[index];
    const mirroredShade = SHADE_KEYS[SHADE_KEYS.length - 1 - index];
    palette[shade] = lightPalette[mirroredShade];
  }

  return palette;
}

function paletteToVars(p: ReturnType<typeof buildLightPalette>, prefix: string) {
  const vars: Record<string, string> = {};

  for (const shade of SHADE_KEYS) {
    vars[`--color-${prefix}-${shade}`] = p[shade];
  }

  return vars;
}

// ---------------------------------------------------------------------------
// Palette calculation (performed once when the module is loaded)
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
