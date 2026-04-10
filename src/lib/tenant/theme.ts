import type { CSSProperties } from "react";

import { DEFAULT_ACCENT_COLOR, DEFAULT_THEME_COLOR } from "@/lib/constants";

function normalizeHex(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim();
  const validHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized);

  return validHex ? normalized : fallback;
}

function toRgb(hex: string) {
  const clean = hex.replace("#", "");
  const source =
    clean.length === 3 ? clean.split("").map((char) => `${char}${char}`).join("") : clean;

  const value = Number.parseInt(source, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = toRgb(hex);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getTenantThemeStyle(
  themeColor?: string | null,
  accentColor?: string | null,
): CSSProperties {
  const primary = normalizeHex(themeColor, DEFAULT_THEME_COLOR);
  const accent = normalizeHex(accentColor, DEFAULT_ACCENT_COLOR);

  return {
    ["--brand" as string]: primary,
    ["--brand-soft" as string]: rgba(primary, 0.14),
    ["--accent" as string]: accent,
    ["--accent-soft" as string]: rgba(accent, 0.16),
  };
}
