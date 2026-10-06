import { describe, expect, it } from "vitest";

import { demoBoxState } from "./box-seeds";
import { boxLabelOptionalFields, composeBoxLabel, composeLocationLabel } from "./label";
import { demoLocations, demoStorageAreas } from "./location-seeds";
import { demoProducts } from "./seeds";

describe("etiquetas", () => {
  it("monta a etiqueta completa da caixa sem gravar o conteúdo no QR", () => {
    const box = demoBoxState().boxes[0]!;
    const product = {
      ...demoProducts()[0]!,
      thicknessMm: 0.45,
    };
    const label = composeBoxLabel(box, product);
    expect(label.preset).toBe("BOX_LABEL_SMALL");
    expect(label.code).toBe(box.code);
    expect(label.payload).toBe(`orion://v1/box/${box.code}`);
    expect(label.payload).not.toContain(product.name);
    expect(label.brand).toBe("Proadec");
    expect(label.colorName).toBeTruthy();
    expect(label.widthMm).toBe(35);
    expect(label.thicknessMm).toBe(0.45);
    expect(label.rollLengthM).toBe(20);
    expect(label.rollsQuantity).toBeGreaterThan(0);
    expect(label.totalLengthM).toBeGreaterThan(0);
    expect(label.manufacturerBatch).toBe("1101TX-26");
    expect(boxLabelOptionalFields(label)).toEqual([
      "brand",
      "colorName",
      "widthMm",
      "thicknessMm",
      "rollLengthM",
      "manufacturerBatch",
    ]);
  });

  it("omite atributos opcionais quando o produto não é uma fita", () => {
    const box = {
      code: "CX-20261006-000004",
      rollsQuantity: 4,
      totalLengthM: 1,
    };
    const label = composeBoxLabel(box, {
      name: "Parafuso sextavado",
      brand: "Oficina",
    });
    expect(label.productName).toBe("Parafuso sextavado");
    expect(label.brand).toBe("Oficina");
    expect(label.colorName).toBeUndefined();
    expect(label.widthMm).toBeUndefined();
    expect(label.thicknessMm).toBeUndefined();
    expect(label.rollLengthM).toBeUndefined();
    expect(label.manufacturerBatch).toBeUndefined();
    expect(boxLabelOptionalFields(label)).toEqual(["brand"]);
    expect(label.payload).toBe("orion://v1/box/CX-20261006-000004");
  });

  it("monta a sinalização do endereço", () => {
    const location = demoLocations()[0]!;
    const area = demoStorageAreas()[0]!;
    const label = composeLocationLabel(location, area);
    expect(label.preset).toBe("LOCATION_LABEL_MEDIUM");
    expect(label.code).toBe("SUP-A-01-01-01");
    expect(label.payload).toBe("orion://v1/location/SUP-A-01-01-01");
    expect(label.areaName).toBe("Estoque Superior");
    expect(label.aisle).toBe("A");
    expect(label.rack).toBe("01");
    expect(label.level).toBe("01");
    expect(label.position).toBe("01");
    expect(label.payload).not.toContain(area.name);
  });
});
