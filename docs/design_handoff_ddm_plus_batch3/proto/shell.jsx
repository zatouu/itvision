// ============================================================
// PROTOTYPE SHELL — navigation, device toggle, dark toggle
// ============================================================
const SCREENS = [
  { key: "home", label: "Accueil", icon: "home", comp: "ScreenHome", batch: 1 },
  { key: "catalog", label: "Catalogue", icon: "grid", comp: "ScreenCatalog", batch: 1 },
  { key: "account", label: "Mon compte", icon: "user", comp: "ScreenAccount", batch: 1 },
  { key: "orders", label: "Mes commandes", icon: "package", comp: "ScreenOrders", batch: 1 },
  { key: "tracking", label: "Suivi commande", icon: "truck", comp: "ScreenTracking", batch: 1 },
  { key: "product", label: "Fiche produit", icon: "boxes", comp: "ScreenProduct", batch: 2 },
  { key: "cart", label: "Panier", icon: "cart", comp: "ScreenCart", batch: 2 },
  { key: "checkout", label: "Checkout", icon: "wallet", comp: "ScreenCheckout", batch: 2 },
  { key: "groups", label: "Groupes", icon: "users", comp: "ScreenGroups", batch: 2 },
  { key: "groupDetail", label: "Détail groupe", icon: "target", comp: "ScreenGroupDetail", batch: 2 },
  { key: "paymentSuccess", label: "Paiement succès", icon: "checkCircle", comp: "ScreenPaymentSuccess", batch: 3 },
  { key: "shop", label: "Boutique / Vendeur", icon: "store", comp: "ScreenShop", batch: 3 },
  { key: "sourcing", label: "Sourcing (+modale)", icon: "camera", comp: "ScreenSourcing", batch: 3 },
  { key: "pricing", label: "Prix transparent", icon: "banknote", comp: "ScreenPricing", batch: 3 },
  { key: "vendor", label: "Devenir vendeur", icon: "factory", comp: "ScreenVendor", batch: 3 },
];

const loadPref = (k, d) => {
  try { const v = localStorage.getItem("ddm:" + k); return v == null ? d : JSON.parse(v); } catch { return d; }
};
const savePref = (k, v) => { try { localStorage.setItem("ddm:" + k, JSON.stringify(v)); } catch {} };

