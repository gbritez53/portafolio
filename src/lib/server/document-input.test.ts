import { describe, expect, it } from "vitest";
import { documentPathname, parseDocumentUpload } from "@/lib/server/document-input";
import { MAX_ENCRYPTED_DOCUMENT_BYTES } from "@/lib/autonomo/documents";

const ID = "11111111-1111-4111-8111-111111111111";
const IV = "AAAAAAAAAAAAAAAA";

function form(fields: Record<string, string | Blob>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.append(name, value);
  return data;
}

const valid = () => ({ id: ID, payload: "c2VjcmV0", payloadIv: IV, file: new Blob([new Uint8Array(40)]) });

describe("subida de documentos cifrados", () => {
  it("acepta id, datos cifrados y el archivo cifrado", () => {
    const parsed = parseDocumentUpload(form(valid()));
    expect(parsed).toMatchObject({ id: ID, payload: "c2VjcmV0", payloadIv: IV });
    expect(parsed && "file" in parsed && parsed.file.size).toBe(40);
  });

  it("rechaza id inválido, datos sin cifrar o sin archivo", () => {
    expect(parseDocumentUpload(form({ ...valid(), id: "../otro" }))).toBeNull();
    expect(parseDocumentUpload(form({ ...valid(), payloadIv: "corto" }))).toBeNull();
    const { file: _file, ...noFile } = valid();
    expect(parseDocumentUpload(form(noFile))).toBeNull();
    expect(parseDocumentUpload(form({ ...valid(), file: "texto" }))).toBeNull();
  });

  it("rechaza archivos que no pueden ser un documento cifrado", () => {
    expect(parseDocumentUpload(form({ ...valid(), file: new Blob([new Uint8Array(28)]) }))).toBeNull();
    expect(parseDocumentUpload(form({ ...valid(), file: new Blob([new Uint8Array(MAX_ENCRYPTED_DOCUMENT_BYTES + 1)]) }))).toBeNull();
    expect(parseDocumentUpload(form({ ...valid(), file: new Blob([new Uint8Array(MAX_ENCRYPTED_DOCUMENT_BYTES)]) }))).not.toBeNull();
  });

  it("guarda cada archivo bajo la carpeta de su usuario", () => {
    expect(documentPathname("user-1", ID)).toBe(`autonomo/user-1/${ID}.bin`);
  });
});
