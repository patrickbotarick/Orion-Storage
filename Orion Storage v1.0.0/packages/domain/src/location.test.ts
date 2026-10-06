import { describe, expect, it } from "vitest";

import {
  DuplicateLocationError,
  DuplicateStorageAreaCodeError,
  LocationCapacityError,
  LocationNotAssignableError,
  LocationStructureLockedError,
} from "./errors";
import { buildLocationHistory } from "./box-history";
import {
  addressIdentity,
  assertLocationAssignable,
  assertLocationHasRoom,
  assertStructureEditable,
  assertUniqueLocation,
  buildLocationCode,
  canonicalStructure,
  sameLocationStructure,
} from "./location";
import { assertUniqueAreaCode } from "./storage-area";
import { demoLocations, demoStorageAreas } from "./location-seeds";

const area = demoStorageAreas()[0]!;
const locations = demoLocations();

describe("endereço físico", () => {
  it("cria área de demonstração e rejeita código repetido", () => {
    expect(area.code).toBe("SUP");
    expect(area.name).toBe("Estoque Superior");
    expect(() => assertUniqueAreaCode([area], " sup ")).toThrow(DuplicateStorageAreaCodeError);
    expect(assertUniqueAreaCode([area], "EXP")).toBe("EXP");
  });

  it("gera o código operacional e normaliza variações do mesmo endereço", () => {
    const code = buildLocationCode(area.code, {
      areaId: area.id,
      aisle: " a ",
      rack: "03",
      level: "02",
      position: "04",
    });
    expect(code).toBe("SUP-A-03-02-04");
    const left = canonicalStructure({
      areaId: area.id,
      aisle: "A",
      rack: "03",
      level: "02",
      position: "04",
    });
    const right = canonicalStructure({
      areaId: area.id,
      aisle: " a ",
      rack: "03",
      level: "02",
      position: "04",
    });
    expect(addressIdentity(left)).toBe(addressIdentity(right));
    expect(sameLocationStructure(left, right)).toBe(true);
  });

  it("rejeita endereço duplicado e aceita posição ativa", () => {
    expect(() =>
      assertUniqueLocation(locations, {
        areaId: area.id,
        aisle: "a",
        rack: "01",
        level: "01",
        position: "01",
        code: "SUP-A-01-01-01",
      }),
    ).toThrow(DuplicateLocationError);
    expect(() => assertLocationAssignable("ACTIVE")).not.toThrow();
    expect(() => assertLocationAssignable("BLOCKED")).toThrow(LocationNotAssignableError);
    expect(() => assertLocationAssignable("INACTIVE")).toThrow(LocationNotAssignableError);
  });

  it("respeita capacidade opcional e máxima", () => {
    const boxes = [
      { id: "b1", currentLocationId: "loc" },
      { id: "b2", currentLocationId: "loc" },
      { id: "b3", currentLocationId: "loc" },
      { id: "b4", currentLocationId: "loc" },
      { id: "loose" },
    ];
    expect(boxes.find((box) => !box.currentLocationId)?.id).toBe("loose");
    expect(() =>
      assertLocationHasRoom({ capacityBoxes: undefined, boxes, locationId: "loc", movingBoxId: "loose" }),
    ).not.toThrow();
    expect(() =>
      assertLocationHasRoom({ capacityBoxes: 4, boxes, locationId: "loc", movingBoxId: "loose" }),
    ).toThrow(LocationCapacityError);
    expect(() =>
      assertLocationHasRoom({ capacityBoxes: 4, boxes, locationId: "loc", movingBoxId: "b1" }),
    ).not.toThrow();
  });

  it("impede mudar a estrutura ocupada e registra o histórico de localização", () => {
    expect(() => assertStructureEditable(1, true)).toThrow(LocationStructureLockedError);
    expect(() => assertStructureEditable(0, true)).not.toThrow();
    const assigned = buildLocationHistory({
      id: "h1",
      boxId: "box",
      createdAt: "2026-10-06T19:00:00.000Z",
      nextId: "loc-1",
      nextCode: "SUP-A-01-01-01",
    });
    const changed = buildLocationHistory({
      id: "h2",
      boxId: "box",
      createdAt: "2026-10-06T20:00:00.000Z",
      previousId: "loc-1",
      previousCode: "SUP-A-01-01-01",
      nextId: "loc-2",
      nextCode: "SUP-A-01-01-02",
    });
    const cleared = buildLocationHistory({
      id: "h3",
      boxId: "box",
      createdAt: "2026-10-06T21:00:00.000Z",
      previousId: "loc-2",
      previousCode: "SUP-A-01-01-02",
    });
    expect(assigned?.type).toBe("LOCATION_ASSIGNED");
    expect(changed?.type).toBe("LOCATION_CHANGED");
    expect(changed?.metadata?.previousLocationCode).toBe("SUP-A-01-01-01");
    expect(changed?.metadata?.nextLocationCode).toBe("SUP-A-01-01-02");
    expect(cleared?.type).toBe("LOCATION_CLEARED");
    expect(cleared?.description).toContain("SUP-A-01-01-02");
  });
});
