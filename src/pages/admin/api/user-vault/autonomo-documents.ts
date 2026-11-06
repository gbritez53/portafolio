import type { APIRoute } from "astro";
import { del, put } from "@vercel/blob";
import { documentPathname, parseDocumentUpload } from "@/lib/server/document-input";
import { fail, ok } from "@/lib/server/http";
import { getTurso } from "@/lib/turso";

export const prerender = false;

// Documentos de autonomo: listado de los datos cifrados del usuario (sin archivos).
export const GET: APIRoute = async ({ locals }) => {
  try {
    const database = await getTurso();
    const result = await database.execute({
      sql: "SELECT id, payload, payload_iv, created_at FROM autonomo_documents WHERE user_id = ? ORDER BY created_at",
      args: [locals.userId!],
    });
    return ok({
      documents: result.rows.map((row) => ({
        id: String(row.id),
        payload: String(row.payload),
        payloadIv: String(row.payload_iv),
        createdAt: String(row.created_at),
      })),
    });
  } catch (error) {
    console.error("User vault documents error:", error);
    return fail("No se pudieron cargar tus documentos.", 503);
  }
};

// Sube un archivo ya cifrado en el navegador al store privado y registra sus datos cifrados.
export const POST: APIRoute = async ({ request, locals }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Datos del documento no válidos.", 400);
  }
  const upload = parseDocumentUpload(form);
  if (!upload) return fail("Datos del documento no válidos.", 400);

  const userId = locals.userId!;
  const pathname = documentPathname(userId, upload.id);
  try {
    const database = await getTurso();
    // Primero la fila: un id repetido (propio o ajeno) no llega a tocar Blob.
    const inserted = await database.execute({
      sql: `INSERT INTO autonomo_documents (id, user_id, pathname, size, payload, payload_iv, payload_version)
        VALUES (?, ?, ?, ?, ?, ?, 1) ON CONFLICT(id) DO NOTHING`,
      args: [upload.id, userId, pathname, upload.file.size, upload.payload, upload.payloadIv],
    });
    if (inserted.rowsAffected !== 1) return fail("Ese documento ya existe.", 409);

    try {
      await put(pathname, upload.file, { access: "private", contentType: "application/octet-stream" });
    } catch (error) {
      await database.execute({ sql: "DELETE FROM autonomo_documents WHERE id = ? AND user_id = ?", args: [upload.id, userId] });
      // Si put llego a escribir antes de fallar, no queda un archivo huerfano.
      await del(pathname).catch(() => undefined);
      throw error;
    }
    return ok({ id: upload.id }, 201);
  } catch (error) {
    console.error("User vault document upload error:", error);
    return fail("No se pudo subir el documento.", 503);
  }
};
