import { describe, expect, it } from "vitest";
import {
  decodeDocumentMeta,
  decryptDocumentFile,
  encodeDocumentMeta,
  encryptDocumentFile,
  MAX_DOCUMENT_BYTES,
  MAX_ENCRYPTED_DOCUMENT_BYTES,
  validateDocumentFile,
} from "@/lib/autonomo/documents";
import { encryptJson, generateDek, importDek } from "@/lib/vault/crypto";
import type { DocumentDraft } from "@/types/autonomo";

const USER = "user-1";
const DOC = "11111111-1111-4111-8111-111111111111";

const draft: DocumentDraft = {
  name: "factura-2026-001.pdf",
  type: "application/pdf",
  size: 5,
  kind: "invoice",
  date: "2026-11-02",
  invoiceId: "22222222-2222-4222-8222-222222222222",
  note: "Cliente Tinas",
};

const key = async () => importDek(generateDek());

describe("documentos de autónomo cifrados", () => {
  it("el archivo vuelve idéntico y el cifrado no deja ver los bytes", async () => {
    const dek = await key();
    const plain = new TextEncoder().encode("%PDF-hola");
    const packed = await encryptDocumentFile(plain, dek, USER, DOC);
    expect(packed.length).toBe(plain.length + 28);
    expect(new TextDecoder().decode(packed)).not.toContain("%PDF");
    expect(await decryptDocumentFile(packed, dek, USER, DOC)).toEqual(plain);
  });

  it("un archivo de otro usuario o de otro documento no se descifra", async () => {
    const dek = await key();
    const packed = await encryptDocumentFile(new Uint8Array([1, 2, 3]), dek, USER, DOC);
    await expect(decryptDocumentFile(packed, dek, "user-2", DOC)).rejects.toMatchObject({ code: "DECRYPT_FAILED" });
    await expect(decryptDocumentFile(packed, dek, USER, "33333333-3333-4333-8333-333333333333")).rejects.toMatchObject({ code: "DECRYPT_FAILED" });
    const tampered = packed.slice();
    tampered[tampered.length - 1] ^= 1;
    await expect(decryptDocumentFile(tampered, dek, USER, DOC)).rejects.toMatchObject({ code: "DECRYPT_FAILED" });
  });

  it("los datos del documento se cifran y vuelven validados", async () => {
    const dek = await key();
    const sealed = await encodeDocumentMeta(draft, dek, USER, DOC);
    expect(sealed.data).not.toContain("factura");
    expect(await decodeDocumentMeta(sealed, dek, USER, DOC)).toEqual(draft);
    await expect(decodeDocumentMeta(sealed, dek, USER, "33333333-3333-4333-8333-333333333333")).rejects.toMatchObject({ code: "DECRYPT_FAILED" });
  });

  it("sin factura asociada guarda null y rechaza datos inválidos", async () => {
    const dek = await key();
    const loose = { ...draft, invoiceId: null, note: "" };
    expect(await decodeDocumentMeta(await encodeDocumentMeta(loose, dek, USER, DOC), dek, USER, DOC)).toEqual(loose);
    const bad = await encryptJson({ ...draft, kind: "selfie", v: 1 }, dek, `aut-doc:v1:${USER}:${DOC}`);
    await expect(decodeDocumentMeta(bad, dek, USER, DOC)).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("acepta documentos de la Seguridad Social", async () => {
    const dek = await key();
    const social = { ...draft, kind: "social" as const, invoiceId: null };
    expect(await decodeDocumentMeta(await encodeDocumentMeta(social, dek, USER, DOC), dek, USER, DOC)).toEqual(social);
  });

  it("acepta hasta 4 MB y rechaza archivos vacíos o más grandes", () => {
    expect(MAX_DOCUMENT_BYTES).toBe(4 * 1024 * 1024);
    expect(MAX_ENCRYPTED_DOCUMENT_BYTES).toBe(MAX_DOCUMENT_BYTES + 28);
    expect(validateDocumentFile({ size: MAX_DOCUMENT_BYTES })).toBe("");
    expect(validateDocumentFile({ size: 0 })).toBe("El archivo está vacío.");
    expect(validateDocumentFile({ size: MAX_DOCUMENT_BYTES + 1 })).toBe("El archivo pesa más de 4 MB.");
  });
});
