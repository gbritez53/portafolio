import { describe, expect, it } from "vitest";
import { parseIds, parseItemPatch, parseNewItem } from "@/lib/shopping/input";

const id = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

describe("alta de un producto", () => {
  it("acepta nombre, cantidad y precio opcional en céntimos", () => {
    expect(parseNewItem({ id, name: "  Leche ", quantity: "2 l", price: 240 })).toEqual({ id, name: "Leche", quantity: "2 l", price: 240 });
    expect(parseNewItem({ id, name: "Pan" })).toEqual({ id, name: "Pan", quantity: "", price: null });
  });

  it("rechaza nombre vacío, id inválido o precio negativo o con decimales", () => {
    expect(parseNewItem({ id, name: "   " })).toBeNull();
    expect(parseNewItem({ id: "1", name: "Pan" })).toBeNull();
    expect(parseNewItem({ id, name: "Pan", price: -1 })).toBeNull();
    expect(parseNewItem({ id, name: "Pan", price: 1.5 })).toBeNull();
    expect(parseNewItem({ id, name: "x".repeat(121) })).toBeNull();
  });
});

describe("cambios sobre un producto", () => {
  it("solo trae los campos enviados, con el estado explícito", () => {
    expect(parseItemPatch({ id, checked: true })).toEqual({ id, checked: true });
    expect(parseItemPatch({ id, name: "Huevos", price: null })).toEqual({ id, name: "Huevos", price: null });
  });

  it("rechaza un cambio vacío o con tipos inválidos", () => {
    expect(parseItemPatch({ id })).toBeNull();
    expect(parseItemPatch({ id, checked: "si" })).toBeNull();
    expect(parseItemPatch({ id, name: "" })).toBeNull();
  });
});

describe("borrado", () => {
  it("acepta una lista no vacía de ids únicos", () => {
    expect(parseIds({ ids: [id] })).toEqual([id]);
    expect(parseIds({ ids: [] })).toBeNull();
    expect(parseIds({ ids: [id, id] })).toBeNull();
    expect(parseIds({ ids: ["nope"] })).toBeNull();
  });
});
