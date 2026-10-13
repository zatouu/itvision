// ============================================================
// SCREEN — PAIEMENT SUCCÈS (/payment/success)
// ============================================================
const ScreenPaymentSuccess = ({ device = "mobile" }) => {
  const p = PAYMENT_SUCCESS;
  const totalPcs = p.items.reduce((s, it) => s + it.qty, 0);

  const CheckIcon = () => (
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{animationDuration: "2s"}}/>
      <div className="relative grid h-24 w-24 md:h-28 md:w-28 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
        <Icon name="check" size={48} strokeWidth={3}/>
      </div>
    </div>
  );

  const Timeline = () => (
    <div className="relative">
      {ORDER_STEPS.map((step, i) => {
        const isDone = i < 1;   // "Commande confirmée" en done
        const isCurrent = i === 1; // "Sourcing" prochain
        const isLast = i === ORDER_STEPS.length - 1;
        return (
          <div key={step.key} className="relative pl-11 pb-4 last:pb-0">
            {!isLast && (
              <span className={cx("absolute left-[15px] top-8 bottom-0 w-0.5", isDone ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700")}/>
            )}
            <span className={cx(
              "absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold",
              isDone ? "bg-emerald-500 text-white" : isCurrent ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
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

  const HorizontalTimeline = () => (
    <div className="flex items-center gap-1 md:gap-2">
      {ORDER_STEPS.map((step, i) => {
        const isDone = i < 1;
        const isCurrent = i === 1;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <span className={cx(
                "grid h-8 w-8 md:h-9 md:w-9 place-items-center rounded-full text-[11px] font-bold",
                isDone ? "bg-emerald-500 text-white" : isCurrent ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
              )}>
                {isDone ? <Icon name="check" size={13}/> : i + 1}
              </span>
              <span className={cx("text-[9px] md:text-[10px] font-bold text-center leading-tight whitespace-nowrap max-w-[70px] md:max-w-[90px]", (isDone || isCurrent) ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500")}>{step.label}</span>
            </div>
            {i < ORDER_STEPS.length - 1 && (
              <span className={cx("h-0.5 flex-1 min-w-[16px] mb-4", isDone ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700")}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const OrderSummary = () => (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Commande</p>
          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white tabular-nums">{p.orderId}</p>
        </div>
        <Badge tone="emerald"><Icon name="check" size={11}/>Payée</Badge>
      </div>

      <div className="space-y-2 mb-3">
        {p.items.map((it, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <img src={it.image} className="h-10 w-10 rounded-lg object-cover flex-shrink-0"/>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-slate-900 dark:text-white line-clamp-1">{it.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">{it.qty} pcs</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-1.5 text-[12px]">
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Total ({totalPcs} pcs)</span>
          <span className="font-extrabold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">{fmtFCFA(p.amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Payé le</span>
          <span className="font-semibold text-slate-900 dark:text-white">{p.paidAt}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Méthode</span>
          <span className="font-semibold text-slate-900 dark:text-white font-mono">{p.method}</span>
        </div>
        <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 mt-2">
          <span className="text-slate-500 dark:text-slate-400">Livraison prévue</span>
          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{p.eta}</span>
        </div>
      </div>
    </div>
  );

  const WhatsAppCard = () => (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900 p-3 md:p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 md:h-11 md:w-11 flex-shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
          <Icon name="whatsapp" size={18}/>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Besoin d'aide ?</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">Notre équipe est là 7j/7</p>
        </div>
        <Button variant="primary" size="sm" className="!bg-emerald-600 flex-shrink-0"><Icon name="whatsapp" size={12}/>Contact</Button>
      </div>
    </div>
  );

  // ==================== MOBILE ====================
  if (device === "mobile") {
    return (
      <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
        <div className="flex-shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-3">
          <p className="text-[15px] font-extrabold text-slate-900 dark:text-white text-center">
            <span className="text-emerald-600">DDM</span>+
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center px-4 pt-8 pb-6">
            <CheckIcon/>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Paiement confirmé</p>
            <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-white text-center">Merci pour votre commande</h1>
            <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400 text-center max-w-xs">Votre paiement a bien été reçu. Vous recevrez une confirmation par SMS.</p>
            <p className="mt-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1">Réf. {p.reference}</p>
          </div>

          <div className="px-4 space-y-4">
            <OrderSummary/>

            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Prochaines étapes</p>
              <div className="overflow-x-auto -mx-4 px-4 pb-1">
                <div className="min-w-max"><HorizontalTimeline/></div>
              </div>
            </div>

            <WhatsAppCard/>

            <div className="space-y-2 pt-2">
              <Button variant="primary" size="lg" className="w-full"><Icon name="package" size={16}/>Voir mes commandes</Button>
              <Button variant="secondary" size="lg" className="w-full">Retour à l'accueil</Button>
            </div>

            <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 pt-2 pb-4">Un problème avec ce paiement ? <a className="font-bold text-emerald-600 dark:text-emerald-400 underline cursor-pointer">Vérifier</a></p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== DESKTOP ====================
  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <p className="text-[18px] font-extrabold text-slate-900 dark:text-white"><span className="text-emerald-600">DDM</span>+</p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="flex flex-col items-center text-center mb-8">
          <CheckIcon/>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Paiement confirmé</p>
          <h1 className="mt-2 text-[36px] font-extrabold tracking-tight text-slate-900 dark:text-white">Merci pour votre commande</h1>
          <p className="mt-2 text-[15px] text-slate-500 dark:text-slate-400 max-w-md">Votre paiement de <b className="text-slate-900 dark:text-white tabular-nums whitespace-nowrap">{fmtFCFA(p.amount)}</b> a bien été reçu. Vous recevrez une confirmation par SMS et par email.</p>
          <p className="mt-3 font-mono text-[12px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5">Réf. {p.reference}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-6 mb-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Prochaines étapes</p>
          <HorizontalTimeline/>
          <p className="mt-4 text-[12px] text-slate-500 dark:text-slate-400 text-center">Livraison prévue le <b className="text-emerald-600 dark:text-emerald-400">{p.eta}</b></p>
        </div>

        <div className="mb-4">
          <OrderSummary/>
        </div>

        <div className="mb-4">
          <WhatsAppCard/>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" size="lg" className="flex-1">Retour à l'accueil</Button>
          <Button variant="primary" size="lg" className="flex-1"><Icon name="package" size={16}/>Voir mes commandes</Button>
        </div>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 pt-6">Un problème avec ce paiement ? <a className="font-bold text-emerald-600 dark:text-emerald-400 underline cursor-pointer">Vérifier ou réessayer</a></p>
      </div>
    </div>
  );
};

window.ScreenPaymentSuccess = ScreenPaymentSuccess;
