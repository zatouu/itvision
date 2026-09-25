'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface SourcingModalContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const SourcingModalContext = createContext<SourcingModalContextValue | null>(null);

export function SourcingModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((s) => !s), []);

  const value = useMemo(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle]);

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
