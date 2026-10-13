'use client';

import { useEffect } from 'react';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
let installed = false;
let token: string | null = null;
let pending: Promise<string | null> | null = null;

function loadToken(force = false): Promise<string | null> {
  if (token && !force) return Promise.resolve(token);
  if (pending && !force) return pending;
  pending = fetch('/api/csrf', { credentials: 'include', cache: 'no-store' })
    .then(async (r) => {
      const d = await r.json().catch(() => ({}));
      token = d?.csrfToken || r.headers.get('X-CSRF-Token');
      return token;
    })
    .catch(() => null)
    .finally(() => { pending = null; });
  return pending;
}

/**
 * Visiteurs non connectés : en production, toute écriture sur /api exige le jeton CSRF double-submit.
 * Ajoute l'en-tête aux requêtes du site (checkout invité, inscription aux groupes, alertes, précommandes…).
 */
export default function CsrfFetch() {
  useEffect(() => {
    if (installed) return;
    installed = true;
    const original = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      if (input instanceof Request) return original(input, init);
      const url = typeof input === 'string' ? input : input.href;
      const method = (init.method || 'GET').toUpperCase();
      const sameOriginApi = url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`);
      if (!sameOriginApi || !MUTATING.has(method) || url.includes('/api/csrf')) return original(input, init);

      const headers = new Headers(init.headers);
      if (!headers.has('x-csrf-token')) {
        const t = await loadToken();
        if (t) headers.set('X-CSRF-Token', t);
      }
      const res = await original(input, { ...init, headers });
      if (res.status !== 403 || init.body instanceof ReadableStream) return res;
      const data = await res.clone().json().catch(() => ({}));
      if (!String(data?.error || '').includes('CSRF')) return res;
      const fresh = await loadToken(true);
      if (!fresh) return res;
      headers.set('X-CSRF-Token', fresh);
      return original(input, { ...init, headers });
    };
  }, []);
  return null;
}
