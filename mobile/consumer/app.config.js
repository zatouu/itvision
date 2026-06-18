// Dynamic Expo config — injecte la clé Google Maps depuis l'environnement
// pour ne pas la committer en clair dans app.json.
// Définir EXPO_PUBLIC_GOOGLE_MAPS_API_KEY dans .env (dev) et en secret EAS (build/CI).
module.exports = ({ config }) => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.warn('[app.config] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY manquant — la carte Google Maps ne fonctionnera pas.')
  }
  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...(config.android && config.android.config),
        googleMaps: { apiKey: apiKey || '' },
      },
    },
  }
}
