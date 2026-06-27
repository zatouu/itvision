/**
 * Boîte à outils du recetteur QA marketplace.
 *
 * Fournit un moteur d'audit branché sur une page Playwright qui collecte
 * automatiquement les erreurs console, les erreurs JS, les requêtes réseau
 * en échec, les images/liens cassés et les coquilles/textes suspects, puis
 * génère un rapport structuré (JSON + Markdown).
 */
import { Page, Response } from '@playwright/test'
import fs from 'fs'
import path from 'path'

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type IssueCategory =
  | 'console'
  | 'js-error'
  | 'network'
  | 'http'
  | 'broken-image'
  | 'broken-link'
  | 'accessibility'
  | 'content'
  | 'typo'
  | 'ux'
  | 'seo'
  | 'flow'

export interface Issue {
  severity: Severity
  category: IssueCategory
  route: string
  message: string
  detail?: string
}

/** Coquilles / anglicismes fréquents (FR). Clé = forme fautive, valeur = correction. */
const COMMON_TYPOS: Record<string, string> = {
  'addresse': 'adresse',
  'adventure': 'aventure',
  'aggréger': 'agréger',
  'apparait': 'apparaît',
  'connection': 'connexion',
  'développeur web ': 'développeur web', // garde-fou neutre
  'enregistrment': 'enregistrement',
  'entrprise': 'entreprise',
  'envoie un message': 'envoie un message',
  'language': 'langue',
  'libellé': 'libellé',
  'livraision': 'livraison',
  'paiment': 'paiement',
  'parametres': 'paramètres',
  'produitt': 'produit',
  'quantitée': 'quantité',
  'recherher': 'rechercher',
  'sourcign': 'sourcing',
  'succés': 'succès',
  'telephone': 'téléphone',
  'valder': 'valider',
}

/** Marqueurs de texte cassé / placeholder qui ne devraient jamais être visibles. */
const BROKEN_TEXT_MARKERS = [
  'undefined',
  'NaN',
  '[object Object]',
  'null,null',
  'Lorem ipsum',
  'lorem ipsum',
  'TODO',
  'FIXME',
  'Cannot read',
  'is not defined',
  'NaN FCFA',
  'undefined FCFA',
  'NaN%',
  '{{',
  '}}',
  '$%7B', // ${ encodé
]

export class QaCollector {
  readonly issues: Issue[] = []
  visitedRoutes = 0

  add(issue: Issue) {
    this.issues.push(issue)
  }

  bySeverity(sev: Severity) {
    return this.issues.filter((i) => i.severity === sev)
  }

  /**
   * Branche les écouteurs passifs (console, erreurs JS, réseau) sur la page.
   * Retourne une fonction de réglage du contexte (route courante).
   */
  attach(page: Page) {
    const ctx = { route: 'unknown' }

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return
      const text = msg.text()
      // Filtre le bruit connu (favicon, extensions, hydration warnings tierces)
      if (/favicon|chrome-extension|ResizeObserver|hydrat/i.test(text)) return
      this.add({
        severity: 'high',
        category: 'console',
        route: ctx.route,
        message: 'Erreur console',
        detail: text.slice(0, 400),
      })
    })

    page.on('pageerror', (err) => {
      this.add({
        severity: 'critical',
        category: 'js-error',
        route: ctx.route,
        message: 'Exception JavaScript non gérée',
        detail: String(err?.message || err).slice(0, 400),
      })
    })

    page.on('requestfailed', (req) => {
      const url = req.url()
      if (/favicon|chrome-extension|analytics|gtag|hotjar/i.test(url)) return
      this.add({
        severity: 'high',
        category: 'network',
        route: ctx.route,
        message: 'Requête réseau échouée',
        detail: `${req.method()} ${url} — ${req.failure()?.errorText || 'inconnu'}`,
      })
    })

    page.on('response', (res: Response) => {
      const status = res.status()
      if (status < 400) return
      const url = res.url()
      if (/favicon|chrome-extension|analytics|gtag|hotjar/i.test(url)) return
      // 401/403 sur API protégée en anonyme = attendu, on classe en info
      const isAuthExpected = status === 401 || status === 403
      this.add({
        severity: isAuthExpected ? 'info' : status >= 500 ? 'critical' : 'high',
        category: 'http',
        route: ctx.route,
        message: `Réponse HTTP ${status}`,
        detail: `${res.request().method()} ${url}`,
      })
    })

    return ctx
  }
}

