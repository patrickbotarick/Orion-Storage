import type { InventorySession } from "./inventory";

export interface InventoryRepository {
  list(): Promise<InventorySession[]>;
  getById(id: string): Promise<InventorySession | null>;
  /** Allocates the INV code and persists the initial snapshot in one write. */
  create(session: Omit<InventorySession, "code">): Promise<InventorySession>;
  /** Optimistic revision check; snapshots and closed sessions cannot be replaced. */
  save(session: InventorySession, expectedRevision: number): Promise<InventorySession>;
}
