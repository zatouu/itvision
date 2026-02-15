/**
 * Content Script - Extraction données produit depuis 1688 et AliExpress
 * Injecté automatiquement sur les pages produits
 */

(function() {
  'use strict';

  // Éviter double injection
  if (window.itVisionScraperInjected) return;
  window.itVisionScraperInjected = true;

  console.log('[IT Vision] Scraper actif sur', window.location.hostname);

  // ==========================================
  // UTILITAIRES
  // ==========================================
  
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  
  const trySelectors = (selectors) => {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return el.textContent.trim();
      }
    }
    return null;
  };

  const extractImages = (selectors) => {
    const images = new Set();
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach(img => {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original');
        if (src && !src.includes('lazy') && !src.includes('blank')) {
          images.add(src.replace(/_\d+x\d+/, ''));
        }
      });
    }
    return Array.from(images);
  };

  // ==========================================
  // EXTRACTEUR 1688
  // ==========================================
  
  const scrape1688 = async () => {
    console.log('[IT Vision] Extraction 1688...');
    
    // Attendre chargement complet (1688 charge en plusieurs étapes)
    await wait(2000);
    
    // Scroll progressif pour charger images et contenu lazy-loaded
    for (let y = 0; y <= 2000; y += 400) {
      window.scrollTo(0, y);
      await wait(300);
    }
    window.scrollTo(0, 0);
    await wait(300);

    const data = {
      platform: '1688',
      url: window.location.href.split('?')[0], // URL propre sans tracking params
      timestamp: new Date().toISOString()
    };

    // Titre (nombreux fallbacks car 1688 change souvent le DOM)
    try {
      data.name = trySelectors([
        '.offer-title',
        '.detail-title',
        'h1[data-spm="title"]',
        'h1.title',
        '.title-text',
        '.mod-detail-title h1',
        '[class*="offerTitle"]',
        '[class*="DetailTitle"]',
        'h1'
      ]) || document.title.replace(/[-|].*$/, '').trim() || 'Produit 1688';
    } catch (e) {
      data.name = document.title.replace(/[-|].*$/, '').trim() || 'Produit 1688';
    }

    // Prix (extraction plus robuste avec regex sur tout le contenu visible)
    try {
      const priceEl = document.querySelector(
        '.price-now .price-num, .price .price-num, .offer-price, ' +
        '[class*="price"] [class*="num"], [class*="Price"] [class*="Num"], ' +
        '.mod-detail-price .price, [data-price]'
      );
      const priceMatch = priceEl?.textContent?.match(/(\d+(?:\.\d+)?)/);
      data.price1688 = priceMatch ? parseFloat(priceMatch[1]) : null;
      // Essayer aussi d'extraire les prix par paliers
      const priceTiers = [];
      document.querySelectorAll('[class*="price"] tr, [class*="Price"] tr, .price-range-item, .batch-price-item').forEach(row => {
        const texts = row.textContent || '';
        const qtyMatch = texts.match(/(\d+)\s*[-~≥]\s*(\d+)?/);
        const prMatch = texts.match(/¥?\s*(\d+(?:\.\d+)?)/);
        if (qtyMatch && prMatch) {
          priceTiers.push({
            minQty: parseInt(qtyMatch[1]),
            maxQty: qtyMatch[2] ? parseInt(qtyMatch[2]) : undefined,
            price: parseFloat(prMatch[1])
          });
        }
      });
      if (priceTiers.length > 0) data.priceTiers = priceTiers;
    } catch (e) {
      console.warn('[IT Vision] Erreur extraction prix:', e);
    }

    // Images (plus de sélecteurs)
    try {
      data.gallery = extractImages([
        '.detail-gallery img',
        '.offer-img img',
        '.main-image img',
        '.tab-content img',
        '[class*="gallery"] img',
        '[class*="slider"] img',
        '[class*="thumb"] img',
        '.detail-desc img'
      ]);
      // Fallback: og:image
      if (data.gallery.length === 0) {
        const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
        if (ogImg) data.gallery = [ogImg];
      }
      data.image = data.gallery[0];
    } catch (e) {
      data.gallery = [];
      console.warn('[IT Vision] Erreur extraction images:', e);
    }

    // Variantes (extraction enrichie avec prix et images)
    try {
      data.variantGroups = [];
      const processedGroups = new Set();

      // Méthode 1: Conteneurs SKU structurés (1688 moderne)
      document.querySelectorAll('[class*="sku" i], [class*="Sku" i], [class*="prop" i], [class*="variant" i]').forEach(container => {
        const labelEl = container.querySelector('[class*="title" i], [class*="label" i], [class*="name" i], dt, h4, h5, strong');
        let groupName = labelEl?.textContent?.trim()?.replace(/[:\s：]+$/, '')?.trim() || '';
        groupName = groupName.replace(/\s*[:\s：].*$/, '').trim();
        if (!groupName || groupName.length > 40 || groupName.length < 1 || processedGroups.has(groupName)) return;
        
        const variants = [];
        // Chercher les items individuels
        container.querySelectorAll('li, [class*="item" i], [class*="option" i], [class*="prop-value" i]').forEach((item, idx) => {
          const text = item.textContent?.trim();
          if (!text || text.length > 80 || text.length < 1 || text === groupName) return;
          // Ignorer si c'est le label du groupe lui-même
          if (item === labelEl || item.contains(labelEl)) return;

          const img = item.querySelector('img');
          let imgUrl = img?.getAttribute('src') || img?.getAttribute('data-src') || undefined;
          if (imgUrl) {
            imgUrl = imgUrl.replace(/_\d+x\d+[^.]*/, '');
            if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
          }

          // Essayer d'extraire un prix de la variante
          const priceMatch = text.match(/[¥￥]\s*(\d+(?:\.\d+)?)/);
          const variantPrice = priceMatch ? parseFloat(priceMatch[1]) : undefined;
          // Nom nettoyé (sans le prix)
          const cleanName = text.replace(/[¥￥]\s*\d+(?:\.\d+)?/, '').trim() || text;

          if (!variants.find(v => v.name === cleanName)) {
            variants.push({
              id: `sku-${idx}`,
              name: cleanName,
              image: imgUrl,
              price1688: variantPrice || data.price1688,
              stock: 1000,
              isDefault: idx === 0
            });
          }
        });
        
        if (variants.length > 1) {
          processedGroups.add(groupName);
          data.variantGroups.push({ name: groupName, variants });
          console.log('[IT Vision] 1688 Variante:', groupName, '→', variants.length, 'options');
        }
      });

      // Méthode 2: Fallback items plats
      if (data.variantGroups.length === 0) {
        const variants = [];
        document.querySelectorAll('.sku-item, .offer-sku, .prop-item').forEach((item, idx) => {
          const name = item.textContent?.trim();
          const img = item.querySelector('img')?.getAttribute('src') || item.querySelector('img')?.getAttribute('data-src');
          let imgUrl = img || undefined;
          if (imgUrl?.startsWith('//')) imgUrl = 'https:' + imgUrl;
          if (name && name.length > 0 && name.length < 80 && !variants.find(v => v.name === name)) {
            variants.push({ id: `sku-${idx}`, name, image: imgUrl, price1688: data.price1688, stock: 1000, isDefault: idx === 0 });
          }
        });
        if (variants.length > 1) {
          data.variantGroups.push({ name: 'Modèle', variants });
        }
      }
    } catch (e) {
      console.warn('[IT Vision] Erreur extraction variantes:', e);
    }

    // MOQ (extraction robuste)
    try {
      const moqSelectors = '.moq-info, [class*="moq"], .min-order, [class*="MinOrder"], [class*="minOrder"]';
      const moqEl = document.querySelector(moqSelectors);
      if (moqEl) {
        const moqMatch = moqEl.textContent.match(/(\d+)\s*(?:件|个|pcs|pi[eè]ces?|unit)/i);
        data.moq = moqMatch ? parseInt(moqMatch[1]) : null;
      }
      // Fallback: chercher dans le texte général
      if (!data.moq) {
        const bodyText = document.body.innerText.slice(0, 5000);
        const moqFallback = bodyText.match(/(?:起订|最少|minimum)[^\d]*(\d+)/i);
        if (moqFallback) data.moq = parseInt(moqFallback[1]);
      }
    } catch (e) {
      console.warn('[IT Vision] Erreur extraction MOQ:', e);
    }

    // Fournisseur
    try {
      const supplierName = document.querySelector(
        '.company-name, .supplier-name, [class*="company"], [class*="Company"], [class*="shopName"], [class*="StoreName"]'
      )?.textContent?.trim();
      if (supplierName && supplierName.length < 100) {
        data.supplier = {
          name: supplierName,
          location: document.querySelector('.company-location, [class*="location"], [class*="Location"]')?.textContent?.trim() || 'Chine',
          verified: document.querySelector('[class*="verified"], [class*="Verified"], [class*="trust"]') !== null
        };
      }
    } catch (e) {
      console.warn('[IT Vision] Erreur extraction fournisseur:', e);
    }

    // Spécifications
    try {
      data.specifications = {};
      document.querySelectorAll('.offer-attr-row, .parameter-row, [class*="attr"] tr, [class*="Attr"] tr, [class*="param"] tr').forEach(row => {
        const cells = row.querySelectorAll('td, .attr-name, .attr-value, th');
        if (cells.length >= 2) {
          const key = cells[0].textContent?.trim();
          const value = cells[1].textContent?.trim();
          if (key && value && key.length < 50 && value.length < 200) {
            data.specifications[key] = value;
          }
        }
      });
    } catch (e) {
      data.specifications = {};
      console.warn('[IT Vision] Erreur extraction spécifications:', e);
    }

    // Extraire poids/dimensions depuis les spécifications
    let weightKg = 1, lengthCm = 10, widthCm = 10, heightCm = 10;
    try {
      const specs = Object.entries(data.specifications || {});
      for (const [key, value] of specs) {
        const k = key.toLowerCase();
        if (k.includes('重量') || k.includes('weight')) {
          const wm = String(value).match(/(\d+(?:\.\d+)?)\s*(?:kg|千克)/i);
          if (wm) weightKg = parseFloat(wm[1]);
          const wg = String(value).match(/(\d+(?:\.\d+)?)\s*(?:g|克)/i);
          if (wg && !wm) weightKg = parseFloat(wg[1]) / 1000;
        }
        if (k.includes('尺寸') || k.includes('dimension') || k.includes('size')) {
          const dims = String(value).match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i);
          if (dims) {
            lengthCm = parseFloat(dims[1]);
            widthCm = parseFloat(dims[2]);
            heightCm = parseFloat(dims[3]);
          }
        }
      }
    } catch (e) {
      console.warn('[IT Vision] Erreur extraction poids/dimensions:', e);
    }

    // Valeurs par défaut
    data.category = 'Catalogue import Chine';
    data.tagline = 'Import 1688';
    data.availabilityNote = 'Import 1688 - vérifier poids/dimensions';
    data.currency = 'FCFA';
    data.price1688Currency = 'CNY';
    data.exchangeRate = 100;
    data.weightKg = weightKg;
    data.lengthCm = lengthCm;
    data.widthCm = widthCm;
    data.heightCm = heightCm;
    data.features = [
      data.moq && `MOQ: ${data.moq} unités`,
      data.supplier?.name && `Fournisseur: ${data.supplier.name}`,
      data.priceTiers?.length && `${data.priceTiers.length} paliers de prix`,
      Object.keys(data.specifications || {}).length > 0 && `${Object.keys(data.specifications).length} spécifications`
    ].filter(Boolean);

    console.log('[IT Vision] 1688 extrait:', data);
    return data;
  };

  // ==========================================
  // EXTRACTEUR ALIEXPRESS
  // ==========================================
  
  const scrapeAliExpress = async () => {
    console.log('[IT Vision] Extraction AliExpress...');
    
    // Attendre chargement dynamique (React hydration)
    await wait(3000);
    
    // Scroll profond pour déclencher lazy load (description est en bas)
    const docHeight = Math.max(document.body.scrollHeight, 5000);
    for (let y = 0; y <= docHeight; y += 400) {
      window.scrollTo(0, y);
      await wait(200);
    }
    await wait(1000);

    // Cliquer sur les onglets Description / Détails / Spécifications
    try {
      const tabSelectors = [
        '[data-pl="product-description"]',
        '[class*="tab" i][class*="item" i]',
        '[role="tab"]',
        'div[class*="Tab"] span',
        'button[class*="tab" i]',
        '.detail-tab-item', '.product-tab'
      ];
      for (const sel of tabSelectors) {
        document.querySelectorAll(sel).forEach(tab => {
          const text = (tab.textContent || '').toLowerCase();
          if (text.includes('description') || text.includes('detail') || text.includes('détail')
              || text.includes('specification') || text.includes('spécification')
              || text.includes('overview') || text.includes('présentation')) {
            tab.click();
            console.log('[IT Vision] Onglet cliqué:', text.trim());
          }
        });
      }
      await wait(2000);
      // Re-scroll pour charger le contenu lazy des onglets
      window.scrollTo(0, document.body.scrollHeight / 2);
      await wait(1000);
    } catch (e) {
      console.warn('[IT Vision] Erreur clic onglets:', e);
    }

    window.scrollTo(0, 0);
    await wait(300);

    const data = {
      platform: 'aliexpress',
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // ===== SOURCE 1: JSON-LD (le plus fiable) =====
    let jsonLdProduct = null;
    try {
      document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        try {
          const parsed = JSON.parse(script.textContent || '');
          const items = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of items) {
            if (item['@type'] === 'Product' && item.name) {
              jsonLdProduct = item;
            }
          }
        } catch {}
      });
    } catch {}

    // ===== SOURCE 2: window.__INIT_DATA__ ou runParams (AliExpress interne) =====
    let pageData = null;
    try {
      const scripts = document.querySelectorAll('script');
      for (const s of scripts) {
        const txt = s.textContent || '';
        // AliExpress stocke les données dans window.runParams ou data
        if (txt.includes('runParams') || txt.includes('"actionModule"') || txt.includes('"titleModule"')) {
          const dataMatch = txt.match(/data:\s*(\{[\s\S]*?\})\s*[,;]/);
          if (dataMatch) {
            try { pageData = JSON.parse(dataMatch[1]); } catch {}
          }
        }
      }
    } catch {}

    // ===== TITRE =====
    if (jsonLdProduct?.name) {
      data.name = jsonLdProduct.name.trim();
    }
    if (!data.name) {
      // Meta tags
      data.name = document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim()
        || document.querySelector('meta[name="title"]')?.getAttribute('content')?.trim();
    }
    if (!data.name) {
      // DOM: chercher h1 ou data-pl
      data.name = trySelectors([
        '[data-pl="product-title"]', 'h1[data-pl="product-title"]',
        'h1', '.product-title'
      ]);
    }
    if (!data.name) data.name = document.title.replace(/-.*AliExpress.*$/i, '').trim() || 'Produit AliExpress';

    // ===== PRIX =====
    // JSON-LD price
    if (jsonLdProduct?.offers) {
      const offers = jsonLdProduct.offers;
      const price = offers.price || offers.lowPrice;
      if (price) {
        data.priceUSD = parseFloat(price);
        const curr = (offers.priceCurrency || 'USD').toUpperCase();
        // Convertir en FCFA selon la devise
        if (curr === 'EUR') data.price = Math.round(data.priceUSD * 656);
        else if (curr === 'XOF' || curr === 'FCFA') data.price = Math.round(data.priceUSD);
        else data.price = Math.round(data.priceUSD * 620); // USD par défaut
      }
    }
    if (!data.price) {
      // DOM: chercher tous les éléments contenant un prix
      const allEls = document.querySelectorAll('[data-pl="product-price"], [class*="Price"], [class*="price"]');
      for (const el of allEls) {
        const text = el.textContent || '';
        // Chercher un pattern prix: €12.34 ou $12.34 ou 12,34€
        const m = text.match(/(?:[\$€£]|US\$|EUR)\s*(\d+[.,]\d+)|(\d+[.,]\d+)\s*(?:[\$€£]|US\$|EUR)/);
        if (m) {
          const val = parseFloat((m[1] || m[2]).replace(',', '.'));
          if (val > 0 && val < 100000) {
            data.priceUSD = val;
            if (text.includes('€') || text.includes('EUR')) data.price = Math.round(val * 656);
            else data.price = Math.round(val * 620);
            break;
          }
        }
      }
    }

    // ===== IMAGES (approche ciblée — uniquement galerie produit) =====
    const imageSet = new Set();

    // Filtre anti-bruit : exclure logos paiement, promos, icônes UI
    const isNoiseImage = (url) => {
      if (!url) return true;
      const lower = url.toLowerCase();
      // Logos paiement / fintech
      if (/paypal|klarna|afterpay|clearpay|affirm|stripe|visa|mastercard|amex|american.?express|discover|unionpay|jcb|diners/i.test(lower)) return true;
      // Icônes / badges / banners promotionnels
      if (/promo|badge|banner|icon|logo|coupon|voucher|coin|reward|loyalty/i.test(lower)) return true;
      // Images de UI AliExpress
      if (/assets\.alicdn|g\.alicdn/i.test(lower)) return true;
      // Petites icônes (souvent dans /imgextra/ avec des noms très courts)
      if (/\/icon[s]?\//i.test(lower)) return true;
      // Images SVG (icônes UI)
      if (lower.endsWith('.svg')) return true;
      // Images GIF animées (souvent des pubs)
      if (lower.endsWith('.gif')) return true;
      // Patterns de tracking pixels
      if (/pixel|tracker|beacon|1x1/i.test(lower)) return true;
      return false;
    };
    
    // Source 1: JSON-LD images (le plus fiable)
    if (jsonLdProduct?.image) {
      const imgs = Array.isArray(jsonLdProduct.image) ? jsonLdProduct.image : [jsonLdProduct.image];
      imgs.forEach(img => {
        if (typeof img === 'string' && img.startsWith('http') && !isNoiseImage(img)) imageSet.add(img);
      });
    }

    // Source 2: og:image
    const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
    if (ogImg && ogImg.startsWith('http') && !isNoiseImage(ogImg)) imageSet.add(ogImg);

    // Source 3: Images de la GALERIE PRODUIT uniquement (pas toute la page)
    const gallerySelectors = [
      '[class*="gallery" i] img', '[class*="Gallery" i] img',
      '[class*="slider" i] img', '[class*="Slider" i] img',
      '[class*="image-view" i] img', '[class*="ImageView" i] img',
      '[class*="product-image" i] img', '[class*="ProductImage" i] img',
      '[data-pl="product-image"] img', '[class*="magnifier" i] img',
      '[class*="thumb" i]:not([class*="review" i]):not([class*="payment" i]) img'
    ];
    for (const sel of gallerySelectors) {
      document.querySelectorAll(sel).forEach(img => {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
        if (!src) return;
        if (isNoiseImage(src)) return;
        if (/ae\d+\.alicdn\.com|cbu\d*\.alicdn\.com|img\.aliexpress/i.test(src)) {
          let clean = src.replace(/_\d+x\d+[^.]*/, '').replace(/\.\d+x\d+\./, '.');
          if (clean.startsWith('//')) clean = 'https:' + clean;
          imageSet.add(clean);
        }
      });
    }

    // Source 4: background-image dans les div de gallery uniquement
    document.querySelectorAll('[class*="gallery" i] [style*="background-image"], [class*="slider" i] [style*="background-image"]').forEach(el => {
      const bg = el.style.backgroundImage;
      const m = bg.match(/url\(["']?([^"')]+)/);
      if (m && !isNoiseImage(m[1]) && /ae\d+\.alicdn|cbu\d*\.alicdn|aliexpress/i.test(m[1])) {
        let src = m[1].replace(/_\d+x\d+[^.]*/, '');
        if (src.startsWith('//')) src = 'https:' + src;
        imageSet.add(src);
      }
    });

    // Dédouper par nom de fichier (même image, résolutions différentes)
    const seen = new Set();
    data.gallery = Array.from(imageSet).filter(url => {
      if (isNoiseImage(url)) return false;
      const fname = url.split('/').pop()?.split('?')[0]?.replace(/_\d+x\d+/, '') || url;
      if (seen.has(fname)) return false;
      seen.add(fname);
      return true;
    }).slice(0, 15);
    data.image = data.gallery[0];
    console.log('[IT Vision] Images trouvées:', data.gallery.length);

    // ===== BOUTIQUE =====
    try {
      // AliExpress met le nom de la boutique dans des liens vers le store
      const storeLinks = document.querySelectorAll('a[href*="/store/"], a[href*="seller/"]');
      for (const link of storeLinks) {
        const text = link.textContent?.trim();
        if (text && text.length > 1 && text.length < 50 && !/visit|view|see/i.test(text)) {
          data.shopName = text;
          break;
        }
      }
      if (!data.shopName) {
        data.shopName = document.querySelector('[class*="shop" i] a, [class*="store" i] a, [data-pl*="store"]')?.textContent?.trim();
      }
    } catch {}

    // ===== RATING & COMMANDES =====
    try {
      // Chercher pattern "4.8" dans les éléments de rating
      const bodyText = document.body.innerText.slice(0, 5000);
      const ratingMatch = bodyText.match(/(\d\.\d)\s*(?:\/\s*5|stars?|étoiles?|\()/i);
      if (ratingMatch) data.rating = parseFloat(ratingMatch[1]);
      
      const ordersMatch = bodyText.match(/(\d[\d,. ]*)\s*(?:sold|vendu|command|order)/i);
      if (ordersMatch) data.orders = parseInt(ordersMatch[1].replace(/[^\d]/g, ''));
    } catch {}

    // ===== TROUVER LES SECTIONS PAR TEXTE DES HEADINGS =====
    // AliExpress fr: les sections sont identifiées par leur heading textuel
    // "Détails" → tableau clé-valeur  |  "Présentation" → Caractéristiques + Spécifications
    
    // Helper: trouver une section par le texte de son heading
    const findSectionByHeading = (keywords) => {
      // Chercher dans h1-h6, strong, b, span, div qui contiennent un des keywords
      const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b, [class*="title" i], [class*="Title" i], [class*="heading" i]');
      for (const h of allHeadings) {
        const text = h.textContent?.trim().toLowerCase() || '';
        if (keywords.some(k => text === k || text.startsWith(k))) {
          // Remonter au parent conteneur (la section qui contient ce heading)
          let section = h.parentElement;
          // Remonter jusqu'à trouver un conteneur assez large
          for (let i = 0; i < 5 && section; i++) {
            if (section.innerText && section.innerText.length > text.length + 50) {
              return section;
            }
            section = section.parentElement;
          }
          return h.parentElement;
        }
      }
      return null;
    };

    // Cliquer sur "Voir plus" / "Voir tout" s'il existe
    try {
      document.querySelectorAll('button, a, span, div').forEach(el => {
        const text = (el.textContent || '').trim().toLowerCase();
        if ((text.includes('voir plus') || text.includes('voir tout') || text.includes('see more') || text.includes('view more'))
            && text.length < 30) {
          el.click();
          console.log('[IT Vision] Bouton cliqué:', text);
        }
      });
      await wait(1000);
    } catch {}

    // ===== SECTION "DÉTAILS" (tableau clé-valeur) =====
    const specs = {};

    // Filtrage: exclure les specs dont la clé est un nombre, trop courte, ou inutile
    const isUsefulSpecKey = (key) => {
      if (!key || key.length < 2 || key.length > 60) return false;
      // Exclure si la clé est un nombre pur (ex: "4", "1080")
      if (/^\d+([.,]\d+)?$/.test(key.trim())) return false;
      // Exclure des clés connues pour être du bruit
      const noise = ['sku', 'model number', 'item specifics', 'n/a', 'non spécifié',
        'produit chimique', 'remplacement', 'cn (origine)', 'cn'];
      if (noise.some(n => key.toLowerCase().includes(n))) return false;
      return true;
    };

    const isUsefulSpecValue = (val) => {
      if (!val || val.length === 0 || val.length > 200) return false;
      const lower = val.toLowerCase();
      if (lower === 'n/a' || lower === 'non spécifié' || lower === 'none' || lower === 'no') return false;
      return true;
    };

    try {
      const detailsSection = findSectionByHeading(['détails', 'details', 'specifications', 'spécifications']);
      if (detailsSection) {
        console.log('[IT Vision] Section Détails trouvée');
        // Extraire les lignes de tableau (td-td ou div-div pairs)
        detailsSection.querySelectorAll('tr').forEach(row => {
          const cells = row.querySelectorAll('td, th');
          if (cells.length >= 2) {
            const key = cells[0].textContent?.trim();
            const value = cells[1].textContent?.trim();
            if (isUsefulSpecKey(key) && isUsefulSpecValue(value)) {
              specs[key] = value;
            }
          }
        });
        // Aussi chercher des paires dans des div adjacents
        if (Object.keys(specs).length === 0) {
          const allText = detailsSection.innerText || '';
          const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 3);
          for (const line of lines) {
            const kvMatch = line.match(/^([^:：]+?)\s*[:\s：]\s*(.+)$/);
            if (kvMatch && isUsefulSpecKey(kvMatch[1].trim()) && isUsefulSpecValue(kvMatch[2].trim())) {
              specs[kvMatch[1].trim()] = kvMatch[2].trim();
            }
          }
        }
      }
      console.log('[IT Vision] Specs Détails:', Object.keys(specs).length);
    } catch (e) {
      console.warn('[IT Vision] Erreur extraction Détails:', e);
    }

    // ===== SECTION "PRÉSENTATION" (Caractéristiques + Spécifications + poids) =====
    let presentationText = '';
    // Images descriptives du produit (souvent dans la section présentation)
    const descriptionImages = [];
    try {
      const presSection = findSectionByHeading(['présentation', 'presentation', 'overview', 'description']);
      if (presSection) {
        console.log('[IT Vision] Section Présentation trouvée');

        // Extraire les images descriptives (souvent des infographies produit)
        presSection.querySelectorAll('img').forEach(img => {
          const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
          if (src && !isNoiseImage(src) && /ae\d+\.alicdn|cbu\d*\.alicdn|img\.aliexpress/i.test(src)) {
            let clean = src.replace(/_\d+x\d+[^.]*/, '');
            if (clean.startsWith('//')) clean = 'https:' + clean;
            descriptionImages.push(clean);
          }
        });

        // Nettoyer le texte en excluant les sections de bruit
        // Cloner pour ne pas modifier le DOM
        const clone = presSection.cloneNode(true);

        // Supprimer les blocs de bruit connus
        const noiseSelectors = [
          '[class*="review" i]', '[class*="Review" i]', '[class*="feedback" i]',
          '[class*="rating" i]', '[class*="Rating" i]',
          '[class*="recommend" i]', '[class*="Recommend" i]',
          '[class*="also-like" i]', '[class*="AlsoLike" i]',
          '[class*="buyer" i]', '[class*="Buyer" i]',
          '[class*="seller" i]', '[class*="Seller" i]', '[class*="store-info" i]',
          '[class*="price" i]', '[class*="Price" i]',
          '[class*="coupon" i]', '[class*="Coupon" i]',
          '[class*="shipping" i]', '[class*="Shipping" i]',
          '[class*="cart" i]', '[class*="Cart" i]',
          '[class*="quantity" i]', '[class*="Quantity" i]'
        ];
        noiseSelectors.forEach(sel => {
          clone.querySelectorAll(sel).forEach(el => el.remove());
        });

        let rawText = clone.innerText?.trim() || '';

        // Supprimer les lignes de bruit par pattern
        const noisePatterns = [
          /^\d+[.,]?\d*\s*[€$£¥]/m,                      // Lignes de prix
          /^(?:Économisez|Save|Payez|Pay)\s/im,            // Offres
          /^\d+\s*(?:Avis|Reviews?|évaluations?)\b/im,     // Compteurs avis
          /^(?:Avis des acheteurs|Buyer reviews)\b/im,     // Titre section avis
          /^(?:Vous aimerez aussi|You may also like)\b/im, // Recommandations
          /^(?:Trier par|Sort by)\b/im,                    // Contrôles tri
          /^(?:Toutes les notes|All ratings)\b/im,         // Filtres avis
          /^\(\d+\)$/m,                                    // Compteurs entre parenthèses
          /^(?:Color|Couleur|Taille|Size)\s*:/im,          // Sélecteurs variantes
          /^\d+[.,]\d+\s*(?:\/\s*5)?$/m,                  // Notes isolées
          /^(?:Est-ce utile|Is this helpful)\b/im,         // Utilité avis
          /^(?:Ce vendeur|This seller)\b/im,               // Info vendeur
          /^(?:Fin\s*:|Ends?)\s/im,                        // Dates d'expiration promo
          /^(?:Ventes? totales?|Total sales)\b/im,         // Stats vendeur
          /^Venant tous d/im,                              // "Venant tous d'achats vérifiés"
          /\bPayPal\b.*sans frais/im,                      // Paiement
          /^-?\d+[.,]\d+\s*[€$£]\s*(sur|on)\s/im,        // Réductions
          /^-\d+%\s*suppl/im,                              // Réductions supplémentaires
          /^\w[*]+\w\s*\|/m,                               // Noms masqués d'avis (c***r |)
          /^\d{2}\s+(?:janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc)/im, // Dates d'avis
          /^\d{2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/im
        ];

        const cleanedLines = rawText.split('\n')
          .map(l => l.trim())
          .filter(l => {
            if (l.length < 3) return false;
            for (const pattern of noisePatterns) {
              if (pattern.test(l)) return false;
            }
            return true;
          });

        presentationText = cleanedLines.join('\n')
          .replace(/\n{3,}/g, '\n\n')
          .replace(/\t/g, ' ')
          .slice(0, 5000)
          .trim();
      }
      
      // Fallback: chercher "Caractéristiques" ou "Spécifications" directement
      if (!presentationText || presentationText.length < 50) {
        const caracSection = findSectionByHeading(['caractéristiques', 'caractéristiques :', 'features']);
        if (caracSection) {
          presentationText = caracSection.innerText?.trim().slice(0, 5000) || '';
        }
      }

      console.log('[IT Vision] Présentation:', presentationText.length, 'chars');
      console.log('[IT Vision] Images description:', descriptionImages.length);
    } catch (e) {
      console.warn('[IT Vision] Erreur extraction Présentation:', e);
    }

    // ===== POIDS & DIMENSIONS (depuis Présentation + Détails + page entière) =====
    let weightKg = 0;
    let lengthCm = 0, widthCm = 0, heightCm = 0;
    try {
      // Texte combiné à chercher (Présentation d'abord, puis page entière)
      const searchTexts = [presentationText, document.body.innerText].filter(t => t.length > 0);
      
      for (const searchText of searchTexts) {
        if (weightKg > 0 && lengthCm > 0) break; // Déjà trouvé

        // === POIDS ===
        if (weightKg === 0) {
          const weightPatterns = [
            /(?:poids\s*(?:du\s*)?(?:colis|paquet|emballage|package|brut|net|produit|article))\s*[:\s：]+\s*(\d+(?:[.,]\d+)?)\s*(kg|g|lb|oz)/i,
            /(?:package\s*weight|gross\s*weight|net\s*weight|item\s*weight|product\s*weight)\s*[:\s：]+\s*(\d+(?:[.,]\d+)?)\s*(kg|g|lb|oz)/i,
            /(?:weight|poids)\s*[:\s：]+\s*(\d+(?:[.,]\d+)?)\s*(kg|g|lb|oz)/i,
            /(\d+(?:[.,]\d+)?)\s*(kg|g)\b/i,
          ];
          for (const pattern of weightPatterns) {
            const m = searchText.match(pattern);
            if (m) {
              const val = parseFloat(m[1].replace(',', '.'));
              const unit = m[2].toLowerCase();
              if (unit === 'kg' && val > 0 && val < 500) weightKg = val;
              else if (unit === 'g' && val > 0) weightKg = val / 1000;
              else if (unit === 'lb') weightKg = val * 0.4536;
              else if (unit === 'oz') weightKg = val * 0.02835;
              if (weightKg > 0) {
                console.log('[IT Vision] Poids trouvé:', weightKg, 'kg');
                break;
              }
            }
          }
        }

        // === DIMENSIONS ===
        if (lengthCm === 0) {
          const dimPatterns = [
            /(?:taille|dimensions?|size|package\s*size)\s*[:\s：]+\s*(?:environ\s*)?(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|inch|in|m\b)/i,
            /(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|inch|in)\b/i,
          ];
          for (const pattern of dimPatterns) {
            const m = searchText.match(pattern);
            if (m) {
              let l = parseFloat(m[1].replace(',', '.'));
              let w = parseFloat(m[2].replace(',', '.'));
              let h = parseFloat(m[3].replace(',', '.'));
              const unit = m[4].toLowerCase();
              if (unit === 'mm') { l /= 10; w /= 10; h /= 10; }
              else if (unit === 'inch' || unit === 'in') { l *= 2.54; w *= 2.54; h *= 2.54; }
              else if (unit === 'm' && l < 10) { l *= 100; w *= 100; h *= 100; }
              if (l > 0 && w > 0 && h > 0 && l < 500 && w < 500 && h < 500) {
                lengthCm = Math.round(l * 10) / 10;
                widthCm = Math.round(w * 10) / 10;
                heightCm = Math.round(h * 10) / 10;
                console.log('[IT Vision] Dimensions trouvées:', lengthCm, 'x', widthCm, 'x', heightCm, 'cm');
                break;
              }
            }
          }
        }
      }

      // Chercher aussi dans les specs du tableau Détails
      if (weightKg === 0 || lengthCm === 0) {
        for (const [key, value] of Object.entries(specs)) {
          const k = key.toLowerCase();
          if (weightKg === 0 && (k.includes('weight') || k.includes('poids'))) {
            const wm = String(value).match(/(\d+(?:[.,]\d+)?)\s*(kg|g|lb)/i);
            if (wm) {
              const val = parseFloat(wm[1].replace(',', '.'));
              if (wm[2].toLowerCase() === 'kg') weightKg = val;
              else if (wm[2].toLowerCase() === 'g') weightKg = val / 1000;
              else if (wm[2].toLowerCase() === 'lb') weightKg = val * 0.4536;
            }
          }
          if (lengthCm === 0 && (k.includes('size') || k.includes('dimension') || k.includes('taille'))) {
            const dm = String(value).match(/(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/);
            if (dm) {
              lengthCm = parseFloat(dm[1].replace(',', '.'));
              widthCm = parseFloat(dm[2].replace(',', '.'));
              heightCm = parseFloat(dm[3].replace(',', '.'));
            }
          }
        }
      }

      console.log('[IT Vision] Final — Poids:', weightKg, 'kg | Dim:', lengthCm, 'x', widthCm, 'x', heightCm, 'cm');
    } catch (e) {
      console.warn('[IT Vision] Erreur extraction poids/dimensions:', e);
    }

    // ===== DESCRIPTION NETTOYÉE ET STRUCTURÉE =====
    try {
      const descParts = [];

      // Partie 1: Titre produit formaté
      if (data.name) {
        descParts.push(`# ${data.name}`);
      }

      // Partie 2: Tableau Détails (specs filtrées)
      const usefulSpecs = Object.entries(specs)
        .filter(([k, v]) => isUsefulSpecKey(k) && isUsefulSpecValue(v));

      if (usefulSpecs.length > 0) {
        descParts.push('\n## Caractéristiques techniques');
        for (const [k, v] of usefulSpecs.slice(0, 20)) {
          descParts.push(`- **${k}**: ${v}`);
        }
      }

      // Partie 3: Présentation (déjà nettoyée des avis/prix/bruit)
      if (presentationText && presentationText.length > 30) {
        let cleanText = presentationText
          .replace(/\n{3,}/g, '\n\n')
          .replace(/\t/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();

        // Découper en paragraphes et filtrer les très courts
        const paragraphs = cleanText.split('\n\n')
          .filter(p => p.trim().length > 15)
          .slice(0, 5);

        if (paragraphs.length > 0) {
          descParts.push('\n## Description');
          paragraphs.forEach(p => descParts.push(p.trim()));
        }
      }

      // Partie 4: Infos boutique et notes
      const metaParts = [
        data.shopName && `Boutique: ${data.shopName}`,
        data.rating && `Note: ${data.rating}/5`,
        data.orders && `${data.orders} commandes`
      ].filter(Boolean);

      if (metaParts.length > 0) {
        descParts.push('\n## Informations');
        metaParts.forEach(p => descParts.push(`- ${p}`));
      }

      // Assembler la description finale
      if (descParts.length > 0) {
        let finalDesc = descParts.join('\n\n');
        if (finalDesc.length > 4500) {
          finalDesc = finalDesc.slice(0, 4500) + '...';
        }
        data.description = finalDesc.trim();
      }

      // Fallback: JSON-LD description
      if (!data.description && jsonLdProduct?.description) {
        data.description = jsonLdProduct.description.trim().slice(0, 2000);
      }

      // Fallback: meta description
      if (!data.description) {
        const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content')
          || document.querySelector('meta[property="og:description"]')?.getAttribute('content');
        if (metaDesc && metaDesc.length > 20) {
          data.description = metaDesc.trim();
        }
      }

      console.log('[IT Vision] Description finale:', data.description?.length || 0, 'chars');
    } catch (e) {
      console.warn('[IT Vision] Erreur description:', e);
    }

    // ===== VARIANTES (groupées par type: Couleur, Taille, etc.) =====
    try {
      data.variantGroups = [];

      // Normaliser les noms de groupes vers le français
      const normalizeGroupName = (raw) => {
        const s = raw.trim().replace(/[:\s：]+$/, '').replace(/\s*:\s*.*$/, '').trim();
        const lower = s.toLowerCase();
        // Couleur
        if (/^colou?r|^couleur|^farbe/i.test(lower)) return 'Couleur';
        if (lower === 'color' || lower === 'colour' || lower === 'colors') return 'Couleur';
        // Taille
        if (/^size|^taille|^größe/i.test(lower)) return 'Taille';
        if (lower === 'shoe size' || lower === 'shoe us size' || lower === 'us size' || lower === 'eu size') return 'Taille';
        // Autres connus
        if (/^capacit/i.test(lower)) return 'Capacité';
        if (/^style/i.test(lower)) return 'Style';
        if (/^mod[eè]le|^model/i.test(lower)) return 'Modèle';
        if (/^type/i.test(lower)) return 'Type';
        if (/^quantit/i.test(lower)) return 'Quantité';
        if (/^mat[eéi]/i.test(lower)) return 'Matière';
        if (/^plug|^prise/i.test(lower)) return 'Prise';
        if (/^puissance|^watt|^power/i.test(lower)) return 'Puissance';
        if (/^longueur|^length/i.test(lower)) return 'Longueur';
        if (s.length >= 2 && s.length <= 25) return s;
        return '';
      };

      // Vérifier qu'un nom de variante est valide (pas du bruit)
      const isValidVariantName = (name, groupName) => {
        if (!name || name.length < 1 || name.length > 80) return false;
        // Exclure le label du groupe lui-même
        if (name === groupName || name.toLowerCase() === groupName.toLowerCase()) return false;
        // Exclure les textes qui ressemblent à du bruit UI
        if (/^(acheter|buy|ajouter|add|partager|share|signaler|report|voir|see|ok|non|oui)/i.test(name)) return false;
        if (/[:\s：]{2,}/.test(name)) return false;
        // Exclure les prix isolés
        if (/^[€$£¥￥]\s*\d/.test(name) || /^\d+[.,]\d+\s*[€$£¥￥]$/.test(name)) return false;
        // Exclure les compteurs / pourcentages
        if (/^\d+\s*(%|avis|reviews?|commandes?|sold|vendu)$/i.test(name)) return false;
        // Exclure les textes trop longs qui contiennent des retours à la ligne
        if (name.includes('\n') || name.includes('\r')) return false;
        return true;
      };

      const processedLabels = new Set();

      // ── Méthode 1: Conteneurs de propriétés SKU structurés ──
      // AliExpress utilise des conteneurs avec des classes spécifiques pour chaque groupe de variantes
      const skuContainers = document.querySelectorAll(
        '[class*="sku-property" i], [class*="skuProperty" i], [class*="sku--property" i], ' +
        '[class*="product-sku" i], [class*="productSku" i], ' +
        '[class*="sku-item-property" i], [data-sku-col], ' +
        '[class*="property-item" i]:not([class*="property-item-value" i])'
      );

      // Si les sélecteurs spécifiques ne trouvent rien, fallback sur les sélecteurs plus larges
      const containers = skuContainers.length > 0 ? skuContainers
        : document.querySelectorAll('[class*="sku" i][class*="prop" i], [class*="variant" i][class*="group" i]');

      containers.forEach(container => {
        // Trouver le label du groupe
        const labelEl = container.querySelector(
          '[class*="title" i], [class*="label" i], [class*="name" i]:not(img), ' +
          '[class*="header" i], dt, h4, h5'
        );
        if (!labelEl) return;

        const rawLabel = labelEl.textContent?.trim() || '';
        const groupName = normalizeGroupName(rawLabel);
        if (!groupName || processedLabels.has(groupName)) return;

        const variants = [];
        const seenNames = new Set();

        // 1) Images avec alt (typique pour les couleurs)
        container.querySelectorAll('img[alt], img[title]').forEach(img => {
          let src = img.getAttribute('src') || img.getAttribute('data-src') || '';
          if (src.startsWith('//')) src = 'https:' + src;
          // Ignorer les icônes minuscules et placeholders
          if (src.includes('placeholder') || src.includes('data:image')) return;
          const name = (img.getAttribute('alt') || img.getAttribute('title') || '').trim();
          const cleanName = name.replace(/\s*#\d+$/, '').trim();
          if (!cleanName || seenNames.has(cleanName.toLowerCase())) return;
          if (!isValidVariantName(cleanName, groupName)) return;

          seenNames.add(cleanName.toLowerCase());
          const hdSrc = src.replace(/_\d+x\d+[^.]*/, '');
          variants.push({
            id: `v-${variants.length}`,
            name: cleanName,
            image: hdSrc || undefined,
            isDefault: variants.length === 0
          });
        });

        // 2) Options textuelles (boutons, spans cliquables) — seulement ceux directement dans le conteneur d'items
        const itemEls = container.querySelectorAll(
          '[class*="item" i] > span, [class*="item" i] > div, ' +
          '[class*="option" i], [class*="value" i], ' +
          'button > span, [role="button"] > span, [role="radio"]'
        );
        itemEls.forEach(item => {
          // Prendre seulement le texte direct, pas les enfants profonds
          let name = '';
          if (item.childNodes.length <= 3) {
            name = item.textContent?.trim() || '';
          } else {
            // Si beaucoup d'enfants, c'est probablement un conteneur, prendre le premier noeud texte
            for (const child of item.childNodes) {
              if (child.nodeType === 3 && child.textContent?.trim()) {
                name = child.textContent.trim();
                break;
              }
            }
          }

          if (!name || seenNames.has(name.toLowerCase())) return;
          if (!isValidVariantName(name, groupName)) return;
          // Ignorer si c'est un sous-texte du label
          if (rawLabel.includes(name)) return;

          seenNames.add(name.toLowerCase());
          const img = item.closest('[class*="item" i], [class*="option" i]')?.querySelector('img');
          let imgUrl = img?.getAttribute('src') || img?.getAttribute('data-src') || undefined;
          if (imgUrl?.startsWith('//')) imgUrl = 'https:' + imgUrl;
          if (imgUrl) imgUrl = imgUrl.replace(/_\d+x\d+[^.]*/, '');

          variants.push({
            id: `v-${variants.length}`,
            name,
            image: imgUrl,
            isDefault: variants.length === 0
          });
        });

        if (variants.length >= 1) {
          processedLabels.add(groupName);
          data.variantGroups.push({ name: groupName, variants });
          console.log('[IT Vision] Variante groupe:', groupName, '→', variants.length, 'options');
        }
      });

      // ── Méthode 2: Fallback — JSON embarqué dans la page (AliExpress stocke souvent les SKU en JSON) ──
      if (data.variantGroups.length === 0) {
        const scripts = document.querySelectorAll('script:not([src])');
        for (const script of scripts) {
          const text = script.textContent || '';
          // Chercher des patterns JSON de propriétés SKU
          const skuMatch = text.match(/"skuPropertyList"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
          if (skuMatch) {
            try {
              const skuList = JSON.parse(skuMatch[1]);
              for (const group of skuList) {
                const groupName = normalizeGroupName(group.skuPropertyName || group.name || '');
                if (!groupName || processedLabels.has(groupName)) continue;
                const values = group.skuPropertyValues || group.values || [];
                if (!Array.isArray(values) || values.length === 0) continue;
                const variants = values.map((v, idx) => ({
                  id: `v-${idx}`,
                  name: (v.propertyValueDisplayName || v.name || v.propertyValueName || '').trim(),
                  image: v.skuPropertyImagePath || v.image || undefined,
                  isDefault: idx === 0
                })).filter(v => v.name && isValidVariantName(v.name, groupName));
                if (variants.length >= 1) {
                  processedLabels.add(groupName);
                  data.variantGroups.push({ name: groupName, variants });
                  console.log('[IT Vision] Variante JSON:', groupName, '→', variants.length);
                }
              }
            } catch (e) { /* JSON parse error, skip */ }
            if (data.variantGroups.length > 0) break;
          }
        }
      }

      console.log('[IT Vision] Total groupes de variantes:', data.variantGroups.length,
        data.variantGroups.map(g => `${g.name}(${g.variants.length})`).join(', '));
    } catch (e) {
      console.warn('[IT Vision] Erreur extraction variantes:', e);
    }

    // descriptionImages sont maintenant un champ séparé, ne plus enrichir la galerie
    // La galerie ne contient que les images produit du carousel principal
    console.log('[IT Vision] Galerie:', data.gallery.length, 'images | Description:', descriptionImages.length, 'images');

    // Features (résumé compact)
    data.features = [
      data.rating && `Note: ${data.rating}/5`,
      data.orders && `${data.orders} commandes`,
      data.shopName && `Boutique: ${data.shopName}`,
      data.gallery.length > 0 && `${data.gallery.length} images`,
      weightKg > 0 && `Poids: ${weightKg} kg`,
      (lengthCm > 0) && `Dimensions: ${lengthCm}×${widthCm}×${heightCm} cm`,
      Object.keys(specs).length > 0 && `${Object.keys(specs).length} spécifications`,
      data.variantGroups?.length > 0 && `${data.variantGroups.length} types de variantes`
    ].filter(Boolean);

    // Images de description séparées (grandes images de présentation)
    data.descriptionImages = descriptionImages.slice(0, 30);

    // Données logistiques
    data.specifications = specs;
    data.weightKg = weightKg > 0 ? weightKg : undefined;
    data.lengthCm = lengthCm > 0 ? lengthCm : undefined;
    data.widthCm = widthCm > 0 ? widthCm : undefined;
    data.heightCm = heightCm > 0 ? heightCm : undefined;

    // Valeurs par défaut
    data.category = 'Catalogue import Chine';
    data.tagline = 'Import AliExpress';
    data.availabilityNote = 'Import AliExpress - freight 3j/15j/60j';
    data.currency = 'FCFA';

    console.log('[IT Vision] AliExpress extrait:', data);
    return data;
  };

  // ==========================================
  // UI FLOATING BUTTON
  // ==========================================
  
  const createFloatingButton = () => {
    const btn = document.createElement('div');
    btn.id = 'itvision-scraper-btn';
    btn.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
        background: linear-gradient(135deg, #22c55e, #8b5cf6);
        color: white;
        padding: 12px 20px;
        border-radius: 50px;
        cursor: pointer;
        font-family: system-ui, sans-serif;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3v18M3 12h18"/>
        </svg>
        Importer IT Vision
      </div>
    `;
    
    btn.onclick = async () => {
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => btn.style.transform = 'scale(1)', 150);
      
      const is1688 = window.location.hostname.includes('1688.com');
      const data = is1688 ? await scrape1688() : await scrapeAliExpress();
      
      // Envoyer au background script
      chrome.runtime.sendMessage({
        action: 'PRODUCT_EXTRACTED',
        data: data
      });
      
      // Feedback visuel
      showNotification(`${data.name.substring(0, 30)}... extrait!`);
    };
    
    document.body.appendChild(btn);
  };

  const showNotification = (message) => {
    const notif = document.createElement('div');
    notif.innerHTML = `
      <div style="
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 999999;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
      ">
        ✅ ${message}
      </div>
    `;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  };

  // ==========================================
  // LISTENERS
  // ==========================================
  
  // Écouter messages du popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_PRODUCT') {
      const is1688 = window.location.hostname.includes('1688.com');
      
      (is1688 ? scrape1688() : scrapeAliExpress())
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      
      return true; // Async response
    }
  });

  // Injecter bouton flottant après chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingButton);
  } else {
    createFloatingButton();
  }

})();
