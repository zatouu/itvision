/**
 * Vérificateur de frontières inter-domaines (cf. AUDIT_GLOBAL_SORTIE_MONOLITHE.md)
 * Usage : npx tsx scripts/check-domain-boundaries.ts
 *
 * Règle : un fichier de route ne peut importer que les modèles de SON domaine
 * (+ les modèles 'shared'). Les routes 'admin'/'shared' peuvent tout importer
 * (transversal assumé). Les imports de modèles 'deprecated' sont signalés.
 *
 * Mode actuel : REPORT (exit 0) — les violations héritées existent.
 * Passer --strict pour faire échouer la CI une fois les violations résorbées.
 */
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'
import { MODEL_DOMAINS, getDomainForPath, type Domain } from '../src/lib/domains'

const APP_DIR = join(__dirname, '..', 'src', 'app')
const STRICT = process.argv.includes('--strict')

type Violation = { file: string; model: string; routeDomain: Domain | null; modelDomain: Domain }
const violations: Violation[] = []
const deprecatedUse: Violation[] = []
let scanned = 0

function routeDomain(relPath: string): Domain | null {
  const norm = relPath.replace(/\\/g, '/')
  const groupMatch = norm.match(/\((corporate|market|shared|admin)\)/)
  if (groupMatch) return groupMatch[1] as Domain
  const apiMatch = norm.match(/api\/([^/]+)/)
  if (apiMatch) return getDomainForPath('/api/' + apiMatch[1] + '/x')
  return 'shared' // fichiers racine app/ (layout, page d'accueil...)
}

function scan(dir: string) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    let st
    try { st = statSync(full) } catch { continue }
    if (st.isDirectory()) { scan(full); continue }
    if (!/\.(ts|tsx)$/.test(name)) continue
    scanned++
    const rel = relative(APP_DIR, full)
    const rd = routeDomain(rel)
    if (rd === 'admin' || rd === 'shared') continue // transversal assumé
    const content = readFileSync(full, 'utf8')
    const re = /models\/([A-Za-z_.]+)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(content))) {
      const model = m[1]
      const md = MODEL_DOMAINS[model]
      if (!md) continue
      if (md === 'deprecated') {
        deprecatedUse.push({ file: rel, model, routeDomain: rd, modelDomain: md })
      } else if (md !== 'shared' && md !== rd) {
        violations.push({ file: rel, model, routeDomain: rd, modelDomain: md })
      }
    }
  }
}

scan(APP_DIR)

console.log(`— ${scanned} fichiers de routes analysés —\n`)

if (violations.length) {
  console.log(`✗ ${violations.length} import(s) cross-domaine :`)
  for (const v of violations) {
    console.log(`  ${v.file}  [${v.routeDomain}] importe ${v.model} [${v.modelDomain}]`)
  }
} else {
  console.log('✓ Aucun import de modèle cross-domaine hors admin/shared')
}

if (deprecatedUse.length) {
  console.log(`\n⚠ ${deprecatedUse.length} import(s) de modèles deprecated :`)
  for (const v of deprecatedUse) {
    console.log(`  ${v.file}  importe ${v.model}`)
  }
}

if (STRICT && (violations.length || deprecatedUse.length)) process.exit(1)
