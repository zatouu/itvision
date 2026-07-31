/**
 * Supprime les `index: true` inline dans les schémas Mongoose
 * quand un `Schema.index()` couvre déjà le même champ.
 * Usage: node scripts/fix-duplicate-indexes.js
 */
const fs = require('fs')
const path = require('path')

const modelsDir = path.join(__dirname, '..', 'src', 'lib', 'models')
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.ts'))

let totalFixed = 0

for (const file of files) {
  const filePath = path.join(modelsDir, file)
  let content = fs.readFileSync(filePath, 'utf-8')

  // Extraire les champs couverts par Schema.index()
  const schemaIndexMatches = [...content.matchAll(/Schema\.index\(\s*\{([^}]+)\}/g)]
  const schemaIndexedFields = new Set()
  for (const m of schemaIndexMatches) {
    // Parse les clés de l'objet index (ex: "requestId: 1, status: 1" ou "'location': '2dsphere'")
    const keys = m[1].match(/['"]?(\w+)['"]?\s*:/g) || []
    keys.forEach(k => schemaIndexedFields.add(k.replace(/['":\s]/g, '')))
  }

  if (schemaIndexedFields.size === 0) continue

  // Remplacer `index: true` par rien sur les champs déjà couverts
  let modified = false
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    // Détecter un champ avec index: true
    const fieldMatch = lines[i].match(/^\s*(\w+):\s*\{/)
    if (!fieldMatch) continue
    const fieldName = fieldMatch[1]
    if (!schemaIndexedFields.has(fieldName)) continue

    // Vérifier si cette ligne ou le bloc contient index: true
    // Chercher dans un bloc de quelques lignes (le champ peut être multi-lignes)
    let blockEnd = i
    let braceCount = (lines[i].match(/\{/g) || []).length - (lines[i].match(/\}/g) || []).length
    while (braceCount > 0 && blockEnd < lines.length - 1 && blockEnd - i < 10) {
      blockEnd++
      braceCount += (lines[blockEnd].match(/\{/g) || []).length - (lines[blockEnd].match(/\}/g) || []).length
    }

    for (let j = i; j <= blockEnd; j++) {
      if (lines[j].includes('index: true') && !lines[j].includes('unique: true')) {
        // Ne pas supprimer si unique: true est sur la même ligne (on veut garder unique)
        lines[j] = lines[j].replace(/\s*index:\s*true,?\s*/, ' ')
        if (lines[j].trim() === '') lines[j] = ''
        modified = true
      } else if (lines[j].includes('index: true') && lines[j].includes('unique: true')) {
        // Garder unique mais retirer index
        lines[j] = lines[j].replace(/\s*index:\s*true,\s*/, ' ')
        modified = true
      }
    }
  }

  if (modified) {
    // Nettoyer les lignes vides résiduelles et virgules orphelines
    let cleaned = lines.join('\n')
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n') // collapse multiple blank lines
    fs.writeFileSync(filePath, cleaned, 'utf-8')
    totalFixed++
    console.log(`Fixed: ${file}`)
  }
}

console.log(`\nDone. ${totalFixed} file(s) fixed.`)
