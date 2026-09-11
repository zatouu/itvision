// ============================================================
// SCREEN — FORMULAIRE PARTAGÉ (Litige / Réclamation / Retour)
// Une seule prop `variant` change tout
// ============================================================
const ScreenFormRequest = ({ device = "mobile", initialVariant = "litige" }) => {
  const [variant, setVariant] = React.useState(initialVariant);
  const [step, setStep] = React.useState("form"); // "form" | "success"
  const [reason, setReason] = React.useState("");
  const [urgency, setUrgency] = React.useState("normal");
  const [refundOrExchange, setRefundOrExchange] = React.useState("refund");
  const [selectedItems, setSelectedItems] = React.useState([0]);

  const variants = {
    litige: {
      label: "Ouvrir un litige",
      route: "/suivi/[reference]/litige",
      icon: "info",
      tone: "red",
      hero: "Un problème avec votre commande ?",
      sub: "Notre équipe traite votre litige sous 24h ouvrées.",
      referencePrefilled: true,
      showItems: false,
      showRefundChoice: false,
      showUrgency: true,
      showPhotos: true,
      reasons: [
        { k: "not_received",  l: "Commande jamais reçue" },
        { k: "damaged",       l: "Produits endommagés à la livraison" },
        { k: "wrong_item",    l: "Mauvais article reçu" },
        { k: "missing_item",  l: "Articles manquants" },
        { k: "not_conform",   l: "Non conforme à la description" },
        { k: "other",         l: "Autre" },
      ],
      submitLabel: "Ouvrir le litige",
      successTitle: "Litige enregistré",
      successMsg: "Un conseiller vous contactera sous 24h ouvrées. Vous pouvez suivre l'avancement dans Mes commandes.",
    },
    reclamation: {
      label: "Réclamer une commande",
      route: "/compte/reclamer-commande",
      icon: "helpCircle",
      tone: "amber",
      hero: "Je réclame une commande passée",
      sub: "Une commande n'apparaît pas dans votre historique ? Réclamez-la ici.",
      referencePrefilled: false,
      showItems: false,
      showRefundChoice: false,
      showUrgency: true,
      showPhotos: true,
      reasons: [
        { k: "missing_order",   l: "Commande absente de mon historique" },
        { k: "wrong_account",   l: "Commande créée sur le mauvais compte" },
        { k: "payment_pending", l: "Paiement fait mais commande non confirmée" },
        { k: "other",           l: "Autre" },
      ],
      submitLabel: "Envoyer la réclamation",
      successTitle: "Réclamation reçue",
      successMsg: "Notre équipe vérifie et vous répond sous 24h ouvrées par SMS et WhatsApp.",
    },
    retour: {
      label: "Demander un retour",
      route: "/commandes/[orderId]/retour",
      icon: "refresh",
      tone: "violet",
      hero: "Demander un retour ou un échange",
      sub: "Sous 7 jours après réception. On vous rembourse via le mode de paiement d'origine.",
      referencePrefilled: true,
      showItems: true,
      showRefundChoice: true,
      showUrgency: false,
      showPhotos: true,
      reasons: [
        { k: "defective",      l: "Produit défectueux" },
        { k: "not_as_described",l: "Non conforme à la description" },
        { k: "wrong_size",     l: "Ne me convient pas" },
        { k: "damaged_ship",   l: "Endommagé pendant la livraison" },
        { k: "changed_mind",   l: "J'ai changé d'avis" },
      ],
      submitLabel: "Envoyer la demande de retour",
      successTitle: "Demande de retour envoyée",
      successMsg: "Notre équipe organise le retour avec vous sous 24h. Un lien de suivi vous sera envoyé.",
    },
  };

  const v = variants[variant];

  const toggleItem = (idx) => {
    setSelectedItems(cur => cur.includes(idx) ? cur.filter(i => i !== idx) : [...cur, idx]);
  };

  const toneBg = {
    red: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  };

  // ==================== VARIANT SELECTOR (démo) ====================
  const VariantSelector = () => (
    <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
      {Object.entries(variants).map(([k, vv]) => (
        <button key={k} onClick={() => { setVariant(k); setStep("form"); }} className={cx(
          "flex-1 rounded-lg py-1.5 text-[10px] font-bold whitespace-nowrap",
          variant === k ? "bg-white shadow-sm text-slate-900 dark:bg-slate-950 dark:text-white" : "text-slate-500"
        )}>
          {vv.label.split(" ").slice(1).join(" ") || vv.label}
        </button>
      ))}
    </div>
  );

  // ==================== FORM ====================
  const FormBody = () => (
    <div className="space-y-4">
      {/* Référence commande */}
      <Card className="p-4">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Référence de la commande</label>
        {v.referencePrefilled ? (
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"><Icon name="package" size={16}/></span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold text-slate-900 dark:text-white tabular-nums">{CLAIM_CONTEXT.reference}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Total payé : <b className="text-slate-900 dark:text-white tabular-nums">{fmtFCFA(CLAIM_CONTEXT.totalPaid)}</b></p>
            </div>
            <Badge tone="emerald">Pré-rempli</Badge>
          </div>
        ) : (
          <React.Fragment>
            <input placeholder="CMD-2026-XXXX" className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono uppercase"/>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Le numéro figure dans votre email de confirmation ou par SMS.</p>
          </React.Fragment>
        )}
      </Card>

      {/* Articles concernés (retour uniquement) */}
      {v.showItems && (
        <Card>
          <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Article(s) à retourner</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Sélectionnez les articles concernés</p>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {CLAIM_CONTEXT.itemsAvailable.map((it, i) => {
              const active = selectedItems.includes(i);
              return (
                <button key={i} onClick={() => toggleItem(i)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                  <span className={cx("grid h-5 w-5 flex-shrink-0 place-items-center rounded-md border-2", active ? "border-emerald-600 bg-emerald-600" : "border-slate-300 dark:border-slate-600")}>
                    {active && <Icon name="check" size={12} className="text-white" strokeWidth={3}/>}
                  </span>
                  <img src={it.image} className="h-12 w-12 rounded-lg object-cover flex-shrink-0"/>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-slate-900 dark:text-white line-clamp-1">{it.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">{it.qty} pcs · {fmtFCFA(it.unit * it.qty)}</p>
                  </div>
                  {active && (
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5" onClick={e => e.stopPropagation()}>
                      <button className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon name="minus" size={11}/></button>
                      <span className="w-6 text-center text-[11px] font-extrabold tabular-nums">{it.qty}</span>
                      <button className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon name="plus" size={11}/></button>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {selectedItems.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex items-baseline justify-between text-[11px] bg-slate-50 dark:bg-slate-800">
              <span className="text-slate-600 dark:text-slate-300 font-semibold">{selectedItems.length} article(s) sélectionné(s)</span>
              <span className="font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                {fmtFCFA(selectedItems.reduce((s, i) => s + CLAIM_CONTEXT.itemsAvailable[i].unit * CLAIM_CONTEXT.itemsAvailable[i].qty, 0))}
              </span>
            </div>
          )}
        </Card>
      )}

      {/* Motif */}
      <Card className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Motif</p>
        <div className="space-y-1.5">
          {v.reasons.map(r => (
            <button key={r.k} onClick={() => setReason(r.k)} className={cx(
              "w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
              reason === r.k ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
            )}>
              <span className={cx("grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border-2", reason === r.k ? "border-emerald-600 bg-emerald-600" : "border-slate-300 dark:border-slate-600")}>
                {reason === r.k && <span className="h-2 w-2 rounded-full bg-white"/>}
              </span>
              <span className={cx("text-[12px] font-semibold", reason === r.k ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300")}>{r.l}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Remboursement ou échange (retour uniquement) */}
      {v.showRefundChoice && (
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Vous souhaitez</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { k: "refund",   l: "Remboursement", i: "wallet", sub: "Sous 5-7 jours ouvrés" },
              { k: "exchange", l: "Échange",       i: "refresh", sub: "Article de remplacement" },
            ].map(o => (
              <button key={o.k} onClick={() => setRefundOrExchange(o.k)} className={cx(
                "rounded-xl border-2 p-3 text-left transition-all",
                refundOrExchange === o.k ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cx("grid h-8 w-8 place-items-center rounded-lg", refundOrExchange === o.k ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300")}><Icon name={o.i} size={14}/></span>
                  <span className="text-[13px] font-extrabold text-slate-900 dark:text-white">{o.l}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{o.sub}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Urgence (litige / réclamation) */}
      {v.showUrgency && (
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Niveau d'urgence</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { k: "low",    l: "Faible", tone: "slate" },
              { k: "normal", l: "Normal", tone: "emerald" },
              { k: "high",   l: "Urgent", tone: "red" },
            ].map(u => (
              <button key={u.k} onClick={() => setUrgency(u.k)} className={cx(
                "rounded-xl border-2 py-2.5 text-[12px] font-bold transition-all",
                urgency === u.k
                  ? (u.tone === "red" ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300"
                    : u.tone === "emerald" ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                    : "border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:border-slate-500 dark:text-slate-300")
                  : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
              )}>
                {u.l}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Description */}
      <Card className="p-4">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</label>
        <textarea rows="5" placeholder="Décrivez le problème avec un maximum de détails…" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white resize-none"/>
        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Plus votre description est précise, plus notre équipe traite votre demande rapidement.</p>
      </Card>

      {/* Photos */}
      {v.showPhotos && (
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Pièces jointes (optionnel)</p>
          <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5 text-center cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
            <div className="grid h-10 w-10 mx-auto place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 mb-2"><Icon name="upload" size={18}/></div>
            <p className="text-[12px] font-bold text-slate-900 dark:text-white">Ajouter des photos ou vidéos</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Jusqu'à 5 fichiers · JPG, PNG, MP4 · max 10 Mo chacun</p>
          </div>
        </Card>
      )}

      {/* Téléphone */}
      <Card className="p-4">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Téléphone pour vous joindre</label>
        <div className="mt-2 flex items-center gap-1 rounded-xl border border-slate-200 bg-white pl-3 dark:border-slate-700 dark:bg-slate-900">
          <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">🇸🇳 +221</span>
          <input defaultValue="77 123 45 67" className="h-11 flex-1 bg-transparent px-2 text-sm outline-none dark:text-white tabular-nums"/>
        </div>
      </Card>

      {/* SLA banner */}
      <div className={cx("rounded-2xl border p-3 flex items-start gap-2",
        v.tone === "red" ? "border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900"
          : v.tone === "amber" ? "border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900"
          : "border-violet-200 bg-violet-50 dark:bg-violet-950/40 dark:border-violet-900"
      )}>
        <Icon name="clock" size={16} className={cx("flex-shrink-0 mt-0.5",
          v.tone === "red" ? "text-red-600 dark:text-red-400"
            : v.tone === "amber" ? "text-amber-700 dark:text-amber-400"
            : "text-violet-700 dark:text-violet-400"
        )}/>
        <p className={cx("text-[11px] leading-relaxed",
          v.tone === "red" ? "text-red-900 dark:text-red-200"
            : v.tone === "amber" ? "text-amber-900 dark:text-amber-200"
            : "text-violet-900 dark:text-violet-200"
        )}>
          <b>Réponse sous 24h ouvrées.</b> Vous serez notifié par SMS et WhatsApp dès qu'un conseiller prend en charge votre demande.
        </p>
      </div>
    </div>
  );

  // ==================== SUCCESS STATE ====================
  const SuccessBody = () => (
    <div className="flex flex-col items-center px-4 pt-8 pb-6 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{animationDuration: "2s"}}/>
        <div className="relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
          <Icon name="check" size={44} strokeWidth={3.5}/>
        </div>
      </div>
      <p className="mt-6 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Envoyé avec succès</p>
      <h2 className="mt-1 text-[22px] font-extrabold tracking-tight text-slate-900 dark:text-white">{v.successTitle}</h2>
      <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400 max-w-md">{v.successMsg}</p>
      <p className="mt-3 font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1">Réf. DEM-2026-{Math.floor(Math.random()*9000+1000)}</p>

      <div className={cx("mt-6 w-full max-w-sm flex gap-2", device === "mobile" && "flex-col")}>
        <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep("form")}>Nouvelle demande</Button>
        <Button variant="primary" size="lg" className="flex-1">Voir mes commandes</Button>
      </div>
    </div>
  );

  // ==================== LAYOUT ====================
  const Header = () => (
    <div className={cx("border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4",
      device === "mobile" ? "" : "px-6"
    )}>
      <div className="flex items-start gap-3">
        <span className={cx("grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl", toneBg[v.tone])}>
          <Icon name={v.icon} size={20}/>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{v.label}</p>
          <p className={cx("mt-0.5 font-extrabold text-slate-900 dark:text-white leading-tight", device === "mobile" ? "text-[17px]" : "text-[22px]")}>{v.hero}</p>
          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400 leading-snug">{v.sub}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      <MarketHeader device={device} back={() => {}} title={v.label}/>

      {/* Demo variant selector */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 whitespace-nowrap">Démo :</span>
          <div className="flex-1"><VariantSelector/></div>
        </div>
      </div>

      {step === "success" ? (
        <div className="flex-1 overflow-y-auto"><SuccessBody/></div>
      ) : (
        <React.Fragment>
          <div className={cx("flex-1 overflow-y-auto pb-24", device === "desktop" && "flex justify-center")}>
            <div className={cx(device === "desktop" ? "w-full max-w-2xl" : "")}>
              <Header/>
              <div className={cx("p-4", device === "desktop" && "px-6")}>
                <FormBody/>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className={cx("mx-auto", device === "desktop" && "max-w-2xl")}>
              <div className="flex gap-2">
                <Button variant="secondary" size="lg" className="flex-1">Annuler</Button>
                <Button variant="primary" size="lg" className="flex-1" onClick={() => setStep("success")}>
                  <Icon name="send" size={16}/>{v.submitLabel}
                </Button>
              </div>
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
};

// 3 wrappers pour distinguer dans la nav
const ScreenClaimLitige     = ({ device }) => <ScreenFormRequest device={device} initialVariant="litige"/>;
const ScreenClaimReclamation= ({ device }) => <ScreenFormRequest device={device} initialVariant="reclamation"/>;
const ScreenClaimRetour     = ({ device }) => <ScreenFormRequest device={device} initialVariant="retour"/>;

window.ScreenFormRequest = ScreenFormRequest;
window.ScreenClaimLitige = ScreenClaimLitige;
window.ScreenClaimReclamation = ScreenClaimReclamation;
window.ScreenClaimRetour = ScreenClaimRetour;
