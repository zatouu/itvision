// ============================================================
// SCREEN — PAIEMENT ANNULÉ (/payment/cancel)
// ============================================================
const ScreenPaymentCancel = ({ device = "mobile" }) => {
  const ref = "PAY-2026-9812AB";
  const amount = ORDER_DETAIL.breakdown.total;

  const CancelIcon = () => (
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-red-500/10"/>
      <div className="relative grid h-24 w-24 md:h-28 md:w-28 place-items-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30">
        <Icon name="x" size={44} strokeWidth={3.5}/>
      </div>
    </div>
  );

  const Content = () => (
    <React.Fragment>
      <CancelIcon/>
      <p className="mt-6 text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400">Paiement annulé</p>
      <h1 className={cx("mt-1 font-extrabold tracking-tight text-slate-900 dark:text-white text-center", device === "mobile" ? "text-[24px]" : "text-[32px]")}>Votre paiement a été annulé</h1>
      <p className={cx("mt-2 text-slate-500 dark:text-slate-400 text-center max-w-md", device === "mobile" ? "text-[13px]" : "text-[15px]")}>
        <b className="text-slate-900 dark:text-white">Aucune somme n'a été débitée.</b> Vous pouvez réessayer avec le même mode de paiement ou en choisir un autre.
      </p>
      <p className="mt-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1">Réf. {ref}</p>

      {/* Recap card */}
      <div className="mt-6 w-full max-w-md rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Commande concernée</p>
            <p className="text-[13px] font-extrabold text-slate-900 dark:text-white tabular-nums">{ORDER_DETAIL.id}</p>
          </div>
          <Badge tone="amber">En attente</Badge>
        </div>
        <div className="my-3 h-px bg-slate-200 dark:bg-slate-800"/>
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-slate-500 dark:text-slate-400">Montant à régler</span>
          <span className="text-[20px] font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">{fmtFCFA(amount)}</span>
        </div>
        <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><Icon name="clock" size={11}/>Vous avez <b>48h</b> pour finaliser le paiement, sinon la commande sera annulée.</p>
      </div>

      {/* Reasons */}
      <div className="mt-6 w-full max-w-md rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Raisons possibles</p>
        <ul className="space-y-1.5 text-[12px] text-slate-700 dark:text-slate-300">
          <li className="flex items-start gap-2"><Icon name="x" size={13} className="mt-0.5 text-red-500 flex-shrink-0"/>Vous avez fermé la fenêtre de paiement</li>
          <li className="flex items-start gap-2"><Icon name="x" size={13} className="mt-0.5 text-red-500 flex-shrink-0"/>Solde insuffisant sur votre compte mobile money</li>
          <li className="flex items-start gap-2"><Icon name="x" size={13} className="mt-0.5 text-red-500 flex-shrink-0"/>Délai d'attente dépassé côté opérateur</li>
        </ul>
      </div>

      {/* CTAs */}
      <div className={cx("mt-6 w-full max-w-md flex gap-3", device === "mobile" && "flex-col")}>
        <Button variant="secondary" size="lg" className="flex-1">Continuer mes achats</Button>
        <Button variant="primary" size="lg" className="flex-1"><Icon name="refresh" size={16}/>Réessayer le paiement</Button>
      </div>

      {/* Support */}
      <div className="mt-6 w-full max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900 p-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-emerald-600 text-white"><Icon name="whatsapp" size={16}/></span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-extrabold text-slate-900 dark:text-white">Besoin d'aide ?</p>
            <p className="text-[10px] text-slate-600 dark:text-slate-400">Notre équipe résout les blocages sous 15 min</p>
          </div>
          <Button variant="primary" size="sm" className="!bg-emerald-600 flex-shrink-0"><Icon name="whatsapp" size={12}/>Contact</Button>
        </div>
      </div>
    </React.Fragment>
  );

  if (device === "mobile") {
    return (
      <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
        <div className="flex-shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-3">
          <p className="text-[15px] font-extrabold text-slate-900 dark:text-white text-center">
            <span className="text-emerald-600">DDM</span>+
          </p>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 pt-8 pb-6">
          <Content/>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <p className="text-[18px] font-extrabold text-slate-900 dark:text-white"><span className="text-emerald-600">DDM</span>+</p>
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-6 py-12 flex flex-col items-center">
        <Content/>
      </div>
    </div>
  );
};

window.ScreenPaymentCancel = ScreenPaymentCancel;
