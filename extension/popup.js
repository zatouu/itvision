/**
 * Popup - Interface utilisateur de l'extension IT Vision
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Éléments DOM
  const btnExtract = document.getElementById('btn-extract');
  const btnExport = document.getElementById('btn-export');
  const btnClear = document.getElementById('btn-clear');
  const countEl = document.getElementById('count');
  const productsContainer = document.getElementById('products-container');
  const productsList = document.getElementById('products-list');
  const apiUrlInput = document.getElementById('api-url');
  const apiTokenInput = document.getElementById('api-token');

  // Charger settings
  const settings = await chrome.storage.local.get(['apiUrl', 'apiToken']);
  if (settings.apiUrl) apiUrlInput.value = settings.apiUrl;
  if (settings.apiToken) apiTokenInput.value = settings.apiToken;

  // Sauvegarder settings
  const saveSettings = () => {
    chrome.storage.local.set({
      apiUrl: apiUrlInput.value,
      apiToken: apiTokenInput.value
    });
  };
  apiUrlInput.addEventListener('change', saveSettings);
  apiTokenInput.addEventListener('change', saveSettings);

  // Charger produits extraits
  const loadProducts = async () => {
    const { products = [] } = await chrome.storage.local.get('products');
    countEl.textContent = products.length;
    btnExport.disabled = products.length === 0;
    
    if (products.length > 0) {
      productsContainer.style.display = 'block';
      renderProducts(products);
    } else {
      productsContainer.style.display = 'none';
    }
  };

  // Render liste produits
  const renderProducts = (products) => {
    productsList.innerHTML = products.map((p, idx) => {
      const imgCount = (p.gallery?.length || 0) + (p.descriptionImages?.length || 0);
      const varCount = (p.variantGroups || []).reduce((acc, g) => acc + (g.variants?.length || 0), 0);
      const videoCount = p.videos?.length || 0;
      const stats = [
        imgCount > 0 && `${imgCount} img`,
        varCount > 0 && `${varCount} var`,
        videoCount > 0 && `${videoCount} vid`,
        p.weightKg && `${p.weightKg}kg`
      ].filter(Boolean).join(' · ');
      return `
      <div class="product-item" data-idx="${idx}">
        <img src="${p.image || 'icons/icon48.png'}" onerror="this.src='icons/icon48.png'" alt="">
        <div class="product-info">
          <div class="product-name">${p.name || 'Produit sans nom'}</div>
          <div class="product-price">${p.price1688 ? '¥' + p.price1688 : (p.price ? p.price + ' FCFA' : 'Prix non disponible')}</div>
          ${stats ? `<div style="font-size:10px;color:#6b7280;margin-top:2px">${stats}</div>` : ''}
        </div>
        <button class="product-remove" data-idx="${idx}" title="Supprimer">×</button>
      </div>`;
    }).join('');

    // Listeners suppression
    document.querySelectorAll('.product-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const { products = [] } = await chrome.storage.local.get('products');
        products.splice(idx, 1);
        await chrome.storage.local.set({ products });
        loadProducts();
      });
    });
  };

  // Extraire produit de la page active
  btnExtract.addEventListener('click', async () => {
    btnExtract.disabled = true;
    btnExtract.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
        <path d="M12 3v18M3 12h18"/>
      </svg>
      Extraction...
    `;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('1688.com') && !tab.url.includes('aliexpress.com')) {
        showNotification('Veuillez ouvrir une page 1688 ou AliExpress', 'error');
        return;
      }

      // Essayer d'envoyer au content script existant, sinon l'injecter dynamiquement
      let response;
      try {
        response = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PRODUCT' });
      } catch (e) {
        // Content script pas chargé — l'injecter manuellement
        console.log('[IT Vision] Content script absent, injection dynamique...');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content.css']
        });
        // Attendre que le script s'initialise
        await new Promise(r => setTimeout(r, 1500));
        response = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PRODUCT' });
      }
      
      if (response && response.success) {
        // Ajouter aux produits
        const { products = [] } = await chrome.storage.local.get('products');
        
        // Éviter doublons
        const exists = products.some(p => p.url === response.data.url);
        if (exists) {
          showNotification('Produit déjà extrait!', 'error');
          return;
        }
        
        products.push(response.data);
        await chrome.storage.local.set({ products });
        
        loadProducts();
        showNotification('Produit extrait avec succès!', 'success');
      } else {
        showNotification('Erreur: ' + response.error, 'error');
      }
    } catch (err) {
      showNotification('Erreur extraction: ' + err.message, 'error');
    } finally {
      btnExtract.disabled = false;
      btnExtract.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3v18M3 12h18"/>
        </svg>
        Extraire cette page
      `;
    }
  });

  // Format standard /api/products/import (fallback)
  const transformProductForApi = (p) => {
    const common = {
      productUrl: p.url,
      image: p.image,
      gallery: p.gallery || [],
      descriptionImages: p.descriptionImages || [],
      videos: p.videos || [],
      imageCategories: p.imageCategories || undefined,
      features: p.features || [],
      variantGroups: p.variantGroups || [],
      description: p.description || undefined,
      specifications: p.specifications || {},
      weightKg: p.weightKg || undefined,
      lengthCm: p.lengthCm || undefined,
      widthCm: p.widthCm || undefined,
      heightCm: p.heightCm || undefined,
    };
    if (p.platform === '1688') {
      return {
        ...common,
        name: p.name || 'Produit 1688',
        price1688: p.price1688,
        promoPrice1688: p.promoPrice1688 || undefined,
        price1688Currency: 'CNY',
        exchangeRate: p.exchangeRate || 100,
        currency: 'FCFA',
        category: p.category || 'Catalogue import Chine',
        tagline: p.tagline || 'Import 1688',
        availabilityNote: p.availabilityNote || 'Import 1688 — vérifier poids/dimensions',
        moq: p.moq,
        priceTiers: p.priceTiers || [],
        supplier: p.supplier || undefined,
      };
    }
    return {
      ...common,
      name: p.name || 'Produit AliExpress',
      price: p.price,
      priceUSD: p.priceUSD || undefined,
      baseCost: p.price,
      currency: 'FCFA',
      category: p.category || 'Catalogue import Chine',
      tagline: p.tagline || 'Import AliExpress',
      availabilityNote: p.availabilityNote || 'Import AliExpress — freight 3j/15j/60j',
      shopName: p.shopName,
      orders: p.orders,
      totalRated: p.rating,
    };
  };

  // Format smart-import /api/admin/products/smart-import (enrichi IA + pricing auto)
  const transformProductForSmartApi = (p) => {
    // Toutes les images : galerie + description + variantes (classées)
    const allImages = [
      ...(p.gallery || []),
      ...(p.descriptionImages || []),
      ...((p.imageCategories?.variant || []))
    ].filter(Boolean);
    // Dédupliquer
    const uniqueImages = [...new Set(allImages)];

    return {
      name: p.name || 'Produit',
      description: p.description || Object.entries(p.specifications || {}).map(([k,v]) => `${k}: ${v}`).join('\n') || '',
      images: uniqueImages,
      imageCategories: p.imageCategories || undefined,
      videos: p.videos || [],
      price1688: p.price1688 || undefined,
      promoPrice1688: p.promoPrice1688 || undefined,
      price: p.price || undefined,
      priceTiers: p.priceTiers || [],
      category: p.category || 'Catalogue import Chine',
      features: p.features || [],
      variants: (p.variantGroups || []).flatMap(g =>
        (g.variants || []).map(v => ({
          name: v.name,
          image: v.image,
          price1688: v.price1688,
          groupName: g.name
        }))
      ),
      weightKg: p.weightKg || undefined,
      lengthCm: p.lengthCm || undefined,
      widthCm: p.widthCm || undefined,
      heightCm: p.heightCm || undefined,
      sourceUrl: p.url,
      sourcePlatform: p.platform === '1688' ? '1688' : 'aliexpress',
      supplierName: p.shopName || p.supplier?.name || undefined,
      moq: p.moq || undefined,
      specifications: p.specifications || {},
    };
  };

  // Exporter vers API IT Vision (Smart Import par défaut)
  const doExport = async (useSmart) => {
    const apiUrl = apiUrlInput.value.trim();
    if (!apiUrl) { showNotification('Veuillez configurer l\'URL API', 'error'); return; }

    const { products = [] } = await chrome.storage.local.get('products');
    if (products.length === 0) { showNotification('Aucun produit à exporter', 'error'); return; }

    const cookieUrl = apiUrl.replace(/\/$/, '');
    let authCookie = null;
    try { authCookie = await chrome.cookies.get({ url: cookieUrl, name: 'auth-token' }); } catch {}
    if (!authCookie?.value) {
      showNotification('Connectez-vous d\'abord sur ' + cookieUrl, 'error');
      return;
    }

    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authCookie.value}` };

    try {
      let response, result;

      if (useSmart) {
        // Smart Import — pricing auto + enrichissement IA
        const payload = {
          products: products.map(transformProductForSmartApi),
          options: { exchangeRate: 85, b2bDiscountPercent: 15, reformatDescriptions: false }
        };
        response = await fetch(`${cookieUrl}/api/admin/products/smart-import`, {
          method: 'POST', headers, credentials: 'include', body: JSON.stringify(payload)
        });
        result = await response.json();
        if (response.ok && result.success !== false) {
          await chrome.storage.local.set({ products: [] });
          loadProducts();
          showNotification(`Smart Import: ${result.imported || 0} créé(s)${result.failed > 0 ? ', ' + result.failed + ' échoué(s)' : ''}`, 'success');
        } else {
          // Fallback sur import standard si 403 (pas ADMIN)
          if (response.status === 403) {
            showNotification('Smart Import nécessite le rôle ADMIN. Tentative import standard...', 'error');
            setTimeout(() => doExport(false), 1000);
            return;
          }
          showNotification('Erreur: ' + (result.error || result.errors || 'Erreur inconnue'), 'error');
        }
      } else {
        // Import standard
        const payload = { items: products.map(transformProductForApi) };
        response = await fetch(`${cookieUrl}/api/products/import`, {
          method: 'POST', headers, credentials: 'include', body: JSON.stringify(payload)
        });
        result = await response.json();
        if (response.ok && result.success) {
          await chrome.storage.local.set({ products: [] });
          loadProducts();
          const s = result.summary || {};
          showNotification(`Exporté: ${s.created || 0} créé(s), ${s.updated || 0} mis à jour`, 'success');
        } else {
          showNotification('Erreur: ' + (result.error || 'Erreur inconnue'), 'error');
        }
      }
    } catch (err) {
      showNotification('Erreur export: ' + err.message, 'error');
    }
  };

  btnExport.addEventListener('click', async () => {
    btnExport.disabled = true;
    const label = btnExport.textContent.trim();
    btnExport.textContent = 'Export...';
    try {
      // Smart Import par défaut (pricing + IA)
      await doExport(true);
    } finally {
      btnExport.disabled = false;
      btnExport.textContent = label;
    }
  });

  // Vider la liste
  btnClear.addEventListener('click', async () => {
    if (confirm('Vider tous les produits extraits?')) {
      await chrome.storage.local.set({ products: [] });
      loadProducts();
      showNotification('Liste vidée', 'success');
    }
  });

  // Notification helper
  const showNotification = (message, type) => {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.transition = 'opacity 0.3s';
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  };

  // Initial load
  loadProducts();
});

// Animation CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .spin {
    animation: spin 1s linear infinite;
  }
`;
document.head.appendChild(style);
