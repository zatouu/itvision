const { withDangerousMod } = require('@expo/config-plugins');
const { withClassPath, withApplyPlugin } = require('@expo/config-plugins/build/android/GoogleServices');
const fs = require('fs');
const path = require('path');

function withGoogleServicesJson(config) {
  const base64 = process.env.GOOGLE_SERVICES_JSON_BASE64;
  if (!base64) {
    console.warn('GOOGLE_SERVICES_JSON_BASE64 is not set; google-services.json will not be generated (push notifications disabled)');
    return config;
  }

  const projectRoot = config._internal?.projectRoot || process.cwd();
  const relPath = 'google-services.json';
  const outPath = path.join(projectRoot, relPath);
  fs.writeFileSync(outPath, Buffer.from(base64, 'base64').toString('utf8'));
  console.log('Generated google-services.json at', outPath);

  if (!config.android) config.android = {};
  config.android.googleServicesFile = relPath;

  config = withClassPath(config);
  config = withApplyPlugin(config);
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const source = path.join(config.modRequest.projectRoot, config.android.googleServicesFile);
      const target = path.join(config.modRequest.projectRoot, 'android', 'app', 'google-services.json');
      await fs.promises.mkdir(path.dirname(target), { recursive: true });
      await fs.promises.copyFile(source, target);
      console.log('Copied google-services.json to android project');
      return config;
    },
  ]);
  return config;
}

module.exports = withGoogleServicesJson;
