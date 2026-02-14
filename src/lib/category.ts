// src/lib/category.ts

// ✅ Single source of truth for category strings (use these everywhere)
export const CATEGORY = {
  growkits: "Mushroom Grow Kits",
  grain: "Mushroom Grain & Cultures",
  supplies: "Mushroom Cultivation Supplies",
  medicinal: "Medicinal Mushroom Supplements",
  bulk: "Bulk Herbal Products",
} as const;

export const CATEGORIES = Object.values(CATEGORY);
export type Category = (typeof CATEGORIES)[number];

// ✅ Normalizer (keep it for search/filter UI)
export function normCategory(input: string) {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ");
}

// ✅ Map any input (even "and" vs "&") to one of the official categories, if possible
export function toCategory(input: string): Category | null {
  const n = normCategory(input);

  for (const c of CATEGORIES) {
    if (normCategory(c) === n) return c;
  }

  return null;
}
