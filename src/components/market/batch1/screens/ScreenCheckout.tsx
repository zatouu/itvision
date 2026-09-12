'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';
import { Icon } from '../Icon';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Card } from '../Card';
import { Section } from '../Section';
import { TrustStrip } from '../TrustStrip';
import { mapCartItem } from '../data-mappers';
import type { CartItem } from '../types';

const GRAIN_VALUE_FCFA = 2;

const methodMap: Record<string, string> = {
  express: 'express_3j',
  aerien: 'air_15j',
  maritime: 'maritime_60j',
};

const methodInternalId: Record<string, string> = {
  express: 'air_express',
  aerien: 'air_15',
  maritime: 'sea_freight',
};

interface CheckoutQuote {
  items: { id: string; unitPrice: number }[];
  pricing: {
    sourcingCost: number;
    usingRetailPricing: boolean;
    serviceFee: { rate: number; amount: number };
    insurance: { rate: number; amount: number };
    quantityDiscount: { percent: number; amount: number; label: string } | null;
    subtotal: number;
  };
  shipping: { label: string; cost: number } | null;
  shippingOptions?: { methodId: string; label: string; cost: number | null; eligible?: boolean; reasons?: string[] }[];
  discounts: { promo: { code: string; discount: number } | null; promoError?: string };
  total: number;
}

