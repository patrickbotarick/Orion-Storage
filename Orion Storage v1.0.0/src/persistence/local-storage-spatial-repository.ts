import { SpatialError, validateLayout, type SpatialState } from "@orion/domain";
import type { KeyValueStore } from "./key-value-store";
import { recoverSpatialWrite, SPATIAL_KEY } from "./spatial-transaction";
export class LocalStorageSpatialRepository {
  constructor(private readonly store: KeyValueStore) {}
  read(): SpatialState {
    recoverSpatialWrite(this.store);
    const raw = this.store.getItem(SPATIAL_KEY);
    if (raw == null) return { version: 1, layouts: [] };
    try {
      const state = JSON.parse(raw) as SpatialState;
      if (
        state.version !== 1 ||
        !Array.isArray(state.layouts) ||
        new Set(state.layouts.map((l) => l.areaId)).size !== state.layouts.length ||
        state.layouts.some((l) => validateLayout(l).length)
      )
        throw new Error();
      return state;
    } catch {
      throw new SpatialError(
        "Layout espacial inválido. Os dados foram preservados; não há reset automático.",
      );
    }
  }
}
