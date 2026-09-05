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
  console.log(`Connected to ${env.db.database}@${env.db.host}:${env.db.port}`);

  const app = express();
  app.set('trust proxy', 1);
  app.use(cookieParser());

  // Logo and favicon: served unauthenticated, since the login page loads them
  // before anyone signs in. No `maxAge` — with a long cache, an edit to
  // admin.css would stay invisible and look like a rule that does not work.
  app.use('/static', express.static(publicDir));

  const admin = new AdminJS(adminOptions);

  // In dev, AdminJS rebuilds the React components on the fly; in production we
  // serve the frozen bundle produced by `npm run build`.
  if (env.isProduction) {
    await admin.initialize();
  } else {
    admin.watch();
  }

  // Our JSON routes come BEFORE the AdminJS router: it ends with a catch-all
  // that serves the SPA and would shadow anything mounted after it.
  app.use(
    '/bo-api',
    express.json({ limit: '5mb' }),
    requireAdminApi,
    boApiRouter,
  );

  // The AdminJS router is assembled by hand rather than through
  // `buildAuthenticatedRouter`, which mandates express-session and therefore a
  // server-side store. Here the whole authentication state fits in two httpOnly
  // cookies and nothing is persisted.
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

  // Everything past this point requires an admin account. The guard lets
  // /frontend/assets/* through, or the login page would lose its JS.
  adminRouter.use(requireAdminPage(admin));

  AdminJSExpress.buildRouter(admin, adminRouter);
  app.use(admin.options.rootPath, adminRouter);

  app.get('/', (_req, res) => res.redirect(admin.options.rootPath));
  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

  app.listen(env.port, () => {
    console.log(
      `Backoffice on http://localhost:${env.port}${admin.options.rootPath}`,
    );
    console.log(`Target API: ${env.apiBaseUrl}`);
  });
}

bootstrap().catch((error) => {
  console.error('Startup failed:', error);
  process.exit(1);
});
