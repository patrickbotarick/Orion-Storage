import { describe, expect, it } from "vitest";

import { buildCreatedHistory, buildStatusHistory, buildUpdatedHistory } from "./box-history";

const before = {
  rollsQuantity: 10,
  totalLengthM: 200,
  receivedAt: "2026-10-06",
  manufacturerBatch: "Lote A",
};

describe("histórico da caixa", () => {
  it("registra criação, edição e mudança de status sem apagar o evento anterior", () => {
    const created = buildCreatedHistory({
      id: "h1",
      boxId: "box-1",
      code: "CX-20261006-000001",
      productId: "product-1",
      createdAt: "2026-10-06T15:00:00.000Z",
    });
    const updated = buildUpdatedHistory({
      id: "h2",
      boxId: "box-1",
      createdAt: "2026-10-06T16:00:00.000Z",
      before,
      after: { ...before, rollsQuantity: 8, totalLengthM: 160, notes: "Conferência" },
    });
    const status = buildStatusHistory({
      id: "h3",
      boxId: "box-1",
      createdAt: "2026-10-06T17:00:00.000Z",
      previous: "RECEIVED",
      next: "AVAILABLE",
    });
    expect(created.type).toBe("CREATED");
    expect(created.description).toContain("CX-20261006-000001");
    expect(updated?.type).toBe("UPDATED");
    expect(updated?.metadata?.fields).toBe("rollsQuantity,totalLengthM,notes");
    expect(updated?.description).toContain("quantidade de rolos");
    expect(status?.type).toBe("STATUS_CHANGED");
    expect(status?.metadata).toEqual({ previousStatus: "RECEIVED", nextStatus: "AVAILABLE" });
    expect(status?.description).toBe("Status alterado de Recebida para Disponível.");
    const history = [created, updated, status].filter((entry) => entry != null);
    expect(history.map((entry) => entry.id)).toEqual(["h1", "h2", "h3"]);
  });

  it("não cria evento quando nada mudou", () => {
    expect(
      buildUpdatedHistory({
        id: "h",
        boxId: "box-1",
        createdAt: "2026-10-06T16:00:00.000Z",
        before,
        after: { ...before },
      }),
    ).toBeNull();
    expect(
      buildStatusHistory({
        id: "h",
        boxId: "box-1",
        createdAt: "2026-10-06T16:00:00.000Z",
        previous: "OPENED",
        next: "OPENED",
      }),
    ).toBeNull();
  });
});
