#!/usr/bin/env node
// ---------------------------------------------------------------------------
// CLI de test rapide pour le matching Lottie (lib/lottieMatcher.ts).
// Réimplémente la même logique en JS pur pour tourner directement avec node,
// sans étape de build TypeScript.
//
// Usage: node match-lottie.mjs "Musée d'Orsay"
// ---------------------------------------------------------------------------

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function meanVector(vectors) {
  if (vectors.length === 0) return null;
  const dimensions = vectors[0].length;
  const sum = new Array(dimensions).fill(0);
  for (const vector of vectors) {
    for (let i = 0; i < dimensions; i += 1) sum[i] += vector[i];
  }
  return sum.map((value) => value / vectors.length);
}

function findMatchingTerms(normalizedName, vocabulary) {
  const matches = [];
  for (const { term, embedding } of vocabulary) {
    const pattern = normalizeText(term)
      .split(/\s+/)
      .map((word) => `${word}(?:s|x)?`)
      .join('\\s+');
    if (new RegExp(`\\b${pattern}\\b`).test(normalizedName)) {
      matches.push({ term, embedding });
    }
  }
  return matches;
}

async function main() {
  const museumName = process.argv.slice(2).join(' ').trim();
  if (!museumName) {
    console.error('Usage: node match-lottie.mjs "<nom du musée>"');
    process.exit(1);
  }

  const dataPath = path.resolve(__dirname, 'assets/data/lottieEmbeddings.json');
  const data = JSON.parse(await readFile(dataPath, 'utf8'));

  const normalizedName = normalizeText(museumName);
  const matchedTerms = findMatchingTerms(normalizedName, data.vocabulary);
  const museumVector = meanVector(matchedTerms.map((m) => m.embedding));

  console.log(`Nom : "${museumName}"`);
  console.log(`Mots-clés reconnus : ${matchedTerms.length > 0 ? matchedTerms.map((m) => m.term).join(', ') : '(aucun)'}`);
  console.log('');

  if (!museumVector) {
    console.log('-> Aucun mot-clé reconnu, repli sur : sculpture.json (score 0)');
    return;
  }

  const ranked = data.categories
    .map((category) => ({ id: category.id, score: cosineSimilarity(museumVector, category.embedding) }))
    .sort((a, b) => b.score - a.score);

  console.log('Top 5 catégories :');
  for (const { id, score } of ranked.slice(0, 5)) {
    console.log(`  ${score.toFixed(4)}  ${id}`);
  }

  console.log('');
  console.log(`-> Lottie choisi : ${ranked[0].id}.json (score ${ranked[0].score.toFixed(4)})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
