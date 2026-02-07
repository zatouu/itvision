/**
 * Service Worker - Background script pour l'extension IT Vision
 * Gère la communication entre content script et popup
 */

// Installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[IT Vision] Extension installée');
  
  // Initialiser storage
  chrome.storage.local.set({
    products: [],
    settings: {
      apiUrl: 'http://localhost:3000',
      apiToken: ''
    }
  });
});

// Écouter messages du content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PRODUCT_EXTRACTED') {
    // Stocker le produit extrait
    chrome.storage.local.get('products', (result) => {
      const products = result.products || [];
      
      // Éviter doublons
      const exists = products.some(p => p.url === request.data.url);
      if (!exists) {
        products.push(request.data);
        chrome.storage.local.set({ products });
        
        // Notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Produit extrait!',
          message: `${request.data.name.substring(0, 50)}... ajouté à la liste.`
        });
      }
    });
    
    sendResponse({ success: true });
  }
  
  return true;
});

// Badge avec nombre de produits
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.products) {
    const count = changes.products.newValue?.length || 0;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#f97316' });
  }
});

// Context menu (clic droit)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'extract-product',
    title: 'Extraire produit IT Vision',
    contexts: ['page'],
    documentUrlPatterns: [
      '*://detail.1688.com/*',
      '*://www.aliexpress.com/item/*'
    ]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'extract-product') {
    chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PRODUCT' });
  }
});
