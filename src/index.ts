import 'reflect-metadata';
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import cookieParser from 'cookie-parser';
import express from 'express';
import {
  handleLogin,
  handleLogout,
  renderLoginPage,
  requireAdminApi,
  requireAdminPage,
} from './admin/auth.js';
import { adminOptions } from './admin/options.js';
import { publicDir } from './config/paths.js';
import { env } from './config/env.js';
import { dataSource } from './db/data-source.js';
import { boApiRouter } from './routes/bo-api.js';
import './api/session.js';

async function bootstrap(): Promise<void> {
  await dataSource.initialize();
  console.log(
    `Base ${env.db.database}@${env.db.host}:${env.db.port} connectée`,
  );

  const app = express();
  app.set('trust proxy', 1);
  app.use(cookieParser());

  // Logo et favicon : servis en clair, ils sont chargés par la page de login
  // avant toute authentification. Pas de `maxAge` — avec un cache long, une
  // retouche de admin.css resterait invisible et passerait pour inopérante.
  app.use('/static', express.static(publicDir));

  const admin = new AdminJS(adminOptions);

  // En dev, AdminJS recompile les composants React à chaud ; en production on
  // sert le bundle figé produit par `npm run build`.
  if (env.isProduction) {
    await admin.initialize();
  } else {
    admin.watch();
  }

  // Nos routes JSON passent AVANT le routeur AdminJS : celui-ci se termine par
  // un catch-all qui sert la SPA et masquerait tout ce qui est monté après.
  app.use(
    '/bo-api',
    express.json({ limit: '5mb' }),
    requireAdminApi,
    boApiRouter,
  );

  // On construit le routeur d'AdminJS à la main plutôt que d'utiliser
  // `buildAuthenticatedRouter` : celui-ci impose express-session, donc un store
  // côté serveur. Ici, l'état d'authentification tient entièrement dans deux
  // cookies httpOnly et rien n'est persisté.
  const adminRouter = express.Router();

  const loginRoute = admin.options.loginPath.replace(
    admin.options.rootPath,
    '',
  );
  const logoutRoute = admin.options.logoutPath.replace(
    admin.options.rootPath,
    '',
  );

  adminRouter.get(loginRoute, renderLoginPage(admin));
  adminRouter.post(
    loginRoute,
    express.urlencoded({ extended: false }),
    handleLogin(admin),
  );
  adminRouter.get(logoutRoute, handleLogout(admin));

  // Tout ce qui suit exige un compte admin. La garde laisse passer
  // /frontend/assets/*, sans quoi la page de connexion perdrait son JS.
  adminRouter.use(requireAdminPage(admin));

  AdminJSExpress.buildRouter(admin, adminRouter);
  app.use(admin.options.rootPath, adminRouter);

  app.get('/', (_req, res) => res.redirect(admin.options.rootPath));
  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

  app.listen(env.port, () => {
    console.log(
      `Backoffice sur http://localhost:${env.port}${admin.options.rootPath}`,
    );
    console.log(`API cible : ${env.apiBaseUrl}`);
  });
}

bootstrap().catch((error) => {
  console.error('Démarrage impossible :', error);
  process.exit(1);
});
