import {
  ProductNotFoundError,
  assertUniqueInternalCode,
  assertValidProductInput,
  buildDuplicateInput,
  demoProducts,
  internalCodeKey,
  type Product,
  type ProductInput,
  type ProductRepository,
  type ProductStatus,
} from "@orion/domain";

import type { KeyValueStore } from "./key-value-store";

const STORAGE_KEY = "orion-storage.products.v1";

type Envelope = {
  version: 1;
  products: Product[];
};

export type Clock = () => string;
export type IdFactory = () => string;

/**
 * Phase 1 adapter. Swap this class for an API repository without changing the UI.
 * React components must not import this module.
 */
export class LocalStorageProductRepository implements ProductRepository {
  constructor(
    private readonly store: KeyValueStore,
    private readonly ids: IdFactory = () => crypto.randomUUID(),
    private readonly now: Clock = () => new Date().toISOString(),
  ) {}

  async list(): Promise<Product[]> {
    return this.readAll().sort(
      (a, b) =>
        a.name.localeCompare(b.name, "pt-BR") || a.internalCode.localeCompare(b.internalCode),
    );
  }

  async getById(id: string): Promise<Product | null> {
    return this.readAll().find((product) => product.id === id) ?? null;
  }

  async create(input: ProductInput): Promise<Product> {
    const valid = assertValidProductInput(input);
    const products = this.readAll();
    assertUniqueInternalCode(products, valid.internalCode);
    const timestamp = this.now();
    const product: Product = {
      ...valid,
      id: this.ids(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    products.push(product);
    this.writeAll(products);
    return product;
  }

  async update(id: string, input: ProductInput): Promise<Product> {
    const valid = assertValidProductInput(input);
    const products = this.readAll();
    const index = products.findIndex((product) => product.id === id);
    const current = products[index];
    if (!current) throw new ProductNotFoundError(id);
    if (internalCodeKey(current.internalCode) !== internalCodeKey(valid.internalCode)) {
      assertUniqueInternalCode(products, valid.internalCode, current.id);
    }
    const updated: Product = {
      ...valid,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: this.now(),
    };
    products[index] = updated;
    this.writeAll(products);
    return updated;
  }

  async duplicate(id: string): Promise<Product> {
    const source = await this.getById(id);
    if (!source) throw new ProductNotFoundError(id);
    return this.create(buildDuplicateInput(source));
  }

  async setStatus(id: string, status: ProductStatus): Promise<Product> {
    const current = await this.getById(id);
    if (!current) throw new ProductNotFoundError(id);
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = current;
    return this.update(id, { ...input, status });
  }

  private readAll(): Product[] {
    const raw = this.store.getItem(STORAGE_KEY);
    if (raw == null) {
      const seeded = demoProducts();
      this.writeAll(seeded);
      return seeded.map(cloneProduct);
    }
    try {
      const parsed = JSON.parse(raw) as Envelope;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.products)) {
        return [];
      }
      return parsed.products.map(cloneProduct);
    } catch {
      return [];
    }
  }

  private writeAll(products: Product[]) {
    const envelope: Envelope = { version: 1, products };
    this.store.setItem(STORAGE_KEY, JSON.stringify(envelope));
  }
}

function cloneProduct(product: Product): Product {
  return { ...product };
}
