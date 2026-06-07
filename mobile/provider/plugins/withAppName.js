const { withStringsXml } = require('@expo/config-plugins')

/**
 * Config plugin pour forcer le nom de l'application affiché sur l'écran d'accueil Android.
 * Override le strings.xml pour éviter les anciens noms (ex. "Itvision Provider", "Ligey").
 *
 * Usage dans app.json :
 *   ["./plugins/withAppName", { "appName": "Xeuy Bi Pro" }]
 */
module.exports = function withAppName(config, { appName } = {}) {
  const finalName = appName || config.name || 'Xeuy'

  return withStringsXml(config, (config) => {
    const strings = config.modResults.resources.string || []
    const existing = strings.find((s) => s.$?.name === 'app_name')
    if (existing) {
      existing._ = finalName
    } else {
      strings.push({ $: { name: 'app_name' }, _: finalName })
    }
    config.modResults.resources.string = strings
    return config
  })
}
