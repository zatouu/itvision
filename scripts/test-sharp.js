const sharp = require('sharp');

async function test() {
  console.log('Sharp version:', sharp.versions.vips);
  
  // Créer une image test 100x100 rouge
  const buf = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 255, g: 0, b: 0 }
    }
  }).png().toBuffer();
  
  // Resize à 9x9 grayscale
  const gray = await sharp(buf).resize(9, 9).greyscale().raw().toBuffer();
  console.log('Gray buffer length:', gray.length); // devrait être 81
  
  // Histogramme 16x16
  const rgb = await sharp(buf).resize(16, 16).removeAlpha().raw().toBuffer();
  console.log('RGB buffer length:', rgb.length); // devrait être 256 * 3 = 768
  
  console.log('Sharp OK - recherche par image fonctionnera sur EC2');
}

test().catch(err => {
  console.error('Sharp error:', err.message);
  process.exit(1);
});
