// Étend app.json pour injecter la clé Google Maps depuis l'environnement
// (nécessaire pour le rendu Google Maps sur Android ; iOS utilise Apple Maps).
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY },
    },
  },
});
