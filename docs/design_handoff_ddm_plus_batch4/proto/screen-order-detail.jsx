// ============================================================
// SCREEN — DÉTAIL COMMANDE (/commandes/[orderId])
// 4 onglets : Récap / Suivi / Livraison / Actions
// + Floating chat panel
// ============================================================
const ScreenOrderDetail = ({ device = "mobile" }) => {
  const o = ORDER_DETAIL;
  const [tab, setTab] = React.useState("recap");
  const [chatOpen, setChatOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const totalPcs = o.items.reduce((s, it) => s + it.qty, 0);

  const copyOrder = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const tabs = [
    { k: "recap",    l: "Récapitulatif", i: "fileText" },
    { k: "suivi",    l: "Suivi",         i: "truck" },
    { k: "delivery", l: "Livraison",     i: "mapPin" },
    { k: "actions",  l: "Actions",       i: "helpCircle" },
  ];

  // ==================== TAB CONTENTS ====================
  const TabRecap = () => (
    <div className="space-y-4">
      <Card>
        <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Articles ({o.items.length})</p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">{totalPcs} pcs</span>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {o.items.map((it, i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <img src={it.image} className="h-14 w-14 rounded-lg object-cover flex-shrink-0 bg-slate-100 dark:bg-slate-800"/>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">{it.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{it.variant}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 tabular-nums">{fmtFCFA(it.unit)} × {it.qty}</span>
                </div>
              </div>
              <p className="text-[14px] font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap flex-shrink-0">{fmtFCFA(it.unit * it.qty)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Décomposition prix</p>
        <div className="space-y-2 text-[12px]">
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Sous-total ({totalPcs} pcs)</span><span className="font-semibold tabular-nums text-slate-900 dark:text-white">{fmtFCFA(o.breakdown.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Frais de service (4%)</span><span className="font-semibold tabular-nums text-slate-900 dark:text-white">{fmtFCFA(o.breakdown.service)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Assurance import</span><span className="font-semibold tabular-nums text-slate-900 dark:text-white">{fmtFCFA(o.breakdown.insurance)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1"><Icon name="truck" size={11}/>Transport ({o.shipping})</span><span className="font-semibold tabular-nums text-slate-900 dark:text-white">{fmtFCFA(o.breakdown.shippingCost)}</span></div>
          {o.breakdown.savings > 0 && (
            <div className="flex justify-between rounded-md bg-emerald-50 dark:bg-emerald-950/40 -mx-1 px-1.5 py-1">
              <span className="text-emerald-700 dark:text-emerald-300 font-bold inline-flex items-center gap-1"><Icon name="sparkles" size={11}/>Économie réalisée</span>
              <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">-{fmtFCFA(o.breakdown.savings)}</span>
            </div>
          )}
        </div>
        <div className="my-3 h-px bg-slate-200 dark:bg-slate-800"/>
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] font-extrabold text-slate-900 dark:text-white">Total payé</span>
          <span className="text-[24px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">{fmtFCFA(o.breakdown.total)}</span>
        </div>
        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Payé le 08 sept. · Wave · **** 4587</p>
      </Card>
    </div>
  );

  const TabSuivi = () => {
    const stepDates = ["05 sept. 09:12", "05 sept. 14:30", "07 sept. 11:20", "08 sept. 08:45", "12-15 sept."];
    return (
      <div className="space-y-4">
        {/* Current status highlight */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 dark:from-emerald-800 dark:to-emerald-950 text-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 backdrop-blur"><Icon name="truck" size={16}/></span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Étape {o.currentStep}/5</p>
              <p className="text-[15px] font-extrabold">{ORDER_STEPS[o.currentStep - 1].label}</p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-[10px] font-bold whitespace-nowrap"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-ping-slow"/>Live</span>
          </div>
          <p className="text-[11px] text-white/85">ETA <b>{o.eta}</b> · N° suivi <b className="font-mono">{o.tracking}</b></p>
        </div>

        {/* Vertical timeline */}
        <Card className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Historique détaillé</p>
          <div className="relative">
            {ORDER_STEPS.map((step, i) => {
              const isDone = i + 1 < o.currentStep;
              const isCurrent = i + 1 === o.currentStep;
              const isLast = i === ORDER_STEPS.length - 1;
              return (
                <div key={step.key} className="relative pl-11 pb-5 last:pb-0">
                  {!isLast && (
                    <span className={cx("absolute left-[15px] top-8 bottom-0 w-0.5", isDone ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800")}/>
                  )}
                  <span className={cx(
                    "absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold",
                    isDone ? "bg-emerald-500 text-white" : isCurrent ? "bg-emerald-500 text-white ring-4 ring-emerald-500/20 animate-ping-slow" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                  )}>
                    {isDone ? <Icon name="check" size={14}/> : i + 1}
                  </span>
                  <div className={cx(isCurrent && "bg-emerald-50 border border-emerald-200 -mx-2 px-2 py-2 rounded-lg dark:bg-emerald-950/40 dark:border-emerald-900")}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cx("text-[13px] font-extrabold", (isDone || isCurrent) ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400")}>{step.label}</p>
                      <p className={cx("text-[10px] font-semibold whitespace-nowrap flex-shrink-0", (isDone || isCurrent) ? "text-slate-500 dark:text-slate-400" : "text-slate-400")}>{stepDates[i]}</p>
                    </div>
                    <p className={cx("mt-0.5 text-[11px]", (isDone || isCurrent) ? "text-slate-600 dark:text-slate-300" : "text-slate-400")}>{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  };

  const TabDelivery = () => (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Icon name="mapPin" size={16}/></span>
          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Adresse de livraison</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 space-y-1">
          <p className="text-[13px] font-bold text-slate-900 dark:text-white">{o.address.name}</p>
          <p className="text-[12px] text-slate-600 dark:text-slate-300">{o.address.line1}</p>
          <p className="text-[12px] text-slate-600 dark:text-slate-300">{o.address.line2}</p>
          <p className="text-[12px] text-slate-600 dark:text-slate-300 font-semibold">{o.address.city}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 tabular-nums"><Icon name="smartphone" size={11}/>{o.address.phone}</p>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Icon name="truck" size={16}/></span>
          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Transporteur</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Transporteur</span>
            <span className="text-[13px] font-extrabold text-slate-900 dark:text-white">{o.carrier.name}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Contact</span>
            <span className="text-[12px] font-semibold text-slate-900 dark:text-white tabular-nums">{o.carrier.contact}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Dernière mise à jour</span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{o.carrier.lastUpdate}</span>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">N° de suivi</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-[13px] font-extrabold text-slate-900 dark:text-white flex-1">{o.tracking}</span>
              <button onClick={copyOrder} className={cx("rounded-md px-2 py-1 text-[10px] font-bold whitespace-nowrap inline-flex items-center gap-1", copied ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300")}>
                <Icon name={copied ? "check" : "copy"} size={11}/>{copied ? "Copié" : "Copier"}
              </button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><Icon name="clock" size={16}/></span>
          <div>
            <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Livraison prévue</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Fenêtre estimée</p>
          </div>
        </div>
        <p className="text-[24px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">{o.eta}</p>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Vous serez notifié par SMS 1h avant la livraison.</p>
      </Card>
    </div>
  );

  const TabActions = () => {
    const actions = [
      { i: "whatsapp", ttl: "Contacter le support", sub: "Réponse sous 15 min sur WhatsApp", tone: "emerald", primary: true },
      { i: "refresh", ttl: "Répéter la commande", sub: "Recommander les mêmes articles" },
      { i: "package", ttl: "Demander un retour", sub: "Sous 7 jours après livraison" },
      { i: "info", ttl: "Ouvrir un litige", sub: "En cas de problème de livraison" },
      { i: "fileText", ttl: "Télécharger la facture", sub: "PDF · " + o.id + ".pdf" },
      { i: "share", ttl: "Partager la commande", sub: "Envoyer le suivi par lien" },
    ];
    return (
      <div className="space-y-2">
        {actions.map((a, i) => (
          <button key={i} className={cx(
            "flex w-full items-center gap-3 rounded-2xl border p-4 text-left hover:shadow-sm transition-all",
            a.primary
              ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900"
              : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          )}>
            <span className={cx("grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl",
              a.primary ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            )}>
              <Icon name={a.i} size={16}/>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">{a.ttl}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{a.sub}</p>
            </div>
            <Icon name="chevronRight" size={16} className="flex-shrink-0 text-slate-400"/>
          </button>
        ))}
      </div>
    );
  };

  // ==================== FLOATING CHAT ====================
  const ChatButton = () => (
    <button onClick={() => setChatOpen(true)} className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-700">
      <Icon name="message" size={22}/>
      <span className="absolute -top-1 -right-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
        1
      </span>
    </button>
  );

  const ChatPanel = () => (
    <div className="absolute inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={() => setChatOpen(false)}>
      <div className={cx(
        "absolute overflow-hidden bg-white dark:bg-slate-950",
        device === "mobile" ? "bottom-0 left-0 right-0 max-h-[85%] rounded-t-3xl" : "top-4 right-4 bottom-4 w-[400px] rounded-2xl"
      )} onClick={e => e.stopPropagation()}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Icon name="whatsapp" size={16}/></span>
              <div>
                <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Chat support</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping-slow"/>En ligne · Répond en 15 min</p>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon name="x" size={16}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900 space-y-3">
            {o.chatMessages.map((m, i) => (
              <div key={i} className={cx("flex items-start gap-2", m.from === "user" && "flex-row-reverse")}>
                <span className={cx("grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-[10px] font-extrabold text-white",
                  m.from === "support" ? "bg-emerald-600" : "bg-gradient-to-br from-violet-500 to-emerald-500"
                )}>{m.initials}</span>
                <div className={cx("max-w-[75%] rounded-2xl px-3 py-2",
                  m.from === "support" ? "bg-white border border-slate-200 dark:bg-slate-950 dark:border-slate-800" : "bg-emerald-600 text-white"
                )}>
                  {m.from === "support" && (
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5 flex items-center gap-1">{m.name}<Icon name="checkCircle" size={9}/></p>
                  )}
                  <p className={cx("text-[12px] leading-relaxed", m.from === "support" ? "text-slate-700 dark:text-slate-300" : "text-white")}>{m.text}</p>
                  <p className={cx("text-[9px] mt-0.5", m.from === "support" ? "text-slate-400" : "text-white/70")}>{m.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 p-2">
            <input placeholder="Écrire un message…" className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"/>
            <button className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex-shrink-0"><Icon name="send" size={16}/></button>
          </div>
        </div>
      </div>
    </div>
  );

  const StatusBadge = () => {
    const map = {
      ordered:    { l: "Confirmée", tone: "blue", i: "check" },
      sourcing:   { l: "Sourcing", tone: "violet", i: "camera" },
      china:      { l: "En Chine", tone: "amber", i: "package" },
      in_transit: { l: "En transit", tone: "blue", i: "truck" },
      transit:    { l: "En transit", tone: "blue", i: "truck" },
      delivered:  { l: "Livrée", tone: "emerald", i: "checkCircle" },
      cancelled:  { l: "Annulée", tone: "red", i: "x" },
    };
    const s = map[o.status] || map.ordered;
    return <Badge tone={s.tone}><Icon name={s.i} size={11}/>{s.l}</Badge>;
  };

  // ==================== MOBILE ====================
  if (device === "mobile") {
    return (
      <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950 relative">
        <MarketHeader device={device} back={() => {}} title={o.id}/>

        <div className="flex-shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Commande</p>
              <p className="text-[15px] font-extrabold text-slate-900 dark:text-white tabular-nums">{o.id}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Passée le {new Date(o.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge/>
              <p className="text-[15px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">{fmtFCFA(o.breakdown.total)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-14 z-10 flex overflow-x-auto border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-1">
          {tabs.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} className={cx(
              "flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 border-b-2 px-3 py-3 text-[12px] font-bold",
              tab === t.k ? "border-emerald-600 text-emerald-700 dark:text-emerald-400" : "border-transparent text-slate-500 dark:text-slate-400"
            )}>
              <Icon name={t.i} size={13}/>{t.l}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pb-24">
          <div className="p-4">
            {tab === "recap" && <TabRecap/>}
            {tab === "suivi" && <TabSuivi/>}
            {tab === "delivery" && <TabDelivery/>}
            {tab === "actions" && <TabActions/>}
          </div>
        </div>

        {!chatOpen && <ChatButton/>}
        {chatOpen && <ChatPanel/>}
      </div>
    );
  }

  // ==================== DESKTOP ====================
  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 relative">
      <MarketHeader device={device}/>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <a className="cursor-pointer">Accueil</a><Icon name="chevronRight" size={12}/><a className="cursor-pointer">Mes commandes</a><Icon name="chevronRight" size={12}/><span className="text-slate-700 dark:text-slate-300">{o.id}</span>
        </div>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <StatusBadge/>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">N° suivi <b className="font-mono text-slate-700 dark:text-slate-300">{o.tracking}</b></span>
              <button onClick={copyOrder} className={cx("rounded-md px-1.5 py-0.5 text-[10px] font-bold inline-flex items-center gap-1", copied ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200")}>
                <Icon name={copied ? "check" : "copy"} size={10}/>{copied ? "Copié" : "Copier"}
              </button>
            </div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 dark:text-white">Commande {o.id}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Passée le {new Date(o.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · Livraison prévue <b className="text-emerald-600 dark:text-emerald-400">{o.eta}</b></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Total payé</p>
            <p className="text-[28px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">{fmtFCFA(o.breakdown.total)}</p>
          </div>
        </div>

        <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 w-fit">
          {tabs.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} className={cx(
              "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-bold transition-colors whitespace-nowrap",
              tab === t.k ? "bg-white shadow-sm text-slate-900 dark:bg-slate-950 dark:text-white" : "text-slate-600 dark:text-slate-400"
            )}>
              <Icon name={t.i} size={13}/>{t.l}
            </button>
          ))}
        </div>

        <div className="max-w-4xl">
          {tab === "recap" && <TabRecap/>}
          {tab === "suivi" && <TabSuivi/>}
          {tab === "delivery" && <TabDelivery/>}
          {tab === "actions" && <TabActions/>}
        </div>
      </div>

      {!chatOpen && <ChatButton/>}
      {chatOpen && <ChatPanel/>}
    </div>
  );
};

window.ScreenOrderDetail = ScreenOrderDetail;
