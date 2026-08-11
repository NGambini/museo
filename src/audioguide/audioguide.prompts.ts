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
      "lines": ["Première ligne à lire à voix haute", "Regroupe les phrases courtes qui s'enchaînent naturellement, sépare les phrases longues sur plusieurs lignes"],
      "image_search_query": "nom du lieu + 1 ou 2 mots-clés du chapitre, 3 à 4 mots maximum"
    }
  ]
}

Génère entre 3 et 10 chapitres, en adaptant le nombre à la richesse du lieu : 3 à 4 chapitres pour un petit musée ou un site à thème unique, 5 à 7 pour un musée de taille moyenne, 8 à 10 pour un grand musée aux collections vastes et variées. Pour admission_price, ne renseigne ce champ que si tu en es certain, sinon mets null.
Pour chapters[].image_search_query : compose une requête très courte de 3 à 4 mots maximum — le nom du lieu suivi d'un ou deux mots-clés propres au chapitre (ex. "Musée d'Orsay horloge", "Musée d'Orsay Van Gogh"), rédigée dans la langue du lieu et non en anglais. La recherche Wikimedia Commons exige que tous les mots correspondent : au-delà de 4 mots elle ne renvoie plus aucune photo. Chaque chapitre doit avoir une requête différente des autres.
Pour chapters[].lines : chaque chapitre doit durer entre 2 et 5 minutes une fois lu à voix haute, soit environ 280 à 700 mots par chapitre — vise le haut de la fourchette pour les chapitres les plus riches, et ne descends jamais sous 280 mots. Le texte doit être adapté aux enfants de 6-12 ans, fun et éducatif. Découpe-le en plusieurs lignes pensées pour un affichage synchronisé type karaoké — chaque élément du tableau est une ligne. Regroupe entre elles les phrases courtes qui s'enchaînent, et sépare une phrase longue en plusieurs lignes si nécessaire.`;
