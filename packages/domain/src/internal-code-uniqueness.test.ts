import { describe, expect, it } from "vitest";

import { DuplicateInternalCodeError } from "./errors";
import { assertUniqueInternalCode, internalCodeKey } from "./internal-code-uniqueness";

const products = [
  { id: "a", internalCode: "REAL-AZUL-035" },
  { id: "b", internalCode: "PROADEC-BRANCO" },
];

describe("unicidade do código interno", () => {
  it("compara de forma normalizada e rejeita duplicata com erro claro", () => {
    expect(internalCodeKey(" real azul 035 ")).toBe(internalCodeKey("REAL-AZUL-035"));
    expect(() => assertUniqueInternalCode(products, "real-azul-035")).toThrow(
      DuplicateInternalCodeError,
    );
    try {
      assertUniqueInternalCode(products, "REAL AZUL 035");
    } catch (caught) {
      expect(caught).toBeInstanceOf(DuplicateInternalCodeError);
      expect((caught as Error).message).toContain("REAL-AZUL-035");
    }
  });

  it("ignora o próprio produto e aceita código novo", () => {
    expect(() => assertUniqueInternalCode(products, "REAL-AZUL-035", "a")).not.toThrow();
    expect(() => assertUniqueInternalCode(products, "PARAFUSO")).not.toThrow();
  });
});
