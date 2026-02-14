export type Product = {
  id: string;
  slug: string;
  name: string;
  short: string;
  price: number; // base price (ZAR)
  chargeableKg: number; // used for courier brackets
};

export const PRODUCTS: Product[] = [
  { id: "lion-25", slug: "lions-mane-25l", name: "Lion’s Mane Grow Kit (2.5L)", short: "Fluffy gourmet. Easy indoor grow.", price: 249, chargeableKg: 2.5 },
  { id: "lion-50", slug: "lions-mane-5l", name: "Lion’s Mane Grow Kit (5L)", short: "Bigger kit, bigger harvest.", price: 399, chargeableKg: 5 },

  { id: "king-25", slug: "king-oyster-25l", name: "King Oyster Grow Kit (2.5L)", short: "Meaty texture, chef vibes.", price: 229, chargeableKg: 2.5 },
  { id: "king-50", slug: "king-oyster-5l", name: "King Oyster Grow Kit (5L)", short: "Hearty, thick mushrooms.", price: 369, chargeableKg: 5 },

  { id: "pink-25", slug: "pink-oyster-25l", name: "Pink Oyster Grow Kit (2.5L)", short: "Fast grower, big wow.", price: 219, chargeableKg: 2.5 },
  { id: "blue-25", slug: "blue-oyster-25l", name: "Blue Oyster Grow Kit (2.5L)", short: "Reliable classic oyster.", price: 199, chargeableKg: 2.5 },

  { id: "bundle", slug: "starter-bundle", name: "Starter Bundle", short: "A mix to start immediately.", price: 599, chargeableKg: 7.5 },
];
