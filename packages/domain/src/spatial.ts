import type { Location, LocationStatus } from "./location";

export type FaceCode = "U" | "A" | "B";
export type StructureKind = "SINGLE" | "DOUBLE" | "HONEYCOMB" | "FLOOR";
export type SpatialSlot = {
  id: string;
  locationId?: string;
  width: number;
  depth: number;
  status: LocationStatus;
  capacityBoxes?: number;
};
export type SpatialLevel = { height: number; slots: SpatialSlot[] };
export type StructureFace = { code: FaceCode; levels: SpatialLevel[] };
export type StorageStructure = {
  id: string;
  code: string;
  name: string;
  zoneId?: string;
  kind: StructureKind;
  x: number;
  z: number;
  rotation: number;
  width: number;
  height: number;
  depth: number;
  faces: StructureFace[];
};
export type SpatialZone = { id: string; code: string; name: string };
export type SpatialLayout = {
  areaId: string;
  revision: number;
  width: number;
  depth: number;
  grid: number;
  zones: SpatialZone[];
  structures: StorageStructure[];
  updatedAt?: string;
};
export type SpatialAddress = {
  structureId: string;
  face: FaceCode;
  level: number;
  position: number;
  retired?: boolean;
  legacyCode?: boolean;
};
export type SpatialState = { version: 1; layouts: SpatialLayout[] };
export class SpatialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpatialError";
  }
}
export const emptyLayout = (areaId: string): SpatialLayout => ({
  areaId,
  revision: 0,
  width: 20,
  depth: 12,
  grid: 0.25,
  zones: [],
  structures: [],
});
export const cloneSpatial = <T>(value: T): T => structuredClone(value);
export function spatialCode(
  areaCode: string,
  structureCode: string,
  face: FaceCode,
  level: number,
  position: number,
) {
  return `${areaCode}-${structureCode}-${face}-N${String(level).padStart(2, "0")}-P${String(position).padStart(2, "0")}`;
}
export function validateLayout(layout: SpatialLayout): string[] {
  const errors: string[] = [];
  const positive = (v: number, max = 1000) => Number.isFinite(v) && v > 0 && v <= max;
  if (!layout.areaId || !Number.isInteger(layout.revision) || layout.revision < 0)
    errors.push("Área/revisão inválida.");
  if (!positive(layout.width) || !positive(layout.depth) || !positive(layout.grid, 10))
    errors.push("Dimensões da área ou grade inválidas.");
  if (layout.structures.length > 50) errors.push("Limite de 50 estruturas por área.");
  const unique = (values: string[], label: string) => {
    if (values.some((v) => !v) || new Set(values).size !== values.length)
      errors.push(`${label}: identificadores duplicados ou vazios.`);
  };
  unique(
    layout.structures.map((s) => s.id),
    "Estruturas",
  );
  unique(
    layout.structures.map((s) => s.code),
    "Códigos de estruturas",
  );
  unique(
    layout.zones.map((z) => z.id),
    "Zonas",
  );
  unique(
    layout.zones.map((z) => z.code),
    "Códigos de zonas",
  );
  if (layout.zones.some((z) => !z.name.trim() || !/^[A-Z0-9]{1,16}$/.test(z.code)))
    errors.push("Zona inválida.");
  const slots: SpatialSlot[] = [];
  for (const s of layout.structures) {
    if (!/^E\d{3,6}$/.test(s.code) || !s.name.trim() || s.name.length > 80)
      errors.push(`${s.code}: informe código E001 e nome válido.`);
    if (s.zoneId && !layout.zones.some((z) => z.id === s.zoneId))
      errors.push(`${s.code}: zona inexistente.`);
    if (!["SINGLE", "DOUBLE", "HONEYCOMB", "FLOOR"].includes(s.kind))
      errors.push(`${s.code}: tipo inválido.`);
    if (
      ![s.width, s.height, s.depth].every((v) => positive(v, 100)) ||
      ![s.x, s.z, s.rotation].every(Number.isFinite)
    )
      errors.push(`${s.code}: dimensões/posição inválidas.`);
    const faces = s.faces
      .map((f) => f.code)
      .sort()
      .join("");
    if (faces !== (s.kind === "DOUBLE" ? "AB" : "U"))
      errors.push(`${s.code}: faces incompatíveis com o tipo.`);
    for (const f of s.faces) {
      if (!f.levels.length || f.levels.length > 20)
        errors.push(`${s.code}/${f.code}: use 1 a 20 níveis.`);
      if (f.levels.reduce((sum, l) => sum + l.height, 0) > s.height + 0.001)
        errors.push(`${s.code}/${f.code}: níveis excedem a altura.`);
      for (const l of f.levels) {
        if (!positive(l.height, 100) || !l.slots.length || l.slots.length > 40)
          errors.push(`${s.code}: nível inválido (1 a 40 posições).`);
        if (l.slots.reduce((sum, p) => sum + p.width, 0) > s.width + 0.001)
          errors.push(`${s.code}: posições excedem a largura.`);
        for (const p of l.slots) {
          slots.push(p);
          if (
            !positive(p.width, 100) ||
            !positive(p.depth, 100) ||
            p.depth > s.depth / (s.kind === "DOUBLE" ? 2 : 1) + 0.001 ||
            !["ACTIVE", "BLOCKED", "INACTIVE"].includes(p.status)
          )
            errors.push(`${s.code}: compartimento inválido.`);
          if (
            p.capacityBoxes != null &&
            (!Number.isInteger(p.capacityBoxes) || p.capacityBoxes < 1)
          )
            errors.push(`${s.code}: capacidade inválida.`);
        }
      }
    }
    if (
      corners(s).some(
        (p) =>
          p.x < -0.001 || p.z < -0.001 || p.x > layout.width + 0.001 || p.z > layout.depth + 0.001,
      )
    )
      errors.push(`${s.code}: fora dos limites da área.`);
  }
  unique(
    slots.map((p) => p.id),
    "Posições",
  );
  unique(
    slots.flatMap((p) => (p.locationId ? [p.locationId] : [])),
    "Endereços vinculados",
  );
  if (slots.length > 2000) errors.push("Limite de 2000 posições por área.");
  for (let i = 0; i < layout.structures.length; i++)
    for (let j = i + 1; j < layout.structures.length; j++)
      if (overlap(layout.structures[i]!, layout.structures[j]!))
        errors.push(`${layout.structures[i]!.code} e ${layout.structures[j]!.code}: sobreposição.`);
  return [...new Set(errors)];
}
export function localToWorld(s: StorageStructure, x: number, z: number) {
  const r = (s.rotation * Math.PI) / 180;
  return { x: s.x + x * Math.cos(r) + z * Math.sin(r), z: s.z - x * Math.sin(r) + z * Math.cos(r) };
}
function corners(s: StorageStructure) {
  return [
    [-1, -1],
    [-1, 1],
    [1, 1],
    [1, -1],
  ].map(([x, z]) => localToWorld(s, (x! * s.width) / 2, (z! * s.depth) / 2));
}
export function overlap(a: StorageStructure, b: StorageStructure) {
  const ca = corners(a),
    cb = corners(b);
  for (const s of [a, b])
    for (const r of [s.rotation, s.rotation + 90]) {
      const rad = (r * Math.PI) / 180;
      const project = (p: { x: number; z: number }) => p.x * Math.cos(rad) - p.z * Math.sin(rad);
      const va = ca.map(project),
        vb = cb.map(project);
      if (Math.max(...va) <= Math.min(...vb) + 0.001 || Math.max(...vb) <= Math.min(...va) + 0.001)
        return false;
    }
  return true;
}
export function layoutSlots(layout: SpatialLayout) {
  return layout.structures.flatMap((structure) =>
    structure.faces.flatMap((face) =>
      face.levels.flatMap((level, li) =>
        level.slots.map((slot, pi) => ({
          structure,
          face: face.code,
          level: li + 1,
          position: pi + 1,
          slot,
        })),
      ),
    ),
  );
}
export function locationMatchesCode(
  location: Pick<Location, "id" | "code" | "qrCode" | "codeAliases">,
  code: string,
) {
  const key = code.trim().toUpperCase();
  return [location.code, location.qrCode, ...(location.codeAliases ?? [])].some(
    (v) => v?.toUpperCase() === key,
  );
}
