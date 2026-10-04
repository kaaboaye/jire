// Shared by server and client code, so it must stay free of server-only imports.

export const THEME_MODES = ["system", "light", "dark"] as const;
export const THEME_PALETTES = ["teal", "ocean", "forest", "amber", "plum"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];
export type ThemePalette = (typeof THEME_PALETTES)[number];
export type Theme = { mode: ThemeMode; palette: ThemePalette };

export const MODE_LABELS: Record<ThemeMode, string> = {
  system: "Systemowy",
  light: "Jasny",
  dark: "Ciemny",
};

export const PALETTE_LABELS: Record<ThemePalette, string> = {
  teal: "Turkusowa",
  ocean: "Oceaniczna",
  forest: "Leśna",
  amber: "Bursztynowa",
  plum: "Śliwkowa",
};

export const DEFAULT_THEME: Theme = { mode: "system", palette: "teal" };

export const THEME_MODE_COOKIE = "jire-theme-mode";
export const THEME_PALETTE_COOKIE = "jire-theme-palette";

export function isThemeMode(value: unknown): value is ThemeMode {
  return THEME_MODES.includes(value as ThemeMode);
}

export function isThemePalette(value: unknown): value is ThemePalette {
  return THEME_PALETTES.includes(value as ThemePalette);
}

/** Cookies are user input: anything unknown falls back to the default theme. */
export function parseTheme(mode: unknown, palette: unknown): Theme {
  return {
    mode: isThemeMode(mode) ? mode : DEFAULT_THEME.mode,
    palette: isThemePalette(palette) ? palette : DEFAULT_THEME.palette,
  };
}
