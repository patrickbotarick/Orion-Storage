import { describe, expect, it } from "vitest";

import { allocateBoxCode, assertBoxCodeAvailable, formatBoxCode, parseBoxCode } from "./box-code";
import { BoxCodeCapacityError, BoxValidationError, DuplicateBoxCodeError } from "./errors";
import { insertBox } from "./box-store";
import type { Box } from "./box";

const DAY = new Date("2026-10-06T15:00:00.000Z");
const NEXT_DAY = new Date("2026-10-07T15:00:00.000Z");
const SAME_OPERATIONAL_DAY = new Date("2026-10-07T01:30:00.000Z");

describe("código da caixa", () => {
  it("gera CX-AAAAMMDD-NNNNNN sequencial e independente do produto", () => {
    const first = allocateBoxCode({ existingCodes: [], ledger: {}, now: DAY });
    const second = allocateBoxCode({
      existingCodes: [first.code],
      ledger: first.ledger,
      now: DAY,
    });
    expect(first.code).toBe("CX-20261006-000001");
    expect(second.code).toBe("CX-20261006-000002");
    expect(parseBoxCode(first.code)).toEqual({ dateKey: "20261006", sequence: 1 });
    expect(formatBoxCode("20261006", 12)).toBe("CX-20261006-000012");
  });

  it("não reutiliza número que já saiu do ledger, mesmo sem a caixa na lista", () => {
    const next = allocateBoxCode({
      existingCodes: [],
      ledger: { "20261006": 5 },
      now: DAY,
    });
    expect(next.code).toBe("CX-20261006-000006");
    expect(next.ledger["20261006"]).toBe(6);
  });

  it("avança a partir dos códigos gravados quando o ledger está atrás", () => {
    const next = allocateBoxCode({
      existingCodes: ["CX-20261006-000004", "CX-20261005-000099"],
      ledger: {},
      now: DAY,
    });
    expect(next.code).toBe("CX-20261006-000005");
  });

  it("rejeita código duplicado com erro claro", () => {
    expect(() => assertBoxCodeAvailable("cx-20261006-000001", ["CX-20261006-000001"])).toThrow(
      DuplicateBoxCodeError,
    );
    try {
      assertBoxCodeAvailable("CX-20261006-000001", ["CX-20261006-000001"]);
    } catch (caught) {
      expect(caught).toBeInstanceOf(DuplicateBoxCodeError);
      expect((caught as Error).message).toContain("CX-20261006-000001");
      expect((caught as Error).message).toContain("não pode ser reutilizado");
    }
  });

  it("não grava a caixa quando o código já existe", () => {
    const existing = minimalBox("CX-20261006-000001");
    expect(() =>
      insertBox(
        { boxes: [existing], codeLedger: { "20261006": 1 } },
        minimalBox("CX-20261006-000001"),
      ),
    ).toThrow(DuplicateBoxCodeError);
  });

  it("começa uma sequência nova no dia operacional seguinte e preserva o dia anterior", () => {
    const next = allocateBoxCode({
      existingCodes: ["CX-20261006-000004"],
      ledger: { "20261006": 4 },
      now: NEXT_DAY,
    });
    expect(next.code).toBe("CX-20261007-000001");
    expect(next.ledger["20261006"]).toBe(4);
    expect(next.ledger["20261007"]).toBe(1);
  });

  it("usa o calendário de São Paulo, não o dia UTC", () => {
    const next = allocateBoxCode({ existingCodes: [], ledger: {}, now: SAME_OPERATIONAL_DAY });
    expect(next.code).toBe("CX-20261006-000001");
  });

  it("recusa data inválida e estouro da sequência diária", () => {
    expect(() =>
      allocateBoxCode({ existingCodes: [], ledger: {}, now: new Date("não é data") }),
    ).toThrow(BoxValidationError);
    expect(() =>
      allocateBoxCode({
        existingCodes: [],
        ledger: { "20261006": 999999 },
        now: DAY,
      }),
    ).toThrow(BoxCodeCapacityError);
  });
});

function minimalBox(code: string): Box {
  return {
    id: code,
    code,
    productId: "product-1",
    status: "RECEIVED",
    rollsQuantity: 1,
    totalLengthM: 1,
    receivedAt: "2026-10-06",
    createdAt: "2026-10-06T15:00:00.000Z",
    updatedAt: "2026-10-06T15:00:00.000Z",
    history: [],
  };
}
