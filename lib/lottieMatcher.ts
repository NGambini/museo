// ---------------------------------------------------------------------------
// Associate a Lottie file (assets/lottie) with a museum using cosine
// similarity between semantic embeddings.
//
// The embeddings are precomputed offline with a transformer model
// (see scripts/generate-lottie-embeddings.mjs, via @huggingface/transformers)
// and stored in assets/data/lottieEmbeddings.json: one vector per animation
// category and one vector per recognized French keyword.
//
// At runtime, no ML library is needed: we detect the keywords present in the
// museum name, average their embeddings to build a vector representing the
// name, and compare it by cosine similarity against each category to find
// the closest match.
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

const DEFAULT_LOTTIE_ID = 'abstract-painting';

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove accents (diacritics after NFD decomposition)
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
    // Optional trailing "s" for regular plurals, "x" for common irregular
    // French plurals (chateau -> chateaux, bateau -> bateaux).
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
 * Find the Lottie file closest to a museum based on its name
 * (in French): the recognized keywords in the name are averaged into a
 * vector and compared by cosine similarity with each animation category.
 * Falls back to a default animation if no keyword is recognized.
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
