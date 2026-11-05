import type { ShoppingItem } from "@/types/shopping";

export interface SelectionSummary {
  /** Suma de los precios conocidos; null si ninguno tiene precio. */
  amount: number | null;
  note: string;
  missingPrices: number;
}

/** Lo que se propone al anotar como gasto los productos elegidos de la lista del super. */
export function summarizeSelection(items: ShoppingItem[]): SelectionSummary {
  if (items.length === 0) return { amount: null, note: "", missingPrices: 0 };
  const priced = items.filter((item) => item.price !== null);
  const names = items.map((item) => (item.quantity ? `${item.name} (${item.quantity})` : item.name));
  return {
    amount: priced.length ? priced.reduce((sum, item) => sum + (item.price as number), 0) : null,
    note: `Súper: ${names.join(", ")}`,
    missingPrices: items.length - priced.length,
  };
}
