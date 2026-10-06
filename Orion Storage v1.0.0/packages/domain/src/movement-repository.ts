import type { Movement } from "./movement";

/** Append-only port. There is no update and no delete. */
export interface MovementRepository {
  list(): Promise<Movement[]>;
  getById(id: string): Promise<Movement | null>;
  listByBoxId(boxId: string): Promise<Movement[]>;
  listByLocationId(locationId: string): Promise<Movement[]>;
  create(movement: Movement): Promise<Movement>;
}
