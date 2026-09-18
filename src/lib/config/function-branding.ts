/**
 * The one place function → color mapping lives. Every component that needs
 * to reflect a function's brand color (badges, booking cards, the wizard's
 * selected state, QR display, dashboard chips) reads from here — never
 * hardcode a function's hex value in a component.
 *
 * The database is the actual source of truth at runtime (functions.color),
 * since admins can reconfigure colors from Settings. This module supplies:
 *   1. the neutral fallback theme for functions with no custom color yet
 *      (F&L, TM, Finance per the spec), and
 *   2. a small helper to turn any hex into the tint/border/text variants a
 *      component needs, so nothing recomputes shades ad hoc.
 */

export const NEUTRAL_FUNCTION_COLOR = "#5B6470"; // slate — default app theme

export type FunctionBrand = {
  base: string; // solid accent, e.g. for icons/active borders
  tint: string; // light background for badges/cards
  text: string; // accessible text-on-tint color
  ring: string; // focus/selected ring color (same as base, named for clarity)
};

/**
 * Builds the tint/text pair from any base hex at render time, so the DB only
 * needs to store one color per function and components never hardcode a
 * palette per function.
 */
export function buildFunctionBrand(hexColor: string | null | undefined): FunctionBrand {
  const base = hexColor || NEUTRAL_FUNCTION_COLOR;
  return {
    base,
    tint: hexToTint(base),
    text: base,
    ring: base,
  };
}

function hexToTint(hex: string, opacity = 0.12): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
