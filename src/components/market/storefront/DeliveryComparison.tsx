'use client';

import { useEffect, useState } from 'react';
import { Plane, Ship, Zap, Store, Package } from 'lucide-react';

type Rate = { id: string; label: string; durationDays: number; billing?: string; rate?: number };

const DEFAULT_RATES: Rate[] = [
  { id: 'local_24h', label: 'Livraison locale 24h', durationDays: 1, billing: 'flat', rate: 1500 },
  { id: 'air_express', label: 'Express 3-5 jrs', durationDays: 4, billing: 'per_kg', rate: 12000 },
  { id: 'air_15', label: 'Aérien 10-15 jrs', durationDays: 13, billing: 'per_kg', rate: 8500 },
  { id: 'sea_freight', label: 'Maritime 45-50 jrs', durationDays: 48, billing: 'per_cubic_meter', rate: 180000 },
];

const fcfa = (n: number) => `${String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F`;
const EXAMPLE_KG = 10;

/** Tarif lisible + coût pour 10 kg (maritime : 1 t = 1 m³, donc 10 kg = 0,01 m³) */
function tariff(r: Rate): { unit: string; example?: string } | null {
  if (!r.rate) return null;
  if (r.billing === 'per_kg') return { unit: `${fcfa(r.rate)}/kg`, example: fcfa(r.rate * EXAMPLE_KG) };
  if (r.billing === 'per_cubic_meter') return { unit: `${fcfa(r.rate)}/m³`, example: fcfa((r.rate * EXAMPLE_KG) / 1000) };
  return { unit: 'forfait boutique' };
}

/** Méthode d'un achat groupé → identifiant de tarif transport */
export const GROUP_METHOD_TO_RATE: Record<string, string> = {
  express_3j: 'air_express',
  air_15j: 'air_15',
  maritime_60j: 'sea_freight',
};

const ICONS: Record<string, typeof Plane> = { local_24h: Store, air_express: Zap, air_15: Plane, sea_freight: Ship };
const NAMES: Record<string, string> = {
  local_24h: 'En stock à Dakar (boutiques DDM+)',
  air_express: 'Express avion',
  air_15: 'Avion standard',
  sea_freight: 'Bateau groupé (le moins cher)',
};

let cache: Rate[] | null = null;

function days(label: string, fallback: number): string {
  const m = label.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (m) return `${m[1]} à ${m[2]} j`;
  if (/24\s*h/i.test(label)) return '24 h';
  return `${fallback} j`;
}

/**
 * Délais DDM+ comparés à une commande en ligne classique depuis la Chine (3 semaines ou plus).
 * `highlight` = identifiant de tarif à mettre en avant (mode du groupe ou du panier).
 */
export default function DeliveryComparison({ highlight, highlightLabel = 'ce groupe', showLocal = true, weightEstimated = false, className = '' }: { highlight?: string; highlightLabel?: string; showLocal?: boolean; weightEstimated?: boolean; className?: string }) {
  const [rates, setRates] = useState<Rate[]>(cache || DEFAULT_RATES);

  useEffect(() => {
    if (cache) return;
    fetch('/api/shipping/rates-public')
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d?.rates)) return;
        const list = d.rates
          .filter((r: any) => typeof r?.id === 'string' && Number.isFinite(r?.durationDays))
          .map((r: any) => ({ id: r.id, label: String(r.label || ''), durationDays: Number(r.durationDays), billing: r.billing, rate: Number(r.rate) || undefined }));
        if (list.length > 0) {
          cache = list;
          setRates(list);
        }
      })
      .catch(() => {});
  }, []);

  const rows = [...rates]
    .filter((r) => showLocal || r.id !== 'local_24h')
    .filter((r) => ICONS[r.id])
    .sort((a, b) => a.durationDays - b.durationDays);
  const CLASSIC_DAYS = 28;
  const max = Math.max(CLASSIC_DAYS, ...rows.map((r) => r.durationDays));
  // Échelle racine : 1 jour reste visible à côté de 48 jours
  const width = (d: number) => `${Math.max(6, Math.round((Math.sqrt(d) / Math.sqrt(max)) * 100))}%`;

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Combien de temps pour être livré à Dakar ?</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">Vous choisissez la vitesse : plus c&apos;est lent, moins le transport coûte.</p>
      <ul className="mt-3 space-y-2.5">
        {rows.map((r) => {
          const Icon = ICONS[r.id];
          const on = highlight === r.id;
          return (
            <li key={r.id}>
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className={`flex items-center gap-1.5 ${on ? 'font-extrabold text-emerald-700 dark:text-emerald-300' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
                  <Icon size={14} /> {NAMES[r.id]}{on ? ` · ${highlightLabel}` : ''}
                </span>
                <span className="tabular-nums font-bold text-slate-900 dark:text-white">{days(r.label, r.durationDays)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className={`h-2 rounded-full ${on ? 'bg-emerald-500' : 'bg-emerald-300 dark:bg-emerald-700'}`} style={{ width: width(r.durationDays) }} />
              </div>
              {(() => {
                const t = tariff(r);
                return t ? (
                  <p className="mt-0.5 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{t.unit}</span>
                    {t.example && <span className="tabular-nums">{EXAMPLE_KG} kg ≈ <b className="text-slate-700 dark:text-slate-200">{t.example}</b></span>}
                  </p>
                ) : null;
              })()}
            </li>
          );
        })}
        <li>
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
              <Package size={14} /> Commande en ligne classique depuis la Chine
            </span>
            <span className="tabular-nums font-bold text-slate-500 dark:text-slate-400">3 sem. et +</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-2 rounded-full bg-slate-300 dark:bg-slate-600" style={{ width: width(CLASSIC_DAYS) }} />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Souvent sans suivi jusqu&apos;à Dakar ni interlocuteur local en cas de problème.</p>
        </li>
      </ul>
      <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] leading-snug text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Avion : poids réel ou volumétrique (L×l×h/5000), le plus élevé. Bateau groupé : volume ou poids (1 tonne = 1 m³), le plus élevé ; un objet encombrant est facturé au volume. Le transport est estimé sur le poids catalogue, puis ajusté au poids réel pesé en Chine.
      </p>
      {weightEstimated && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Le fournisseur n&apos;indique pas le poids de ce produit : le prix affiché comprend le produit et les frais, le transport est estimé puis recalculé sur le poids réel pesé en Chine.
        </p>
      )}
    </div>
  );
}
