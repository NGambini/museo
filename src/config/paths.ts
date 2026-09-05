import path from 'node:path';
import { fileURLToPath } from 'node:url';

// `dist/` mirrors the `src/` tree (rootDir: src), so this module sits at the
// same depth whether we run under tsx or from dist.
const here = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = path.resolve(here, '..', '..');

/** React components: left as source, AdminJS's own bundler compiles them. */
export const componentsDir = path.join(projectRoot, 'src', 'components');

/** Files served as-is (logo, favicon). */
export const publicDir = path.join(projectRoot, 'public');
