import { writeFileSync } from 'fs'
import { resolve } from 'path'

const SUPPORTED_LANGUAGES = ['fr', 'en', 'ar', 'wo'] as const
type Lang = typeof SUPPORTED_LANGUAGES[number]

interface PartialCategory {
  fr: string
  en: string
  ar: string
  wo: string
  slug?: string
  icon?: string
  isLeaf?: boolean
  requiredAttributes?: string[]
  optionalAttributes?: string[]
  searchFilters?: string[]
  allowedUnits?: string[]
  commissionRate?: number
  synonyms?: Partial<Record<Lang, string[]>>
  typos?: string[]
  closeCategories?: string[]
  supportsWholesale?: boolean
  supportsDropshipping?: boolean
  supportsGroupBuying?: boolean
  children?: PartialCategory[]
}

interface OutputCategory {
  id: string
  parent_id: string | null
  level: number
  name: Record<Lang, string>
  slug: string
  icon: string
  image: string
  order: number
  isActive: boolean
  isLeaf: boolean
  seoTitle: Record<Lang, string>
  seoDescription: Record<Lang, string>
  keywords: Record<Lang, string[]>
  synonyms?: Partial<Record<Lang, string[]>>
  typos?: string[]
  closeCategories?: string[]
  allowedUnits: string[]
  requiredAttributes: string[]
  optionalAttributes: string[]
  searchFilters: string[]
  supportsWholesale: boolean
  supportsDropshipping: boolean
  supportsGroupBuying: boolean
  commissionRate: number
  createdAt: string
  updatedAt: string
}

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function generateId(nameFr: string, parentId: string | null): string {
  const base = parentId ? `${parentId}-${slugify(nameFr)}` : `cat-root-${slugify(nameFr)}`
  return base.replace(/-+/g, '-').slice(0, 80)
}

const defaultLeaf = {
  allowedUnits: ['piece', 'lot', 'carton', 'palette'],
  requiredAttributes: ['brand', 'condition'],
  optionalAttributes: ['model', 'warranty_months', 'origin'],
  searchFilters: ['brand', 'price', 'condition'],
  supportsWholesale: true,
  supportsDropshipping: true,
  supportsGroupBuying: true,
  commissionRate: 0.08,
  icon: 'Package',
}

function processCategory(c: PartialCategory, parentId: string | null, level: number, order: number): OutputCategory {
  const id = generateId(c.fr, parentId)
  const slug = c.slug || slugify(c.fr)
  const isLeaf = c.children?.length ? false : (c.isLeaf ?? true)
  const image = `/categories/${slug}.jpg`
  const name: Record<Lang, string> = { fr: c.fr, en: c.en, ar: c.ar, wo: c.wo }
  return {
    id,
    parent_id: parentId,
    level,
    name,
    slug,
    icon: c.icon || (isLeaf ? defaultLeaf.icon : 'Folder'),
    image,
    order,
    isActive: true,
    isLeaf,
    seoTitle: { fr: `${c.fr} — Achat en gros`, en: `${c.en} — Wholesale`, ar: `${c.ar} — بالجملة`, wo: `${c.wo} — Capp` },
    seoDescription: { fr: `Découvrez ${c.fr} au Sénégal.`, en: `Discover ${c.en} in Senegal.`, ar: `اكتشف ${c.ar} في السنغال.`, wo: `Gis ${c.wo} ci Senegaal.` },
    keywords: { fr: [c.fr, 'gros'], en: [c.en, 'wholesale'], ar: [c.ar, 'بالجملة'], wo: [c.wo, 'capp'] },
    synonyms: c.synonyms,
    typos: c.typos,
    closeCategories: c.closeCategories,
    allowedUnits: c.allowedUnits || defaultLeaf.allowedUnits,
    requiredAttributes: c.requiredAttributes || defaultLeaf.requiredAttributes,
    optionalAttributes: c.optionalAttributes || defaultLeaf.optionalAttributes,
    searchFilters: c.searchFilters || defaultLeaf.searchFilters,
    supportsWholesale: c.supportsWholesale ?? defaultLeaf.supportsWholesale,
    supportsDropshipping: c.supportsDropshipping ?? defaultLeaf.supportsDropshipping,
    supportsGroupBuying: c.supportsGroupBuying ?? defaultLeaf.supportsGroupBuying,
    commissionRate: c.commissionRate ?? defaultLeaf.commissionRate,
    createdAt: '2026-07-05T19:00:00Z',
    updatedAt: '2026-07-05T19:00:00Z',
  }
}

function flatten(root: PartialCategory, parentId: string | null = null): OutputCategory[] {
  const out: OutputCategory[] = []
  function walk(nodes: PartialCategory[], pid: string | null, lvl: number) {
    nodes.forEach((c, i) => {
      const cat = processCategory(c, pid, lvl, i + 1)
      out.push(cat)
      if (c.children?.length) walk(c.children, cat.id, lvl + 1)
    })
  }
  walk([root], parentId, parentId ? 2 : 1)
  return out
}

