# Écrans désactivés

`LoginScreen` et `SignupScreen` sont conservés ici pour référence mais ne sont
**plus des routes** expo-router : le dossier `app/` ne les contient plus, donc
`/LoginScreen` et `/SignupScreen` n'existent pas. L'app démarre directement sur
`/HomeScreen`.

⚠️ Ce code ne compile plus en l'état : toute la couche auth a été supprimée
(`lib/tokenStore.ts`, `api/auth.ts`, `providers/AuthProvider.tsx`, ainsi que
l'intercepteur 401 / refresh token de `lib/apiClient.ts`). Ce dossier est exclu
du typecheck via `tsconfig.json`. Pour réactiver le login, il faudra
réintroduire cette couche.
