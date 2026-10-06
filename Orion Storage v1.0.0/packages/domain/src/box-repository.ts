import type { Box, BoxCreateInput, BoxStatus, BoxUpdateInput } from "./box";

/**
 * Persistence port for physical boxes.
 * UI and use cases depend on this contract, not on localStorage.
 */
export interface BoxRepository {
  list(): Promise<Box[]>;
  getById(id: string): Promise<Box | null>;
  getByCode(code: string): Promise<Box | null>;
  create(input: BoxCreateInput): Promise<Box>;
  update(id: string, input: BoxUpdateInput): Promise<Box>;
  setStatus(id: string, status: BoxStatus): Promise<Box>;
  listByProductId(productId: string): Promise<Box[]>;
}
