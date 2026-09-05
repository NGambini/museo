import AdminJS, { type AdminJSOptions } from 'adminjs';
import * as AdminJSTypeorm from '@adminjs/typeorm';
import { Components, componentLoader } from './component-loader.js';
import { dashboardHandler } from './dashboard.js';
import { frTranslations } from './locale-fr.js';
import { branding } from './theme.js';
import { audioguideResource } from './resources/audioguide.resource.js';
import { userResource } from './resources/user.resource.js';

AdminJS.registerAdapter({
  Database: AdminJSTypeorm.Database,
  Resource: AdminJSTypeorm.Resource,
});

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
    // Une seule langue : AdminJS masque son sélecteur dès que la liste tombe
    // à un élément. Le bundle français ci-dessous est complet — les seules
    // clés qu'il n'a pas sont celles du dashboard d'onboarding d'AdminJS, que
    // l'on remplace, donc aucun repli anglais n'est nécessaire.
    availableLanguages: ['fr'],
    // AdminJS ne transmet pas `language` à i18next comme `lng` : il ne s'en
    // sert que pour calculer `fallbackLng`. C'est donc cette valeur-ci qui
    // fixe réellement la langue affichée.
    fallbackLng: 'fr',
    localeDetection: false,
    translations: { fr: frTranslations },
  },
};
