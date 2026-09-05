import type { LocaleTranslations } from 'adminjs';

/**
 * AdminJS ships no French translation (only de, en, es, it, ja, pl, pt-BR, ua,
 * zh-CN). Without this bundle the UI renders its raw keys — "Login Welcome
 * Header" instead of a title.
 */
export const frTranslations: LocaleTranslations = {
  actions: {
    new: 'Créer',
    edit: 'Modifier',
    show: 'Consulter',
    delete: 'Supprimer',
    bulkDelete: 'Tout supprimer',
    list: 'Liste',
  },
  buttons: {
    save: 'Enregistrer',
    addNewItem: 'Ajouter',
    filter: 'Filtrer',
    filterActive: 'Filtres ({{count}})',
    applyChanges: 'Appliquer',
    resetFilter: 'Réinitialiser',
    confirmRemovalMany: 'Confirmer la suppression de {{count}} enregistrement',
    confirmRemovalMany_plural:
      'Confirmer la suppression de {{count}} enregistrements',
    logout: 'Se déconnecter',
    login: 'Se connecter',
    seeTheDocumentation: 'Voir : <1>la documentation</1>',
    createFirstRecord: 'Créer le premier enregistrement',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    contactUs: 'Nous contacter',
  },
  // A custom page's name is translated through the `pages` namespace, not
  // `labels`: the sidebar renders it via `translatePage(page.name)`.
  pages: {
    generate: 'Générer un audioguide',
  },
  labels: {
    // In list view, a field with `availableValues` is rendered through
    // `tl('<property>.<label>')` with `startCase(label)` as the fallback — and
    // `startCase` strips accents. These keys restore the correct spelling.
    lang: {
      Français: 'Français',
      Anglais: 'Anglais',
      Espagnol: 'Espagnol',
      Allemand: 'Allemand',
      Italien: 'Italien',
    },
    navigation: 'Navigation',
    pages: 'Pages',
    selectedRecords: 'Sélectionnés ({{selected}})',
    filters: 'Filtres',
    adminVersion: 'Admin : {{version}}',
    appVersion: 'App : {{version}}',
    dashboard: 'Accueil',
    Audioguide: 'Catalogue',
    User: 'Comptes',
  },
  properties: {
    length: 'Longueur',
    from: 'De',
    to: 'À',
    placeName: 'Lieu',
    city: 'Ville',
    placeId: 'Google Place ID',
    lang: 'Langue',
    latitude: 'Latitude',
    longitude: 'Longitude',
    attributes: 'Contenu',
    createdAt: 'Créé le',
    updatedAt: 'Modifié le',
    email: 'Email',
    role: 'Rôle',
  },
  components: {
    DropZone: {
      placeholder: 'Dépose ton fichier ici, ou clique pour parcourir',
      acceptedSize: 'Taille max : {{maxSize}}',
      acceptedType: 'Formats acceptés : {{mimeTypes}}',
      unsupportedSize: 'Le fichier {{fileName}} est trop lourd',
      unsupportedType:
        'Le fichier {{fileName}} a un type non supporté : {{fileType}}',
    },
    Login: {
      welcomeHeader: 'Backoffice Audioguide',
      welcomeMessage:
        'Connecte-toi avec un compte de l’API ayant le rôle admin. Les comptes « user » n’ont pas accès à cette interface.',
      properties: {
        email: 'Email',
        password: 'Mot de passe',
      },
      loginButton: 'Se connecter',
    },
  },
  messages: {
    successfullyBulkDeleted: '{{count}} enregistrement supprimé',
    successfullyBulkDeleted_plural: '{{count}} enregistrements supprimés',
    successfullyDeleted: 'Enregistrement supprimé',
    successfullyUpdated: 'Enregistrement mis à jour',
    thereWereValidationErrors:
      'Le formulaire contient des erreurs — voir ci-dessous',
    forbiddenError: 'Action « {{actionName}} » interdite sur {{resourceId}}',
    anyForbiddenError: 'Action interdite',
    successfullyCreated: 'Enregistrement créé',
    bulkDeleteError:
      'Erreur lors de la suppression. Voir la console pour le détail',
    errorFetchingRecords:
      'Erreur lors du chargement des enregistrements. Voir la console',
    errorFetchingRecord:
      'Erreur lors du chargement de l’enregistrement. Voir la console',
    noRecordsSelected: 'Aucun enregistrement sélectionné',
    theseRecordsWillBeRemoved: 'L’enregistrement suivant sera supprimé',
    theseRecordsWillBeRemoved_plural:
      'Les enregistrements suivants seront supprimés',
    pickSomeFirstToRemove:
      'Sélectionne d’abord les enregistrements à supprimer',
    error404Resource: 'Ressource introuvable : {{resourceId}}',
    error404Action:
      'La ressource {{resourceId}} n’a pas d’action « {{actionName}} », ou tu n’y as pas accès',
    error404Record:
      'La ressource {{resourceId}} n’a pas d’enregistrement {{recordId}}, ou tu n’y as pas accès',
    seeConsoleForMore: 'Voir la console pour le détail…',
    noActionComponent: 'Cette action n’a pas de composant associé',
    noRecordsInResource: 'Aucun enregistrement',
    noRecords: 'Aucun enregistrement',
    confirmDelete: 'Confirmer la suppression ?',
    invalidCredentials: 'Identifiants invalides, ou compte sans le rôle admin',
    keyPlaceholder: 'CLÉ',
    valuePlaceholder: 'VALEUR',
    initialKey: 'Clé-{{number}}',
    keyInUse: 'Les clés doivent être uniques',
    keyValuePropertyDefaultDescription:
      'Toutes les valeurs sont stockées en texte. Les clés doivent être uniques.',
    pageNotFound_title: 'Page introuvable',
    pageNotFound_subtitle:
      'La page <strong>« {{pageName}} »</strong> n’existe pas',
    componentNotFound_title: 'Aucun composant',
    componentNotFound_subtitle:
      'Il faut préciser le composant qui rend cet élément',
  },
};
