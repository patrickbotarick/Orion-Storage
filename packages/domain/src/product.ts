export const PRODUCT_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/** Catalog product. Tape measures are optional and are not required for other categories. */
export type ProductInput = {
  internalCode: string;
  name: string;
  category: string;
  brand?: string;
  /** Linha ou modelo. Optional and not specific to edge tape. */
  line?: string;
  manufacturer?: string;
  supplier?: string;
  status: ProductStatus;
  notes?: string;
  manufacturerCode?: string;
  originalBarcode?: string;
  colorName?: string;
  colorCode?: string;
  /** Millimeters. Number only — the UI renders the unit. */
  widthMm?: number;
  /** Millimeters. */
  thicknessMm?: number;
  /** Meters per roll. */
  rollLengthM?: number;
  rollsPerBox?: number;
  /** Manufacturer-informed meters per box. Independent from the calculated total. */
  totalLengthPerBoxM?: number;
};

export type Product = ProductInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductFormValues = {
  internalCode: string;
  name: string;
  category: string;
  brand: string;
  line: string;
  manufacturer: string;
  supplier: string;
  status: ProductStatus;
  notes: string;
  manufacturerCode: string;
  originalBarcode: string;
  colorName: string;
  colorCode: string;
  widthMm: string;
  thicknessMm: string;
  rollLengthM: string;
  rollsPerBox: string;
  totalLengthPerBoxM: string;
};

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  internalCode: "",
  name: "",
  category: "",
  brand: "",
  line: "",
  manufacturer: "",
  supplier: "",
  status: "ACTIVE",
  notes: "",
  manufacturerCode: "",
  originalBarcode: "",
  colorName: "",
  colorCode: "",
  widthMm: "",
  thicknessMm: "",
  rollLengthM: "",
  rollsPerBox: "",
  totalLengthPerBoxM: "",
};
