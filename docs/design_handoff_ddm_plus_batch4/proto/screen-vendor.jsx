// ============================================================
// SCREEN — DEVENIR VENDEUR + ESPACE VENDEUR
// (/devenir-vendeur · /espace-vendeur)
// ============================================================
const ScreenVendor = ({ device = "mobile" }) => {
  const [mode, setMode] = React.useState("landing"); // "landing" | "dashboard"
  const [dashTab, setDashTab] = React.useState("products");

  // === LANDING ===
  const Landing = () => (
    <div className="flex-1 overflow-y-auto">
      {/* Hero */}
      <div className={cx("relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-violet-600 text-white", device === "mobile" ? "px-4 py-7" : "")}>
        <div className="absolute inset-0 opacity-15">
          <svg viewBox="0 0 800 400" className="h-full w-full"><defs><pattern id="dots-vendor" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="white"/></pattern></defs><rect width="800" height="400" fill="url(#dots-vendor)"/></svg>
        </div>

        {device === "mobile" ? (
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3 py-1 text-[11px] font-bold whitespace-nowrap">
              <Icon name="store" size={11}/>Devenez vendeur
            </span>
            <h1 className="mt-3 text-[28px] font-extrabold leading-[1] tracking-tight">Vendez avec <span className="text-emerald-300">DDM+</span>.</h1>
            <p className="mt-2 text-[13px] text-white/85 leading-snug">Importez en groupe, recevez le stock à Dakar, revendez avec marge.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl px-6 py-10 relative grid grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3 py-1 text-[11px] font-bold whitespace-nowrap">
                <Icon name="store" size={12}/>Devenez vendeur
              </span>
              <h1 className="mt-3 text-[44px] font-extrabold leading-[1] tracking-tight">Vendez avec <span className="text-emerald-300">DDM+</span>.</h1>
              <p className="mt-3 max-w-md text-[15px] text-white/85 leading-snug">Importez en groupe, recevez le stock à Dakar, revendez avec marge. On s'occupe de la logistique — vous restez focus sur la vente.</p>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-white/70">Marge type</p>
                  <p className="mt-1 text-[22px] font-extrabold tabular-nums">+45%</p>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-white/70">Setup</p>
                  <p className="mt-1 text-[22px] font-extrabold tabular-nums">10min</p>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-white/70">Commission</p>
                  <p className="mt-1 text-[22px] font-extrabold">0%</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white/10 backdrop-blur border border-white/20 p-6">
              <RegisterForm inHero/>
            </div>
          </div>
        )}
      </div>

      <div className={cx("space-y-6", device === "mobile" ? "p-4" : "mx-auto max-w-6xl px-6 py-8")}>
        {/* 3 étapes */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Comment ça marche</p>
          <h2 className="text-[20px] md:text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-white">3 étapes pour commencer</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { n: 1, icon: "users",   ttl: "Importez en groupe", txt: "Rejoignez un achat groupé DDM+ pour importer au prix usine." },
              { n: 2, icon: "package", ttl: "Recevez le stock",   txt: "Livraison à votre entrepôt ou boutique à Dakar, sous 8-15 jours." },
              { n: 3, icon: "store",   ttl: "Revendez",            txt: "Listez vos produits sur DDM+ et vendez avec votre marge locale." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Icon name={s.icon} size={20}/></span>
                  <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">0{s.n}</span>
                </div>
                <p className="text-[14px] font-extrabold text-slate-900 dark:text-white">{s.ttl}</p>
                <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">{s.txt}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bénéfices */}
        <div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600 text-white"><Icon name="award" size={16}/></span>
              <p className="text-[14px] font-extrabold text-slate-900 dark:text-white">Ce que DDM+ vous apporte</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px] text-slate-700 dark:text-slate-300">
              {[
                "Prix usine sans intermédiaire",
                "Logistique et douane inclues",
                "Assurance transport 2%",
                "Visibilité auprès de 10 000+ clients",
                "Escrow paiement sécurisé",
                "Support WhatsApp 7j/7",
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Icon name="checkCircle" size={13} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0"/>
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form mobile */}
        {device === "mobile" && (
          <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
            <RegisterForm/>
          </div>
        )}

        <button onClick={() => setMode("dashboard")} className="w-full text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 underline pt-2">
          → Voir l'espace vendeur (démo)
        </button>
      </div>
    </div>
  );

  const RegisterForm = ({ inHero = false }) => (
    <div className={cx(inHero && "text-white")}>
      {!inHero && (
        <React.Fragment>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Créer ma boutique</p>
          <p className="text-[15px] font-extrabold text-slate-900 dark:text-white mb-4">Complétez ce formulaire en 2 minutes</p>
        </React.Fragment>
      )}
      {inHero && (
        <React.Fragment>
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-300 mb-1">Commencer maintenant</p>
          <p className="text-[18px] font-extrabold mb-4">Créer ma boutique</p>
        </React.Fragment>
      )}
      <div className="space-y-3">
        <div>
          <label className={cx("text-[11px] font-bold uppercase tracking-wider", inHero ? "text-white/70" : "text-slate-500 dark:text-slate-400")}>Nom de la boutique</label>
          <input placeholder="Boutique Alpha" className={cx("mt-1 h-10 w-full rounded-xl px-3 text-[13px] outline-none",
            inHero ? "bg-white/15 border border-white/25 placeholder-white/50 text-white focus:border-white" : "bg-white border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-emerald-600")}/>
        </div>
        <div>
          <label className={cx("text-[11px] font-bold uppercase tracking-wider", inHero ? "text-white/70" : "text-slate-500 dark:text-slate-400")}>Description</label>
          <textarea rows="2" placeholder="Que vendez-vous ?" className={cx("mt-1 w-full rounded-xl px-3 py-2 text-[13px] outline-none resize-none",
            inHero ? "bg-white/15 border border-white/25 placeholder-white/50 text-white focus:border-white" : "bg-white border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-emerald-600")}/>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={cx("text-[11px] font-bold uppercase tracking-wider", inHero ? "text-white/70" : "text-slate-500 dark:text-slate-400")}>Email</label>
            <input placeholder="vous@exemple.com" className={cx("mt-1 h-10 w-full rounded-xl px-3 text-[13px] outline-none",
              inHero ? "bg-white/15 border border-white/25 placeholder-white/50 text-white focus:border-white" : "bg-white border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-emerald-600")}/>
          </div>
          <div>
            <label className={cx("text-[11px] font-bold uppercase tracking-wider", inHero ? "text-white/70" : "text-slate-500 dark:text-slate-400")}>Téléphone</label>
            <input placeholder="+221 77 000 00 00" className={cx("mt-1 h-10 w-full rounded-xl px-3 text-[13px] outline-none tabular-nums",
              inHero ? "bg-white/15 border border-white/25 placeholder-white/50 text-white focus:border-white" : "bg-white border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-emerald-600")}/>
          </div>
        </div>
      </div>
      <Button variant="primary" size="lg" className={cx("w-full mt-4", inHero && "!bg-white !text-emerald-700 hover:!bg-slate-100")}>
        <Icon name="store" size={16}/>Créer ma boutique
      </Button>
      <p className={cx("mt-3 text-center text-[10px]", inHero ? "text-white/70" : "text-slate-400 dark:text-slate-500")}>
        En créant votre boutique, vous acceptez nos <a className="underline">CGV vendeurs</a>.
      </p>
    </div>
  );

  // === DASHBOARD ===
  const statBg = {
    products: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    orders: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
    pending: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300",
    revenue: "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300",
    stock: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300",
  };

  const Stats = () => (
    <div className={cx("grid gap-2", device === "mobile" ? "grid-cols-3" : "grid-cols-5")}>
      {[
        { k: "products", i: "package", l: "Produits", v: VENDOR.stats.products, tone: "slate" },
        { k: "orders",   i: "cart",    l: "Commandes", v: VENDOR.stats.orders, tone: "emerald" },
        { k: "pending",  i: "clock",   l: "En attente", v: VENDOR.stats.pending, tone: "amber" },
        { k: "revenue",  i: "banknote", l: "Revenus", v: fmtFCFA(VENDOR.stats.revenue), tone: "violet", small: true },
        { k: "stock",    i: "info",    l: "Stock faible", v: VENDOR.stats.lowStock, tone: "red" },
      ].map((s) => (
        <div key={s.k} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={cx("grid h-6 w-6 place-items-center rounded-md", statBg[s.k])}><Icon name={s.i} size={12}/></span>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{s.l}</p>
          </div>
          <p className={cx("mt-1 font-extrabold tabular-nums text-slate-900 dark:text-white whitespace-nowrap", s.small ? "text-[13px]" : "text-[18px]")}>{s.v}</p>
        </div>
      ))}
    </div>
  );

  const ProductsTab = () => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400"><b className="text-slate-900 dark:text-white tabular-nums">{VENDOR.products.length}</b> produits</p>
        <div className="flex gap-2">
          <div className="relative">
            <Button variant="primary" size="sm" disabled className="opacity-60"><Icon name="plus" size={12}/>Ajouter</Button>
            <span className="absolute -top-2 -right-1 rounded-full bg-amber-500 text-white text-[8px] font-extrabold px-1.5 py-0.5">BIENTÔT</span>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
        {VENDOR.products.map((p) => (
          <div key={p.id} className="p-3 flex items-center gap-3">
            <img src={p.image} className="h-14 w-14 rounded-lg object-cover flex-shrink-0 bg-slate-100 dark:bg-slate-800"/>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-slate-900 dark:text-white line-clamp-1">{p.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{p.cat}</p>
              <p className="mt-0.5 text-[13px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">{fmtFCFA(p.price)}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={cx("text-[10px] font-bold uppercase tracking-wider mb-1", p.lowStock ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400")}>Stock</p>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                <button className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon name="minus" size={11}/></button>
                <span className={cx("w-8 text-center text-[12px] font-extrabold tabular-nums", p.lowStock ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white")}>{p.stock}</span>
                <button className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon name="plus" size={11}/></button>
              </div>
              {p.lowStock && <p className="mt-1 text-[9px] font-bold text-red-600 dark:text-red-400">Bas</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const OrdersTab = () => {
    const map = { pending: { l: "En attente", tone: "amber" }, shipped: { l: "Expédiée", tone: "blue" }, delivered: { l: "Livrée", tone: "emerald" } };
    return (
      <div className="space-y-2">
        {VENDOR.orders.map((o) => {
          const s = map[o.status];
          return (
            <div key={o.id} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums font-mono">{o.id}</p>
                    <Badge tone={s.tone}>{s.l}</Badge>
                  </div>
                  <p className="text-[13px] font-bold text-slate-900 dark:text-white">{o.client}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{o.itemCount} article{o.itemCount > 1 ? "s" : ""} · {o.date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Montant</p>
                  <p className="text-[15px] font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">{fmtFCFA(o.total)}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="secondary" size="sm" className="flex-1">Détail</Button>
                {o.status === "pending" && <Button variant="primary" size="sm" className="flex-1"><Icon name="truck" size={12}/>Expédier</Button>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const ReviewsTab = () => (
    <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-8 text-center">
      <div className="grid h-16 w-16 mx-auto place-items-center rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
        <Icon name="star" size={24} className="text-slate-400"/>
      </div>
      <p className="text-[14px] font-extrabold text-slate-900 dark:text-white">Aucun avis pour le moment</p>
      <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Les premiers avis apparaîtront ici.</p>
    </div>
  );

  const dashTabs = [
    { k: "products", l: "Produits", c: VENDOR.products.length },
    { k: "orders",   l: "Commandes", c: VENDOR.orders.length },
    { k: "reviews",  l: "Avis" },
  ];

  const Dashboard = () => (
    <div className="flex-1 overflow-y-auto">
      {/* Vendor header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-950 text-white">
        <div className={cx(device === "mobile" ? "px-4 py-5" : "mx-auto max-w-6xl px-6 py-6")}>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 md:h-14 md:w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-violet-500 text-white text-[14px] md:text-[16px] font-extrabold">
              {VENDOR.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Espace vendeur</span>
                {VENDOR.verified && <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/25 border border-emerald-300/40 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200"><Icon name="checkCircle" size={9}/>Vérifié</span>}
              </div>
              <p className="text-[16px] md:text-[20px] font-extrabold">{VENDOR.shopName}</p>
              <div className="flex items-center gap-2 text-[10px] text-white/70">
                <div className="flex items-center gap-0.5"><Icon name="star" size={10} strokeWidth={0} className="fill-amber-300 text-amber-300"/><span className="font-bold tabular-nums">{VENDOR.rating}</span></div>
                <span>·</span>
                <span>Membre depuis {VENDOR.memberSince}</span>
              </div>
            </div>
            {device === "desktop" && (
              <div className="flex gap-2">
                <Button variant="ghost" size="md" className="!text-white hover:!bg-white/10">Voir ma boutique</Button>
                <Button variant="secondary" size="md" className="!bg-white/10 !text-white !border-white/25 hover:!bg-white/20">Paramètres</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={cx(device === "mobile" ? "p-4 space-y-4" : "mx-auto max-w-6xl px-6 py-6 space-y-6")}>
        <Stats/>

        <div>
          <div className={cx("flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1", device === "mobile" ? "" : "w-fit")}>
            {dashTabs.map((t) => (
              <button key={t.k} onClick={() => setDashTab(t.k)} className={cx(
                "flex-1 md:flex-none rounded-lg px-4 py-2 text-[12px] md:text-[13px] font-bold transition-colors",
                dashTab === t.k ? "bg-white shadow-sm text-slate-900 dark:bg-slate-950 dark:text-white" : "text-slate-600 dark:text-slate-400"
              )}>
                {t.l}{t.c !== undefined && <span className="ml-1 tabular-nums text-[10px] opacity-70">({t.c})</span>}
              </button>
            ))}
          </div>
        </div>

        {dashTab === "products" && <ProductsTab/>}
        {dashTab === "orders" && <OrdersTab/>}
        {dashTab === "reviews" && <ReviewsTab/>}

        <button onClick={() => setMode("landing")} className="w-full text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 underline pt-2">
          ← Retour à la landing Devenir vendeur
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      <MarketHeader device={device} back={() => {}} title={mode === "landing" ? "Devenir vendeur" : "Espace vendeur"}/>

      {/* Demo toggle */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 whitespace-nowrap">Démo :</span>
          <div className="flex-1 flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button onClick={() => setMode("landing")} className={cx("flex-1 rounded-lg py-1.5 text-[11px] font-bold", mode === "landing" ? "bg-white shadow-sm text-slate-900 dark:bg-slate-950 dark:text-white" : "text-slate-500")}>Landing</button>
            <button onClick={() => setMode("dashboard")} className={cx("flex-1 rounded-lg py-1.5 text-[11px] font-bold", mode === "dashboard" ? "bg-white shadow-sm text-slate-900 dark:bg-slate-950 dark:text-white" : "text-slate-500")}>Dashboard</button>
          </div>
        </div>
      </div>

      {mode === "landing" ? <Landing/> : <Dashboard/>}
    </div>
  );
};

window.ScreenVendor = ScreenVendor;
