"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { XpGain } from "@/lib/constants";

const XpToastContext = createContext<(gain: XpGain) => void>(() => {});

/** Returns a function that announces XP a person has just earned. */
export const useXpToast = () => useContext(XpToastContext);

const VISIBLE_MS = 5000;

export function XpToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<(XpGain & { id: number }) | null>(null);

  const show = useCallback(
    (gain: XpGain) => setToast({ ...gain, id: Date.now() }),
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <XpToastContext value={show}>
      {children}
      {/* Always mounted so screen readers announce toasts as they appear. */}
      <div
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4"
      >
        {toast && (
          <div
            key={toast.id}
            className="xp-toast flex max-w-full items-center gap-3 rounded-xl border border-accent bg-surface px-4 py-3 text-sm shadow-xl"
          >
            <span className="shrink-0 rounded-md bg-accent px-2 py-1 font-semibold text-accent-fg tabular-nums">
              +{toast.amount} XP
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{toast.memberName}</span>
              <span className="block text-xs text-muted">
                {toast.leveledUp
                  ? `Awans na poziom ${toast.level}!`
                  : `Poziom ${toast.level}`}
              </span>
            </span>
          </div>
        )}
      </div>
    </XpToastContext>
  );
}
