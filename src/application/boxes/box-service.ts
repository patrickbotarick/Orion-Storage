import {
  BoxNotFoundError,
  InactiveProductBoxError,
  ProductNotFoundError,
  assertProductLinkUnchanged,
  assertValidBoxCreate,
  suggestBoxContent,
  type Box,
  type BoxContentSource,
  type BoxContentSuggestion,
  type BoxCreateInput,
  type BoxRepository,
  type BoxStatus,
  type BoxUpdateInput,
  type ProductRepository,
} from "@orion/domain";

import { LocalStorageBoxRepository } from "@/persistence/local-storage-box-repository";
import { LocalStorageProductRepository } from "@/persistence/local-storage-product-repository";

export type BoxUpdateRequest = BoxUpdateInput & {
  productId?: string;
};

export type BoxService = {
  list(): Promise<Box[]>;
  getById(id: string): Promise<Box | null>;
  getByCode(code: string): Promise<Box | null>;
  listByProductId(productId: string): Promise<Box[]>;
  suggestContent(product: BoxContentSource): BoxContentSuggestion;
  create(input: BoxCreateInput): Promise<Box>;
  update(id: string, input: BoxUpdateRequest): Promise<Box>;
  setStatus(id: string, status: BoxStatus): Promise<Box>;
};

export function createBoxService(boxes: BoxRepository, products: ProductRepository): BoxService {
  return {
    list: () => boxes.list(),
    getById: (id) => boxes.getById(id),
    getByCode: (code) => boxes.getByCode(code),
    listByProductId: (productId) => boxes.listByProductId(productId),
    suggestContent: (product) => suggestBoxContent(product),
    async create(input) {
      const valid = assertValidBoxCreate(input);
      const product = await products.getById(valid.productId);
      if (!product) throw new ProductNotFoundError(valid.productId);
      if (product.status !== "ACTIVE") throw new InactiveProductBoxError(product.id);
      return boxes.create(valid);
    },
    async update(id, input) {
      const current = await boxes.getById(id);
      if (!current) throw new BoxNotFoundError(id);
      assertProductLinkUnchanged(current.productId, input.productId);
      const { productId: _productId, ...content } = input;
      return boxes.update(id, content);
    },
    setStatus: (id, status) => boxes.setStatus(id, status),
  };
}

let browserService: BoxService | null = null;

/** Browser entry point. Components talk to this service, never to localStorage. */
export function getBrowserBoxService(): BoxService {
  if (typeof window === "undefined") {
    throw new Error("O controle de caixas só está disponível no navegador.");
  }
  if (!browserService) {
    const store = window.localStorage;
    browserService = createBoxService(
      new LocalStorageBoxRepository(store),
      new LocalStorageProductRepository(store),
    );
  }
  return browserService;
}
