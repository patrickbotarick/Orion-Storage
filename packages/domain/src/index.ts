export { buildDuplicateInput } from "./duplicate";
export { ProductNotFoundError, ProductValidationError } from "./errors";
export type { FieldIssue } from "./errors";
export { filterProducts, listFilterOptions } from "./filter";
export type { ProductQuery, ProductStatusFilter } from "./filter";
export { suggestInternalCode } from "./internal-code";
export type { InternalCodeSource } from "./internal-code";
export { calculatedTotalLengthM, detectLengthDivergence, roundLengthM } from "./length";
export type { LengthDivergence, LengthDivergenceInput } from "./length";
export {
  normalizeDisplay,
  normalizeForComparison,
  normalizeInternalCode,
  toCodeToken,
} from "./normalize";
export { EMPTY_PRODUCT_FORM, PRODUCT_STATUSES } from "./product";
export type { Product, ProductFormValues, ProductInput, ProductStatus } from "./product";
export type { ProductRepository } from "./repository";
export {
  assertValidProductInput,
  isProductStatus,
  parseOptionalDecimal,
  parseOptionalInteger,
  productInputSchema,
  productToFormValues,
  suggestInternalCodeFromForm,
  validateProductForm,
} from "./schema";
export type { FormValidation, ParsedMeasure } from "./schema";
export { demoProducts } from "./seeds";
