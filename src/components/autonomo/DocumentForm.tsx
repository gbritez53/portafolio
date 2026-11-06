import { useState, type FormEvent } from "react";
import { LoaderCircle, Lock } from "lucide-react";
import { FinanceDialog, inputClass, labelClass, primaryButtonClass } from "@/components/finances/FinanceDialog";
import { MAX_DOCUMENT_NOTE, validateDocumentFile } from "@/lib/autonomo/documents";
import type { DocumentsController } from "@/hooks/useAutonomoDocuments";
import type { DocumentKind, Invoice } from "@/types/autonomo";

export const documentKindLabels: Record<DocumentKind, string> = {
  invoice: "Factura",
  receipt: "Ticket o justificante",
  tax: "Modelo o Hacienda",
  social: "Seguridad Social",
  other: "Otro",
};

interface DocumentFormProps {
  invoices: Invoice[];
  defaultDate: string;
  onUpload: DocumentsController["upload"];
  onClose: () => void;
}

export function DocumentForm({ invoices, defaultDate, onUpload, onClose }: DocumentFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<DocumentKind>("invoice");
  const [date, setDate] = useState(defaultDate);
  const [invoiceId, setInvoiceId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const sortedInvoices = [...invoices].sort((a, b) => b.date.localeCompare(a.date));

  const pickInvoice = (id: string) => {
    setInvoiceId(id);
    const invoice = invoices.find((item) => item.id === id);
    if (invoice) {
      setDate(invoice.date);
      setKind("invoice");
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!file) return setError("Elige un archivo.");
    const problem = validateDocumentFile(file);
    if (problem) return setError(problem);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Elige una fecha.");
    setSubmitting(true);
    try {
      await onUpload(file, { kind, date, invoiceId: invoiceId || null, note });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo subir el documento.");
      setSubmitting(false);
    }
  };

  return (
    <FinanceDialog eyebrow="Autónomo" title="Subir documento" onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-5 px-5 py-6 sm:px-7 sm:py-7">
        <label className="block">
          <span className={labelClass}>Archivo *</span>
          <input
            type="file"
            accept="application/pdf,image/*,.xml,.csv,.xlsx,.docx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className={`${inputClass} py-3 file:mr-3 file:rounded-full file:border-0 file:bg-[var(--surface-muted)] file:px-3 file:py-1.5 file:text-xs file:font-extrabold file:text-[var(--ink)]`}
          />
          <span className="mt-2 block text-xs text-[var(--muted-strong)]">Hasta 4 MB. PDF, foto, XML…</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Tipo</span>
            <select value={kind} onChange={(event) => setKind(event.target.value as DocumentKind)} className={inputClass}>
              {(Object.keys(documentKindLabels) as DocumentKind[]).map((id) => <option key={id} value={id}>{documentKindLabels[id]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Fecha</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
          </label>
        </div>

        {sortedInvoices.length > 0 && (
          <label className="block">
            <span className={labelClass}>Factura registrada <span className="normal-case tracking-normal text-[var(--muted)]">(opcional)</span></span>
            <select value={invoiceId} onChange={(event) => pickInvoice(event.target.value)} className={inputClass}>
              <option value="">Ninguna</option>
              {sortedInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.date} · {invoice.counterparty}{invoice.number ? ` · ${invoice.number}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className={labelClass}>Nota <span className="normal-case tracking-normal text-[var(--muted)]">(opcional)</span></span>
          <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={MAX_DOCUMENT_NOTE} placeholder="Ticket del portátil" className={inputClass} />
        </label>

        <p className="flex items-center gap-2 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-xs font-bold text-[var(--muted-strong)]">
          <Lock aria-hidden="true" className="size-4 shrink-0" /> Se cifra en este dispositivo antes de subirse: nadie más puede leerlo.
        </p>

        {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}

        <div className="border-t border-[var(--line)] pt-5">
          <button type="submit" disabled={submitting} className={`${primaryButtonClass} w-full`}>
            {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            {submitting ? "Cifrando y subiendo…" : "Subir documento"}
          </button>
        </div>
      </form>
    </FinanceDialog>
  );
}
