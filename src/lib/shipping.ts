// src/lib/courier.ts

export type CourierBracket =
  | "0-5kg"
  | "5-10kg"
  | "10-15kg"
  | "15-20kg"
  | "over-20kg";

export type CourierFeeResult = {
  courierFee: number;
  bracket: CourierBracket;
  kgUsed: number; // sanitized kg (>= 0)
};

/**
 * Courier rates (per your screenshot)
 * 0–5kg   => R100
 * 5–10kg  => R140
 * 10–15kg => R180
 * 15–20kg => R220
 *
 * Over 20kg:
 *  - Auto-extend in 5kg blocks
 *  - +R40 per additional 5kg (or part thereof)
 *
 * Example: 21kg -> 220 + 40 = 260
 *          25kg -> 220 + 40 = 260
 *          26kg -> 220 + 80 = 300
 */
export function calcCourierFee(totalKg: number): CourierFeeResult {
  const kgUsed = Math.max(0, Number.isFinite(totalKg) ? totalKg : 0);

  if (kgUsed <= 5) {
    return { courierFee: 100, bracket: "0-5kg", kgUsed };
  }

  if (kgUsed <= 10) {
    return { courierFee: 140, bracket: "5-10kg", kgUsed };
  }

  if (kgUsed <= 15) {
    return { courierFee: 180, bracket: "10-15kg", kgUsed };
  }

  if (kgUsed <= 20) {
    return { courierFee: 220, bracket: "15-20kg", kgUsed };
  }

  // Auto-extend over 20kg in 5kg blocks (+R40 per block)
  const extraKg = kgUsed - 20;
  const extraBlocks = Math.ceil(extraKg / 5);
  const courierFee = 220 + extraBlocks * 40;

  return { courierFee, bracket: "over-20kg", kgUsed };
}

/**
 * Grow kit weights (per your screenshot)
 * Use this if you want to compute totalKg from cart items that have a size label.
 */
export const GROW_KIT_WEIGHTS_KG: Record<string, number> = {
  "1L": 1,
  "2.5L": 1.5,
  "2,5L": 1.5, // in case your UI uses comma
  "5L": 2.5,
  "20L": 10,
  Box: 1.5,
};

/**
 * Helper to calculate total kg from cart items that have { size, quantity }.
 * If a size isn't found, it's treated as 0kg (better than exploding checkout).
 */
export function calcTotalKgFromGrowKits(
  items: Array<{ size: string; quantity: number }>
): number {
  return items.reduce((sum, item) => {
    const w = GROW_KIT_WEIGHTS_KG[item.size] ?? 0;
    const qty = Math.max(0, item.quantity || 0);
    return sum + w * qty;
  }, 0);
}
