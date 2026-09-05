import { type AdminJSOptions } from 'adminjs';
import { Components, componentLoader } from './component-loader.js';
import { dashboardHandler } from './dashboard.js';
import { frTranslations } from './locale-fr.js';
import { branding } from './theme.js';
import { audioguideResource } from './resources/audioguide.resource.js';
import { userResource } from './resources/user.resource.js';

export const adminOptions: AdminJSOptions = {
  rootPath: '/admin',
  componentLoader,
  resources: [audioguideResource, userResource],
  dashboard: {
    component: Components.Dashboard,
    handler: dashboardHandler,
  },
  pages: {
    generate: {
      component: Components.GeneratePage,
      icon: 'Zap',
    },
  },
  branding,
  assets: { styles: ['/static/admin.css'] },
  locale: {
    language: 'fr',
    // A single language: AdminJS hides its selector as soon as the list is down
    // to one entry. The French bundle below is complete — the only keys it lacks
    // belong to AdminJS's onboarding dashboard, which we replace, so no English
    // fallback is needed.
    availableLanguages: ['fr'],
    // AdminJS does not pass `language` to i18next as `lng`: it only uses it to
    // derive `fallbackLng`. So this value is what actually pins the language
    // that gets rendered.
    fallbackLng: 'fr',
    localeDetection: false,
    translations: { fr: frTranslations },
  },
};
