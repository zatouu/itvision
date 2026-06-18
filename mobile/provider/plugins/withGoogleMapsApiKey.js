const { withAndroidManifest } = require('@expo/config-plugins')

/**
 * Config plugin qui injecte la clé API Google Maps dans AndroidManifest.xml.
 * Usage dans app.json :
 *   ["./plugins/withGoogleMapsApiKey", { "apiKey": "TA_CLE" }]
 */
module.exports = function withGoogleMapsApiKey(config, { apiKey } = {}) {
  const key = apiKey || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) {
    console.warn('[withGoogleMapsApiKey] Aucune apiKey fournie (param ou EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) — la carte Google Maps ne fonctionnera pas.')
    return config
  }

  return withAndroidManifest(config, async (config) => {
    const mainApplication = config.modResults.manifest.application?.[0]
    if (!mainApplication) {
      throw new Error('[withGoogleMapsApiKey] Impossible de trouver <application> dans AndroidManifest.xml')
    }

    if (!mainApplication['meta-data']) {
      mainApplication['meta-data'] = []
    }

    const existing = mainApplication['meta-data'].find(
      (m) => m.$?.['android:name'] === 'com.google.android.geo.API_KEY'
    )

    if (existing) {
      existing.$['android:value'] = key
    } else {
      mainApplication['meta-data'].push({
        $: {
          'android:name': 'com.google.android.geo.API_KEY',
          'android:value': key,
        },
      })
    }

    return config
  })
}
