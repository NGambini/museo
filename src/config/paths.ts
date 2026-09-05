import path from 'node:path';
import { fileURLToPath } from 'node:url';

// `dist/` reproduit l'arborescence de `src/` (rootDir: src) : ce module se
// trouve donc à la même profondeur qu'on tourne sous tsx ou depuis dist.
const here = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = path.resolve(here, '..', '..');

/** Composants React : laissés en source, c'est le bundler d'AdminJS qui les compile. */
export const componentsDir = path.join(projectRoot, 'src', 'components');

/** Fichiers servis tels quels (logo, favicon). */
export const publicDir = path.join(projectRoot, 'public');
