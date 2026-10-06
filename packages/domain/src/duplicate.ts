import { suggestInternalCode } from "./internal-code";
import type { Product, ProductInput } from "./product";

/** Copy of a product without identity. The internal code is recalculated from the copied attributes. */
export function buildDuplicateInput(product: Product): ProductInput {
  const input: ProductInput = {
    internalCode: "",
    name: product.name,
    category: product.category,
    status: product.status,
  };
  copyOptional(input, product);
  input.internalCode = suggestInternalCode(input);
  return input;
}

function copyOptional(target: ProductInput, product: Product) {
  if (product.brand) target.brand = product.brand;
  if (product.line) target.line = product.line;
  if (product.manufacturer) target.manufacturer = product.manufacturer;
  if (product.supplier) target.supplier = product.supplier;
  if (product.notes) target.notes = product.notes;
  if (product.manufacturerCode) target.manufacturerCode = product.manufacturerCode;
  if (product.originalBarcode) target.originalBarcode = product.originalBarcode;
  if (product.colorName) target.colorName = product.colorName;
  if (product.colorCode) target.colorCode = product.colorCode;
  if (product.widthMm != null) target.widthMm = product.widthMm;
  if (product.thicknessMm != null) target.thicknessMm = product.thicknessMm;
  if (product.rollLengthM != null) target.rollLengthM = product.rollLengthM;
  if (product.rollsPerBox != null) target.rollsPerBox = product.rollsPerBox;
  if (product.totalLengthPerBoxM != null) target.totalLengthPerBoxM = product.totalLengthPerBoxM;
}
