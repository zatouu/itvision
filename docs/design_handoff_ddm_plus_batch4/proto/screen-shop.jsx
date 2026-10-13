// ============================================================
// SCREEN — BOUTIQUE / VENDEUR (/vendeur/[slug] · /boutiques/[shopId])
// ============================================================
const ScreenShop = ({ device = "mobile" }) => {
  const [shopKey, setShopKey] = React.useState("factory"); // toggle demo
  const shop = SHOPS[shopKey];
  const [tab, setTab] = React.useState("products");
  const [catFilter, setCatFilter] = React.useState("Tous");

  const cats = ["Tous", ...new Set(shop.products.map(p => p.cat))];
  const products = catFilter === "Tous" ? shop.products : shop.products.filter(p => p.cat === catFilter);

  const ProductCard = ({ p }) => (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 hover:shadow-md transition-shadow cursor-pointer group">
      <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <img src={p.img} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"/>
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          <Badge tone="amber"><Icon name="package" size={10}/>Min. {p.moq}</Badge>
          {p.hasGroup && <Badge tone="violet"><Icon name="users" size={10}/>Groupe</Badge>}
        </div>
        <div className="absolute right-2 top-2">
          <span className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">-{p.save}%</span>
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{p.cat}</p>
        <p className="mt-0.5 text-[12px] font-semibold text-slate-900 dark:text-white line-clamp-2 leading-tight min-h-[30px]">{p.name}</p>
        <div className="mt-1.5 flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-[14px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtFCFA(p.price)}</span>
          <span className="text-[10px] font-semibold text-slate-400 line-through tabular-nums">{fmtFCFA(p.base)}</span>
        </div>
      </div>
    </div>
  );

  const Reviews = () => (
    <div className="space-y-3">
      {shop.reviews.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-8 text-center">
          <div className="grid h-16 w-16 mx-auto place-items-center rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
            <Icon name="star" size={24} className="text-slate-400"/>
          </div>
          <p className="text-[14px] font-extrabold text-slate-900 dark:text-white">Aucun avis pour le moment</p>
          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Soyez le premier à donner votre avis après votre achat.</p>
        </div>
      ) : shop.reviews.map((r, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 text-[11px] font-extrabold text-white">{r.initials}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-slate-900 dark:text-white">{r.handle}</p>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                <div className="flex text-amber-500">
                  {Array.from({length: 5}).map((_, ii) => <Icon key={ii} name="star" size={10} strokeWidth={0} className={ii < r.rating ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"}/>)}
                </div>
                <span>·</span><span>{r.date}</span>
              </div>
            </div>
          </div>
          <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">« {r.text} »</p>
        </div>
      ))}
    </div>
  );

  const About = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 md:p-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">À propos</p>
        <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">{shop.description}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Produits</p>
          <p className="mt-1 text-[18px] font-extrabold tabular-nums text-slate-900 dark:text-white">{shop.productCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Note</p>
          <p className="mt-1 text-[18px] font-extrabold tabular-nums text-slate-900 dark:text-white">{shop.rating}<span className="text-[11px] text-slate-500 dark:text-slate-400">/5</span></p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Réponse</p>
          <p className="mt-1 text-[18px] font-extrabold text-emerald-600 dark:text-emerald-400">{shop.responseTime}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">À l'heure</p>
          <p className="mt-1 text-[18px] font-extrabold tabular-nums text-slate-900 dark:text-white">{shop.onTimeRate}%</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 md:p-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Certifications</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[12px] text-slate-700 dark:text-slate-300">
            <Icon name="shield" size={14} className="text-emerald-600 dark:text-emerald-400"/>
            {shop.type === "factory" ? "Inspection trimestrielle DDM+" : "Adresse et pièces vérifiées par DDM+"}
          </div>
          <div className="flex items-center gap-2 text-[12px] text-slate-700 dark:text-slate-300">
            <Icon name="checkCircle" size={14} className="text-emerald-600 dark:text-emerald-400"/>
            Escrow paiement inclus
          </div>
          {shop.type === "factory" && (
            <div className="flex items-center gap-2 text-[12px] text-slate-700 dark:text-slate-300">
              <Icon name="factory" size={14} className="text-emerald-600 dark:text-emerald-400"/>
              Contrôle qualité avant expédition
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 md:p-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Localisation</p>
        <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900 dark:text-white">
          <Icon name="mapPin" size={16} className="text-slate-500 dark:text-slate-400"/>
          {shop.location}
        </div>
      </div>
    </div>
  );

  const Conditions = () => (
    <div className="space-y-3">
      {[
        { icon: "refresh", ttl: "Politique de retour", txt: "Retour possible sous 7 jours pour tout produit défectueux ou non conforme. Contact via WhatsApp ou centre d'aide." },
        { icon: "truck", ttl: "Livraison", txt: "Express aérien 4-7j, Standard aérien 8-12j, Maritime 35-45j. Suivi en temps réel via DDM+." },
        { icon: "wallet", ttl: "Paiement", txt: "Wave, Orange Money, Free Money, virement. Escrow inclus : le vendeur est payé uniquement après réception validée." },
        { icon: "shield", ttl: "Garantie", txt: "Garantie fabricant 12 mois sur l'électronique. Support DDM+ pour toute réclamation." },
      ].map((c) => (
        <div key={c.ttl} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><Icon name={c.icon} size={16}/></span>
            <div>
              <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">{c.ttl}</p>
              <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">{c.txt}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const HeaderShop = ({ compact = false }) => (
    <div className={cx("relative overflow-hidden text-white bg-gradient-to-br", shop.coverGradient, compact ? "px-4 pt-4 pb-5" : "px-6 md:px-10 pt-8 pb-8 rounded-3xl")}>
      <div className="absolute inset-0 opacity-15">
        <svg viewBox="0 0 800 200" className="h-full w-full"><defs><pattern id={"dots-shop-"+shopKey} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="white"/></pattern></defs><rect width="800" height="200" fill={"url(#dots-shop-"+shopKey+")"}/></svg>
      </div>
      <div className="relative flex items-start gap-3 md:gap-5">
        <span className={cx("grid flex-shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur border border-white/20 text-white font-extrabold", compact ? "h-14 w-14 text-[18px]" : "h-20 w-20 text-[24px]")}>
          {shop.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {shop.type === "factory" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 border border-white/25 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"><Icon name="factory" size={10}/>Inspecté par DDM+</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 border border-white/25 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"><Icon name="mapPin" size={10}/>Partenaire local</span>
            )}
            {shop.verified && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/25 border border-emerald-300/40 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"><Icon name="checkCircle" size={10}/>Vérifié</span>}
          </div>
          <h1 className={cx("font-extrabold tracking-tight leading-tight", compact ? "text-[20px]" : "text-[32px]")}>{shop.name}</h1>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/85">
            <div className="flex items-center gap-0.5">
              <Icon name="star" size={12} strokeWidth={0} className="fill-amber-300 text-amber-300"/>
              <span className="font-bold tabular-nums">{shop.rating}</span>
              <span className="text-white/70">({shop.reviewCount})</span>
            </div>
            <span className="text-white/50">·</span>
            <span>{shop.yearsActive} ans</span>
            <span className="text-white/50">·</span>
            <span className="truncate">{shop.location}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {shop.categories.map(c => (
              <span key={c} className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">{c}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const TypeToggle = () => (
    <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
      <button onClick={() => setShopKey("factory")} className={cx("flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-colors", shopKey === "factory" ? "bg-white shadow-sm text-slate-900 dark:bg-slate-950 dark:text-white" : "text-slate-500 dark:text-slate-400")}>
        <Icon name="factory" size={12} className="inline mr-1"/>Usine
      </button>
      <button onClick={() => setShopKey("partner")} className={cx("flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-colors", shopKey === "partner" ? "bg-white shadow-sm text-slate-900 dark:bg-slate-950 dark:text-white" : "text-slate-500 dark:text-slate-400")}>
        <Icon name="store" size={12} className="inline mr-1"/>Partenaire
      </button>
    </div>
  );

  const tabs = [
    { k: "products", l: "Produits", count: shop.productCount },
    { k: "reviews", l: "Avis", count: shop.reviewCount },
    { k: "about", l: "À propos" },
    { k: "conditions", l: "Conditions" },
  ];

  // ==================== MOBILE ====================
  if (device === "mobile") {
    return (
      <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
        <MarketHeader device={device} back={() => {}} title={shop.name}/>

        {/* Demo toggle - visible seulement dans le proto */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 whitespace-nowrap">Démo :</span>
            <div className="flex-1"><TypeToggle/></div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-24">
          <HeaderShop compact/>

          {/* Tabs */}
          <div className="sticky top-0 z-10 flex overflow-x-auto border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-1">
            {tabs.map(t => (
              <button key={t.k} onClick={() => setTab(t.k)} className={cx(
                "flex-shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-[12px] font-bold",
                tab === t.k ? "border-emerald-600 text-emerald-700 dark:text-emerald-400" : "border-transparent text-slate-500 dark:text-slate-400"
              )}>
                {t.l}{t.count !== undefined && <span className="ml-1 tabular-nums text-[10px] opacity-70">({t.count})</span>}
              </button>
            ))}
          </div>

          <div className="p-4">
            {tab === "products" && (
              <React.Fragment>
                <div className="flex gap-1.5 overflow-x-auto mb-3 pb-1 -mx-4 px-4">
                  {cats.map(c => (
                    <button key={c} onClick={() => setCatFilter(c)} className={cx("flex-shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap", catFilter === c ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-white border border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300")}>{c}</button>
                  ))}
                </div>
                <p className="mb-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400"><b className="text-slate-900 dark:text-white tabular-nums">{products.length}</b> produit{products.length > 1 ? "s" : ""}</p>
                <div className="grid grid-cols-2 gap-3">
                  {products.map(p => <ProductCard key={p.id} p={p}/>)}
                </div>
              </React.Fragment>
            )}
            {tab === "reviews" && <Reviews/>}
            {tab === "about" && <About/>}
            {tab === "conditions" && <Conditions/>}
          </div>
        </div>

        {/* Sticky bottom CTA */}
        <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex gap-2">
            <Button variant="secondary" size="md" className="flex-1"><Icon name="whatsapp" size={14}/>Contacter</Button>
            <Button variant="primary" size="md" className="flex-1"><Icon name="grid" size={14}/>Voir produits</Button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== DESKTOP ====================
  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <MarketHeader device={device}/>

      {/* Demo toggle */}
      <div className="border-b border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900/50">
        <div className="mx-auto max-w-6xl px-6 py-2 flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">Démo : choisir le type de vendeur à afficher</span>
          <div className="w-64"><TypeToggle/></div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <a className="cursor-pointer">Accueil</a><Icon name="chevronRight" size={12}/><a className="cursor-pointer">Boutiques</a><Icon name="chevronRight" size={12}/><span className="text-slate-700 dark:text-slate-300">{shop.name}</span>
        </div>

        <HeaderShop/>

        {/* Tabs + main content */}
        <div className="mt-6 grid grid-cols-[1fr_320px] gap-6">
          <div>
            <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 w-fit mb-4">
              {tabs.map(t => (
                <button key={t.k} onClick={() => setTab(t.k)} className={cx(
                  "rounded-lg px-4 py-2 text-[13px] font-bold transition-colors",
                  tab === t.k ? "bg-white shadow-sm text-slate-900 dark:bg-slate-950 dark:text-white" : "text-slate-600 dark:text-slate-400"
                )}>
                  {t.l}{t.count !== undefined && <span className="ml-1 tabular-nums text-[11px] opacity-70">({t.count})</span>}
                </button>
              ))}
            </div>

            {tab === "products" && (
              <React.Fragment>
                <div className="flex items-center gap-2 mb-4">
                  {cats.map(c => (
                    <button key={c} onClick={() => setCatFilter(c)} className={cx("rounded-full px-3.5 py-1.5 text-[12px] font-semibold", catFilter === c ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300")}>{c}</button>
                  ))}
                  <span className="ml-auto text-[12px] text-slate-500 dark:text-slate-400"><b className="text-slate-900 dark:text-white tabular-nums">{products.length}</b> produits</span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {products.map(p => <ProductCard key={p.id} p={p}/>)}
                </div>
              </React.Fragment>
            )}
            {tab === "reviews" && <Reviews/>}
            {tab === "about" && <About/>}
            {tab === "conditions" && <Conditions/>}
          </div>

          {/* Sidebar contact */}
          <aside className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 sticky top-24">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Contact vendeur</p>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><Icon name="clock" size={13} className="text-emerald-600"/>Répond en {shop.responseTime}</div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><Icon name="checkCircle" size={13} className="text-emerald-600"/>{shop.onTimeRate}% livré à l'heure</div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><Icon name="package" size={13} className="text-slate-500"/>{shop.productCount} produits en catalogue</div>
              </div>
              <div className="mt-4 space-y-2">
                <Button variant="primary" size="md" className="!bg-emerald-600 w-full"><Icon name="whatsapp" size={14}/>Contacter le vendeur</Button>
                <Button variant="secondary" size="md" className="w-full"><Icon name="heart" size={14}/>Suivre la boutique</Button>
              </div>
              <p className="mt-3 text-center text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-3">Paiement Escrow protégé par DDM+</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

window.ScreenShop = ScreenShop;
