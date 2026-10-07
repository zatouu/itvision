import { CORPORATE_BRAND } from '@/lib/branding'
import { projectStage } from '@/lib/portal/project-view'

export interface MonthlyReportData {
  companyName: string
  projects: Array<{ name: string; progress?: number; status?: string; quote?: { status?: string } | null; reception?: { requestedAt?: unknown; signedAt?: unknown } | null }>
  interventionsDoneMonth: number
  interventionsUpcoming: number
  reportsMonth: number
  ticketsOpen: number
  amountDue: number
  overdue: number
  expiring: Array<{ name: string; endDate: Date }>
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const num = (n: number) => Math.round(Number(n) || 0).toLocaleString('fr-FR')

/** Rapport mensuel envoyé aux administrateurs de l'espace : avancement des projets d'abord, puis le reste. */
export function buildMonthlyReport(d: MonthlyReportData) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || CORPORATE_BRAND.url
  const month = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const portal = `${base}/portail-entreprise`

  const projectRows = d.projects.map(p => {
    const stage = projectStage(p)
    const pct = Math.max(0, Math.min(100, Number(p.progress) || 0))
    const pending = p.reception?.requestedAt && !p.reception?.signedAt
    return `<tr><td style="padding:10px 0;border-bottom:1px solid #eee">
      <div style="font-weight:600;color:#1c1917">${esc(p.name)}</div>
      <div style="font-size:12px;color:#78716c;margin:2px 0 6px">${esc(stage.paused ? `${stage.label} (en pause)` : stage.label)}${pending ? ' · <strong style="color:#047857">PV de réception à signer</strong>' : ''}</div>
      <div style="background:#f5f5f4;border-radius:6px;height:8px;overflow:hidden"><div style="background:#059669;height:8px;width:${pct}%"></div></div>
    </td><td style="padding:10px 0 10px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:#1c1917;white-space:nowrap">${pct} %</td></tr>`
  }).join('')

  const kpis = [
    ['Interventions réalisées (30 j)', num(d.interventionsDoneMonth)],
    ['Interventions à venir', num(d.interventionsUpcoming)],
    ['Rapports publiés (30 j)', num(d.reportsMonth)],
    ['Tickets ouverts', num(d.ticketsOpen)],
  ].map(([l, v]) => `<td style="padding:10px;background:#fafaf9;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#1c1917">${v}</div><div style="font-size:11px;color:#78716c">${l}</div></td>`).join('<td style="width:8px"></td>')

  const actions: string[] = []
  if (d.amountDue > 0) actions.push(`${num(d.amountDue)} FCFA de factures à régler${d.overdue ? `, dont ${d.overdue} en retard` : ''}`)
  for (const c of d.expiring) actions.push(`Le contrat « ${esc(c.name)} » arrive à échéance le ${new Date(c.endDate).toLocaleDateString('fr-FR')}`)

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#44403c">
    <div style="padding:24px 0 8px"><div style="font-size:12px;color:#78716c;text-transform:uppercase;letter-spacing:1px">${esc(CORPORATE_BRAND.name)} · Rapport de ${esc(month)}</div>
    <h1 style="font-size:22px;color:#1c1917;margin:6px 0 0">${esc(d.companyName)}</h1></div>
    ${d.projects.length ? `<h2 style="font-size:15px;color:#1c1917;margin:20px 0 4px">Vos projets en cours</h2><table style="width:100%;border-collapse:collapse">${projectRows}</table>` : ''}
    <table style="width:100%;border-collapse:separate;margin:20px 0"><tr>${kpis}</tr></table>
    ${actions.length ? `<h2 style="font-size:15px;color:#1c1917;margin:20px 0 6px">À votre attention</h2><ul style="padding-left:18px;margin:0">${actions.map(a => `<li style="margin:4px 0">${a}</li>`).join('')}</ul>` : ''}
    <p style="margin:28px 0"><a href="${portal}" style="background:#047857;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">Ouvrir mon espace client</a></p>
    <p style="font-size:11px;color:#a8a29e;border-top:1px solid #eee;padding-top:12px">Vous recevez ce rapport en tant qu'administrateur de l'espace ${esc(d.companyName)}. Les envois par email se désactivent dans Paramètres &gt; Préférences.</p>
  </div>`

  return { subject: `${d.companyName} : votre rapport ${month}`, html }
}
