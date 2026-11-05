import { useCallback, useEffect, useRef, useState } from "react";
import { addShoppingItem, deleteShoppingItems, getShoppingItems, updateShoppingItem } from "@/lib/shopping-api";
import type { ShoppingItem, ShoppingItemPatch } from "@/types/shopping";

/** Cada cuanto se traen los cambios de otros miembros mientras la lista esta a la vista. */
const POLL_MS = 20_000;

export interface ShoppingController {
  items: ShoppingItem[];
  ready: boolean;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  add: (draft: Pick<ShoppingItem, "name" | "quantity" | "price">) => Promise<void>;
  update: (patch: ShoppingItemPatch) => Promise<void>;
  remove: (ids: string[]) => Promise<void>;
}

// Lista compartida: tildar se ve al instante (optimista) y se revierte si el servidor falla.
export function useShoppingList(active: boolean): ShoppingController {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Mientras haya escrituras en vuelo no se pisa el estado local con un refresco viejo.
  const pending = useRef(0);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const next = await getShoppingItems(signal);
      if (signal?.aborted || pending.current > 0) return;
      setItems(next);
      setError("");
      setReady(true);
    } catch (reason) {
      if (signal?.aborted) return;
      setError(reason instanceof Error ? reason.message : "No se pudo cargar la lista.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void refresh(controller.signal);
    const intervalId = window.setInterval(() => { if (!document.hidden) void refresh(controller.signal); }, POLL_MS);
    const onVisible = () => { if (!document.hidden) void refresh(controller.signal); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, refresh]);

  const write = useCallback(async (optimistic: (list: ShoppingItem[]) => ShoppingItem[], call: () => Promise<void>) => {
    let previous: ShoppingItem[] = [];
    setItems((list) => { previous = list; return optimistic(list); });
    pending.current += 1;
    try {
      await call();
      setError("");
    } catch (reason) {
      setItems(previous);
      setError(reason instanceof Error ? reason.message : "No se pudo guardar el cambio.");
      throw reason;
    } finally {
      pending.current -= 1;
    }
  }, []);

  const add = useCallback(async (draft: Pick<ShoppingItem, "name" | "quantity" | "price">) => {
    const now = new Date().toISOString();
    const item: ShoppingItem = { id: globalThis.crypto.randomUUID(), ...draft, checked: false, createdAt: now, updatedAt: now };
    await write((list) => [...list, item], async () => {
      const saved = await addShoppingItem({ id: item.id, name: item.name, quantity: item.quantity, price: item.price });
      setItems((list) => list.map((entry) => (entry.id === saved.id ? saved : entry)));
    });
  }, [write]);

  const update = useCallback(async (patch: ShoppingItemPatch) => {
    await write((list) => list.map((entry) => (entry.id === patch.id ? { ...entry, ...patch } : entry)), async () => {
      const saved = await updateShoppingItem(patch);
      setItems((list) => list.map((entry) => (entry.id === saved.id ? saved : entry)));
    });
  }, [write]);

  const remove = useCallback(async (ids: string[]) => {
    const gone = new Set(ids);
    await write((list) => list.filter((entry) => !gone.has(entry.id)), () => deleteShoppingItems(ids).then(() => undefined));
  }, [write]);

  return { items, ready, loading, error, refresh, add, update, remove };
}
