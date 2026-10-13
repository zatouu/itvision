'use client';

import { useEffect } from 'react';

const CODE = /^[A-Z0-9]{4,12}$/;

/**
 * Lien ambassadeur (?ref=CODE) : mémorisé 30 jours dans le cookie ddm_ref, lu par le serveur
 * à la commande et à l'inscription aux achats groupés. Le premier lien suivi n'est pas écrasé
 * par un lien plus récent pendant 30 jours.
 */
export default function ReferralCapture() {
  useEffect(() => {
    if (window.location.pathname.startsWith('/payment')) return;
    const raw = new URLSearchParams(window.location.search).get('ref');
    const code = raw ? raw.trim().toUpperCase() : '';
    if (!CODE.test(code)) return;
    if (document.cookie.split('; ').some((c) => c.startsWith('ddm_ref='))) return;
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `ddm_ref=${code}; Max-Age=${30 * 24 * 3600}; Path=/; SameSite=Lax${secure}`;
  }, []);
  return null;
}
