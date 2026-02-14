import React, { createContext, useContext, useMemo, useState } from "react";
import { calcCourierFee } from "../lib/shipping";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  chargeableKg: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem: CartState["addItem"] = (item, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((p) => p.id === item.id);
      if (found) {
        return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + qty } : p));
      }
      return [...prev, { ...item, qty }];
    });
  };

  const setQty: CartState["setQty"] = (id, qty) => {
    setItems((prev) => {
      const nextQty = Math.max(0, Math.floor(qty));
      if (nextQty <= 0) return prev.filter((p) => p.id !== id);
      return prev.map((p) => (p.id === id ? { ...p, qty: nextQty } : p));
    });
  };

  const removeItem: CartState["removeItem"] = (id) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  const clear = () => setItems([]);

  const derived = useMemo(() => {
    const itemsTotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
    const totalKg = items.reduce((sum, it) => sum + it.chargeableKg * it.qty, 0);
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
