import { useState } from "react";
import { Download, FileText, LoaderCircle, Paperclip, Trash2, Upload } from "lucide-react";
import { DocumentForm, documentKindLabels } from "@/components/autonomo/DocumentForm";
import { formatShortDate } from "@/lib/dates";
import { saveFile } from "@/lib/save-file";
import type { DocumentsController } from "@/hooks/useAutonomoDocuments";
import type { AutonomoDocument, Invoice } from "@/types/autonomo";

interface DocumentsPanelProps {
  documents: DocumentsController;
  invoices: Invoice[];
  year: number;
  defaultDate: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function DocumentsPanel({ documents, invoices, year, defaultDate }: DocumentsPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const visible = documents.documents
    .filter((item) => item.date.startsWith(`${year}-`))
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));

  const download = async (item: AutonomoDocument) => {
    setError("");
    setBusyId(item.id);
    try {
      // Se descifra en memoria: el archivo nunca pasa en claro por el servidor.
      saveFile(await documents.open(item), item.name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo abrir el documento.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: AutonomoDocument) => {
    if (confirmId !== item.id) return setConfirmId(item.id);
    setError("");
    setBusyId(item.id);
    try {
      await documents.remove(item.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo borrar el documento.");
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  return (
    <section className="space-y-2" aria-labelledby="autonomo-documents">
      <div className="flex items-center justify-between gap-3">
        <h3 id="autonomo-documents" className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--muted-strong)]">Documentos {year}</h3>
        <button type="button" onClick={() => setUploading(true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-xs font-extrabold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]">
          <Upload aria-hidden="true" className="size-3.5" /> Subir documento
        </button>
      </div>

      {(error || documents.error) && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error || documents.error}</p>}

      {!documents.ready ? (
        <p className="flex items-center gap-2 px-1 py-3 text-sm font-bold text-[var(--muted-strong)]"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> Descifrando documentos…</p>
      ) : visible.length === 0 ? (
        <p className="rounded-[22px] border border-dashed border-[var(--line)] px-5 py-6 text-center text-sm font-bold text-[var(--muted-strong)]">
          No hay documentos de {year}. Sube aquí tus facturas en PDF, tickets y justificantes de Hacienda.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--surface)]">
          {visible.map((item) => {
            const invoice = item.invoiceId ? invoiceById.get(item.invoiceId) : undefined;
            const busy = busyId === item.id;
            return (
              <li key={item.id} className="flex items-center gap-2 px-4 py-2.5 sm:px-5">
                <button type="button" onClick={() => void download(item)} disabled={busy} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-60">
                  {busy ? <LoaderCircle aria-hidden="true" className="size-5 shrink-0 animate-spin text-[var(--muted)]" /> : <FileText aria-hidden="true" className="size-5 shrink-0 text-[var(--muted-strong)]" />}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold text-[var(--ink)]">{item.name}</span>
                    <span className="block truncate text-xs text-[var(--muted-strong)]">
                      {formatShortDate(item.date)} · {documentKindLabels[item.kind]} · {formatSize(item.size)}
                      {invoice && <> · <Paperclip aria-hidden="true" className="inline size-3" /> {invoice.counterparty}{invoice.number && ` ${invoice.number}`}</>}
                      {item.note && ` · ${item.note}`}
                    </span>
                  </span>
                  <Download aria-label={`Descargar ${item.name}`} className="ml-auto size-4 shrink-0 text-[var(--muted)]" />
                </button>
                <button
                  type="button"
                  onClick={() => void remove(item)}
                  onBlur={() => setConfirmId((id) => (id === item.id ? null : id))}
                  disabled={busy}
                  aria-label={confirmId === item.id ? `Confirmar borrar ${item.name}` : `Borrar ${item.name}`}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-extrabold transition disabled:opacity-60 ${confirmId === item.id ? "bg-[var(--danger-soft)] text-[var(--danger-text)]" : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--danger-text)]"}`}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  {confirmId === item.id && "¿Borrar?"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {uploading && <DocumentForm invoices={invoices} defaultDate={defaultDate} onUpload={documents.upload} onClose={() => setUploading(false)} />}
    </section>
  );
}
