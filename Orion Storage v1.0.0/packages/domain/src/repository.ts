import type { Product, ProductInput, ProductStatus } from "./product";
import type { StorageArea, StorageAreaCreateInput, StorageAreaStatus, StorageAreaUpdateInput } from "./storage-area";
import type { Location, LocationDraft, LocationStatus } from "./location";

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

export interface StorageAreaRepository {
  list(): Promise<StorageArea[]>;
  getById(id: string): Promise<StorageArea | null>;
  getByCode(code: string): Promise<StorageArea | null>;
  create(input: StorageAreaCreateInput): Promise<StorageArea>;
  update(id: string, input: StorageAreaUpdateInput): Promise<StorageArea>;
  setStatus(id: string, status: StorageAreaStatus): Promise<StorageArea>;
}

export interface LocationRepository {
  list(): Promise<Location[]>;
  getById(id: string): Promise<Location | null>;
  getByCode(code: string): Promise<Location | null>;
  listByAreaId(areaId: string): Promise<Location[]>;
  create(input: LocationDraft): Promise<Location>;
  update(id: string, input: LocationDraft): Promise<Location>;
  setStatus(id: string, status: LocationStatus): Promise<Location>;
}
