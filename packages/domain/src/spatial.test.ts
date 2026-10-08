import { describe, it, expect } from "vitest";
import {
  emptyLayout,
  validateLayout,
  localToWorld,
  overlap,
  spatialCode,
  type StorageStructure,
} from "./spatial";
import { resolveManualEntry } from "./identification";
const structure = (): StorageStructure => ({
  id: "s1",
  code: "E001",
  name: "Prateleira",
  kind: "SINGLE",
  x: 3,
  z: 3,
  rotation: 0,
  width: 2,
  height: 2,
  depth: 1,
  faces: [
    {
      code: "U",
      levels: [{ height: 1, slots: [{ id: "p1", width: 1, depth: 1, status: "ACTIVE" }] }],
    },
  ],
});
describe("domínio espacial", () => {
  it("valida layout sem forçar endereços antigos", () =>
    expect(validateLayout(emptyLayout("area"))).toEqual([]));
  it("gera endereço neutro sem zona", () =>
    expect(spatialCode("ES", "E003", "B", 2, 4)).toBe("ES-E003-B-N02-P04"));
  it("mantém referencial A +Z/B -Z ao rotacionar", () => {
    const s = structure();
    s.rotation = 90;
    expect(localToWorld(s, 0, 1).x).toBeCloseTo(4);
    expect(localToWorld(s, 0, -1).x).toBeCloseTo(2);
  });
  it("detecta colisão rotacionada e permite apenas encostar", () => {
    const a = structure(),
      b = { ...structure(), id: "s2", code: "E002", x: 5 };
    expect(overlap(a, b)).toBe(false);
    b.x = 4;
    expect(overlap(a, b)).toBe(true);
    b.x = 3;
    b.z = 5;
    b.rotation = 90;
    expect(overlap(a, b)).toBe(false);
  });
  it("recusa limites, dimensões e IDs repetidos", () => {
    const l = emptyLayout("area");
    l.structures = [structure(), structure()];
    l.structures[0]!.x = 0;
    expect(validateLayout(l).join(" ")).toMatch(/limites/);
    expect(validateLayout(l).join(" ")).toMatch(/duplicados/);
    l.width = NaN;
    expect(validateLayout(l).length).toBeGreaterThan(0);
  });
  it("resolve QR estável e alias legado após renomear", () => {
    const locations = [
      { id: "id", code: "ES-E002-U-N01-P01", qrCode: "LOC-ID", codeAliases: ["ES-E001-U-N01-P01"] },
    ];
    for (const code of ["LOC-ID", "ES-E001-U-N01-P01", "ES-E002-U-N01-P01"])
      expect(
        resolveManualEntry(`orion://v1/location/${code}`, { locations, boxes: [] }).entityId,
      ).toBe("id");
  });
});
