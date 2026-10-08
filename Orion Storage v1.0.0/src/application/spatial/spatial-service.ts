import {
  cloneSpatial,
  emptyLayout,
  layoutSlots,
  spatialCode,
  SpatialError,
  validateLayout,
  type BoxRepository,
  type LocationRepository,
  type SpatialLayout,
  type StorageAreaRepository,
} from "@orion/domain";
import type { KeyValueStore } from "@/persistence/key-value-store";
import { LocalStorageSpatialRepository } from "@/persistence/local-storage-spatial-repository";
import { commitSpatialWrite, LOCATION_KEY, SPATIAL_KEY } from "@/persistence/spatial-transaction";
import { LocalStorageLocationRepository } from "@/persistence/local-storage-location-repository";
import { LocalStorageStorageAreaRepository } from "@/persistence/local-storage-storage-area-repository";
import { LocalStorageBoxRepository } from "@/persistence/local-storage-box-repository";
export function createSpatialService(
  store: KeyValueStore,
  locations: LocationRepository,
  areas: StorageAreaRepository,
  boxes: BoxRepository,
  ids: () => string = () => crypto.randomUUID(),
  now = () => new Date().toISOString(),
) {
  const repository = new LocalStorageSpatialRepository(store);
  return {
    async load(areaId: string) {
      if (!(await areas.getById(areaId))) throw new SpatialError("Área inexistente.");
      return cloneSpatial(
        repository.read().layouts.find((l) => l.areaId === areaId) ?? emptyLayout(areaId),
      );
    },
    async save(input: SpatialLayout, confirmRemoval = false) {
      const state = repository.read();
      const area = await areas.getById(input.areaId);
      if (!area || area.status !== "ACTIVE") throw new SpatialError("Selecione uma área ativa.");
      const current =
        state.layouts.find((l) => l.areaId === input.areaId) ?? emptyLayout(input.areaId);
      if (current.revision !== input.revision)
        throw new SpatialError("O layout mudou. Reabra o editor.");
      const issues = validateLayout(input);
      if (issues.length) throw new SpatialError(issues.join(" "));
      const official = await locations.list();
      const stock = await boxes.list();
      const before = {
        locations: store.getItem(LOCATION_KEY)!,
        spatial: store.getItem(SPATIAL_KEY),
        boxes: store.getItem("orion-storage.boxes.v1"),
      };
      // Legacy repositories tolerate unreadable envelopes; editing must never interpret
      // that fallback as an empty warehouse and overwrite or retire occupied addresses.
      assertOfficialSnapshot(before.locations, "locations", official);
      assertOfficialSnapshot(before.boxes, "boxes", stock);
      const next = cloneSpatial(input);
      const nextLocations = cloneSpatial(official);
      const oldIds = layoutSlots(current).flatMap((p) =>
        p.slot.locationId ? [p.slot.locationId] : [],
      );
      const nextIds = new Set(
        layoutSlots(next).flatMap((p) => (p.slot.locationId ? [p.slot.locationId] : [])),
      );
      const removed = oldIds.filter((id) => !nextIds.has(id));
      if (removed.some((id) => stock.some((b) => b.currentLocationId === id)))
        throw new SpatialError(
          "Não é possível remover posição ocupada. Realoque as caixas primeiro.",
        );
      if (removed.length && !confirmRemoval)
        throw new SpatialError("Confirme a desativação das posições removidas.");
      for (const id of removed) {
        const l = nextLocations.find((l) => l.id === id)!;
        l.status = "INACTIVE";
        if (l.spatial) l.spatial.retired = true;
        l.updatedAt = now();
      }
      for (const item of layoutSlots(next)) {
        const { slot, structure, face, level, position } = item;
        let location = slot.locationId
          ? nextLocations.find((l) => l.id === slot.locationId)
          : undefined;
        if (slot.locationId && !location) throw new SpatialError("Endereço vinculado não existe.");
        if (location && location.areaId !== next.areaId)
          throw new SpatialError("Endereço pertence a outra área.");
        if (location?.spatial && !oldIds.includes(location.id))
          throw new SpatialError("Endereço já vinculado a outra estrutura ou posição desativada.");
        const previousSlot = layoutSlots(current).find((c) => c.slot.id === slot.id)?.slot;
        // A geometry-only save must not undo operational status/capacity changes.
        if (location && previousSlot && previousSlot.locationId === location.id) {
          if (slot.status === previousSlot.status) slot.status = location.status;
          if (slot.capacityBoxes === previousSlot.capacityBoxes)
            slot.capacityBoxes = location.capacityBoxes;
        }
        const code = spatialCode(area.code, structure.code, face, level, position);
        if (!location) {
          const id = ids();
          location = {
            id,
            code,
            areaId: area.id,
            aisle: face,
            rack: structure.code,
            level: `N${String(level).padStart(2, "0")}`,
            position: `P${String(position).padStart(2, "0")}`,
            status: slot.status,
            createdAt: now(),
            updatedAt: now(),
          };
          nextLocations.push(location);
          slot.locationId = id;
        } else if (location.spatial && !location.spatial.legacyCode) {
          if (location.code !== code)
            location.codeAliases = [...new Set([...(location.codeAliases ?? []), location.code])];
          location.code = code;
          location.aisle = face;
          location.rack = structure.code;
          location.level = `N${String(level).padStart(2, "0")}`;
          location.position = `P${String(position).padStart(2, "0")}`;
        }
        // Existing legacy codes are retained on first explicit binding; internal ID/history never change.
        const occupied = stock.filter((b) => b.currentLocationId === location.id).length;
        if (slot.capacityBoxes != null && slot.capacityBoxes < occupied)
          throw new SpatialError("Capacidade menor que o estoque vinculado.");
        location.qrCode ??= `LOC-${location.id.toUpperCase()}`;
        const legacyCode =
          location.spatial?.legacyCode ??
          (official.some((l) => l.id === location.id) && !location.spatial);
        location.spatial = {
          structureId: structure.id,
          face,
          level,
          position,
          ...(legacyCode ? { legacyCode: true } : {}),
        };
        location.status = slot.status;
        location.updatedAt = now();
        if (slot.capacityBoxes != null) location.capacityBoxes = slot.capacityBoxes;
        else delete location.capacityBoxes;
      }
      const identities = new Map<string, string>();
      for (const l of nextLocations)
        for (const code of [l.code, l.qrCode, ...(l.codeAliases ?? [])])
          if (code) {
            const key = code.toUpperCase();
            if (key.length > 80 || !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(key))
              throw new SpatialError("Código de endereço/QR inválido.");
            if (identities.has(key) && identities.get(key) !== l.id)
              throw new SpatialError(`Código já utilizado: ${key}.`);
            identities.set(key, l.id);
          }
      next.revision++;
      next.updatedAt = now();
      const updated = {
        version: 1 as const,
        layouts: [...state.layouts.filter((l) => l.areaId !== next.areaId), next],
      };
      commitSpatialWrite(store, before, {
        locations: JSON.stringify({ version: 1, locations: nextLocations }),
        spatial: JSON.stringify(updated),
      });
      return cloneSpatial(next);
    },
  };
}
export function getBrowserSpatialService() {
  if (typeof window === "undefined")
    throw new SpatialError("O editor espacial está disponível no navegador.");
  const store = window.localStorage;
  return createSpatialService(
    store,
    new LocalStorageLocationRepository(store),
    new LocalStorageStorageAreaRepository(store),
    new LocalStorageBoxRepository(store),
  );
}

function assertOfficialSnapshot(
  raw: string | null,
  key: "locations" | "boxes",
  records: ReadonlyArray<{ id: string; code: string }>,
) {
  try {
    const envelope = JSON.parse(raw ?? "null");
    const values = envelope?.[key];
    const identities = new Map(records.map((record) => [record.id, record.code]));
    if (
      envelope?.version !== 1 ||
      !Array.isArray(values) ||
      values.length !== records.length ||
      new Set(values.map((v) => v?.id)).size !== values.length ||
      values.some(
        (v) =>
          !v ||
          typeof v.id !== "string" ||
          !v.id ||
          typeof v.code !== "string" ||
          !v.code ||
          identities.get(v.id) !== v.code,
      )
    )
      throw new Error("Invalid snapshot");
  } catch {
    throw new SpatialError(
      "Dados operacionais inválidos foram preservados. O layout não foi gravado.",
    );
  }
}
