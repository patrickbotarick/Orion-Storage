import type { KeyValueStore } from "./key-value-store";
import { SpatialError } from "@orion/domain";
export const SPATIAL_KEY = "orion-storage.spatial-layouts.v1";
export const LOCATION_KEY = "orion-storage.locations.v1";
const JOURNAL_KEY = "orion-storage.spatial-journal.v1";
type Journal = { version: 1; locations: string; spatial: string };
/** Synchronous write-ahead rollback; not a cross-tab database transaction. */
export function recoverSpatialWrite(store: KeyValueStore) {
  const raw = store.getItem(JOURNAL_KEY);
  if (!raw || raw === "null") return;
  let journal: Journal;
  try {
    journal = JSON.parse(raw) as Journal;
    if (
      journal.version !== 1 ||
      typeof journal.locations !== "string" ||
      typeof journal.spatial !== "string"
    )
      throw new Error();
  } catch {
    throw new SpatialError("Registro de recuperação espacial inválido. Preserve os dados.");
  }
  store.setItem(LOCATION_KEY, journal.locations);
  store.setItem(SPATIAL_KEY, journal.spatial);
  store.setItem(JOURNAL_KEY, "null");
}
export function commitSpatialWrite(
  store: KeyValueStore,
  before: { locations: string; spatial: string | null; boxes: string | null },
  after: { locations: string; spatial: string },
) {
  if (
    store.getItem(LOCATION_KEY) !== before.locations ||
    store.getItem(SPATIAL_KEY) !== before.spatial ||
    store.getItem("orion-storage.boxes.v1") !== before.boxes
  )
    throw new SpatialError("Os dados mudaram. Reabra o editor antes de salvar.");
  const journal: Journal = {
    version: 1,
    locations: before.locations,
    spatial: before.spatial ?? JSON.stringify({ version: 1, layouts: [] }),
  };
  store.setItem(JOURNAL_KEY, JSON.stringify(journal));
  try {
    store.setItem(LOCATION_KEY, after.locations);
    store.setItem(SPATIAL_KEY, after.spatial);
    store.setItem(JOURNAL_KEY, "null");
  } catch (error) {
    try {
      recoverSpatialWrite(store);
    } catch {
      throw new SpatialError(
        "Falha na gravação e recuperação. Preserve os dados e reabra o aplicativo.",
      );
    }
    throw error;
  }
}
