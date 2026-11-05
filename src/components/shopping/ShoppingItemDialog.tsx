import { useState, type FormEvent } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { FinanceDialog, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/finances/FinanceDialog";
import { amountToInput, parseAmount } from "@/lib/finance/money";
import type { ShoppingItem } from "@/types/shopping";

interface ShoppingItemDialogProps {
  item: ShoppingItem;
  onSave: (patch: Pick<ShoppingItem, "name" | "quantity" | "price">) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

export function ShoppingItemDialog({ item, onSave, onDelete, onClose }: ShoppingItemDialogProps) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [price, setPrice] = useState(item.price === null ? "" : amountToInput(item.price));
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState("");

  const run = async (action: () => Promise<void>, fallback: string) => {
    setSubmitting(true);
    try {
      await action();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : fallback);
      setSubmitting(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) return setError("Escribe el producto.");
    const cents = price.trim() ? parseAmount(price) : null;
    if (price.trim() && cents === null) return setError("Precio no válido, por ejemplo 2,40.");
    await run(() => onSave({ name: name.trim(), quantity: quantity.trim(), price: cents }), "No se pudo guardar.");
  };

  const remove = async () => {
    if (!confirmingDelete) return setConfirmingDelete(true);
    await run(onDelete, "No se pudo borrar.");
  };

  return (
    <FinanceDialog eyebrow="Lista del súper" title="Editar producto" onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-5 px-5 py-6 sm:px-7 sm:py-7">
        <label className="block">
          <span className={labelClass}>Producto *</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoFocus className={inputClass} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className={labelClass}>Cantidad</span>
            <input value={quantity} onChange={(event) => setQuantity(event.target.value)} maxLength={40} placeholder="2 l, 1 kg…" className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Precio</span>
            <input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" placeholder="0,00" className={`${inputClass} tabular-nums`} />
          </label>
        </div>
        {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <button type="button" onClick={() => void remove()} disabled={submitting} className={`${secondaryButtonClass} text-[var(--danger-text)]`}>
            <Trash2 aria-hidden="true" className="size-4" /> {confirmingDelete ? "Confirmar borrado" : "Quitar de la lista"}
          </button>
          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />} Guardar
          </button>
        </div>
      </form>
    </FinanceDialog>
  );
}
