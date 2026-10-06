import type { IdentificationCatalog, IdentificationHit } from "./identification";
import { resolveManualEntry } from "./identification";

export const SCAN_PHASES = [
  "WAITING_BOX",
  "WAITING_DESTINATION",
  "READY_TO_CONFIRM",
  "COMPLETED",
] as const;

export type ScanPhase = (typeof SCAN_PHASES)[number];
export type ScanIntent = "PLACE" | "REMOVE";

export type ScanSession = {
  phase: ScanPhase;
  boxId?: string;
  destinationId?: string;
  intent?: ScanIntent;
  lastToken?: string;
  lastTokenAt?: number;
};

export const SCAN_REPEAT_WINDOW_MS = 2000;

export function createScanSession(): ScanSession {
  return { phase: "WAITING_BOX" };
}

export function resetScanSession(): ScanSession {
  return createScanSession();
}

export function completeScan(session: ScanSession): ScanSession {
  return {
    phase: "COMPLETED",
    boxId: session.boxId,
    destinationId: session.destinationId,
    intent: session.intent,
  };
}

export function shouldIgnoreRepeatedScan(
  session: ScanSession,
  token: string,
  now: number,
  windowMs = SCAN_REPEAT_WINDOW_MS,
): boolean {
  if (!session.lastToken || session.lastTokenAt == null) return false;
  return session.lastToken === token && now - session.lastTokenAt < windowMs;
}

export type ScanApplication =
  | { ignored: true; session: ScanSession }
  | { ignored: false; session: ScanSession; error?: string; hit?: IdentificationHit };

export function applyScan(
  session: ScanSession,
  raw: string,
  catalog: IdentificationCatalog,
  now: number,
  windowMs = SCAN_REPEAT_WINDOW_MS,
): ScanApplication {
  const token = raw.trim();
  if (shouldIgnoreRepeatedScan(session, token, now, windowMs)) {
    return { ignored: true, session };
  }
  const stamped = { ...session, lastToken: token, lastTokenAt: now };
  if (session.phase === "COMPLETED") {
    return { ignored: false, session: stamped, error: "A movimentação já foi concluída." };
  }
  try {
    const hit = resolveManualEntry(token, catalog);
    if (hit.type === "location" && !session.boxId) {
      return { ignored: false, session: stamped, error: "Escaneie a caixa primeiro." };
    }
    if (hit.type === "box") {
      return {
        ignored: false,
        hit,
        session: {
          ...stamped,
          phase: "WAITING_DESTINATION",
          boxId: hit.entityId,
          destinationId: undefined,
          intent: undefined,
        },
      };
    }
    return {
      ignored: false,
      hit,
      session: {
        ...stamped,
        phase: "READY_TO_CONFIRM",
        destinationId: hit.entityId,
        intent: "PLACE",
      },
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Não foi possível ler o código.";
    return { ignored: false, session: stamped, error: message };
  }
}

export function requestRemoval(session: ScanSession): ScanApplication {
  if (!session.boxId) {
    return { ignored: false, session, error: "Escaneie a caixa primeiro." };
  }
  return {
    ignored: false,
    session: {
      ...session,
      phase: "READY_TO_CONFIRM",
      intent: "REMOVE",
      destinationId: undefined,
      lastToken: undefined,
      lastTokenAt: undefined,
    },
  };
}
