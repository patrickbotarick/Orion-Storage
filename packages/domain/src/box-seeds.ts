import type { Box, BoxStatus } from "./box";
import { allocateBoxCode } from "./box-code";
import { buildCreatedHistory, buildLocationHistory, buildStatusHistory } from "./box-history";
import { insertBox, type BoxPersistenceState } from "./box-store";
import { calculatedTotalLengthM } from "./length";
import { DEMO_LOCATION_IDS } from "./location-seeds";
import type { Product } from "./product";
import { demoProducts } from "./seeds";

const CREATED_AT = "2026-10-06T15:00:00.000Z";
const AVAILABLE_AT = "2026-10-06T18:00:00.000Z";
const LOCATED_AT = "2026-10-06T19:00:00.000Z";
const RECEIVED_ON = "2026-10-06";

type DemoSpec = {
  id: string;
  product: Product;
  status: BoxStatus;
  manufacturerBatch?: string;
  notes?: string;
  location?: { id: string; code: string };
};

/**
 * Four physical boxes for the two demonstration products.
 * Codes follow the same allocator used in production, on the operational day 2026-10-06.
 */
export function demoBoxState(now = new Date(CREATED_AT)): BoxPersistenceState {
  const products = demoProducts();
  const proadec = requireProduct(products, "Proadec");
  const real = requireProduct(products, "Real/Rehau");
  const specs: DemoSpec[] = [
    {
      id: "seed-box-proadec-1",
      product: proadec,
      status: "AVAILABLE",
      manufacturerBatch: "1101TX-26",
      notes: "Etiqueta do fabricante legível.",
      location: { id: DEMO_LOCATION_IDS.a010101, code: "SUP-A-01-01-01" },
    },
    {
      id: "seed-box-proadec-2",
      product: proadec,
      status: "RECEIVED",
      location: { id: DEMO_LOCATION_IDS.a010102, code: "SUP-A-01-01-02" },
    },
    {
      id: "seed-box-real-1",
      product: real,
      status: "AVAILABLE",
      manufacturerBatch: "PIN-ESS-04",
      location: { id: DEMO_LOCATION_IDS.a010201, code: "SUP-A-01-02-01" },
    },
    {
      id: "seed-box-real-2",
      product: real,
      status: "RECEIVED",
      manufacturerBatch: "PIN-ESS-05",
    },
  ];

  return specs.reduce<BoxPersistenceState>((state, spec) => appendDemoBox(state, spec, now), {
    boxes: [],
    codeLedger: {},
  });
}

function appendDemoBox(state: BoxPersistenceState, spec: DemoSpec, now: Date): BoxPersistenceState {
  const rollsQuantity = spec.product.rollsPerBox;
  const rollLengthM = spec.product.rollLengthM;
  if (rollsQuantity == null || rollLengthM == null) {
    throw new Error(`Produto ${spec.product.id} sem padrão de caixa para a demonstração.`);
  }
  const allocated = allocateBoxCode({
    existingCodes: state.boxes.map((box) => box.code),
    ledger: state.codeLedger,
    now,
  });
  const created = buildCreatedHistory({
    id: `${spec.id}-created`,
    boxId: spec.id,
    code: allocated.code,
    productId: spec.product.id,
    createdAt: CREATED_AT,
  });
  const history = [created];
  let updatedAt = CREATED_AT;
  if (spec.status !== "RECEIVED") {
    const statusChange = buildStatusHistory({
      id: `${spec.id}-status`,
      boxId: spec.id,
      createdAt: AVAILABLE_AT,
      previous: "RECEIVED",
      next: spec.status,
    });
    if (statusChange) {
      history.push(statusChange);
      updatedAt = AVAILABLE_AT;
    }
  }
  if (spec.location) {
    const located = buildLocationHistory({
      id: `${spec.id}-location`,
      boxId: spec.id,
      createdAt: LOCATED_AT,
      nextId: spec.location.id,
      nextCode: spec.location.code,
    });
    if (located) {
      history.push(located);
      updatedAt = LOCATED_AT;
    }
  }
  const box: Box = {
    id: spec.id,
    code: allocated.code,
    productId: spec.product.id,
    status: spec.status,
    rollsQuantity,
    totalLengthM: calculatedTotalLengthM(rollLengthM, rollsQuantity),
    receivedAt: RECEIVED_ON,
    createdAt: CREATED_AT,
    updatedAt,
    history,
  };
  if (spec.location) box.currentLocationId = spec.location.id;
  if (spec.manufacturerBatch) box.manufacturerBatch = spec.manufacturerBatch;
  if (spec.notes) box.notes = spec.notes;
  return insertBox({ boxes: state.boxes, codeLedger: allocated.ledger }, box);
}

function requireProduct(products: readonly Product[], brand: string): Product {
  const product = products.find((item) => item.brand === brand);
  if (!product) throw new Error(`Produto de demonstração não encontrado: ${brand}`);
  return product;
}
