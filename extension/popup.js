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
    productsList.innerHTML = products.map((p, idx) => `
      <div class="product-item" data-idx="${idx}">
        <img src="${p.image || 'icons/icon48.png'}" onerror="this.src='icons/icon48.png'" alt="">
        <div class="product-info">
          <div class="product-name">${p.name || 'Produit sans nom'}</div>
          <div class="product-price">${p.price1688 ? '¥' + p.price1688 : (p.price ? p.price + ' FCFA' : 'Prix non disponible')}</div>
        </div>
        <button class="product-remove" data-idx="${idx}" title="Supprimer">×</button>
      </div>
    `).join('');

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

  // Transformer les données scrapées au format attendu par /api/products/import
  const transformProductForApi = (p) => {
    if (p.platform === '1688') {
      return {
        name: p.name || 'Produit 1688',
        productUrl: p.url,
        image: p.image,
        gallery: p.gallery || [],
        price1688: p.price1688,
        price1688Currency: 'CNY',
        exchangeRate: p.exchangeRate || 100,
        currency: 'FCFA',
        category: p.category || 'Catalogue import Chine',
        tagline: p.tagline || 'Import 1688',
        availabilityNote: p.availabilityNote || 'Import 1688 — vérifier poids/dimensions',
        features: p.features || [],
        weightKg: p.weightKg || 1,
        lengthCm: p.lengthCm || 10,
        widthCm: p.widthCm || 10,
        heightCm: p.heightCm || 10,
        variantGroups: p.variantGroups || [],
        moq: p.moq,
        specifications: p.specifications
      };
    }
    // AliExpress
    return {
      name: p.name || 'Produit AliExpress',
      productUrl: p.url,
      image: p.image,
      gallery: p.gallery || [],
      price: p.price,
      baseCost: p.price,
      currency: 'FCFA',
      category: p.category || 'Catalogue import Chine',
      tagline: p.tagline || 'Import AliExpress',
      availabilityNote: p.availabilityNote || 'Import AliExpress — freight 3j/15j/60j',
      features: p.features || [],
      weightKg: p.weightKg || undefined,
      lengthCm: p.lengthCm || undefined,
      widthCm: p.widthCm || undefined,
      heightCm: p.heightCm || undefined,
      variantGroups: p.variantGroups || [],
      shopName: p.shopName,
      orders: p.orders,
      totalRated: p.rating,
      description: p.description,
      specifications: p.specifications
    };
  };

  // Exporter vers API IT Vision
  btnExport.addEventListener('click', async () => {
    const apiUrl = apiUrlInput.value.trim();

    if (!apiUrl) {
      showNotification('Veuillez configurer l\'URL API', 'error');
      return;
    }

    btnExport.disabled = true;
    btnExport.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
      </svg>
      Export...
    `;

    try {
      const { products = [] } = await chrome.storage.local.get('products');
      
      // Récupérer le cookie d'authentification depuis le site IT Vision
      const cookieUrl = apiUrl.replace(/\/$/, '');
      let authCookie = null;
      try {
        authCookie = await chrome.cookies.get({ url: cookieUrl, name: 'auth-token' });
      } catch (e) {
        console.warn('[IT Vision] Impossible de lire le cookie auth:', e);
      }
      
      if (!authCookie?.value) {
        showNotification('Connectez-vous d\'abord sur ' + cookieUrl + ' puis réessayez.', 'error');
        btnExport.disabled = false;
        btnExport.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Exporter vers IT Vision
        `;
        return;
      }

      // Envoyer les données scrapées (pas les URLs) au bon endpoint
      const payload = {
        items: products.map(transformProductForApi)
      };

      const response = await fetch(`${apiUrl}/api/products/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authCookie.value}`
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          // Vider la liste
          await chrome.storage.local.set({ products: [] });
          loadProducts();
          
          const { created, updated, failed } = result.summary;
          showNotification(
            `Exporté! ${created} créés, ${updated} mis à jour${failed > 0 ? ', ' + failed + ' échoués' : ''}`,
            'success'
          );
        } else {
          showNotification('Erreur API: ' + result.error, 'error');
        }
      } else if (response.status === 401 || response.status === 403) {
        showNotification('Non authentifié. Connectez-vous sur ' + apiUrl + ' d\'abord.', 'error');
      } else {
        const error = await response.text();
        showNotification('Erreur HTTP ' + response.status + ': ' + error.slice(0, 100), 'error');
      }
    } catch (err) {
      showNotification('Erreur export: ' + err.message, 'error');
    } finally {
      btnExport.disabled = false;
      btnExport.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
        </svg>
        Exporter vers IT Vision
      `;
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