/**
 * Audit du DOM après chargement : titre, h1, images cassées, liens morts,
 * accessibilité de base, textes cassés et coquilles.
 */
export async function auditPage(page: Page, route: string, collector: QaCollector) {
  collector.visitedRoutes += 1

  // Titre de page
  const title = (await page.title()).trim()
  if (!title || title.length < 3) {
    collector.add({
      severity: 'medium',
      category: 'seo',
      route,
      message: 'Titre de page vide ou trop court',
      detail: `<title>="${title}"`,
    })
  }

  // Présence d'un h1
  const h1Count = await page.locator('h1').count()
  if (h1Count === 0) {
    collector.add({
      severity: 'low',
      category: 'seo',
      route,
      message: 'Aucun <h1> sur la page',
    })
  } else if (h1Count > 1) {
    collector.add({
      severity: 'low',
      category: 'seo',
      route,
      message: `Plusieurs <h1> (${h1Count}) sur la page`,
    })
  }

  // Images cassées + alt manquant
  const imgAudit = await page.evaluate(() => {
    const broken: string[] = []
    const noAlt: string[] = []
    document.querySelectorAll('img').forEach((img) => {
      const src = img.currentSrc || img.src || ''
      if (img.complete && img.naturalWidth === 0 && src && !src.startsWith('data:')) {
        broken.push(src)
      }
      if (!img.alt || !img.alt.trim()) {
        if (src && !src.startsWith('data:')) noAlt.push(src)
      }
    })
    return { broken, noAlt }
  })
  for (const src of imgAudit.broken.slice(0, 10)) {
    collector.add({
      severity: 'high',
      category: 'broken-image',
      route,
      message: 'Image cassée (naturalWidth=0)',
      detail: src,
    })
  }
  if (imgAudit.noAlt.length > 0) {
    collector.add({
      severity: 'low',
      category: 'accessibility',
      route,
      message: `${imgAudit.noAlt.length} image(s) sans attribut alt`,
      detail: imgAudit.noAlt.slice(0, 5).join(' | '),
    })
  }

  // Liens morts (href vide ou #)
  const deadLinks = await page.evaluate(() => {
    const dead: string[] = []
    document.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href')
      const text = (a.textContent || '').trim().slice(0, 40)
      if (href === null || href === '' || href === '#') {
        // ignore si c'est un bouton stylé avec onClick (role/button)
        if (a.getAttribute('role') === 'button') return
        dead.push(text || '(lien sans texte)')
      }
    })
    return dead
  })
  if (deadLinks.length > 0) {
    collector.add({
      severity: 'medium',
      category: 'broken-link',
      route,
      message: `${deadLinks.length} lien(s) sans destination (href vide ou #)`,
      detail: deadLinks.slice(0, 8).join(' | '),
    })
  }

  // Boutons sans nom accessible
  const namelessButtons = await page.evaluate(() => {
    let count = 0
    document.querySelectorAll('button').forEach((b) => {
      const label =
        (b.textContent || '').trim() ||
        b.getAttribute('aria-label') ||
        b.getAttribute('title') ||
        b.querySelector('img')?.getAttribute('alt') ||
        ''
      if (!label) count += 1
    })
    return count
  })
  if (namelessButtons > 0) {
    collector.add({
      severity: 'low',
      category: 'accessibility',
      route,
      message: `${namelessButtons} bouton(s) sans nom accessible`,
    })
  }

  // Textes cassés / placeholders visibles
  const bodyText = await page.evaluate(() => document.body?.innerText || '')
  for (const marker of BROKEN_TEXT_MARKERS) {
    if (bodyText.includes(marker)) {
      collector.add({
        severity: marker === 'undefined' || marker === 'NaN' || marker === '[object Object]' ? 'high' : 'medium',
        category: 'content',
        route,
        message: `Texte cassé / placeholder visible : "${marker}"`,
        detail: extractContext(bodyText, marker),
      })
    }
  }

  // Coquilles connues
  const lowerText = bodyText.toLowerCase()
  for (const [wrong, right] of Object.entries(COMMON_TYPOS)) {
    const needle = wrong.toLowerCase()
    if (lowerText.includes(needle)) {
      collector.add({
        severity: 'low',
        category: 'typo',
        route,
        message: `Coquille possible : "${wrong}" → "${right}"`,
        detail: extractContext(bodyText, wrong),
      })
    }
  }
}

