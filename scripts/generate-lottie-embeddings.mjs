// ---------------------------------------------------------------------------
// Précalcule, via un modèle transformer (@huggingface/transformers), les
// embeddings sémantiques d'une description par animation Lottie ainsi que
// d'un vocabulaire de mots-clés français liés aux musées. Le résultat est
// écrit dans assets/data/lottieEmbeddings.json et consommé au runtime par
// lib/lottieMatcher.ts, qui ne dépend lui d'aucune librairie ML : il calcule
// juste des cosinus entre vecteurs déjà calculés.
//
// Un mot isolé très court (ex: "château", "or", "sacre") s'embeddant parfois
// mal hors contexte avec ce modèle, chaque mot-clé est d'abord testé contre
// sa catégorie prévue ; s'il ne s'y associe pas naturellement, on l'embedde
// avec un peu de contexte (le texte de sa catégorie) pour lever l'ambiguïté.
// Le mot-clé brut ("term") reste seul utilisé pour le matching au runtime,
// seul le texte envoyé au modèle est enrichi.
//
// Usage: node scripts/generate-lottie-embeddings.mjs
// ---------------------------------------------------------------------------

import { pipeline } from '@huggingface/transformers';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, '../assets/data/lottieEmbeddings.json');
const MODEL_ID = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

// Une phrase descriptive par animation (assets/lottie/<id>.json).
const CATEGORY_DESCRIPTIONS = {
  'abstract-painting': 'Art moderne et abstrait, peinture contemporaine non figurative',
  'african-mask': 'Masques et arts africains, art tribal et ethnographie',
  aquarium: 'Aquarium et vie marine, poissons et océan',
  archeologist: 'Archéologie, fouilles et vestiges antiques',
  boat: 'Bateaux, marine et navigation maritime',
  book: 'Livres, manuscrits et littérature',
  'crown-treasury': 'Couronne royale, monarchie et trésor du palais',
  dinosaur: 'Dinosaures et paléontologie, histoire naturelle',
  dinosaur2: 'Dinosaures et paléontologie, histoire naturelle',
  egypt: 'Égypte antique, pharaons et pyramides',
  egypt2: 'Égypte antique, pharaons et pyramides',
  'expensive-crystal': 'Cristal et verrerie précieuse',
  greek: 'Grèce antique et civilisation hellénique',
  japanese: 'Japon et arts asiatiques',
  jewels: 'Bijoux et joaillerie précieuse',
  'mammoth-bones': 'Mammouth et ossements préhistoriques',
  mayan: 'Civilisation maya et précolombienne',
  'middle-eastern-pottery': 'Poterie et céramique du Moyen-Orient',
  mummy: 'Momie égyptienne et sarcophage',
  painting: 'Peinture et beaux-arts, tableaux',
  painting2: 'Peinture et beaux-arts, tableaux',
  'pottery-restauration': 'Restauration de poteries et céramiques',
  pottery: 'Poterie et céramique',
  rock: 'Roches, minéraux et géologie',
  'science-planets': 'Sciences, espace et astronomie',
  sculpture: 'Sculpture et statues',
  sculpture2: 'Sculpture et statues',
  sculpture3: 'Sculpture et statues',
  sword: 'Épées, armes et histoire militaire',
  'treasure-gold-coins': "Trésor, pièces d'or et numismatique",
};

