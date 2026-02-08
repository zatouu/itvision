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

    // Variantes (plus de sélecteurs)
    try {
      const variants = [];
      const variantSelectors = '.sku-item, .offer-sku, .prop-item, [class*="sku"] li, [class*="Sku"] li, [class*="variant"] li';
      document.querySelectorAll(variantSelectors).forEach((item, idx) => {
        const name = item.textContent?.trim();
        const img = item.querySelector('img')?.getAttribute('src') || item.querySelector('img')?.getAttribute('data-src');
        if (name && name.length > 0 && name.length < 80) {
          variants.push({ id: `sku-${idx}`, name, image: img || undefined, isDefault: idx === 0 });
        }
      });
      if (variants.length > 0) {
        data.variantGroups = [{ name: 'Modèle', variants }];
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

    // ===== IMAGES (approche multi-source) =====
    const imageSet = new Set();
    
    // Source 1: JSON-LD images
    if (jsonLdProduct?.image) {
      const imgs = Array.isArray(jsonLdProduct.image) ? jsonLdProduct.image : [jsonLdProduct.image];
      imgs.forEach(img => { if (typeof img === 'string' && img.startsWith('http')) imageSet.add(img); });
    }

    // Source 2: og:image
    const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
    if (ogImg && ogImg.startsWith('http')) imageSet.add(ogImg);

    // Source 3: Scanner TOUTES les <img> avec URLs CDN AliExpress
    document.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
      if (!src) return;
      // Images CDN AliExpress (ae01, ae04, etc.)
      if (/ae\d+\.alicdn\.com/i.test(src) || /img\.aliexpress/i.test(src) || /cbu\d*\.alicdn\.com/i.test(src)) {
        // Vérifier que c'est une image produit (pas icône/logo)
        const w = img.naturalWidth || parseInt(img.getAttribute('width') || '0');
        const h = img.naturalHeight || parseInt(img.getAttribute('height') || '0');
        // Accepter si dimensions inconnues ou si > 100px
        if ((!w && !h) || w > 100 || h > 100) {
          // Enlever suffixes de resize pour HD
          let clean = src.replace(/_\d+x\d+[^.]*/, '').replace(/\.\d+x\d+\./, '.');
          if (clean.startsWith('//')) clean = 'https:' + clean;
          imageSet.add(clean);
        }
      }
    });

    // Source 4: background-image dans les div de gallery
    document.querySelectorAll('[style*="background-image"]').forEach(el => {
      const bg = el.style.backgroundImage;
      const m = bg.match(/url\(["']?([^"')]+)/);
      if (m && /ae\d+\.alicdn|aliexpress/i.test(m[1])) {
        let src = m[1].replace(/_\d+x\d+[^.]*/, '');
        if (src.startsWith('//')) src = 'https:' + src;
        imageSet.add(src);
      }
    });

    data.gallery = Array.from(imageSet).slice(0, 15);
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
            if (key && value && key.length < 60 && value.length < 200) {
              specs[key] = value;
            }
          }
        });
        // Aussi chercher des paires dans des div adjacents (AliExpress utilise parfois des div au lieu de table)
        if (Object.keys(specs).length === 0) {
          const allText = detailsSection.innerText || '';
          const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 3);
          for (const line of lines) {
            const kvMatch = line.match(/^([^:：]+?)\s*[:\s：]\s*(.+)$/);
            if (kvMatch && kvMatch[1].length < 60 && kvMatch[2].length < 200) {
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
    try {
      const presSection = findSectionByHeading(['présentation', 'presentation', 'overview', 'description']);
      if (presSection) {
        console.log('[IT Vision] Section Présentation trouvée');
        presentationText = presSection.innerText?.trim() || '';
        // Nettoyer
        presentationText = presentationText
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

      // Partie 1: Tableau Détails (formaté proprement)
      if (Object.keys(specs).length > 0) {
        descParts.push('**Détails du produit**');
        // Filtrer les specs utiles (exclure les vides ou redondants)
        const usefulSpecs = Object.entries(specs).filter(([k, v]) => {
          const key = k.toLowerCase();
          const val = v.toLowerCase();
          return v && v.length > 0 && v.length < 200 
            && !key.includes('sku') && !key.includes('model')
            && !val.includes('n/a') && !val.includes('non spécifié');
        });
        
        for (const [k, v] of usefulSpecs.slice(0, 20)) { // Max 20 specs
          descParts.push(`- **${k}**: ${v}`);
        }
      }

      // Partie 2: Présentation (nettoyée)
      if (presentationText && presentationText.length > 20) {
        // Nettoyer le texte de présentation
        let cleanText = presentationText
          .replace(/\n{3,}/g, '\n\n') // Réduire les sauts de ligne multiples
          .replace(/\t/g, ' ') // Remplacer les tabs par espaces
          .replace(/\s{2,}/g, ' ') // Réduire les espaces multiples
          .replace(/([.!?])\s*\n\s*/g, '$1\n\n') // Saut de ligne après les phrases
          .trim();

        // Découper en paragraphes logiques
        const paragraphs = cleanText.split('\n\n').filter(p => p.length > 10);
        
        if (paragraphs.length > 0) {
          descParts.push('\n**Présentation**');
          // Limiter à 3 paragraphes les plus pertinents
          paragraphs.slice(0, 3).forEach(p => {
            descParts.push(p.trim());
          });
        }
      }

      // Assembler la description finale
      if (descParts.length > 0) {
        let finalDesc = descParts.join('\n\n');
        // Limiter la longueur totale
        if (finalDesc.length > 3500) {
          finalDesc = finalDesc.slice(0, 3500) + '...';
        }
        data.description = finalDesc.trim();
      }

      // Fallback: JSON-LD description (plus court)
      if (!data.description && jsonLdProduct?.description) {
        data.description = jsonLdProduct.description.trim().slice(0, 2000);
      }

      // Fallback: meta description (très court)
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
      
      // AliExpress structure: un label "Couleur:" suivi d'options cliquables
      // Chercher tous les groupes de sélection de variantes
      const processedLabels = new Set();
      
      // Méthode 1: Chercher les labels de variantes et leurs options adjacentes
      document.querySelectorAll('[class*="sku" i], [class*="Sku" i], [class*="variant" i], [class*="property" i], [class*="Property" i]').forEach(container => {
        // Chercher le label du groupe (ex: "Couleur:", "Taille:", "Capacité:")
        const labelEl = container.querySelector('[class*="title" i], [class*="label" i], [class*="name" i], span, strong, b');
        let groupName = labelEl?.textContent?.trim()?.replace(/[:\s：]+$/, '')?.trim() || '';
        
        // Nettoyer le nom (enlever la valeur sélectionnée si présente)
        groupName = groupName.replace(/\s*:\s*.*$/, '').trim();
        
        if (!groupName || groupName.length > 30 || groupName.length < 2 || processedLabels.has(groupName)) return;
        processedLabels.add(groupName);
        
        const variants = [];
        
        // Chercher les options (images ou textes)
        container.querySelectorAll('img').forEach(img => {
          let src = img.getAttribute('src') || img.getAttribute('data-src') || '';
          if (src.startsWith('//')) src = 'https:' + src;
          const name = img.getAttribute('alt') || img.getAttribute('title') || '';
          if (name && name.length < 80 && !variants.find(v => v.name === name)) {
            // Image HD (enlever suffixes resize)
            const hdSrc = src.replace(/_\d+x\d+[^.]*/, '');
            variants.push({ id: `v-${variants.length}`, name: name.trim(), image: hdSrc || undefined, isDefault: variants.length === 0 });
          }
        });
        
        // Options textuelles (sans image)
        container.querySelectorAll('[class*="item" i], [class*="option" i], button, span[role="button"], [class*="chip" i]').forEach(item => {
          const name = item.textContent?.trim();
          // Exclure le label lui-même et les textes trop courts/longs
          if (name && name.length > 0 && name.length < 50 
              && name !== groupName && !name.includes(':')
              && !variants.find(v => v.name === name)) {
            const img = item.querySelector('img');
            let imgUrl = img?.getAttribute('src') || img?.getAttribute('data-src') || undefined;
            if (imgUrl?.startsWith('//')) imgUrl = 'https:' + imgUrl;
            variants.push({ id: `v-${variants.length}`, name: name.trim(), image: imgUrl, isDefault: variants.length === 0 });
          }
        });
        
        if (variants.length > 1) {
          data.variantGroups.push({ name: groupName, variants });
          console.log('[IT Vision] Variante groupe:', groupName, '→', variants.length, 'options');
        }
      });

      // Méthode 2: Fallback — chercher le texte "Couleur: XXX" dans le header produit
      if (data.variantGroups.length === 0) {
        const allText = document.body.innerText.slice(0, 3000);
        const variantLabels = allText.match(/(?:Couleur|Color|Taille|Size|Capacit[eé]|Capacity|Style|Mod[eè]le|Model)\s*[:\s：]+\s*([^\n]+)/gi);
        if (variantLabels) {
          for (const match of variantLabels) {
            const parts = match.split(/[:\s：]+/);
            if (parts.length >= 2) {
              const groupName = parts[0].trim();
              const value = parts.slice(1).join(' ').trim();
              if (groupName && value && !processedLabels.has(groupName)) {
                processedLabels.add(groupName);
                data.variantGroups.push({
                  name: groupName,
                  variants: [{ id: 'v-0', name: value, isDefault: true }]
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[IT Vision] Erreur extraction variantes:', e);
    }

    // Features
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
