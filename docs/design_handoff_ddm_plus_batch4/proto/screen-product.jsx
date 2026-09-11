// ============================================================
// SCREEN — FICHE PRODUIT
// ============================================================
const ScreenProduct = ({ device = "mobile" }) => {
  const p = PRODUCT;
  const [activeImg, setActiveImg] = React.useState(0);
  const [variant, setVariant] = React.useState(p.variants[0].id);
  const [qty, setQty] = React.useState(p.minOrderQty);
  const [tab, setTab] = React.useState("desc");
  const [showMoqExplain, setShowMoqExplain] = React.useState(false);

  const tier =
    p.priceTiers.slice().reverse().find((t) => qty >= t.from) || p.priceTiers[0];
  const currentUnit = tier.unit;
  const nextTier = p.priceTiers.find((t) => qty < t.from);
  const savingsVsBase = (p.basePrice - currentUnit) * qty;
  const distanceToNext = nextTier ? nextTier.from - qty : 0;

  const inc = () => setQty((q) => q + 1);
  const dec = () => setQty((q) => Math.max(p.minOrderQty, q - 1));

  // ================ MOBILE ================
  if (device === "mobile") {
    return (
      <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
        <MarketHeader back={() => {}} title={null} showSearch={false} right={
          <React.Fragment>
            <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="share" size={18} /></button>
            <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="heart" size={18} /></button>
          </React.Fragment>
        } />

        <div className="flex-1 overflow-y-auto pb-32">
          {/* Gallery */}
          <div className="bg-white dark:bg-slate-900">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img src={p.images[activeImg]} alt={p.name} className="h-full w-full object-cover" />
              <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                <Badge tone="emerald"><Icon name="checkCircle" size={11} /> Fournisseur vérifié</Badge>
                <Badge tone="amber"><Icon name="package" size={11} /> Lot min. {p.minOrderQty}</Badge>
              </div>
              <div className="absolute right-3 top-3">
                <Badge tone="red"><Icon name="flame" size={11} /> -{Math.round((1 - p.price / p.basePrice) * 100)}%</Badge>
              </div>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-slate-900/70 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
                {activeImg + 1} / {p.images.length}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto p-3">
              {p.images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={cx(
                    "h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-slate-100 dark:bg-slate-800",
                    activeImg === i ? "border-emerald-600" : "border-transparent"
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Title + rating */}
          <div className="bg-white px-4 py-4 dark:bg-slate-900">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{p.brand}</p>
            <h1 className="mt-1 text-[19px] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
              {p.name}
            </h1>
            <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" size={13} strokeWidth={0} className={i < Math.round(p.rating) ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"} />)}
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">{p.rating}</span>
              <span>·</span>
              <span>{p.reviews} avis</span>
              <span>·</span>
              <span>1 240 vendus</span>
            </div>
          </div>

          {/* Price block */}
          <div className="mt-2 bg-white px-4 py-4 dark:bg-slate-900">
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                {fmtFCFA(currentUnit)}
              </span>
              <span className="text-[13px] font-semibold text-slate-400 line-through tabular-nums">
                {fmtFCFA(p.basePrice)}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                -{Math.round((1 - currentUnit / p.basePrice) * 100)}%
              </span>
            </div>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Prix unitaire · faibles frais de service inclus</p>

            <button
              onClick={() => setShowMoqExplain((s) => !s)}
              className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left dark:border-amber-900 dark:bg-amber-950/40"
            >
              <div className="flex items-start gap-2">
                <Icon name="package" size={16} className="mt-0.5 text-amber-700 dark:text-amber-300" />
                <div>
                  <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">Lot minimum {p.minOrderQty} unités</p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300/80">Pourquoi ? Faibles frais de service = prix usine</p>
                </div>
              </div>
              <Icon name={showMoqExplain ? "chevronDown" : "chevronRight"} size={14} className="text-amber-700 dark:text-amber-300" />
            </button>
            {showMoqExplain && (
              <div className="mt-2 rounded-xl bg-slate-50 p-3 text-[12px] text-slate-600 dark:bg-slate-800 dark:text-slate-300 leading-relaxed">
                Un lot minimum permet à notre équipe de sourcing en Chine de négocier directement avec l'usine. Sans ce minimum, les frais fixes de transport et d'inspection rendraient l'import plus cher qu'un achat local.
              </div>
            )}

            {/* Price tiers */}
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix par palier</p>
              <div className="grid grid-cols-3 gap-2">
                {p.priceTiers.map((t, i) => {
                  const active = qty >= t.from && (!t.to || qty <= t.to);
                  return (
                    <button
                      key={i}
                      onClick={() => setQty(t.from)}
                      className={cx(
                        "rounded-xl border p-2.5 text-left transition-all",
                        active
                          ? "border-emerald-600 bg-emerald-50 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/40"
                          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                      )}
                    >
                      <p className={cx(
                        "text-[10px] font-bold uppercase tracking-wider",
                        active ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
                      )}>
                        {t.to ? `${t.from}–${t.to} pcs` : `${t.from}+ pcs`}
                      </p>
                      <p className="mt-0.5 text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
                        {fmtFCFA(t.unit)}
                      </p>
                      {t.save > 0 && (
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">-{t.save}%</p>
                      )}
                    </button>
                  );
                })}
              </div>
              {nextTier && distanceToNext > 0 && (
                <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Icon name="sparkles" size={13} />
                  Ajoutez <b className="tabular-nums mx-0.5">{distanceToNext}</b> unités pour débloquer −{nextTier.save}%
                </p>
              )}
            </div>
          </div>

          {/* Group buy card */}
          {p.groupBuy.active && (
            <div className="mt-2 bg-white px-4 py-4 dark:bg-slate-900">
              <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-emerald-50 p-4 dark:border-violet-900 dark:from-violet-950/40 dark:via-slate-900 dark:to-emerald-950/40">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white">
                      <Icon name="users" size={16} />
                    </span>
                    <div>
                      <p className="text-[13px] font-extrabold text-slate-900 dark:text-white leading-tight">Achat groupé actif</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">27 personnes ont déjà rejoint</p>
                    </div>
                  </div>
                  <LiveDot />
                </div>

                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <b className="tabular-nums text-slate-900 dark:text-white">{p.groupBuy.currentQty}</b> / {p.groupBuy.targetQty} unités
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {Math.round((p.groupBuy.currentQty / p.groupBuy.targetQty) * 100)}%
                  </span>
                </div>
                <ProgressBar value={p.groupBuy.currentQty} max={p.groupBuy.targetQty} tone="mixed" />

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-white/60 p-2.5 dark:bg-slate-900/60">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix groupe</p>
                    <p className="text-[15px] font-extrabold text-violet-700 dark:text-violet-300 tabular-nums">{fmtFCFA(p.groupBuy.unitPrice)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Économie</p>
                    <p className="text-[15px] font-extrabold text-emerald-600 dark:text-emerald-400">-{p.groupBuy.savePct}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Deadline</p>
                    <p className="text-[13px] font-extrabold text-red-600 dark:text-red-400 tabular-nums leading-tight">{p.groupBuy.deadline}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="violet" size="sm">Rejoindre</Button>
                  <Button variant="secondary" size="sm">Créer un groupe</Button>
                </div>
              </div>
            </div>
          )}

          {/* Variant */}
          <div className="mt-2 bg-white px-4 py-4 dark:bg-slate-900">
            <p className="mb-2 text-[13px] font-bold text-slate-900 dark:text-white">Configuration</p>
            <div className="flex flex-wrap gap-2">
              {p.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariant(v.id)}
                  className={cx(
                    "rounded-xl border px-3 py-2 text-[12px] font-semibold",
                    variant === v.id
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300"
                  )}
                >
                  {v.label}
                  <span className="ml-1 text-[10px] font-normal text-slate-500 dark:text-slate-400">· {v.stock} en stock</span>
                </button>
              ))}
            </div>

            <p className="mb-2 mt-4 text-[13px] font-bold text-slate-900 dark:text-white">Quantité</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
                <button onClick={dec} disabled={qty <= p.minOrderQty} className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800">
                  <Icon name="minus" size={16} />
                </button>
                <input value={qty} readOnly className="w-12 bg-transparent text-center text-[15px] font-extrabold text-slate-900 dark:text-white tabular-nums" />
                <button onClick={inc} className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                  <Icon name="plus" size={16} />
                </button>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Total ({qty} pcs)</p>
                <p className="text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">{fmtFCFA(currentUnit * qty)}</p>
              </div>
            </div>
            {savingsVsBase > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <Icon name="sparkles" size={13} />
                Vous économisez <b className="tabular-nums">{fmtFCFA(savingsVsBase)}</b> vs prix de base
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-2 bg-white dark:bg-slate-900">
            <div className="flex gap-1 border-b border-slate-200 px-4 dark:border-slate-800">
              {[
                ["desc", "Description"],
                ["ship", "Expédition"],
                ["rev", "Avis (218)"],
              ].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={cx(
                    "border-b-2 px-2 py-3 text-[13px] font-semibold",
                    tab === k
                      ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                      : "border-transparent text-slate-500 dark:text-slate-400"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="px-4 py-4">
              {tab === "desc" && (
                <div className="space-y-3 text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  <p>Caméra IP dôme extérieure haute résolution 4MP avec vision nocturne couleur jusqu'à 30 mètres. Compatible avec la plupart des NVR du marché, protocole ONVIF. Certifiée IP67 pour installation extérieure.</p>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    {p.specs.map(([k, v]) => (
                      <React.Fragment key={k}>
                        <dt className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{k}</dt>
                        <dd className="text-[12px] font-semibold text-slate-900 dark:text-white text-right">{v}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </div>
              )}
              {tab === "ship" && (
                <div className="space-y-2 text-[13px] text-slate-700 dark:text-slate-300">
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">Depuis {p.shipping.origin}</p>
                  {p.shipping.modes.map((m) => (
                    <div key={m.key} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                      <div>
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white">{m.label}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{m.days}</p>
                      </div>
                      <p className="text-[12px] font-bold text-slate-900 dark:text-white tabular-nums">dès {fmtFCFA(m.from)}/pc</p>
                    </div>
                  ))}
                </div>
              )}
              {tab === "rev" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{p.rating}</div>
                    <div>
                      <div className="flex text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" size={14} strokeWidth={0} className={i < Math.round(p.rating) ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"} />)}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{p.reviews} avis vérifiés</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-[12px] font-bold text-slate-900 dark:text-white">Amadou D.</p>
                      <div className="flex text-amber-500">{Array.from({length:5}).map((_,i)=><Icon key={i} name="star" size={11} strokeWidth={0} className="fill-amber-500"/>)}</div>
                    </div>
                    <p className="text-[12px] text-slate-600 dark:text-slate-300">Livraison en 5j, produit conforme. J'ai commandé 20 unités et le prix palier est intéressant.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trust */}
          <div className="mt-2 px-4 py-4">
            <TrustStrip compact />
          </div>

          {/* Related */}
          <Section title="Souvent achetés ensemble" className="mt-2 py-4 bg-white dark:bg-slate-900">
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "Câble Ethernet 20m Cat6", price: 3200, base: 4800, moq: 10, img: "assets/img/product-led.jpg" },
                { name: "NVR 8 canaux 4K PoE", price: 45000, base: 62000, moq: 2, img: "assets/img/product-carmount.jpg" },
              ].map((r) => (
                <Card key={r.name} className="overflow-hidden">
                  <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                    <img src={r.img} alt="" className="h-full w-full object-cover"/>
                    <span className="absolute left-1.5 top-1.5"><Badge tone="amber">Min. {r.moq}</Badge></span>
                  </div>
                  <div className="p-2.5">
                    <p className="text-[11px] font-semibold text-slate-900 dark:text-white line-clamp-2 leading-tight">{r.name}</p>
                    <p className="mt-1.5 text-[14px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtFCFA(r.price)}</p>
                    <p className="text-[10px] font-semibold text-slate-400 line-through tabular-nums">{fmtFCFA(r.base)}</p>
                  </div>
                </Card>
              ))}
            </div>
          </Section>
        </div>

        {/* Sticky bottom bar */}
        <div className="absolute bottom-14 left-0 right-0 z-20 border-t border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-1.5 flex items-center justify-between text-[10px] whitespace-nowrap">
            <span className="text-slate-500 dark:text-slate-400">Total <b className="text-slate-900 dark:text-white tabular-nums">{fmtFCFA(currentUnit * qty)}</b> · {qty} pcs</span>
            {savingsVsBase > 0 && <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">Éco. {fmtFCFA(savingsVsBase)}</span>}
          </div>
          <div className="flex gap-1.5">
            <button className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border border-slate-200 text-emerald-700 dark:border-slate-700 dark:text-emerald-400">
              <Icon name="whatsapp" size={16} />
            </button>
            <Button variant="outline" size="sm" className="flex-1 !text-[12px] whitespace-nowrap"><Icon name="cart" size={14}/>Ajouter</Button>
            <Button variant="primary" size="sm" className="flex-1 whitespace-nowrap">Acheter</Button>
          </div>
        </div>
        <MarketBottomNav device={device} active="catalog"/>
      </div>
    );
  }

  // ================ DESKTOP ================
  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <MarketHeader device={device} />
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4 flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
          <a>Accueil</a><Icon name="chevronRight" size={12}/><a>Catalogue</a><Icon name="chevronRight" size={12}/><a>Sécurité</a><Icon name="chevronRight" size={12}/><span className="text-slate-700 dark:text-slate-300">Caméras IP</span>
        </div>

        <div className="grid grid-cols-[1fr_400px] gap-8">
          {/* Left : gallery + tabs */}
          <div>
            <Card className="overflow-hidden">
              <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                <img src={p.images[activeImg]} alt="" className="h-full w-full object-cover"/>
                <div className="absolute left-4 top-4 flex flex-col gap-2">
                  <Badge tone="emerald"><Icon name="checkCircle" size={11}/> Fournisseur vérifié</Badge>
                  <Badge tone="amber"><Icon name="package" size={11}/> Lot min. {p.minOrderQty}</Badge>
                </div>
                <div className="absolute right-4 top-4"><Badge tone="red"><Icon name="flame" size={11}/> -{Math.round((1 - p.price / p.basePrice) * 100)}%</Badge></div>
              </div>
              <div className="flex gap-2 p-3">
                {p.images.map((src, i) => (
                  <button key={i} onClick={() => setActiveImg(i)} className={cx("h-20 w-20 overflow-hidden rounded-lg border-2", activeImg === i ? "border-emerald-600" : "border-transparent")}>
                    <img src={src} alt="" className="h-full w-full object-cover"/>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="mt-4 overflow-hidden">
              <div className="flex gap-1 border-b border-slate-200 px-4 dark:border-slate-800">
                {[["desc","Description"],["ship","Expédition & délais"],["rev","Avis (218)"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setTab(k)} className={cx("border-b-2 px-3 py-3 text-sm font-semibold", tab===k?"border-emerald-600 text-emerald-700 dark:text-emerald-400":"border-transparent text-slate-500 dark:text-slate-400")}>{l}</button>
                ))}
              </div>
              <div className="p-6">
                {tab==="desc" && (
                  <div className="grid grid-cols-2 gap-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    <div className="space-y-3">
                      <p>Caméra IP dôme extérieure haute résolution 4MP avec vision nocturne couleur jusqu'à 30 mètres. Compatible avec la plupart des NVR du marché, protocole ONVIF.</p>
                      <p>Certifiée IP67 pour installation extérieure toute année. Idéale pour surveillance résidentielle, commerces, entrepôts.</p>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                      {p.specs.map(([k,v])=>(
                        <React.Fragment key={k}>
                          <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">{k}</dt>
                          <dd className="text-sm font-semibold text-slate-900 dark:text-white text-right">{v}</dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  </div>
                )}
                {tab==="ship" && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Depuis {p.shipping.origin} · inspection avant expédition incluse</p>
                    <div className="grid grid-cols-3 gap-3">
                      {p.shipping.modes.map((m)=>(
                        <div key={m.key} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                          <div className="mb-2 flex h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <Icon name={m.key==="maritime"?"ship":m.key==="express"?"plane":"truck"} size={16}/>
                          </div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{m.label}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{m.days}</p>
                          <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white tabular-nums">dès {fmtFCFA(m.from)}/pc</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {tab==="rev" && (
                  <div className="grid grid-cols-[240px_1fr] gap-6">
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                      <div className="text-4xl font-extrabold tabular-nums text-slate-900 dark:text-white">{p.rating}<span className="text-lg text-slate-400">/5</span></div>
                      <div className="mt-1 flex text-amber-500">{Array.from({length:5}).map((_,i)=><Icon key={i} name="star" size={14} strokeWidth={0} className="fill-amber-500"/>)}</div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{p.reviews} avis vérifiés</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        {n:"Amadou D.",t:"Livraison en 5j, produit conforme. J'ai commandé 20 unités et le prix palier est intéressant."},
                        {n:"Fatima N.",t:"Bonne qualité d'image de nuit. Installation simple avec le NVR compatible."},
                      ].map((r)=>(
                        <div key={r.n} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                          <div className="mb-1 flex justify-between"><p className="text-sm font-bold text-slate-900 dark:text-white">{r.n}</p><div className="flex text-amber-500">{Array.from({length:5}).map((_,i)=><Icon key={i} name="star" size={11} strokeWidth={0} className="fill-amber-500"/>)}</div></div>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{r.t}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <div className="mt-4">
              <TrustStrip/>
            </div>

            <div className="mt-6">
              <h3 className="mb-3 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">Souvent achetés ensemble</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { name: "Câble Ethernet 20m Cat6", price: 3200, base: 4800, moq: 10, img: "assets/img/product-led.jpg" },
                  { name: "NVR 8 canaux 4K PoE", price: 45000, base: 62000, moq: 2, img: "assets/img/product-carmount.jpg" },
                  { name: "Disque HDD 4To surveillance", price: 32000, base: 42000, moq: 3, img: "assets/img/product-watch.jpg" },
                  { name: "Support mural universel", price: 1900, base: 3200, moq: 20, img: "assets/img/product-bag.jpg" },
                ].map((r)=>(
                  <Card key={r.name} className="overflow-hidden">
                    <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                      <img src={r.img} alt="" className="h-full w-full object-cover"/>
                      <span className="absolute left-2 top-2"><Badge tone="amber">Min. {r.moq}</Badge></span>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 min-h-[32px]">{r.name}</p>
                      <p className="mt-2 text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtFCFA(r.price)}</p>
                      <p className="text-xs font-semibold text-slate-400 line-through tabular-nums">{fmtFCFA(r.base)}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Right : sticky pricing */}
          <div>
            <div className="sticky top-20 space-y-4">
              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{p.brand}</p>
                <h1 className="mt-1 text-xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">{p.name}</h1>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex text-amber-500">{Array.from({length:5}).map((_,i)=><Icon key={i} name="star" size={12} strokeWidth={0} className={i < Math.round(p.rating) ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"}/>)}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{p.rating}</span> · <span>{p.reviews} avis</span>
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtFCFA(currentUnit)}</span>
                  <span className="text-sm font-semibold text-slate-400 line-through tabular-nums">{fmtFCFA(p.basePrice)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Prix unitaire · faibles frais de service inclus</p>

                <button onClick={()=>setShowMoqExplain(s=>!s)} className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left dark:border-amber-900 dark:bg-amber-950/40">
                  <div className="flex items-center gap-2">
                    <Icon name="package" size={16} className="text-amber-700 dark:text-amber-300"/>
                    <div>
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Lot minimum {p.minOrderQty} unités</p>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300/80">Pourquoi ce minimum ?</p>
                    </div>
                  </div>
                  <Icon name={showMoqExplain?"chevronDown":"chevronRight"} size={14} className="text-amber-700 dark:text-amber-300"/>
                </button>
                {showMoqExplain && (
                  <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 leading-relaxed">
                    Un lot minimum permet de négocier directement avec l'usine sans intermédiaire. Sans ce minimum, les frais fixes de transport et d'inspection rendraient l'import plus cher qu'un achat local.
                  </div>
                )}

                <div className="mt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix par palier</p>
                  <div className="space-y-2">
                    {p.priceTiers.map((t,i)=>{
                      const active = qty >= t.from && (!t.to || qty <= t.to);
                      return (
                        <button key={i} onClick={()=>setQty(t.from)} className={cx("flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all", active?"border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40":"border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700")}>
                          <div>
                            <p className={cx("text-xs font-bold", active?"text-emerald-700 dark:text-emerald-400":"text-slate-700 dark:text-slate-300")}>{t.to?`${t.from} à ${t.to} unités`:`${t.from}+ unités`}</p>
                            {t.save>0 && <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Économisez {t.save}%</p>}
                          </div>
                          <p className="text-base font-extrabold tabular-nums text-slate-900 dark:text-white">{fmtFCFA(t.unit)}</p>
                        </button>
                      );
                    })}
                  </div>
                  {nextTier && distanceToNext > 0 && (
                    <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <Icon name="sparkles" size={13}/>
                      Ajoutez <b className="tabular-nums mx-0.5">{distanceToNext}</b> unités pour débloquer −{nextTier.save}%
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-xs font-bold text-slate-900 dark:text-white">Quantité</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
                      <button onClick={dec} disabled={qty<=p.minOrderQty} className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="minus" size={16}/></button>
                      <input value={qty} readOnly className="w-14 bg-transparent text-center text-base font-extrabold text-slate-900 dark:text-white tabular-nums"/>
                      <button onClick={inc} className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="plus" size={16}/></button>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Total ({qty} pcs)</p>
                      <p className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{fmtFCFA(currentUnit * qty)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Button variant="primary" size="lg" className="w-full"><Icon name="cart" size={16}/>Ajouter au panier · {qty} min.</Button>
                  <Button variant="outline" size="lg" className="w-full">Acheter maintenant</Button>
                  <Button variant="ghost" size="md" className="w-full"><Icon name="whatsapp" size={16}/>Poser une question par WhatsApp</Button>
                </div>
              </Card>

              {p.groupBuy.active && (
                <Card className="overflow-hidden border-violet-200 dark:border-violet-900">
                  <div className="bg-gradient-to-br from-violet-50 via-white to-emerald-50 p-4 dark:from-violet-950/40 dark:via-slate-900 dark:to-emerald-950/40">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white"><Icon name="users" size={14}/></span>
                        <div>
                          <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">Achat groupé actif</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">27 personnes ont rejoint</p>
                        </div>
                      </div>
                      <LiveDot/>
                    </div>
                    <div className="mb-1 flex items-baseline justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span><b className="tabular-nums text-slate-900 dark:text-white">{p.groupBuy.currentQty}</b>/{p.groupBuy.targetQty} unités</span>
                      <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">{Math.round(p.groupBuy.currentQty/p.groupBuy.targetQty*100)}%</span>
                    </div>
                    <ProgressBar value={p.groupBuy.currentQty} max={p.groupBuy.targetQty} tone="mixed"/>
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-white/60 p-2.5 dark:bg-slate-900/60">
                      <div><p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix</p><p className="text-sm font-extrabold text-violet-700 dark:text-violet-300 tabular-nums">{fmtFCFA(p.groupBuy.unitPrice)}</p></div>
                      <div><p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Éco.</p><p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">-{p.groupBuy.savePct}%</p></div>
                      <div><p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Fin</p><p className="text-xs font-extrabold text-red-600 dark:text-red-400 tabular-nums">{p.groupBuy.deadline}</p></div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button variant="violet" size="sm">Rejoindre</Button>
                      <Button variant="secondary" size="sm">Créer</Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.ScreenProduct = ScreenProduct;
