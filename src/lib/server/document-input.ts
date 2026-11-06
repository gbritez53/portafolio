import { MAX_ENCRYPTED_DOCUMENT_BYTES } from "@/lib/autonomo/documents";
import { parseSealed, type SealedInput } from "@/lib/server/credential-input";
import { isUuid } from "@/lib/server/http";

/** IV + tag de AES-GCM: un archivo cifrado de un solo byte ya ocupa 29. */
const MIN_ENCRYPTED_BYTES = 29;

export interface DocumentUpload extends SealedInput {
  id: string;
  file: Blob;
}

/** Valida el formulario de subida. El servidor nunca ve el archivo en claro: solo comprueba forma y tamaño. */
export function parseDocumentUpload(form: FormData): DocumentUpload | null {
  const id = form.get("id");
  const file = form.get("file");
  const sealed = parseSealed({ payload: form.get("payload"), payloadIv: form.get("payloadIv") });
  if (!isUuid(id) || !sealed || !(file instanceof Blob)) return null;
  if (file.size < MIN_ENCRYPTED_BYTES || file.size > MAX_ENCRYPTED_DOCUMENT_BYTES) return null;
  return { id, ...sealed, file };
}

/** Ruta del archivo cifrado en el store privado; el id ya es un uuid validado. */
export const documentPathname = (userId: string, documentId: string) => `autonomo/${userId}/${documentId}.bin`;
