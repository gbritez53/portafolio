import { useCallback, useEffect, useRef, useState } from "react";
import { deleteVaultDocument, downloadVaultDocument, listVaultDocuments, uploadVaultDocument } from "@/lib/user-vault-api";
import { decodeDocumentMeta, decryptDocumentFile, encodeDocumentMeta, encryptDocumentFile, validateDocumentFile } from "@/lib/autonomo/documents";
import type { VaultSession } from "@/hooks/useVaultCredentials";
import type { AutonomoDocument, DocumentDraft } from "@/types/autonomo";

export interface DocumentsController {
  documents: AutonomoDocument[];
  ready: boolean;
  error: string;
  upload: (file: File, details: Omit<DocumentDraft, "name" | "type" | "size">) => Promise<void>;
  open: (document: AutonomoDocument) => Promise<Blob>;
  remove: (id: string) => Promise<void>;
}

// Documentos de la boveda desbloqueada: se cifran antes de salir del navegador y se descifran al abrirlos.
export function useAutonomoDocuments(session: VaultSession | null, onSessionError: (reason: unknown) => void): DocumentsController {
  const [documents, setDocuments] = useState<AutonomoDocument[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const userId = session?.userId ?? null;
  const dek = session?.dek ?? null;
  const sessionRef = useRef<VaultSession | null>(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const requireSession = (): VaultSession => {
    if (!sessionRef.current) throw new Error("Desbloquea tu bóveda antes de seguir.");
    return sessionRef.current;
  };

  const guarded = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    try {
      return await action();
    } catch (reason) {
      onSessionError(reason);
      throw reason;
    }
  }, [onSessionError]);

  useEffect(() => {
    if (!userId || !dek) {
      const timeoutId = window.setTimeout(() => { setDocuments([]); setReady(false); }, 0);
      return () => window.clearTimeout(timeoutId);
    }
    const controller = new AbortController();
    void (async () => {
      try {
        const rows = await listVaultDocuments(controller.signal);
        const decoded = await Promise.allSettled(rows.map(async (row) => ({
          id: row.id,
          ...(await decodeDocumentMeta({ data: row.payload, iv: row.payloadIv }, dek, userId, row.id)),
          createdAt: row.createdAt,
        })));
        if (controller.signal.aborted) return;
        const failed = decoded.filter((item) => item.status === "rejected").length;
        setDocuments(decoded.flatMap((item) => (item.status === "fulfilled" ? [item.value] : [])));
        setError(failed ? `No se pudieron descifrar ${failed} ${failed === 1 ? "documento" : "documentos"}.` : "");
        setReady(true);
      } catch (reason) {
        if (controller.signal.aborted) return;
        onSessionError(reason);
        setError(reason instanceof Error ? reason.message : "No se pudieron cargar tus documentos.");
      }
    })();
    return () => controller.abort();
  }, [userId, dek, onSessionError]);

  const upload = useCallback(async (file: File, details: Omit<DocumentDraft, "name" | "type" | "size">) => {
    const problem = validateDocumentFile(file);
    if (problem) throw new Error(problem);
    const current = requireSession();
    const id = globalThis.crypto.randomUUID();
    const draft: DocumentDraft = { ...details, name: file.name.slice(0, 200) || "documento", type: file.type.slice(0, 100), size: file.size, note: details.note.trim() };
    const sealed = await encodeDocumentMeta(draft, current.dek, current.userId, id);
    const encrypted = await encryptDocumentFile(new Uint8Array(await file.arrayBuffer()), current.dek, current.userId, id);
    await guarded(() => uploadVaultDocument({ id, payload: sealed.data, payloadIv: sealed.iv }, encrypted));
    setDocuments((list) => [...list, { id, ...draft, createdAt: new Date().toISOString() }]);
  }, [guarded]);

  const open = useCallback(async (document: AutonomoDocument) => {
    const current = requireSession();
    const encrypted = await guarded(() => downloadVaultDocument(document.id));
    const plain = await decryptDocumentFile(encrypted, current.dek, current.userId, document.id);
    return new Blob([plain], { type: document.type || "application/octet-stream" });
  }, [guarded]);

  const remove = useCallback(async (id: string) => {
    await guarded(() => deleteVaultDocument(id));
    setDocuments((list) => list.filter((item) => item.id !== id));
  }, [guarded]);

  return { documents, ready, error, upload, open, remove };
}
