"use client";

import { useEffect, useId, useOptimistic, useRef, useState, useTransition } from "react";
import { saveTheme } from "@/lib/actions";
import {
  MODE_LABELS,
  PALETTE_LABELS,
  THEME_MODES,
  THEME_PALETTES,
  type Theme,
} from "@/lib/theme";

export function ThemePicker({ theme }: { theme: Theme }) {
  const [open, setOpen] = useState(false);
  // Only the radios are optimistic: the page itself changes colours when the
  // server re-renders <html> with the saved cookies.
  const [selected, setSelected] = useOptimistic(theme);
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    // On the document, because Safari does not focus a clicked button, so
    // focus may be outside the picker. Capturing keeps Escape from also
    // reaching page-level handlers such as the issue panel's.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  function choose(next: Theme) {
    startTransition(async () => {
      setSelected(next);
      try {
        await saveTheme(next);
      } catch {
        // A cosmetic preference is not worth an error page; the radios fall
        // back to the saved theme on their own.
      }
    });
  }

  return (
    <div
      ref={rootRef}
      className="relative md:mt-2"
      onBlur={(event) => {
        // Closes when focus moves elsewhere (tabbing out). A null target is a
        // click on something unfocusable, which the pointerdown listener owns.
        const next = event.relatedTarget;
        if (next && !event.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="btn btn-ghost px-2 aria-expanded:bg-surface-2 aria-expanded:text-fg md:w-full md:justify-start"
      >
        <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden>
          <circle
            cx="8"
            cy="8"
            r="5.75"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M8 2.25a5.75 5.75 0 0 0 0 11.5z" fill="currentColor" />
        </svg>
        <span className="sr-only md:not-sr-only">Motyw</span>
      </button>

      <div
        id={panelId}
        role="group"
        aria-label="Motyw"
        hidden={!open}
        className="absolute top-full right-0 z-30 mt-2 w-64 rounded-xl border border-line bg-surface p-3 shadow-xl md:top-auto md:right-auto md:bottom-full md:left-0 md:mt-0 md:mb-2"
      >
        <fieldset>
          <legend className="label">Tryb</legend>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1">
            {THEME_MODES.map((mode) => (
              <label
                key={mode}
                className="cursor-pointer rounded-md px-1 py-1.5 text-center text-xs text-muted transition-colors hover:text-fg has-checked:bg-surface has-checked:font-medium has-checked:text-fg has-checked:shadow-sm has-checked:ring-1 has-checked:ring-line has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
              >
                <input
                  type="radio"
                  name="theme-mode"
                  value={mode}
                  checked={selected.mode === mode}
                  onChange={() => choose({ ...selected, mode })}
                  className="sr-only"
                />
                {MODE_LABELS[mode]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-3">
          <legend className="label">Paleta</legend>
          <div className="space-y-0.5">
            {THEME_PALETTES.map((palette) => (
              <label
                key={palette}
                className="group flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg has-checked:bg-accent-soft has-checked:font-medium has-checked:text-fg has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
              >
                <input
                  type="radio"
                  name="theme-palette"
                  value={palette}
                  checked={selected.palette === palette}
                  onChange={() => choose({ ...selected, palette })}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  data-palette={palette}
                  className="flex h-5 w-9 shrink-0 overflow-hidden rounded border border-line"
                >
                  <span className="flex-1 bg-bg" />
                  <span className="flex-1 bg-accent-soft" />
                  <span className="flex-1 bg-accent" />
                </span>
                {PALETTE_LABELS[palette]}
                <svg
                  viewBox="0 0 16 16"
                  className="ml-auto hidden size-4 shrink-0 group-has-checked:block"
                  aria-hidden
                >
                  <path
                    d="M3.5 8.5l3 3 6-6.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
