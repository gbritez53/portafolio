import type { APIRoute } from "astro";
import { del, get } from "@vercel/blob";
import { fail, isUuid, ok } from "@/lib/server/http";
import { getTurso } from "@/lib/turso";

export const prerender = false;

// El pathname sale siempre de una fila del propio usuario: nunca del request.
async function findPathname(id: string, userId: string): Promise<string | null> {
  const database = await getTurso();
  const result = await database.execute({
    sql: "SELECT pathname FROM autonomo_documents WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
  return result.rows[0] ? String(result.rows[0].pathname) : null;
}

// Devuelve el archivo cifrado; se descifra en el navegador con la DEK.
export const GET: APIRoute = async ({ params, locals }) => {
  if (!isUuid(params.id)) return fail("Documento no encontrado.", 404);
  try {
    const pathname = await findPathname(params.id, locals.userId!);
    if (!pathname) return fail("Documento no encontrado.", 404);
    const blob = await get(pathname, { access: "private" });
    if (!blob || blob.statusCode !== 200) return fail("No se encontró el archivo del documento.", 404);
    return new Response(blob.stream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(blob.blob.size),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("User vault document download error:", error);
    return fail("No se pudo descargar el documento.", 503);
  }
};

// Borra primero el archivo: si Blob falla, la fila queda y se puede reintentar.
export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!isUuid(params.id)) return fail("Documento no encontrado.", 404);
  const userId = locals.userId!;
  try {
    const pathname = await findPathname(params.id, userId);
    if (!pathname) return fail("Documento no encontrado.", 404);
    await del(pathname);
    const database = await getTurso();
    await database.execute({ sql: "DELETE FROM autonomo_documents WHERE id = ? AND user_id = ?", args: [params.id, userId] });
    return ok({ ok: true });
  } catch (error) {
    console.error("User vault document delete error:", error);
    return fail("No se pudo borrar el documento.", 503);
  }
};
