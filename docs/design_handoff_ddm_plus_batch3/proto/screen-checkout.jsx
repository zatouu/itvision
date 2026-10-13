// ============================================================
// SCREEN — CHECKOUT / ADRESSE
// ============================================================
const ScreenCheckout = ({ device = "mobile" }) => {
  const [ship, setShip] = React.useState("aerien");
  const [region, setRegion] = React.useState("Dakar");
  const [dept, setDept] = React.useState("Dakar");
  const [quartier, setQuartier] = React.useState("Almadies");

  const shippingOptions = [
    { key: "express", label: "Express aérien", days: "4-7 jours", price: 24500, sub: "Prioritaire · le plus rapide", icon: "plane" },
    { key: "aerien", label: "Standard aérien", days: "8-12 jours", price: 12500, sub: "Le meilleur rapport prix/délai", icon: "plane" },
    { key: "maritime", label: "Maritime", days: "35-45 jours", price: 4200, sub: "Le moins cher pour gros volumes", icon: "ship", groupTag: true },
  ];

  const items = CART;
  const sub = items.reduce((s,it)=>s+it.tierUnit*it.qty,0);
  const service = Math.round(sub*0.04);
  const insurance = Math.round(sub*0.015);
  const shipCost = shippingOptions.find(o=>o.key===ship).price;
  const savings = items.reduce((s,it)=>s+(it.unit-it.tierUnit)*it.qty,0);
  const total = sub + service + insurance + shipCost;

  const Stepper = () => (
    <div className="flex items-center gap-2 md:gap-3">
      {[
        { k: "cart", l: "Panier", done: true },
        { k: "adresse", l: "Livraison", done: false, active: true },
        { k: "paiement", l: "Paiement", done: false },
      ].map((s, i, arr) => (
        <React.Fragment key={s.k}>
          <div className="flex items-center gap-2">
            <span className={cx(
              "grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold",
              s.done ? "bg-emerald-600 text-white" : s.active ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            )}>
              {s.done ? <Icon name="check" size={14}/> : i+1}
            </span>
            <span className={cx("text-[12px] md:text-sm font-semibold", s.active?"text-slate-900 dark:text-white":s.done?"text-slate-700 dark:text-slate-300":"text-slate-400 dark:text-slate-500")}>{s.l}</span>
          </div>
          {i < arr.length - 1 && <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800"/>}
        </React.Fragment>
      ))}
    </div>
  );

  const ShippingCards = () => (
    <div className="space-y-2 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
      {shippingOptions.map((o) => {
        const active = ship === o.key;
        return (
          <button key={o.key} onClick={()=>setShip(o.key)} className={cx(
            "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all md:flex-col md:gap-2",
            active ? "border-emerald-600 bg-emerald-50 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/40" : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          )}>
            <div className="flex items-start justify-between w-full">
              <span className={cx("grid h-10 w-10 place-items-center rounded-lg", active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300")}>
                <Icon name={o.icon} size={18}/>
              </span>
              {o.groupTag && <Badge tone="violet"><Icon name="users" size={10}/> Idéal en groupe</Badge>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">{o.label}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{o.sub}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300"><Icon name="clock" size={11}/>{o.days}</span>
                <span className="text-[14px] font-extrabold text-slate-900 dark:text-white tabular-nums">{fmtFCFA(o.price)}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  const AddressForm = () => (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nom complet</span>
          <input defaultValue="Amadou Diallo" className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"/>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Téléphone</span>
          <div className="mt-1 flex items-center gap-1 rounded-xl border border-slate-200 bg-white pl-3 dark:border-slate-700 dark:bg-slate-900">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">🇸🇳 +221</span>
            <input defaultValue="77 123 45 67" className="h-11 flex-1 bg-transparent px-2 text-sm outline-none dark:text-white"/>
          </div>
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Région</span>
          <select value={region} onChange={e=>setRegion(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <option>Dakar</option><option>Thiès</option><option>Saint-Louis</option><option>Ziguinchor</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Département</span>
          <select value={dept} onChange={e=>setDept(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <option>Dakar</option><option>Pikine</option><option>Rufisque</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Quartier</span>
          <select value={quartier} onChange={e=>setQuartier(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <option>Almadies</option><option>Plateau</option><option>Point E</option><option>Mermoz</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Adresse (rue, N°, point de repère)</span>
        <input defaultValue="Route de Ngor, Résidence Les Almadies, Villa 12" className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"/>
      </label>

      {/* Fake map */}
      <div className="relative h-40 md:h-52 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-emerald-50 to-slate-50 dark:border-slate-800 dark:from-blue-950/30 dark:via-emerald-950/30 dark:to-slate-900">
        <svg viewBox="0 0 400 200" className="h-full w-full opacity-50">
          <path d="M0,120 Q100,80 200,110 T400,90 L400,200 L0,200 Z" fill="rgba(16,185,129,0.15)"/>
          <path d="M0,150 Q100,130 200,140 T400,130 L400,200 L0,200 Z" fill="rgba(37,99,235,0.15)"/>
          {Array.from({length:20}).map((_,i)=><circle key={i} cx={i*20+10} cy={100+Math.sin(i)*20} r="1.5" fill="#94a3b8"/>)}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-slate-900 shadow-md dark:bg-slate-900 dark:text-white">
            <Icon name="mapPin" size={14} className="text-red-600"/>
            Almadies, Dakar
          </div>
        </div>
      </div>
    </div>
  );

  const OrderRecap = () => (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Récapitulatif</h3>
      </div>
      <div className="max-h-56 overflow-y-auto p-3 space-y-2">
        {items.map((it)=>(
          <div key={it.id} className="flex items-center gap-3">
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
              <img src={it.image} alt="" className="h-full w-full object-cover"/>
              <span className="absolute -bottom-0.5 -right-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white">{it.qty}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-slate-900 dark:text-white line-clamp-1">{it.name}</p>
              <div className="mt-0.5 flex items-center gap-1">
                <Badge tone="amber" className="!text-[9px] !px-1 !py-0"><Icon name="package" size={9}/>Min {it.minOrderQty}</Badge>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{it.variant}</span>
              </div>
            </div>
            <p className="text-[12px] font-extrabold text-slate-900 dark:text-white tabular-nums flex-shrink-0">{fmtFCFA(it.tierUnit * it.qty)}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <dl className="space-y-1.5 text-[12px]">
          <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Sous-total ({items.reduce((s,i)=>s+i.qty,0)} pcs)</dt><dd className="font-semibold text-slate-900 dark:text-white tabular-nums">{fmtFCFA(sub)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Frais de service (4%)</dt><dd className="font-semibold text-slate-900 dark:text-white tabular-nums">{fmtFCFA(service)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Assurance import</dt><dd className="font-semibold text-slate-900 dark:text-white tabular-nums">{fmtFCFA(insurance)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1"><Icon name="truck" size={11}/>Transport ({shippingOptions.find(o=>o.key===ship).label})</dt><dd className="font-semibold text-slate-900 dark:text-white tabular-nums">{fmtFCFA(shipCost)}</dd></div>
          {savings > 0 && (
            <div className="flex justify-between rounded-md bg-emerald-50 px-1.5 py-1 -mx-1 dark:bg-emerald-950/40">
              <dt className="text-emerald-700 dark:text-emerald-300 font-bold inline-flex items-center gap-1"><Icon name="sparkles" size={11}/>Économie réalisée</dt>
              <dd className="text-emerald-700 dark:text-emerald-300 font-bold tabular-nums">-{fmtFCFA(savings)}</dd>
            </div>
          )}
        </dl>
        <div className="my-3 h-px bg-slate-200 dark:bg-slate-800"/>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold text-slate-900 dark:text-white">Total à payer</span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">{fmtFCFA(total)}</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Escrow — débité seulement après réception</p>
      </div>
    </Card>
  );

  // MOBILE
  if (device === "mobile") {
    return (
      <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
        <MarketHeader back={()=>{}} title="Livraison"/>
        <div className="flex-1 overflow-y-auto pb-32">
          <div className="p-4"><Stepper/></div>

          <Section title="Adresse de livraison" className="pb-4">
            <Card className="p-3"><AddressForm/></Card>
          </Section>

          <Section title="Mode d'expédition" subtitle="Depuis Guangzhou, Chine" className="pb-4">
            <ShippingCards/>
          </Section>

          <Section title="Votre commande" className="pb-4">
            <OrderRecap/>
          </Section>

          <div className="px-4 pb-4">
            <TrustStrip compact/>
          </div>
        </div>

        {/* Sticky bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">Total à payer</p>
              <p className="mt-0.5 text-[17px] font-extrabold text-slate-900 dark:text-white tabular-nums leading-tight whitespace-nowrap">{fmtFCFA(total)}</p>
            </div>
            <Button variant="primary" size="md" className="whitespace-nowrap flex-shrink-0">
              Aller au paiement
              <Icon name="arrowRight" size={14}/>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // DESKTOP
  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <MarketHeader device={device}/>
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-6"><Stepper/></div>
        <div className="grid grid-cols-[1fr_400px] gap-6">
          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="mb-4 text-base font-extrabold text-slate-900 dark:text-white">Adresse de livraison</h2>
              <AddressForm/>
            </Card>
            <Card className="p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Mode d'expédition</h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">Depuis Guangzhou, Chine — inspection incluse</span>
              </div>
              <ShippingCards/>
            </Card>
            <TrustStrip/>
          </div>

          <div>
            <div className="sticky top-20 space-y-4">
              <OrderRecap/>
              <Button variant="primary" size="lg" className="w-full">Aller au paiement <Icon name="arrowRight" size={16}/></Button>
              <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1"><Icon name="lock" size={12}/>Paiement sécurisé · Escrow Mobile Money</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.ScreenCheckout = ScreenCheckout;
