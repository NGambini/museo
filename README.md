# audioguide-backoffice

Backoffice d'administration [AdminJS](https://adminjs.co) pour l'API
[audioguide-api](../audioguide-api).

## Ce qu'il fait

- **Catalogue** — liste, consultation, édition et suppression des audioguides.
- **Éditeur de contenu** — champ personnalisé pour la colonne `attributes`
  (jsonb) : édition structurée des chapitres, ou JSON brut.
- **Écoute des médias** — lecteurs audio et vignettes pour chaque chapitre,
  servis depuis Google Cloud Storage via des URLs signées.
- **Génération** — page dédiée avec autocomplétion Google Places : on cherche un
  lieu, on choisit la langue, on lance la génération.
- **Comptes** — consultation des utilisateurs et changement de rôle.

## Architecture

**Tout passe par l'API NestJS.** Le backoffice n'a aucune connexion base de
données, aucun credential Google Cloud, et n'a donc rien à savoir du schéma.

Les ressources AdminJS ne sont pas adossées à un ORM mais à une implémentation
maison de `BaseResource` ([`src/admin/api-resource.ts`](src/admin/api-resource.ts))
qui traduit les appels d'AdminJS (`find`, `count`, `findOne`, `update`,
`delete`) en requêtes HTTP vers `/admin/audioguides` et `/admin/users`. Ces
endpoints sont protégés côté API par `@Roles(UserRole.ADMIN)`.

Une subtilité : AdminJS ne transmet pas la requête Express à ses ressources, il
n'y a donc aucun moyen de leur passer des identifiants en argument. Les jetons
de l'admin connecté voyagent dans un `AsyncLocalStorage`
([`src/api/request-context.ts`](src/api/request-context.ts)), ce qui attribue
chaque appel à l'admin qui l'a déclenché plutôt qu'à un compte de service
partagé.

Les endpoints `/admin/*` renvoient les lignes telles que stockées : `attributes`
y garde ses chemins GCS bruts. C'est indispensable pour l'édition — écrire une
URL signée dans la colonne casserait la lecture à l'expiration de la signature.
La lecture des médias passe, elle, par le `GET /audioguides/:id` public, qui
signe les URLs.

### Authentification

Sans état : ni table ni store de session. Le backoffice n'a pas non plus de
table d'utilisateurs — les comptes sont ceux de l'API.

Le formulaire de connexion appelle `POST /auth/login`, puis dépose les deux
jetons de l'API dans des cookies `httpOnly` (`bo_at`, `bo_rt`). Chaque requête
revérifie la **signature** de l'access token avec `JWT_ACCESS_SECRET` — le même
secret que l'API — puis relit le claim `role` et **refuse tout compte qui n'est
pas `admin`**. Quand l'access token a expiré, la garde le renouvelle via
`/auth/refresh` et repose les cookies, de façon transparente.

Vérifier la signature n'est pas facultatif : le jeton arrive par un cookie,
donc du client. Sans cette vérification, n'importe qui pourrait forger un
`role: admin`. L'algorithme est verrouillé sur HS256 pour la même raison.

Le routeur AdminJS est assemblé à la main (`buildRouter`) plutôt que via
`buildAuthenticatedRouter`, qui impose `express-session`. La garde pose un
`req.session = { adminUser }` ordinaire, le temps de la requête : c'est tout ce
qu'AdminJS lit pour peupler `currentAdmin`. Cet objet ne contient que l'identité
— AdminJS le sérialise dans le HTML envoyé au navigateur, y glisser les jetons
les exposerait.

`express-session` reste dans les dépendances : l'index de `@adminjs/express`
importe `buildAuthenticatedRouter`, qui l'importe à son tour, et le paquet ne se
charge pas sans lui. Rien dans ce projet ne l'utilise.

Promouvoir un compte se fait en base, comme côté API :

```sql
UPDATE users SET role = 'admin' WHERE email = 'toi@exemple.com';
```

`ALLOWED_ADMIN_EMAILS` permet en plus de restreindre l'accès à une liste
d'emails, en gardant le rôle comme condition nécessaire.

### Routes maison

Les composants React consomment `/bo-api/*`, monté **avant** le routeur AdminJS
(dont le catch-all sert la SPA et masquerait tout ce qui vient après) :

