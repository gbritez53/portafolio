// Documentos de autonomo: el archivo y sus datos se cifran con la DEK en el navegador.
// Vercel Blob solo guarda bytes cifrados; Turso solo guarda `payload` + `payload_iv` y el tamaño.
import { aad, decryptBytes, decryptJson, encryptBytes, encryptJson, VaultCryptoError, type Sealed } from "@/lib/vault/crypto";
import type { DocumentDraft, DocumentKind } from "@/types/autonomo";

export const DOCUMENT_BLOB_VERSION = 1;

/** Por debajo del limite de 4,5 MB del cuerpo de una funcion de Vercel (archivo + formulario). */
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
/** IV (12 bytes) + tag de AES-GCM (16 bytes). */
export const MAX_ENCRYPTED_DOCUMENT_BYTES = MAX_DOCUMENT_BYTES + 28;

export const DOCUMENT_KINDS: readonly DocumentKind[] = ["invoice", "receipt", "tax", "social", "other"];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NAME = 200;
const MAX_TYPE = 100;
export const MAX_DOCUMENT_NOTE = 300;

/** Mensaje para el usuario, o "" si el archivo se puede subir. */
export function validateDocumentFile(file: { size: number }): string {
  if (file.size <= 0) return "El archivo está vacío.";
  if (file.size > MAX_DOCUMENT_BYTES) return "El archivo pesa más de 4 MB.";
  return "";
}

export function encryptDocumentFile(plain: Uint8Array, dek: CryptoKey, userId: string, documentId: string) {
  return encryptBytes(plain, dek, aad.autonomoDocumentFile(userId, documentId));
}

export function decryptDocumentFile(packed: Uint8Array, dek: CryptoKey, userId: string, documentId: string) {
  return decryptBytes(packed, dek, aad.autonomoDocumentFile(userId, documentId));
}

export function encodeDocumentMeta(draft: DocumentDraft, dek: CryptoKey, userId: string, documentId: string): Promise<Sealed> {
  return encryptJson({ ...draft, v: DOCUMENT_BLOB_VERSION }, dek, aad.autonomoDocument(userId, documentId));
}

export async function decodeDocumentMeta(sealed: Sealed, dek: CryptoKey, userId: string, documentId: string): Promise<DocumentDraft> {
  const raw = await decryptJson<Record<string, unknown> | null>(sealed, dek, aad.autonomoDocument(userId, documentId));
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new VaultCryptoError("INVALID_INPUT", "Documento invalido");
  if (raw.v !== DOCUMENT_BLOB_VERSION) throw new VaultCryptoError("UNSUPPORTED_VERSION", `Version de documento no soportada: ${String(raw.v)}`);
  const { name, type, size, kind, date, invoiceId, note } = raw;
  const valid = typeof name === "string" && name.length > 0 && name.length <= MAX_NAME
    && typeof type === "string" && type.length <= MAX_TYPE
    && Number.isInteger(size) && (size as number) > 0 && (size as number) <= MAX_DOCUMENT_BYTES
    && DOCUMENT_KINDS.includes(kind as DocumentKind)
    && typeof date === "string" && DATE.test(date)
    && (invoiceId === null || (typeof invoiceId === "string" && UUID.test(invoiceId)))
    && typeof note === "string" && note.length <= MAX_DOCUMENT_NOTE;
  if (!valid) throw new VaultCryptoError("INVALID_INPUT", "Documento invalido");
  return { name, type, size, kind, date, invoiceId, note } as DocumentDraft;
}
