const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withGoogleServicesJson(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const base64 = process.env.GOOGLE_SERVICES_JSON_BASE64;
      if (!base64) {
        console.warn('GOOGLE_SERVICES_JSON_BASE64 is not set; google-services.json will not be generated (push notifications disabled)');
        return config;
      }
      const androidPath = path.join(config.modRequest.projectRoot, 'android', 'app');
      if (!fs.existsSync(androidPath)) {
        fs.mkdirSync(androidPath, { recursive: true });
      }
      const outPath = path.join(androidPath, 'google-services.json');
      fs.writeFileSync(outPath, Buffer.from(base64, 'base64').toString('utf8'));
      console.log('Generated google-services.json at', outPath);
      return config;
    },
  ]);
}

module.exports = withGoogleServicesJson;
