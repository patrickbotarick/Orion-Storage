import { describe, expect, it } from "vitest";
import { inventoryDivergenceLocations, type InventorySession } from "./inventory";
import { demoLocations } from "./location-seeds";

const location = demoLocations()[0]!;
const session = (id: string, completedAt: string, match: boolean): InventorySession => ({
  id,
  code: `INV-20261008-${id}`,
  scope: "LOCATION",
  areaId: location.areaId,
  locationId: location.id,
  scopeLabel: location.code,
  status: "COMPLETED",
  locations: [location],
  catalogSnapshot: [],
  items: [
    {
      boxId: "box",
      code: "CX-20261006-000001",
      productId: "product",
      expectedLocationId: location.id,
      expected: true,
      found: match,
      classification: match ? "MATCH" : "MISSING",
    },
  ],
  startedAt: completedAt,
  completedAt,
  createdAt: completedAt,
  updatedAt: completedAt,
  revision: 1,
});
describe("Indicadores de inventário no mapa", () => {
  it("sinaliza divergência concluída sem alterar ocupação", () => {
    expect(inventoryDivergenceLocations([session("1", "2026-10-08T15:00:00Z", false)])).toEqual(
      new Set([location.id]),
    );
  });
  it("a conclusão mais recente sem divergência limpa indicador antigo", () => {
    expect(
      inventoryDivergenceLocations([
        session("1", "2026-10-08T15:00:00Z", false),
        session("2", "2026-10-08T16:00:00Z", true),
      ]),
    ).toEqual(new Set());
  });
  it("ignora sessões abertas e canceladas", () => {
    expect(
      inventoryDivergenceLocations([
        { ...session("1", "2026-10-08T15:00:00Z", false), status: "CANCELLED" },
        { ...session("2", "2026-10-08T16:00:00Z", false), status: "IN_PROGRESS" },
      ]),
    ).toEqual(new Set());
  });
});