// Définition compacte des racines. Les attributs détaillés sont sur les feuilles.
const roots: PartialCategory[] = [
  {
    fr: 'Électronique & Informatique', en: 'Electronics & Computing', ar: 'إلكترونيات وكمبيوتر', wo: 'Electoronik ak Ordinateer',
    slug: 'electronique-informatique', icon: 'Cpu', isLeaf: false, commissionRate: 0.08,
    children: [
      {
        fr: 'Téléphonie', en: 'Telephony', ar: 'هاتف', wo: 'Telfoŋ', icon: 'Smartphone',
        children: [
          { fr: 'Smartphones', en: 'Smartphones', ar: 'الهواتف الذكية', wo: 'Smartphones', icon: 'Smartphone', requiredAttributes: ['brand','model','os','ram','storage','screen_size','color','condition'], optionalAttributes: ['battery_capacity','camera_mp','sim_type','warranty_months'], searchFilters: ['brand','os','ram','storage','screen_size','price','color','condition'], allowedUnits: ['piece','lot_of_5','carton_of_10','palette'], commissionRate: 0.06 },
          { fr: 'Téléphones classiques', en: 'Feature Phones', ar: 'هواتف بسيطة', wo: 'Telfoŋ yu bees', icon: 'Phone', requiredAttributes: ['brand','model','sim_slots','battery_capacity','color','condition'], searchFilters: ['brand','sim_slots','battery_capacity','price','color'], allowedUnits: ['piece','lot_of_10','carton_of_50'] },
          { fr: 'Accessoires de téléphonie', en: 'Phone Accessories', ar: 'إكسسوارات الهاتف', wo: 'Ay-qaayu telfoŋ', icon: 'Headphones', requiredAttributes: ['type','brand','compatibility','color','material'], optionalAttributes: ['warranty','connector_type','length'], searchFilters: ['type','brand','compatibility','color','price'], allowedUnits: ['piece','lot_of_10','carton_of_100','palette'], commissionRate: 0.09 },
          { fr: 'Pièces détachées téléphonie', en: 'Phone Spare Parts', ar: 'قطع غيار الهاتف', wo: 'Benn ci benn telfoŋ', icon: 'Wrench', requiredAttributes: ['type','brand','model_compatible','quality','condition'], optionalAttributes: ['oem','warranty','origin'], searchFilters: ['type','brand','model_compatible','quality','price'], allowedUnits: ['piece','lot_of_5','carton_of_50'], supportsDropshipping: false },
        ],
      },
      {
        fr: 'Informatique', en: 'Computing', ar: 'الحوسبة', wo: 'Informatik', icon: 'Laptop',
        children: [
          { fr: 'Ordinateurs portables', en: 'Laptops', ar: 'أجهزة الكمبيوتر المحمولة', wo: 'Ordinateer poortable', icon: 'Laptop', requiredAttributes: ['brand','model','cpu','ram','storage','screen_size','os','color','condition'], optionalAttributes: ['gpu','battery_life','weight','warranty_months'], searchFilters: ['brand','cpu','ram','storage','screen_size','os','price','condition'], allowedUnits: ['piece','lot_of_5','carton_of_10'], commissionRate: 0.06 },
          { fr: 'Ordinateurs de bureau', en: 'Desktop Computers', ar: 'أجهزة الكمبيوتر المكتبية', wo: 'Ordinateer buro', icon: 'Monitor', requiredAttributes: ['brand','model','cpu','ram','storage','gpu','os','condition'], optionalAttributes: ['form_factor','warranty_months','included_monitor'], searchFilters: ['brand','cpu','ram','storage','price','condition'], allowedUnits: ['piece','lot_of_5','carton_of_10'], commissionRate: 0.06 },
          { fr: 'Composants & Pièces PC', en: 'PC Components & Parts', ar: 'قطع الكمبيوتر', wo: 'Benn ci benn PC', icon: 'Cpu', requiredAttributes: ['type','brand','model','compatibility','condition'], optionalAttributes: ['warranty','origin','oem'], searchFilters: ['type','brand','compatibility','condition','price'], allowedUnits: ['piece','lot_of_5','carton_of_50'], supportsDropshipping: false },
          { fr: 'Stockage & Mémoire', en: 'Storage & Memory', ar: 'التخزين والذاكرة', wo: 'Stokkaas ak Mëmwaar', icon: 'HardDrive', requiredAttributes: ['type','brand','capacity','interface','condition'], optionalAttributes: ['speed','form_factor','warranty_months'], searchFilters: ['type','brand','capacity','interface','price'], allowedUnits: ['piece','lot_of_10','carton_of_100'] },
        ],
      },
      {
        fr: 'Audio & Vidéo', en: 'Audio & Video', ar: 'الصوت والفيديو', wo: 'Audio ak Video', icon: 'Speaker',
        children: [
          { fr: 'Casques & Écouteurs', en: 'Headphones & Earphones', ar: 'السماعات', wo: 'Casques ak Écouteurs', icon: 'Headphones', requiredAttributes: ['type','brand','connection','color','condition'], optionalAttributes: ['noise_cancellation','battery_life','warranty_months'], searchFilters: ['type','brand','connection','color','price'], allowedUnits: ['piece','lot_of_10','carton_of_100'], commissionRate: 0.09 },
          { fr: 'Enceintes & Sonorisation', en: 'Speakers & Sound Systems', ar: 'المكبرات الصوتية', wo: 'Enceintes yi', icon: 'Speaker', requiredAttributes: ['type','brand','power','connection','condition'], optionalAttributes: ['battery','waterproof','warranty_months'], searchFilters: ['type','brand','power','connection','price'], allowedUnits: ['piece','lot_of_5','carton_of_20'] },
          { fr: 'Téléviseurs & Projecteurs', en: 'TVs & Projectors', ar: 'التلفزيونات والبروجكتورات', wo: 'Téléviseurs yi', icon: 'Tv', requiredAttributes: ['brand','size','resolution','type','smart_os','condition'], optionalAttributes: ['hdr','refresh_rate','ports','warranty_months'], searchFilters: ['brand','size','resolution','type','smart_os','price'], allowedUnits: ['piece','lot_of_5','carton_of_10'], commissionRate: 0.06 },
        ],
      },
      {
        fr: 'Télécommunications & Réseaux', en: 'Telecommunications & Networks', ar: 'الاتصالات والشبكات', wo: 'Télécommunications ak Réseaux', icon: 'Wifi',
        children: [
          { fr: 'Routeurs & Modems', en: 'Routers & Modems', ar: 'أجهزة التوجيه والمودمات', wo: 'Routeurs yi', icon: 'Router', requiredAttributes: ['brand','type','speed','connection','condition'], searchFilters: ['brand','type','speed','connection','price'] },
          { fr: 'Points d\'accès WiFi', en: 'WiFi Access Points', ar: 'نقاط الوصول اللاسلكية', wo: 'WiFi Access Points yi', icon: 'Wifi', requiredAttributes: ['brand','speed','coverage','condition'], searchFilters: ['brand','speed','coverage','price'] },
          { fr: 'Câbles & Connectiques réseau', en: 'Network Cables & Connectors', ar: 'كابلات وموصلات الشبكة', wo: 'Câbles réseau yi', icon: 'Cable', requiredAttributes: ['type','brand','length','category_cable','condition'], searchFilters: ['type','brand','length','category_cable','price'], allowedUnits: ['piece','meter','carton','reel'] },
        ],
      },
    ],
  },
  {
    fr: 'Électroménager & Appareils ménagers', en: 'Home Appliances', ar: 'الأجهزة المنزلية', wo: 'Eletromenager', slug: 'electromenager-appareils-menagers', icon: 'Refrigerator', isLeaf: false, commissionRate: 0.08,
    children: [
      {
        fr: 'Gros électroménager', en: 'Major Appliances', ar: 'الأجهزة الكبيرة', wo: 'Gros électroménager', icon: 'Refrigerator',
        children: [
          { fr: 'Réfrigérateurs & Congélateurs', en: 'Refrigerators & Freezers', ar: 'الثلاجات والمجمدات', wo: 'Réfrigérateurs yi', icon: 'Refrigerator', requiredAttributes: ['brand','type','volume','energy_class','color','condition'], searchFilters: ['brand','type','volume','energy_class','price'], allowedUnits: ['piece','lot'] },
          { fr: 'Cuisinières & Fours', en: 'Stoves & Ovens', ar: 'المواقد والأفران', wo: 'Cuisinières yi', icon: 'Flame', requiredAttributes: ['brand','type','energy','burners','color','condition'], searchFilters: ['brand','type','energy','burners','price'] },
          { fr: 'Machines à laver', en: 'Washing Machines', ar: 'غسالات الملابس', wo: 'Machines à laver yi', icon: 'Droplet', requiredAttributes: ['brand','type','capacity','energy_class','color','condition'], searchFilters: ['brand','type','capacity','energy_class','price'] },
          { fr: 'Climatiseurs & Ventilateurs', en: 'Air Conditioners & Fans', ar: 'المكيفات والمراوح', wo: 'Climatiseurs yi', icon: 'Wind', requiredAttributes: ['brand','type','power','btu','condition'], searchFilters: ['brand','type','power','btu','price'] },
        ],
      },
      {
        fr: 'Petit électroménager', en: 'Small Appliances', ar: 'الأجهزة الصغيرة', wo: 'Petit électroménager', icon: 'Blender',
        children: [
          { fr: 'Mixeurs & Blenders', en: 'Mixers & Blenders', ar: 'الخلاطات', wo: 'Mixeurs yi', icon: 'Blender', requiredAttributes: ['brand','power','capacity','color','condition'], searchFilters: ['brand','power','capacity','price'] },
          { fr: 'Cafetières & Bouilloires', en: 'Coffee Makers & Kettles', ar: 'آلات القهوة والغلايات', wo: 'Cafetières yi', icon: 'Coffee', requiredAttributes: ['brand','type','power','capacity','color','condition'], searchFilters: ['brand','type','power','price'] },
          { fr: 'Fers à repasser', en: 'Irons', ar: 'مكاوي الملابس', wo: 'Fers yi', icon: 'Iron', requiredAttributes: ['brand','power','type','color','condition'], searchFilters: ['brand','power','type','price'] },
          { fr: 'Aspirateurs', en: 'Vacuum Cleaners', ar: 'المكانس الكهربائية', wo: 'Aspirateurs yi', icon: 'Trash', requiredAttributes: ['brand','type','power','color','condition'], searchFilters: ['brand','type','power','price'] },
        ],
      },
    ],
  },
  {
    fr: 'Maison & Habitat', en: 'Home & Habitat', ar: 'المنزل والسكن', wo: 'Kër ak Taax', slug: 'maison-habitat', icon: 'Home', isLeaf: false, commissionRate: 0.09,
    children: [
      {
        fr: 'Domotique', en: 'Smart Home', ar: 'المنزل الذكي', wo: 'Domotik', icon: 'Zap',
        children: [
          { fr: 'Serrures intelligentes', en: 'Smart Locks', ar: 'الأقفال الذكية', wo: 'Serrures yu xel', icon: 'Lock', requiredAttributes: ['brand','opening_type','connectivity','power_supply','material','color'], optionalAttributes: ['fingerprint_count','app_compatible','door_type','warranty_months'], searchFilters: ['brand','opening_type','connectivity','power_supply','price','color'], allowedUnits: ['piece','lot_of_2','carton_of_10'], commissionRate: 0.10 },
          { fr: 'Caméras connectées', en: 'Connected Cameras', ar: 'الكاميرات المتصلة', wo: 'Caméras yu xel', icon: 'Camera', requiredAttributes: ['brand','resolution','connectivity','power_supply','location_type','color'], optionalAttributes: ['night_vision','motion_detection','storage','solar','warranty_months'], searchFilters: ['brand','resolution','connectivity','power_supply','location_type','price'], allowedUnits: ['piece','lot_of_2','carton_of_10'] },
          { fr: 'Alarmes & Détecteurs', en: 'Alarms & Detectors', ar: 'أنظمة الإنذار والكشف', wo: 'Alarmes yi', icon: 'Bell', requiredAttributes: ['type','brand','connectivity','power_supply','color'], optionalAttributes: ['siren_volume','zones','app_compatible','warranty_months'], searchFilters: ['type','brand','connectivity','power_supply','price'], allowedUnits: ['piece','kit','carton_of_10'] },
          { fr: 'Capteurs & Interrupteurs intelligents', en: 'Smart Sensors & Switches', ar: 'المستشعرات والمفاتيح الذكية', wo: 'Capteurs yi', icon: 'ToggleLeft', requiredAttributes: ['type','brand','connectivity','power_supply','color'], optionalAttributes: ['app_compatible','voice_control','warranty_months'], searchFilters: ['type','brand','connectivity','power_supply','price'], allowedUnits: ['piece','lot_of_10','carton_of_50'], commissionRate: 0.10 },
        ],
      },
      {
        fr: 'Meubles', en: 'Furniture', ar: 'الأثاث', wo: 'Meubles yi', icon: 'Sofa',
        children: [
          { fr: 'Meubles de salon', en: 'Living Room Furniture', ar: 'أثاث غرفة المعيشة', wo: 'Meubles salon', icon: 'Sofa', requiredAttributes: ['type','material','color','dimensions','condition'], searchFilters: ['type','material','color','price'] },
          { fr: 'Meubles de chambre', en: 'Bedroom Furniture', ar: 'أثاث غرفة النوم', wo: 'Meubles chamber', icon: 'Bed', requiredAttributes: ['type','material','color','dimensions','condition'], searchFilters: ['type','material','color','price'] },
          { fr: 'Meubles de bureau', en: 'Office Furniture', ar: 'أثاث المكتب', wo: 'Meubles bureau', icon: 'Briefcase', requiredAttributes: ['type','material','color','dimensions','condition'], searchFilters: ['type','material','color','price'] },
          { fr: 'Rangements & Étagères', en: 'Storage & Shelving', ar: 'التخزين والأرفف', wo: 'Rangements yi', icon: 'Layers', requiredAttributes: ['type','material','color','dimensions','condition'], searchFilters: ['type','material','color','price'] },
        ],
      },
      {
        fr: 'Décoration & Linge de maison', en: 'Home Decor & Linens', ar: 'الديكور والمفروشات', wo: 'Décoration ak Linge', icon: 'Lamp',
        children: [
          { fr: 'Linge de lit', en: 'Bedding', ar: 'مفروشات السرير', wo: 'Linge de lit', icon: 'Bed', requiredAttributes: ['type','material','size','color','condition'], searchFilters: ['type','material','size','color','price'] },
          { fr: 'Rideaux & Stores', en: 'Curtains & Blinds', ar: 'الستائر والستائر الدوارة', wo: 'Rideaux yi', icon: 'Columns', requiredAttributes: ['type','material','color','dimensions','condition'], searchFilters: ['type','material','color','price'] },
          { fr: 'Luminaires', en: 'Lighting Fixtures', ar: 'الإضاءة الداخلية', wo: 'Luminaires yi', icon: 'Lightbulb', requiredAttributes: ['type','material','color','power','condition'], searchFilters: ['type','material','color','price'] },
          { fr: 'Tapis & Paillassons', en: 'Carpets & Doormats', ar: 'السجاد والدواسات', wo: 'Tapis yi', icon: 'Square', requiredAttributes: ['type','material','color','dimensions','condition'], searchFilters: ['type','material','color','price'] },
        ],
      },
      {
        fr: 'Cuisine & Arts ménagers', en: 'Kitchen & Household', ar: 'المطبخ والمنزل', wo: 'Cuisine ak Arts ménagers', icon: 'Utensils',
        children: [
          { fr: 'Ustensiles de cuisine', en: 'Kitchen Utensils', ar: 'أدوات المطبخ', wo: 'Ustensiles cuisine', icon: 'Utensils', requiredAttributes: ['type','material','color','condition'], searchFilters: ['type','material','color','price'] },
          { fr: 'Vaisselle', en: 'Tableware', ar: 'الأواني', wo: 'Vaisselle', icon: 'CupSoda', requiredAttributes: ['type','material','color','condition'], searchFilters: ['type','material','color','price'] },
          { fr: 'Conservation & Stockage', en: 'Food Storage', ar: 'التخزين والحفظ', wo: 'Conservation', icon: 'Container', requiredAttributes: ['type','material','capacity','condition'], searchFilters: ['type','material','capacity','price'] },
        ],
      },
      {
        fr: 'Jardin & Extérieur', en: 'Garden & Outdoor', ar: 'الحديقة والخارج', wo: 'Jardin ak Extérieur', icon: 'Flower',
        children: [
          { fr: 'Mobilier de jardin', en: 'Outdoor Furniture', ar: 'أثاث الحديقة', wo: 'Mobilier jardin', icon: 'Chair', requiredAttributes: ['type','material','color','condition'], searchFilters: ['type','material','color','price'] },
          { fr: 'Outils de jardinage', en: 'Gardening Tools', ar: 'أدوات الحدائق', wo: 'Outils jardin', icon: 'Shovel', requiredAttributes: ['type','material','condition'], searchFilters: ['type','material','price'] },
          { fr: 'Piscines & Accessoires', en: 'Swimming Pools & Accessories', ar: 'المسابح وملحقاتها', wo: 'Piscines yi', icon: 'Waves', requiredAttributes: ['type','material','dimensions','condition'], searchFilters: ['type','material','dimensions','price'] },
        ],
      },
    ],
  },
  {
    fr: 'Énergie, Éclairage & Électricité', en: 'Energy, Lighting & Electricity', ar: 'الطاقة والإضاءة والكهرباء', wo: 'Energie, Eclairage ak Elektrisite', slug: 'energie-eclairage-electricite', icon: 'Zap', isLeaf: false, commissionRate: 0.08,
    children: [
      {
        fr: 'Énergie renouvelable', en: 'Renewable Energy', ar: 'الطاقة المتجددة', wo: 'Energie bu bees', icon: 'Sun',
        children: [
          { fr: 'Panneaux solaires', en: 'Solar Panels', ar: 'الألواح الشمسية', wo: 'Panneaux solaires yi', icon: 'Sun', requiredAttributes: ['brand','power_w','technology','voltage','dimensions','condition'], optionalAttributes: ['efficiency','warranty_years','origin','certification'], searchFilters: ['brand','power_w','technology','voltage','price'], allowedUnits: ['piece','lot_of_5','palette'], supportsDropshipping: false, commissionRate: 0.06 },
          { fr: 'Batteries & Stockage', en: 'Batteries & Storage', ar: 'البطاريات والتخزين', wo: 'Batteries yi', icon: 'Battery', requiredAttributes: ['brand','type','capacity_ah','voltage','condition'], optionalAttributes: ['cycles','warranty_years','weight','origin'], searchFilters: ['brand','type','capacity_ah','voltage','price'], allowedUnits: ['piece','carton','palette'], supportsDropshipping: false },
          { fr: 'Kits solaires', en: 'Solar Kits', ar: 'مجموعات الطاقة الشمسية', wo: 'Kits solaires yi', icon: 'Sun', requiredAttributes: ['brand','power_w','voltage','battery_capacity','components'], optionalAttributes: ['autonomy','warranty_years','origin'], searchFilters: ['brand','power_w','voltage','battery_capacity','price'], allowedUnits: ['piece','palette'], supportsDropshipping: false, commissionRate: 0.06 },
        ],
      },
      {
        fr: 'Éclairage', en: 'Lighting', ar: 'الإضاءة', wo: 'Eclaire', icon: 'Lightbulb',
        children: [
          { fr: 'Ampoules LED', en: 'LED Bulbs', ar: 'مصابيح LED', wo: 'Ampoules LED yi', icon: 'Lightbulb', requiredAttributes: ['brand','type','power_w','socket','color_temperature','condition'], searchFilters: ['brand','type','power_w','socket','color_temperature','price'], allowedUnits: ['piece','lot_of_10','carton_of_100'] },
          { fr: 'Lampes & Luminaires', en: 'Lamps & Fixtures', ar: 'المصابيح والأجهزة', wo: 'Lampes yi', icon: 'Lamp', requiredAttributes: ['type','brand','material','color','condition'], searchFilters: ['type','brand','material','color','price'] },
          { fr: 'Éclairage extérieur', en: 'Outdoor Lighting', ar: 'إضاءة خارجية', wo: 'Éclairage extérieur', icon: 'Sun', requiredAttributes: ['type','brand','power_w','power_supply','condition'], searchFilters: ['type','brand','power_w','power_supply','price'] },
        ],
      },
      {
        fr: 'Groupes électrogènes', en: 'Generators', ar: 'المولدات الكهربائية', wo: 'Groupes électrogènes yi', icon: 'BatteryCharging',
        children: [
          { fr: 'Groupes essence', en: 'Gasoline Generators', ar: 'مولدات البنزين', wo: 'Groupes essence', icon: 'Fuel', requiredAttributes: ['brand','power_va','fuel','noise_level','condition'], searchFilters: ['brand','power_va','fuel','noise_level','price'], allowedUnits: ['piece','palette'] },
          { fr: 'Groupes diesel', en: 'Diesel Generators', ar: 'مولدات الديزل', wo: 'Groupes diesel', icon: 'Fuel', requiredAttributes: ['brand','power_va','fuel','noise_level','condition'], searchFilters: ['brand','power_va','fuel','noise_level','price'], allowedUnits: ['piece','palette'] },
        ],
      },
      {
        fr: 'Électricité générale', en: 'General Electrical', ar: 'الكهرباء العامة', wo: 'Électricité générale', icon: 'Plug',
        children: [
          { fr: 'Câbles & Fils', en: 'Cables & Wires', ar: 'الكابلات والأسلاك', wo: 'Câbles yi', icon: 'Cable', requiredAttributes: ['type','section','material','length','condition'], searchFilters: ['type','section','material','price'], allowedUnits: ['meter','reel','carton'] },
          { fr: 'Prises & Interrupteurs', en: 'Sockets & Switches', ar: 'المقابس والمفاتيح', wo: 'Prises yi', icon: 'ToggleRight', requiredAttributes: ['type','brand','material','color','condition'], searchFilters: ['type','brand','material','color','price'] },
          { fr: 'Piles & Accumulateurs', en: 'Batteries & Accumulators', ar: 'البطاريات والمجمعات', wo: 'Piles yi', icon: 'Battery', requiredAttributes: ['type','brand','voltage','capacity','condition'], searchFilters: ['type','brand','voltage','capacity','price'] },
        ],
      },
    ],
  },
  {
    fr: 'Automobile, Motos & Mobilité', en: 'Automotive, Motorcycles & Mobility', ar: 'السيارات والدراجات والتنقل', wo: 'Automobile, Motos ak Mobilite', slug: 'automobile-motos-mobilite', icon: 'Car', isLeaf: false, commissionRate: 0.08,
    children: [
      {
        fr: 'Pièces automobiles', en: 'Car Parts', ar: 'قطع السيارات', wo: 'Benn automobile', icon: 'Wrench',
        children: [
          { fr: 'Pièces moteur', en: 'Engine Parts', ar: 'قطع المحرك', wo: 'Benn moteur', icon: 'Cog', requiredAttributes: ['type','brand','model_compatible','condition'], searchFilters: ['type','brand','model_compatible','price'] },
          { fr: 'Freinage & Suspension', en: 'Brakes & Suspension', ar: 'الفرامل والتعليق', wo: 'Freinage', icon: 'Circle', requiredAttributes: ['type','brand','model_compatible','condition'], searchFilters: ['type','brand','model_compatible','price'] },
          { fr: 'Électricité auto', en: 'Auto Electrical', ar: 'كهرباء السيارات', wo: 'Électricité auto', icon: 'Zap', requiredAttributes: ['type','brand','model_compatible','condition'], searchFilters: ['type','brand','model_compatible','price'] },
        ],
      },
      {
        fr: 'Accessoires automobiles', en: 'Car Accessories', ar: 'إكسسوارات السيارات', wo: 'Accessoires auto', icon: 'Car',
        children: [
          { fr: 'Audio & GPS auto', en: 'Car Audio & GPS', ar: 'صوت ونظام تحديد المواقع للسيارات', wo: 'Audio GPS auto', icon: 'MapPin', requiredAttributes: ['type','brand','screen_size','condition'], searchFilters: ['type','brand','screen_size','price'] },
          { fr: 'Housses & Tapis', en: 'Covers & Mats', ar: 'الأغطية والسجاد', wo: 'Housses auto', icon: 'Square', requiredAttributes: ['type','material','color','model_compatible','condition'], searchFilters: ['type','material','color','price'] },
          { fr: 'Éclairage auto', en: 'Car Lighting', ar: 'إضاءة السيارات', wo: 'Éclairage auto', icon: 'Lightbulb', requiredAttributes: ['type','brand','model_compatible','condition'], searchFilters: ['type','brand','model_compatible','price'] },
        ],
      },
      {
        fr: 'Motos & Scooters', en: 'Motorcycles & Scooters', ar: 'الدراجات النارية والسكوتر', wo: 'Motos ak Scooters', icon: 'Bike',
        children: [
          { fr: 'Motos', en: 'Motorcycles', ar: 'الدراجات النارية', wo: 'Motos yi', icon: 'Bike', requiredAttributes: ['brand','model','engine_cc','color','condition'], searchFilters: ['brand','engine_cc','color','price'] },
          { fr: 'Scooters', en: 'Scooters', ar: 'السكوتر', wo: 'Scooters yi', icon: 'Bike', requiredAttributes: ['brand','model','engine_cc','color','condition'], searchFilters: ['brand','engine_cc','color','price'] },
          { fr: 'Pièces détachées moto', en: 'Motorcycle Spare Parts', ar: 'قطع غيار الدراجات', wo: 'Benn moto', icon: 'Wrench', requiredAttributes: ['type','brand','model_compatible','condition'], searchFilters: ['type','brand','model_compatible','price'] },
        ],
      },
      {
        fr: 'Mobilité alternative', en: 'Alternative Mobility', ar: 'التنقل البديل', wo: 'Mobilité alternative', icon: 'Move',
        children: [
          { fr: 'Vélos', en: 'Bicycles', ar: 'الدراجات الهوائية', wo: 'Vélos yi', icon: 'Bike', requiredAttributes: ['type','brand','wheel_size','color','condition'], searchFilters: ['type','brand','wheel_size','color','price'] },
          { fr: 'Vélos électriques', en: 'Electric Bikes', ar: 'الدراجات الكهربائية', wo: 'Vélos électriques', icon: 'BatteryCharging', requiredAttributes: ['brand','motor_power','battery_capacity','autonomy','condition'], searchFilters: ['brand','motor_power','battery_capacity','price'] },
          { fr: 'Trottinettes électriques', en: 'Electric Scooters', ar: 'السكوترات الكهربائية', wo: 'Trottinettes', icon: 'Move', requiredAttributes: ['brand','motor_power','battery_capacity','autonomy','condition'], searchFilters: ['brand','motor_power','battery_capacity','price'] },
        ],
      },
    ],
  },
  {
    fr: 'Mode & Textiles', en: 'Fashion & Textiles', ar: 'الموضة والنسيج', wo: 'Mode ak Tey', slug: 'mode-textiles', icon: 'Shirt', isLeaf: false, commissionRate: 0.10,
    children: [
      {
        fr: 'Vêtements femme', en: 'Women\'s Clothing', ar: 'ملابس النساء', wo: 'Yére yi jigéen', icon: 'Shirt',
        children: [
          { fr: 'Hauts & T-shirts', en: 'Tops & T-shirts', ar: 'القمصان والتنانير العلوية', wo: 'Hauts yi', icon: 'Shirt', requiredAttributes: ['type','size','material','color','condition'], searchFilters: ['type','size','material','color','price'] },
          { fr: 'Pantalons & Jeans', en: 'Pants & Jeans', ar: 'البنطلونات والجينز', wo: 'Pantalons yi', icon: 'Divide', requiredAttributes: ['type','size','material','color','condition'], searchFilters: ['type','size','material','color','price'] },
          { fr: 'Robes & Jupes', en: 'Dresses & Skirts', ar: 'الفساتين والتنانير', wo: 'Robes yi', icon: 'Triangle', requiredAttributes: ['type','size','material','color','condition'], searchFilters: ['type','size','material','color','price'] },
          { fr: 'Vêtements traditionnels', en: 'Traditional Wear', ar: 'الملابس التقليدية', wo: 'Yere yu taaru', icon: 'Shirt', requiredAttributes: ['type','size','material','color','condition'], searchFilters: ['type','size','material','color','price'] },
        ],
      },
      {
        fr: 'Vêtements homme', en: 'Men\'s Clothing', ar: 'ملابس الرجال', wo: 'Yére yi góor', icon: 'Shirt',
        children: [
          { fr: 'Hauts & T-shirts', en: 'Tops & T-shirts', ar: 'القمصان والتنانير العلوية', wo: 'Hauts yi góor', icon: 'Shirt', requiredAttributes: ['type','size','material','color','condition'], searchFilters: ['type','size','material','color','price'] },
          { fr: 'Pantalons & Jeans', en: 'Pants & Jeans', ar: 'البنطلونات والجينز', wo: 'Pantalons yi góor', icon: 'Divide', requiredAttributes: ['type','size','material','color','condition'], searchFilters: ['type','size','material','color','price'] },
          { fr: 'Costumes & Chemises', en: 'Suits & Shirts', ar: 'البدلات والقمصان', wo: 'Costumes yi', icon: 'Briefcase', requiredAttributes: ['type','size','material','color','condition'], searchFilters: ['type','size','material','color','price'] },
        ],
      },
      {
        fr: 'Chaussures', en: 'Shoes', ar: 'الأحذية', wo: 'Naat yi', icon: 'Footprints',
        children: [
          { fr: 'Chaussures femme', en: 'Women\'s Shoes', ar: 'أحذية النساء', wo: 'Naat yi jigéen', icon: 'Footprints', requiredAttributes: ['type','size','material','color','condition'], searchFilters: ['type','size','material','color','price'] },
          { fr: 'Chaussures homme', en: 'Men\'s Shoes', ar: 'أحذية الرجال', wo: 'Naat yi góor', icon: 'Footprints', requiredAttributes: ['type','size','material','color','condition'], searchFilters: ['type','size','material','color','price'] },
          { fr: 'Chaussures de sport', en: 'Sports Shoes', ar: 'أحذية رياضية', wo: 'Naat sport', icon: 'Footprints', requiredAttributes: ['type','size','material','color','condition'], searchFilters: ['type','size','material','color','price'] },
          { fr: 'Chaussures de sécurité', en: 'Safety Shoes', ar: 'أحذية السلامة', wo: 'Naat sécurité', icon: 'Footprints', requiredAttributes: ['type','size','material','color','condition'], searchFilters: ['type','size','material','color','price'] },
        ],
      },
      {
        fr: 'Maroquinerie & Bagagerie', en: 'Leather Goods & Luggage', ar: 'الجلود والحقائب', wo: 'Maroquinerie', icon: 'Bag',
        children: [
          { fr: 'Sacs à main', en: 'Handbags', ar: 'حقائب اليد', wo: 'Sacs à main', icon: 'Bag', requiredAttributes: ['type','material','color','size','condition'], searchFilters: ['type','material','color','size','price'] },
          { fr: 'Sacs à dos', en: 'Backpacks', ar: 'حقائب الظهر', wo: 'Sacs à dos', icon: 'Bag', requiredAttributes: ['type','material','color','capacity','condition'], searchFilters: ['type','material','color','capacity','price'] },
          { fr: 'Valises & Bagages', en: 'Suitcases & Luggage', ar: 'الحقائب والأمتعة', wo: 'Valises yi', icon: 'Luggage', requiredAttributes: ['type','material','color','size','condition'], searchFilters: ['type','material','color','size','price'] },
        ],
      },
      {
        fr: 'Textiles & Tissus', en: 'Textiles & Fabrics', ar: 'الأقمشة والمنسوجات', wo: 'Tey yi', icon: 'Scissors',
        children: [
          { fr: 'Tissus wax & Bazin', en: 'Wax & Bazin Fabrics', ar: 'أقمشة الواكس والبازين', wo: 'Tissus wax', icon: 'Scissors', requiredAttributes: ['type','material','length','width','color','condition'], searchFilters: ['type','material','color','price'], allowedUnits: ['meter','yard','lot_of_6_yards','roll'] },
          { fr: 'Tissus pour habillement', en: 'Garment Fabrics', ar: 'أقمشة الملابس', wo: 'Tissus habillement', icon: 'Scissors', requiredAttributes: ['type','material','length','width','color','condition'], searchFilters: ['type','material','color','price'], allowedUnits: ['meter','yard','roll'] },
          { fr: 'Linge de maison', en: 'Household Linens', ar: 'المفروشات المنزلية', wo: 'Linge maison', icon: 'Bed', requiredAttributes: ['type','material','size','color','condition'], searchFilters: ['type','material','size','color','price'] },
        ],
      },
    ],
  },
  {
    fr: 'Beauté, Santé & Hygiène', en: 'Beauty, Health & Hygiene', ar: 'الجمال والصحة والنظافة', wo: 'Ndaw, Sañse ak Settle', slug: 'beaute-sante-hygiene', icon: 'Sparkles', isLeaf: false, commissionRate: 0.10,
    children: [
      {
        fr: 'Cosmétiques', en: 'Cosmetics', ar: 'مستحضرات التجميل', wo: 'Cosmétiques', icon: 'Sparkles',
        children: [
          { fr: 'Soins du visage', en: 'Face Care', ar: 'العناية بالوجه', wo: 'Soins visage', icon: 'Smile', requiredAttributes: ['brand','type','skin_type','volume','condition'], searchFilters: ['brand','type','skin_type','price'] },
          { fr: 'Soins corporels', en: 'Body Care', ar: 'العناية بالجسم', wo: 'Soins corps', icon: 'Heart', requiredAttributes: ['brand','type','skin_type','volume','condition'], searchFilters: ['brand','type','skin_type','price'] },
          { fr: 'Maquillage', en: 'Makeup', ar: 'المكياج', wo: 'Maquillage', icon: 'Palette', requiredAttributes: ['brand','type','color','volume','condition'], searchFilters: ['brand','type','color','price'] },
          { fr: 'Produits capillaires', en: 'Hair Products', ar: 'منتجات الشعر', wo: 'Produits cheveux', icon: 'Scissors', requiredAttributes: ['brand','type','hair_type','volume','condition'], searchFilters: ['brand','type','hair_type','price'] },
        ],
      },
      {
        fr: 'Hygiène personnelle', en: 'Personal Hygiene', ar: 'النظافة الشخصية', wo: 'Settle bu bopp', icon: 'Droplet',
        children: [
          { fr: 'Savons & Gels douche', en: 'Soaps & Shower Gels', ar: 'الصابون والشامبو', wo: 'Savons yi', icon: 'Droplet', requiredAttributes: ['brand','type','scent','volume','condition'], searchFilters: ['brand','type','scent','price'] },
          { fr: 'Dentifrices & Brosses', en: 'Toothpaste & Brushes', ar: 'معجون الأسنان والفرشاة', wo: 'Dentifrice', icon: 'Smile', requiredAttributes: ['brand','type','quantity','condition'], searchFilters: ['brand','type','price'] },
          { fr: 'Protection hygiénique', en: 'Hygiene Protection', ar: 'الحماية الصحية', wo: 'Protection hygiénique', icon: 'Shield', requiredAttributes: ['brand','type','size','quantity','condition'], searchFilters: ['brand','type','size','price'] },
        ],
      },
      {
        fr: 'Santé & Bien-être', en: 'Health & Wellness', ar: 'الصحة والعافية', wo: 'Sañse ak Jàmm', icon: 'Heart',
        children: [
          { fr: 'Suppléments & Vitamines', en: 'Supplements & Vitamins', ar: 'المكملات والفيتامينات', wo: 'Suppléments', icon: 'Pill', requiredAttributes: ['brand','type','quantity','expiration_date','condition'], searchFilters: ['brand','type','price'], supportsDropshipping: false },
          { fr: 'Appareils de santé', en: 'Health Devices', ar: 'أجهزة الصحة', wo: 'Appareils santé', icon: 'Activity', requiredAttributes: ['brand','type','condition'], searchFilters: ['brand','type','price'] },
          { fr: 'Premiers secours', en: 'First Aid', ar: 'الإسعافات الأولية', wo: 'Premiers secours', icon: 'Bandage', requiredAttributes: ['type','brand','quantity','condition'], searchFilters: ['type','brand','price'] },
        ],
      },
      {
        fr: 'Coiffure & Soins esthétiques', en: 'Hairdressing & Beauty', ar: 'الحلاقة والتجميل', wo: 'Coiffure', icon: 'Scissors',
        children: [
          { fr: 'Extensions & Perruques', en: 'Extensions & Wigs', ar: 'الشعر المستعار والإكسسوارات', wo: 'Perruques', icon: 'User', requiredAttributes: ['type','material','length','color','condition'], searchFilters: ['type','material','length','color','price'] },
          { fr: 'Matériel esthétique', en: 'Beauty Equipment', ar: 'معدات التجميل', wo: 'Matériel esthétique', icon: 'Sparkles', requiredAttributes: ['type','brand','condition'], searchFilters: ['type','brand','price'] },
        ],
      },
    ],
  },
  {
    fr: 'Alimentation & Boissons', en: 'Food & Beverages', ar: 'الأغذية والمشروبات', wo: 'Lekk ak Naan', slug: 'alimentation-boissons', icon: 'Apple', isLeaf: false, commissionRate: 0.07,
    children: [
      {
        fr: 'Produits alimentaires de base', en: 'Staple Foods', ar: 'المنتجات الغذائية الأساسية', wo: 'Lekk yu bees', icon: 'Wheat',
        children: [
          { fr: 'Riz & Pâtes', en: 'Rice & Pasta', ar: 'الأرز والمعكرونة', wo: 'Ceebu ak Pasta', icon: 'Wheat', requiredAttributes: ['brand','type','weight','origin','condition'], searchFilters: ['brand','type','weight','origin','price'], allowedUnits: ['kg','bag','sack','carton'] },
          { fr: 'Huiles & Graisses', en: 'Oils & Fats', ar: 'الزيوت والدهون', wo: 'Tëral', icon: 'Droplet', requiredAttributes: ['brand','type','volume','origin','condition'], searchFilters: ['brand','type','volume','origin','price'], allowedUnits: ['liter','bottle','carton'] },
          { fr: 'Condiments & Épices', en: 'Condiments & Spices', ar: 'التوابل والبهارات', wo: 'Tàbbaxe', icon: 'Flame', requiredAttributes: ['brand','type','weight','origin','condition'], searchFilters: ['brand','type','weight','origin','price'], allowedUnits: ['gram','kg','jar','carton'] },
        ],
      },
      {
        fr: 'Boissons', en: 'Beverages', ar: 'المشروبات', wo: 'Naan', icon: 'CupSoda',
        children: [
          { fr: 'Eaux minérales', en: 'Mineral Water', ar: 'المياه المعدنية', wo: 'Ndox mi', icon: 'Droplet', requiredAttributes: ['brand','volume','packaging','condition'], searchFilters: ['brand','volume','price'], allowedUnits: ['bottle','pack_of_6','carton','palette'] },
          { fr: 'Jus & Nectars', en: 'Juices & Nectars', ar: 'العصائر والنكتار', wo: 'Jus yi', icon: 'CupSoda', requiredAttributes: ['brand','flavor','volume','condition'], searchFilters: ['brand','flavor','volume','price'], allowedUnits: ['bottle','pack','carton'] },
          { fr: 'Thés & Cafés', en: 'Teas & Coffees', ar: 'الشاي والقهوة', wo: 'Atte ak Kafe', icon: 'Coffee', requiredAttributes: ['brand','type','weight','condition'], searchFilters: ['brand','type','weight','price'], allowedUnits: ['gram','kg','box','carton'] },
        ],
      },
      {
        fr: 'Alimentation spécialisée', en: 'Specialized Food', ar: 'الأغذية المتخصصة', wo: 'Lekk yu am solo', icon: 'Apple',
        children: [
          { fr: 'Produits bio', en: 'Organic Products', ar: 'منتجات عضوية', wo: 'Produits bio', icon: 'Leaf', requiredAttributes: ['brand','type','certification','weight','condition'], searchFilters: ['brand','type','certification','price'] },
          { fr: 'Aliments pour bébé', en: 'Baby Food', ar: 'أغذية الأطفال', wo: 'Lekk bu mbugal', icon: 'Baby', requiredAttributes: ['brand','type','age','weight','expiration_date','condition'], searchFilters: ['brand','type','age','price'], supportsDropshipping: false },
          { fr: 'Aliments pour animaux', en: 'Pet Food', ar: 'أغذية الحيوانات', wo: 'Lekk xay', icon: 'Dog', requiredAttributes: ['brand','type','animal','weight','condition'], searchFilters: ['brand','type','animal','price'], allowedUnits: ['kg','bag','carton'] },
        ],
      },
    ],
  },
  {
    fr: 'Agriculture, Élevage & Pêche', en: 'Agriculture, Livestock & Fishing', ar: 'الزراعة والثروة الحيوانية والصيد', wo: 'Agriculture, éleve ak Péec', slug: 'agriculture-elevage-peche', icon: 'Tractor', isLeaf: false, commissionRate: 0.07,
    children: [
      {
        fr: 'Matériel agricole', en: 'Agricultural Equipment', ar: 'معدات زراعية', wo: 'Matériel agricole', icon: 'Tractor',
        children: [
          { fr: 'Tracteurs & Motoculteurs', en: 'Tractors & Tillers', ar: 'الجرارات والمحراث', wo: 'Tracteurs yi', icon: 'Tractor', requiredAttributes: ['brand','power','type','condition'], searchFilters: ['brand','power','type','price'], allowedUnits: ['piece','palette'] },
          { fr: 'Systèmes d\'irrigation', en: 'Irrigation Systems', ar: 'أنظمة الري', wo: 'Irrigation', icon: 'Droplets', requiredAttributes: ['type','brand','flow_rate','condition'], searchFilters: ['type','brand','flow_rate','price'] },
          { fr: 'Pièces agricoles', en: 'Agricultural Parts', ar: 'قطع زراعية', wo: 'Benn agricole', icon: 'Wrench', requiredAttributes: ['type','brand','model_compatible','condition'], searchFilters: ['type','brand','model_compatible','price'] },
        ],
      },
      {
        fr: 'Intrants agricoles', en: 'Agricultural Inputs', ar: 'المدخلات الزراعية', wo: 'Intrants agricoles', icon: 'Leaf',
        children: [
          { fr: 'Semences & Plants', en: 'Seeds & Plants', ar: 'البذور والشتلات', wo: 'Semences', icon: 'Leaf', requiredAttributes: ['type','species','weight','origin','condition'], searchFilters: ['type','species','origin','price'], allowedUnits: ['gram','kg','packet','sack'] },
          { fr: 'Engrais', en: 'Fertilizers', ar: 'الأسمدة', wo: 'Engrais', icon: 'Flask', requiredAttributes: ['brand','type','composition','weight','condition'], searchFilters: ['brand','type','composition','price'], allowedUnits: ['kg','sack','carton'] },
          { fr: 'Pesticides & Herbicides', en: 'Pesticides & Herbicides', ar: 'المبيدات والمبيدات العشبية', wo: 'Pesticides', icon: 'Spray', requiredAttributes: ['brand','type','active_ingredient','volume','condition'], searchFilters: ['brand','type','active_ingredient','price'], allowedUnits: ['liter','bottle','carton'] },
        ],
      },
      {
        fr: 'Élevage & Pêche', en: 'Livestock & Fishing', ar: 'الثروة الحيوانية والصيد', wo: 'Élevage ak Péec', icon: 'Fish',
        children: [
          { fr: 'Matériel d\'élevage', en: 'Livestock Equipment', ar: 'معدات تربية الحيوان', wo: 'Matériel élevage', icon: 'Bone', requiredAttributes: ['type','material','condition'], searchFilters: ['type','material','price'] },
          { fr: 'Matériel de pêche', en: 'Fishing Equipment', ar: 'معدات الصيد', wo: 'Péec', icon: 'Fish', requiredAttributes: ['type','brand','condition'], searchFilters: ['type','brand','price'] },
          { fr: 'Aliments pour bétail', en: 'Livestock Feed', ar: 'أغذية الماشية', wo: 'Lekk bétail', icon: 'Wheat', requiredAttributes: ['brand','type','animal','weight','condition'], searchFilters: ['brand','type','animal','price'], allowedUnits: ['kg','sack','palette'] },
        ],
      },
    ],
  },
  {
    fr: 'Bricolage, Construction & Outillage', en: 'DIY, Construction & Tools', ar: 'الأعمال اليدوية والبناء والأدوات', wo: 'Bricolage, Construction ak Outillage', slug: 'bricolage-construction-outillage', icon: 'Hammer', isLeaf: false, commissionRate: 0.08,
    children: [
      {
        fr: 'Outillage électrique', en: 'Power Tools', ar: 'الأدوات الكهربائية', wo: 'Outillage électrique', icon: 'Drill',
        children: [
          { fr: 'Perceuses & Visseuses', en: 'Drills & Screwdrivers', ar: 'المثاقب والمفكات', wo: 'Perceuses', icon: 'Drill', requiredAttributes: ['brand','type','power','voltage','condition'], searchFilters: ['brand','type','power','price'] },
          { fr: 'Meuleuses & Scies', en: 'Grinders & Saws', ar: 'الطحنات والمناشير', wo: 'Meuleuses', icon: 'Disc', requiredAttributes: ['brand','type','power','disc_size','condition'], searchFilters: ['brand','type','power','disc_size','price'] },
          { fr: 'Compresseurs & Pistolets', en: 'Compressors & Spray Guns', ar: 'الضاغطات والمسدسات', wo: 'Compresseurs', icon: 'Wind', requiredAttributes: ['brand','type','power','tank_capacity','condition'], searchFilters: ['brand','type','power','tank_capacity','price'] },
        ],
      },
      {
        fr: 'Outillage à main', en: 'Hand Tools', ar: 'الأدوات اليدوية', wo: 'Outillage à main', icon: 'Hammer',
        children: [
          { fr: 'Outils de coupe & Mesure', en: 'Cutting & Measuring Tools', ar: 'أدوات القطع والقياس', wo: 'Outils mesure', icon: 'Ruler', requiredAttributes: ['type','brand','material','condition'], searchFilters: ['type','brand','material','price'] },
          { fr: 'Échelles & Échafaudages', en: 'Ladders & Scaffolding', ar: 'السلالم والسقالات', wo: 'Échelles', icon: 'Layers', requiredAttributes: ['type','brand','height','material','condition'], searchFilters: ['type','brand','height','material','price'] },
          { fr: 'Quincaillerie & Visserie', en: 'Hardware & Fasteners', ar: 'الأجهزة والبراغي', wo: 'Quincaillerie', icon: 'Nut', requiredAttributes: ['type','material','size','condition'], searchFilters: ['type','material','size','price'], allowedUnits: ['piece','kg','box','carton'] },
        ],
      },
      {
        fr: 'Matériaux de construction', en: 'Construction Materials', ar: 'مواد البناء', wo: 'Matériaux construction', icon: 'BrickWall',
        children: [
          { fr: 'Ciments & Bétons', en: 'Cement & Concrete', ar: 'الأسمنت والخرسانة', wo: 'Siment', icon: 'BrickWall', requiredAttributes: ['brand','type','weight','condition'], searchFilters: ['brand','type','weight','price'], allowedUnits: ['kg','sack','palette'] },
          { fr: 'Tôles & Profilés', en: 'Sheets & Profiles', ar: 'الألواح والقطاعات', wo: 'Tôles', icon: 'Grid', requiredAttributes: ['type','material','thickness','dimensions','condition'], searchFilters: ['type','material','thickness','price'], allowedUnits: ['sheet','meter','palette'] },
          { fr: 'Peintures & Vernis', en: 'Paints & Varnishes', ar: 'الدهانات والورنيش', wo: 'Peintures', icon: 'PaintBucket', requiredAttributes: ['brand','type','color','volume','condition'], searchFilters: ['brand','type','color','volume','price'], allowedUnits: ['liter','pot','carton'] },
        ],
      },
    ],
  },
  {
    fr: 'Matériel professionnel', en: 'Professional Equipment', ar: 'المعدات المهنية', wo: 'Material pro', slug: 'materiel-professionnel', icon: 'Briefcase', isLeaf: false, commissionRate: 0.08,
    children: [
      {
        fr: 'Matériel de cuisine pro', en: 'Professional Kitchen', ar: 'معدات المطبخ المهنية', wo: 'Cuisine pro', icon: 'ChefHat',
        children: [
          { fr: 'Fours & Plaques pro', en: 'Pro Ovens & Cooktops', ar: 'أفران ومواقد مهنية', wo: 'Fours pro', icon: 'Flame', requiredAttributes: ['brand','type','power','material','condition'], searchFilters: ['brand','type','power','price'] },
          { fr: 'Réfrigération pro', en: 'Pro Refrigeration', ar: 'تبريد مهني', wo: 'Réfrigération pro', icon: 'Refrigerator', requiredAttributes: ['brand','type','volume','condition'], searchFilters: ['brand','type','volume','price'] },
          { fr: 'Ustensiles pro', en: 'Pro Utensils', ar: 'أدوات مهنية', wo: 'Ustensiles pro', icon: 'Utensils', requiredAttributes: ['type','material','condition'], searchFilters: ['type','material','price'] },
        ],
      },
      {
        fr: 'Équipement de bureau', en: 'Office Equipment', ar: 'معدات المكتب', wo: 'Bureau equipement', icon: 'Printer',
        children: [
          { fr: 'Imprimantes & Scanners', en: 'Printers & Scanners', ar: 'الطابعات والماسحات', wo: 'Imprimantes', icon: 'Printer', requiredAttributes: ['brand','type','technology','condition'], searchFilters: ['brand','type','technology','price'] },
          { fr: 'Mobilier de bureau', en: 'Office Furniture', ar: 'أثاث المكتب', wo: 'Meubles bureau', icon: 'Briefcase', requiredAttributes: ['type','material','color','condition'], searchFilters: ['type','material','color','price'] },
          { fr: 'Fournitures de bureau', en: 'Office Supplies', ar: 'لوازم المكتب', wo: 'Fournitures bureau', icon: 'Pen', requiredAttributes: ['type','brand','quantity','condition'], searchFilters: ['type','brand','price'], allowedUnits: ['piece','box','carton'] },
        ],
      },
      {
        fr: 'Matériel médical', en: 'Medical Equipment', ar: 'المعدات الطبية', wo: 'Matériel médical', icon: 'Stethoscope',
        children: [
          { fr: 'Dispositifs médicaux', en: 'Medical Devices', ar: 'الأجهزة الطبية', wo: 'Dispositifs médicaux', icon: 'Stethoscope', requiredAttributes: ['brand','type','certification','condition'], searchFilters: ['brand','type','certification','price'], supportsDropshipping: false },
          { fr: 'Mobilier médical', en: 'Medical Furniture', ar: 'أثاث طبي', wo: 'Mobilier médical', icon: 'Bed', requiredAttributes: ['type','material','condition'], searchFilters: ['type','material','price'] },
        ],
      },
    ],
  },
  {
    fr: 'Sport & Loisirs', en: 'Sports & Leisure', ar: 'الرياضة والترفيه', wo: 'Sport ak Loosir', slug: 'sport-loisirs', icon: 'Dumbbell', isLeaf: false, commissionRate: 0.09,
    children: [
      {
        fr: 'Fitness & Musculation', en: 'Fitness & Bodybuilding', ar: 'اللياقة وكمال الأجسام', wo: 'Fitness', icon: 'Dumbbell',
        children: [
          { fr: 'Haltères & Poids', en: 'Dumbbells & Weights', ar: 'الدمبل والأوزان', wo: 'Haltères', icon: 'Dumbbell', requiredAttributes: ['type','weight','material','condition'], searchFilters: ['type','weight','material','price'], allowedUnits: ['piece','pair','set'] },
          { fr: 'Machines de fitness', en: 'Fitness Machines', ar: 'آلات اللياقة', wo: 'Machines fitness', icon: 'Activity', requiredAttributes: ['brand','type','condition'], searchFilters: ['brand','type','price'] },
          { fr: 'Accessoires fitness', en: 'Fitness Accessories', ar: 'إكسسوارات اللياقة', wo: 'Accessoires fitness', icon: 'Shirt', requiredAttributes: ['type','brand','color','condition'], searchFilters: ['type','brand','color','price'] },
        ],
      },
      {
        fr: 'Sports collectifs', en: 'Team Sports', ar: 'الرياضات الجماعية', wo: 'Sports collectifs', icon: 'Users',
        children: [
          { fr: 'Football', en: 'Football', ar: 'كرة القدم', wo: 'Football', icon: 'Circle', requiredAttributes: ['type','brand','size','condition'], searchFilters: ['type','brand','size','price'] },
          { fr: 'Basket & Volley', en: 'Basketball & Volleyball', ar: 'كرة السلة والكرة الطائرة', wo: 'Basket', icon: 'Circle', requiredAttributes: ['type','brand','size','condition'], searchFilters: ['type','brand','size','price'] },
          { fr: 'Équipements sportifs', en: 'Sports Equipment', ar: 'الأدوات الرياضية', wo: 'Équipements sportifs', icon: 'Shirt', requiredAttributes: ['type','brand','size','condition'], searchFilters: ['type','brand','size','price'] },
        ],
      },
      {
        fr: 'Loisirs', en: 'Leisure', ar: 'الترفيه', wo: 'Loosir', icon: 'Gamepad',
        children: [
          { fr: 'Instruments de musique', en: 'Musical Instruments', ar: 'الآلات الموسيقية', wo: 'Musique', icon: 'Music', requiredAttributes: ['type','brand','condition'], searchFilters: ['type','brand','price'] },
          { fr: 'Jeux & Jouets', en: 'Games & Toys', ar: 'الألعاب والدمى', wo: 'Jeux', icon: 'Gamepad', requiredAttributes: ['type','brand','age','condition'], searchFilters: ['type','brand','age','price'] },
        ],
      },
    ],
  },
  {
    fr: 'Bébés, Enfants & Écoles', en: 'Babies, Kids & Schools', ar: 'الأطفال والمدارس', wo: 'Bébés, Xale ak Écoles', slug: 'bebes-enfants-ecoles', icon: 'Baby', isLeaf: false, commissionRate: 0.09,
    children: [
      {
        fr: 'Vêtements enfants', en: 'Kids Clothing', ar: 'ملابس الأطفال', wo: 'Yére xale', icon: 'Shirt',
        children: [
          { fr: 'Vêtements bébé', en: 'Baby Clothes', ar: 'ملابس البيبي', wo: 'Yére bébé', icon: 'Baby', requiredAttributes: ['type','size','material','color','condition'], searchFilters: ['type','size','material','color','price'] },
          { fr: 'Vêtements garçon', en: 'Boys Clothing', ar: 'ملابس الأولاد', wo: 'Yére xale bu góor', icon: 'Shirt', requiredAttributes: ['type','size','material','color','condition'], searchFilters: ['type','size','material','color','price'] },
          { fr: 'Vêtements fille', en: 'Girls Clothing', ar: 'ملابس البنات', wo: 'Yére xale bu jigéen', icon: 'Shirt', requiredAttributes: ['type','size','material','color','condition'], searchFilters: ['type','size','material','color','price'] },
        ],
      },
      {
        fr: 'Puériculture', en: 'Childcare', ar: 'رعاية الأطفال', wo: 'Puerikiltir', icon: 'Baby',
        children: [
          { fr: 'Poussettes & Sièges auto', en: 'Strollers & Car Seats', ar: 'العربات وكراسي السيارات', wo: 'Poussettes', icon: 'Baby', requiredAttributes: ['brand','type','weight','color','condition'], searchFilters: ['brand','type','color','price'] },
          { fr: 'Lits & Linge bébé', en: 'Baby Beds & Linens', ar: 'أسرة وملابس الأطفال', wo: 'Lits bébé', icon: 'Bed', requiredAttributes: ['type','material','color','condition'], searchFilters: ['type','material','color','price'] },
        ],
      },
      {
        fr: 'Fournitures scolaires', en: 'School Supplies', ar: 'اللوازم المدرسية', wo: 'Fournitures scolaires', icon: 'Book',
        children: [
          { fr: 'Cartables & Sacs', en: 'School Bags & Backpacks', ar: 'الحقائب المدرسية', wo: 'Cartables', icon: 'Bag', requiredAttributes: ['type','material','color','capacity','condition'], searchFilters: ['type','material','color','price'] },
          { fr: 'Papeterie', en: 'Stationery', ar: 'القرطاسية', wo: 'Papeterie', icon: 'Pen', requiredAttributes: ['type','brand','quantity','condition'], searchFilters: ['type','brand','price'], allowedUnits: ['piece','box','carton'] },
        ],
      },
    ],
  },
  {
    fr: 'Fournitures, Services & Divers', en: 'Supplies, Services & Miscellaneous', ar: 'لوازم وخدمات ومتفرقات', wo: 'Fournitures, Service ak Divers', slug: 'fournitures-services-divers', icon: 'Box', isLeaf: false, commissionRate: 0.10,
    children: [
      {
        fr: 'Emballages & Conditionnement', en: 'Packaging & Conditioning', ar: 'التغليف والتعبئة', wo: 'Emballages', icon: 'Package',
        children: [
          { fr: 'Sacs & Sachets', en: 'Bags & Pouches', ar: 'الأكياس والأكياس الصغيرة', wo: 'Sacs yi', icon: 'Bag', requiredAttributes: ['type','material','size','condition'], searchFilters: ['type','material','size','price'], allowedUnits: ['piece','kg','pack','carton'] },
          { fr: 'Cartons & Boîtes', en: 'Cardboard & Boxes', ar: 'الكرتون والصناديق', wo: 'Cartons', icon: 'Box', requiredAttributes: ['type','dimensions','material','condition'], searchFilters: ['type','dimensions','material','price'], allowedUnits: ['piece','pack','carton'] },
          { fr: 'Étiquettes & Adhésifs', en: 'Labels & Adhesives', ar: 'الملصقات والمواد اللاصقة', wo: 'Etiquettes', icon: 'Tag', requiredAttributes: ['type','material','size','condition'], searchFilters: ['type','material','size','price'], allowedUnits: ['roll','pack','carton'] },
        ],
      },
      {
        fr: 'Produits industriels', en: 'Industrial Products', ar: 'المنتجات الصناعية', wo: 'Produits industriels', icon: 'Factory',
        children: [
          { fr: 'Composants industriels', en: 'Industrial Components', ar: 'المكونات الصناعية', wo: 'Composants industriels', icon: 'Cog', requiredAttributes: ['type','material','dimensions','condition'], searchFilters: ['type','material','dimensions','price'], allowedUnits: ['piece','kg','meter','carton'] },
          { fr: 'Produits chimiques', en: 'Chemical Products', ar: 'المنتجات الكيميائية', wo: 'Produits chimiques', icon: 'Flask', requiredAttributes: ['type','brand','volume','hazard_class','condition'], searchFilters: ['type','brand','volume','hazard_class','price'], allowedUnits: ['liter','kg','container','drum'], supportsDropshipping: false },
        ],
      },
      {
        fr: 'Services associés', en: 'Associated Services', ar: 'الخدمات المرتبطة', wo: 'Services associés', icon: 'HandHelping',
        children: [
          { fr: 'Import & Douanes', en: 'Import & Customs', ar: 'الاستيراد والجمارك', wo: 'Import ak Douanes', icon: 'Plane', isLeaf: true, requiredAttributes: ['service_type','destination_country','incoterm'], optionalAttributes: ['estimated_delay','volume'], searchFilters: ['service_type','destination_country','price'], allowedUnits: ['service'], supportsDropshipping: false, supportsGroupBuying: false, commissionRate: 0.15 },
          { fr: 'Logistique & Transport', en: 'Logistics & Transport', ar: 'الخدمات اللوجستية والنقل', wo: 'Logistique', icon: 'Truck', isLeaf: true, requiredAttributes: ['service_type','origin','destination','condition'], optionalAttributes: ['max_weight','delay'], searchFilters: ['service_type','origin','destination','price'], allowedUnits: ['service'], supportsDropshipping: false, supportsGroupBuying: false, commissionRate: 0.12 },
        ],
      },
    ],
  },
]


const categories = roots.flatMap(r => flatten(r))

writeFileSync(
  resolve(__dirname, 'taxonomy.json'),
  JSON.stringify({
    version: '1.0.0',
    generatedAt: '2026-07-05T19:00:00Z',
    schema: { maxDepth: 4, supportedLanguages: SUPPORTED_LANGUAGES, currency: 'XOF', defaultUnit: 'piece' },
    categories,
  }, null, 2)
)

console.log(`Generated ${categories.length} categories in taxonomy.json`)
