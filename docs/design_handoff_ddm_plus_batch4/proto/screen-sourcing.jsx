// ============================================================
// SCREEN — SOURCING TRACKING (/market/sourcing/[token]) + MODAL
// ============================================================
const ScreenSourcing = ({ device = "mobile" }) => {
  const [reqKey, setReqKey] = React.useState("proposal_ready"); // "proposal_ready" | "searching"
  const [modalOpen, setModalOpen] = React.useState(false);
  const req = SOURCING_REQUESTS[reqKey];
  const stepIndex = req.status === "proposal_ready" ? 2 : req.status === "searching" ? 1 : 0;

  const StatusBadge = () => {
    const map = {
      searching:       { tone: "blue",    label: "Recherche en cours", icon: "search" },
      proposal_ready:  { tone: "emerald", label: "Proposition disponible", icon: "checkCircle" },
      proposal_sent:   { tone: "emerald", label: "Proposition envoyée", icon: "send" },
      accepted:        { tone: "emerald", label: "Acceptée", icon: "check" },
      rejected:        { tone: "red",     label: "Refusée", icon: "x" },
      fulfilled:       { tone: "emerald", label: "Livrée", icon: "package" },
      cancelled:       { tone: "slate",   label: "Annulée", icon: "x" },
      expired:         { tone: "amber",   label: "Expirée", icon: "clock" },
    };
    const s = map[req.status];
    return <Badge tone={s.tone}><Icon name={s.icon} size={11}/>{s.label}</Badge>;
  };

  const RequestCard = () => (
    <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
      <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Votre demande</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">{req.createdAt}</p>
      </div>
      <div className="p-4">
        <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-3">
          <img src={req.request.photo} className="h-full w-full object-cover"/>
        </div>
        <p className="text-[13px] text-slate-900 dark:text-white font-semibold leading-snug mb-3">{req.request.description}</p>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2 text-center">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Quantité</p>
            <p className="mt-0.5 text-[13px] font-extrabold tabular-nums text-slate-900 dark:text-white">{req.request.targetQty} pcs</p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2 text-center">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Budget max</p>
            <p className="mt-0.5 text-[13px] font-extrabold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">{fmtFCFA(req.request.budgetMax)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2 text-center">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Délai</p>
            <p className="mt-0.5 text-[10px] font-extrabold text-slate-900 dark:text-white leading-tight">{req.request.deadline}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const Timeline = () => (
    <div className="relative">
      {SOURCING_STEPS.map((step, i) => {
        const isDone = i < stepIndex;
        const isCurrent = i === stepIndex;
        const isLast = i === SOURCING_STEPS.length - 1;
        return (
          <div key={step.key} className="relative pl-11 pb-4 last:pb-0">
            {!isLast && (
              <span className={cx("absolute left-[15px] top-8 bottom-0 w-0.5", isDone ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700")}/>
            )}
            <span className={cx(
              "absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold",
              isDone ? "bg-emerald-500 text-white" : isCurrent ? "bg-violet-500 text-white ring-4 ring-violet-500/20 animate-ping-slow" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
            )}>
              {isDone ? <Icon name="check" size={14}/> : i + 1}
            </span>
            <p className={cx("text-[13px] font-extrabold", (isDone || isCurrent) ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400")}>{step.label}</p>
            <p className={cx("mt-0.5 text-[11px]", (isDone || isCurrent) ? "text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500")}>{step.desc}</p>
          </div>
        );
      })}
    </div>
  );

  const ProposalCard = () => {
    if (!req.proposal) return null;
    const p = req.proposal;
    return (
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900 dark:from-emerald-950/40 dark:via-slate-900 dark:to-emerald-950/40 overflow-hidden">
        <div className="border-b border-emerald-200 dark:border-emerald-900 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white"><Icon name="sparkles" size={14}/></span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Proposition trouvée</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">Envoyée le {p.sentAt}</p>
            </div>
          </div>
          <span className="rounded-md bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5">-{p.savingPct}%</span>
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <img src={p.image} className="h-16 w-16 md:h-20 md:w-20 rounded-xl object-cover flex-shrink-0 bg-slate-100 dark:bg-slate-800"/>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold text-slate-900 dark:text-white leading-tight">{p.productName}</p>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                <Icon name="factory" size={11}/>
                <span>{p.supplier}</span>
                {p.supplierVerified && <Icon name="checkCircle" size={11} className="text-emerald-500"/>}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white/70 dark:bg-slate-900/70 p-3 space-y-2 mb-4">
            <div className="flex justify-between items-baseline text-[12px]">
              <span className="text-slate-500 dark:text-slate-400">Prix unitaire livré</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">{fmtFCFA(p.unitPrice)}</span>
            </div>
            <div className="flex justify-between items-baseline text-[12px]">
              <span className="text-slate-500 dark:text-slate-400">Prix marché estimé</span>
              <span className="font-semibold text-slate-400 line-through tabular-nums whitespace-nowrap">{fmtFCFA(p.marketPrice)}</span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-baseline">
              <span className="text-[13px] font-bold text-slate-900 dark:text-white">Total ({req.request.targetQty} pcs)</span>
              <span className="text-[18px] font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">{fmtFCFA(p.totalPrice)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-lg bg-white/70 dark:bg-slate-900/70 p-2">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Délai</p>
              <p className="mt-0.5 text-[11px] font-extrabold text-slate-900 dark:text-white leading-tight">{p.shipping}</p>
            </div>
            <div className="rounded-lg bg-white/70 dark:bg-slate-900/70 p-2">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Garantie</p>
              <p className="mt-0.5 text-[11px] font-extrabold text-slate-900 dark:text-white">{p.warranty}</p>
            </div>
            <div className="rounded-lg bg-white/70 dark:bg-slate-900/70 p-2">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">MOQ</p>
              <p className="mt-0.5 text-[11px] font-extrabold text-slate-900 dark:text-white tabular-nums">{p.moq} pcs</p>
            </div>
          </div>

          {p.notes && (
            <div className="rounded-lg bg-white/70 dark:bg-slate-900/70 p-3 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Notes du conseiller</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{p.notes}</p>
            </div>
          )}

          <div className="space-y-2">
            <Button variant="primary" size="lg" className="w-full"><Icon name="checkCircle" size={16}/>Accepter et payer · {fmtFCFA(p.totalPrice)}</Button>
            <Button variant="secondary" size="md" className="w-full !text-violet-700 !border-violet-300 hover:!bg-violet-50 dark:!text-violet-300 dark:!border-violet-900 dark:hover:!bg-violet-950/40"><Icon name="whatsapp" size={14}/>Discuter avec un conseiller</Button>
          </div>
        </div>
      </div>
    );
  };

  const NoProposalYet = () => (
    <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-6 text-center">
      <div className="grid h-16 w-16 mx-auto place-items-center rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 mb-3">
        <Icon name="search" size={24}/>
      </div>
      <p className="text-[15px] font-extrabold text-slate-900 dark:text-white">Notre équipe travaille sur votre demande</p>
      <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Vous recevrez un devis par SMS et sur cette page dès que la proposition est prête.</p>
      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-3 py-1.5 dark:bg-violet-950/40 dark:border-violet-900">
        <Icon name="clock" size={12} className="text-violet-600 dark:text-violet-400"/>
        <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300 tabular-nums">SLA · {req.slaHours}h</span>
      </div>
      <Button variant="secondary" size="md" className="w-full mt-4"><Icon name="whatsapp" size={14}/>Contacter mon conseiller</Button>
    </div>
  );

  // ==================== MODAL ====================
  const SourcingModal = () => (
    <div className="absolute inset-0 z-40 bg-slate-900/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
      <div className={cx(
        "absolute overflow-hidden bg-white dark:bg-slate-950",
        device === "mobile" ? "bottom-0 left-0 right-0 max-h-[92%] rounded-t-3xl" : "inset-0 m-auto w-[560px] max-h-[85vh] rounded-2xl h-fit"
      )} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-600 text-white"><Icon name="camera" size={16}/></span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Sourcing sur demande</p>
              <p className="text-[15px] font-extrabold text-slate-900 dark:text-white">Trouvez-moi ce produit</p>
            </div>
          </div>
          <button onClick={() => setModalOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon name="x" size={16}/></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* 3 steps visual */}
          <div className="grid grid-cols-3 gap-2">
            {[{i:"camera",t:"Photo / Lien / Texte"},{i:"clock",t:"Devis 24h"},{i:"package",t:"Commande"}].map((s, i) => (
              <div key={i} className="rounded-xl bg-violet-50 dark:bg-violet-950/40 p-2.5 text-center">
                <div className="grid h-8 w-8 mx-auto place-items-center rounded-full bg-violet-600 text-white text-[11px] font-extrabold mb-1">{i+1}</div>
                <p className="text-[10px] font-bold text-slate-900 dark:text-white leading-tight">{s.t}</p>
              </div>
            ))}
          </div>

          {/* Upload zone */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Photo, capture ou lien</label>
            <div className="mt-1.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-6 text-center cursor-pointer hover:border-violet-500 dark:hover:border-violet-500 transition-colors">
              <div className="grid h-10 w-10 mx-auto place-items-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 mb-2"><Icon name="upload" size={18}/></div>
              <p className="text-[12px] font-bold text-slate-900 dark:text-white">Ajouter une photo ou un lien</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">JPEG, PNG, ou URL Amazon / AliExpress</p>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</label>
            <textarea rows="3" placeholder="Décrivez le produit recherché…" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-violet-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white resize-none"/>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Quantité</label>
              <input type="number" defaultValue="15" className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-violet-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white tabular-nums"/>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Budget/pc</label>
              <input type="number" defaultValue="20000" className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-violet-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white tabular-nums"/>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Délai</label>
              <select className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-[12px] font-semibold outline-none focus:border-violet-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                <option>1 mois</option><option>2 mois</option><option>Flexible</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-3 flex items-start gap-2">
            <Icon name="checkCircle" size={16} className="flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400"/>
            <p className="text-[11px] text-emerald-900 dark:text-emerald-200 leading-relaxed">Vous recevrez une proposition sous <b>24h ouvrées</b>. Aucun engagement d'achat.</p>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 p-4 flex gap-2">
          <Button variant="secondary" size="md" className="flex-1" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button variant="violet" size="md" className="flex-1"><Icon name="send" size={14}/>Envoyer la demande</Button>
        </div>
      </div>
    </div>
  );

  // Helper for demo toggle
  const StateToggle = () => (
    <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
      <button onClick={() => setReqKey("proposal_ready")} className={cx("flex-1 rounded-lg py-1.5 text-[11px] font-bold", reqKey === "proposal_ready" ? "bg-white shadow-sm text-slate-900 dark:bg-slate-950 dark:text-white" : "text-slate-500")}>Avec proposition</button>
      <button onClick={() => setReqKey("searching")} className={cx("flex-1 rounded-lg py-1.5 text-[11px] font-bold", reqKey === "searching" ? "bg-white shadow-sm text-slate-900 dark:bg-slate-950 dark:text-white" : "text-slate-500")}>En recherche</button>
    </div>
  );

  // ==================== MOBILE ====================
  if (device === "mobile") {
    return (
      <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950 relative">
        <MarketHeader device={device} back={() => {}} title="Ma demande"/>

        {/* Demo controls */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900/50 px-3 py-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 whitespace-nowrap">Démo :</span>
            <div className="flex-1"><StateToggle/></div>
          </div>
          <button onClick={() => setModalOpen(true)} className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 py-1.5 text-[11px] font-bold text-white hover:bg-violet-700">
            <Icon name="camera" size={12}/>Ouvrir la modale de raccourci
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Hero contextuel */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <StatusBadge/>
              <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{req.token}</p>
            </div>
            <h1 className="text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">Votre demande de sourcing</h1>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Suivi en temps réel de l'avancement</p>
          </div>

          <div className="p-4 space-y-4">
            <RequestCard/>
            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Avancement</p>
              <Timeline/>
            </div>
            {req.proposal ? <ProposalCard/> : <NoProposalYet/>}
          </div>
        </div>

        {modalOpen && <SourcingModal/>}
      </div>
    );
  }

  // ==================== DESKTOP ====================
  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 relative">
      <MarketHeader device={device}/>

      {/* Demo controls */}
      <div className="border-b border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900/50">
        <div className="mx-auto max-w-6xl px-6 py-2 flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">Démo :</span>
          <div className="flex items-center gap-3">
            <div className="w-72"><StateToggle/></div>
            <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-violet-700">
              <Icon name="camera" size={12}/>Ouvrir la modale
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <a className="cursor-pointer">Accueil</a><Icon name="chevronRight" size={12}/><a className="cursor-pointer">Mes demandes</a><Icon name="chevronRight" size={12}/><span className="text-slate-700 dark:text-slate-300 font-mono">{req.token}</span>
        </div>

        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <StatusBadge/>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Créée le {req.createdAt}</span>
            </div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 dark:text-white">Votre demande de sourcing</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Notre équipe recherche le meilleur fournisseur pour votre commande.</p>
          </div>
          <Button variant="secondary" size="md"><Icon name="whatsapp" size={14}/>Contact</Button>
        </div>

        <div className="grid grid-cols-[360px_1fr] gap-6">
          <div className="space-y-4">
            <RequestCard/>
            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-5 sticky top-24">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Avancement</p>
              <Timeline/>
            </div>
          </div>

          <div>
            {req.proposal ? <ProposalCard/> : <NoProposalYet/>}
          </div>
        </div>
      </div>

      {modalOpen && <SourcingModal/>}
    </div>
  );
};

window.ScreenSourcing = ScreenSourcing;
