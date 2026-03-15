/**
 * Content Script - Extraction données produit depuis 1688 et AliExpress
 * v2.0 — Images classées, vidéos, description structurée, variantes enrichies
 */

(function() {
  'use strict';

  if (window.itVisionScraperInjected) return;
  window.itVisionScraperInjected = true;

  console.log('[IT Vision v2] Scraper actif sur', window.location.hostname);

  // ==========================================
  // UTILITAIRES PARTAGÉS
  // ==========================================

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  const trySelectors = (selectors) => {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) return el.textContent.trim();
    }
    return null;
  };

  /** Scroll progressif pour déclencher le lazy-load */
  const deepScroll = async (maxY = 6000, step = 400, delay = 250) => {
    for (let y = 0; y <= maxY; y += step) {
      window.scrollTo(0, y);
      await wait(delay);
    }
    window.scrollTo(0, 0);
    await wait(300);
  };

  /** Nettoyer une URL d'image : enlever suffixes thumbnail, ajouter https */
  const cleanImageUrl = (src) => {
    if (!src) return '';
    let clean = src
      .replace(/_\d+x\d+[^.]*/, '')       // Thumbnails AliExpress/1688
      .replace(/\.\d+x\d+\./, '.')         // Autre format
      .replace(/\.summ\..*$/, '')           // Résumé 1688
      .replace(/_Q\d+\.jpg/, '.jpg')       // Qualité faible
      .replace(/\.search\..*$/, '');        // Version recherche
    if (clean.startsWith('//')) clean = 'https:' + clean;
    return clean;
  };

  /** Filtrer les images de bruit (logos, icônes, paiement, etc.) */
  const isNoiseImage = (url) => {
    if (!url) return true;
    const lower = url.toLowerCase();
    if (lower.startsWith('data:')) return true;
    if (/1x1|pixel|tracker|beacon/i.test(lower)) return true;
    if (lower.endsWith('.svg')) return true;
    // Domaines paiement / pub
    if (/paypal\.com|klarna\.com|afterpay\.com|stripe\.com|alipay|clearpay|laybuy|zip\.co|sezzle/i.test(lower)) return true;
    // Mots-clés paiement/logo/badge dans le chemin ou nom de fichier (même sur CDN aliexpress)
    const filename = lower.split('/').pop()?.split('?')[0] || '';
    if (/^(paypal|klarna|visa|mastercard|amex|unionpay|discover|icon|logo|badge|banner|afterpay|clearpay|payment|checkout|trust|secure|guarantee)[_\-.]/.test(filename)) return true;
    if (/(klarna|afterpay|clearpay|paypal|payment[_\-]method|payment[_\-]icon|trust[_\-]badge|secure[_\-]checkout|buyer[_\-]protection)/i.test(lower)) return true;
    // Chemins UI / icônes
    if (/\/icon[s]?\//i.test(lower) || /\/ui\//i.test(lower) || /\/assets\/payment/i.test(lower)) return true;
    // Logos de marque dans les descriptions (souvent petits)
    if (/(brand[_\-]?logo|shop[_\-]?logo|store[_\-]?logo|seller[_\-]?logo|watermark)/i.test(lower)) return true;
    // GIF animés = souvent promos
    if (lower.endsWith('.gif')) return true;
    return false;
  };

  /** Filtrer une image par ses attributs DOM (alt, class, taille) */
  const isNoiseImageElement = (img) => {
    if (!img) return true;
    const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
    if (isNoiseImage(src)) return true;
    // Alt text contenant des mots de paiement/logo
    const alt = (img.getAttribute('alt') || '').toLowerCase();
    if (/(klarna|afterpay|paypal|visa|mastercard|payment|logo|badge|icon|trust|secure|guarantee|buyer.?protection)/i.test(alt)) return true;
    // Class contenant des indicateurs
    const cls = (img.className || '').toLowerCase();
    if (/(payment|logo|badge|icon|trust|secure)/i.test(cls)) return true;
    // Trop petite (< 80px) = probablement icône
    const w = img.naturalWidth || parseInt(img.getAttribute('width') || '0');
    const h = img.naturalHeight || parseInt(img.getAttribute('height') || '0');
    if ((w > 0 && w < 80) || (h > 0 && h < 80)) return true;
    return false;
  };

  /** Extraire toutes les vidéos d'une zone DOM */
  const extractVideos = (root) => {
    const videos = new Set();
    if (!root) root = document;

    // <video> tags
    root.querySelectorAll('video').forEach(v => {
      const src = v.getAttribute('src') || v.querySelector('source')?.getAttribute('src');
      if (src && src.startsWith('http')) videos.add(src);
      // poster = image de preview vidéo
      const poster = v.getAttribute('poster');
      if (poster) videos.add('poster:' + poster);
    });

    // data-video-url (fréquent sur 1688 et AliExpress)
    root.querySelectorAll('[data-video-url], [data-video-src], [data-video]').forEach(el => {
      const url = el.getAttribute('data-video-url') || el.getAttribute('data-video-src') || el.getAttribute('data-video');
      if (url && url.startsWith('http')) videos.add(url);
    });

    // Scripts JSON contenant des URLs vidéo
    root.querySelectorAll('script:not([src])').forEach(s => {
      const txt = s.textContent || '';
      // Pattern: "videoUrl":"https://..."
      const matches = txt.matchAll(/"(?:video[Uu]rl|videoSrc|videoPath|video_url)"\s*:\s*"(https?:\/\/[^"]+)"/g);
      for (const m of matches) {
        if (m[1] && !m[1].includes('thumbnail')) videos.add(m[1]);
      }
    });

    // Éléments avec background vidéo ou liens .mp4
    root.querySelectorAll('a[href$=".mp4"], a[href*="video"]').forEach(a => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('http')) videos.add(href);
    });

    return Array.from(videos).filter(v => !v.startsWith('poster:'));
  };

  /** Extraire posters de vidéos */
  const extractVideoPosters = (root) => {
    const posters = [];
    if (!root) root = document;
    root.querySelectorAll('video[poster]').forEach(v => {
      const p = v.getAttribute('poster');
      if (p && p.startsWith('http')) posters.push(cleanImageUrl(p));
    });
    return posters;
  };

  /** Déduplication d'images par nom de fichier */
  const deduplicateImages = (urls) => {
    const seen = new Set();
    return urls.filter(url => {
      if (isNoiseImage(url)) return false;
      const fname = url.split('/').pop()?.split('?')[0]?.replace(/_\d+x\d+/, '') || url;
      if (seen.has(fname)) return false;
      seen.add(fname);
      return true;
    });
  };

  /** Extraire texte propre d'un élément DOM, sans HTML */
  const cleanTextFromElement = (el) => {
    if (!el) return '';
    const clone = el.cloneNode(true);
    // Supprimer les scripts et styles
    clone.querySelectorAll('script, style, noscript, iframe').forEach(n => n.remove());
    return (clone.innerText || clone.textContent || '').trim();
  };

  /** Structurer une description en sections markdown propres */
  const buildStructuredDescription = ({ title, specs, presentationText }) => {
    const parts = [];

    if (title) parts.push(`# ${title}`);

    const specEntries = Object.entries(specs || {}).filter(([k, v]) =>
      k && v && k.length >= 2 && k.length <= 60 && v.length <= 200 &&
      !/^\d+([.,]\d+)?$/.test(k.trim()) &&
      !['n/a', 'non spécifié', 'none'].includes(v.toLowerCase())
    );

    if (specEntries.length > 0) {
      parts.push('\n## Caractéristiques techniques');
      specEntries.slice(0, 25).forEach(([k, v]) => parts.push(`- **${k}**: ${v}`));
    }

    if (presentationText && presentationText.length > 30) {
      const paragraphs = presentationText
        .replace(/\n{3,}/g, '\n\n').replace(/\t/g, ' ')
        .split('\n\n')
        .map(p => p.trim())
        .filter(p => p.length > 15)
        .slice(0, 8);
      if (paragraphs.length > 0) {
        parts.push('\n## Description');
        paragraphs.forEach(p => parts.push(p));
      }
    }

    let desc = parts.join('\n\n');
    if (desc.length > 5000) desc = desc.slice(0, 5000) + '...';
    return desc.trim();
  };

  // ==========================================
  // EXTRACTEUR 1688 (v2)
  // ==========================================

  const scrape1688 = async () => {
    console.log('[IT Vision] Extraction 1688 v2...');
    
    const data = {
      platform: '1688',
      url: window.location.href.split('?')[0],
      timestamp: new Date().toISOString(),
      gallery: [],
      descriptionImages: [],
      videos: [],
      variantGroups: [],
      features: [],
      specifications: {}
    };

    try {
      await wait(2000);

      // Scroll profond (1688 charge description et images en lazy-load très loin)
      await deepScroll(8000, 400, 300);

      // Cliquer sur onglets "详情" (détails) / "商品描述" pour charger la description
      try {
        document.querySelectorAll('[role="tab"], [class*="tab" i] li, [class*="Tab" i] a, [class*="tab-item" i], [class*="detail" i] [class*="tab" i]').forEach(tab => {
          const t = (tab.textContent || '').trim();
          if (t.includes('详情') || t.includes('描述') || t.includes('详细') || t.includes('detail')) {
            tab.click();
            console.log('[IT Vision] Onglet 1688 cliqué:', t);
          }
        });
        await wait(2000);
        // Re-scroll après clic onglet
        await deepScroll(6000, 500, 200);
      } catch (e) { console.warn('[IT Vision] Onglets 1688:', e); }
    } catch (e) { console.warn('[IT Vision] Scroll 1688:', e); }

    // ── TITRE ──
    try {
      data.name = trySelectors([
        '.offer-title', '.detail-title', 'h1[data-spm="title"]',
        'h1.title', '.title-text', '.mod-detail-title h1',
        '[class*="offerTitle"]', '[class*="DetailTitle"]',
        '[class*="title-text" i]', '[class*="offer-title" i]', 'h1'
      ]) || document.title.replace(/[-|].*$/, '').trim() || 'Produit 1688';
    } catch { data.name = document.title.replace(/[-|].*$/, '').trim() || 'Produit 1688'; }

    // ── PRIX + PALIERS ──
    try {
      const priceEl = document.querySelector(
        '.price-now .price-num, .price .price-num, .offer-price, ' +
        '[class*="price"] [class*="num"], [class*="Price"] [class*="Num"], ' +
        '.mod-detail-price .price, [data-price]'
      );
      const priceMatch = priceEl?.textContent?.match(/(\d+(?:\.\d+)?)/);
      data.price1688 = priceMatch ? parseFloat(priceMatch[1]) : null;

      const priceTiers = [];
      document.querySelectorAll(
        '[class*="price"] tr, [class*="Price"] tr, .price-range-item, .batch-price-item, ' +
        '[class*="batchPrice" i] [class*="item" i], [class*="step-price" i] [class*="item" i]'
      ).forEach(row => {
        const texts = row.textContent || '';
        const qtyMatch = texts.match(/(\d+)\s*[-~≥>=]\s*(\d+)?/);
        const prMatch = texts.match(/[¥￥]?\s*(\d+(?:\.\d+)?)/);
        if (qtyMatch && prMatch) {
          priceTiers.push({
            minQty: parseInt(qtyMatch[1]),
            maxQty: qtyMatch[2] ? parseInt(qtyMatch[2]) : undefined,
            price: parseFloat(prMatch[1])
          });
        }
      });
      if (priceTiers.length > 0) data.priceTiers = priceTiers;

      // Prix promo si visible
      const promoPriceEl = document.querySelector('[class*="promotion" i] [class*="price" i], [class*="sale" i] [class*="price" i]');
      if (promoPriceEl) {
        const pm = promoPriceEl.textContent?.match(/(\d+(?:\.\d+)?)/);
        if (pm) data.promoPrice1688 = parseFloat(pm[1]);
      }
    } catch (e) { console.warn('[IT Vision] Prix 1688:', e); }

    // ── IMAGES — classées par catégorie ──
    const imageCategories = { main: [], gallery: [], variant: [], description: [], packaging: [] };
    try {
      const is1688ProductImage = (src) => /cbu\d*\.alicdn\.com|img\.alicdn\.com|sc\d+\.alicdn|imgextra/i.test(src);

      // Images galerie principale — sélecteurs larges pour couvrir 1688 classique + React
      const gallerySelectors = [
        '.detail-gallery img', '.offer-img img', '.main-image img',
        '[class*="gallery" i] img', '[class*="slider" i] img',
        '[class*="image-view" i] img', '[class*="thumb" i] img',
        '[class*="detail-image" i] img', '[class*="mainImg" i] img',
        // 1688 React / moderne
        '[class*="image--item" i] img', '[class*="ImageView" i] img',
        '[class*="carousel" i] img', '[class*="swiper" i] img',
        'picture img', '[class*="pic" i][class*="wrap" i] img',
        '[class*="sku" i] img', '[data-role="img"] img',
        // Fallback large : toute image sur CDN alicdn dans la zone produit
        '[class*="detail" i] img', '[class*="offer" i] img'
      ];
      for (const sel of gallerySelectors) {
        document.querySelectorAll(sel).forEach(img => {
          if (isNoiseImageElement(img)) return;
          const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original') || '';
          if (!src || isNoiseImage(src)) return;
          if (!is1688ProductImage(src)) return;
          const clean = cleanImageUrl(src);
          if (clean && !imageCategories.gallery.includes(clean)) imageCategories.gallery.push(clean);
        });
      }

      // Recherche élargie : toutes les images CDN 1688 dans le body
      if (imageCategories.gallery.length < 3) {
        console.log('[IT Vision] 1688 recherche élargie images...');
        document.querySelectorAll('img').forEach(img => {
          if (isNoiseImageElement(img)) return;
          const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original') || '';
          if (!src || isNoiseImage(src) || !is1688ProductImage(src)) return;
          const clean = cleanImageUrl(src);
          if (clean && !imageCategories.gallery.includes(clean)) imageCategories.gallery.push(clean);
        });
      }

      // og:image fallback
      if (imageCategories.gallery.length === 0) {
        const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
        if (ogImg) imageCategories.gallery.push(cleanImageUrl(ogImg));
      }

      // Première image = main
      if (imageCategories.gallery.length > 0) {
        imageCategories.main = [imageCategories.gallery[0]];
      }

      // Images de description (dans la section détails en bas de page)
      const descContainers = document.querySelectorAll(
        '.detail-desc, [class*="offerDesc" i], [class*="offer-desc" i], [class*="detail-desc" i], ' +
        '#desc-lazyload-container, [class*="descV8" i], [id*="desc" i], ' +
        '[class*="description" i] img, [class*="tab-content" i]'
      );
      descContainers.forEach(container => {
        container.querySelectorAll('img').forEach(img => {
          const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original') || '';
          if (!src || isNoiseImage(src)) return;
          const w = img.naturalWidth || parseInt(img.getAttribute('width') || '0');
          const h = img.naturalHeight || parseInt(img.getAttribute('height') || '0');
          if (w > 0 && w < 100) return; // trop petit
          if (h > 0 && h < 100) return;
          const clean = cleanImageUrl(src);
          if (clean && !imageCategories.description.includes(clean) && !imageCategories.gallery.includes(clean)) {
            imageCategories.description.push(clean);
          }
        });
      });

      // Packaging detection: images contenant "packaging", "包装", "box"
      const allDescImgs = [...imageCategories.description];
      imageCategories.description = allDescImgs.filter(url => {
        const lower = url.toLowerCase();
        if (/packag|包装|box|carton|emball/i.test(lower)) {
          imageCategories.packaging.push(url);
          return false;
        }
        return true;
      });

      data.gallery = deduplicateImages(imageCategories.gallery).slice(0, 20);
      data.descriptionImages = deduplicateImages(imageCategories.description).slice(0, 30);
      data.image = data.gallery[0] || imageCategories.main[0];
      data.imageCategories = {
        main: imageCategories.main.slice(0, 1),
        gallery: data.gallery,
        variant: [],
        description: data.descriptionImages,
        packaging: deduplicateImages(imageCategories.packaging).slice(0, 5)
      };
      console.log('[IT Vision] 1688 Images:', data.gallery.length, 'galerie,', data.descriptionImages.length, 'description');
    } catch (e) { data.gallery = []; console.warn('[IT Vision] Images 1688:', e); }

    // ── VIDÉOS ──
    try {
      data.videos = extractVideos(document);
      console.log('[IT Vision] 1688 Vidéos:', data.videos.length);
    } catch { data.videos = []; }

    // ── VARIANTES ──
    try {
      data.variantGroups = [];
      const processedGroups = new Set();

      document.querySelectorAll('[class*="sku" i], [class*="Sku" i], [class*="prop" i], [class*="variant" i]').forEach(container => {
        const labelEl = container.querySelector('[class*="title" i], [class*="label" i], [class*="name" i], dt, h4, h5, strong');
        let groupName = labelEl?.textContent?.trim()?.replace(/[:\s：]+$/, '')?.trim() || '';
        groupName = groupName.replace(/\s*[:\s：].*$/, '').trim();
        if (!groupName || groupName.length > 40 || groupName.length < 1 || processedGroups.has(groupName)) return;

        // Normaliser nom de groupe
        const gl = groupName.toLowerCase();
        if (gl.includes('颜色') || gl.includes('色')) groupName = 'Couleur';
        else if (gl.includes('尺') || gl.includes('码') || gl.includes('规格')) groupName = 'Taille';
        else if (gl.includes('款') || gl.includes('型号')) groupName = 'Modèle';

        const variants = [];
        container.querySelectorAll('li, [class*="item" i], [class*="option" i], [class*="prop-value" i]').forEach((item, idx) => {
          const text = item.textContent?.trim();
          if (!text || text.length > 80 || text.length < 1 || text === groupName) return;
          if (item === labelEl || item.contains(labelEl)) return;

          const img = item.querySelector('img');
          let imgUrl = img?.getAttribute('src') || img?.getAttribute('data-src') || undefined;
          if (imgUrl) {
            imgUrl = cleanImageUrl(imgUrl);
            // Ajouter aux images de variante
            if (imgUrl && !imageCategories.variant.includes(imgUrl)) imageCategories.variant.push(imgUrl);
          }

          const priceMatch = text.match(/[¥￥]\s*(\d+(?:\.\d+)?)/);
          const variantPrice = priceMatch ? parseFloat(priceMatch[1]) : undefined;
          const cleanName = text.replace(/[¥￥]\s*\d+(?:\.\d+)?/, '').trim() || text;

          if (!variants.find(v => v.name === cleanName)) {
            variants.push({
              id: `sku-${idx}`,
              name: cleanName,
              image: imgUrl || undefined,
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

      // Fallback items plats
      if (data.variantGroups.length === 0) {
        const variants = [];
        document.querySelectorAll('.sku-item, .offer-sku, .prop-item').forEach((item, idx) => {
          const name = item.textContent?.trim();
          const img = item.querySelector('img');
          let imgUrl = img?.getAttribute('src') || img?.getAttribute('data-src') || undefined;
          if (imgUrl) imgUrl = cleanImageUrl(imgUrl);
          if (name && name.length > 0 && name.length < 80 && !variants.find(v => v.name === name)) {
            variants.push({ id: `sku-${idx}`, name, image: imgUrl, price1688: data.price1688, stock: 1000, isDefault: idx === 0 });
          }
        });
        if (variants.length > 1) data.variantGroups.push({ name: 'Modèle', variants });
      }

      // Mettre à jour les images de variante
      if (data.imageCategories) {
        data.imageCategories.variant = deduplicateImages(imageCategories.variant).slice(0, 20);
      }
    } catch (e) { console.warn('[IT Vision] Variantes 1688:', e); }

    // ── MOQ ──
    try {
      const moqEl = document.querySelector('.moq-info, [class*="moq"], .min-order, [class*="MinOrder"], [class*="minOrder"]');
      if (moqEl) {
        const moqMatch = moqEl.textContent.match(/(\d+)\s*(?:件|个|pcs|pi[eè]ces?|unit)/i);
        data.moq = moqMatch ? parseInt(moqMatch[1]) : null;
      }
      if (!data.moq) {
        const bodyText = document.body.innerText.slice(0, 5000);
        const moqFallback = bodyText.match(/(?:起订|最少|minimum)[^\d]*(\d+)/i);
        if (moqFallback) data.moq = parseInt(moqFallback[1]);
      }
    } catch (e) { console.warn('[IT Vision] MOQ 1688:', e); }

    // ── SPÉCIFICATIONS ──
    const specs = {};
    try {
      document.querySelectorAll(
        '.offer-attr-row, .parameter-row, [class*="attr"] tr, [class*="Attr"] tr, ' +
        '[class*="param"] tr, [class*="detail-attr" i] li, [class*="attribute" i] li'
      ).forEach(row => {
        const cells = row.querySelectorAll('td, .attr-name, .attr-value, th, span');
        if (cells.length >= 2) {
          const key = cells[0].textContent?.trim();
          const value = cells[1].textContent?.trim();
          if (key && value && key.length < 50 && value.length < 200) specs[key] = value;
        }
      });
      data.specifications = specs;
    } catch (e) { data.specifications = {}; }

    // ── POIDS / DIMENSIONS ──
    let weightKg = 0, lengthCm = 0, widthCm = 0, heightCm = 0;
    try {
      for (const [key, value] of Object.entries(specs)) {
        const k = key.toLowerCase();
        if (k.includes('重量') || k.includes('weight') || k.includes('净重') || k.includes('毛重')) {
          const wm = String(value).match(/(\d+(?:\.\d+)?)\s*(?:kg|千克)/i);
          if (wm) weightKg = parseFloat(wm[1]);
          if (!wm) {
            const wg = String(value).match(/(\d+(?:\.\d+)?)\s*(?:g|克)/i);
            if (wg) weightKg = parseFloat(wg[1]) / 1000;
          }
        }
        if (k.includes('尺寸') || k.includes('dimension') || k.includes('size') || k.includes('规格') || k.includes('大小')) {
          const dims = String(value).match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i);
          if (dims) {
            lengthCm = parseFloat(dims[1]);
            widthCm = parseFloat(dims[2]);
            heightCm = parseFloat(dims[3]);
            // Si les valeurs sont en mm (< 1), convertir
            if (lengthCm > 0 && lengthCm < 1) { lengthCm *= 10; widthCm *= 10; heightCm *= 10; }
          }
        }
      }
    } catch (e) { console.warn('[IT Vision] Poids/dim 1688:', e); }

    // ── DESCRIPTION STRUCTURÉE (NOUVEAU) ──
    let presentationText = '';
    try {
      // Extraire le texte de la section description
      const descContainers = document.querySelectorAll(
        '.detail-desc, [class*="offerDesc" i], [class*="offer-desc" i], ' +
        '#desc-lazyload-container, [class*="descV8" i], [id*="desc" i]'
      );
      for (const container of descContainers) {
        const text = cleanTextFromElement(container);
        if (text.length > presentationText.length) presentationText = text;
      }

      // Nettoyer le texte brut chinois : supprimer les lignes inutiles
      if (presentationText) {
        presentationText = presentationText
          .split('\n')
          .map(l => l.trim())
          .filter(l => {
            if (l.length < 3) return false;
            // Supprimer lignes "en savoir plus", pubs, liens
            if (/^(查看|了解|点击|联系|more|click|contact)/i.test(l)) return false;
            if (/^\d+$/.test(l)) return false;
            return true;
          })
          .join('\n')
          .replace(/\n{3,}/g, '\n\n')
          .slice(0, 5000);
      }
    } catch (e) { console.warn('[IT Vision] Description 1688:', e); }

    // Construire la description structurée
    data.description = buildStructuredDescription({
      title: data.name,
      specs,
      presentationText
    });

    // ── VALEURS PAR DÉFAUT ──
    try {
      data.category = data.category || 'Catalogue import Chine';
      data.tagline = 'Import 1688';
      data.availabilityNote = 'Import 1688 - vérifier poids/dimensions';
      data.currency = 'FCFA';
      data.price1688Currency = 'CNY';
      data.exchangeRate = 100;
      if (typeof weightKg !== 'undefined' && weightKg > 0) data.weightKg = weightKg;
      if (typeof lengthCm !== 'undefined' && lengthCm > 0) data.lengthCm = lengthCm;
      if (typeof widthCm !== 'undefined' && widthCm > 0) data.widthCm = widthCm;
      if (typeof heightCm !== 'undefined' && heightCm > 0) data.heightCm = heightCm;
      data.features = [
        data.moq && `MOQ: ${data.moq} unités`,
        data.priceTiers?.length && `${data.priceTiers.length} paliers de prix`,
        Object.keys(data.specifications || {}).length > 0 && `${Object.keys(data.specifications).length} spécifications`,
        data.videos?.length > 0 && `${data.videos.length} vidéo(s)`,
        data.gallery?.length > 0 && `${data.gallery.length} images galerie`,
        data.descriptionImages?.length > 0 && `${data.descriptionImages.length} images description`,
        data.weightKg && `Poids: ${data.weightKg} kg`
      ].filter(Boolean);
    } catch (e) { console.warn('[IT Vision] Défaut 1688:', e); }

    if (!data.name) data.name = document.title.replace(/[-|].*$/, '').trim() || 'Produit 1688';
    if (!data.image && data.gallery?.length) data.image = data.gallery[0];

    console.log('[IT Vision] 1688 extrait:', {
      name: data.name,
      price: data.price1688,
      gallery: data.gallery?.length,
      descImages: data.descriptionImages?.length,
      videos: data.videos?.length,
      variants: data.variantGroups?.length
    });
    return data;
  };

  // ==========================================
  // EXTRACTEUR ALIEXPRESS
  // ==========================================
  
  const scrapeAliExpress = async () => {
    console.log('[IT Vision] Extraction AliExpress v2...');

    await wait(3000);
    // Scroll profond pour déclencher lazy load (description est en bas)
    const docHeight = Math.max(document.body.scrollHeight, 6000);
    await deepScroll(docHeight, 400, 200);
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

    // Utilise les fonctions globales isNoiseImage, isNoiseImageElement, cleanImageUrl
    // Vérifier qu'une URL est une image produit AliExpress (CDN alicdn ou aliexpress)
    const isAliProductImage = (src) => {
      return /ae\d+\.alicdn\.com|cbu\d*\.alicdn\.com|img\.aliexpress|sc\d+\.alicdn|assets\.alicdn\.com\/imgextra|img\.alicdn\.com|imgextra/i.test(src);
    };
    
    // Source 1: JSON-LD images (le plus fiable)
    if (jsonLdProduct?.image) {
      const imgs = Array.isArray(jsonLdProduct.image) ? jsonLdProduct.image : [jsonLdProduct.image];
      imgs.forEach(img => {
        const url = typeof img === 'string' ? img : img?.url || img?.contentUrl || '';
        if (url && url.startsWith('http') && !isNoiseImage(url)) imageSet.add(cleanImageUrl(url));
      });
    }

    // Source 2: og:image
    const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
    if (ogImg && ogImg.startsWith('http') && !isNoiseImage(ogImg)) imageSet.add(ogImg);

    // Source 3: Images de la GALERIE PRODUIT (sélecteurs précis + larges)
    const gallerySelectors = [
      // Sélecteurs très spécifiques AliExpress
      '[class*="slider--img"] img', '[class*="Slider--img"] img',
      '[class*="image-view" i] img', '[class*="ImageView" i] img',
      '[class*="product-image" i] img', '[class*="ProductImage" i] img',
      '[data-pl="product-image"] img', '[class*="magnifier" i] img',
      // Galerie/carousel
      '[class*="gallery" i] img', '[class*="Gallery" i] img',
      '[class*="slider" i] img', '[class*="Slider" i] img',
      // Thumbnails produit (pas review/payment)
      '[class*="thumb" i]:not([class*="review" i]):not([class*="payment" i]) img',
      // AliExpress moderne: les images dans la section principale produit
      '[class*="pdp-info" i] img', '[class*="product-main" i] img',
      '[class*="detail-gallery" i] img', '[class*="DetailGallery" i] img',
      // Sélecteurs supplémentaires AliExpress 2024-2026
      '[class*="image--item"] img', '[class*="Image--item"] img',
      'picture img', '[class*="pic" i][class*="wrap" i] img',
      '[class*="main-image" i] img', '[class*="MainImage" i] img',
      '[class*="image--container"] img', '[class*="Image--container"] img',
      '[class*="carousel" i] img', '[class*="swiper" i] img'
    ];
    for (const sel of gallerySelectors) {
      document.querySelectorAll(sel).forEach(img => {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
        if (!src || isNoiseImage(src)) return;
        if (isAliProductImage(src)) {
          imageSet.add(cleanImageUrl(src));
        }
      });
    }

    // Source 4: background-image dans les div de gallery
    document.querySelectorAll('[class*="gallery" i] [style*="background-image"], [class*="slider" i] [style*="background-image"], [class*="image-view" i] [style*="background-image"]').forEach(el => {
      const bg = el.style.backgroundImage;
      const m = bg.match(/url\(["']?([^"')]+)/);
      if (m && !isNoiseImage(m[1]) && isAliProductImage(m[1])) {
        imageSet.add(cleanImageUrl(m[1]));
      }
    });

    // Source 5: Chercher TOUTES les images produit dans le haut de page
    // Toujours exécuté (pas seulement si <= 2) car les sélecteurs spécifiques peuvent rater des images
    console.log('[IT Vision] Recherche élargie d\'images produit...');
    const mainArea = document.querySelector('main, [id*="root"], [class*="product" i], [class*="detail" i], body');
    if (mainArea) {
      mainArea.querySelectorAll('img').forEach(img => {
        if (isNoiseImageElement(img)) return;
        const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
        if (!src) return;
        if (!isAliProductImage(src)) return;
        imageSet.add(cleanImageUrl(src));
      });
    }

    // Source 6: Images dans les attributs data-src des divs (lazy-load moderne)
    document.querySelectorAll('[data-src*="alicdn"], [data-original*="alicdn"]').forEach(el => {
      const src = el.getAttribute('data-src') || el.getAttribute('data-original') || '';
      if (src && !isNoiseImage(src) && isAliProductImage(src)) {
        imageSet.add(cleanImageUrl(src));
      }
    });

    // Dédouper par nom de fichier (même image, résolutions différentes)
    data.gallery = deduplicateImages(Array.from(imageSet)).slice(0, 20);
    data.image = data.gallery[0];
    console.log('[IT Vision] Images galerie trouvées:', data.gallery.length);

    // ===== VIDÉOS =====
    try {
      data.videos = extractVideos(document);
      // Aussi chercher dans les JSON embarqués AliExpress
      document.querySelectorAll('script:not([src])').forEach(s => {
        const txt = s.textContent || '';
        // AliExpress stocke souvent la vidéo dans "videoId" + "videoUrl"
        const m = txt.match(/"videoUrl"\s*:\s*"(https?:\/\/[^"]+\.mp4[^"]*)"/);
        if (m && m[1] && !data.videos.includes(m[1])) data.videos.push(m[1]);
      });
      console.log('[IT Vision] AliExpress Vidéos:', data.videos.length);
    } catch { data.videos = []; }

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
          if (isNoiseImageElement(img)) return;
          const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
          if (!src) return;
          if (!isAliProductImage(src)) return;
          descriptionImages.push(cleanImageUrl(src));
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

      // Partie 4: Notes compactes (pas d'infos boutique)
      if (data.rating) {
        descParts.push(`\n> Note: ${data.rating}/5${data.orders ? ` — ${data.orders} commandes` : ''}`);
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

    // ===== CLASSIFICATION DES IMAGES =====
    // Collecter les images de variantes depuis les variantGroups
    const variantImages = [];
    (data.variantGroups || []).forEach(g => {
      (g.variants || []).forEach(v => {
        if (v.image && !variantImages.includes(v.image)) variantImages.push(v.image);
      });
    });

    // Séparer packaging des images de description
    const cleanDescImages = [];
    const packagingImages = [];
    descriptionImages.forEach(url => {
      const lower = url.toLowerCase();
      if (/packag|box|carton|emball|colis/i.test(lower)) {
        packagingImages.push(url);
      } else {
        cleanDescImages.push(url);
      }
    });

    data.descriptionImages = deduplicateImages(cleanDescImages).slice(0, 30);

    data.imageCategories = {
      main: data.gallery.slice(0, 1),
      gallery: data.gallery,
      variant: deduplicateImages(variantImages).slice(0, 20),
      description: data.descriptionImages,
      packaging: deduplicateImages(packagingImages).slice(0, 5)
    };

    console.log('[IT Vision] Images classées:', {
      galerie: data.gallery.length,
      variantes: variantImages.length,
      description: data.descriptionImages.length,
      packaging: packagingImages.length
    });

    // Features (résumé compact)
    data.features = [
      data.rating && `Note: ${data.rating}/5`,
      data.orders && `${data.orders} commandes`,
      data.gallery.length > 0 && `${data.gallery.length} images galerie`,
      data.descriptionImages.length > 0 && `${data.descriptionImages.length} images description`,
      data.videos?.length > 0 && `${data.videos.length} vidéo(s)`,
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

    console.log('[IT Vision] AliExpress extrait:', {
      name: data.name,
      price: data.price,
      gallery: data.gallery?.length,
      descImages: data.descriptionImages?.length,
      videos: data.videos?.length,
      variants: data.variantGroups?.length,
      specs: Object.keys(specs).length,
      weight: weightKg
    });
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
      
      try {
        const is1688 = window.location.hostname.includes('1688.com');
        const data = is1688 ? await scrape1688() : await scrapeAliExpress();
        
        // Envoyer au background script
        chrome.runtime.sendMessage({
          action: 'PRODUCT_EXTRACTED',
          data: data
        });
        
        // Feedback visuel
        const name = (data.name || 'Produit').substring(0, 30);
        showNotification(`${name}... extrait! (${data.gallery?.length || 0} img)`);
      } catch (err) {
        console.error('[IT Vision] Erreur extraction:', err);
        showNotification(`❌ Erreur: ${err.message || 'extraction échouée'}`);
      }
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
