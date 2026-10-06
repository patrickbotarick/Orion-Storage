import type { Box } from "./box";
import { createBoxQrPayload, createLocationQrPayload } from "./identification";
import type { Location } from "./location";
import type { Product } from "./product";
import type { StorageArea } from "./storage-area";

export const LABEL_PRESETS = {
  BOX_LABEL_SMALL: "BOX_LABEL_SMALL",
  LOCATION_LABEL_MEDIUM: "LOCATION_LABEL_MEDIUM",
} as const;

export type BoxLabelModel = {
  preset: typeof LABEL_PRESETS.BOX_LABEL_SMALL;
  payload: string;
  code: string;
  productName: string;
  brand?: string;
  colorName?: string;
  widthMm?: number;
  thicknessMm?: number;
  rollLengthM?: number;
  rollsQuantity: number;
  totalLengthM: number;
  manufacturerBatch?: string;
};

export type LocationLabelModel = {
  preset: typeof LABEL_PRESETS.LOCATION_LABEL_MEDIUM;
  payload: string;
  code: string;
  areaName: string;
  aisle: string;
  rack: string;
  level: string;
  position: string;
};

type BoxLabelSource = Pick<Box, "code" | "rollsQuantity" | "totalLengthM" | "manufacturerBatch">;
type ProductLabelSource = Pick<
  Product,
  "name" | "brand" | "colorName" | "widthMm" | "thicknessMm" | "rollLengthM"
>;

/** Print data for one box. Absent product attributes are omitted, never rendered as blank lines. */
export function composeBoxLabel(
  box: BoxLabelSource,
  product: ProductLabelSource | null,
): BoxLabelModel {
  const model: BoxLabelModel = {
    preset: LABEL_PRESETS.BOX_LABEL_SMALL,
    payload: createBoxQrPayload(box.code),
    code: box.code.trim().toUpperCase(),
    productName: product?.name.trim() || "Produto não encontrado",
    rollsQuantity: box.rollsQuantity,
    totalLengthM: box.totalLengthM,
  };
  if (product?.brand) model.brand = product.brand;
  if (product?.colorName) model.colorName = product.colorName;
  if (product?.widthMm != null) model.widthMm = product.widthMm;
  if (product?.thicknessMm != null) model.thicknessMm = product.thicknessMm;
  if (product?.rollLengthM != null) model.rollLengthM = product.rollLengthM;
  if (box.manufacturerBatch) model.manufacturerBatch = box.manufacturerBatch;
  return model;
}

export function boxLabelOptionalFields(model: BoxLabelModel): string[] {
  const fields: string[] = [];
  if (model.brand) fields.push("brand");
  if (model.colorName) fields.push("colorName");
  if (model.widthMm != null) fields.push("widthMm");
  if (model.thicknessMm != null) fields.push("thicknessMm");
  if (model.rollLengthM != null) fields.push("rollLengthM");
  if (model.manufacturerBatch) fields.push("manufacturerBatch");
  return fields;
}

export function composeLocationLabel(
  location: Pick<Location, "code" | "aisle" | "rack" | "level" | "position">,
  area: Pick<StorageArea, "name"> | null,
): LocationLabelModel {
  return {
    preset: LABEL_PRESETS.LOCATION_LABEL_MEDIUM,
    payload: createLocationQrPayload(location.code),
    code: location.code,
    areaName: area?.name.trim() || "Área não encontrada",
    aisle: location.aisle,
    rack: location.rack,
    level: location.level,
    position: location.position,
  };
}
