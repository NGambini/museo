import {
  cosineSimilarity,
  findLottieForMuseum,
  normalizeText,
  type LottieEmbeddingsData,
} from '../lottieMatcher';
import realLottieEmbeddings from '../../assets/data/lottieEmbeddings.json';

describe('normalizeText', () => {
  it('met en minuscule et retire les accents', () => {
    expect(normalizeText('Égypte Antique')).toBe('egypte antique');
  });

  it('remplace les tirets et la ponctuation par des espaces', () => {
    expect(normalizeText("Musée d'Orsay - Peinture")).toBe('musee d orsay peinture');
  });

  it('normalise les espaces multiples', () => {
    expect(normalizeText('musée   du   Louvre')).toBe('musee du louvre');
  });
});

describe('cosineSimilarity', () => {
  it('retourne 1 pour deux vecteurs identiques', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it('retourne 0 pour deux vecteurs orthogonaux', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('retourne -1 pour deux vecteurs opposés', () => {
    expect(cosineSimilarity([1, 2], [-1, -2])).toBeCloseTo(-1);
  });

  it('retourne 0 si un vecteur est nul (évite une division par zéro)', () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });
});

// -----------------------------------------------------------------------
// Jeu de données factice, indépendant du modèle réel : sert à tester la
// logique de findLottieForMuseum (matching de mots-clés + cosinus + repli
// par défaut) sans dépendre des embeddings réels générés par le script.
// -----------------------------------------------------------------------
const FAKE_DATA: LottieEmbeddingsData = {
  model: 'fake-model',
  dimensions: 3,
  categories: [
    { id: 'egypt', embedding: [1, 0, 0] },
    { id: 'boat', embedding: [0, 1, 0] },
    { id: 'sculpture', embedding: [0, 0, 1] },
  ],
  vocabulary: [
    { term: 'egypte', embedding: [1, 0, 0] },
    { term: 'pharaon', embedding: [0.9, 0.1, 0] },
    { term: 'bateau', embedding: [0, 1, 0] },
    { term: 'pierre precieuse', embedding: [0.2, 0.2, 0.9] },
  ],
};

describe('findLottieForMuseum — avec un jeu de données factice', () => {
  it("associe un nom contenant un mot-clé au vecteur de catégorie le plus proche par cosinus", () => {
    const result = findLottieForMuseum("Musée d'Egypte du Caire", FAKE_DATA);
    expect(result.id).toBe('egypt');
    expect(result.file).toBe('egypt.json');
    expect(result.score).toBeGreaterThan(0.9);
  });

  it('moyenne les embeddings de plusieurs mots-clés reconnus', () => {
    // "egypte" et "pharaon" sont tous deux proches du vecteur egypt
    const result = findLottieForMuseum("Musée d'Egypte : trésor du pharaon", FAKE_DATA);
    expect(result.id).toBe('egypt');
  });

  it('gère les pluriels réguliers ("s") et irréguliers ("x", ex: bateau -> bateaux)', () => {
    const result = findLottieForMuseum('Musée des bateaux', FAKE_DATA);
    expect(result.id).toBe('boat');
  });

  it('ignore la casse et les accents', () => {
    const result = findLottieForMuseum("MUSÉE D'ÉGYPTE", FAKE_DATA);
    expect(result.id).toBe('egypt');
  });

  it("retombe sur l'animation par défaut (sculpture, score 0) si aucun mot-clé n'est reconnu", () => {
    const result = findLottieForMuseum('Centre culturel de la ville', FAKE_DATA);
    expect(result.id).toBe('sculpture');
    expect(result.score).toBe(0);
  });

  it('ne fait pas de faux positif sur un sous-mot partiel', () => {
    // "bateau" ne doit pas matcher à l'intérieur d'un autre mot
    const result = findLottieForMuseum('Musée du Plateau', FAKE_DATA);
    expect(result.id).not.toBe('boat');
  });
});

// -----------------------------------------------------------------------
// Sanity checks sur les vraies données générées par
// scripts/generate-lottie-embeddings.mjs (modèle transformer réel).
// -----------------------------------------------------------------------
describe('findLottieForMuseum — avec les embeddings réels générés', () => {
  const data = realLottieEmbeddings as LottieEmbeddingsData;
  const validIds = new Set(data.categories.map((c) => c.id));

  it('le fichier de données a bien été généré avec un vecteur par catégorie et par mot-clé', () => {
    expect(data.categories.length).toBeGreaterThan(0);
    expect(data.vocabulary.length).toBeGreaterThan(0);
    expect(data.categories[0].embedding).toHaveLength(data.dimensions);
  });

  it('associe un musée égyptien à la catégorie egypt', () => {
    const result = findLottieForMuseum('Musée égyptien du Caire', data);
    expect(result.id).toBe('egypt');
  });

  it('associe un musée de la momie à la catégorie mummy', () => {
    const result = findLottieForMuseum('Musée de la momie et des sarcophages', data);
    expect(result.id).toBe('mummy');
  });

  it('associe le Musée national de la Marine à la catégorie boat', () => {
    const result = findLottieForMuseum('Musée national de la Marine', data);
    expect(result.id).toBe('boat');
  });

  it('associe le Musée Rodin à la catégorie sculpture', () => {
    const result = findLottieForMuseum('Musée Rodin', data);
    expect(result.id).toBe('sculpture');
  });

  it('retourne toujours un id de catégorie valide', () => {
    const result = findLottieForMuseum('Musée du bateau et de la marine', data);
    expect(validIds.has(result.id)).toBe(true);
  });

  it("retombe sur l'animation par défaut si aucun mot-clé du vocabulaire n'apparaît", () => {
    const result = findLottieForMuseum('Xyzzy Foo Bar', data);
    expect(result.id).toBe('sculpture');
    expect(result.score).toBe(0);
  });
});