export default function ScreenCheckout() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [CART, setCART] = useState<CartItem[]>([]);

  const [ship, setShip] = useState("aerien");
  const [region, setRegion] = useState("Dakar");
  const [dept, setDept] = useState("Dakar");
  const [quartier, setQuartier] = useState("Almadies");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [shippingRates, setShippingRates] = useState<Record<string, { label: string; durationDays: string; costPerUnit: number; description: string }>>({});
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [grainsBalance, setGrainsBalance] = useState(0);
  const [grainsInput, setGrainsInput] = useState("");

  useEffect(() => {
    fetch('/api/shipping/rates-public')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.rates) {
          const map: Record<string, { label: string; durationDays: string; costPerUnit: number; description: string }> = {};
          for (const r of d.rates) {
            map[r.id] = r;
          }
          setShippingRates(map);
        }
      })
      .catch(() => {});
    if (typeof window !== 'undefined') {
      const savedPromo = localStorage.getItem('cart:promo');
      if (savedPromo) { setAppliedPromo(savedPromo); setPromoInput(savedPromo); }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLoading(true);
    const raw = localStorage.getItem('cart:items');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) setCART(parsed.map(mapCartItem) as CartItem[]);
      } catch {}
    }
    fetch('/api/client/profile', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.profile) {
          const u = d.profile;
          if (u.name) setFullName(u.name);
          if (u.phone) setPhone(u.phone.replace(/^\+221\s?/, ''));
          if (u.address?.street) setStreet(u.address.street);
          if (u.address?.region) setRegion(u.address.region);
          if (u.address?.department) setDept(u.address.department);
          if (u.address?.neighborhood) setQuartier(u.address.neighborhood);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch('/api/grains', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (typeof d?.balance === 'number') setGrainsBalance(d.balance); })
      .catch(() => {});
  }, []);

  // Devis serveur — même calcul que la facturation (sourcing + service +
  // assurance + transport). Recalculé à chaque changement de panier/méthode/promo.
  useEffect(() => {
    if (CART.length === 0) { setQuote(null); return; }
    const ctrl = new AbortController();
    setQuoteLoading(true);
    fetch('/api/pricing/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        cart: CART.map(it => ({ id: it.id, qty: it.qty, variantIds: it.variantIds })),
        shippingMethod: methodMap[ship] || 'air_15j',
        ...(appliedPromo ? { promo: { code: appliedPromo } } : {}),
        allShipping: true,
      }),
      signal: ctrl.signal,
    })
      .then(async r => ({ ok: r.ok, data: await r.json().catch(() => null) }))
      .then(({ ok, data }) => {
        if (ok && data?.quote) { setQuote(data.quote); setQuoteError(""); }
        else { setQuote(null); setQuoteError(data?.error || 'Devis indisponible pour ce panier.'); }
      })
      .catch(() => { setQuote(null); setQuoteError('Devis indisponible pour ce panier.'); })
      .finally(() => setQuoteLoading(false));
    return () => ctrl.abort();
  }, [CART, ship, appliedPromo]);



  const shippingOptions = useMemo(() => {
    const base = [
      { key: "express", id: "air_express", label: "Express aérien", days: "3-5 jours", sub: "Prioritaire · le plus rapide", icon: "plane", groupTag: false },
      { key: "aerien", id: "air_15", label: "Standard aérien", days: "10-15 jours", sub: "Le meilleur rapport prix/délai", icon: "plane", groupTag: false },
      { key: "maritime", id: "sea_freight", label: "Maritime", days: "45-50 jours", sub: "Le moins cher pour gros volumes", icon: "ship", groupTag: true },
    ];
    return base.map((o) => {
      const rate = shippingRates[o.id];
      const quoted = quote?.shippingOptions?.find(s => s.methodId === o.id);
      const eligible = quoted ? quoted.eligible !== false && quoted.cost != null : true;
      return {
        ...o,
        // Coût réel calculé serveur (poids réel/volumétrique du panier)
        price: quoted ? quoted.cost : null,
        // Les jours restent la fourchette canonique (durationDays = valeur médiane serveur)
        days: o.days,
        sub: eligible ? (rate ? rate.description : o.sub) : (quoted?.reasons?.[0] ?? 'Réservé aux commandes volumineuses'),
        disabled: !eligible,
      };
    });
  }, [shippingRates, quote]);

  const items = CART;
  const sub = quote?.pricing.sourcingCost ?? items.reduce((s,it)=>s+it.tierUnit*it.qty,0);
  const service = quote?.pricing.serviceFee.amount ?? 0;
  const insurance = quote?.pricing.insurance.amount ?? 0;
  const shipCost = quote?.shipping?.cost ?? 0;
  const savings = items.reduce((s,it)=>s+(it.unit-it.tierUnit)*it.qty,0);
  const promoDiscount = quote?.discounts.promo?.discount ?? 0;
  const qtyDiscount = quote?.pricing.quantityDiscount?.amount ?? 0;
  // Grains : aperçu client — le serveur revalide (solde, plafond 50%)
  const maxGrains = quote ? Math.floor((quote.pricing.subtotal * 0.5) / GRAIN_VALUE_FCFA) : 0;
  const grainsCount = Math.max(0, Math.min(parseInt(grainsInput || '0', 10) || 0, grainsBalance, maxGrains));
  const grainsDiscount = grainsCount * GRAIN_VALUE_FCFA;
  const total = Math.max(0, (quote?.total ?? (sub + service + insurance + shipCost)) - grainsDiscount);

  const handleCheckout = async () => {
    setCheckoutError('');
    if (!fullName.trim() || !phone.trim() || !street.trim()) {
      setCheckoutError('Veuillez renseigner votre nom, téléphone et adresse.');
      return;
    }
    if (items.length === 0) {
      setCheckoutError('Votre panier est vide.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          // Seuls les ids/quantités/variantes sont envoyés — les prix sont
          // relus et recalculés côté serveur (même moteur que le devis affiché).
          cart: items.map(it => ({
            id: it.id,
            qty: it.qty,
            name: it.name,
            variantId: it.variantId,
            variantIds: it.variantIds,
            variantLabels: it.variantLabels,
          })),
          name: fullName.trim(),
          phone: `+221 ${phone.replace(/\D/g, '').replace(/^(221|00221)/, '').trim()}`,
          address: {
            region,
            department: dept,
            neighborhood: quartier,
            street: street.trim(),
            country: 'Sénégal',
          },
          shippingMethod: methodMap[ship] || 'air_15j',
          ...(appliedPromo ? { promo: { code: appliedPromo, discount: promoDiscount } } : {}),
          ...(grainsCount > 0 ? { grainsAmount: grainsCount } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCheckoutError(data.error || 'Erreur lors de la création de la commande.');
        return;
      }
      localStorage.removeItem('cart:items');
      localStorage.removeItem('cart:promo');
      window.dispatchEvent(new CustomEvent('cart:updated'));
      router.push(data.confirmationUrl || `/commandes/${data.orderId}`);
    } catch {
      setCheckoutError('Impossible de communiquer avec le serveur.');
    } finally {
      setSubmitting(false);
    }
  };

  const Stepper = () => (
    <div className="flex items-center gap-2 md:gap-3">
      {[
        { k: "cart", l: "Panier", done: true },
        { k: "adresse", l: "Livraison", done: false, active: true },
        { k: "paiement", l: "Paiement", done: false },
      ].map((s, i, arr) => (
        <Fragment key={s.k}>
          <div className="flex items-center gap-2">
            <span className={cn(
              "grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold",
              s.done ? "bg-emerald-600 text-white" : s.active ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            )}>
              {s.done ? <Icon name="check" size={14}/> : i+1}
            </span>
            <span className={cn("text-[12px] md:text-sm font-semibold", s.active?"text-slate-900 dark:text-white":s.done?"text-slate-700 dark:text-slate-300":"text-slate-400 dark:text-slate-500")}>{s.l}</span>
          </div>
          {i < arr.length - 1 && <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800"/>}
        </Fragment>
      ))}
    </div>
  );

  const ShippingCards = () => (
    <>
    <div className="space-y-2 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
      {shippingOptions.map((o) => {
        const active = ship === o.key;
        return (
          <button key={o.key} disabled={o.disabled} onClick={()=>!o.disabled && setShip(o.key)} className={cn(
            "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all md:flex-col md:gap-2",
            o.disabled && "opacity-50 cursor-not-allowed",
            active ? "border-emerald-600 bg-emerald-50 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/40" : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          )}>
            <div className="flex items-start justify-between w-full">
              <span className={cn("grid h-10 w-10 place-items-center rounded-lg", active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300")}>
                <Icon name={o.icon} size={18}/>
              </span>
              {o.groupTag && <Badge tone="violet"><Icon name="users" size={10}/> Idéal en groupe</Badge>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">{o.label}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{o.sub}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300"><Icon name="clock" size={11}/>{o.days}</span>
                <span className="text-[14px] font-extrabold text-slate-900 dark:text-white tabular-nums">{o.price != null ? formatFcfa(o.price) : '…'}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
    {quoteError && (
      <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[12px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        {quoteError}
      </div>
    )}
    </>
  );

  const AddressForm = () => (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nom complet</span>
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Votre nom complet" className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"/>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Téléphone</span>
          <div className="mt-1 flex items-center gap-1 rounded-xl border border-slate-200 bg-white pl-3 dark:border-slate-700 dark:bg-slate-900">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">+221</span>
            <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="77 123 45 67" className="h-11 flex-1 bg-transparent px-2 text-sm outline-none dark:text-white"/>
          </div>
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Région</span>
          <select value={region} onChange={e=>setRegion(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <option>Dakar</option><option>Thiès</option><option>Saint-Louis</option><option>Ziguinchor</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Département</span>
          <select value={dept} onChange={e=>setDept(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <option>Dakar</option><option>Pikine</option><option>Rufisque</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Quartier</span>
          <select value={quartier} onChange={e=>setQuartier(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <option>Almadies</option><option>Plateau</option><option>Point E</option><option>Mermoz</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Adresse (rue, N°, point de repère)</span>
        <input value={street} onChange={e => setStreet(e.target.value)} placeholder="Rue, N°, point de repère" className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"/>
      </label>

      {/* Map placeholder */}
      <div className="relative h-40 md:h-52 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-emerald-50 to-slate-50 dark:border-slate-800 dark:from-blue-950/30 dark:via-emerald-950/30 dark:to-slate-900">
        <svg viewBox="0 0 400 200" className="h-full w-full opacity-50">
          <path d="M0,120 Q100,80 200,110 T400,90 L400,200 L0,200 Z" fill="rgba(16,185,129,0.15)"/>
          <path d="M0,150 Q100,130 200,140 T400,130 L400,200 L0,200 Z" fill="rgba(37,99,235,0.15)"/>
          {Array.from({length:20}).map((_,i)=><circle key={i} cx={i*20+10} cy={100+Math.sin(i)*20} r="1.5" fill="#94a3b8"/>)}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-slate-900 shadow-md dark:bg-slate-900 dark:text-white">
            <Icon name="mapPin" size={14} className="text-red-600"/>
            {quartier ? `${quartier}, ${dept}` : 'Adresse de livraison'}
          </div>
        </div>
      </div>
    </div>
  );

  const OrderRecap = () => (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Récapitulatif</h3>
      </div>
      <div className="max-h-56 overflow-y-auto p-3 space-y-2">
        {items.map((it)=>(
          <div key={it.id} className="flex items-center gap-3">
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
              <Image src={it.image} alt={it.name} fill sizes="48px" className="object-cover"/>
              <span className="absolute -bottom-0.5 -right-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white">{it.qty}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-slate-900 dark:text-white line-clamp-1">{it.name}</p>
              <div className="mt-0.5 flex items-center gap-1">
                <Badge tone="amber" className="!text-[9px] !px-1 !py-0"><Icon name="package" size={9}/>Min {it.minOrderQty}</Badge>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{it.variant}</span>
              </div>
            </div>
            <p className="text-[12px] font-extrabold text-slate-900 dark:text-white tabular-nums flex-shrink-0">{formatFcfa(it.tierUnit * it.qty)}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <dl className="space-y-1.5 text-[12px]">
          <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Prix produits ({items.reduce((s,i)=>s+i.qty,0)} pcs)</dt><dd className="font-semibold text-slate-900 dark:text-white tabular-nums">{formatFcfa(sub)}</dd></div>
          {!quote?.pricing.usingRetailPricing && (
            <>
              <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Frais de service{quote ? ` (${quote.pricing.serviceFee.rate}%)` : ''}</dt><dd className="font-semibold text-slate-900 dark:text-white tabular-nums">{quote ? formatFcfa(service) : '…'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Assurance import{quote ? ` (${quote.pricing.insurance.rate}%)` : ''}</dt><dd className="font-semibold text-slate-900 dark:text-white tabular-nums">{quote ? formatFcfa(insurance) : '…'}</dd></div>
            </>
          )}
          {qtyDiscount > 0 && (
            <div className="flex justify-between">
              <dt className="text-emerald-700 dark:text-emerald-300 font-semibold">{quote?.pricing.quantityDiscount?.label || 'Réduction quantité'}</dt>
              <dd className="text-emerald-700 dark:text-emerald-300 font-bold tabular-nums">-{formatFcfa(qtyDiscount)}</dd>
            </div>
          )}
          {promoDiscount > 0 && (
            <div className="flex justify-between">
              <dt className="text-emerald-700 dark:text-emerald-300 font-semibold">Promo {quote?.discounts.promo?.code}</dt>
              <dd className="text-emerald-700 dark:text-emerald-300 font-bold tabular-nums">-{formatFcfa(promoDiscount)}</dd>
            </div>
          )}
          {grainsDiscount > 0 && (
            <div className="flex justify-between">
              <dt className="text-emerald-700 dark:text-emerald-300 font-semibold">Grains ({grainsCount})</dt>
              <dd className="text-emerald-700 dark:text-emerald-300 font-bold tabular-nums">-{formatFcfa(grainsDiscount)}</dd>
            </div>
          )}
          <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1"><Icon name="truck" size={11}/>Transport ({quote?.shipping?.label ?? shippingOptions.find(o => o.key === ship)?.label ?? ''})</dt><dd className="font-semibold text-slate-900 dark:text-white tabular-nums">{quote ? formatFcfa(shipCost) : '…'}</dd></div>
          {savings > 0 && (
            <div className="flex justify-between rounded-md bg-emerald-50 px-1.5 py-1 -mx-1 dark:bg-emerald-950/40">
              <dt className="text-emerald-700 dark:text-emerald-300 font-bold inline-flex items-center gap-1"><Icon name="sparkles" size={11}/>Économie paliers/wholesale</dt>
              <dd className="text-emerald-700 dark:text-emerald-300 font-bold tabular-nums">-{formatFcfa(savings)}</dd>
            </div>
          )}
        </dl>

        {/* Code promo */}
        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
          {appliedPromo && quote?.discounts.promo ? (
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-700 dark:text-emerald-300">
                <Icon name="check" size={13}/> {appliedPromo} appliqué
              </span>
              <button onClick={() => { setAppliedPromo(''); setPromoInput(''); }} className="text-[11px] font-semibold text-slate-500 hover:text-red-600 dark:text-slate-400">Retirer</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={promoInput}
                onChange={e => setPromoInput(e.target.value.toUpperCase())}
                placeholder="Code promo"
                className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <Button variant="secondary" size="sm" disabled={!promoInput.trim()} onClick={() => setAppliedPromo(promoInput.trim())}>Appliquer</Button>
            </div>
          )}
          {appliedPromo && quote?.discounts.promoError && (
            <p className="mt-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400">{quote.discounts.promoError}</p>
          )}
        </div>

        {/* Grains de fidélité */}
        {grainsBalance > 0 && (
          <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-amber-700 dark:text-amber-300">
                <Icon name="sparkles" size={13}/> {grainsBalance} grains disponibles
              </span>
              <input
                value={grainsInput}
                onChange={e => setGrainsInput(e.target.value.replace(/\D/g, ''))}
                placeholder={`Max ${maxGrains}`}
                inputMode="numeric"
                className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-3 text-right text-[12px] outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">1 grain = {GRAIN_VALUE_FCFA} FCFA · utilisable jusqu&apos;à 50% de la commande</p>
          </div>
        )}

        <div className="my-3 h-px bg-slate-200 dark:bg-slate-800"/>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold text-slate-900 dark:text-white">Total à payer</span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">{formatFcfa(total)}</span>
        </div>
        {quoteLoading && <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">Mise à jour du devis…</p>}
      </div>
    </Card>
  );

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">Chargement…</div>;
  }

  if (CART.length === 0 && !loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">Votre panier est vide</div>;
  }

  return (
    <>
      <div className="md:hidden">
        <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">

        <div className="flex-1 overflow-y-auto pb-32">
          <div className="p-4"><Stepper/></div>

          <Section title="Adresse de livraison" className="pb-4">
            <Card className="p-3"><AddressForm/></Card>
          </Section>

          <Section title="Mode d'expédition" subtitle="Depuis Guangzhou, Chine" className="pb-4">
            <ShippingCards/>
          </Section>

          <Section title="Votre commande" className="pb-4">
            <OrderRecap/>
          </Section>

          {checkoutError && (
            <div className="px-4 pb-2">
              <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-[12px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {checkoutError}
              </div>
            </div>
          )}
          <div className="px-4 pb-4">
            <TrustStrip compact/>
          </div>
        </div>

        {/* Sticky bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">Total à payer</p>
              <p className="mt-0.5 text-[17px] font-extrabold text-slate-900 dark:text-white tabular-nums leading-tight whitespace-nowrap">{formatFcfa(total)}</p>
            </div>
            <Button variant="primary" size="md" className="whitespace-nowrap flex-shrink-0" onClick={handleCheckout} disabled={submitting || items.length === 0 || !quote}>
              {submitting ? 'Traitement...' : 'Aller au paiement'}
              <Icon name="arrowRight" size={14}/>
            </Button>
          </div>
        </div>
      </div>
      </div>
      <div className="hidden md:block">
        <div className="min-h-full bg-slate-50 dark:bg-slate-950">

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-6"><Stepper/></div>
        <div className="grid grid-cols-[1fr_400px] gap-6">
          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="mb-4 text-base font-extrabold text-slate-900 dark:text-white">Adresse de livraison</h2>
              <AddressForm/>
            </Card>
            <Card className="p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Mode d&apos;expédition</h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">Depuis Guangzhou, Chine — inspection incluse</span>
              </div>
              <ShippingCards/>
            </Card>
            <TrustStrip/>
          </div>

          <div>
            <div className="sticky top-20 space-y-4">
              <OrderRecap/>
              {checkoutError && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-[12px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {checkoutError}
                </div>
              )}
              <Button variant="primary" size="lg" className="w-full" onClick={handleCheckout} disabled={submitting || items.length === 0 || !quote}>{submitting ? 'Traitement...' : 'Aller au paiement'} <Icon name="arrowRight" size={16}/></Button>
              <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1"><Icon name="lock" size={12}/>Paiement sécurisé · Escrow Mobile Money</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</>
  );

}
