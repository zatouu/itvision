// ============================================================
// SCREEN — HOME MARKETPLACE
// ============================================================
const ScreenHome = ({ device = "mobile" }) => {
  const popular = [
    { id: "cam", name: "Caméra IP dôme extérieure 4MP", price: 18900, base: 28500, moq: 5, img: "assets/img/product-camera.jpg", cat: "Sécurité", rating: 4.7 },
    { id: "ear", name: "Écouteurs sans fil TWS Pro", price: 8900, base: 15100, moq: 5, img: "assets/img/product-earbuds.jpg", cat: "Audio", rating: 4.5 },
    { id: "led", name: "Ruban LED RGB COB 5m", price: 4200, base: 7000, moq: 10, img: "assets/img/product-led.jpg", cat: "Éclairage", rating: 4.8 },
    { id: "car", name: "Support MagSafe voiture 15W", price: 6800, base: 11200, moq: 6, img: "assets/img/product-carmount.jpg", cat: "Auto", rating: 4.6 },
    { id: "wat", name: "Montre connectée fitness IP68", price: 12500, base: 19000, moq: 3, img: "assets/img/product-watch.jpg", cat: "Objets connectés", rating: 4.4 },
    { id: "bag", name: "Sac cabas cuir synthétique", price: 9200, base: 12800, moq: 4, img: "assets/img/product-bag.jpg", cat: "Mode", rating: 4.3 },
  ];

  const cats = [
    { label: "Sécurité", icon: "shield" },
    { label: "Audio", icon: "message" },
    { label: "Éclairage", icon: "sparkles" },
    { label: "Auto", icon: "truck" },
    { label: "Mode", icon: "gift" },
    { label: "Maison", icon: "home" },
    { label: "Beauté", icon: "heart" },
    { label: "Bureau", icon: "package" },
  ];

  const ProductCard = ({ p, size = "sm" }) => (
    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
      <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
        <img src={p.img} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"/>
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          <Badge tone="amber"><Icon name="package" size={10}/>Min. {p.moq}</Badge>
        </div>
        <div className="absolute right-2 top-2">
          <span className="inline-flex items-center gap-0.5 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            -{Math.round((1 - p.price / p.base) * 100)}%
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
        {/* Search bar mobile (dans le body, sous le header) */}
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
          {/* HERO carousel */}
          <div className="relative overflow-hidden">
            <div className="relative m-4 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-violet-700 to-emerald-600 p-5 text-white shadow-sm">
              <div className="absolute inset-0 opacity-15">
                <svg viewBox="0 0 400 200" className="h-full w-full">
                  <defs><pattern id="dotshero" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="white"/></pattern></defs>
                  <rect width="400" height="200" fill="url(#dotshero)"/>
                </svg>
              </div>
              <div className="relative">
                <Badge tone="ink" className="!text-white !bg-white/15 !border-white/25"><Icon name="flame" size={11}/>Nouveaux drops</Badge>
                <h1 className="mt-2 text-[24px] font-extrabold leading-[1.05] tracking-tight">Importez de Chine,<br/>à <span className="text-emerald-300">prix usine</span>.</h1>
                <p className="mt-1.5 text-[12px] leading-snug text-white/85">Sourcing, achats groupés et lots avantageux — livrés au Sénégal.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-1 text-[10px] font-semibold whitespace-nowrap"><Icon name="camera" size={11}/>Trouvez-moi 24h</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-1 text-[10px] font-semibold whitespace-nowrap"><Icon name="users" size={11}/>Achats groupés</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-1 text-[10px] font-semibold whitespace-nowrap"><Icon name="package" size={11}/>Lot minimum</span>
                </div>
                <button className="mt-4 inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-[12px] font-bold text-slate-900 hover:bg-slate-100">
                  Explorer le catalogue <Icon name="arrowRight" size={13}/>
                </button>
              </div>
            </div>
            {/* pagination indicators */}
            <div className="mb-1 flex items-center justify-center gap-1">
              <span className="h-1 w-6 rounded-full bg-slate-900 dark:bg-white"/>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700"/>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700"/>
            </div>
          </div>

          {/* 3 FEATURE BANNERS */}
          <div className="mt-2 px-4 space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">3 façons d'importer</p>
            {[
              { icon: "camera", tone: "violet", tag: "01 · Sourcing", ttl: "Trouvez-moi ce produit en 24h", sub: "Photo, lien ou description → devis garanti sous 24h ouvrées.", cta: "Envoyer une demande" },
              { icon: "users", tone: "emerald", tag: "02 · Groupes", ttl: "Rejoignez un achat groupé", sub: "Plus on est nombreux, moins c'est cher — jusqu'à -45%.", cta: "Voir les groupes actifs" },
              { icon: "package", tone: "amber", tag: "03 · Lot minimum", ttl: "Débloquez le prix par palier", sub: "À partir de X unités, économisez jusqu'à -40%.", cta: "Calculer mon lot" },
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

          {/* CATEGORIES */}
          <Section title="Catégories" className="mt-6">
            <div className="grid grid-cols-4 gap-2">
              {cats.map((c) => (
                <button key={c.label} className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Icon name={c.icon} size={16}/>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-tight">{c.label}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* GROUPES ACTIFS */}
          <Section
            title="🔥 Groupes en cours"
            subtitle="Rejoignez avant la deadline — le prix baisse"
            className="mt-6"
            right={<a className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">Voir tout</a>}
          >
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
              {GROUPS.slice(0, 4).map((g) => {
                const pct = Math.round((g.currentQty / g.targetQty) * 100);
                return (
                  <Card key={g.id} className="flex-shrink-0 snap-start w-[160px] overflow-hidden cursor-pointer">
                    <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                      <img src={g.image} alt="" className="h-full w-full object-cover"/>
                      <div className="absolute top-2 left-2">
                        {g.status === "almost" ? (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white"><Icon name="flame" size={9}/>Presque plein</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-bold text-slate-900 dark:bg-slate-900/95 dark:text-white"><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping-slow"/>Live</span>
                        )}
                      </div>
                    </div>
                    <div className="p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{g.category}</p>
                        <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-[9px] font-bold text-red-600 dark:text-red-400 tabular-nums"><Icon name="clock" size={9}/>{g.deadline.split(" ").slice(0,2).join(" ")}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 min-h-[28px] text-[11px] font-extrabold leading-tight text-slate-900 dark:text-white">{g.name}</p>
                      <div className="mt-1.5">
                        <ProgressBar value={g.currentQty} max={g.targetQty} tone="mixed" className="!h-1"/>
                        <div className="mt-0.5 flex justify-between text-[9px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                          <span><b className="text-slate-900 dark:text-white">{g.currentQty}</b>/{g.targetQty}</span>
                          <span>{pct}%</span>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-baseline gap-1 whitespace-nowrap">
                        <span className="text-[13px] font-extrabold text-violet-700 dark:text-violet-300 tabular-nums">{fmtFCFA(g.unit)}</span>
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">-{g.save}%</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Section>

          {/* SOURCING SECTION */}
          <div className="mt-6 mx-4">
            <div className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-violet-50 p-4 dark:border-violet-900 dark:from-violet-950/40 dark:via-slate-900 dark:to-violet-950/40">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white"><Icon name="camera" size={16}/></span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">Sourcing sur demande</p>
                  <p className="text-[14px] font-extrabold text-slate-900 dark:text-white leading-tight">Trouvez-moi ce produit en 24h</p>
                </div>
              </div>
              <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-400 leading-snug">Vous ne trouvez pas votre produit ? Notre équipe de sourceurs en Chine le trouve pour vous.</p>
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
                <Icon name="camera" size={14}/>
                Photographier un produit
              </button>
            </div>
          </div>

          {/* POURQUOI COMMANDER EN QUANTITÉ */}
          <div className="mt-6 mx-4">
            <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500 text-white"><Icon name="boxes" size={16}/></span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Lot minimum</p>
                  <p className="text-[14px] font-extrabold text-slate-900 dark:text-white leading-tight">Pourquoi commander en quantité ?</p>
                </div>
              </div>
              <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-400 leading-snug">Le prix baisse par palier. Plus vous commandez, plus vous économisez — le fournisseur négocie mieux.</p>

              <div className="mt-3 space-y-1.5">
                {[
                  { qty: "1-4 pcs", price: "Prix local", indicator: "×" },
                  { qty: "5-9 pcs", price: "-13%", indicator: "✓" },
                  { qty: "10-24 pcs", price: "-25%", indicator: "✓", highlight: true },
                  { qty: "25+ pcs", price: "-40%", indicator: "🔥" },
                ].map((t, i) => (
                  <div key={i} className={cx(
                    "flex items-center justify-between rounded-lg px-3 py-1.5",
                    t.highlight ? "bg-white dark:bg-slate-900 shadow-sm" : ""
                  )}>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{t.indicator} {t.qty}</span>
                    <span className={cx(
                      "text-[13px] font-extrabold tabular-nums",
                      t.indicator === "×" ? "text-slate-400" : "text-emerald-600 dark:text-emerald-400"
                    )}>{t.price}</span>
                  </div>
                ))}
              </div>

              <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-[13px] font-bold text-white hover:bg-amber-600">
                <Icon name="boxes" size={14}/>
                Voir les produits éligibles
              </button>
            </div>
          </div>

          {/* POPULAIRES */}
          <Section
            title="🔥 Populaires cette semaine"
            className="mt-6"
            right={<a className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">Voir tout</a>}
          >
            <div className="grid grid-cols-2 gap-3">
              {popular.map((p) => <ProductCard key={p.id} p={p}/>)}
            </div>
          </Section>

          {/* TRUST STRIP */}
          <div className="mt-6 px-4">
            <TrustStrip compact/>
          </div>

          {/* TESTIMONIALS */}
          <Section title="Ils nous font confiance" className="mt-6">
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {[
                { i: "AD", n: "Amadou Diallo", r: "PDG, TechSupplies SN", q: "On a réduit nos coûts d'import de 40%. La recherche par photo est magique." },
                { i: "FN", n: "Fatima Ndiaye", r: "Responsable achats, SécurPro", q: "Livraison en 3j comme promis. Le suivi en temps réel et le support réactif rassurent." },
                { i: "OS", n: "Omar Sow", r: "Entrepreneur, Dakar", q: "200 caméras via achat groupé — 30% moins cher que mon ancien fournisseur français." },
              ].map((t) => (
                <Card key={t.i} className="flex-shrink-0 w-[260px] p-4">
                  <div className="mb-2 flex text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" size={13} strokeWidth={0} className="fill-amber-500"/>)}
                  </div>
                  <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">« {t.q} »</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 text-[10px] font-extrabold text-white">{t.i}</span>
                    <div>
                      <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight">{t.n}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{t.r}</p>
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

  // ================ DESKTOP ================
  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <MarketHeader device={device}/>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-700 to-emerald-600 p-10 text-white shadow-sm">
          <div className="absolute inset-0 opacity-15">
            <svg viewBox="0 0 800 300" className="h-full w-full">
              <defs><pattern id="dotsherod" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="white"/></pattern></defs>
              <rect width="800" height="300" fill="url(#dotsherod)"/>
            </svg>
          </div>
          <div className="relative grid grid-cols-[1.3fr_1fr] items-center gap-8">
            <div>
              <Badge tone="ink" className="!text-white !bg-white/15 !border-white/25"><Icon name="flame" size={11}/>Nouveaux drops chaque semaine</Badge>
              <h1 className="mt-3 text-[52px] font-extrabold leading-[1] tracking-tight">Importez de Chine,<br/>à <span className="text-emerald-300">prix usine</span>.</h1>
              <p className="mt-3 max-w-md text-[15px] text-white/85 leading-snug">Sourcing dédié, achats groupés et lots avantageux — livrés au Sénégal en 4-45 jours selon votre choix.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap"><Icon name="camera" size={13}/>Trouvez-moi 24h</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap"><Icon name="users" size={13}/>Achats groupés −45%</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap"><Icon name="package" size={13}/>Prix par palier</span>
              </div>
              <div className="mt-6 flex gap-3">
                <button className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[14px] font-bold text-slate-900 hover:bg-slate-100 shadow-sm">
                  Explorer le catalogue <Icon name="arrowRight" size={16}/>
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/25 px-5 py-3 text-[14px] font-bold text-white hover:bg-white/20">
                  <Icon name="camera" size={16}/>Trouvez-moi
                </button>
              </div>
            </div>
            <div className="relative h-[280px]">
              <div className="absolute right-0 top-0 w-[150px] rounded-2xl bg-white/10 border border-white/20 p-3 backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-white/70">Groupes actifs</p>
                <p className="mt-1 text-[26px] font-extrabold tabular-nums">2 143</p>
                <p className="mt-1 text-[10px] font-bold text-emerald-300">↗ +42% vs S36</p>
              </div>
              <div className="absolute right-16 top-[110px] w-[150px] rounded-2xl bg-white/10 border border-white/20 p-3 backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-white/70">Éco. moyenne</p>
                <p className="mt-1 text-[26px] font-extrabold">-35%</p>
                <p className="mt-1 text-[10px] text-white/70">En achat groupé</p>
              </div>
              <div className="absolute right-0 top-[210px] w-[150px] rounded-2xl bg-white/10 border border-white/20 p-3 backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-white/70">Devis moyen</p>
                <p className="mt-1 text-[26px] font-extrabold tabular-nums">18h</p>
                <p className="mt-1 text-[10px] text-white/70">Sourcing Chine</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3 FEATURE BANNERS */}
        <div className="mt-8">
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

        {/* CATEGORIES */}
        <div className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[20px] font-extrabold tracking-tight text-slate-900 dark:text-white">Catégories</h2>
            <a className="text-[13px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Toutes →</a>
          </div>
          <div className="grid grid-cols-8 gap-3">
            {cats.map((c) => (
              <button key={c.label} className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Icon name={c.icon} size={18}/>
                </span>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-tight">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* GROUPES ACTIFS */}
        <div className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <h2 className="text-[20px] font-extrabold tracking-tight text-slate-900 dark:text-white">🔥 Groupes en cours</h2>
              <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">Rejoignez avant la deadline — plus vous êtes, plus le prix baisse.</p>
            </div>
            <a className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">Voir tous →</a>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {GROUPS.slice(0, 4).map((g) => {
              const pct = Math.round((g.currentQty / g.targetQty) * 100);
              return (
                <Card key={g.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow group">
                  <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img src={g.image} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                    <div className="absolute top-2 left-2">
                      {g.status === "almost" ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white"><Icon name="flame" size={10}/>Presque plein</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-bold text-slate-900 dark:bg-slate-900/95 dark:text-white"><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping-slow"/>Live</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{g.category}</p>
                      <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-[10px] font-bold text-red-600 dark:text-red-400 tabular-nums"><Icon name="clock" size={10}/>{g.deadline.split(" ").slice(0,2).join(" ")}</span>
                    </div>
                    <p className="mt-1 text-[13px] font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight min-h-[34px]">{g.name}</p>
                    <div className="mt-2">
                      <ProgressBar value={g.currentQty} max={g.targetQty} tone="mixed" className="!h-1.5"/>
                      <div className="mt-1 flex justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                        <span><b className="text-slate-900 dark:text-white">{g.currentQty}</b>/{g.targetQty} pcs</span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5 whitespace-nowrap">
                      <span className="text-[16px] font-extrabold text-violet-700 dark:text-violet-300 tabular-nums">{fmtFCFA(g.unit)}</span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">-{g.save}%</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* SOURCING + MOQ side-by-side */}
        <div className="mt-10 grid grid-cols-2 gap-4">
          {/* Sourcing */}
          <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-violet-50 p-6 dark:border-violet-900 dark:from-violet-950/40 dark:via-slate-900 dark:to-violet-950/40">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-600 text-white"><Icon name="camera" size={20}/></span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-700 dark:text-violet-300">Sourcing sur demande</p>
                <h3 className="text-[20px] font-extrabold text-slate-900 dark:text-white tracking-tight">Trouvez-moi ce produit en 24h</h3>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">Vous ne trouvez pas votre produit ? Notre équipe de sourceurs en Chine le trouve pour vous. Envoyez une photo, un lien ou une description — recevez un devis sous 24h ouvrées.</p>
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

          {/* MOQ */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/40">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500 text-white"><Icon name="boxes" size={20}/></span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">Lot minimum</p>
                <h3 className="text-[20px] font-extrabold text-slate-900 dark:text-white tracking-tight">Pourquoi commander en quantité ?</h3>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">Le prix baisse par palier. Plus vous commandez, plus vous économisez — le fournisseur négocie mieux à volume et les frais fixes deviennent négligeables.</p>
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

        {/* POPULAIRES */}
        <div className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[20px] font-extrabold tracking-tight text-slate-900 dark:text-white">🔥 Populaires cette semaine</h2>
            <a className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">Voir tous →</a>
          </div>
          <div className="grid grid-cols-6 gap-3">
            {popular.map((p) => <ProductCard key={p.id} p={p} size="lg"/>)}
          </div>
        </div>

        {/* TRUST */}
        <div className="mt-10">
          <TrustStrip/>
        </div>

        {/* TESTIMONIALS */}
        <div className="mt-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[20px] font-extrabold tracking-tight text-slate-900 dark:text-white">Ils nous font confiance</h2>
            <a className="text-[13px] font-semibold text-slate-600 dark:text-slate-400">Tous les avis →</a>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { i: "AD", n: "Amadou Diallo", r: "PDG, TechSupplies SN", q: "On a réduit nos coûts d'import de 40%. La recherche par photo est magique, on trouve des produits qu'aucun fournisseur local n'a." },
              { i: "FN", n: "Fatima Ndiaye", r: "Responsable achats, SécurPro", q: "Livraison en 3j comme promis. Le suivi en temps réel et le support réactif nous rassurent à chaque commande." },
              { i: "OS", n: "Omar Sow", r: "Entrepreneur, Dakar", q: "J'ai importé 200 caméras via achat groupé. J'ai payé 30% moins cher que mon ancien fournisseur français." },
            ].map((t) => (
              <Card key={t.i} className="p-5">
                <div className="mb-3 flex text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" size={14} strokeWidth={0} className="fill-amber-500"/>)}
                </div>
                <p className="text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">« {t.q} »</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 text-[12px] font-extrabold text-white">{t.i}</span>
                  <div>
                    <p className="text-[13px] font-bold text-slate-900 dark:text-white">{t.n}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.r}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer minimal */}
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
