/**
 * Validateur de cohérence du registre des domaines (src/lib/domains.ts)
 * Usage : npx tsx scripts/validate-domains.ts
 *
 * Vérifie que le registre reste synchronisé avec le code :
 * - toute page et toute API de premier niveau est déclarée
 * - tout modèle de src/lib/models est classé par domaine
 * - pas de préfixe dupliqué ni d'entrée 'review' oubliée dans le reporting
 * À lancer en CI ou avant chaque étape du plan de sortie du monolithe.
 */
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import {
  PAGE_RULES,
  API_RULES,
  MODEL_DOMAINS,
  getDomainForPath,
  type RouteRule,
} from '../src/lib/domains'

const ROOT = join(__dirname, '..')
const APP_DIR = join(ROOT, 'src', 'app')
const API_DIR = join(APP_DIR, 'api')
const MODELS_DIR = join(ROOT, 'src', 'lib', 'models')

let failures = 0
const fail = (msg: string) => { failures++; console.error(`  ✗ ${msg}`) }
const ok = (msg: string) => console.log(`  ✓ ${msg}`)

function topDirs(dir: string): string[] {
  return readdirSync(dir)
    .filter(name => {
      try { return statSync(join(dir, name)).isDirectory() } catch { return false }
    })
}

/** Dossiers de pages = top-level + enfants des route groups (xxx). */
function pageRouteDirs(dir: string): string[] {
  const out: string[] = []
  for (const name of topDirs(dir)) {
    if (name === 'api') continue
    if (name.startsWith('(') && name.endsWith(')')) {
      for (const child of topDirs(join(dir, name))) out.push(child)
    } else {
      out.push(name)
    }
  }
  return out
}

function covered(pathname: string, rules: RouteRule[]): RouteRule | null {
  return rules.find(r => pathname === r.prefix || pathname.startsWith(r.prefix + '/')) ?? null
}

console.log('— Pages —')
const pageDirs = pageRouteDirs(APP_DIR)
for (const dir of pageDirs) {
  const pathname = '/' + dir
  const rule = covered(pathname, PAGE_RULES)
  if (!rule) fail(`page non déclarée : ${pathname}`)
  else if (rule.review) console.log(`  ? ${pathname} → ${rule.domain} (review)`)
}
ok(`${pageDirs.length} pages vérifiées`)

console.log('— API —')
const apiDirs = topDirs(API_DIR)
for (const dir of apiDirs) {
  const pathname = '/api/' + dir
  const rule = covered(pathname, API_RULES)
  if (!rule) fail(`API non déclarée : ${pathname}`)
  else if (rule.review) console.log(`  ? ${pathname} → ${rule.domain} (review)`)
}
ok(`${apiDirs.length} groupes d'API vérifiés`)

console.log('— Modèles —')
const modelFiles = readdirSync(MODELS_DIR).filter(f => f.endsWith('.ts'))
for (const file of modelFiles) {
  const name = file.replace(/\.ts$/, '')
  if (!(name in MODEL_DOMAINS)) fail(`modèle non classé : ${name}`)
  else if (MODEL_DOMAINS[name] === 'deprecated') console.log(`  ⚠ ${name} → deprecated`)
}
ok(`${modelFiles.length} modèles vérifiés`)

console.log('— Registre —')
for (const [label, rules] of [['PAGE_RULES', PAGE_RULES], ['API_RULES', API_RULES]] as const) {
  const seen = new Set<string>()
  for (const r of rules) {
    if (seen.has(r.prefix)) fail(`${label} : préfixe dupliqué ${r.prefix}`)
    seen.add(r.prefix)
  }
}
const deprecated = [...PAGE_RULES, ...API_RULES].filter(r => r.domain === 'deprecated')
ok(`${deprecated.length} routes marquées deprecated : ${deprecated.map(r => r.prefix).join(', ')}`)

const review = [...PAGE_RULES, ...API_RULES].filter(r => r.review)
if (review.length) console.log(`  ? ${review.length} routes à revoir : ${review.map(r => r.prefix).join(', ')}`)

