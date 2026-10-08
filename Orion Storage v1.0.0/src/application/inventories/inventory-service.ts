import {
  assertInventoryOpen,
  filterInventories,
  finishInventory,
  inventoryBoxSnapshot,
  InventoryError,
  inventoryScopeLocations,
  observeInventoryBox,
  resolveManualEntry,
  snapshotInventoryItems,
  type BoxRepository,
  type InventoryQuery,
  type InventoryRepository,
  type InventoryScope,
  type InventorySession,
  type LocationRepository,
  type StorageAreaRepository,
} from "@orion/domain";
import { LocalStorageBoxRepository } from "@/persistence/local-storage-box-repository";
import { LocalStorageInventoryRepository } from "@/persistence/local-storage-inventory-repository";
import { LocalStorageLocationRepository } from "@/persistence/local-storage-location-repository";
import { LocalStorageStorageAreaRepository } from "@/persistence/local-storage-storage-area-repository";

export type InventoryService = {
  list(query?: InventoryQuery): Promise<InventorySession[]>;
  getById(id: string): Promise<InventorySession | null>;
  start(scope: InventoryScope, notes?: string): Promise<InventorySession>;
  record(id: string, raw: string, locationId: string): Promise<InventorySession>;
  complete(id: string): Promise<InventorySession>;
  cancel(id: string): Promise<InventorySession>;
};

export function createInventoryService(
  inventories: InventoryRepository,
  boxes: BoxRepository,
  locations: LocationRepository,
  areas: StorageAreaRepository,
  ids: () => string = () => crypto.randomUUID(),
  now: () => string = () => new Date().toISOString(),
): InventoryService {
  async function requireSession(id: string) {
    const session = await inventories.getById(id);
    if (!session) throw new InventoryError("Inventário não encontrado.");
    assertInventoryOpen(session);
    return session;
  }
  return {
    list: async (query = {}) => filterInventories(await inventories.list(), query),
    getById: (id) => inventories.getById(id),
    async start(input, notes) {
      const area = await areas.getById(input.areaId);
      if (!area) throw new InventoryError("Área não encontrada.");
      // Canonical scope discards irrelevant hidden selections.
      const scope: InventoryScope = { scope: input.scope, areaId: area.id };
      if (input.scope === "LOCATION") scope.locationId = input.locationId;
      if (["AISLE", "RACK", "LEVEL"].includes(input.scope)) scope.aisle = input.aisle;
      if (["RACK", "LEVEL"].includes(input.scope)) scope.rack = input.rack;
      if (input.scope === "LEVEL") scope.level = input.level;
      const allLocations = await locations.list();
      const selected = inventoryScopeLocations(scope, allLocations);
      const catalogSnapshot = (await boxes.list()).map((box) =>
        inventoryBoxSnapshot(box, allLocations),
      );
      const timestamp = now();
      const scopeLabel = [
        area.name,
        scope.aisle && `Corredor ${scope.aisle}`,
        scope.rack && `Prateleira ${scope.rack}`,
        scope.level && `Nível ${scope.level}`,
        scope.scope === "LOCATION" && selected[0]!.code,
      ]
        .filter(Boolean)
        .join(" / ");
      return inventories.create({
        ...scope,
        id: ids(),
        status: "IN_PROGRESS",
        scopeLabel,
        locations: selected,
        catalogSnapshot,
        items: snapshotInventoryItems(catalogSnapshot, selected),
        startedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        revision: 0,
        ...(notes?.trim() ? { notes: notes.trim() } : {}),
      });
    },
    async record(id, raw, locationId) {
      const session = await requireSession(id);
      const catalog = await boxes.list();
      const hit = resolveManualEntry(raw, { boxes: catalog, locations: session.locations });
      if (hit.type !== "box")
        throw new InventoryError("Leia o código de uma caixa para contabilizar.");
      const box = catalog.find((item) => item.id === hit.entityId);
      if (!box) throw new InventoryError("Caixa não encontrada.");
      return inventories.save(
        observeInventoryBox(
          session,
          inventoryBoxSnapshot(box, await locations.list()),
          locationId,
          now(),
        ),
        session.revision,
      );
    },
    async complete(id) {
      const session = await requireSession(id);
      return inventories.save(finishInventory(session, "COMPLETED", now()), session.revision);
    },
    async cancel(id) {
      const session = await requireSession(id);
      return inventories.save(finishInventory(session, "CANCELLED", now()), session.revision);
    },
  };
}

let browserService: InventoryService | null = null;
export function getBrowserInventoryService(): InventoryService {
  if (typeof window === "undefined")
    throw new InventoryError("Inventários só estão disponíveis no navegador.");
  if (!browserService) {
    const store = window.localStorage;
    browserService = createInventoryService(
      new LocalStorageInventoryRepository(store),
      new LocalStorageBoxRepository(store),
      new LocalStorageLocationRepository(store),
      new LocalStorageStorageAreaRepository(store),
    );
  }
  return browserService;
}
