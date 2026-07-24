const { createWorker } = require('tesseract.js')
const path = require('path')

const images = [
  'd:/itvision-1/mobile/provider/maquettes/image.png',
  'd:/itvision-1/mobile/provider/maquettes/image copy.png',
  'd:/itvision-1/mobile/provider/maquettes/image copy 2.png',
]

async function run() {
  const worker = await createWorker('fra+eng')
  for (const img of images) {
    try {
      console.log('--- ' + path.basename(img) + ' ---')
      const ret = await worker.recognize(img)
      console.log(ret.data.text || '<aucun texte>')
    } catch (e) {
      console.error('ERR ' + path.basename(img) + ':', e.message)
    }
  }
  await worker.terminate()
}

run().catch(e => { console.error(e); process.exit(1) })
