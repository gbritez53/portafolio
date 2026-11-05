// Validacion de lo que llega a /admin/api/shopping. Devuelve null ante cualquier dato invalido.
import { isUuid } from "@/lib/server/http";
import type { NewShoppingItem, ShoppingItemPatch } from "@/types/shopping";

export const MAX_NAME = 120;
export const MAX_QUANTITY = 40;
const MAX_PRICE = 100_000_00;
const MAX_IDS = 200;

type Body = Record<string, unknown> | null;

const cleanName = (value: unknown) => (typeof value === "string" ? value.trim() : null);
const validName = (name: string | null): name is string => !!name && name.length <= MAX_NAME;
const validQuantity = (value: unknown): value is string => typeof value === "string" && value.trim().length <= MAX_QUANTITY;
const validPrice = (value: unknown): value is number | null =>
  value === null || (Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_PRICE);

export function parseNewItem(body: Body): NewShoppingItem | null {
  const name = cleanName(body?.name);
  const quantity = body?.quantity ?? "";
  const price = body?.price ?? null;
  if (!isUuid(body?.id) || !validName(name) || !validQuantity(quantity) || !validPrice(price)) return null;
  return { id: body.id as string, name, quantity: quantity.trim(), price };
}

export function parseItemPatch(body: Body): ShoppingItemPatch | null {
  if (!isUuid(body?.id)) return null;
  const patch: ShoppingItemPatch = { id: body.id as string };
  if ("name" in body) {
    const name = cleanName(body.name);
    if (!validName(name)) return null;
    patch.name = name;
  }
  if ("quantity" in body) {
    if (!validQuantity(body.quantity)) return null;
    patch.quantity = body.quantity.trim();
  }
  if ("price" in body) {
    if (!validPrice(body.price)) return null;
    patch.price = body.price;
  }
  if ("checked" in body) {
    if (typeof body.checked !== "boolean") return null;
    patch.checked = body.checked;
  }
  return Object.keys(patch).length > 1 ? patch : null;
}

export function parseIds(body: Body): string[] | null {
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_IDS || !ids.every(isUuid)) return null;
  return new Set(ids).size === ids.length ? ids : null;
}
