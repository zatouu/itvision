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
    
    // Attendre chargement
    await wait(1500);
    
    // Scroll pour charger les images
    window.scrollTo(0, 500);
    await wait(500);
    window.scrollTo(0, 1000);
    await wait(300);

    const data = {
      platform: '1688',
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Titre
    data.name = trySelectors([
      '.offer-title',
      '.detail-title',
      'h1[data-spm="title"]',
      'h1.title',
      'h1'
    ]) || 'Produit 1688';

    // Prix
    const priceEl = document.querySelector('.price-now .price-num, .price .price-num, .offer-price');
    if (priceEl) {
      const match = priceEl.textContent.match(/(\d+(?:\.\d+)?)/);
      data.price1688 = match ? parseFloat(match[1]) : null;
    }

    // Images
    data.gallery = extractImages([
      '.detail-gallery img',
      '.offer-img img',
      '.main-image img',
      '.tab-content img'
    ]);
    data.image = data.gallery[0];

    // Variantes
    const variants = [];
    document.querySelectorAll('.sku-item, .offer-sku, .prop-item').forEach((item, idx) => {
      const name = item.textContent?.trim();
      const img = item.querySelector('img')?.getAttribute('src');
      if (name && name.length < 50) {
        variants.push({ id: `sku-${idx}`, name, image: img, isDefault: idx === 0 });
      }
    });
    
    if (variants.length > 0) {
      data.variantGroups = [{ name: 'Modèle', variants }];
    }

    // MOQ
    const moqEl = document.querySelector('.moq-info, [class*="moq"], .min-order');
    if (moqEl) {
      const match = moqEl.textContent.match(/(\d+)\s*(?:件|个|pcs)/i);
      data.moq = match ? parseInt(match[1]) : null;
    }

    // Fournisseur
    const supplierName = document.querySelector('.company-name, .supplier-name, [class*="company"]')?.textContent?.trim();
    if (supplierName) {
      data.supplier = {
        name: supplierName,
        location: document.querySelector('.company-location, [class*="location"]')?.textContent?.trim() || 'Chine',
        verified: document.querySelector('.verified-badge, [class*="verified"]') !== null
      };
    }

    // Spécifications
    data.specifications = {};
    document.querySelectorAll('.offer-attr-row, .parameter-row').forEach(row => {
      const cells = row.querySelectorAll('td, .attr-name, .attr-value');
      if (cells.length >= 2) {
        const key = cells[0].textContent?.trim();
        const value = cells[1].textContent?.trim();
        if (key && value) data.specifications[key] = value;
      }
    });

    // Valeurs par défaut
    data.category = 'Catalogue import Chine';
    data.tagline = 'Import 1688';
    data.availabilityNote = 'Import 1688 - vérifier poids/dimensions';
    data.currency = 'FCFA';
    data.price1688Currency = 'CNY';
    data.exchangeRate = 100;
    data.weightKg = 1;
    data.lengthCm = 10;
    data.widthCm = 10;
    data.heightCm = 10;
    data.features = [
      data.moq && `MOQ: ${data.moq} unités`,
      data.supplier?.name && `Fournisseur: ${data.supplier.name}`,
      Object.keys(data.specifications).length > 0 && `${Object.keys(data.specifications).length} spécifications`
    ].filter(Boolean);

    console.log('[IT Vision] 1688 extrait:', data);
    return data;
  };

  // ==========================================
  // EXTRACTEUR ALIEXPRESS
  // ==========================================
  
  const scrapeAliExpress = async () => {
    console.log('[IT Vision] Extraction AliExpress...');
    
    // Attendre chargement dynamique
    await wait(2000);
    
    // Scroll pour déclencher lazy load
    window.scrollTo(0, 800);
    await wait(800);

    const data = {
      platform: 'aliexpress',
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Titre
    data.name = trySelectors([
      '[data-pl="product-title"]',
      'h1[data-pl="product-title"]',
      '.product-title',
      'h1'
    ]) || 'Produit AliExpress';

    // Prix
    const priceSelectors = [
      '[data-pl="product-price"]',
      '.product-price-value',
      '[class*="price"] [class*="current"]',
      '.price-current'
    ];
    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) {
        const match = el.textContent.replace(/[^\d.,]/g, '').replace(',', '.').match(/(\d+(?:\.\d+)?)/);
        if (match) {
          data.priceUSD = parseFloat(match[1]);
          data.price = Math.round(data.priceUSD * 620); // Conversion FCFA
          break;
        }
      }
    }

    // Images
    data.gallery = extractImages([
      '.gallery-image',
      '.magnifier-image img',
      '[class*="gallery"] img',
      '.image-viewer img'
    ]);
    data.image = data.gallery[0];

    // Boutique
    data.shopName = document.querySelector('.shop-name, .store-name, [class*="shop"]')?.textContent?.trim();

    // Rating
    const ratingEl = document.querySelector('.rating-value, [class*="rating"]');
    if (ratingEl?.textContent) {
      const match = ratingEl.textContent.match(/(\d\.\d)/);
      data.rating = match ? parseFloat(match[1]) : null;
    }

    // Commandes
    const ordersEl = document.querySelector('[class*="orders"], [class*="sold"]');
    if (ordersEl?.textContent) {
      const match = ordersEl.textContent.replace(/[^\d]/g, '').match(/(\d+)/);
      data.orders = match ? parseInt(match[1]) : null;
    }

    // Variantes
    const variants = [];
    document.querySelectorAll('.sku-item, .product-sku, [class*="variant"]').forEach(item => {
      const name = item.textContent?.trim();
      const img = item.querySelector('img')?.getAttribute('src');
      if (name && !variants.find(v => v.name === name)) {
        variants.push({ name, image: img });
      }
    });
    if (variants.length > 0) data.variants = variants;

    // Features
    data.features = [
      data.rating && `Note: ${data.rating}/5`,
      data.orders && `${data.orders} commandes`,
      data.shopName && `Boutique: ${data.shopName}`
    ].filter(Boolean);

    // Valeurs par défaut
    data.category = 'Catalogue import Chine';
    data.tagline = 'Import AliExpress';
    data.availabilityNote = 'Import AliExpress - freight 3j/15j/60j';
    data.currency = 'FCFA';
    data.weightKg = 1;

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
        background: linear-gradient(135deg, #f97316, #ea580c);
        color: white;
        padding: 12px 20px;
        border-radius: 50px;
        cursor: pointer;
        font-family: system-ui, sans-serif;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 4px 15px rgba(249, 115, 22, 0.4);
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
