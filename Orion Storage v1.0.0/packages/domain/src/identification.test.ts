import { describe, expect, it } from "vitest";

import { demoBoxState } from "./box-seeds";
import {
  IdentificationNotFoundError,
  IdentificationPayloadError,
  AmbiguousIdentificationError,
} from "./errors";
import {
  createBoxQrPayload,
  createLocationQrPayload,
  parseQrPayload,
  resolveIdentification,
  resolveManualEntry,
  validateQrPayload,
} from "./identification";
import { demoLocations } from "./location-seeds";

describe("identificação por QR", () => {
  it("gera e interpreta o payload da caixa", () => {
    const payload = createBoxQrPayload(" cx-20261006-000001 ");
    expect(payload).toBe("orion://v1/box/CX-20261006-000001");
    expect(payload).not.toContain("localhost");
    expect(parseQrPayload(payload)).toEqual({
      version: "v1",
      type: "box",
      code: "CX-20261006-000001",
    });
  });

  it("gera e interpreta o payload do endereço", () => {
    const payload = createLocationQrPayload(" sup-a-03-02-04 ");
    expect(payload).toBe("orion://v1/location/SUP-A-03-02-04");
    expect(parseQrPayload(payload)).toEqual({
      version: "v1",
      type: "location",
      code: "SUP-A-03-02-04",
    });
  });

  it("faz a volta completa de criar e ler", () => {
    const box = createBoxQrPayload("CX-20261006-000004");
    const location = createLocationQrPayload("SUP-A-01-01-01");
    expect(parseQrPayload(box).code).toBe("CX-20261006-000004");
    expect(parseQrPayload(location).type).toBe("location");
    expect(validateQrPayload(box).ok).toBe(true);
  });

  it("rejeita payload inválido, tipo desconhecido, versão estranha e código vazio", () => {
    expect(() => parseQrPayload("http://localhost:8080/caixas")).toThrow(
      IdentificationPayloadError,
    );
    expect(() => parseQrPayload("orion://v1/product/ABC")).toThrow(/desconhecido/);
    expect(() => parseQrPayload("orion://v2/box/CX-20261006-000001")).toThrow(/não suportada/);
    expect(() => parseQrPayload("orion://v1/box/")).toThrow(/não tem código/);
    expect(() => createBoxQrPayload(" ")).toThrow(IdentificationPayloadError);
    expect(validateQrPayload("nao-e-qr").ok).toBe(false);
  });

  it("resolve caixa e endereço existentes e recusa o que não está no catálogo", () => {
    const boxes = demoBoxState().boxes;
    const locations = demoLocations();
    const box = resolveIdentification(createBoxQrPayload(boxes[0]!.code), { boxes, locations });
    expect(box).toEqual({ type: "box", entityId: boxes[0]!.id, code: boxes[0]!.code });
    const location = resolveIdentification("orion://v1/location/SUP-A-01-01-01", {
      boxes,
      locations,
    });
    expect(location.entityId).toBe("seed-loc-sup-a-01-01-01");
    expect(() =>
      resolveIdentification("orion://v1/box/CX-20261006-000099", { boxes, locations }),
    ).toThrow(IdentificationNotFoundError);
    expect(() =>
      resolveIdentification("orion://v1/location/SUP-Z-09-09-09", { boxes, locations }),
    ).toThrow(IdentificationNotFoundError);
  });

  it("resolve código simples de caixa e de endereço", () => {
    const boxes = demoBoxState().boxes;
    const locations = demoLocations();
    const box = resolveManualEntry(boxes[0]!.code, { boxes, locations });
    expect(box).toEqual({ type: "box", entityId: boxes[0]!.id, code: boxes[0]!.code });
    const location = resolveManualEntry("sup-a-01-01-01", { boxes, locations });
    expect(location.type).toBe("location");
    expect(location.code).toBe("SUP-A-01-01-01");
    expect(resolveManualEntry(createBoxQrPayload(boxes[0]!.code), { boxes, locations }).type).toBe(
      "box",
    );
    expect(() =>
      resolveManualEntry("CX-20261006-000001", {
        boxes: [{ id: "box-same", code: "CX-20261006-000001" }],
        locations: [{ id: "loc-same", code: "CX-20261006-000001" }],
      }),
    ).toThrow(AmbiguousIdentificationError);
  });
});
