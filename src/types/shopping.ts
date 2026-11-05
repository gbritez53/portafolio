/** Producto de la lista del super compartida. Precio opcional en centimos. */
export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  price: number | null;
  /** Tildado: ya esta en el carrito. */
  checked: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NewShoppingItem = Pick<ShoppingItem, "id" | "name" | "quantity" | "price">;

/** Campos que se cambian; el estado va explicito (nunca "alternar") para que dos personas no se pisen. */
export type ShoppingItemPatch = Pick<ShoppingItem, "id"> & Partial<Pick<ShoppingItem, "name" | "quantity" | "price" | "checked">>;
