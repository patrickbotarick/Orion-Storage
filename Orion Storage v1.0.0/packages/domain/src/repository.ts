import type { Product, ProductInput, ProductStatus } from "./product";

/**
 * Persistence port. UI and use cases depend on this contract,
 * not on localStorage, HTTP or a database.
 */
export interface ProductRepository {
  list(): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  create(input: ProductInput): Promise<Product>;
  update(id: string, input: ProductInput): Promise<Product>;
  duplicate(id: string): Promise<Product>;
  setStatus(id: string, status: ProductStatus): Promise<Product>;
}
