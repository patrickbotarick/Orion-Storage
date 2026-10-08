import type { Product, ProductInput, ProductRepository, ProductStatus } from "@orion/domain";

import { LocalStorageProductRepository } from "@/persistence/local-storage-product-repository";

export type ProductService = {
  list(): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  create(input: ProductInput): Promise<Product>;
  update(id: string, input: ProductInput): Promise<Product>;
  duplicate(id: string): Promise<Product>;
  setStatus(id: string, status: ProductStatus): Promise<Product>;
};

export function createProductService(repository: ProductRepository): ProductService {
  return {
    list: () => repository.list(),
    getById: (id) => repository.getById(id),
    create: (input) => repository.create(input),
    update: (id, input) => repository.update(id, input),
    duplicate: (id) => repository.duplicate(id),
    setStatus: (id, status) => repository.setStatus(id, status),
  };
}

let browserService: ProductService | null = null;

/** Browser entry point. Components talk to this service, never to localStorage. */
export function getBrowserProductService(): ProductService {
  if (typeof window === "undefined") {
    throw new Error("O catálogo de produtos só está disponível no navegador.");
  }
  if (!browserService) {
    browserService = createProductService(new LocalStorageProductRepository(window.localStorage));
  }
  return browserService;
}