// ─── Garde-fou : routes API déclarées non publiques sans garde d'auth ─────────
// Le middleware n'applique pas `access` aux API (autorisation par handler).
// Ce rapport liste les handlers qui ne référencent AUCUN helper d'auth : c'est
// là que le registre documente une protection que le code n'applique pas.
console.log('— API : garde d’auth vs registre —')
const AUTH_HELPERS = [
  'verifyAuthServer', 'requireRole', 'requireAdminApi', 'requireAuth',
  'resolveGuestOrAuthUser', 'verifyAuthToken', 'extractAuthToken',
  'internalPost', 'x-cron-secret', 'verifyCronSecret', 'requireManagerRole',
  'requireDomainAccess', 'companyScope', 'verifyJwtPayload', 'getServerSession',
  'withAuth', 'authenticateRequest', 'getAuthUser', 'getAuthenticatedUser',
  'getCurrentUser', 'verifyToken', 'requireProvider', 'requireStaff',
  'jwtVerify', 'requireValidSession', 'getToken', 'verifySession',
]
// Fichiers « alias » (export { X } from '...') : la garde vit dans la cible.
const ALIAS_ONLY = /^\s*(export\s*\{[^}]*\}\s*from\s*['"][^'"]+['"];?\s*)+$/
function apiPathOf(file: string): string | null {
  const rel = file.replace(/\\/g, '/').split('/api/')[1]
  if (!rel) return null
  const segments = rel.split('/').filter(s => s && s !== 'route.ts' && s !== 'route.tsx')
  return '/api/' + segments.join('/')
}

function routeFilesUnder(prefix: string): string[] {  const base = join(API_DIR, ...prefix.replace(/^\/api\//, '').split('/'))
  const out: string[] = []
  const walk = (dir: string) => {
    let entries: string[] = []
    try { entries = readdirSync(dir) } catch { return }
    for (const name of entries) {
      const full = join(dir, name)
      try {
        if (statSync(full).isDirectory()) walk(full)
        else if (name === 'route.ts' || name === 'route.tsx') out.push(full)
      } catch { /* ignore */ }
    }
  }
  walk(base)
  return out
}
let ungarded = 0
for (const rule of API_RULES) {
  if (rule.access === 'public' || rule.domain === 'deprecated') continue
  for (const file of routeFilesUnder(rule.prefix)) {
    const src = readFileSync(file, 'utf-8')
    if (ALIAS_ONLY.test(src)) continue
    // Une règle plus spécifique (ex. webhook public) peut couvrir ce fichier :
    // on applique la même résolution « préfixe le plus précis » que le registre.
    const routePath = apiPathOf(file)
    if (routePath && API_RULES.find(r => routePath === r.prefix || routePath.startsWith(r.prefix + '/'))?.access === 'public') continue
    if (!AUTH_HELPERS.some(h => src.includes(h)) && !/\brequire[A-Z][A-Za-z]*\s*\(/.test(src)) {
      ungarded++
      console.log(`  ? ${file.replace(ROOT + '\\', '').replace(ROOT + '/', '')} — déclaré non public, aucune garde détectée`)
    }
  }
}
if (ungarded === 0) ok('toutes les routes API non publiques référencent un helper d’auth')
else console.log(`  ? ${ungarded} route(s) à vérifier (rapport indicatif — non bloquant)`)

// Sanity checks sur des cas connus
const sanity: [string, string][] = [
  ['/portail-entreprise/finances', 'corporate'],
  ['/market', 'market'],
  ['/api/services/requests', 'xeuy'],
  ['/api/client-enterprise/tickets', 'corporate'],
  ['/api/auth/login', 'shared'],
  ['/compte', 'market'],
]
for (const [path, expected] of sanity) {
  const actual = getDomainForPath(path)
  if (actual !== expected) fail(`getDomainForPath('${path}') = ${actual} (attendu ${expected})`)
}
ok('sanity checks passés')

if (failures > 0) {
  console.error(`\n${failures} problème(s) détecté(s).`)
  process.exit(1)
}
console.log('\nRegistre des domaines cohérent ✔')
