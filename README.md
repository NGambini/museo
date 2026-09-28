<p align="center">
  <img src="apps/mobile/assets/images/logo_mondrian.svg" width="140" alt="Logo Muséo" />
</p>

# Muséo

Des audioguides pour enfants (6-12 ans), générés par IA pour n'importe quel lieu : musée, château, abbaye…

Un admin choisit un lieu. L'API écrit la visite avec Gemini, l'illustre, l'enregistre en synthèse vocale, puis l'app mobile la lit avec un transcript synchronisé façon karaoké.

## Apps

| Dossier | Stack | Rôle |
|---|---|---|
| `apps/mobile` | Expo, React Native, TanStack Query, NativeWind | Carte des audioguides, lecteur par chapitre, transcript karaoké, historique. Sans compte. |
| `apps/api` | NestJS, TypeORM, PostgreSQL, Socket.IO | Catalogue, génération des audioguides, auth JWT |
| `apps/backoffice` | AdminJS, Express | Lancer et suivre les générations, éditer le contenu, gérer les comptes |

L'API est la seule à accéder à la base et à Google Cloud. Le backoffice passe entièrement par elle.

## Génération d'un audioguide

1. **Google Places** : nom, coordonnées et photos du lieu.
2. **Gemini** (avec recherche Google) : titre, introduction et 4 à 10 chapitres, déjà découpés en lignes.
3. **Wikimedia Commons** : une illustration par chapitre, avec une photo Places en repli.
4. **Text-to-Speech** : chaque ligne est synthétisée séparément, puis les clips sont assemblés en un MP3. La voix utilisée ne donne pas le minutage des mots, alors on calcule le début de chaque ligne à partir de la longueur de l'audio. C'est ce qui permet le karaoké.
5. Les médias sont stockés sur Cloud Storage et servis par URLs signées.

La génération prend plus d'une minute. L'API répond donc tout de suite (`202`) et envoie la progression par websocket au backoffice. Pour limiter les coûts, seuls les admins peuvent générer depuis le backoffice.

## Déploiement

API et backoffice sur **Cloud Run**, via **Cloud Build** (tests, image Docker, déploiement). Chaque service a son propre trigger, déclenché seulement quand son dossier change.

## Lancer en local

Monorepo **Nx**. Chaque app garde ses propres dépendances, car Expo et AdminJS demandent des versions de React incompatibles.

```bash
npm install && npm run install:all
npm run mobile       # ou ios / android / web
npm run api
npm run backoffice
npm run dev          # api + backoffice
npm test
```

Les variables d'environnement sont dans `apps/api/.env.sample` et `apps/backoffice/.env.sample`. Pour créer un compte admin, voir [`apps/api/docs/comptes-admin.md`](apps/api/docs/comptes-admin.md).
