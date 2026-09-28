import path from 'node:path';
import { fileURLToPath } from 'node:url';

// `dist/` mirrors the `src/` tree (rootDir: src), so this module always sits two
// levels under the project root.
const here = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = path.resolve(here, '..', '..');

/**
 * React components, as compiled by tsc.
 *
 * AdminJS bundles them for the browser from whatever path it is given, and
 * accepts `.js` just as well as `.tsx`. Pointing it at the build output rather
 * than at the sources means `dist/` holds everything the app needs at runtime —
 * the container ships one directory instead of a mix of build output and
 * hand-picked source files.
 */
export const componentsDir = path.join(projectRoot, 'dist', 'components');

/** Files served as-is (logo, favicon, injected stylesheet). */
export const publicDir = path.join(projectRoot, 'public');
