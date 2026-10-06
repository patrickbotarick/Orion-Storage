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
