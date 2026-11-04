'use client';

import { useEffect, useState } from 'react';
import { MapPin, Home } from 'lucide-react';

export type PickupPointOption = {
  id: string;
  name: string;
  neighborhood: string;
  city: string;
  address: string;
  landmark?: string;
  hours?: string;
  mapsUrl?: string;
};

let cache: PickupPointOption[] | null = null;

/**
 * Choix « remise à mon adresse » ou « retrait gratuit en point relais ».
 * Masqué tant qu'aucun point n'est actif. `value` = id du point, '' = adresse.
 */
export default function PickupPointPicker({
  value,
  onChange,
  homeLabel = 'Livraison à mon adresse',
  compact = false,
}: {
  value: string;
  onChange: (id: string, point?: PickupPointOption) => void;
  homeLabel?: string;
  compact?: boolean;
}) {
  const [points, setPoints] = useState<PickupPointOption[]>(cache || []);

  useEffect(() => {
    if (cache) return;
    fetch('/api/market/pickup-points')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.points)) {
          cache = d.points;
          setPoints(d.points);
        }
      })
      .catch(() => {});
  }, []);

  if (points.length === 0) return null;
  const selected = points.find((p) => p.id === value);
  const byArea = points.reduce<Record<string, PickupPointOption[]>>((acc, p) => {
    const key = `${p.neighborhood} (${p.city})`;
    (acc[key] ||= []).push(p);
    return acc;
  }, {});

  const option = (active: boolean) =>
    `flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[12px] font-bold transition ${
      active
        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
        : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
    }`;

  return (
    <div className={compact ? 'space-y-2' : 'space-y-2.5'}>
      <div className="flex gap-2">
        <button type="button" className={option(!value)} onClick={() => onChange('')}>
          <Home size={15} /> {homeLabel}
        </button>
        <button type="button" className={option(!!value)} onClick={() => onChange(points[0].id, points[0])}>
          <MapPin size={15} /> {points.length === 1 ? `Retrait gratuit : ${points[0].name}` : 'Retrait gratuit en point relais'}
        </button>
      </div>
      {value && (
        <div>
          {points.length > 1 && (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value, points.find((p) => p.id === e.target.value))}
            aria-label="Point de retrait"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {Object.entries(byArea).map(([area, list]) => (
              <optgroup key={area} label={area}>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          )}
          {selected && (
            <p className="mt-1.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              {selected.address}{selected.landmark ? ` · ${selected.landmark}` : ''}{selected.hours ? ` · ${selected.hours}` : ''}
              {selected.mapsUrl && (
                <>
                  {' · '}
                  <a href={selected.mapsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 underline dark:text-emerald-400">Voir sur la carte</a>
                </>
              )}
              <br />Présentez votre numéro de commande (ou d&apos;achat groupé) au retrait.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
