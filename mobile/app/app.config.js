// Dynamic Expo config — injecte la clé Google Maps depuis l'environnement
// pour ne pas la committer en clair dans app.json.
// Définir EXPO_PUBLIC_GOOGLE_MAPS_API_KEY dans .env (dev) et en secret EAS (build/CI).
module.exports = ({ config }) => {
  const auditBuild = process.env.XEUY_AUDIT_BUILD === '1'
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  if (auditBuild && !apiKey) {
    throw new Error('[app.config] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY obligatoire pour le build audit.')
  }
  if (!apiKey) {
    console.warn('[app.config] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY manquant — la carte Google Maps ne fonctionnera pas.')
  }
  return {
    ...config,
    ...(auditBuild ? { runtimeVersion: 'audit-2026-10' } : {}),
    extra: {
      ...config.extra,
      eas: {
        ...(config.extra?.eas || {}),
        projectId: (config.extra?.eas?.projectId) || process.env.EXPO_PUBLIC_PROJECT_ID,
      },
    },
    android: {
      ...config.android,
      config: {
        ...(config.android && config.android.config),
        googleMaps: { apiKey: apiKey || '' },
      },
    },
  }
}
