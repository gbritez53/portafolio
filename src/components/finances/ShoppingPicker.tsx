import { useEffect, useState } from "react";
import { Check, ShoppingBasket } from "lucide-react";
import { labelClass } from "@/components/finances/FinanceDialog";
import { formatAmount } from "@/lib/finance/money";
import { getShoppingItems } from "@/lib/shopping-api";
import type { ShoppingItem } from "@/types/shopping";

interface ShoppingPickerProps {
  selected: ShoppingItem[];
  onChange: (items: ShoppingItem[]) => void;
}

// Productos ya tildados en la lista del super compartida, para anotarlos como un gasto.
// Si la lista no carga, el formulario sigue funcionando igual: esto es un atajo.
export function ShoppingPicker({ selected, onChange }: ShoppingPickerProps) {
  const [items, setItems] = useState<ShoppingItem[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getShoppingItems(controller.signal)
      .then((list) => setItems(list.filter((item) => item.checked)))
      .catch(() => { if (!controller.signal.aborted) setItems([]); });
    return () => controller.abort();
  }, []);

  if (!items || items.length === 0) return null;

  const chosen = new Set(selected.map((item) => item.id));
  const toggle = (item: ShoppingItem) => onChange(chosen.has(item.id) ? selected.filter((entry) => entry.id !== item.id) : [...selected, item]);
  const all = selected.length === items.length;

  return (
    <fieldset className="rounded-2xl bg-[var(--surface-muted)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <legend className={`${labelClass} mb-0 flex items-center gap-2`}>
          <ShoppingBasket aria-hidden="true" className="size-4" /> Desde la lista del súper
        </legend>
        <button type="button" onClick={() => onChange(all ? [] : items)} className="text-xs font-extrabold text-[var(--ink)] underline-offset-2 hover:underline">
          {all ? "Quitar todo" : "Elegir todo"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isOn = chosen.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isOn}
              onClick={() => toggle(item)}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition ${isOn ? "border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted-strong)] hover:bg-[var(--surface)]"}`}
            >
              {isOn && <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />}
              {item.name}
              {item.price !== null && <span className="tabular-nums text-[var(--muted)]">{formatAmount(item.price)}</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-[var(--muted-strong)]">Al guardar, lo elegido sale de la lista del súper.</p>
    </fieldset>
  );
}
