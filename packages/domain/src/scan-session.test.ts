import { describe, expect, it } from "vitest";

import { demoBoxState } from "./box-seeds";
import { createBoxQrPayload } from "./identification";
import { demoLocations } from "./location-seeds";
import {
  applyScan,
  completeScan,
  createScanSession,
  requestRemoval,
  resetScanSession,
  shouldIgnoreRepeatedScan,
} from "./scan-session";

const catalog = {
  boxes: demoBoxState().boxes,
  locations: demoLocations(),
};

describe("sessão do scanner", () => {
  it("resolve código simples, payload e leitura inválida sem movimentar", () => {
    const box = catalog.boxes[0]!;
    const first = applyScan(createScanSession(), box.code, catalog, 1_000);
    expect(first.ignored).toBe(false);
    if (first.ignored) return;
    expect(first.session.phase).toBe("WAITING_DESTINATION");
    expect(first.session.boxId).toBe(box.id);
    expect(first.session.intent).toBeUndefined();

    const destination = applyScan(first.session, "SUP-A-01-01-02", catalog, 4_000);
    expect(destination.ignored).toBe(false);
    if (destination.ignored) return;
    expect(destination.session.phase).toBe("READY_TO_CONFIRM");
    expect(destination.session.intent).toBe("PLACE");
    expect(destination.session.destinationId).toBe("seed-loc-sup-a-01-01-02");

    const invalid = applyScan(destination.session, "http://localhost:8080/caixas", catalog, 8_000);
    expect(invalid.ignored).toBe(false);
    if (invalid.ignored) return;
    expect(invalid.error).toMatch(/não pertence|servidor/i);
    expect(invalid.session.destinationId).toBe(destination.session.destinationId);

    const payload = applyScan(
      createScanSession(),
      createBoxQrPayload(box.code),
      catalog,
      10_000,
    );
    expect(payload.ignored).toBe(false);
    if (payload.ignored) return;
    expect(payload.hit?.type).toBe("box");
  });

  it("ignora a mesma leitura dentro da janela e aceita depois", () => {
    const session = createScanSession();
    const raw = catalog.boxes[0]!.code;
    const first = applyScan(session, raw, catalog, 1_000);
    expect(first.ignored).toBe(false);
    if (first.ignored) return;
    const repeated = applyScan(first.session, raw, catalog, 1_500);
    expect(repeated.ignored).toBe(true);
    expect(shouldIgnoreRepeatedScan(first.session, raw, 2_900)).toBe(true);
    const later = applyScan(first.session, raw, catalog, 4_000);
    expect(later.ignored).toBe(false);
  });

  it("prepara a remoção e o reset volta ao início", () => {
    const identified = applyScan(createScanSession(), catalog.boxes[0]!.code, catalog, 1_000);
    if (identified.ignored) throw new Error("leitura ignorada");
    const removal = requestRemoval(identified.session);
    expect(removal.ignored).toBe(false);
    if (removal.ignored) return;
    expect(removal.session.phase).toBe("READY_TO_CONFIRM");
    expect(removal.session.intent).toBe("REMOVE");
    expect(removal.session.destinationId).toBeUndefined();
    const done = completeScan(removal.session);
    expect(done.phase).toBe("COMPLETED");
    expect(resetScanSession()).toEqual({ phase: "WAITING_BOX" });
  });
});
