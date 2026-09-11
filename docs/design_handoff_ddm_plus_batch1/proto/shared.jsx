// ============================================================
// DDM+ Safe direction — shared primitives + mock data
// ============================================================

// ---------- ICONS (inline SVG, lucide-like) ----------
const Icon = ({ name, size = 20, className = "", strokeWidth = 2 }) => {
  const paths = ICON_PATHS[name];
  if (!paths) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths.map((d, i) =>
        typeof d === "string" ? <path key={i} d={d} /> : React.cloneElement(d, { key: i })
      )}
    </svg>
  );
};

const ICON_PATHS = {
  home: ["m3 12 2-2m0 0 7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11 2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6"],
  grid: ["M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", <circle cx="9" cy="7" r="4" />, "M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"],
  cart: [<circle cx="8" cy="21" r="1" />, <circle cx="19" cy="21" r="1" />, "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"],
  user: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", <circle cx="12" cy="7" r="4" />],
  search: [<circle cx="11" cy="11" r="8" />, "m21 21-4.3-4.3"],
  heart: ["M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"],
  camera: ["M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z", <circle cx="12" cy="13" r="3" />],
  package: ["m7.5 4.27 9 5.15", "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z", "m3.3 7 8.7 5 8.7-5", "M12 22V12"],
  clock: [<circle cx="12" cy="12" r="10" />, "M12 6v6l4 2"],
  check: ["M20 6 9 17l-5-5"],
  checkCircle: [<circle cx="12" cy="12" r="10" />, "m9 12 2 2 4-4"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
  truck: [<rect x="1" y="3" width="15" height="13" />, "M16 8h4l3 3v5h-7V8z", <circle cx="5.5" cy="18.5" r="2.5" />, <circle cx="18.5" cy="18.5" r="2.5" />],
  plane: ["M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.2.6-.6.5-1.1z"],
  ship: ["M12 10.189V14M12 2v3M4.259 15.895 12 18l7.741-2.105M2 21c.6.5 1.2 1 2.5 1c2.5 0 2.5-2 5-2c2.6 0 2.4 2 5 2c2.5 0 2.5-2 5-2c1.3 0 1.9.5 2.5 1M19.5 12L12 2 4.5 12h15Z"],
  chevronRight: ["m9 18 6-6-6-6"],
  chevronDown: ["m6 9 6 6 6-6"],
  chevronLeft: ["m15 18-6-6 6-6"],
  arrowRight: ["M5 12h14", "m12 5 7 7-7 7"],
  arrowLeft: ["m19 12H5", "m12 19-7-7 7-7"],
  plus: ["M5 12h14", "M12 5v14"],
  minus: ["M5 12h14"],
  x: ["M18 6 6 18", "m6 6 12 12"],
  trash: ["M3 6h18", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"],
  info: [<circle cx="12" cy="12" r="10" />, "M12 16v-4M12 8h.01"],
  sparkles: ["M12 3l1.9 5.3 5.3 1.9-5.3 1.9L12 17.4l-1.9-5.3L4.8 10.2l5.3-1.9L12 3zM5 3v4M3 5h4M19 17v4M17 19h4"],
  trending: ["m22 7-8.5 8.5-5-5L2 17", "M16 7h6v6"],
  boxes: ["M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0l3.03-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71l-3.03-1.8a2 2 0 0 0-2.06 0l-3 1.8z", "m7 16.5-4.74-2.85M7 16.5v5.17m0-5.17 4.74-2.85M17 5.5v3.4l4.02 2.24M17 5.5l-4.68-2.62A2 2 0 0 0 10.36 3l-4 2.19M17 5.5l-4.02 2.24"],
  share: ["M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8", "m16 6-4-4-4 4", "M12 2v13"],
  copy: [<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />, "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"],
  message: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  whatsapp: ["M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.85 11.94L4 20l4.2-1.1a7.9 7.9 0 0 0 3.85.98h.01a7.94 7.94 0 0 0 5.54-13.55zM12.05 18.5h-.01a6.6 6.6 0 0 1-3.36-.92l-.24-.14-2.5.65.67-2.43-.16-.25a6.6 6.6 0 1 1 5.6 3.09z"],
  bell: ["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"],
  moon: ["M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"],
  sun: [<circle cx="12" cy="12" r="4" />, "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"],
  smartphone: [<rect x="5" y="2" width="14" height="20" rx="2" ry="2" />, "M12 18h.01"],
  monitor: [<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />, "M8 21h8M12 17v4"],
  filter: ["M22 3H2l8 9.46V19l4 2v-8.54z"],
  star: ["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"],
  flame: ["M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"],
  target: [<circle cx="12" cy="12" r="10" />, <circle cx="12" cy="12" r="6" />, <circle cx="12" cy="12" r="2" />],
  gift: [<rect x="3" y="8" width="18" height="4" rx="1" />, "M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7", "M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"],
  mapPin: ["M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z", <circle cx="12" cy="10" r="3" />],
  wallet: ["M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4", "M4 6v12c0 1.1.9 2 2 2h14v-4", "M18 12a2 2 0 0 0 0 4h4v-4z"],
  lock: [<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />, "M7 11V7a5 5 0 0 1 10 0v4"],
  eye: ["M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z", <circle cx="12" cy="12" r="3" />],
  send: ["m22 2-7 20-4-9-9-4z", "M22 2 11 13"],
  chevronsRight: ["m6 17 5-5-5-5", "m13 17 5-5-5-5"],
};

// ---------- MOCK DATA ----------
// FCFA formatter — uses non-breaking spaces so full price never wraps
const fmtFCFA = (n) => new Intl.NumberFormat("fr-FR").format(n).replace(/\s/g, "\u202F") + "\u00A0F";

const PRODUCT = {
  id: "cam-4mp-dome",
  name: "Caméra IP dôme extérieure 4MP — Vision nocturne couleur",
  brand: "Hikvision compatible",
  rating: 4.7,
  reviews: 218,
  images: [
    "assets/img/product-camera.jpg",
    "assets/img/product-led.jpg",
    "assets/img/product-carmount.jpg",
    "assets/img/product-watch.jpg",
  ],
  price: 18900,
  basePrice: 28500,
  minOrderQty: 5,
  priceTiers: [
    { from: 5, to: 9, unit: 18900, save: 0 },
    { from: 10, to: 24, unit: 16500, save: 13 },
    { from: 25, to: null, unit: 14200, save: 25 },
  ],
  groupBuy: {
    active: true,
    targetQty: 200,
    currentQty: 143,
    deadline: "2j 14h 22m",
    unitPrice: 12500,
    savePct: 34,
  },
  variants: [
    { id: "v1", label: "4MP · IR 30m", stock: 420 },
    { id: "v2", label: "6MP · IR 40m", stock: 180 },
    { id: "v3", label: "8MP · IR 50m", stock: 65 },
  ],
  specs: [
    ["Résolution", "4 MP (2560×1440)"],
    ["Vision nocturne", "Couleur 30m, IR 40m"],
    ["Étanchéité", "IP67"],
    ["Alim.", "PoE + DC 12V"],
    ["Poids", "480 g"],
  ],
  shipping: {
    origin: "Guangzhou, Chine",
    modes: [
      { key: "express", label: "Express aérien", days: "4-7j", from: 3200 },
      { key: "aerien", label: "Standard aérien", days: "8-12j", from: 1800 },
      { key: "maritime", label: "Maritime", days: "35-45j", from: 850 },
    ],
  },
};

const CART = [
  {
    id: "cam-4mp-dome", name: "Caméra IP dôme extérieure 4MP",
    variant: "4MP · IR 30m",
    image: "assets/img/product-camera.jpg",
    unit: 18900, qty: 5, minOrderQty: 5,
    tierUnit: 18900, nextTier: { at: 10, save: 13 },
    hasActiveGroup: true, groupUnit: 12500,
  },
  {
    id: "led-cob-5m", name: "Ruban LED RGB COB 5m",
    variant: "24V · 5m · RGB+W",
    image: "assets/img/product-led.jpg",
    unit: 4200, qty: 8, minOrderQty: 10,
    tierUnit: 4200, nextTier: null,
    hasActiveGroup: false,
    belowMOQ: true, moqDelta: 2,
  },
  {
    id: "earbuds", name: "Écouteurs sans fil TWS Pro",
    variant: "Noir · Bluetooth 5.3",
    image: "assets/img/product-earbuds.jpg",
    unit: 8900, qty: 12, minOrderQty: 5,
    tierUnit: 7800, nextTier: { at: 20, save: 22 },
    hasActiveGroup: true, groupUnit: 6200,
  },
];

const GROUPS = [
  {
    id: "grp-cam-4mp",
    name: "Caméra IP dôme extérieure 4MP",
    image: "assets/img/product-camera.jpg",
    currentQty: 143, targetQty: 200, participants: 27,
    deadline: "2j 14h 22m",
    unit: 12500, base: 18900, save: 34,
    status: "live",
    category: "Sécurité",
  },
  {
    id: "grp-earbuds",
    name: "Écouteurs sans fil TWS Pro",
    image: "assets/img/product-earbuds.jpg",
    currentQty: 176, targetQty: 200, participants: 41,
    deadline: "1j 06h 44m",
    unit: 6200, base: 10500, save: 41,
    status: "almost",
    category: "Audio",
  },
  {
    id: "grp-led",
    name: "Ruban LED RGB COB 5m",
    image: "assets/img/product-led.jpg",
    currentQty: 90, targetQty: 200, participants: 18,
    deadline: "4j 08h 15m",
    unit: 2850, base: 4200, save: 32,
    status: "live",
    category: "Éclairage",
  },
  {
    id: "grp-watch",
    name: "Montre connectée fitness IP68",
    image: "assets/img/product-watch.jpg",
    currentQty: 62, targetQty: 150, participants: 22,
    deadline: "3j 19h 05m",
    unit: 9800, base: 14500, save: 32,
    status: "live",
    category: "Objets connectés",
  },
  {
    id: "grp-carmount",
    name: "Support voiture MagSafe 15W",
    image: "assets/img/product-carmount.jpg",
    currentQty: 165, targetQty: 180, participants: 33,
    deadline: "12h 44m",
    unit: 4900, base: 8200, save: 40,
    status: "almost",
    category: "Auto",
  },
  {
    id: "grp-bag",
    name: "Sac cabas cuir synthétique",
    image: "assets/img/product-bag.jpg",
    currentQty: 55, targetQty: 120, participants: 14,
    deadline: "5j 22h",
    unit: 7200, base: 10800, save: 33,
    status: "live",
    category: "Mode",
  },
];

// ---------- COMMON UI ----------
const cx = (...cls) => cls.filter(Boolean).join(" ");

const Badge = ({ tone = "slate", children, className = "" }) => {
  const map = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
    violet: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900",
    amber: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
    blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
    red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
    slate: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    ink: "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white",
  };
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold", map[tone], className)}>
      {children}
    </span>
  );
};

