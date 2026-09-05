import type { BrandingOptions } from 'adminjs';
import type { ThemeOverride } from '@adminjs/design-system';

/**
 * Palette du backoffice.
 *
 * Deux couleurs de marque : l'orange de Jules en primaire, un gris neutre en
 * secondaire. Le reste est un Solarized Light adouci — fond crème plutôt que
 * blanc pur, pour ne pas fatiguer les yeux sur de longues sessions d'édition.
 *
 * Point non évident : AdminJS peint ses cartes avec `colors.white`
 * (`<Box variant="white">`), pas avec `colors.container`. Laisser `white` à
 * #fff garderait donc toutes les listes et formulaires éclatants sur le fond
 * crème. C'est ce jeton qu'il faut adoucir pour que la teinte prenne partout.
 */
const PRIMARY = '#f49d25';
const SECONDARY = '#6b7280';

export const theme: Partial<ThemeOverride> = {
  colors: {
    // ── Marque ────────────────────────────────────────────────────────────
    primary100: PRIMARY,
    primary80: '#f6b151',
    primary60: '#f8c47c',
    primary40: '#fad8a8',
    primary20: '#fdebd3',
    accent: SECONDARY,
    love: PRIMARY,

    // ── Surfaces (Solarized Light adouci) ─────────────────────────────────
    bg: '#f6efdd', // page, légèrement plus soutenu que les cartes
    white: '#fffdf5', // cartes AdminJS — cf. commentaire ci-dessus
    container: '#fffdf5',
    sidebar: '#fbf5e6',
    filterBg: '#f2ebd8',
    highlight: '#f0e9d6',
    grey20: '#eee8d5', // base2 Solarized : badges, en-têtes de section
    border: '#e5dcc4',
    inputBorder: '#d8cfb6',
    separator: '#ded5bd',

    // ── Texte ─────────────────────────────────────────────────────────────
    text: '#2b3641',
    grey100: '#2b3641',
    grey80: '#4b5563',
    grey60: SECONDARY,
    grey40: '#a9a294',

    // ── Sémantique, accordée au Solarized ─────────────────────────────────
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
  // Servi par express.static depuis public/. AdminJS s'en sert à la fois pour
  // la page de login et pour l'en-tête de la sidebar.
  logo: '/static/jules.svg',
  favicon: '/static/jules.svg',
  withMadeWithLove: false,
  theme,
};