| Route | Rôle |
|---|---|
| `GET /bo-api/audioguides/:id/media` | Proxy vers `GET /audioguides/:id` — renvoie les `attributes` avec URLs signées. |
| `POST /bo-api/generate` | Proxy vers `POST /audioguides/generate`. |
| `GET /bo-api/places/autocomplete?q=` | Proxy Google Places. La clé reste côté serveur. |
| `GET /bo-api/places/:placeId/existing` | Dit si le lieu est déjà au catalogue (via l'API). |

Toutes exigent une session admin (401 sinon).

### Types

`src/types/api.ts` est **généré** depuis la spec OpenAPI de l'API :

```bash
npm run types:api:fetch   # récupère /api-json puis regénère (API en dev requise)
npm run types:api         # regénère depuis openapi.json déjà présent
```

Une nuance : l'API documente `attributes` comme un objet libre, ce que le
générateur traduit par `Record<string, never>` — inexploitable. La forme réelle
du jsonb est donc décrite à la main dans `src/types/attributes.ts` et substituée
au type généré dans `src/api/client.ts`. Tout le reste vient de la spec.

## Apparence

Le logo (`public/jules.svg`) est servi par `express.static` sous `/static` et
déclaré une seule fois dans `branding.logo` : AdminJS s'en sert à la fois pour
la page de connexion et pour l'en-tête de la sidebar. Il sert aussi de favicon.

La palette vit dans [`src/admin/theme.ts`](src/admin/theme.ts) : orange `#f49d25`
en primaire, gris `#6b7280` en secondaire, et des surfaces Solarized Light
adoucies (fond crème plutôt que blanc pur).

Un piège si tu retouches le thème : AdminJS peint ses cartes avec
`colors.white` (`<Box variant="white">`), pas avec `colors.container`. Laisser
`white` à `#fff` garde donc toutes les listes et tous les formulaires éclatants
sur le fond crème — c'est ce jeton-là qu'il faut adoucir pour que la teinte
prenne partout.

De même, les liens écrits à la main dans les composants doivent utiliser
`Link` du design-system : un `<a>` nu retombe sur le bleu par défaut du
navigateur et ignore la palette.

`public/admin.css`, injecté via `assets.styles`, couvre ce que ni le thème ni
les props n'atteignent — aujourd'hui les boutons d'action des fiches, qu'AdminJS
rend en contour. La règle est volontairement limitée à `.adminjs_ActionHeader` :
les mêmes classes servent aux menus « … » des listes, qui n'ont pas de bordure
et deviendraient des pavés pleins.

### Navigation et langue

Les ressources déclarent `navigation: { name: null, icon: … }` : elles
apparaissent au premier niveau de la sidebar avec leur icône. Sans le
`name: null`, AdminJS crée un groupe qui ne contient qu'elles — deux niveaux
pour une seule entrée.

`availableLanguages` ne contient que `fr`, ce qui fait disparaître le sélecteur
de langue (AdminJS le masque en dessous de deux langues). Le bundle français
est complet ; les seules clés qu'il n'a pas sont celles du dashboard
d'onboarding d'AdminJS, remplacé par le nôtre.

## Démarrage

Prérequis : l'API tourne (`npm run start:dev` dans `audioguide-api`).

```bash
cp .env.sample .env   # puis renseigne JWT_ACCESS_SECRET et GOOGLE_PLACES_API_KEY
npm install --legacy-peer-deps
npm run dev
```

→ http://localhost:4000/admin

`--legacy-peer-deps` n'est pas cosmétique : le graphe de peer dependencies
d'AdminJS fait patiner le résolveur d'npm pendant plusieurs minutes sans lui.

## Scripts

| Script | Effet |
|---|---|
| `npm run dev` | `tsc --watch` + `node --watch` en parallèle. |
| `npm run build` | Compile TypeScript vers `dist/`. |
| `npm start` | Lance `dist/` (pose `NODE_ENV=production` pour figer le bundle). |
| `npm run types:api` | Regénère les types depuis `openapi.json`. |
| `npm run format` | Prettier. |

## Contraintes de versions

Les versions sont épinglées, et pas par excès de prudence :

- **Express 4** — AdminJS 7 termine son routeur par un `get('*')` que le routeur
  d'Express 5 rejette.
- **React 18** — `@adminjs/design-system` v4 n'est pas compatible React 19.
- **TypeORM 0.3** — attendu par `@adminjs/typeorm` v5.
- **`@tiptap/*` figés en 2.1.13** via `overrides` — le starter-kit d'AdminJS
  tire sinon des extensions 2.27 sur un core 2.1, et l'app plante au démarrage
  sur un export manquant.

Les composants React sont compilés par `tsc` comme le reste du serveur, et
AdminJS les bundle depuis `dist/components`. Un seul outil de compilation, un
seul répertoire de sortie : `dist/` contient tout ce dont l'application a besoin
à l'exécution.

Le `jsx` du tsconfig est réglé sur `react` (runtime classique) et non
`react-jsx` : ce dernier fait émettre un import de `react/jsx-runtime`, que le
bundler d'AdminJS ne traite pas comme externe — il embarquerait un second React
dans le bundle navigateur.

## Limites connues

- Le dashboard lit son plafond quotidien depuis `/admin/audioguides/stats`, donc
  il ne peut plus diverger de celui que l'API applique réellement.
- La création d'audioguide à la main est désactivée : une fiche sans contenu ni
  média n'a pas de sens, tout passe par la génération.
- Le backoffice partage `JWT_ACCESS_SECRET` avec l'API. C'est la contrepartie
  d'une vérification locale : sans le secret, il faudrait un aller-retour vers
  l'API à chaque requête pour valider le jeton.
- Les cookies portent 7 jours (durée du refresh token de l'API). Une
  rétrogradation de rôle en base prend effet à l'expiration de l'access token
  courant, soit 15 minutes au plus.

## Déploiement

`Dockerfile` + `cloudbuild.yaml` déploient sur Cloud Run, sur le modèle de
l'API : l'image finale contient `dist/` et `public/`, rien d'autre.

`npm ci --omit=dev` suffit — les dépendances du bundler
(`@babel/preset-typescript`, `rollup-plugin-esbuild-minify`) sont des
dépendances de production d'AdminJS. Le bundle navigateur est construit au
démarrage, mesuré à ~2 s à froid ; `ADMIN_JS_SKIP_BUNDLE=true` permettrait de le
pré-construire au build si ça devenait gênant.

Le service n'a besoin ni de Cloud SQL ni du mot de passe de la base.

`cloudbuild.yaml` pose lui-même `API_BASE_URL` et rattache les secrets
`JWT_ACCESS_SECRET` et `GOOGLE_PLACES_API_KEY`, déjà présents dans Secret
Manager et partagés avec l'API. Le service Cloud Run n'a pas à être créé à la
main : `gcloud run deploy` s'en charge au premier build.
