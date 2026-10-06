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
