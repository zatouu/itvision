/* Injection des variantes couleur dans liwo.ts — usage unique, supprimable. */
const fs = require('fs')
const p = 'src/lib/market/supplier-pricelists/liwo.ts'
let s = fs.readFileSync(p, 'utf8')

// 1. etendre Opts + helper
if (!s.includes('vars?:')) {
  s = s.replace(
    '  img?: string\r\n  gallery?: string[]',
    '  img?: string\r\n  gallery?: string[]\r\n  /** Variantes couleur [libelle, image] — meme prix usine, images dediees */\r\n  vars?: Array<[string, string]>'
  )
  if (!s.includes('vars?:')) {
    s = s.replace(
      '  img?: string\n  gallery?: string[]',
      '  img?: string\n  gallery?: string[]\n  /** Variantes couleur [libelle, image] — meme prix usine, images dediees */\n  vars?: Array<[string, string]>'
    )
  }
  s = s.replace(
    "    variants: [['Standard', cny, pcs, o.img]],",
    "    variants: o.vars && o.vars.length ? o.vars.map(([label, img]) => [label, cny, pcs, img] as [string, number, number, string]) : [['Standard', cny, pcs, o.img]],"
  )
}
console.log('helper etendu:', s.includes('vars?:'))

// 2. injection par nom de famille
const v4 = (pre) => `vars: [['Blanc', '${pre}-blanc'], ['Noir', '${pre}-noir'], ['Or', '${pre}-or'], ['Gris', '${pre}-gris']], `
const v2 = (pre) => `vars: [['Blanc', '${pre}-blanc'], ['Noir', '${pre}-noir']], `
const rules = [
  [/Prise connectée Wifi USB\+C/, () => v4('lw-v-u756')],
  [/Prise connectée Wifi/, () => v4('lw-v-u811')],
  [/Prise connectée Zigbee USB\+C/, () => v4('lw-v-zigusbc')],
  [/Prise \+ interrupteur connectés (Wifi|Zigbee) 1 bouton/, () => v2('lw-v-combo1')],
  [/Prise \+ interrupteur connectés (Wifi|Zigbee) 2 boutons/, () => v2('lw-v-combo2')],
  [/Interrupteur connecté Wifi EU 1 bouton \(avec neutre\)/, () => v2('lw-v-eusw1an')],
  [/Interrupteur connecté Wifi EU 1 bouton \(sans neutre\)/, () => v2('lw-v-eusw1sn')],
  [/Interrupteur connecté Wifi EU 2 boutons \(avec neutre\)/, () => v2('lw-v-eusw2an')],
  [/Interrupteur connecté Wifi EU 2 boutons \(sans neutre\)/, () => v2('lw-v-eusw2sn')],
  [/Interrupteur connecté Wifi EU 3 boutons \(avec neutre\)/, () => v2('lw-v-eusw3an')],
  [/Interrupteur connecté Wifi EU 3 boutons \(sans neutre\)/, () => v2('lw-v-eusw3sn')],
]
let patched = 0
const lines = s.split('\n').map((line) => {
  if (!/^\s*L\('liwo-/.test(line) || /vars:/.test(line)) return line
  const name = (line.match(/L\('[^']+', '([^']+)'/) || [])[1] || ''
  for (const [re, fn] of rules) {
    if (re.test(name)) {
      patched++
      return line.replace(/\{ /, '{ ' + fn())
    }
  }
  return line
})
s = lines.join('\n')
fs.writeFileSync(p, s)
console.log('familles avec variantes couleur:', patched)

// 3. verification : toutes les images referencees existent
const used = new Set()
const reV = /vars: \[([^\]]+)\]/g
let m
while ((m = reV.exec(s))) {
  ;(m[1].match(/'lw-[^']+'/g) || []).forEach((x) => used.add(x.replace(/'/g, '')))
}
const missing = [...used].filter((k) => !fs.existsSync('public/images/suppliers/liwo/' + k + '.jpg'))
console.log('images variantes referencees:', used.size, '| manquantes:', missing.length, missing.join(','))
