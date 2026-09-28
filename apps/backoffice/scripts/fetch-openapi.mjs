// Fetches the OpenAPI spec served by the NestJS API in dev (Swagger is only
// mounted outside production) and writes it to openapi.json, the source of truth
// for the generated types.
import { writeFileSync } from 'node:fs';

const base = process.env.API_BASE_URL ?? 'http://localhost:3000';
const url = `${base}/api-json`;

const res = await fetch(url);
if (!res.ok) {
  console.error(`GET ${url} -> ${res.status}. Is the API running in dev?`);
  process.exit(1);
}

writeFileSync('openapi.json', JSON.stringify(await res.json(), null, 2) + '\n');
console.log(`OpenAPI spec written from ${url}`);