function extractContext(text: string, marker: string): string {
  const idx = text.toLowerCase().indexOf(marker.toLowerCase())
  if (idx < 0) return ''
  const start = Math.max(0, idx - 40)
  const end = Math.min(text.length, idx + marker.length + 40)
  return '…' + text.slice(start, end).replace(/\s+/g, ' ').trim() + '…'
}

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']
const SEVERITY_EMOJI: Record<Severity, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🔵',
  info: '⚪',
}

export function writeReport(collector: QaCollector, baseURL: string) {
  const dir = path.join(process.cwd(), 'tests', 'marketplace-qa', 'reports')
  fs.mkdirSync(dir, { recursive: true })

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const summary = SEVERITY_ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: collector.bySeverity(s).length }),
    {} as Record<Severity, number>
  )

  // JSON
  const jsonPath = path.join(dir, `qa-report-${stamp}.json`)
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseURL,
        routesVisited: collector.visitedRoutes,
        totalIssues: collector.issues.length,
        summary,
        issues: collector.issues,
      },
      null,
      2
    )
  )

  // Markdown
  const mdPath = path.join(dir, `qa-report-${stamp}.md`)
  const lines: string[] = []
  lines.push(`# Rapport de recette — Marketplace`)
  lines.push('')
  lines.push(`- **Date** : ${new Date().toLocaleString('fr-FR')}`)
  lines.push(`- **Cible** : ${baseURL}`)
  lines.push(`- **Routes auditées** : ${collector.visitedRoutes}`)
  lines.push(`- **Anomalies détectées** : ${collector.issues.length}`)
  lines.push('')
  lines.push(`## Synthèse par sévérité`)
  lines.push('')
  lines.push(`| Sévérité | Nombre |`)
  lines.push(`| --- | --- |`)
  for (const s of SEVERITY_ORDER) {
    lines.push(`| ${SEVERITY_EMOJI[s]} ${s} | ${summary[s]} |`)
  }
  lines.push('')

  for (const s of SEVERITY_ORDER) {
    const group = collector.bySeverity(s)
    if (group.length === 0) continue
    lines.push(`## ${SEVERITY_EMOJI[s]} ${s.toUpperCase()} (${group.length})`)
    lines.push('')
    for (const issue of group) {
      lines.push(`- **[${issue.category}]** \`${issue.route}\` — ${issue.message}`)
      if (issue.detail) lines.push(`  - ${issue.detail.replace(/\n/g, ' ')}`)
    }
    lines.push('')
  }

  fs.writeFileSync(mdPath, lines.join('\n'))

  // Console summary
  console.log('\n──────────── RAPPORT RECETTE MARKETPLACE ────────────')
  console.log(`Cible            : ${baseURL}`)
  console.log(`Routes auditées  : ${collector.visitedRoutes}`)
  console.log(`Anomalies        : ${collector.issues.length}`)
  for (const s of SEVERITY_ORDER) {
    console.log(`  ${SEVERITY_EMOJI[s]} ${s.padEnd(9)}: ${summary[s]}`)
  }
  console.log(`Rapport JSON     : ${jsonPath}`)
  console.log(`Rapport Markdown : ${mdPath}`)
  console.log('─────────────────────────────────────────────────────\n')

  return { jsonPath, mdPath, summary }
}
