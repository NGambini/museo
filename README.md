# Audioguide

Monorepo Nx regroupant l'app mobile, l'API et le backoffice.

| Dossier | Projet Nx | Stack |
| --- | --- | --- |
| `apps/mobile` | `mobile` | Expo SDK 57 (React 19) |
| `apps/api` | `api` | NestJS, Cloud Run |
| `apps/backoffice` | `backoffice` | AdminJS (React 18), Cloud Run |

Chaque app garde son propre `package.json` / `package-lock.json` (pas de npm
workspaces) : les versions de React, jest et TypeScript divergent entre les
apps, et les Dockerfiles s'appuient sur le lockfile local. Nx expose les
scripts npm de chaque app comme targets.

## Installation

```bash
npm install          # Nx à la racine
npm run install:all  # dépendances de chaque app
```

## Commandes

```bash
npx nx start mobile         # Expo
npx nx start:dev api        # API en watch
npx nx dev backoffice       # backoffice en watch
npx nx run-many -t build    # build de toutes les apps (avec cache)
npm test                    # tests (hors mobile, lancé en watch)
npx nx graph                # graphe des projets
```

## Déploiement

`apps/api/cloudbuild.yaml` et `apps/backoffice/cloudbuild.yaml` s'exécutent
depuis la racine du repo (`dir: apps/<app>` sur chaque étape). Les triggers
Cloud Build pointent sur ce repo avec le fichier de config de l'app et le
filtre « included files » `apps/<app>/**`.
