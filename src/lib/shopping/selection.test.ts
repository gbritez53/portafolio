import { describe, expect, it } from "vitest";
import { summarizeSelection } from "@/lib/shopping/selection";
import type { ShoppingItem } from "@/types/shopping";

const item = (name: string, price: number | null, quantity = ""): ShoppingItem => ({
  id: name, name, quantity, price, checked: true, createdAt: "", updatedAt: "",
});

describe("resumen de lo elegido de la lista del súper", () => {
  it("suma los precios y arma la nota con los productos", () => {
    expect(summarizeSelection([item("Leche", 240, "2 l"), item("Pan", 130)])).toEqual({ amount: 370, note: "Súper: Leche (2 l), Pan", missingPrices: 0 });
  });

  it("avisa cuántos productos no tienen precio", () => {
    expect(summarizeSelection([item("Leche", 240), item("Huevos", null)])).toEqual({ amount: 240, note: "Súper: Leche, Huevos", missingPrices: 1 });
  });

  it("sin ningún precio no propone monto", () => {
    expect(summarizeSelection([item("Huevos", null)])).toEqual({ amount: null, note: "Súper: Huevos", missingPrices: 1 });
  });

  it("sin selección no hay nada que resumir", () => {
    expect(summarizeSelection([])).toEqual({ amount: null, note: "", missingPrices: 0 });
  });
});
