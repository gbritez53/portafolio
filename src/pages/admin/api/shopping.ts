import type { APIRoute } from "astro";
import type { Row } from "@libsql/client";
import { fail, ok, readBody } from "@/lib/server/http";
import { parseIds, parseItemPatch, parseNewItem } from "@/lib/shopping/input";
import { getTurso } from "@/lib/turso";
import type { ShoppingItem } from "@/types/shopping";

export const prerender = false;

// Lista del super compartida: cualquiera con la sesion del panel la ve y la edita (el middleware la protege).
const SELECT = "SELECT id, name, quantity, price, checked, created_at, updated_at FROM shopping_items";

function toItem(row: Row): ShoppingItem {
  return {
    id: String(row.id),
    name: String(row.name),
    quantity: String(row.quantity),
    price: row.price === null ? null : Number(row.price),
    checked: Number(row.checked) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

const dbError = (error: unknown) => {
  console.error("Shopping list error:", error);
  return fail("No se pudo acceder a la lista del súper.", 503);
};

export const GET: APIRoute = async () => {
  try {
    const database = await getTurso();
    const result = await database.execute(`${SELECT} ORDER BY checked ASC, created_at ASC, rowid ASC`);
    return ok({ items: result.rows.map(toItem) });
  } catch (error) {
    return dbError(error);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const item = parseNewItem(await readBody(request));
  if (!item) return fail("Escribe qué hay que comprar.", 400);
  try {
    const database = await getTurso();
    // Reintentar el mismo alta (doble toque, red lenta) no duplica el producto.
    await database.execute({
      sql: "INSERT INTO shopping_items (id, name, quantity, price) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
      args: [item.id, item.name, item.quantity, item.price],
    });
    const saved = await database.execute({ sql: `${SELECT} WHERE id = ?`, args: [item.id] });
    return ok({ item: toItem(saved.rows[0]) }, 201);
  } catch (error) {
    return dbError(error);
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  const patch = parseItemPatch(await readBody(request));
  if (!patch) return fail("Cambio no válido.", 400);
  const columns: string[] = [];
  const args: (string | number | null)[] = [];
  if (patch.name !== undefined) { columns.push("name = ?"); args.push(patch.name); }
  if (patch.quantity !== undefined) { columns.push("quantity = ?"); args.push(patch.quantity); }
  if (patch.price !== undefined) { columns.push("price = ?"); args.push(patch.price); }
  if (patch.checked !== undefined) { columns.push("checked = ?"); args.push(patch.checked ? 1 : 0); }
  try {
    const database = await getTurso();
    const result = await database.execute({
      sql: `UPDATE shopping_items SET ${columns.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [...args, patch.id],
    });
    // Otro miembro pudo haberlo borrado mientras tanto.
    if (result.rowsAffected === 0) return fail("Ese producto ya no está en la lista.", 404);
    const saved = await database.execute({ sql: `${SELECT} WHERE id = ?`, args: [patch.id] });
    return ok({ item: toItem(saved.rows[0]) });
  } catch (error) {
    return dbError(error);
  }
};

// Borrar lo que ya no hace falta: comprados, o lo que se acaba de anotar como gasto.
// Si otro miembro ya borro alguno, no es un error: el resultado final es el mismo.
export const DELETE: APIRoute = async ({ request }) => {
  const ids = parseIds(await readBody(request));
  if (!ids) return fail("Nada que borrar.", 400);
  try {
    const database = await getTurso();
    await database.execute({ sql: `DELETE FROM shopping_items WHERE id IN (${ids.map(() => "?").join(", ")})`, args: ids });
    return ok({ ok: true });
  } catch (error) {
    return dbError(error);
  }
};
