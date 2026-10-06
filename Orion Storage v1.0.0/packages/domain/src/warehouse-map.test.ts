import { describe, expect, it } from "vitest";

import { demoBoxState } from "./box-seeds";
import type { Location } from "./location";
import { DEMO_LOCATION_IDS, demoLocations, demoStorageAreas } from "./location-seeds";
import type { Product } from "./product";
import { demoProducts } from "./seeds";
import {
  areaInactiveBadge,
  boxesByLocation,
  buildWarehouseMap,
  calculateAreaOccupancy,
  cellKey,
  classifyOccupancy,
  compareNatural,
  filterWarehouseLocations,
  formatOccupancyCount,
  formatOccupancyPercent,
  groupLocationsByArea,
  isSearchHighlight,
  occupancyOf,
  searchWarehouse,
  spokenLocation,
  type MapBox,
} from "./warehouse-map";

const STAMP = "2026-10-06T14:00:00.000Z";

function location(partial: Partial<Location> & Pick<Location, "id" | "code">): Location {
  return {
    areaId: "area-sup",
    aisle: "A",
    rack: "01",
    level: "01",
    position: "01",
    status: "ACTIVE",
    capacityBoxes: 4,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...partial,
  };
}

function product(partial: Partial<Product> & Pick<Product, "id" | "name">): Product {
  return {
    internalCode: partial.internalCode ?? "INT",
    category: "Fita de borda",
    status: "ACTIVE",
    createdAt: STAMP,
    updatedAt: STAMP,
    ...partial,
  };
}

function mapBox(id: string, code: string, productId: string, locationId?: string): MapBox {
  return {
    id,
    code,
    productId,
    status: "AVAILABLE",
    currentLocationId: locationId,
  };
}

