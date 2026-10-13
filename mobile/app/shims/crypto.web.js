// Shim for Node crypto on web — exposes the browser's Web Crypto API
const cryptoObj =
  (typeof globalThis !== 'undefined' && globalThis.crypto) ||
  (typeof window !== 'undefined' && window.crypto) ||
  undefined;

if (!cryptoObj) {
  throw new Error('Web Crypto API is not available in this environment');
}

module.exports = cryptoObj;
