const { withDangerousMod, withProjectBuildGradle, withAppBuildGradle } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const GOOGLE_SERVICES_CLASSPATH = "classpath 'com.google.gms:google-services:4.4.1'";
const GOOGLE_SERVICES_PLUGIN = "apply plugin: 'com.google.gms.google-services'";

function writeGoogleServicesJson(config) {
  const value = process.env.GOOGLE_SERVICES_JSON;
  if (!value) {
    console.warn('[withGoogleServicesJson] GOOGLE_SERVICES_JSON env var is not set, skipping google-services.json generation');
    return config;
  }

  let content;
  // EAS type=file fournit le chemin absolu d'un fichier temporaire
  if (value.includes('/') || value.includes('\\')) {
    try {
      content = fs.readFileSync(value, 'utf8');
      console.log('[withGoogleServicesJson] Read google-services.json from path provided by EAS env var');
    } catch (err) {
      console.warn('[withGoogleServicesJson] Failed to read file path from GOOGLE_SERVICES_JSON:', err.message);
      return config;
    }
  } else {
    content = value;
  }

  const target = path.join(config.modRequest.projectRoot, 'android', 'app', 'google-services.json');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  console.log('[withGoogleServicesJson] Generated android/app/google-services.json at', target);

  return config;
}

/**
 * Génère android/app/google-services.json à partir de la variable
 * d'environnement EAS GOOGLE_SERVICES_JSON, et applique le plugin Gradle
 * Google Services sans dépendre de android.googleServicesFile.
 * EAS peut fournir la variable soit :
 *   - comme contenu du fichier (type string), soit
 *   - comme chemin vers un fichier temporaire (type file).
 */
module.exports = function withGoogleServicesJson(config) {
  // Écrit le fichier après le prebuild CNG
  config = withDangerousMod(config, [
    'android',
    async (config) => writeGoogleServicesJson(config),
  ]);

  // Ajoute le classpath du plugin Google Services dans android/build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes(GOOGLE_SERVICES_CLASSPATH)) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n        ${GOOGLE_SERVICES_CLASSPATH}`
      );
    }
    return config;
  });

  // Applique le plugin Google Services dans android/app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes(GOOGLE_SERVICES_PLUGIN)) {
      config.modResults.contents = config.modResults.contents.replace(
        /apply plugin: "com\.android\.application"/,
        `apply plugin: "com.android.application"\n${GOOGLE_SERVICES_PLUGIN}`
      );
    }
    return config;
  });

  return config;
};