const Button = ({ variant = "primary", size = "md", children, className = "", ...rest }) => {
  const sizes = {
    sm: "h-9 px-3 text-[13px] rounded-lg",
    md: "h-11 px-4 text-sm rounded-xl",
    lg: "h-12 px-5 text-[15px] rounded-xl",
  };
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md",
    secondary: "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
    violet: "bg-violet-600 text-white hover:bg-violet-700 shadow-sm hover:shadow-md",
    outline: "bg-transparent text-emerald-700 border border-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500 dark:hover:bg-emerald-950/40",
    dark: "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100",
  };
  return (
    <button
      className={cx("inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed", sizes[size], variants[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
};

const ProgressBar = ({ value, max, tone = "emerald", className = "" }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const toneMap = {
    emerald: "bg-gradient-to-r from-emerald-500 to-emerald-600",
    violet: "bg-gradient-to-r from-violet-500 to-violet-600",
    mixed: "bg-gradient-to-r from-emerald-500 to-violet-600",
  };
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", className)}>
      <div className={cx("h-full rounded-full transition-all", toneMap[tone])} style={{ width: pct + "%" }} />
    </div>
  );
};

const CountdownChip = ({ time, urgent = false, className = "" }) => (
  <span className={cx(
    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold",
    urgent
      ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    className
  )}>
    <Icon name="clock" size={12} />
    <span className="tabular-nums">{time}</span>
  </span>
);

const LiveDot = ({ tone = "red" }) => (
  <span className={cx(
    "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
    tone === "red" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
  )}>
    <span className={cx("h-1.5 w-1.5 rounded-full animate-ping-slow",
      tone === "red" ? "bg-red-600 dark:bg-red-400" : "bg-emerald-600 dark:bg-emerald-400"
    )} />
    Live
  </span>
);

// ---------- MARKET HEADER / BOTTOM NAV ----------
// device prop drives whether we render mobile compact header or desktop wide header
const MarketHeader = ({ device = "mobile", back = null, title = null, right = null }) => {
  const isDesktop = device === "desktop";
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className={cx("flex items-center gap-3 px-4", isDesktop ? "h-16 max-w-6xl mx-auto" : "h-14")}>
        {back ? (
          <button onClick={back} className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Retour">
            <Icon name="chevronLeft" size={18} />
          </button>
        ) : (
          <a className={cx("font-extrabold tracking-tight text-slate-900 dark:text-white", isDesktop ? "text-xl" : "text-[17px]")}>
            <span className="text-emerald-600">DDM</span>+
          </a>
        )}
        {isDesktop && !back && (
          <nav className="ml-4 flex items-center gap-4 text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            <a>Catalogue</a>
            <a>Groupes</a>
            <a>Trouvez-moi</a>
          </nav>
        )}
        {title && <div className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{title}</div>}
        {!title && isDesktop && (
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400 max-w-md ml-4">
            <Icon name="search" size={16} />
            <span>Rechercher un produit, une catégorie…</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          {right || (
            <React.Fragment>
              {!isDesktop && (
                <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="search" size={18} /></button>
              )}
              <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="heart" size={18} /></button>
              <button className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                <Icon name="cart" size={18} />
                <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">3</span>
              </button>
            </React.Fragment>
          )}
        </div>
      </div>
    </header>
  );
};

const MarketBottomNav = ({ active = "home", device = "mobile" }) => {
  if (device !== "mobile") return null;
  const items = [
    { key: "home", label: "Accueil", icon: "home" },
    { key: "catalog", label: "Produits", icon: "grid" },
    { key: "groups", label: "Groupes", icon: "users" },
    { key: "cart", label: "Panier", icon: "cart", badge: 3 },
    { key: "account", label: "Compte", icon: "user" },
  ];
  return (
    <nav className="sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="grid grid-cols-5">
        {items.map((it) => (
          <button
            key={it.key}
            className={cx(
              "relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold",
              it.key === active
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-500 dark:text-slate-400"
            )}
          >
            <Icon name={it.icon} size={20} />
            <span>{it.label}</span>
            {it.badge && (
              <span className="absolute top-1 right-1/2 translate-x-3 grid h-4 min-w-[16px] place-items-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white">
                {it.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

// ---------- SECTION / CARD PRIMITIVES ----------
const Section = ({ title, subtitle, right, children, className = "" }) => (
  <section className={cx("px-4 md:px-6", className)}>
    {(title || right) && (
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          {title && <h2 className="text-base md:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h2>}
          {subtitle && <p className="mt-0.5 text-xs md:text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {right}
      </div>
    )}
    {children}
  </section>
);

const Card = ({ className = "", children, ...rest }) => (
  <div
    className={cx(
      "rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
      className
    )}
    {...rest}
  >
    {children}
  </div>
);

// ---------- TRUST STRIP ----------
const TrustStrip = ({ compact = false }) => {
  const items = [
    { icon: "shield", label: "Paiement sécurisé", sub: "Escrow Mobile Money" },
    { icon: "truck", label: "Livraison suivie", sub: "Dakar & régions" },
    { icon: "checkCircle", label: "Inspection Chine", sub: "Avant expédition" },
    { icon: "whatsapp", label: "Support 7j/7", sub: "WhatsApp direct" },
  ];
  return (
    <div className={cx("grid gap-2", compact ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-4")}>
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Icon name={it.icon} size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight">{it.label}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{it.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------- MOCK DATA — ANONYMOUS ----------
// Orders (Mes commandes / Suivi)
const ORDERS = [
  {
    id: "CMD-0001",
    date: "2026-09-08",
    status: "in_transit", // ordered / sourcing / china / transit / delivered / cancelled
    items: [
      { name: "Caméra IP dôme extérieure 4MP", qty: 20, unit: 16500, image: "assets/img/product-camera.jpg" },
      { name: "Câble Ethernet Cat6 20m", qty: 25, unit: 3200, image: "assets/img/product-led.jpg" },
    ],
    total: 410000,
    shipping: "Standard aérien",
    tracking: "DDM-2026-A0F3B1",
    eta: "12-15 sept.",
    currentStep: 3, // 1-5
  },
  {
    id: "CMD-0002",
    date: "2026-09-02",
    status: "china",
    items: [{ name: "Écouteurs sans fil TWS Pro", qty: 10, unit: 8900, image: "assets/img/product-earbuds.jpg" }],
    total: 105400,
    shipping: "Maritime",
    tracking: "DDM-2026-B0F3B2",
    eta: "10-25 oct.",
    currentStep: 2,
  },
  {
    id: "CMD-0003",
    date: "2026-08-24",
    status: "delivered",
    items: [
      { name: "Ruban LED RGB COB 5m", qty: 15, unit: 4200, image: "assets/img/product-led.jpg" },
      { name: "Montre connectée fitness IP68", qty: 6, unit: 12500, image: "assets/img/product-watch.jpg" },
    ],
    total: 165900,
    shipping: "Express aérien",
    tracking: "DDM-2026-C0F3B3",
    eta: "Livré",
    currentStep: 5,
  },
  {
    id: "CMD-0004",
    date: "2026-09-09",
    status: "sourcing",
    items: [{ name: "Support MagSafe voiture 15W", qty: 12, unit: 6800, image: "assets/img/product-carmount.jpg" }],
    total: 88400,
    shipping: "Aérien",
    tracking: "DDM-2026-D0F3B4",
    eta: "En cours de sourcing",
    currentStep: 1,
  },
];

// Timeline steps for tracking
const ORDER_STEPS = [
  { key: "ordered", label: "Commande confirmée", desc: "Paiement Escrow reçu" },
  { key: "sourcing", label: "Sourcing en Chine", desc: "Notre équipe négocie avec l'usine" },
  { key: "china", label: "Inspection qualité", desc: "Contrôle avant expédition" },
  { key: "transit", label: "En transit", desc: "Acheminement vers le Sénégal" },
  { key: "delivered", label: "Livré", desc: "Reçu à l'adresse indiquée" },
];

// Anonymous user profile
const USER = {
  handle: "Client A",
  memberSince: "2026",
  grains: 3450,
  grainsTier: "Or",
  nextTierAt: 5000,
  stats: {
    orders: 12,
    groups: 7,
    savings: 184500,
  },
  activeOrder: 0, // index dans ORDERS
};

// Anonymized testimonials & participants
const TESTIMONIALS = [
  { initials: "CA", handle: "Client A", role: "Import électronique", quote: "Frais de service réduits de 40% sur mes imports. La recherche par photo trouve ce que je ne trouve nulle part.", rating: 5 },
  { initials: "CB", handle: "Client B", role: "Revendeur mode", quote: "Livraison respectée. Le suivi en temps réel rassure à chaque étape.", rating: 5 },
  { initials: "CC", handle: "Client C", role: "Achat groupé", quote: "200 unités importées via achat groupé — 30% de moins qu'ailleurs.", rating: 4 },
];

const PARTICIPANTS_ANON = [
  { initials: "C1", handle: "Client · 12 pcs", when: "il y a 5 min" },
  { initials: "C2", handle: "Client · 8 pcs", when: "il y a 12 min" },
  { initials: "C3", handle: "Client · 20 pcs", when: "il y a 32 min" },
  { initials: "C4", handle: "Client · 5 pcs", when: "il y a 1h" },
  { initials: "C5", handle: "Client · 15 pcs", when: "il y a 2h" },
  { initials: "C6", handle: "Client · 3 pcs", when: "il y a 3h" },
];

// Categories used across screens
const CATEGORIES = [
  { key: "securite", label: "Sécurité", icon: "shield", count: 240 },
  { key: "audio", label: "Audio", icon: "message", count: 180 },
  { key: "eclairage", label: "Éclairage", icon: "sparkles", count: 320 },
  { key: "auto", label: "Auto", icon: "truck", count: 145 },
  { key: "mode", label: "Mode", icon: "gift", count: 610 },
  { key: "maison", label: "Maison", icon: "home", count: 480 },
  { key: "beaute", label: "Beauté", icon: "heart", count: 220 },
  { key: "bureau", label: "Bureau", icon: "package", count: 190 },
];

const CATALOG = [
  { id: "cam", name: "Caméra IP dôme extérieure 4MP", cat: "Sécurité", price: 18900, base: 28500, moq: 5, img: "assets/img/product-camera.jpg", rating: 4.7, hasGroup: true, verified: true, save: 34 },
  { id: "ear", name: "Écouteurs sans fil TWS Pro", cat: "Audio", price: 8900, base: 15100, moq: 5, img: "assets/img/product-earbuds.jpg", rating: 4.5, hasGroup: true, verified: true, save: 41 },
  { id: "led", name: "Ruban LED RGB COB 5m", cat: "Éclairage", price: 4200, base: 7000, moq: 10, img: "assets/img/product-led.jpg", rating: 4.8, hasGroup: true, verified: true, save: 32 },
  { id: "car", name: "Support MagSafe voiture 15W", cat: "Auto", price: 6800, base: 11200, moq: 6, img: "assets/img/product-carmount.jpg", rating: 4.6, hasGroup: false, verified: true, save: 39 },
  { id: "wat", name: "Montre connectée fitness IP68", cat: "Objets connectés", price: 12500, base: 19000, moq: 3, img: "assets/img/product-watch.jpg", rating: 4.4, hasGroup: true, verified: true, save: 34 },
  { id: "bag", name: "Sac cabas cuir synthétique", cat: "Mode", price: 9200, base: 12800, moq: 4, img: "assets/img/product-bag.jpg", rating: 4.3, hasGroup: false, verified: false, save: 28 },
  { id: "cam2", name: "Caméra bullet IR 5MP PoE", cat: "Sécurité", price: 24500, base: 34000, moq: 3, img: "assets/img/product-camera.jpg", rating: 4.6, hasGroup: true, verified: true, save: 28 },
  { id: "ear2", name: "Casque audio sans fil ANC", cat: "Audio", price: 18500, base: 27500, moq: 4, img: "assets/img/product-earbuds.jpg", rating: 4.7, hasGroup: false, verified: true, save: 33 },
  { id: "led2", name: "Guirlande LED extérieure IP65", cat: "Éclairage", price: 3800, base: 5500, moq: 12, img: "assets/img/product-led.jpg", rating: 4.5, hasGroup: true, verified: true, save: 31 },
  { id: "wat2", name: "Montre GPS running étanche", cat: "Objets connectés", price: 22000, base: 32000, moq: 3, img: "assets/img/product-watch.jpg", rating: 4.6, hasGroup: false, verified: true, save: 31 },
  { id: "bag2", name: "Sac à dos business étanche", cat: "Mode", price: 11500, base: 16800, moq: 5, img: "assets/img/product-bag.jpg", rating: 4.4, hasGroup: true, verified: true, save: 32 },
  { id: "car2", name: "Chargeur voiture rapide 65W", cat: "Auto", price: 4900, base: 7200, moq: 10, img: "assets/img/product-carmount.jpg", rating: 4.5, hasGroup: false, verified: true, save: 32 },
];

// Expose to window
Object.assign(window, {
  Icon, ICON_PATHS, fmtFCFA, cx,
  Badge, Button, ProgressBar, CountdownChip, LiveDot,
  MarketHeader, MarketBottomNav, Section, Card, TrustStrip,
  PRODUCT, CART, GROUPS,
  ORDERS, ORDER_STEPS, USER, TESTIMONIALS, PARTICIPANTS_ANON, CATEGORIES, CATALOG,
});
