'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface SourcingPrefill {
  source?: 'photo' | 'link' | 'text';
  title?: string;
  description?: string;
  externalUrl?: string;
  qty?: number;
}

interface SourcingModalContextValue {
  isOpen: boolean;
  prefill: SourcingPrefill | null;
  /** Accepte un préremplissage ; ignore l'événement passé par `onClick={open}`. */
  open: (prefill?: SourcingPrefill | unknown) => void;
  close: () => void;
  toggle: () => void;
}

const SourcingModalContext = createContext<SourcingModalContextValue | null>(null);

function asPrefill(value: unknown): SourcingPrefill | null {
  if (!value || typeof value !== 'object' || 'nativeEvent' in (value as object)) return null;
  return value as SourcingPrefill;
}

export function SourcingModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState<SourcingPrefill | null>(null);

  const open = useCallback((value?: unknown) => { setPrefill(asPrefill(value)); setIsOpen(true); }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((s) => !s), []);

  const value = useMemo(() => ({ isOpen, prefill, open, close, toggle }), [isOpen, prefill, open, close, toggle]);

  return (
    <SourcingModalContext.Provider value={value}>
      {children}
    </SourcingModalContext.Provider>
  );
}

export function useSourcingModal() {
  const ctx = useContext(SourcingModalContext);
  if (!ctx) {
    throw new Error('useSourcingModal must be used within SourcingModalProvider');
  }
  return ctx;
}
