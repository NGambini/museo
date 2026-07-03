// ---------------------------------------------------------------------------
// Association d'un fichier Lottie (assets/lottie) à un musée par similarité
// cosinus entre embeddings sémantiques.
//
// Les embeddings sont précalculés hors-ligne avec un modèle transformer
// (voir scripts/generate-lottie-embeddings.mjs, via @huggingface/transformers)
// et stockés dans assets/data/lottieEmbeddings.json : un vecteur par
// catégorie d'animation, et un vecteur par mot-clé français reconnu.
//
// Au runtime, aucune librairie ML n'est nécessaire : on repère les mots-clés
// présents dans le nom du musée, on moyenne leurs embeddings pour obtenir un
// vecteur représentant ce nom, puis on le compare par cosinus à chaque
// catégorie pour trouver la plus proche.
// ---------------------------------------------------------------------------

import lottieEmbeddingsData from '@/assets/data/lottieEmbeddings.json';

export interface CategoryEmbedding {
  id: string;
  embedding: number[];
}

export interface VocabularyEmbedding {
  term: string;
  embedding: number[];
}

export interface LottieEmbeddingsData {
  model: string;
  dimensions: number;
  categories: CategoryEmbedding[];
  vocabulary: VocabularyEmbedding[];
}

export interface LottieMatchResult {
  id: string;
  file: string;
  score: number;
}

const DEFAULT_LOTTIE_ID = 'sculpture';

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents (diacritiques après décomposition NFD)
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cosineSimilarity(a: number[], b: number[]): number {
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

function meanVector(vectors: number[][]): number[] | null {
  if (vectors.length === 0) return null;
  const dimensions = vectors[0].length;
  const sum = new Array(dimensions).fill(0);
  for (const vector of vectors) {
    for (let i = 0; i < dimensions; i += 1) {
      sum[i] += vector[i];
    }
  }
  return sum.map((value) => value / vectors.length);
}

function buildMuseumVector(normalizedName: string, vocabulary: VocabularyEmbedding[]): number[] | null {
  const matchingVectors: number[][] = [];
  for (const { term, embedding } of vocabulary) {
    // "s" final optionnel pour le pluriel régulier, "x" pour les pluriels
    // irréguliers courants en français (chateau -> chateaux, bateau -> bateaux).
    const pattern = normalizeText(term)
      .split(/\s+/)
      .map((word) => `${word}(?:s|x)?`)
      .join('\\s+');
    if (new RegExp(`\\b${pattern}\\b`).test(normalizedName)) {
      matchingVectors.push(embedding);
    }
  }
  return meanVector(matchingVectors);
}

function toResult(id: string, score: number): LottieMatchResult {
  return { id, file: `${id}.json`, score };
}

/**
 * Trouve le fichier Lottie le plus proche d'un musée à partir de son nom
 * (en français) : les mots-clés reconnus dans le nom sont moyennés en un
 * vecteur, comparé par similarité cosinus à chaque catégorie d'animation.
 * Retombe sur une animation par défaut si aucun mot-clé n'est reconnu.
 */
export function findLottieForMuseum(
  museumName: string,
  data: LottieEmbeddingsData = lottieEmbeddingsData as LottieEmbeddingsData
): LottieMatchResult {
  const normalizedName = normalizeText(museumName);
  const museumVector = buildMuseumVector(normalizedName, data.vocabulary);

  if (!museumVector) {
    return toResult(DEFAULT_LOTTIE_ID, 0);
  }

  let best = toResult(DEFAULT_LOTTIE_ID, 0);
  for (const category of data.categories) {
    const score = cosineSimilarity(museumVector, category.embedding);
    if (score > best.score) {
      best = toResult(category.id, score);
    }
  }

  return best;
}