const App = () => {
  const [screen, setScreen] = React.useState(() => loadPref("screen", "home"));
  const [device, setDevice] = React.useState(() => loadPref("device", "mobile"));
  const [dark, setDark] = React.useState(() => loadPref("dark", false));

  React.useEffect(() => { savePref("screen", screen); }, [screen]);
  React.useEffect(() => { savePref("device", device); }, [device]);
  React.useEffect(() => {
    savePref("dark", dark);
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const Comp = window[SCREENS.find(s => s.key === screen).comp];

  return (
    <div className="min-h-screen bg-neutral-200 dark:bg-neutral-900 flex">
      {/* Left rail */}
      <aside className="hidden md:flex sticky top-0 h-screen w-60 flex-shrink-0 flex-col border-r border-neutral-300/50 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Prototype · Safe</p>
          <p className="mt-0.5 text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">DDM+ Marketplace</p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300">
            <span className="h-1 w-1 rounded-full bg-amber-500"/>Données de démonstration
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {[1,2,3].map((batch) => {
            const items = SCREENS.filter(s => s.batch === batch);
            const globalIndex = (key) => SCREENS.findIndex(s => s.key === key);
            const batchLabels = {1: "Batch 1 · Parcours", 2: "Batch 2 · Achat", 3: "Batch 3 · Finalisation"};
            return (
              <div key={batch} className="mb-4">
                <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {batchLabels[batch]}
                </p>
                <nav className="space-y-0.5">
                  {items.map((s) => {
                    const idx = globalIndex(s.key);
                    return (
                      <button
                        key={s.key}
                        onClick={() => setScreen(s.key)}
                        className={cx(
                          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold transition-colors",
                          screen === s.key
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        )}
                      >
                        <span className={cx("grid h-6 w-6 place-items-center rounded-md text-[10px] font-extrabold tabular-nums", screen === s.key ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}>
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 truncate">{s.label}</span>
                        <Icon name={s.icon} size={14} className="text-slate-400 dark:text-slate-500"/>
                      </button>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        <div className="space-y-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
          <div>
            <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Device</p>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button onClick={() => setDevice("mobile")} className={cx("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold", device === "mobile" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-600 dark:text-slate-400")}>
                <Icon name="smartphone" size={13}/>Mobile
              </button>
              <button onClick={() => setDevice("desktop")} className={cx("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold", device === "desktop" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-600 dark:text-slate-400")}>
                <Icon name="monitor" size={13}/>Desktop
              </button>
            </div>
          </div>

          <div>
            <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Thème</p>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button onClick={() => setDark(false)} className={cx("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold", !dark ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 dark:text-slate-400")}>
                <Icon name="sun" size={13}/>Light
              </button>
              <button onClick={() => setDark(true)} className={cx("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold", dark ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 dark:text-slate-400")}>
                <Icon name="moon" size={13}/>Dark
              </button>
            </div>
          </div>

          <p className="mt-2 px-1 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
            Direction Safe · Batch 1 en cours. Mock data anonymisé (Client A, Commande #001…).
          </p>
        </div>
      </aside>

      {/* Mobile top rail */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center gap-2 border-b border-neutral-300/50 bg-white/95 backdrop-blur px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950/95">
        <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">DDM+</p>
        <select value={screen} onChange={e=>setScreen(e.target.value)} className="flex-1 h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-semibold outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          {SCREENS.map((s,i)=><option key={s.key} value={s.key}>{String(i+1).padStart(2,"0")} · {s.label}</option>)}
        </select>
        <button onClick={()=>setDark(d=>!d)} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Icon name={dark?"sun":"moon"} size={14}/>
        </button>
      </div>

      {/* Stage */}
      <main className="flex-1 min-w-0 md:p-8 pt-14 md:pt-8 flex items-start justify-center overflow-x-auto">
        {device === "mobile" ? (
          <MobileFrame key={screen + "-mobile-" + dark}>
            <Comp device="mobile"/>
          </MobileFrame>
        ) : (
          <DesktopFrame key={screen + "-desktop-" + dark}>
            <Comp device="desktop"/>
          </DesktopFrame>
        )}
      </main>
    </div>
  );
};

const MobileFrame = ({ children }) => (
  <div className="mx-auto flex flex-col items-center">
    <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      <Icon name="smartphone" size={13}/>
      <span>375 × 760</span>
    </div>
    <div className="relative w-[375px] shrink-0 rounded-[44px] bg-neutral-900 p-2.5 shadow-2xl">
      <div className="absolute top-2 left-1/2 z-40 -translate-x-1/2 h-6 w-24 rounded-b-2xl bg-neutral-900"/>
      <div className="relative h-[760px] w-full overflow-hidden rounded-[36px] bg-white dark:bg-slate-950">
        {children}
      </div>
    </div>
  </div>
);

const DesktopFrame = ({ children }) => (
  <div className="mx-auto flex flex-col items-center w-full max-w-[1280px]">
    <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      <Icon name="monitor" size={13}/>
      <span>1280 × 800 (fluid)</span>
    </div>
    <div className="w-full overflow-hidden rounded-xl border border-neutral-300 bg-white shadow-2xl dark:border-neutral-800">
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400"/>
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400"/>
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"/>
        <div className="ml-4 flex-1 max-w-xs rounded-md bg-white px-2 py-0.5 text-center text-[10px] font-mono text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          market.itvisionplus.sn
        </div>
      </div>
      <div className="h-[calc(100vh-160px)] min-h-[720px] overflow-y-auto">
        {children}
      </div>
    </div>
  </div>
);

window.App = App;
