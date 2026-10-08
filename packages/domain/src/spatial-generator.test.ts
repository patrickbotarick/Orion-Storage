import { describe, it, expect } from "vitest";
import { createStructure, resizeLevel, structureGeometry } from "./spatial-generator";
import { emptyLayout, validateLayout, type StructureKind } from "./spatial";
describe("gerador modular", () => {
  for (const kind of ["SINGLE", "DOUBLE", "HONEYCOMB", "FLOOR"] as StructureKind[])
    it(`gera ${kind} com dimensões/faces válidas`, () => {
      const s = createStructure(kind, "E001");
      const layout = emptyLayout("a");
      layout.structures = [s];
      expect(validateLayout(layout)).toEqual([]);
      expect(structureGeometry(s).length).toBe(
        s.faces.reduce((sum, f) => sum + f.levels.reduce((v, l) => v + l.slots.length, 0), 0),
      );
    });
  it("permite níveis independentes e preserva os IDs restantes", () => {
    let s = createStructure("DOUBLE", "E001");
    const previous = s.faces[0]!.levels[0]!.slots[0]!.id;
    s = resizeLevel(s, "A", 1, 5);
    s = resizeLevel(s, "B", 2, 2);
    expect(s.faces[0]!.levels.map((l) => l.slots.length)).toEqual([5, 3, 5]);
    expect(s.faces[1]!.levels.map((l) => l.slots.length)).toEqual([4, 2, 5]);
    expect(s.faces[0]!.levels[0]!.slots[0]!.id).toBe(previous);
  });
  it("orienta P01 à esquerda de quem observa cada face", () => {
    const cells = structureGeometry(createStructure("DOUBLE", "E001"));
    const a = cells.find((c) => c.face === "A" && c.level === 1 && c.position === 1)!,
      b = cells.find((c) => c.face === "B" && c.level === 1 && c.position === 1)!;
    expect(a.x).toBeLessThan(0);
    expect(b.x).toBeGreaterThan(0);
    expect(a.z).toBeGreaterThan(0);
    expect(b.z).toBeLessThan(0);
  });
  it("níveis crescem de baixo para cima com compartimentos desiguais", () => {
    const s = createStructure("SINGLE", "E001");
    s.faces[0]!.levels[0]!.slots[0]!.width = 0.4;
    const g = structureGeometry(s);
    expect(g.find((c) => c.level === 2)!.y).toBeGreaterThan(g[0]!.y);
    expect(g[0]!.width).toBe(0.4);
  });
});