describe("mapa do estoque", () => {
  it("agrupa por área, corredor e prateleira", () => {
    const locations = [
      location({ id: "a1", code: "SUP-A-01-01-01", areaId: "sup", aisle: "A", rack: "01" }),
      location({ id: "a2", code: "SUP-A-02-01-01", areaId: "sup", aisle: "A", rack: "02" }),
      location({ id: "b1", code: "SUP-B-01-01-01", areaId: "sup", aisle: "B", rack: "01" }),
      location({ id: "exp", code: "EXP-A-01-01-01", areaId: "exp", aisle: "A", rack: "01" }),
    ];
    const byArea = groupLocationsByArea(locations);
    expect(byArea.get("sup")).toHaveLength(3);
    expect(byArea.get("exp")).toHaveLength(1);
    const view = buildWarehouseMap(byArea.get("sup") ?? [], []);
    expect(view.aisles.map((aisle) => aisle.aisle)).toEqual(["A", "B"]);
    expect(view.aisles[0]?.racks.map((rack) => rack.rack)).toEqual(["01", "02"]);
    expect(view.aisles[1]?.racks.map((rack) => rack.rack)).toEqual(["01"]);
  });

  it("ordena corredor, prateleira, nível e posição de forma natural", () => {
    expect(compareNatural("2", "10")).toBeLessThan(0);
    expect(compareNatural("10", "3")).toBeGreaterThan(0);
    const locations = [
      location({ id: "p10", code: "SUP-A-10-01-10", rack: "10", level: "2", position: "10" }),
      location({ id: "p2", code: "SUP-A-2-10-2", rack: "2", level: "10", position: "2" }),
      location({ id: "p4", code: "SUP-A-2-4-4", rack: "2", level: "4", position: "4" }),
      location({ id: "aisle", code: "SUP-10-2-01-01", aisle: "10", rack: "2" }),
    ];
    const view = buildWarehouseMap(locations, []);
    expect(view.aisles.map((aisle) => aisle.aisle)).toEqual(["10", "A"]);
    const shelf = view.aisles[1];
    expect(shelf?.racks.map((item) => item.rack)).toEqual(["2", "10"]);
    expect(shelf?.racks[0]?.levels).toEqual(["10", "4"]);
    expect(shelf?.racks[0]?.positions).toEqual(["2", "4"]);
    expect(shelf?.racks[1]?.levels).toEqual(["2"]);
  });

  it("mostra a grade de demonstração com o nível mais alto em cima", () => {
    const view = buildWarehouseMap(demoLocations(), []);
    expect(view.aisles.map((aisle) => aisle.aisle)).toEqual(["A"]);
    const racks = view.aisles[0]?.racks ?? [];
    expect(racks.map((rack) => rack.rack)).toEqual(["01", "02"]);
    expect(racks[0]?.levels).toEqual(["04", "03", "02", "01"]);
    expect(racks[0]?.positions).toEqual(["01", "02", "03", "04"]);
    expect(racks[1]?.levels).toEqual(["03", "02", "01"]);
    expect(demoLocations()).toHaveLength(28);
    expect(demoLocations().find((item) => item.id === DEMO_LOCATION_IDS.a010101)?.code).toBe(
      "SUP-A-01-01-01",
    );
  });

  it("deixa um vão quando nível e posição não se cruzam", () => {
    const view = buildWarehouseMap(
      [
        location({ id: "only", code: "SUP-A-01-02-02", level: "02", position: "02" }),
        location({ id: "other", code: "SUP-A-01-01-01", level: "01", position: "01" }),
      ],
      [],
    );
    const rack = view.aisles[0]?.racks[0];
    expect(rack?.cells.has(cellKey("02", "01"))).toBe(false);
    expect(rack?.cells.has(cellKey("02", "02"))).toBe(true);
  });

  it("classifica livre, parcial, lotada e sem capacidade", () => {
    const empty = location({ id: "empty", code: "SUP-A-01-01-01", position: "01" });
    const partial = location({ id: "partial", code: "SUP-A-01-01-02", position: "02" });
    const full = location({ id: "full", code: "SUP-A-01-01-03", position: "03" });
    const open = location({
      id: "open",
      code: "SUP-A-01-01-04",
      position: "04",
      capacityBoxes: undefined,
    });
    const boxes = [
      mapBox("b1", "CX-1", "p", partial.id),
      mapBox("b2", "CX-2", "p", full.id),
      mapBox("b3", "CX-3", "p", full.id),
      mapBox("b4", "CX-4", "p", full.id),
      mapBox("b5", "CX-5", "p", full.id),
      mapBox("b6", "CX-6", "p", open.id),
      mapBox("b7", "CX-7", "p", open.id),
      mapBox("b8", "CX-8", "p", open.id),
    ];
    const view = buildWarehouseMap([empty, partial, full, open], boxes);
    const cells = view.aisles[0]?.racks[0]?.cells;
    expect(cells?.get(cellKey("01", "01"))?.occupancy.kind).toBe("EMPTY");
    expect(formatOccupancyCount(occupancyOf(empty, 0))).toBe("0 / 4");
    expect(cells?.get(cellKey("01", "02"))?.occupancy.kind).toBe("PARTIAL");
    expect(spokenLocation(partial, occupancyOf(partial, 1))).toBe(
      "SUP-A-01-01-02, 1 de 4 caixas, parcialmente ocupada.",
    );
    expect(cells?.get(cellKey("01", "03"))?.occupancy).toMatchObject({ kind: "FULL", boxCount: 4 });
    expect(classifyOccupancy({ status: "ACTIVE", boxCount: 3, capacityBoxes: undefined })).toBe(
      "UNBOUNDED",
    );
    expect(cells?.get(cellKey("01", "04"))?.occupancy.kind).toBe("UNBOUNDED");
    expect(formatOccupancyCount(occupancyOf(open, 3))).toBe("3");
    expect(classifyOccupancy({ status: "ACTIVE", boxCount: 0 })).toBe("EMPTY");
  });

  it("mantém bloqueada e inativa visíveis mesmo com ocupação", () => {
    expect(classifyOccupancy({ status: "BLOCKED", boxCount: 4, capacityBoxes: 4 })).toBe("BLOCKED");
    expect(classifyOccupancy({ status: "INACTIVE", boxCount: 0, capacityBoxes: 4 })).toBe(
      "INACTIVE",
    );
    const blocked = location({ id: "blocked", code: "SUP-A-01-04-04", status: "BLOCKED" });
    const inactive = location({
      id: "inactive",
      code: "SUP-A-02-03-04",
      rack: "02",
      status: "INACTIVE",
    });
    const view = buildWarehouseMap([blocked, inactive], [mapBox("b1", "CX-1", "p", blocked.id)]);
    expect(view.aisles[0]?.racks[0]?.cells.get(cellKey("01", "01"))?.occupancy.kind).toBe(
      "BLOCKED",
    );
    expect(view.aisles[0]?.racks[1]?.cells.get(cellKey("01", "01"))?.occupancy.kind).toBe(
      "INACTIVE",
    );
  });

  it("não esconde área inativa", () => {
    const area = { ...demoStorageAreas()[0]!, status: "INACTIVE" as const };
    expect(areaInactiveBadge(area.status)).toBe("INATIVA");
    expect(areaInactiveBadge("ACTIVE")).toBeNull();
    const view = buildWarehouseMap(
      demoLocations().filter((item) => item.areaId === area.id),
      [],
    );
    expect(view.aisles.length).toBeGreaterThan(0);
  });

  it("calcula capacidade conhecida e percentual sem distorcer posição sem capacidade", () => {
    const known = location({ id: "known", code: "SUP-A-01-01-01", capacityBoxes: 96 });
    const open = location({ id: "open", code: "SUP-A-01-01-02", capacityBoxes: undefined });
    const boxes = [
      ...Array.from({ length: 57 }, (_, index) =>
        mapBox(`k${index}`, `CX-${index}`, "p", known.id),
      ),
      ...Array.from({ length: 9 }, (_, index) => mapBox(`u${index}`, `CY-${index}`, "p", open.id)),
    ];
    const summary = calculateAreaOccupancy([known, open], boxes);
    expect(summary.locations).toBe(2);
    expect(summary.occupied).toBe(2);
    expect(summary.free).toBe(0);
    expect(summary.storedBoxes).toBe(66);
    expect(summary.knownCapacity).toBe(96);
    expect(summary.boxesInKnownCapacity).toBe(57);
    expect(summary.occupancyRatio).toBeCloseTo(57 / 96);
    expect(formatOccupancyPercent(summary.occupancyRatio)).toBe("59,4%");
    const none = calculateAreaOccupancy([open], boxes);
    expect(none.knownCapacity).toBeNull();
    expect(none.occupancyRatio).toBeNull();
    expect(formatOccupancyPercent(none.occupancyRatio)).toBeNull();
  });

  it("conta bloqueada e inativa à parte e ignora caixa sem endereço", () => {
    const blocked = location({ id: "blocked", code: "SUP-A-01-01-01", status: "BLOCKED" });
    const inactive = location({ id: "inactive", code: "SUP-A-01-01-02", status: "INACTIVE" });
    const summary = calculateAreaOccupancy(
      [blocked, inactive],
      [mapBox("loose", "CX-0", "p"), mapBox("kept", "CX-1", "p", blocked.id)],
    );
    expect(summary.blocked).toBe(1);
    expect(summary.inactive).toBe(1);
    expect(summary.storedBoxes).toBe(1);
    expect(summary.occupied).toBe(1);
    expect(summary.free).toBe(1);
  });

  it("agrupa caixas pela localização atual", () => {
    const grouped = boxesByLocation([
      mapBox("b2", "CX-2", "p", "loc"),
      mapBox("b1", "CX-1", "p", "loc"),
      mapBox("loose", "CX-9", "p"),
    ]);
    expect(grouped.get("loc")?.map((box) => box.code)).toEqual(["CX-1", "CX-2"]);
    expect(grouped.has(undefined as unknown as string)).toBe(false);
  });

  it("busca por código de caixa, endereço, produto, marca, cor, código interno e largura", () => {
    const azul = product({
      id: "azul",
      name: "Azul",
      brand: "Real",
      colorName: "Azul",
      widthMm: 35,
      internalCode: "REAL-AZUL-35",
    });
    const pinole = product({
      id: "pinole",
      name: "Pinole",
      brand: "Real/Rehau",
      colorName: "Pinole",
      widthMm: 22,
      internalCode: "REAL-PINOLE-22",
    });
    const first = location({
      id: "p04",
      code: "SUP-A-03-02-04",
      rack: "03",
      level: "02",
      position: "04",
    });
    const second = location({
      id: "p05",
      code: "SUP-A-03-02-05",
      rack: "03",
      level: "02",
      position: "05",
    });
    const third = location({
      id: "other",
      code: "SUP-A-04-01-02",
      rack: "04",
      level: "01",
      position: "02",
    });
    const empty = location({ id: "empty", code: "SUP-A-09-01-01", rack: "09" });
    const boxes = [
      mapBox("a1", "CX-AZUL-1", azul.id, first.id),
      mapBox("a2", "CX-AZUL-2", azul.id, first.id),
      mapBox("a3", "CX-AZUL-3", azul.id, second.id),
      mapBox("a4", "CX-AZUL-4", azul.id, third.id),
      mapBox("pin", "CX-PIN-1", pinole.id, second.id),
      mapBox("loose", "CX-SOLTA", azul.id),
    ];
    const input = { locations: [first, second, third, empty], boxes, products: [azul, pinole] };

    const byBox = searchWarehouse("CX-AZUL-1", input);
    expect(byBox.locationIds).toEqual([first.id]);
    expect(isSearchHighlight(first.id, byBox)).toBe(true);

    const byLocation = searchWarehouse("sup-a-09-01-01", input);
    expect(byLocation.locationIds).toEqual([empty.id]);
    expect(byLocation.places[0]?.boxCount).toBe(0);

    const byName = searchWarehouse("pinole", input);
    expect(byName.products.map((hit) => hit.productId)).toEqual([pinole.id]);

    const byBrand = searchWarehouse("rehau", input);
    expect(byBrand.products.map((hit) => hit.productId)).toEqual([pinole.id]);

    const byColor = searchWarehouse("azul", input);
    expect(byColor.products.map((hit) => hit.productId)).toEqual([azul.id]);

    const byCode = searchWarehouse("REAL-AZUL-35", input);
    expect(byCode.locationIds).toEqual([first.id, second.id, third.id]);

    const byWidth = searchWarehouse("35 mm", input);
    expect(byWidth.products[0]?.totalBoxes).toBe(4);
    expect(byWidth.looseBoxes.map((box) => box.code)).toEqual(["CX-SOLTA"]);

    const combined = searchWarehouse("azul 35 real", input);
    expect(combined.products).toHaveLength(1);
    expect(combined.products[0]?.totalBoxes).toBe(4);
    expect(combined.products[0]?.places.map((place) => [place.code, place.boxCount])).toEqual([
      ["SUP-A-03-02-04", 2],
      ["SUP-A-03-02-05", 1],
      ["SUP-A-04-01-02", 1],
    ]);
    expect(combined.looseBoxes).toHaveLength(1);

    const blank = searchWarehouse("   mm  ", input);
    expect(blank.locationIds).toEqual([]);
    expect(isSearchHighlight(first.id, blank)).toBe(false);
  });

  it("encontra a caixa de demonstração e ignora busca vazia no destaque", () => {
    const boxes = demoBoxState().boxes;
    const located = boxes.find((box) => box.currentLocationId === DEMO_LOCATION_IDS.a010101);
    const loose = boxes.find((box) => !box.currentLocationId);
    const result = searchWarehouse(located!.code, {
      locations: demoLocations(),
      boxes,
      products: demoProducts(),
    });
    expect(result.locationIds).toEqual([DEMO_LOCATION_IDS.a010101]);
    const missing = searchWarehouse(loose!.code, {
      locations: demoLocations(),
      boxes,
      products: demoProducts(),
    });
    expect(missing.locationIds).toEqual([]);
    expect(missing.looseBoxes.map((box) => box.boxId)).toEqual([loose!.id]);
    const width = searchWarehouse("35", {
      locations: demoLocations(),
      boxes,
      products: demoProducts(),
    });
    expect(width.locationIds).toEqual([DEMO_LOCATION_IDS.a010101, DEMO_LOCATION_IDS.a010102]);
  });

  it("combina corredor, prateleira, status, ocupação, produto e marca", () => {
    const azul = product({ id: "azul", name: "Azul", brand: "Real", widthMm: 35 });
    const other = product({ id: "other", name: "Branco", brand: "Proadec", widthMm: 35 });
    const match = location({ id: "match", code: "SUP-A-03-02-04", aisle: "A", rack: "03" });
    const otherRack = location({ id: "rack", code: "SUP-A-04-01-01", aisle: "A", rack: "04" });
    const blocked = location({
      id: "blocked",
      code: "SUP-A-03-02-01",
      aisle: "A",
      rack: "03",
      status: "BLOCKED",
    });
    const empty = location({ id: "empty", code: "SUP-B-03-01-01", aisle: "B", rack: "03" });
    const full = location({
      id: "full",
      code: "SUP-A-03-01-01",
      aisle: "A",
      rack: "03",
      level: "02",
    });
    const boxes = [
      mapBox("a1", "CX-1", azul.id, match.id),
      mapBox("o1", "CX-2", other.id, otherRack.id),
      mapBox("f1", "CX-3", azul.id, full.id),
      mapBox("f2", "CX-4", azul.id, full.id),
      mapBox("f3", "CX-5", azul.id, full.id),
      mapBox("f4", "CX-6", azul.id, full.id),
    ];
    const locations = [match, otherRack, blocked, empty, full];
    const products = [azul, other];
    const filtered = filterWarehouseLocations(locations, boxes, products, {
      aisle: "a",
      rack: "03",
      status: "ACTIVE",
      fill: "OCCUPIED",
      productId: azul.id,
      brand: "real",
    });
    expect(filtered.map((item) => item.id).sort()).toEqual(["full", "match"]);
    const onlyFull = filterWarehouseLocations(locations, boxes, products, { fill: "FULL" });
    expect(onlyFull.map((item) => item.id)).toEqual(["full"]);
    const onlyBlocked = filterWarehouseLocations(locations, boxes, products, { status: "BLOCKED" });
    expect(onlyBlocked.map((item) => item.id)).toEqual(["blocked"]);
  });
});
