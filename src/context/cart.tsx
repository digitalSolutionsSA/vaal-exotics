import React, { createContext, useContext, useMemo, useState } from "react";
import { calcCourierFee } from "../lib/shipping";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  chargeableKg: number;

  // Optional metadata so courier weight can be derived more intelligently
  category?: string;
  size?: string;
  variantLabel?: string;
};

type AddCartItemInput = Omit<CartItem, "qty" | "chargeableKg"> & {
  chargeableKg?: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: AddCartItemInput, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;

  itemsTotal: number;
  totalKg: number;
  courierFee: number;
  courierBracket: string;
  grandTotal: number;
};

const CartCtx = createContext<CartState | null>(null);

function asFiniteNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeText(value: any) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function looksLikeGrowKit(item: Partial<CartItem> | AddCartItemInput) {
  const haystack = [
    normalizeText(item.category),
    normalizeText(item.name),
    normalizeText(item.id),
  ].join(" ");

  return (
    haystack.includes("grow kit") ||
    haystack.includes("growkit") ||
    haystack.includes("/grow-kits") ||
    haystack.includes("mushrooms/grow-kits")
  );
}

function extractGrowKitSize(item: Partial<CartItem> | AddCartItemInput) {
  const candidates = [
    normalizeText((item as any).size),
    normalizeText((item as any).variantLabel),
    normalizeText(item.name),
  ].filter(Boolean);

  for (const text of candidates) {
    if (text.includes("2.5l") || text.includes("2,5l")) return "2.5l";
    if (text.includes("20l")) return "20l";
    if (text.includes("5l")) return "5l";
    if (text.includes("1l")) return "1l";
    if (text.includes("box")) return "box";
  }

  return "";
}

function getGrowKitChargeableKg(size: string) {
  switch (normalizeText(size)) {
    case "1l":
      return 1;
    case "2.5l":
    case "2,5l":
      return 1.5;
    case "5l":
      return 2.5;
    case "20l":
      return 10;
    case "box":
      return 1.5;
    default:
      return 0;
  }
}

function resolveChargeableKg(item: AddCartItemInput) {
  if (looksLikeGrowKit(item)) {
    const detectedSize = extractGrowKitSize(item);
    const mappedKg = getGrowKitChargeableKg(detectedSize);

    if (mappedKg > 0) {
      return mappedKg;
    }
  }

  return Math.max(0, asFiniteNumber(item.chargeableKg, 0));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem: CartState["addItem"] = (item, qty = 1) => {
    const resolvedQty = Math.max(1, Math.floor(asFiniteNumber(qty, 1)));
    const resolvedChargeableKg = resolveChargeableKg(item);

    setItems((prev) => {
      const found = prev.find((p) => p.id === item.id);

      if (found) {
        return prev.map((p) =>
          p.id === item.id
            ? {
                ...p,
                qty: p.qty + resolvedQty,
                price: asFiniteNumber(item.price, p.price),
                chargeableKg: resolvedChargeableKg,
                category: item.category ?? p.category,
                size: item.size ?? p.size,
                variantLabel: item.variantLabel ?? p.variantLabel,
              }
            : p
        );
      }

      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: asFiniteNumber(item.price, 0),
          qty: resolvedQty,
          chargeableKg: resolvedChargeableKg,
          category: item.category,
          size: item.size,
          variantLabel: item.variantLabel,
        },
      ];
    });
  };

  const setQty: CartState["setQty"] = (id, qty) => {
    setItems((prev) => {
      const nextQty = Math.max(0, Math.floor(asFiniteNumber(qty, 0)));
      if (nextQty <= 0) return prev.filter((p) => p.id !== id);
      return prev.map((p) => (p.id === id ? { ...p, qty: nextQty } : p));
    });
  };

  const removeItem: CartState["removeItem"] = (id) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  const clear = () => setItems([]);

  const derived = useMemo(() => {
    const itemsTotal = items.reduce(
      (sum, it) => sum + asFiniteNumber(it.price) * asFiniteNumber(it.qty),
      0
    );

    const totalKg = items.reduce(
      (sum, it) => sum + asFiniteNumber(it.chargeableKg) * asFiniteNumber(it.qty),
      0
    );

    const { courierFee, bracket } = calcCourierFee(totalKg);
    const grandTotal = itemsTotal + courierFee;

    return { itemsTotal, totalKg, courierFee, courierBracket: bracket, grandTotal };
  }, [items]);

  const value: CartState = {
    items,
    addItem,
    setQty,
    removeItem,
    clear,
    ...derived,
  };

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}