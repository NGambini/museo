import type { BrandingOptions } from 'adminjs';
import type { ThemeOverride } from '@adminjs/design-system';

/**
 * Backoffice palette.
 *
 * Two brand colours: Jules's orange as primary, a neutral grey as secondary.
 * The rest is a softened Solarized Light — a cream ground rather than pure
 * white, so long editing sessions stay easy on the eyes.
 *
 * The non-obvious part: AdminJS paints its cards with `colors.white`
 * (`<Box variant="white">`), not `colors.container`. Leaving `white` at #fff
 * would therefore keep every list and form glaring against the cream ground.
 * That token is the one to soften for the tint to take everywhere.
 */
const PRIMARY = '#f49d25';
const SECONDARY = '#6b7280';

export const theme: Partial<ThemeOverride> = {
  colors: {
    // ── Brand ─────────────────────────────────────────────────────────────
    primary100: PRIMARY,
    primary80: '#f6b151',
    primary60: '#f8c47c',
    primary40: '#fad8a8',
    primary20: '#fdebd3',
    accent: SECONDARY,
    love: PRIMARY,

    // ── Surfaces (softened Solarized Light) ───────────────────────────────
    bg: '#f6efdd', // page, a touch deeper than the cards
    white: '#fffdf5', // AdminJS cards — see the note above
    container: '#fffdf5',
    sidebar: '#fbf5e6',
    filterBg: '#f2ebd8',
    highlight: '#f0e9d6',
    grey20: '#eee8d5', // Solarized base2: badges, section headers
    border: '#e5dcc4',
    inputBorder: '#d8cfb6',
    separator: '#ded5bd',

    // ── Text ──────────────────────────────────────────────────────────────
    text: '#2b3641',
    grey100: '#2b3641',
    grey80: '#4b5563',
    grey60: SECONDARY,
    grey40: '#a9a294',

    // ── Semantic colours, tuned to Solarized ──────────────────────────────
    info: '#268bd2',
    infoDark: '#1c6ea8',
    infoLight: '#e4eff8',
    success: '#2aa198',
    successDark: '#1f7d76',
    successLight: '#e2f2f0',
    error: '#dc322f',
    errorDark: '#b02522',
    errorLight: '#fbe9e8',
    warning: '#b58900',
    warningDark: '#8d6b00',
    warningLight: '#f7f0da',
  },
};

export const branding: BrandingOptions = {
  companyName: 'Audioguide — Backoffice',
  // Served by express.static from public/. AdminJS uses it both on the login
  // page and in the sidebar header.
  logo: '/static/jules.svg',
  favicon: '/static/jules.svg',
  withMadeWithLove: false,
  theme,
};
