// ============================================================
// SCREEN — MES COMMANDES
// ============================================================
const ScreenOrders = ({ device = "mobile" }) => {
  const [tab, setTab] = React.useState("all");

  const tabs = [
    { k: "all", l: "Toutes", count: ORDERS.length },
    { k: "in_progress", l: "En cours", count: ORDERS.filter(o => o.status !== "delivered" && o.status !== "cancelled").length },
    { k: "delivered", l: "Livrées", count: ORDERS.filter(o => o.status === "delivered").length },
  ];

  const filtered = ORDERS.filter(o => {
    if (tab === "all") return true;
    if (tab === "in_progress") return o.status !== "delivered" && o.status !== "cancelled";
    if (tab === "delivered") return o.status === "delivered";
    return true;
  });

  const statusMap = {
    ordered:   { label: "Confirmée",       tone: "blue",    icon: "check" },
    sourcing:  { label: "Sourcing",        tone: "violet",  icon: "camera" },
    china:     { label: "Inspection Chine",tone: "amber",   icon: "shield" },
    in_transit:{ label: "En transit",      tone: "blue",    icon: "truck" },
    china:     { label: "En Chine",        tone: "amber",   icon: "package" },
    transit:   { label: "En transit",      tone: "blue",    icon: "truck" },
    delivered: { label: "Livrée",          tone: "emerald", icon: "checkCircle" },
    cancelled: { label: "Annulée",         tone: "red",     icon: "x" },
  };

  const OrderCard = ({ o }) => {
    const s = statusMap[o.status] || statusMap.ordered;
    const totalPcs = o.items.reduce((sum, it) => sum + it.qty, 0);
    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
        <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">{o.id}</p>
            <span className="text-[10px] text-slate-400">·</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{new Date(o.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</p>
          </div>
          <Badge tone={s.tone}><Icon name={s.icon} size={11}/>{s.label}</Badge>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex -space-x-2">
              {o.items.slice(0, 3).map((it, i) => (
                <img key={i} src={it.image} className="h-12 w-12 rounded-lg border-2 border-white dark:border-slate-900 object-cover"/>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">{o.items[0].name}</p>
              {o.items.length > 1 && <p className="text-[11px] text-slate-500 dark:text-slate-400">+ {o.items.length - 1} autre{o.items.length > 2 ? "s" : ""} article{o.items.length > 2 ? "s" : ""}</p>}
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{totalPcs} pcs · {o.shipping}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</p>
              <p className="text-[15px] font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">{fmtFCFA(o.total)}</p>
            </div>
          </div>

          {/* Mini timeline */}
          {o.status !== "delivered" && o.status !== "cancelled" && (
            <div className="mb-3 rounded-lg bg-slate-50 dark:bg-slate-800 p-2.5">
              <div className="flex items-center gap-1 mb-1.5">
                {ORDER_STEPS.map((step, i) => (
                  <React.Fragment key={step.key}>
                    <span className={cx(
                      "grid h-4 w-4 flex-shrink-0 place-items-center rounded-full text-[8px] font-bold",
                      i + 1 < o.currentStep ? "bg-emerald-500 text-white" : i + 1 === o.currentStep ? "bg-emerald-500 text-white ring-2 ring-emerald-500/30" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    )}>
                      {i + 1 < o.currentStep ? <Icon name="check" size={8}/> : i + 1}
                    </span>
                    {i < ORDER_STEPS.length - 1 && (
                      <span className={cx("h-0.5 flex-1", i + 1 < o.currentStep ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700")}/>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-900 dark:text-white">{ORDER_STEPS[o.currentStep - 1].label}</p>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">ETA · <b className="text-slate-900 dark:text-white">{o.eta}</b></p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {o.status !== "delivered" && o.status !== "cancelled" && <Button variant="primary" size="sm"><Icon name="truck" size={12}/>Suivre</Button>}
            <Button variant="secondary" size="sm">Détails</Button>
            {o.status === "delivered" && <Button variant="secondary" size="sm">Réévaluer</Button>}
            <Button variant="ghost" size="sm"><Icon name="whatsapp" size={12}/>Contacter</Button>
          </div>
        </div>
      </Card>
    );
  };

  // MOBILE
  if (device === "mobile") {
    return (
      <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
        <MarketHeader device={device} title="Mes commandes"/>

        {/* Tabs */}
        <div className="sticky top-14 z-20 flex-shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex px-1">
            {tabs.map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)} className={cx(
                "flex-1 border-b-2 py-3 text-[12px] font-bold transition-colors",
                tab === t.k ? "border-emerald-600 text-emerald-700 dark:text-emerald-400" : "border-transparent text-slate-500 dark:text-slate-400"
              )}>
                {t.l} <span className="tabular-nums text-[10px]">({t.count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                <Icon name="package" size={32} className="text-slate-400"/>
              </div>
              <p className="text-[14px] font-extrabold text-slate-900 dark:text-white">Aucune commande</p>
              <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Vos commandes apparaîtront ici.</p>
              <Button variant="primary" size="md" className="mt-4">Explorer le catalogue</Button>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filtered.map((o) => <OrderCard key={o.id} o={o}/>)}
            </div>
          )}
        </div>
        <MarketBottomNav active="account" device={device}/>
      </div>
    );
  }

  // DESKTOP
  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <MarketHeader device={device}/>
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <a className="cursor-pointer">Accueil</a><Icon name="chevronRight" size={12}/><a className="cursor-pointer">Mon compte</a><Icon name="chevronRight" size={12}/><span className="text-slate-700 dark:text-slate-300">Mes commandes</span>
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 dark:text-white">Mes commandes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400"><b className="text-slate-900 dark:text-white tabular-nums">{ORDERS.length}</b> commandes au total</p>
        </div>

        <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 w-fit">
          {tabs.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} className={cx(
              "rounded-lg px-4 py-2 text-[13px] font-bold transition-colors",
              tab === t.k ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-600 dark:text-slate-400"
            )}>
              {t.l} <span className="ml-1 tabular-nums text-[11px] opacity-70">({t.count})</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <Icon name="package" size={40} className="text-slate-400"/>
            </div>
            <p className="text-[16px] font-extrabold text-slate-900 dark:text-white">Aucune commande</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Vos commandes apparaîtront ici.</p>
            <Button variant="primary" size="md" className="mt-6">Explorer le catalogue</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => <OrderCard key={o.id} o={o}/>)}
          </div>
        )}
      </div>
    </div>
  );
};

window.ScreenOrders = ScreenOrders;
