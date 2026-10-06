export type FieldIssue = {
  path: string;
  message: string;
};

export class ProductValidationError extends Error {
  readonly issues: FieldIssue[];

  constructor(issues: FieldIssue[]) {
    super(issues.map((issue) => issue.message).join(" "));
    this.name = "ProductValidationError";
    this.issues = issues;
  }
}

export class ProductNotFoundError extends Error {
  readonly id: string;

  constructor(id: string) {
    super(`Produto não encontrado: ${id}`);
    this.name = "ProductNotFoundError";
    this.id = id;
  }
}

export class DuplicateInternalCodeError extends Error {
  readonly internalCode: string;

  constructor(internalCode: string) {
    super(`Já existe um produto com o código interno ${internalCode}.`);
    this.name = "DuplicateInternalCodeError";
    this.internalCode = internalCode;
  }
}

export class BoxValidationError extends Error {
  readonly issues: FieldIssue[];

  constructor(issues: FieldIssue[]) {
    super(issues.map((issue) => issue.message).join(" "));
    this.name = "BoxValidationError";
    this.issues = issues;
  }
}

export class BoxNotFoundError extends Error {
  readonly id: string;

  constructor(id: string) {
    super(`Caixa não encontrada: ${id}`);
    this.name = "BoxNotFoundError";
    this.id = id;
  }
}

export class DuplicateBoxCodeError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`Já existe uma caixa com o código ${code}. Esse código não pode ser reutilizado.`);
    this.name = "DuplicateBoxCodeError";
    this.code = code;
  }
}

export class InactiveProductBoxError extends Error {
  readonly productId: string;

  constructor(productId: string) {
    super(
      "Não é possível criar uma caixa para um produto inativo. Reative o produto ou escolha outro.",
    );
    this.name = "InactiveProductBoxError";
    this.productId = productId;
  }
}

export class BoxProductImmutableError extends Error {
  constructor() {
    super("O produto de uma caixa física não pode ser alterado depois da criação.");
    this.name = "BoxProductImmutableError";
  }
}

export class BoxCodeCapacityError extends Error {
  readonly dateKey: string;

  constructor(dateKey: string) {
    super(`Não há mais códigos disponíveis para ${dateKey}. O limite diário é 999999.`);
    this.name = "BoxCodeCapacityError";
    this.dateKey = dateKey;
  }
}

export class StorageAreaValidationError extends Error {
  readonly issues: FieldIssue[];

  constructor(issues: FieldIssue[]) {
    super(issues.map((issue) => issue.message).join(" "));
    this.name = "StorageAreaValidationError";
    this.issues = issues;
  }
}

export class StorageAreaNotFoundError extends Error {
  readonly id: string;

  constructor(id: string) {
    super(`Área não encontrada: ${id}`);
    this.name = "StorageAreaNotFoundError";
    this.id = id;
  }
}

export class DuplicateStorageAreaCodeError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`Já existe uma área com o código ${code}.`);
    this.name = "DuplicateStorageAreaCodeError";
    this.code = code;
  }
}

export class InactiveStorageAreaError extends Error {
  readonly areaId: string;

  constructor(areaId: string) {
    super("Esta área está inativa e não pode receber endereço ou caixa novos.");
    this.name = "InactiveStorageAreaError";
    this.areaId = areaId;
  }
}

export class LocationValidationError extends Error {
  readonly issues: FieldIssue[];

  constructor(issues: FieldIssue[]) {
    super(issues.map((issue) => issue.message).join(" "));
    this.name = "LocationValidationError";
    this.issues = issues;
  }
}

export class LocationNotFoundError extends Error {
  readonly id: string;

  constructor(id: string) {
    super(`Localização não encontrada: ${id}`);
    this.name = "LocationNotFoundError";
    this.id = id;
  }
}

export class DuplicateLocationError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`Já existe o endereço ${code}.`);
    this.name = "DuplicateLocationError";
    this.code = code;
  }
}

export class LocationNotAssignableError extends Error {
  readonly status: "BLOCKED" | "INACTIVE";

  constructor(status: "BLOCKED" | "INACTIVE") {
    super(
      status === "BLOCKED"
        ? "Esta posição está bloqueada e não pode receber caixas."
        : "Esta posição está inativa e não pode receber caixas.",
    );
    this.name = "LocationNotAssignableError";
    this.status = status;
  }
}

export class LocationCapacityError extends Error {
  readonly capacityBoxes: number;

  constructor(capacityBoxes: number) {
    super(`Esta posição atingiu sua capacidade máxima de ${capacityBoxes} caixas.`);
    this.name = "LocationCapacityError";
    this.capacityBoxes = capacityBoxes;
  }
}

export class LocationStructureLockedError extends Error {
  constructor() {
    super(
      "Este endereço já possui caixas. Área, corredor, prateleira, nível e posição não podem ser alterados.",
    );
    this.name = "LocationStructureLockedError";
  }
}

export class LocationCapacityTooSmallError extends Error {
  readonly occupied: number;

  constructor(occupied: number) {
    super(`A capacidade não pode ser menor que as ${occupied} caixas já endereçadas.`);
    this.name = "LocationCapacityTooSmallError";
    this.occupied = occupied;
  }
}

export class IdentificationPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdentificationPayloadError";
  }
}

export class IdentificationNotFoundError extends Error {
  readonly kind: "box" | "location";
  readonly code: string;

  constructor(kind: "box" | "location", code: string) {
    super(
      kind === "box"
        ? `Não foi encontrada uma caixa com o código ${code}.`
        : `Não foi encontrado um endereço com o código ${code}.`,
    );
    this.name = "IdentificationNotFoundError";
    this.kind = kind;
    this.code = code;
  }
}
