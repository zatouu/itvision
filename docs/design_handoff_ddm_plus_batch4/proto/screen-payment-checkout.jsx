// ============================================================
// SCREEN — PAIEMENT CHECKOUT (/paiement/checkout/[reference])
// ============================================================
const ScreenPaymentCheckout = ({ device = "mobile" }) => {
  const [selectedMethod, setSelectedMethod] = React.useState("wave");
  const [phone, setPhone] = React.useState("");
  const total = ORDER_DETAIL.breakdown.total;
  const method = PAYMENT_METHODS.find(m => m.key === selectedMethod);

  const Stepper = () => (
    <div className="flex items-center gap-2 md:gap-3">
      {[
        { k: "cart", l: "Panier", done: true },
        { k: "adresse", l: "Livraison", done: true },
        { k: "paiement", l: "Paiement", active: true },
      ].map((s, i, arr) => (
        <React.Fragment key={s.k}>
          <div className="flex items-center gap-2">
            <span className={cx(
              "grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold",
              s.done ? "bg-emerald-600 text-white" : s.active ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            )}>
              {s.done ? <Icon name="check" size={14}/> : i + 1}
            </span>
            <span className={cx("text-[12px] md:text-sm font-semibold", s.active?"text-slate-900 dark:text-white":s.done?"text-slate-700 dark:text-slate-300":"text-slate-400")}>{s.l}</span>
          </div>
          {i < arr.length - 1 && <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800"/>}
        </React.Fragment>
      ))}
    </div>
  );

  const MethodTile = ({ m, active, onClick }) => (
    <button onClick={onClick} className={cx(
      "flex w-full items-center gap-3 rounded-2xl border-2 p-3 md:p-4 text-left transition-all",
      active ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
    )}>
      <span className={cx("grid h-11 w-11 md:h-12 md:w-12 flex-shrink-0 place-items-center rounded-xl text-white font-extrabold text-[13px] md:text-[14px]", m.accentBg)}>
        {m.initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] md:text-[14px] font-extrabold text-slate-900 dark:text-white">{m.label}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{m.sub}</p>
      </div>
      <span className={cx("grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border-2", active ? "border-emerald-600 bg-emerald-600" : "border-slate-300 dark:border-slate-600")}>
        {active && <span className="h-2 w-2 rounded-full bg-white"/>}
      </span>
    </button>
  );

  const Instructions = () => {
    if (selectedMethod === "wire") {
      return (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-2">Coordonnées bancaires DDM+</p>
          <div className="rounded-lg bg-white dark:bg-slate-900 p-3 border border-blue-100 dark:border-blue-950">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">IBAN</p>
            <p className="mt-0.5 font-mono text-[12px] font-bold text-slate-900 dark:text-white break-all">{method.iban}</p>
          </div>
          <p className="mt-2 text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
            Mentionnez la référence <b className="font-mono">PAY-2026-9812AB</b> lors du virement. Validation sous 24-48h après réception.
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Instructions {method.label}</p>
        <ol className="space-y-2.5 text-[12px] text-slate-700 dark:text-slate-300">
          <li className="flex gap-2.5">
            <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-emerald-600 text-white text-[10px] font-extrabold">1</span>
            <span>Ouvrez votre application <b>{method.label}</b>.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-emerald-600 text-white text-[10px] font-extrabold">2</span>
            <span>Envoyez <b className="whitespace-nowrap tabular-nums">{fmtFCFA(total)}</b> au numéro marchand :</span>
          </li>
          <li className="pl-7">
            <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 flex items-center justify-between gap-2">
              <span className="font-mono text-[13px] font-extrabold text-slate-900 dark:text-white">{method.merchantPhone}</span>
              <button className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap inline-flex items-center gap-1">
                <Icon name="copy" size={11}/>Copier
              </button>
            </div>
          </li>
          <li className="flex gap-2.5">
            <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-emerald-600 text-white text-[10px] font-extrabold">3</span>
            <span>Renseignez votre numéro <b>{method.label}</b> ci-dessous pour recevoir la confirmation.</span>
          </li>
        </ol>
      </div>
    );
  };

  const OrderRecap = ({ sticky = false }) => (
    <div className={cx("rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden", sticky && "sticky top-24")}>
      <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Récapitulatif</p>
        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{ORDER_DETAIL.tracking}</p>
      </div>
      <div className="max-h-56 overflow-y-auto p-3 space-y-2">
        {ORDER_DETAIL.items.map((it, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
              <img src={it.image} className="h-full w-full object-cover"/>
              <span className="absolute -bottom-0.5 -right-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-slate-900 dark:bg-white dark:text-slate-900 px-1 text-[9px] font-bold text-white tabular-nums">{it.qty}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-900 dark:text-white line-clamp-1">{it.name}</p>
              <p className="text-[9px] text-slate-500 dark:text-slate-400">{it.variant}</p>
            </div>
            <p className="text-[11px] font-extrabold tabular-nums whitespace-nowrap text-slate-900 dark:text-white flex-shrink-0">{fmtFCFA(it.unit * it.qty)}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-1.5 text-[12px]">
        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Sous-total</span><span className="font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">{fmtFCFA(ORDER_DETAIL.breakdown.subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Frais de service (4%)</span><span className="font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">{fmtFCFA(ORDER_DETAIL.breakdown.service)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Assurance</span><span className="font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">{fmtFCFA(ORDER_DETAIL.breakdown.insurance)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1"><Icon name="truck" size={11}/>Transport</span><span className="font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">{fmtFCFA(ORDER_DETAIL.breakdown.shippingCost)}</span></div>
        {ORDER_DETAIL.breakdown.savings > 0 && (
          <div className="flex justify-between rounded-md bg-emerald-50 dark:bg-emerald-950/40 -mx-1 px-1.5 py-1">
            <span className="text-emerald-700 dark:text-emerald-300 font-bold inline-flex items-center gap-1"><Icon name="sparkles" size={11}/>Économie</span>
            <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300 whitespace-nowrap">-{fmtFCFA(ORDER_DETAIL.breakdown.savings)}</span>
          </div>
        )}
        <div className="my-2 h-px bg-slate-200 dark:bg-slate-800"/>
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-bold text-slate-900 dark:text-white">Total à payer</span>
          <span className="text-[22px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">{fmtFCFA(total)}</span>
        </div>
        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><Icon name="shield" size={10}/>Escrow · débité seulement après réception</p>
      </div>
    </div>
  );

  const TrustFooter = () => (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900 p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-emerald-600 text-white"><Icon name="whatsapp" size={16}/></span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-extrabold text-slate-900 dark:text-white">Un problème avec le paiement ?</p>
          <p className="text-[10px] text-slate-600 dark:text-slate-400">Notre équipe est disponible 7j/7 sur WhatsApp</p>
        </div>
        <Button variant="primary" size="sm" className="!bg-emerald-600 flex-shrink-0"><Icon name="whatsapp" size={12}/>Contact</Button>
      </div>
    </div>
  );

  // ==================== MOBILE ====================
  if (device === "mobile") {
    return (
      <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
        <MarketHeader device={device} back={() => {}} title="Paiement"/>

        <div className="flex-1 overflow-y-auto pb-32">
          <div className="p-4"><Stepper/></div>

          {/* Total hero */}
          <div className="mx-4 mb-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-900 text-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">Montant à payer</p>
            <p className="mt-1 text-[32px] font-extrabold tabular-nums whitespace-nowrap leading-none">{fmtFCFA(total)}</p>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-white/85 flex items-center gap-1"><Icon name="package" size={11}/>{ORDER_DETAIL.items.reduce((s,i)=>s+i.qty,0)} pcs · {ORDER_DETAIL.items.length} articles</span>
              <span className="text-white/85 flex items-center gap-1 font-mono">Réf. PAY-2026-9812AB</span>
            </div>
          </div>

          <Section title="Choisissez un mode de paiement" className="pb-4">
            <div className="space-y-2">
              {PAYMENT_METHODS.map(m => <MethodTile key={m.key} m={m} active={selectedMethod === m.key} onClick={() => setSelectedMethod(m.key)}/>)}
            </div>
          </Section>

          <Section className="pb-4">
            <Instructions/>
          </Section>

          {selectedMethod !== "wire" && (
            <Section title={`Votre numéro ${method.label}`} className="pb-4">
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white pl-3 dark:border-slate-700 dark:bg-slate-900">
                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">🇸🇳 +221</span>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="77 000 00 00" className="h-11 flex-1 bg-transparent px-2 text-sm outline-none dark:text-white tabular-nums"/>
              </div>
            </Section>
          )}

          <Section title="Récapitulatif de la commande" className="pb-4">
            <OrderRecap/>
          </Section>

          <div className="px-4"><TrustFooter/></div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <Button variant="primary" size="lg" className="w-full whitespace-nowrap">
            <Icon name="lock" size={16}/>Payer {fmtFCFA(total)}
          </Button>
          <p className="mt-2 text-center text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1"><Icon name="shield" size={11}/>Escrow protégé · Débité après réception</p>
        </div>
      </div>
    );
  }

  // ==================== DESKTOP ====================
  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <MarketHeader device={device}/>
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-6"><Stepper/></div>

        <div className="grid grid-cols-[1fr_400px] gap-6">
          <div className="space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-900 text-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">Montant à payer</p>
                  <p className="mt-1 text-[42px] font-extrabold tabular-nums whitespace-nowrap leading-none">{fmtFCFA(total)}</p>
                  <p className="mt-2 text-[12px] text-white/85 flex items-center gap-1"><Icon name="package" size={12}/>{ORDER_DETAIL.items.reduce((s,i)=>s+i.qty,0)} pcs · {ORDER_DETAIL.items.length} articles</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-white/70">Référence</p>
                  <p className="text-[13px] font-mono font-bold">PAY-2026-9812AB</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
              <p className="text-[15px] font-extrabold text-slate-900 dark:text-white mb-4">Choisissez un mode de paiement</p>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map(m => <MethodTile key={m.key} m={m} active={selectedMethod === m.key} onClick={() => setSelectedMethod(m.key)}/>)}
              </div>
              <div className="mt-5"><Instructions/></div>

              {selectedMethod !== "wire" && (
                <div className="mt-4">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Votre numéro {method.label}</label>
                  <div className="mt-1 flex items-center gap-1 rounded-xl border border-slate-200 bg-white pl-3 dark:border-slate-700 dark:bg-slate-900">
                    <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">🇸🇳 +221</span>
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="77 000 00 00" className="h-11 flex-1 bg-transparent px-2 text-sm outline-none dark:text-white tabular-nums"/>
                  </div>
                </div>
              )}
            </div>

            <TrustFooter/>
          </div>

          <div>
            <div className="sticky top-24 space-y-4">
              <OrderRecap/>
              <Button variant="primary" size="lg" className="w-full whitespace-nowrap"><Icon name="lock" size={16}/>Payer {fmtFCFA(total)}</Button>
              <p className="text-center text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1"><Icon name="shield" size={11}/>Escrow · débité seulement après réception</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.ScreenPaymentCheckout = ScreenPaymentCheckout;
