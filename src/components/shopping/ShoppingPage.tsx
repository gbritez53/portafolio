import { useState, type FormEvent } from "react";
import { Check, LoaderCircle, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { ShoppingItemDialog } from "@/components/shopping/ShoppingItemDialog";
import { formatAmount, parseAmount } from "@/lib/finance/money";
import { useShoppingList } from "@/hooks/useShoppingList";
import type { ShoppingItem } from "@/types/shopping";

// Lista del super compartida por todo el equipo: pensada para tildar con el pulgar en el super.
export function ShoppingPage({ active }: { active: boolean }) {
  const shopping = useShoppingList(active);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [formError, setFormError] = useState("");
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const pendingItems = shopping.items.filter((item) => !item.checked);
  const inCart = shopping.items.filter((item) => item.checked);
  const cartTotal = inCart.reduce((sum, item) => sum + (item.price ?? 0), 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!name.trim()) return;
    const cents = price.trim() ? parseAmount(price) : null;
    if (price.trim() && cents === null) return setFormError("Precio no válido, por ejemplo 2,40.");
    // Se limpia enseguida para seguir anotando; si falla, el error aparece arriba.
    setName("");
    setPrice("");
    await shopping.add({ name: name.trim(), quantity: "", price: cents }).catch(() => {});
  };

  const setChecked = (item: ShoppingItem, checked: boolean) => void shopping.update({ id: item.id, checked }).catch(() => {});

  const clearCart = async () => {
    if (!confirmClear) return setConfirmClear(true);
    setConfirmClear(false);
    await shopping.remove(inCart.map((item) => item.id)).catch(() => {});
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="relative isolate overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#2e3127_0%,#171917_55%,#0e0f0c_100%)] px-5 py-4 text-white shadow-[0_14px_38px_rgba(23,25,23,0.28)] sm:px-7 sm:py-5 lg:px-8">
        <div className="absolute -right-12 -top-20 -z-10 size-52 rounded-full border-[34px] border-[#c9f568]/10" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold text-white/70">Compartida con todo el equipo</p>
            <h1 className="font-display text-[clamp(1.35rem,4.5vw,2rem)] font-bold leading-tight tracking-[-0.03em]">Lista del súper</h1>
          </div>
          <button type="button" onClick={() => void shopping.refresh()} aria-label="Actualizar la lista" className="grid size-11 shrink-0 place-items-center rounded-full border border-white/25 bg-white/12 transition hover:bg-white/20">
            <RefreshCw aria-hidden="true" className={`size-4 ${shopping.loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <form onSubmit={(event) => void submit(event)} className="flex gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Añadir… (leche, pan)"
          aria-label="Producto"
          enterKeyHint="done"
          maxLength={120}
          className="min-h-13 min-w-0 flex-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-base font-bold text-[var(--ink)] outline-none placeholder:font-medium placeholder:text-[var(--muted)] focus:border-[var(--line-strong)] focus:ring-3 focus:ring-[#c9f568]/35"
        />
        <input
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder="€"
          aria-label="Precio (opcional)"
          inputMode="decimal"
          className="min-h-13 w-20 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 text-center text-base font-bold tabular-nums text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--line-strong)] focus:ring-3 focus:ring-[#c9f568]/35"
        />
        <button type="submit" aria-label="Añadir a la lista" disabled={!name.trim()} className="grid min-h-13 w-13 shrink-0 place-items-center rounded-2xl bg-[#c9f568] text-[#171917] shadow-[0_6px_16px_rgba(201,245,104,0.25)] transition active:scale-[0.96] disabled:opacity-50">
          <Plus aria-hidden="true" className="size-6" strokeWidth={2.8} />
        </button>
      </form>

      {(formError || shopping.error) && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{formError || shopping.error}</p>}

      {!shopping.ready ? (
        <div className="grid place-items-center py-16 text-[var(--ink)]">
          <LoaderCircle aria-hidden="true" className="size-6 animate-spin" />
          <p className="mt-3 text-sm font-bold">Cargando la lista…</p>
        </div>
      ) : (
        <>
          {pendingItems.length === 0 ? (
            <p className="rounded-[22px] border border-dashed border-[var(--line)] px-5 py-8 text-center text-sm font-bold text-[var(--muted-strong)]">
              {inCart.length ? "¡Todo en el carrito!" : "La lista está vacía. Añade lo que haga falta."}
            </p>
          ) : (
            <ItemList items={pendingItems} onCheck={(item) => setChecked(item, true)} onEdit={setEditing} />
          )}

          {inCart.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3 px-1">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--muted-strong)]">
                  En el carrito · {inCart.length}{cartTotal > 0 && ` · ${formatAmount(cartTotal)}`}
                </h2>
                <button type="button" onClick={() => void clearCart()} onBlur={() => setConfirmClear(false)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-xs font-extrabold text-[var(--danger-text)] transition hover:bg-[var(--surface-muted)]">
                  <Trash2 aria-hidden="true" className="size-3.5" /> {confirmClear ? "¿Seguro?" : "Borrar comprados"}
                </button>
              </div>
              <ItemList items={inCart} onCheck={(item) => setChecked(item, false)} onEdit={setEditing} />
              <p className="px-1 text-xs text-[var(--muted-strong)]">Para anotarlo como gasto: Gastos → Anotar → «Desde la lista del súper».</p>
            </section>
          )}
        </>
      )}

      {editing && (
        <ShoppingItemDialog
          item={editing}
          onSave={(patch) => shopping.update({ id: editing.id, ...patch })}
          onDelete={() => shopping.remove([editing.id])}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ItemList({ items, onCheck, onEdit }: { items: ShoppingItem[]; onCheck: (item: ShoppingItem) => void; onEdit: (item: ShoppingItem) => void }) {
  return (
    <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--surface)]">
      {items.map((item) => (
        <li key={item.id} className="flex items-stretch">
          {/* Toda la fila es el check: facil de acertar con el pulgar. */}
          <button type="button" role="checkbox" aria-checked={item.checked} onClick={() => onCheck(item)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 text-left transition active:bg-[var(--surface-muted)]">
            <span className={`grid size-7 shrink-0 place-items-center rounded-full border-2 transition ${item.checked ? "border-transparent bg-[var(--success-soft)] text-[var(--success-text)]" : "border-[var(--line-strong)]"}`}>
              {item.checked && <Check aria-hidden="true" className="size-4" strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-base font-bold ${item.checked ? "text-[var(--muted-strong)] line-through" : "text-[var(--ink)]"}`}>{item.name}</span>
              {item.quantity && <span className="block truncate text-xs text-[var(--muted-strong)]">{item.quantity}</span>}
            </span>
            {item.price !== null && <span className="shrink-0 text-sm font-bold tabular-nums text-[var(--muted-strong)]">{formatAmount(item.price)}</span>}
          </button>
          <button type="button" onClick={() => onEdit(item)} aria-label={`Editar ${item.name}`} className="grid w-12 shrink-0 place-items-center text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]">
            <Pencil aria-hidden="true" className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
