import {
  cloneSpatial,
  type FaceCode,
  type SpatialSlot,
  type StorageStructure,
  type StructureKind,
} from "./spatial";
export function createStructure(
  kind: StructureKind,
  code: string,
  ids: () => string = () => crypto.randomUUID(),
): StorageStructure {
  const height = kind === "FLOOR" ? 0.2 : 2.4,
    width = kind === "HONEYCOMB" ? 2 : 3,
    depth = kind === "DOUBLE" ? 1.2 : 0.6;
  const counts = kind === "FLOOR" ? [1] : kind === "HONEYCOMB" ? [4, 4, 4] : [4, 3, 5];
  const faces: FaceCode[] = kind === "DOUBLE" ? ["A", "B"] : ["U"];
  return {
    id: ids(),
    code,
    name:
      kind === "HONEYCOMB"
        ? "Colmeia"
        : kind === "FLOOR"
          ? "Posição de piso"
          : kind === "DOUBLE"
            ? "Prateleira dupla"
            : "Prateleira simples",
    kind,
    x: width / 2 + 0.5,
    z: depth / 2 + 0.5,
    rotation: 0,
    width,
    height,
    depth,
    faces: faces.map((face) => ({
      code: face,
      levels: counts.map((count) => ({
        height: height / counts.length,
        slots: Array.from({ length: count }, () => ({
          id: ids(),
          width: width / count,
          depth: depth / (kind === "DOUBLE" ? 2 : 1),
          status: "ACTIVE",
        })),
      })),
    })),
  };
}
/** Keeps IDs/bindings of all surviving slots; deletion is validated by the service. */
export function resizeLevel(
  structure: StorageStructure,
  face: FaceCode,
  level: number,
  count: number,
  ids: () => string = () => crypto.randomUUID(),
): StorageStructure {
  const next = cloneSpatial(structure);
  const l = next.faces.find((f) => f.code === face)?.levels[level - 1];
  if (!l || !Number.isInteger(count) || count < 1 || count > 40) return next;
  l.slots = Array.from({ length: count }, (_, i) => ({
    ...(l.slots[i] ?? {
      id: ids(),
      depth: next.depth / (next.kind === "DOUBLE" ? 2 : 1),
      status: "ACTIVE" as const,
    }),
    width: next.width / count,
  }));
  return next;
}
export type SlotGeometry = {
  slot: SpatialSlot;
  face: FaceCode;
  level: number;
  position: number;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
};
export function structureGeometry(structure: StorageStructure): SlotGeometry[] {
  return structure.faces.flatMap((face) => {
    let bottom = 0;
    return face.levels.flatMap((level, li) => {
      let left = -structure.width / 2;
      const y = bottom + level.height / 2;
      bottom += level.height;
      return level.slots.map((slot, pi) => {
        const x = (left + slot.width / 2) * (face.code === "B" ? -1 : 1);
        left += slot.width;
        const z =
          structure.kind === "DOUBLE"
            ? (face.code === "B" ? -1 : 1) * (structure.depth / 2 - slot.depth / 2)
            : 0;
        return {
          slot,
          face: face.code,
          level: li + 1,
          position: pi + 1,
          x,
          y,
          z,
          width: slot.width,
          height: level.height,
          depth: slot.depth,
        };
      });
    });
  });
}
