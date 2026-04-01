export const buildAudioguidePrompt = (
  placeName: string,
  lang: string,
): string => `Tu es un guide touristique expert pour enfants de 6 à 12 ans. Génère un audioguide complet et captivant pour "${placeName}" en ${lang === 'fr' ? 'français' : lang}, adapté à des enfants.

Réponds UNIQUEMENT avec un objet JSON valide respectant exactement cette structure, sans aucun texte supplémentaire :
{
  "title": "Titre accrocheur de l'audioguide pour enfants",
  "admission_price": "prix d'entrée (ex: '15€') ou null si tu n'en es pas certain",
  "history": "Introduction historique du lieu en 2-3 phrases simples et engageantes pour les enfants",
  "chapters": [
    {
      "chapter_number": 1,
      "title": "Titre du chapitre",
      "description": "Description courte du chapitre en 1 phrase",
      "text": "Texte à lire à voix haute, adapté aux enfants de 6-12 ans, fun et éducatif (200-300 mots)",
      "image_search_query": "specific english keyword optimized for Wikimedia Commons image search"
    }
  ]
}

Génère entre 3 et 5 chapitres. Pour admission_price, ne renseigne ce champ que si tu en es certain, sinon mets null.`;
