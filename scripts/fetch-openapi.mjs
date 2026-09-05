// Récupère la spec OpenAPI servie par l'API NestJS en dev (Swagger est monté
// uniquement hors production) et l'écrit dans openapi.json, source de vérité
// pour les types générés.
import { writeFileSync } from 'node:fs';

const base = process.env.API_BASE_URL ?? 'http://localhost:3000';
const url = `${base}/api-json`;

const res = await fetch(url);
if (!res.ok) {
  console.error(`GET ${url} -> ${res.status}. L'API tourne-t-elle en dev ?`);
  process.exit(1);
}

writeFileSync('openapi.json', JSON.stringify(await res.json(), null, 2) + '\n');
console.log(`Spec OpenAPI écrite depuis ${url}`);
