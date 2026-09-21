/**
 * Traduction de requête FR → chinois pour la découverte 1688.
 *
 * Les listings 1688 sont en chinois : une recherche « écouteurs bluetooth »
 * sur les moteurs retourne des fiches hors-sujet. On traduit donc la requête
 * avant `site:detail.1688.com`.
 *
 * Chaîne de fallback : déjà chinois → MyMemory → Google gtx → dictionnaire
 * local → requête originale. Jamais bloquant, timeout 8s par tentative.
 */

const HAS_CJK = /[一-鿿]/

/** Termes produits courants DDM — filet si les APIs de traduction tombent. */
const LOCAL_DICT: Array<[RegExp, string]> = [
  [/écouteurs?/gi, '耳机'],
  [/bluetooth/gi, '蓝牙'],
  [/sans fil|wireless/gi, '无线'],
  [/oreillette/gi, '耳机'],
  [/casque/gi, '头戴耳机'],
  [/enceinte|haut[- ]parleur/gi, '音箱'],
  [/montre/gi, '手表'],
  [/smartwatch|montre connectée/gi, '智能手表'],
  [/téléphone|smartphone|portable/gi, '手机'],
  [/chargeur/gi, '充电器'],
  [/batterie externe|power ?bank/gi, '充电宝'],
  [/câble/gi, '数据线'],
  [/sac(?: à main)?/gi, '包'],
  [/sac à dos/gi, '双肩包'],
  [/valise/gi, '行李箱'],
  [/chaussures?|sneakers?/gi, '鞋'],
  [/baskets?/gi, '运动鞋'],
  [/sandales?/gi, '凉鞋'],
  [/vêtements?/gi, '服装'],
  [/robe/gi, '连衣裙'],
  [/t[- ]shirt/gi, 'T恤'],
  [/pantalon/gi, '裤子'],
  [/lunettes(?: de soleil)?/gi, '太阳镜'],
  [/bracelet/gi, '手链'],
  [/collier/gi, '项链'],
  [/bague/gi, '戒指'],
  [/peluche/gi, '毛绒玩具'],
  [/jouet/gi, '玩具'],
  [/poupée/gi, '娃娃'],
  [/lampe|led/gi, '灯'],
  [/ampoule/gi, '灯泡'],
  [/ventilateur/gi, '风扇'],
  [/climatiseur/gi, '空调'],
  [/cuisinière|four/gi, '炉'],
  [/mixeur|blender/gi, '搅拌机'],
  [/fer à repasser/gi, '电熨斗'],
  [/coiffure|perruque/gi, '假发'],
  [/cheveux/gi, '假发'],
  [/maquillage|cosmétique/gi, '化妆品'],
  [/parfum/gi, '香水'],
  [/montre[- ]?bracelet/gi, '手表'],
  [/tapis/gi, '地毯'],
  [/rideau/gi, '窗帘'],
  [/drap|literie/gi, '床上用品'],
  [/meuble|canapé/gi, '沙发'],
  [/chaise/gi, '椅子'],
  [/table/gi, '桌子'],
  [/moto|scooter/gi, '摩托车'],
  [/vélo/gi, '自行车'],
  [/pneu/gi, '轮胎'],
  [/pièces? auto|auto parts?/gi, '汽车配件'],
  [/panneau solaire/gi, '太阳能板'],
  [/générateur/gi, '发电机'],
  [/imprimante/gi, '打印机'],
  [/ordinateur|laptop/gi, '笔记本电脑'],
  [/clavier/gi, '键盘'],
  [/souris/gi, '鼠标'],
  [/caméra/gi, '摄像头'],
  [/drone/gi, '无人机'],
  [/micro/gi, '麦克风'],
]

/** Mots-outils FR à écarter de la requête (polluent la recherche). */
const FILLER = /\b(?:je|veux|cherche|chercher|pour|avec|sans|une?|des?|les?|aux?|du|de la|et|ou|type|modèle|comme|qualité|pas cher|bon marché|pièce|pièces|unités?|lot|lots|article|articles|produit|produits|test|pipeline)\b/gi

async function tryMyMemory(q: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=fr|zh-CN`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const t = data?.responseData?.translatedText
    return typeof t === 'string' && HAS_CJK.test(t) ? t : null
  } catch { return null }
}

async function tryGoogleGtx(q: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(q)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const t = Array.isArray(data?.[0]) ? data[0].map((s: unknown[]) => s?.[0] || '').join('') : null
    return t && HAS_CJK.test(t) ? t : null
  } catch { return null }
}

function localTranslate(q: string): string | null {
  let out = q
  let hits = 0
  for (const [re, zh] of LOCAL_DICT) {
    if (re.test(out)) { hits++; out = out.replace(re, ` ${zh} `) }
  }
  if (!hits) return null
  // Ne garder que les tokens chinois (le reste pollue site:detail.1688.com)
  const zh = out.match(/[一-鿿]+/g)
  return zh?.length ? zh.join(' ') : null
}

/**
 * Traduit une requête FR en mots-clés chinois pour 1688.
 * Retourne la requête inchangée si déjà chinoise ou si tout échoue.
 */
export async function toChineseQuery(query: string): Promise<string> {
  const cleaned = query.replace(FILLER, ' ').replace(/[\s\-–—:;,]+/g, ' ').trim().slice(0, 120)
  if (!cleaned || HAS_CJK.test(cleaned)) return cleaned || query.slice(0, 120)

  const translated = (await tryMyMemory(cleaned)) || (await tryGoogleGtx(cleaned)) || localTranslate(cleaned)
  return translated || cleaned
}
