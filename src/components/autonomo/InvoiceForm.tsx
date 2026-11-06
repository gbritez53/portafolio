import { useState, type FormEvent } from "react";
import { FileText, LoaderCircle, Paperclip, Trash2 } from "lucide-react";
import { FinanceDialog, inputClass, labelClass, primaryButtonClass, secondaryButtonClass, Select } from "@/components/finances/FinanceDialog";
import { validateDocumentFile } from "@/lib/autonomo/documents";
import { invoiceAmounts, suggestWithholding } from "@/lib/autonomo/invoice";
import { amountToInput, formatAmount, parseAmount } from "@/lib/finance/money";
import { getTodayKey } from "@/lib/dates";
import { saveFile } from "@/lib/save-file";
import { VAT_RATES, WITHHOLDING_RATES, type AutonomoDocument, type AutonomoSettings, type CounterpartyType, type Invoice, type InvoiceDraft, type InvoiceKind, type VatRate, type WithholdingRate } from "@/types/autonomo";

interface InvoiceFormProps {
  invoice?: Invoice;
  settings: AutonomoSettings;
  defaultDate?: string;
  /** `id` es el de la factura (el actual o uno nuevo generado aqui). */
  onSave: (draft: InvoiceDraft, id: string) => Promise<void>;
  /** PDFs ya guardados de esta factura. */
  attachments: AutonomoDocument[];
  onAttach: (file: File, invoiceId: string, draft: InvoiceDraft) => Promise<void>;
  onOpenAttachment: (document: AutonomoDocument) => Promise<Blob>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

const kinds: { id: InvoiceKind; label: string }[] = [
  { id: "issued", label: "Emitida" },
  { id: "received", label: "Recibida" },
];

export const counterpartyLabels: Record<CounterpartyType, string> = {
  company: "Empresa en España",
  freelancer: "Autónomo en España",
  individual: "Particular",
  foreign: "Extranjero",
};

export function InvoiceForm({ invoice, settings, defaultDate, onSave, attachments, onAttach, onOpenAttachment, onDelete, onClose }: InvoiceFormProps) {
  // El id existe desde el principio para poder adjuntar el PDF antes de guardar la factura.
  const [invoiceId] = useState(() => invoice?.id ?? globalThis.crypto.randomUUID());
  const [file, setFile] = useState<File | null>(null);
  // Si el PDF ya subio y fallo guardar la factura, reintentar no lo sube dos veces.
  const [fileUploaded, setFileUploaded] = useState(false);
  const [kind, setKind] = useState<InvoiceKind>(invoice?.kind ?? "issued");
  const [number, setNumber] = useState(invoice?.number ?? "");
  const [date, setDate] = useState(invoice?.date ?? defaultDate ?? getTodayKey());
  const [counterparty, setCounterparty] = useState(invoice?.counterparty ?? "");
  const [counterpartyType, setCounterpartyType] = useState<CounterpartyType>(invoice?.counterpartyType ?? "company");
  const [base, setBase] = useState(invoice ? amountToInput(invoice.base) : "");
  const [vatRate, setVatRate] = useState<VatRate>(invoice?.vatRate ?? 21);
  // Mientras no la toques, la retencion sigue a la sugerencia de la guia (tipo de cliente y año de alta).
  const [manualWithholding, setManualWithholding] = useState<WithholdingRate | null>(invoice ? invoice.withholdingRate : null);
  const [deductible, setDeductible] = useState(invoice?.deductible ?? true);
  const [note, setNote] = useState(invoice?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState("");

  const suggested = suggestWithholding({ kind, counterpartyType, date }, settings);
  const withholdingRate = manualWithholding ?? suggested;
  const cents = parseAmount(base);
  const amounts = cents === null ? null : invoiceAmounts({ base: cents, vatRate, withholdingRate });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (cents === null) return setError("Escribe una base imponible válida, por ejemplo 900,00.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Elige una fecha.");
    if (!counterparty.trim()) return setError(kind === "issued" ? "Escribe el cliente." : "Escribe el proveedor.");
    const fileProblem = file ? validateDocumentFile(file) : "";
    if (fileProblem) return setError(fileProblem);

    setSubmitting(true);
    const draft: InvoiceDraft = { kind, number, date, counterparty, counterpartyType, base: cents, vatRate, withholdingRate, deductible: kind === "received" ? deductible : true, note };
    try {
      // Primero el PDF: si falla no queda una factura nueva a medias que se duplique al reintentar.
      if (file && !fileUploaded) {
        await onAttach(file, invoiceId, draft);
        setFileUploaded(true);
      }
      await onSave(draft, invoiceId);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar la factura.");
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!onDelete) return;
    if (!confirmingDelete) return setConfirmingDelete(true);
    setSubmitting(true);
    try {
      await onDelete();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo borrar la factura.");
      setSubmitting(false);
    }
  };

  return (
    <FinanceDialog eyebrow="Autónomo" title={invoice ? "Editar factura" : "Registrar factura"} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-5 px-5 py-6 sm:px-7 sm:py-7">
        <div role="radiogroup" aria-label="Tipo de factura" className="grid grid-cols-2 gap-1 rounded-2xl bg-[var(--surface-muted)] p-1">
          {kinds.map((option) => {
            const selected = kind === option.id;
            const tone = option.id === "issued" ? "bg-[var(--success-soft)] text-[var(--success-text)]" : "bg-[var(--danger-soft)] text-[var(--danger-text)]";
            return (
              <button key={option.id} type="button" role="radio" aria-checked={selected} onClick={() => setKind(option.id)} className={`min-h-10 rounded-xl text-sm font-extrabold transition ${selected ? `${tone} shadow-sm` : "text-[var(--muted-strong)] hover:text-[var(--ink)]"}`}>
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>{kind === "issued" ? "Cliente *" : "Proveedor *"}</span>
            <input value={counterparty} onChange={(event) => setCounterparty(event.target.value)} autoFocus className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Número</span>
            <input value={number} onChange={(event) => setNumber(event.target.value)} placeholder="2026-001" className={inputClass} />
          </label>
        </div>

        <fieldset>
          <legend className={labelClass}>{kind === "issued" ? "Tipo de cliente" : "Tipo de proveedor"}</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(counterpartyLabels) as CounterpartyType[]).map((type) => (
              <button key={type} type="button" aria-pressed={counterpartyType === type} onClick={() => setCounterpartyType(type)} className={`min-h-10 rounded-full border px-3.5 text-xs font-extrabold transition ${counterpartyType === type ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]" : "border-[var(--line)] text-[var(--ink)] hover:bg-[var(--surface-muted)]"}`}>
                {counterpartyLabels[type]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className={labelClass}>Base imponible *</span>
            <div className="relative">
              <input value={base} onChange={(event) => setBase(event.target.value)} inputMode="decimal" placeholder="0,00" className={`${inputClass} pr-10 text-xl tabular-nums`} />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-base font-extrabold text-[var(--muted)]">€</span>
            </div>
          </label>
          <label className="block">
            <span className={labelClass}>Fecha</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>IVA</span>
            <Select value={vatRate} onChange={(event) => setVatRate(Number(event.target.value) as VatRate)}>
              {VAT_RATES.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
            </Select>
          </label>
          <label className="block">
            <span className={labelClass}>Retención IRPF</span>
            <Select value={withholdingRate} onChange={(event) => setManualWithholding(Number(event.target.value) as WithholdingRate)}>
              {WITHHOLDING_RATES.map((rate) => <option key={rate} value={rate}>{rate}%{rate === suggested ? " (sugerida)" : ""}</option>)}
            </Select>
          </label>
        </div>

        {kind === "received" && (
          <label className="flex items-center gap-3 text-sm font-bold text-[var(--ink)]">
            <input type="checkbox" checked={deductible} onChange={(event) => setDeductible(event.target.checked)} className="size-4" />
            Gasto deducible de la actividad (cuenta en el 303 y el 130)
          </label>
        )}

        <label className="block">
          <span className={labelClass}>Nota</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="50% inicial, hosting anual…" className={inputClass} />
        </label>

        <div>
          <span className={labelClass}>PDF de la factura <span className="normal-case tracking-normal text-[var(--muted)]">(opcional)</span></span>
          {attachments.length > 0 && (
            <ul className="mb-2 space-y-1">
              {attachments.map((attachment) => (
                <li key={attachment.id}>
                  <button type="button" onClick={() => void onOpenAttachment(attachment).then((blob) => saveFile(blob, attachment.name)).catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudo abrir el PDF."))} className="flex min-h-10 w-full items-center gap-2 rounded-xl bg-[var(--surface-muted)] px-3 text-left text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--line)]">
                    <FileText aria-hidden="true" className="size-4 shrink-0 text-[var(--muted-strong)]" />
                    <span className="truncate">{attachment.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-[var(--line)] px-4 text-sm font-bold text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]">
            <Paperclip aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{file ? file.name : attachments.length ? "Adjuntar otro archivo" : "Adjuntar PDF (hasta 4 MB, se cifra)"}</span>
            <input type="file" accept="application/pdf,image/*" disabled={fileUploaded} onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="sr-only" />
          </label>
        </div>

        {amounts && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm tabular-nums text-[var(--ink)]">
            <dt className="font-bold">Base</dt><dd className="text-right">{formatAmount(amounts.base)}</dd>
            <dt className="font-bold">+ IVA {vatRate}%</dt><dd className="text-right">{formatAmount(amounts.vat)}</dd>
            <dt className="font-bold">− Retención {withholdingRate}%</dt><dd className="text-right">{formatAmount(amounts.withholding)}</dd>
            <dt className="font-extrabold">{kind === "issued" ? "Te paga el cliente" : "Pagas"}</dt><dd className="text-right font-extrabold">{formatAmount(amounts.total)}</dd>
          </dl>
        )}

        {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {onDelete ? (
            <button type="button" onClick={() => void remove()} disabled={submitting} className={`${secondaryButtonClass} text-[var(--danger-text)]`}>
              <Trash2 aria-hidden="true" className="size-4" /> {confirmingDelete ? "Confirmar borrado" : "Borrar"}
            </button>
          ) : <span />}
          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />} Guardar factura
          </button>
        </div>
      </form>
    </FinanceDialog>
  );
}
