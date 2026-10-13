// ============================================================
// SCREEN — HOME MARKETPLACE (Variante D définitive)
// ============================================================
const ScreenHome = ({ device = "mobile" }) => {
  const popular = CATALOG.slice(0, 6);

  const ProductCard = ({ p, size = "sm" }) => (
    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
      <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
        <img src={p.img} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"/>
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          <Badge tone="amber"><Icon name="package" size={10}/>Min. {p.moq}</Badge>
        </div>
        <div className="absolute right-2 top-2">
          <span className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            -{p.save}%
          </span>
        </div>
        <button className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-slate-700 hover:bg-white shadow-sm dark:bg-slate-900/95 dark:text-slate-300 dark:hover:bg-slate-900">
          <Icon name="heart" size={14}/>
        </button>
      </div>
      <div className={cx("p-2.5", size === "lg" && "md:p-3")}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{p.cat}</p>
        <p className={cx("mt-0.5 font-semibold text-slate-900 dark:text-white line-clamp-2 leading-tight", size === "lg" ? "text-[13px] min-h-[34px]" : "text-[12px] min-h-[30px]")}>{p.name}</p>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
          <Icon name="star" size={10} strokeWidth={0} className="fill-amber-500 text-amber-500"/>
          <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{p.rating}</span>
        </div>
        <div className="mt-1.5 flex items-baseline gap-1.5 whitespace-nowrap">
          <span className={cx("font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums", size === "lg" ? "text-[15px]" : "text-[14px]")}>{fmtFCFA(p.price)}</span>
          <span className="text-[10px] font-semibold text-slate-400 line-through tabular-nums">{fmtFCFA(p.base)}</span>
        </div>
      </div>
    </Card>
  );

  // ================ MOBILE ================
  if (device === "mobile") {
    return (
      <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
        <MarketHeader device={device}/>
        <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
            <Icon name="search" size={16} className="text-slate-500 dark:text-slate-400"/>
            <span className="flex-1 text-[12px] text-slate-500 dark:text-slate-400">Rechercher un produit, une catégorie…</span>
            <button className="grid h-7 w-7 place-items-center rounded-lg bg-violet-600 text-white">
              <Icon name="camera" size={13}/>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-6">
          {/* HERO Variante D — mobile stacked */}
          <div className="relative overflow-hidden">
            <div className="relative m-4 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-violet-700 to-emerald-600 p-5 text-white shadow-sm">
              <div className="absolute inset-0 opacity-15">
                <svg viewBox="0 0 400 240" className="h-full w-full">
                  <defs><pattern id="dotshm" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="white"/></pattern></defs>
                  <rect width="400" height="240" fill="url(#dotshm)"/>
                </svg>
              </div>
              <div className="relative">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/25 px-2 py-1 text-[10px] font-bold whitespace-nowrap">
                    <span className="h-1 w-1 rounded-full bg-emerald-300 animate-ping-slow"/>
                    <b className="tabular-nums">2 143</b> groupes
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/25 px-2 py-1 text-[10px] font-bold whitespace-nowrap"><b>−35%</b> éco.</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/25 px-2 py-1 text-[10px] font-bold whitespace-nowrap"><b className="tabular-nums">18h</b> devis</span>
                </div>
                <h1 className="text-[28px] font-extrabold leading-[1] tracking-tight">Importez de Chine,<br/>à <span className="text-emerald-300">prix usine</span>.</h1>
                <p className="mt-2 text-[12px] leading-snug text-white/85">Sourcing dédié, achats groupés et lots avantageux — livrés au Sénégal en 4-45 jours.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-1 text-[10px] font-semibold whitespace-nowrap"><Icon name="camera" size={11}/>Trouvez-moi 24h</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-1 text-[10px] font-semibold whitespace-nowrap"><Icon name="users" size={11}/>Groupés −45%</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-1 text-[10px] font-semibold whitespace-nowrap"><Icon name="package" size={11}/>Prix par palier</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="whitespace-nowrap rounded-xl bg-white px-3 py-2 text-[12px] font-bold text-slate-900 hover:bg-slate-100 inline-flex items-center gap-1">Explorer <Icon name="arrowRight" size={13}/></button>
                  <button className="whitespace-nowrap rounded-xl bg-white/10 border border-white/25 px-3 py-2 text-[12px] font-bold text-white hover:bg-white/20 inline-flex items-center gap-1"><Icon name="camera" size={13}/>Trouvez-moi</button>
                </div>
              </div>
            </div>
          </div>

          {/* Best sellers mobile : horizontal scroll */}
          <Section
            title="⭐ Best sellers"
            className="mt-2"
            right={<a className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">Voir tout</a>}
          >
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
              {popular.map((p) => (
                <div key={p.id} className="flex-shrink-0 snap-start w-[150px]">
                  <ProductCard p={p}/>
                </div>
              ))}
            </div>
          </Section>

          {/* Bandeau EN DIRECT Groupes en cours mobile — horizontal scroll */}
          <div className="mt-6">
            <div className="flex items-center justify-between px-4 mb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping-slow"/>En direct
                </span>
                <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Groupes en cours</p>
              </div>
              <a className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">Voir tout</a>
            </div>
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
              {GROUPS.slice(0, 3).map((g) => {
                const pct = Math.round((g.currentQty / g.targetQty) * 100);
                const almost = g.status === "almost";
                return (
                  <Card key={g.id} className="flex-shrink-0 snap-start w-[220px] p-3 cursor-pointer hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2.5">
                      <img src={g.image} className="h-12 w-12 rounded-full object-cover flex-shrink-0"/>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-900 dark:text-white line-clamp-1">{g.name}</p>
                        <div className="mt-0.5 flex items-baseline gap-1 whitespace-nowrap">
                          <span className="text-[12px] font-extrabold text-violet-700 dark:text-violet-300 tabular-nums">{fmtFCFA(g.unit)}</span>
                          <span className="text-[9px] font-semibold text-slate-400 line-through tabular-nums">{fmtFCFA(g.base)}</span>
                        </div>
                      </div>
                    </div>
                    <ProgressBar value={g.currentQty} max={g.targetQty} tone="mixed" className="!h-1 mt-2"/>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">{pct}% · <span className="text-red-600 dark:text-red-400 font-bold">⏱ {g.deadline.split(" ").slice(0,2).join(" ")}</span></span>
                      <button className={cx("whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold text-white", almost ? "bg-red-500" : "bg-violet-600")}>
                        {almost ? "Presque plein" : "Rejoindre"}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* 3 façons d'importer */}
          <div className="mt-6 px-4 space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">3 façons d'importer</p>
            {[
              { icon: "camera", tone: "violet", tag: "01 · Sourcing", ttl: "Trouvez-moi ce produit en 24h", sub: "Photo, lien ou description → devis garanti sous 24h ouvrées." },
              { icon: "users", tone: "emerald", tag: "02 · Groupes", ttl: "Rejoignez un achat groupé", sub: "Plus on est nombreux, moins c'est cher — jusqu'à -45%." },
              { icon: "package", tone: "amber", tag: "03 · Lot minimum", ttl: "Débloquez le prix par palier", sub: "À partir de X unités, économisez jusqu'à -40%." },
            ].map((b, i) => {
              const toneMap = {
                violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
                emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
                amber: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
              };
              const arrowTone = {
                violet: "text-violet-700 dark:text-violet-300",
                emerald: "text-emerald-700 dark:text-emerald-400",
                amber: "text-amber-700 dark:text-amber-300",
              };
              return (
                <Card key={i} className="cursor-pointer overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 p-3">
                    <span className={cx("grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl", toneMap[b.tone])}>
                      <Icon name={b.icon} size={22}/>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{b.tag}</p>
                      <p className="mt-0.5 text-[13px] font-extrabold text-slate-900 dark:text-white leading-tight">{b.ttl}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{b.sub}</p>
                    </div>
                    <Icon name="chevronRight" size={16} className={cx("flex-shrink-0", arrowTone[b.tone])}/>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Categories */}
          <Section title="Catégories" className="mt-6">
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((c) => (
                <button key={c.key} className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Icon name={c.icon} size={16}/>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-tight">{c.label}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Sourcing */}
          <div className="mt-6 mx-4">
            <div className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-violet-50 p-4 dark:border-violet-900 dark:from-violet-950/40 dark:via-slate-900 dark:to-violet-950/40">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white"><Icon name="camera" size={16}/></span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">Sourcing sur demande</p>
                  <p className="text-[14px] font-extrabold text-slate-900 dark:text-white leading-tight">Trouvez-moi ce produit en 24h</p>
                </div>
              </div>
              <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-400 leading-snug">Vous ne trouvez pas votre produit ? Notre équipe le trouve pour vous.</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { n: 1, ttl: "Envoyez", sub: "Photo ou lien" },
                  { n: 2, ttl: "Recevez", sub: "Devis 24h" },
                  { n: 3, ttl: "Commandez", sub: "On gère tout" },
                ].map((s) => (
                  <div key={s.n} className="rounded-xl bg-white/60 p-2 text-center dark:bg-slate-900/60">
                    <p className="text-[10px] font-extrabold text-violet-700 dark:text-violet-300">0{s.n}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-900 dark:text-white leading-tight">{s.ttl}</p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">{s.sub}</p>
                  </div>
                ))}
              </div>
              <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-[13px] font-bold text-white hover:bg-violet-700">
                <Icon name="camera" size={14}/>Photographier un produit
              </button>
            </div>
          </div>

          {/* MOQ */}
          <div className="mt-6 mx-4">
            <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500 text-white"><Icon name="boxes" size={16}/></span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Lot minimum</p>
                  <p className="text-[14px] font-extrabold text-slate-900 dark:text-white leading-tight">Pourquoi commander en quantité ?</p>
                </div>
              </div>
              <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-400 leading-snug">Le prix baisse par palier. Plus vous commandez, plus vous économisez.</p>
              <div className="mt-3 space-y-1.5">
                {[
                  { qty: "1-4 pcs", price: "Prix local", indicator: "×" },
                  { qty: "5-9 pcs", price: "-13%", indicator: "✓" },
                  { qty: "10-24 pcs", price: "-25%", indicator: "✓", highlight: true },
                  { qty: "25+ pcs", price: "-40%", indicator: "🔥" },
                ].map((t, i) => (
                  <div key={i} className={cx("flex items-center justify-between rounded-lg px-3 py-1.5", t.highlight ? "bg-white dark:bg-slate-900 shadow-sm" : "")}>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{t.indicator} {t.qty}</span>
                    <span className={cx("text-[13px] font-extrabold tabular-nums", t.indicator === "×" ? "text-slate-400" : "text-emerald-600 dark:text-emerald-400")}>{t.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trust */}
          <div className="mt-6 px-4">
            <TrustStrip compact/>
          </div>

          {/* Testimonials */}
          <Section title="Ils nous font confiance" className="mt-6">
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {TESTIMONIALS.map((t) => (
                <Card key={t.initials} className="flex-shrink-0 w-[260px] p-4">
                  <div className="mb-2 flex text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" size={13} strokeWidth={0} className={i < t.rating ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"}/>)}
                  </div>
                  <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">« {t.quote} »</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 text-[10px] font-extrabold text-white">{t.initials}</span>
                    <div>
                      <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight">{t.handle}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{t.role}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Section>

          <div className="mt-6 px-4 py-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">DDM+ · Dieund Dal Ma</p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">Import direct Chine → Sénégal</p>
          </div>
        </div>

        <MarketBottomNav active="home" device={device}/>
      </div>
    );
  }

  // ================ DESKTOP — HERO VARIANTE D DÉFINITIVE ================
  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <MarketHeader device={device}/>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* HERO Variante D */}
        <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Hero principal */}
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-emerald-600 text-white min-h-[500px]">
            <div className="absolute inset-0 opacity-15">
              <svg viewBox="0 0 800 500" className="h-full w-full">
                <defs><pattern id="dotshero" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="white"/></pattern></defs>
                <rect width="800" height="500" fill="url(#dotshero)"/>
              </svg>
            </div>
            <div className="relative grid grid-cols-[1.15fr_1fr] gap-8 items-start px-10 pt-8 pb-10">
              {/* Left : Message remonté */}
              <div className="pt-2">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3 py-1.5 text-[11px] font-bold whitespace-nowrap">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-ping-slow"/>
                    <b className="tabular-nums">2 143</b> groupes actifs
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3 py-1.5 text-[11px] font-bold whitespace-nowrap"><b>−35%</b> économie moyenne</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3 py-1.5 text-[11px] font-bold whitespace-nowrap"><b className="tabular-nums">18h</b> devis sourcing</span>
                </div>
                <h1 className="text-[52px] font-extrabold leading-[0.98] tracking-tight">Importez de Chine,<br/>à <span className="text-emerald-300">prix usine</span>.</h1>
                <p className="mt-3 max-w-md text-[15px] text-white/85 leading-snug">Sourcing dédié, achats groupés et lots avantageux — livrés au Sénégal en 4-45 jours selon votre choix.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap"><Icon name="camera" size={13}/>Trouvez-moi 24h</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap"><Icon name="users" size={13}/>Achats groupés −45%</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap"><Icon name="package" size={13}/>Prix par palier</span>
                </div>
                <div className="mt-5 flex gap-3">
                  <button className="whitespace-nowrap inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[14px] font-bold text-slate-900 hover:bg-slate-100">Explorer le catalogue <Icon name="arrowRight" size={16}/></button>
                  <button className="whitespace-nowrap inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/25 px-5 py-3 text-[14px] font-bold text-white hover:bg-white/20"><Icon name="camera" size={16}/>Trouvez-moi</button>
                </div>
              </div>

              {/* Right : Mosaïque 3×2 avec fondus rotatifs */}
              <div className="relative">
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/40 backdrop-blur px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-ping-slow"/>Best sellers
                  </span>
                  <a className="text-[11px] font-bold text-white/90 hover:text-white cursor-pointer">Voir tout →</a>
                </div>
                <div className="grid grid-cols-3 grid-rows-2 gap-2.5 h-[360px]">
                  {popular.map((p, i) => (
                    <a key={p.id} href="#" className="relative rounded-xl overflow-hidden bg-white/10 backdrop-blur border border-white/20 fade-rotate hover:scale-[1.02] transition-transform" style={{animationDelay: `${i * 1.5}s`}}>
                      <img src={p.img} className="absolute inset-0 h-full w-full object-cover opacity-90"/>
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent"/>
                      <div className="absolute top-1.5 left-1.5">
                        {p.hasGroup ? (
                          <span className="inline-flex items-center gap-0.5 rounded bg-violet-500 text-white px-1.5 py-0.5 text-[9px] font-extrabold">GROUPE</span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded bg-amber-500 text-slate-900 px-1.5 py-0.5 text-[9px] font-extrabold">MIN {p.moq}</span>
                        )}
                      </div>
                      <div className="absolute bottom-1.5 left-1.5 right-1.5">
                        <p className="text-[9px] text-white/70 uppercase tracking-wider truncate">{p.cat}</p>
                        <p className="text-[11px] font-bold text-white truncate">{p.name.split(" ").slice(0, 3).join(" ")}</p>
                        <p className="text-[13px] font-extrabold text-emerald-300 tabular-nums">{fmtFCFA(p.price)}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ticker "En direct · Groupes en cours" */}
          <div className="bg-slate-900 border-t border-white/10">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0 pl-6 py-4 border-r border-white/10 pr-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 whitespace-nowrap flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping-slow"/>🔥 En direct
                </p>
                <p className="text-[13px] font-extrabold text-white whitespace-nowrap">Groupes en cours</p>
              </div>
              <div className="relative flex-1 overflow-hidden ticker-container">
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-r from-slate-900 to-transparent"/>
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-l from-slate-900 to-transparent"/>
                <div className="ticker-left flex gap-3 py-3 pr-3 w-max">
                  {[...GROUPS, ...GROUPS].map((g, i) => {
                    const pct = Math.round((g.currentQty / g.targetQty) * 100);
                    const almost = g.status === "almost";
                    return (
                      <a key={i} href="#" className="flex-shrink-0 flex items-center gap-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 p-2 w-[260px] transition-colors">
                        <img src={g.image} className="h-11 w-11 rounded-full object-cover flex-shrink-0"/>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-red-400 tabular-nums whitespace-nowrap"><Icon name="clock" size={9} className="inline"/> {g.deadline.split(" ").slice(0,2).join(" ")}</span>
                            <span className="text-[9px] text-slate-500">·</span>
                            <span className="text-[9px] text-emerald-400 font-bold">{pct}%</span>
                          </div>
                          <p className="text-[11px] font-bold text-white truncate">{g.name}</p>
                          <div className="flex items-baseline gap-1 whitespace-nowrap">
                            <span className="text-[13px] font-extrabold text-violet-300 tabular-nums">{fmtFCFA(g.unit)}</span>
                            <span className="text-[9px] text-slate-500 line-through tabular-nums">{fmtFCFA(g.base)}</span>
                          </div>
                        </div>
                        <span className={cx("flex-shrink-0 rounded-md text-white text-[10px] font-bold px-2 py-1 whitespace-nowrap", almost ? "bg-red-500" : "bg-violet-600")}>
                          {almost ? "Presque plein" : "Rejoindre"}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 façons d'importer */}
        <div className="mt-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">3 façons d'importer avec DDM+</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: "camera", tone: "violet", tag: "01 · Sourcing", ttl: "Trouvez-moi 24h", sub: "Photo, lien ou description — devis garanti sous 24h ouvrées par notre équipe en Chine.", cta: "Envoyer une demande" },
              { icon: "users", tone: "emerald", tag: "02 · Groupes", ttl: "Achats groupés", sub: "Rejoignez ou créez un groupe. Plus on est nombreux, plus le prix baisse — jusqu'à -45%.", cta: "Voir les groupes actifs" },
              { icon: "package", tone: "amber", tag: "03 · Lot minimum", ttl: "Prix par palier", sub: "Le prix baisse par tranche. Simulez votre lot en un clic pour voir votre économie.", cta: "Calculer mon lot" },
            ].map((b, i) => {
              const toneMap = {
                violet: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
                emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
                amber: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
              };
              const ctaTone = {
                violet: "text-violet-700 dark:text-violet-300",
                emerald: "text-emerald-700 dark:text-emerald-400",
                amber: "text-amber-700 dark:text-amber-300",
              };
              return (
                <Card key={i} className="cursor-pointer p-5 hover:shadow-md transition-shadow group">
                  <div className="mb-3 flex items-center justify-between">
                    <span className={cx("grid h-12 w-12 place-items-center rounded-xl", toneMap[b.tone])}>
                      <Icon name={b.icon} size={22}/>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{b.tag}</span>
                  </div>
                  <h3 className="text-[18px] font-extrabold text-slate-900 dark:text-white tracking-tight">{b.ttl}</h3>
                  <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">{b.sub}</p>
                  <div className={cx("mt-4 inline-flex items-center gap-1 text-[13px] font-bold group-hover:gap-2 transition-all", ctaTone[b.tone])}>
                    {b.cta} <Icon name="arrowRight" size={14}/>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Catégories */}
        <div className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[20px] font-extrabold tracking-tight text-slate-900 dark:text-white">Catégories</h2>
            <a className="text-[13px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">Toutes →</a>
          </div>
          <div className="grid grid-cols-8 gap-3">
            {CATEGORIES.map((c) => (
              <button key={c.key} className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Icon name={c.icon} size={18}/>
                </span>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-tight">{c.label}</span>
                <span className="text-[9px] font-semibold text-slate-400 tabular-nums">{c.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sourcing + MOQ side-by-side */}
        <div className="mt-10 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-violet-50 p-6 dark:border-violet-900 dark:from-violet-950/40 dark:via-slate-900 dark:to-violet-950/40">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-600 text-white"><Icon name="camera" size={20}/></span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-700 dark:text-violet-300">Sourcing sur demande</p>
                <h3 className="text-[20px] font-extrabold text-slate-900 dark:text-white tracking-tight">Trouvez-moi ce produit en 24h</h3>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">Vous ne trouvez pas votre produit ? Notre équipe le trouve pour vous. Envoyez une photo, un lien ou une description.</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { n: 1, ttl: "Envoyez", sub: "Photo, lien ou texte" },
                { n: 2, ttl: "Recevez", sub: "Devis en 24h" },
                { n: 3, ttl: "Commandez", sub: "On gère l'import" },
              ].map((s) => (
                <div key={s.n} className="rounded-xl bg-white/70 p-3 text-center dark:bg-slate-900/70">
                  <p className="text-[11px] font-extrabold text-violet-700 dark:text-violet-300">0{s.n}</p>
                  <p className="mt-1 text-[13px] font-bold text-slate-900 dark:text-white">{s.ttl}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.sub}</p>
                </div>
              ))}
            </div>
            <button className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-violet-700">
              <Icon name="camera" size={14}/>Photographier un produit
            </button>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/40">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500 text-white"><Icon name="boxes" size={20}/></span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">Lot minimum</p>
                <h3 className="text-[20px] font-extrabold text-slate-900 dark:text-white tracking-tight">Pourquoi commander en quantité ?</h3>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">Le prix baisse par palier. Plus vous commandez, plus vous économisez — le fournisseur négocie mieux à volume.</p>
            <div className="mt-4 space-y-1.5">
              {[
                { qty: "1-4 pcs", price: "Prix local", indicator: "×", bg: "" },
                { qty: "5-9 pcs", price: "-13%", indicator: "✓", bg: "" },
                { qty: "10-24 pcs", price: "-25%", indicator: "✓", bg: "bg-white shadow-sm dark:bg-slate-900" },
                { qty: "25+ pcs", price: "-40%", indicator: "🔥", bg: "" },
              ].map((t, i) => (
                <div key={i} className={cx("flex items-center justify-between rounded-lg px-3 py-2", t.bg)}>
                  <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{t.indicator} {t.qty}</span>
                  <span className={cx("text-[15px] font-extrabold tabular-nums", t.indicator === "×" ? "text-slate-400" : "text-emerald-600 dark:text-emerald-400")}>{t.price}</span>
                </div>
              ))}
            </div>
            <button className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-amber-600">
              <Icon name="boxes" size={14}/>Voir les produits éligibles
            </button>
          </div>
        </div>

        {/* Populaires */}
        <div className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[20px] font-extrabold tracking-tight text-slate-900 dark:text-white">🔥 Populaires cette semaine</h2>
            <a className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap cursor-pointer">Voir tous →</a>
          </div>
          <div className="grid grid-cols-6 gap-3">
            {CATALOG.slice(0, 6).map((p) => <ProductCard key={p.id} p={p} size="lg"/>)}
          </div>
        </div>

        {/* Trust */}
        <div className="mt-10">
          <TrustStrip/>
        </div>

        {/* Testimonials */}
        <div className="mt-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[20px] font-extrabold tracking-tight text-slate-900 dark:text-white">Ils nous font confiance</h2>
            <a className="text-[13px] font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">Tous les avis →</a>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <Card key={t.initials} className="p-5">
                <div className="mb-3 flex text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" size={14} strokeWidth={0} className={i < t.rating ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"}/>)}
                </div>
                <p className="text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">« {t.quote} »</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 text-[12px] font-extrabold text-white">{t.initials}</span>
                  <div>
                    <p className="text-[13px] font-bold text-slate-900 dark:text-white">{t.handle}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-14 border-t border-slate-200 pt-6 pb-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white"><span className="text-emerald-600">DDM</span>+</p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Import direct Chine → Sénégal · Escrow Mobile Money · Support 7j/7</p>
            </div>
            <div className="flex gap-4 text-[12px] text-slate-500 dark:text-slate-400">
              <a>À propos</a><a>Contact</a><a>CGU</a><a>Confidentialité</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.ScreenHome = ScreenHome;
