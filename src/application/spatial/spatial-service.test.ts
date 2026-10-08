import { describe, it, expect } from "vitest";
import { MemoryKeyValueStore } from "@/persistence/key-value-store";
import { LocalStorageLocationRepository } from "@/persistence/local-storage-location-repository";
import { LocalStorageStorageAreaRepository } from "@/persistence/local-storage-storage-area-repository";
import { LocalStorageBoxRepository } from "@/persistence/local-storage-box-repository";
import { createSpatialService } from "./spatial-service";
import { emptyLayout, DEMO_AREA_ID, resolveManualEntry, type SpatialLayout } from "@orion/domain";
import { SPATIAL_KEY, LOCATION_KEY, recoverSpatialWrite } from "@/persistence/spatial-transaction";
function fixture(store = new MemoryKeyValueStore()) {
  let id = 0;
  const locations = new LocalStorageLocationRepository(store),
    areas = new LocalStorageStorageAreaRepository(store),
    boxes = new LocalStorageBoxRepository(store);
  return {
    store,
    locations,
    boxes,
    service: createSpatialService(
      store,
      locations,
      areas,
      boxes,
      () => `spatial-${++id}`,
      () => "2026-10-08T18:00:00Z",
    ),
  };
}
function layout(): SpatialLayout {
  const l = emptyLayout(DEMO_AREA_ID);
  l.structures = [
    {
      id: "s",
      code: "E001",
      name: "Teste",
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
          levels: [{ height: 1, slots: [{ id: "p", width: 1, depth: 1, status: "ACTIVE" }] }],
        },
      ],
    },
  ];
  return l;
}
describe("SpatialService e persistência", () => {
  it.each([LOCATION_KEY, "orion-storage.boxes.v1"])(
    "recusa envelope operacional corrompido %s sem gravar",
    async (key) => {
      const f = fixture();
      f.store.setItem(key, "broken");
      await expect(f.service.save(layout())).rejects.toThrow(/preservados/);
      expect(f.store.getItem(key)).toBe("broken");
      expect(f.store.getItem(SPATIAL_KEY)).toBeNull();
    },
  );
  it("salvar geometria preserva bloqueio/capacidade editados fora do mapa", async () => {
    const f = fixture();
    const saved = await f.service.save(layout());
    const id = saved.structures[0]!.faces[0]!.levels[0]!.slots[0]!.locationId!;
    const loc = (await f.locations.getById(id))!;
    await f.locations.setStatus(id, "BLOCKED");
    await f.locations.update(id, { ...loc, capacityBoxes: 8 });
    saved.structures[0]!.x = 5;
    await f.service.save(saved);
    expect(await f.locations.getById(id)).toMatchObject({ status: "BLOCKED", capacityBoxes: 8 });
  });
  it("leitura não migra nem cria layout automaticamente", async () => {
    const f = fixture();
    await f.locations.list();
    const before = f.store.getItem(LOCATION_KEY);
    expect((await f.service.load(DEMO_AREA_ID)).structures).toEqual([]);
    expect(f.store.getItem(LOCATION_KEY)).toBe(before);
    expect(f.store.getItem(SPATIAL_KEY)).toBeNull();
  });
  it("cria posição oficial e recarrega geometria sem alterar caixas", async () => {
    const f = fixture();
    await f.boxes.list();
    const before = f.store.getItem("orion-storage.boxes.v1");
    const saved = await f.service.save(layout());
    expect(await fixture(f.store).service.load(DEMO_AREA_ID)).toEqual(saved);
    const l = await f.locations.getById(
      saved.structures[0]!.faces[0]!.levels[0]!.slots[0]!.locationId!,
    );
    expect(l?.code).toMatch(/E001-U-N01-P01$/);
    expect(l?.qrCode).toBe("LOC-SPATIAL-1");
    expect(f.store.getItem("orion-storage.boxes.v1")).toBe(before);
  });
  it("renomeação preserva IDs e QR antigo/novo", async () => {
    const f = fixture();
    const saved = await f.service.save(layout());
    const id = saved.structures[0]!.faces[0]!.levels[0]!.slots[0]!.locationId!;
    const old = (await f.locations.getById(id))!;
    saved.structures[0]!.code = "E002";
    await f.service.save(saved);
    const locations = await f.locations.list();
    expect(resolveManualEntry(old.code, { locations, boxes: [] }).entityId).toBe(id);
    expect(
      resolveManualEntry(`orion://v1/location/${old.qrCode}`, { locations, boxes: [] }).entityId,
    ).toBe(id);
    expect((await f.locations.getByCode(old.code))?.id).toBe(id);
  });
  it("recusa revisão obsoleta e colisão sem gravar", async () => {
    const f = fixture();
    await f.service.save(layout());
    const before = f.store.getItem(SPATIAL_KEY);
    await expect(f.service.save(layout())).rejects.toThrow(/mudou/);
    expect(f.store.getItem(SPATIAL_KEY)).toBe(before);
    const current = await f.service.load(DEMO_AREA_ID);
    current.structures[0]!.x = 0;
    await expect(f.service.save(current)).rejects.toThrow(/limites/);
    expect(f.store.getItem(SPATIAL_KEY)).toBe(before);
  });
  it("vincula posição antiga explicitamente e não remove estoque", async () => {
    const f = fixture();
    const old = (await f.locations.list()).find((l) => l.code === "SUP-A-01-01-01")!;
    const input = layout();
    input.structures[0]!.faces[0]!.levels[0]!.slots[0]!.locationId = old.id;
    const saved = await f.service.save(input);
    expect((await f.locations.getById(old.id))?.code).toBe(old.code);
    await f.service.save(saved);
    const current = await f.service.load(DEMO_AREA_ID);
    current.structures = [];
    await expect(f.service.save(current, true)).rejects.toThrow(/ocupada/);
    expect((await f.locations.getById(old.id))?.code).toBe(old.code);
  });
  it("remover posição vazia exige confirmação e conserva registro/histórico", async () => {
    const f = fixture();
    const current = await f.service.save(layout());
    const id = current.structures[0]!.faces[0]!.levels[0]!.slots[0]!.locationId!;
    current.structures = [];
    await expect(f.service.save(current)).rejects.toThrow(/Confirme/);
    await f.service.save(current, true);
    expect((await f.locations.getById(id))?.status).toBe("INACTIVE");
  });
  it("dados corrompidos não são sobrescritos", async () => {
    const f = fixture();
    f.store.setItem(SPATIAL_KEY, "broken");
    await expect(f.service.load(DEMO_AREA_ID)).rejects.toThrow(/preservados/);
    expect(f.store.getItem(SPATIAL_KEY)).toBe("broken");
  });
  it("recupera journal interrompido antes da leitura operacional", () => {
    const store = new MemoryKeyValueStore();
    store.setItem(
      "orion-storage.spatial-journal.v1",
      JSON.stringify({
        version: 1,
        locations: '{"version":1,"locations":[]}',
        spatial: '{"version":1,"layouts":[]}',
      }),
    );
    store.setItem(LOCATION_KEY, "partial");
    new LocalStorageLocationRepository(store);
    expect(store.getItem(LOCATION_KEY)).toBe('{"version":1,"locations":[]}');
    expect(() => recoverSpatialWrite(store)).not.toThrow();
  });
  it("falha de escrita reverte locais e permite nova tentativa", async () => {
    class FailingStore extends MemoryKeyValueStore {
      fail = false;
      override setItem(key: string, value: string) {
        if (this.fail && key === SPATIAL_KEY) {
          this.fail = false;
          throw new Error("Quota");
        }
        super.setItem(key, value);
      }
    }
    const store = new FailingStore();
    const f = fixture(store);
    await f.locations.list();
    const before = store.getItem(LOCATION_KEY);
    store.fail = true;
    await expect(f.service.save(layout())).rejects.toThrow("Quota");
    expect(store.getItem(LOCATION_KEY)).toBe(before);
    expect((await f.service.load(DEMO_AREA_ID)).structures).toEqual([]);
    await expect(f.service.save(layout())).resolves.toHaveProperty("revision", 1);
  });
});
