// ============================================================
// SCREEN — TARIFICATION / PRIX TRANSPARENT (/tarification + /prix-transparent)
// ============================================================
const ScreenPricing = ({ device = "mobile" }) => {
  const [simPrice, setSimPrice] = React.useState(15000);
  const [simQty, setSimQty] = React.useState(10);
  const [openFaq, setOpenFaq] = React.useState(0);

  // Décomposition
  const factory = simPrice;
  const service = Math.round(factory * 0.10);
  const insurance = Math.round(factory * 0.02);
  const shipping = 2500; // aérien standard exemple
  const total = factory + service + insurance + shipping;

  // Comparatif
  const solo = { unit: total, save: 0 };
  const groupe = { unit: Math.round(total * 0.72), save: 28 };
  const palier = { unit: Math.round(total * 0.80), save: 20, threshold: 10 };
  const paliersHtml = [
    { range: "1-5", label: "Prix local", unit: total, tone: "slate" },
    { range: "6-19", label: "-13%", unit: Math.round(total * 0.87), tone: "emerald" },
    { range: "20-49", label: "-25%", unit: Math.round(total * 0.75), tone: "emerald", highlight: true },
    { range: "50+", label: "-40%", unit: Math.round(total * 0.60), tone: "emerald" },
  ];

  const transportModes = [
    { key: "express", icon: "plane", label: "Express aérien", days: "4-7j", cost: "24 500 F/kg", idealFor: "Petites qtés urgentes" },
    { key: "aerien",  icon: "plane", label: "Aérien standard", days: "8-12j", cost: "12 500 F/kg", idealFor: "Meilleur rapport prix/délai" },
    { key: "maritime", icon: "ship", label: "Maritime", days: "35-45j", cost: "4 200 F/kg", idealFor: "Gros volumes économiques", badge: "Idéal en groupe" },
  ];

  const faqs = [
    { q: "Comment est calculé le prix final ?", a: "Prix usine + 10% de frais de service + 2% d'assurance + transport variable selon le mode et le volume. Aucun frais caché : tout est décomposé sur la fiche produit et dans le panier." },
    { q: "Puis-je payer en plusieurs fois ?", a: "Pour les commandes supérieures à 100 000 F, un paiement en 2 fois est possible via Wave. Contactez le support pour l'activer." },
    { q: "Comment fonctionne l'assurance ?", a: "L'assurance couvre la perte, le vol ou la casse pendant le transport. En cas de problème, remboursement intégral sous 7 jours." },
    { q: "L'achat groupé est-il toujours moins cher ?", a: "Oui : plus le groupe atteint son objectif, plus le prix unitaire baisse. Vous êtes remboursé automatiquement si l'objectif n'est pas atteint." },
    { q: "Quels moyens de paiement sont acceptés ?", a: "Wave, Orange Money, Free Money, virement bancaire, et virement SWIFT pour les gros volumes. Tous les paiements passent par notre système Escrow." },
  ];

  // Hero
  const Hero = () => (
    <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-emerald-600 text-white rounded-3xl md:rounded-3xl">
      <div className="absolute inset-0 opacity-15">
        <svg viewBox="0 0 800 300" className="h-full w-full"><defs><pattern id="dots-pricing" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="white"/></pattern></defs><rect width="800" height="300" fill="url(#dots-pricing)"/></svg>
      </div>
      <div className={cx("relative", device === "mobile" ? "px-5 py-6" : "px-10 py-10")}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3 py-1 text-[11px] font-bold whitespace-nowrap">
          <Icon name="checkCircle" size={12}/>Zéro frais caché
        </span>
        <h1 className={cx("mt-3 font-extrabold leading-[1] tracking-tight", device === "mobile" ? "text-[28px]" : "text-[44px]")}>Prix transparent,<br/>calculé <span className="text-emerald-300">au FCFA près</span>.</h1>
        <p className={cx("mt-3 max-w-md text-white/85 leading-snug", device === "mobile" ? "text-[13px]" : "text-[15px]")}>Chaque prix affiché sur DDM+ est décomposé ligne par ligne. Vous savez exactement ce que vous payez et pourquoi.</p>
      </div>
    </div>
  );

  // Décomposition interactive
  const Decomposition = () => {
    const bars = [
      { label: "Prix usine", value: factory, color: "bg-blue-500", tone: "blue" },
      { label: "Frais de service (10%)", value: service, color: "bg-emerald-500", tone: "emerald" },
      { label: "Assurance (2%)", value: insurance, color: "bg-amber-500", tone: "amber" },
      { label: "Transport", value: shipping, color: "bg-violet-500", tone: "violet" },
    ];
    return (
      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 md:p-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Décomposition interactive</p>
        <h2 className="text-[20px] md:text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-white">Comment votre prix se compose</h2>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Ajustez le prix usine pour voir l'impact en direct.</p>

        <div className="mt-5 grid gap-4 md:grid-cols-[280px_1fr]">
          {/* Inputs */}
          <div className="space-y-3">
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix usine</label>
                <span className="text-[15px] font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">{fmtFCFA(factory)}</span>
              </div>
              <input type="range" min="5000" max="50000" step="500" value={simPrice} onChange={e => setSimPrice(+e.target.value)} className="w-full accent-emerald-600"/>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Total unitaire</p>
              <p className="mt-1 text-[26px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap leading-none">{fmtFCFA(total)}</p>
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Prix TTC livré au Sénégal</p>
            </div>
          </div>

          {/* Bars */}
          <div className="space-y-3">
            {bars.map((b) => {
              const pct = (b.value / total) * 100;
              return (
                <div key={b.label}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">{b.label}</span>
                    <span className="text-[12px] font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">{fmtFCFA(b.value)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={cx("h-full rounded-full transition-all duration-300", b.color)} style={{width: pct + "%"}}/>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">{pct.toFixed(1)}% du total</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Comparatif 3 modes d'achat
  const Comparison = () => {
    const cards = [
      { key: "solo", ttl: "Achat seul", desc: "Vous commandez juste vos pièces.", price: solo.unit, save: 0, cta: "Voir le catalogue", tone: "slate", icon: "user" },
      { key: "groupe", ttl: "Achat groupé", desc: "Vous rejoignez d'autres acheteurs.", price: groupe.unit, save: groupe.save, cta: "Voir les groupes", tone: "violet", icon: "users", best: true },
      { key: "palier", ttl: "Prix par palier", desc: "Vous commandez en volume.", price: palier.unit, save: palier.save, cta: "Simuler mon lot", tone: "amber", icon: "boxes" },
    ];
    return (
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Comparatif</p>
        <h2 className="text-[20px] md:text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-white">3 façons d'obtenir le meilleur prix</h2>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Simulé pour {simQty} pcs d'un produit à {fmtFCFA(simPrice)} prix usine.</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {cards.map((c) => {
            const toneMap = {
              slate: "border-slate-200 dark:border-slate-800",
              violet: "border-violet-500 dark:border-violet-600 ring-4 ring-violet-500/10",
              amber: "border-amber-300 dark:border-amber-800",
            };
            const iconTone = {
              slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
              violet: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
              amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
            };
            return (
              <div key={c.key} className={cx("relative rounded-2xl border-2 bg-white dark:bg-slate-900 p-5", toneMap[c.tone])}>
                {c.best && <span className="absolute -top-2.5 left-4 rounded-full bg-violet-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 whitespace-nowrap">⭐ Recommandé</span>}
                <div className="flex items-center gap-2 mb-3">
                  <span className={cx("grid h-10 w-10 place-items-center rounded-xl", iconTone[c.tone])}><Icon name={c.icon} size={18}/></span>
                  <div>
                    <p className="text-[14px] font-extrabold text-slate-900 dark:text-white">{c.ttl}</p>
                    {c.save > 0 && <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">-{c.save}% économisés</p>}
                  </div>
                </div>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">{c.desc}</p>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix/pc</p>
                  <p className="mt-1 text-[22px] font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap leading-none">{fmtFCFA(c.price)}</p>
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">Total {simQty} pcs : {fmtFCFA(c.price * simQty)}</p>
                  {/* barre visuelle savings */}
                  <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div className={cx("h-full rounded-full", c.tone === "violet" ? "bg-violet-500" : c.tone === "amber" ? "bg-amber-500" : "bg-slate-400")} style={{width: (100 - c.save) + "%"}}/>
                  </div>
                </div>
                <Button variant={c.tone === "violet" ? "violet" : "secondary"} size="md" className="w-full">{c.cta}</Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Transport cards
  const Transport = () => (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Options de transport</p>
      <h2 className="text-[20px] md:text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-white">Choisissez votre mode</h2>
      <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Chaque mode a son idéal — sélectionnez selon vos priorités.</p>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {transportModes.map((t) => (
          <div key={t.key} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
            <div className="flex items-start justify-between mb-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Icon name={t.icon} size={20}/></span>
              {t.badge && <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 border border-violet-200 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950 dark:border-violet-900 dark:text-violet-300"><Icon name="users" size={10}/>{t.badge}</span>}
            </div>
            <p className="text-[14px] font-extrabold text-slate-900 dark:text-white">{t.label}</p>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <Icon name="clock" size={11}/><span>{t.days}</span>
              <span>·</span>
              <span className="tabular-nums">{t.cost}</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Idéal pour : <b className="text-slate-700 dark:text-slate-300">{t.idealFor}</b></p>
          </div>
        ))}
      </div>
    </div>
  );

  // Paliers volume
  const Tiers = () => (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Remises par volume</p>
      <h2 className="text-[20px] md:text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-white">Le prix baisse dès que vous augmentez</h2>
      <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {paliersHtml.map((t, i) => (
          <div key={t.range} className={cx(
            "flex items-center justify-between px-4 py-3",
            t.highlight ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-white dark:bg-slate-900",
            i < paliersHtml.length - 1 && "border-b border-slate-200 dark:border-slate-800"
          )}>
            <div className="flex items-center gap-3">
              <span className={cx("grid h-8 w-8 place-items-center rounded-lg text-[10px] font-extrabold whitespace-nowrap",
                t.tone === "slate" ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              )}>{t.range}</span>
              <div>
                <p className="text-[12px] font-bold text-slate-900 dark:text-white">{t.range} pcs</p>
                <p className={cx("text-[11px] font-bold", t.tone === "slate" ? "text-slate-500 dark:text-slate-400" : "text-emerald-600 dark:text-emerald-400")}>{t.label}</p>
              </div>
              {t.highlight && <span className="inline-flex items-center rounded-md bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 whitespace-nowrap">Populaire</span>}
            </div>
            <p className={cx("text-[15px] font-extrabold tabular-nums whitespace-nowrap", t.tone === "slate" ? "text-slate-400" : "text-slate-900 dark:text-white")}>{fmtFCFA(t.unit)}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // FAQ
  const FAQ = () => (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Questions fréquentes</p>
      <h2 className="text-[20px] md:text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-white">Vos réponses</h2>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
        {faqs.map((f, i) => (
          <div key={i} className={cx(i < faqs.length - 1 && "border-b border-slate-200 dark:border-slate-800")}>
            <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
              <span className="text-[13px] font-bold text-slate-900 dark:text-white">{f.q}</span>
              <Icon name={openFaq === i ? "minus" : "plus"} size={16} className="text-slate-500 dark:text-slate-400 flex-shrink-0"/>
            </button>
            {openFaq === i && (
              <div className="px-4 pb-4 pt-1 text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const FinalCTA = () => (
    <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-900 text-white p-6 md:p-10 text-center">
      <h2 className="text-[22px] md:text-[32px] font-extrabold tracking-tight">Prêt à importer au vrai prix ?</h2>
      <p className="mt-2 text-[13px] md:text-[15px] text-white/85 max-w-md mx-auto">Explorez le catalogue ou envoyez-nous ce que vous cherchez.</p>
      <div className={cx("mt-5 flex gap-3 justify-center", device === "mobile" ? "flex-col" : "")}>
        <button className="whitespace-nowrap rounded-xl bg-white text-slate-900 px-5 py-3 text-[14px] font-bold hover:bg-slate-100 inline-flex items-center justify-center gap-2">
          <Icon name="grid" size={16}/>Voir le catalogue
        </button>
        <button className="whitespace-nowrap rounded-xl bg-white/10 border border-white/25 text-white px-5 py-3 text-[14px] font-bold hover:bg-white/20 inline-flex items-center justify-center gap-2">
          <Icon name="camera" size={16}/>Demander un sourcing
        </button>
      </div>
    </div>
  );

  // ==================== MOBILE ====================
  if (device === "mobile") {
    return (
      <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
        <MarketHeader device={device} back={() => {}} title="Prix transparent"/>
        <div className="flex-1 overflow-y-auto pb-6">
          <div className="p-4"><Hero/></div>
          <div className="px-4 pb-4"><Decomposition/></div>
          <div className="px-4 pb-4"><Comparison/></div>
          <div className="px-4 pb-4"><Transport/></div>
          <div className="px-4 pb-4"><Tiers/></div>
          <div className="px-4 pb-4"><FAQ/></div>
          <div className="px-4"><FinalCTA/></div>
        </div>
      </div>
    );
  }

  // ==================== DESKTOP ====================
  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <MarketHeader device={device}/>
      <div className="mx-auto max-w-6xl px-6 py-6 space-y-8">
        <Hero/>
        <Decomposition/>
        <Comparison/>
        <div className="grid grid-cols-[1fr_360px] gap-6">
          <div className="space-y-8">
            <Transport/>
            <FAQ/>
          </div>
          <div className="sticky top-24 self-start"><Tiers/></div>
        </div>
        <FinalCTA/>
      </div>
    </div>
  );
};

window.ScreenPricing = ScreenPricing;
