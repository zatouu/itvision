const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const pngToIco = require('png-to-ico')

const SRC = path.join(__dirname, '..', 'public', 'images', 'logo-it-vision.png')
const OUT = path.join(__dirname, '..', 'public')

async function run() {
  if (!fs.existsSync(SRC)) {
    console.error(`[icons] Source introuvable: ${SRC}`)
    process.exit(1)
  }
  const png32 = path.join(OUT, 'favicon-32x32.png')
  const png16 = path.join(OUT, 'favicon-16x16.png')
  const apple = path.join(OUT, 'apple-touch-icon.png')
  const android192 = path.join(OUT, 'android-chrome-192x192.png')
  const android512 = path.join(OUT, 'android-chrome-512x512.png')
  const icoPath = path.join(OUT, 'favicon.ico')

  await sharp(SRC).resize(32, 32).png().toFile(png32)
  await sharp(SRC).resize(16, 16).png().toFile(png16)
  await sharp(SRC).resize(180, 180).png().toFile(apple)
  await sharp(SRC).resize(192, 192).png().toFile(android192)
  await sharp(SRC).resize(512, 512).png().toFile(android512)

  const icoBuffer = await pngToIco([png16, png32])
  fs.writeFileSync(icoPath, icoBuffer)

  console.log('[icons] Génération terminée: favicon et icônes Apple/Android')
}

run().catch((e) => { console.error(e); process.exit(1) })
