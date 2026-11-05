// Cliente de la lista del super compartida (/admin/api/shopping).
import { withBase } from "@/lib/base-path";
import type { NewShoppingItem, ShoppingItem, ShoppingItemPatch } from "@/types/shopping";

async function request<T>(init?: RequestInit): Promise<T> {
  const response = await fetch(withBase("/api/shopping"), {
    cache: "no-store",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!response.ok) {
    let message = "No se pudo completar la operación.";
    try {
      message = ((await response.json()) as { error?: string }).error ?? message;
    } catch {
      // Respuesta sin JSON: se queda el mensaje generico.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

const send = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const getShoppingItems = (signal?: AbortSignal) => request<{ items: ShoppingItem[] }>({ signal }).then((r) => r.items);
export const addShoppingItem = (item: NewShoppingItem) => request<{ item: ShoppingItem }>(send("POST", item)).then((r) => r.item);
export const updateShoppingItem = (patch: ShoppingItemPatch) => request<{ item: ShoppingItem }>(send("PATCH", patch)).then((r) => r.item);
export const deleteShoppingItems = (ids: string[]) => request<{ ok: true }>(send("DELETE", { ids }));