// Mots-clés français groupés par catégorie "canonique" (une seule entrée
// pour les thèmes qui partagent plusieurs animations, ex: sculpture /
// sculpture2 / sculpture3 ont des descriptions identiques donc un seul jeu
// de mots-clés suffit ; les doublons ne sont pas nécessaires).
const VOCABULARY_BY_CATEGORY = {
  'abstract-painting': [
    'art abstrait', 'abstrait', 'abstraite', 'art moderne', 'art contemporain', 'contemporain', 'contemporaine',
    'cubisme', 'cubiste', 'surrealisme', 'surrealiste', 'fauvisme', 'fauviste', 'expressionnisme', 'expressionniste',
    'dadaisme', 'avant garde', 'non figuratif', 'pop art', 'street art', 'graffiti', 'centre pompidou', 'beaubourg', 'picasso',
  ],
  'african-mask': [
    'afrique', 'africain', 'africaine', 'masque', 'masques', 'tribal', 'tribale', 'tribaux',
    'ethnographie', 'ethnographique', 'ethnologie', 'arts premiers', 'quai branly',
    'oceanie', 'oceanien', 'oceanienne', 'polynesie', 'polynesien', 'polynesienne', 'aborigene', 'aborigenes', 'totem', 'totems',
  ],
  aquarium: [
    'aquarium', 'poisson', 'poissons', 'oceanographie', 'oceanographique', 'mer', 'ocean', 'oceans',
    'requin', 'requins', 'corail', 'coraux', 'nautile', 'meduse', 'meduses', 'poulpe', 'poulpes',
    'vie marine', 'faune marine', 'biodiversite marine', 'nausicaa',
  ],
  archeologist: [
    'archeologie', 'archeologique', 'fouille', 'fouilles', 'vestige', 'vestiges', 'ruine', 'ruines', 'site archeologique',
    'gallo romain', 'gallo romaine', 'gallo romains', 'gallo romaines', 'romain', 'romaine', 'romains', 'romaines',
    'antiquites nationales', 'necropole', 'necropoles', 'lapidaire', 'grotte', 'grottes',
  ],
  boat: [
    'bateau', 'bateaux', 'navire', 'navires', 'marine', 'naval', 'navale', 'navals', 'navales',
    'maritime', 'maritimes', 'navigation', 'port', 'ports', 'plaisance', 'sous marin', 'sous marins',
    'phare', 'phares', 'peche', 'pecheur', 'pecheurs', 'corsaire', 'corsaires', 'pirate', 'pirates',
    'voilier', 'voiliers', 'amiraute', 'amiral', 'porte avions',
  ],
  book: [
    'livre', 'livres', 'litterature', 'litteraire', 'bibliotheque', 'bibliotheques', 'manuscrit', 'manuscrits',
    'enluminure', 'enluminures', 'ecriture', 'imprimerie', 'imprimeur', 'edition', 'editions', 'bibliophile',
    'presse', 'journal', 'journaux', 'typographie', 'archives', 'calligraphie',
  ],
  'crown-treasury': [
    'couronne', 'couronnes', 'royal', 'royale', 'royaux', 'royales', 'royaute', 'monarchie', 'monarchique',
    'roi', 'rois', 'reine', 'reines', 'chateau', 'chateaux', 'palais', 'versailles', 'fontainebleau',
    'tuileries', 'compiegne', 'chantilly', 'imperial', 'imperiale', 'imperiaux', 'imperiales', 'empire',
    'napoleon', 'napoleonien', 'napoleonienne', 'sacre', 'regalia', 'prince', 'princesse', 'princes', 'princesses',
    'noblesse', 'aristocratie', 'tresor royal', 'tresor imperial',
  ],
  dinosaur: [
    'dinosaure', 'dinosaures', 'paleontologie', 'paleontologique', 'fossile', 'fossiles', 'jurassique', 'cretace',
    'trias', 'histoire naturelle', 'sciences naturelles', 'reptile', 'reptiles', 'museum',
  ],
  egypt: [
    'egypte', 'egyptien', 'egyptienne', 'pharaon', 'pharaons', 'pharaonique', 'pyramide', 'pyramides',
    'hieroglyphe', 'hieroglyphes', 'sphinx', 'toutankhamon', 'cleopatre', 'nil', 'antiquites egyptiennes',
  ],
  'expensive-crystal': [
    'cristal', 'cristallerie', 'verre', 'verrerie', 'verrier', 'verriers', 'vitrail', 'vitraux',
    'baccarat', 'lalique', 'daum', 'souffleur de verre', 'soufflage du verre',
  ],
  greek: [
    'grece', 'grec', 'grecque', 'grecs', 'grecques', 'hellenique', 'hellenistique', 'antiquite', 'antiquites',
    'antique', 'antiques', 'mythologie grecque', 'civilisation grecque', 'athenes', 'sparte', 'olympie', 'delphes',
    'byzantin', 'byzantine', 'amphore grecque',
  ],
  japanese: [
    'japon', 'japonais', 'japonaise', 'japonaises', 'asie', 'asiatique', 'asiatiques', 'chine', 'chinois', 'chinoise',
    'coree', 'coreen', 'coreenne', 'guimet', 'cernuschi', 'extreme orient', 'samourai', 'samourais', 'geisha',
    'geishas', 'estampe', 'estampes', 'kimono', 'kimonos', 'bouddha', 'bouddhisme', 'bouddhique',
  ],
  jewels: [
    'bijou', 'bijoux', 'joaillerie', 'joaillier', 'joailliers', 'orfevrerie', 'orfevre', 'orfevres',
    'gemme', 'gemmes', 'diamant', 'diamants', 'perle', 'perles', 'parure', 'parures',
    'pierre precieuse', 'pierres precieuses', 'emeraude', 'emeraudes', 'rubis', 'saphir', 'saphirs',
  ],
  'mammoth-bones': [
    'mammouth', 'mammouths', 'ossement', 'ossements', 'squelette', 'squelettes', 'ivoire', 'quaternaire',
  ],
  mayan: [
    'maya', 'mayas', 'azteque', 'azteques', 'aztec', 'precolombien', 'precolombienne', 'precolombiens',
    'precolombiennes', 'inca', 'incas', 'mesoamerique', 'amerindien', 'amerindienne', 'amerindiens',
    'amerindiennes', 'olmeque', 'olmeques',
  ],
  'middle-eastern-pottery': [
    'orient', 'oriental', 'orientale', 'orientaux', 'orientales', 'moyen orient', 'mesopotamie', 'mesopotamien',
    'mesopotamienne', 'perse', 'persan', 'persane', 'babylone', 'babylonien', 'babylonienne', 'sumerien',
    'sumerienne', 'art islamique', 'levant',
  ],
  mummy: [
    'momie', 'momies', 'sarcophage', 'sarcophages', 'embaumement', 'rite funeraire', 'rites funeraires',
    'tombeau', 'tombeaux',
  ],
  painting: [
    'peinture', 'peintures', 'tableau', 'tableaux', 'beaux arts', 'toile', 'toiles', 'impressionnisme',
    'impressionniste', 'impressionnistes', 'post impressionnisme', 'portrait', 'portraits', 'aquarelle',
    'aquarelles', 'fresque', 'fresques', 'galerie', 'galeries', 'orsay', 'orangerie', 'monet', 'renoir',
    'art parietal', 'peinture rupestre', 'grotte ornee', 'lascaux', 'chauvet',
  ],
  'pottery-restauration': [
    'restauration', 'atelier de restauration', 'conservation restauration', 'restaurateur', 'restaurateurs',
  ],
  pottery: [
    'poterie', 'poteries', 'ceramique', 'ceramiques', 'faience', 'faiences', 'terre cuite', 'argile',
    'sevres', 'vase', 'vases', 'amphore', 'amphores',
  ],
  rock: [
    'roche', 'roches', 'mineral', 'mineraux', 'mineralogie', 'mineralogique', 'geologie', 'geologique',
    'cristaux', 'mine', 'mines', 'carriere', 'carrieres', 'gemmologie',
  ],
  'science-planets': [
    'science', 'sciences', 'espace', 'spatial', 'spatiale', 'astronomie', 'astronomique', 'univers', 'cosmos',
    'planete', 'planetes', 'planetarium', 'systeme solaire', 'aeronautique', 'aviation', 'avion', 'avions',
    'palais de la decouverte', 'etoiles',
  ],
  sculpture: [
    'sculpture', 'sculptures', 'statue', 'statues', 'sculpteur', 'sculpteurs', 'statuaire', 'buste', 'bustes',
    'bronze', 'bronzes', 'marbre', 'rodin', 'camille claudel', 'monumentale', 'monumental',
  ],
  sword: [
    'epee', 'epees', 'arme', 'armes', 'armement', 'guerre', 'guerres', 'militaire', 'militaires', 'soldat',
    'soldats', 'bataille', 'batailles', 'armure', 'armures', 'chevalier', 'chevaliers', 'artillerie',
    'resistance', 'deportation', 'occupation', 'debarquement', 'tranchee', 'tranchees', 'grande guerre',
    'armee', 'arsenal',
  ],
  'treasure-gold-coins': [
    'tresor', 'tresors', 'or', 'monnaie', 'monnaies', 'piece', 'pieces', 'numismatique', 'numismate',
    'medaille', 'medailles', 'hotel des monnaies', 'lingot', 'lingots',
  ],
};

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function main() {
  console.log(`Chargement du modèle ${MODEL_ID}...`);
  const extractor = await pipeline('feature-extraction', MODEL_ID);

  async function embed(text) {
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data).map((value) => Math.round(value * 1e5) / 1e5);
  }

  console.log(`Calcul des embeddings pour ${Object.keys(CATEGORY_DESCRIPTIONS).length} catégories...`);
  const categories = [];
  for (const [id, description] of Object.entries(CATEGORY_DESCRIPTIONS)) {
    categories.push({ id, embedding: await embed(description) });
  }

  function bestCategoryScore(vector) {
    let best = -Infinity;
    for (const category of categories) {
      const sim = cosineSimilarity(vector, category.embedding);
      if (sim > best) best = sim;
    }
    return best;
  }

  function categoryScore(vector, categoryId) {
    const category = categories.find((c) => c.id === categoryId);
    return cosineSimilarity(vector, category.embedding);
  }

  const totalTerms = Object.values(VOCABULARY_BY_CATEGORY).reduce((sum, terms) => sum + terms.length, 0);
  console.log(`Calcul des embeddings pour ${totalTerms} mots-clés (avec auto-correction si nécessaire)...`);

  const vocabulary = [];
  let repairedCount = 0;
  for (const [categoryId, terms] of Object.entries(VOCABULARY_BY_CATEGORY)) {
    for (const term of terms) {
      const bareVector = await embed(term);
      const ownScore = categoryScore(bareVector, categoryId);
      const topScore = bestCategoryScore(bareVector);

      if (Math.abs(topScore - ownScore) < 1e-6) {
        vocabulary.push({ term, embedding: bareVector });
      } else {
        repairedCount += 1;
        const repairedVector = await embed(`${term}, ${CATEGORY_DESCRIPTIONS[categoryId]}`);
        vocabulary.push({ term, embedding: repairedVector });
      }
    }
  }
  console.log(`Mots-clés désambiguïsés avec du contexte additionnel : ${repairedCount}/${vocabulary.length}`);

  const dimensions = categories[0].embedding.length;
  const payload = { model: MODEL_ID, dimensions, categories, vocabulary };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload));
  console.log(`Écrit ${OUTPUT_PATH} (${dimensions} dimensions, ${categories.length} catégories, ${vocabulary.length} mots-clés)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
