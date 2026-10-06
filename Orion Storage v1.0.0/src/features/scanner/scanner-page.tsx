import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BOX_STATUS_LABEL,
  InactiveStorageAreaError,
  LOCATION_STATUS_LABEL,
  MOVEMENT_TYPE_LABEL,
  applyScan,
  assertLocationAssignable,
  assertLocationHasRoom,
  completeScan,
  createScanSession,
  planMovement,
  requestRemoval,
  resetScanSession,
  type Location,
  type MovementType,
  type Product,
  type ScanSession,
  type StorageArea,
  type Box,
  type MovementSource,
} from "@orion/domain";

import { getBrowserBoxService } from "@/application/boxes/box-service";
import { getBrowserLocationService } from "@/application/locations/location-service";
import { getBrowserMovementService } from "@/application/movements/movement-service";
import { getBrowserProductService } from "@/application/products/product-service";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useQrCamera } from "@/features/scanner/use-qr-camera";

const PHASE_LABEL: Record<ScanSession["phase"], string> = {
  WAITING_BOX: "Aguardando caixa",
  WAITING_DESTINATION: "Aguardando destino",
  READY_TO_CONFIRM: "Confirmar movimentação",
  COMPLETED: "Concluído",
};

export function ScannerPage() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [areas, setAreas] = useState<StorageArea[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [session, setSession] = useState<ScanSession>(createScanSession);
  const [notice, setNotice] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef(session);
  const catalogRef = useRef({ boxes, locations });
  const manualUsed = useRef(false);
  sessionRef.current = session;
  catalogRef.current = { boxes, locations };

  const reload = useCallback(async () => {
    const [nextBoxes, nextLocations, nextAreas, nextProducts] = await Promise.all([
      getBrowserBoxService().list(),
      getBrowserLocationService().listLocations(),
      getBrowserLocationService().listAreas(),
      getBrowserProductService().list(),
    ]);
    setBoxes(nextBoxes);
    setLocations(nextLocations);
    setAreas(nextAreas);
    setProducts(nextProducts);
  }, []);

  useEffect(() => {
    let cancelled = false;
    reload().catch((caught: unknown) => {
      if (!cancelled) setNotice(caught instanceof Error ? caught.message : "Não foi possível carregar.");
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const accept = useCallback((raw: string, via: MovementSource) => {
    const result = applyScan(sessionRef.current, raw, catalogRef.current, Date.now());
    if (result.ignored) return;
    if (via === "MANUAL" && result.hit) manualUsed.current = true;
    sessionRef.current = result.session;
    setSession(result.session);
    setSuccess(null);
    setNotice(result.error ?? null);
  }, []);

  const camera = useQrCamera((value) => accept(value, "SCAN"));
  const box = boxes.find((item) => item.id === session.boxId) ?? null;
  const destination = locations.find((item) => item.id === session.destinationId) ?? null;
  const product = products.find((item) => item.id === box?.productId) ?? null;
  const currentLocation = locations.find((item) => item.id === box?.currentLocationId) ?? null;
  const destinationArea = areas.find((item) => item.id === destination?.areaId) ?? null;
  const occupied = destination
    ? boxes.filter((item) => item.currentLocationId === destination.id && item.id !== box?.id).length
    : 0;

  const preview = useMemo(() => {
    if (session.phase !== "READY_TO_CONFIRM" || !box) return null;
    try {
      if (session.intent === "REMOVE") {
        const plan = planMovement(box.currentLocationId, undefined);
        return { type: plan.type, error: null as string | null };
      }
      if (!destination || !destinationArea) return { type: "MOVED" as MovementType, error: "Localização não encontrada." };
      assertLocationAssignable(destination.status);
      if (destinationArea.status !== "ACTIVE") throw new InactiveStorageAreaError(destinationArea.id);
      assertLocationHasRoom({
        capacityBoxes: destination.capacityBoxes,
        boxes,
        locationId: destination.id,
        movingBoxId: box.id,
      });
      const plan = planMovement(box.currentLocationId, destination.id);
      return { type: plan.type, error: null };
    } catch (caught) {
      return {
        type: "MOVED" as MovementType,
        error: caught instanceof Error ? caught.message : "Não foi possível validar.",
      };
    }
  }, [box, boxes, destination, destinationArea, session.intent, session.phase]);

  async function confirm() {
    if (!box || preview?.error) return;
    setBusy(true);
    setNotice(null);
    try {
      const source: MovementSource = manualUsed.current ? "MANUAL" : "SCAN";
      if (session.intent === "REMOVE") await getBrowserMovementService().remove(box.id, source);
      else if (destination) await getBrowserMovementService().place(box.id, destination.id, source);
      await camera.stop();
      const done = completeScan(session);
      sessionRef.current = done;
      setSession(done);
      setSuccess("Caixa movimentada com sucesso.");
      await reload();
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Não foi possível movimentar.");
    } finally {
      setBusy(false);
    }
  }

  function another() {
    const next = resetScanSession();
    sessionRef.current = next;
    manualUsed.current = false;
    setSession(next);
    setNotice(null);
    setSuccess(null);
    setManual("");
  }

  return (
    <AppShell section="scanner">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <header>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Operação</p>
          <h1 className="text-2xl font-semibold text-ink">Scanner</h1>
          <p className="mt-1 text-sm text-muted">
            A câmera do celular exige HTTPS ou localhost. Neste computador, localhost funciona. Em outro aparelho na rede, o navegador pode bloquear a câmera.
          </p>
        </header>

        <p className="rounded-md bg-ink px-4 py-3 text-center text-base font-semibold text-on-ink" aria-live="polite">
          {session.phase === "WAITING_DESTINATION" ? "Caixa identificada" : PHASE_LABEL[session.phase]}
          {session.phase === "WAITING_DESTINATION" ? " · Aguardando destino" : ""}
          {session.phase === "READY_TO_CONFIRM" && session.intent === "PLACE" ? " · Destino identificado" : ""}
        </p>

        <div
          id="orion-qr-reader"
          className={camera.status === "live" || camera.status === "starting" ? "min-h-64 overflow-hidden rounded-lg bg-ink" : "hidden"}
        />

        <div className="flex flex-col gap-2">
          {camera.status === "live" ? (
            <Button variant="secondary" className="min-h-14" onClick={() => void camera.stop()}>
              Parar câmera
            </Button>
          ) : (
            <Button variant="primary" className="min-h-14" onClick={() => void camera.start()} disabled={camera.status === "starting"}>
              {camera.status === "starting" ? "Abrindo câmera…" : "Usar câmera"}
            </Button>
          )}
          {camera.message ? <p className="text-sm text-danger" role="alert">{camera.message}</p> : null}
        </div>

        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (manual.trim()) accept(manual, "MANUAL");
          }}
        >
          <label htmlFor="manual-code" className="text-sm font-medium text-ink">
            Digitar ou colar código
          </label>
          <input
            id="manual-code"
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            placeholder="CX-20261006-000001 ou SUP-A-01-01-01"
            className="min-h-14 rounded-md border border-line bg-surface px-3 text-base"
            autoCapitalize="characters"
          />
          <Button variant="secondary" className="min-h-14" type="submit">
            Identificar
          </Button>
        </form>

        {notice ? (
          <p className="rounded-md border border-danger px-3 py-2 text-sm text-danger" role="alert">
            {notice}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink" role="status">
            {success}
          </p>
        ) : null}

        {box ? (
          <section className="rounded-lg border border-line bg-surface p-4">
            <h2 className="font-mono text-sm">{box.code}</h2>
            <p className="mt-1 text-sm">{product?.name ?? "Produto não encontrado"}</p>
            <p className="text-sm text-muted">
              {product?.brand ?? "Sem marca"} · {BOX_STATUS_LABEL[box.status]}
            </p>
            <p className="mt-2 text-sm">
              Localização atual: {currentLocation?.code ?? "Sem localização"}
            </p>
          </section>
        ) : null}

        {destination ? (
          <section className="rounded-lg border border-line bg-surface p-4">
            <h2 className="font-mono text-sm">{destination.code}</h2>
            <p className="mt-1 text-sm">{destinationArea?.name ?? "Área não encontrada"}</p>
            <p className="text-sm text-muted">
              Corredor {destination.aisle} · Prateleira {destination.rack} · Nível {destination.level} · Posição {destination.position}
            </p>
            <p className="mt-2 text-sm">
              {occupied}
              {destination.capacityBoxes != null ? ` / ${destination.capacityBoxes}` : ""} caixas · {LOCATION_STATUS_LABEL[destination.status]}
            </p>
          </section>
        ) : null}

        {session.phase === "READY_TO_CONFIRM" && box ? (
          <section className="rounded-lg border border-ink bg-surface p-4">
            <p className="text-sm font-semibold">
              {session.intent === "REMOVE" ? "Remover" : preview?.type === "STORED" ? "Armazenar" : "Mover"}
            </p>
            <p className="mt-2 font-mono text-sm">{box.code}</p>
            <p className="mt-2 text-sm">De: {currentLocation?.code ?? "Sem localização"}</p>
            <p className="text-sm">
              Para: {session.intent === "REMOVE" ? "Sem localização" : destination?.code ?? "—"}
            </p>
            {preview?.type ? <p className="mt-2 text-xs text-muted">{MOVEMENT_TYPE_LABEL[preview.type]}</p> : null}
            {preview?.error ? <p className="mt-2 text-sm text-danger">{preview.error}</p> : null}
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="primary" className="min-h-14" disabled={busy || Boolean(preview?.error)} onClick={() => void confirm()}>
                {session.intent === "REMOVE" ? "Confirmar remoção" : "Confirmar movimentação"}
              </Button>
              <Button
                variant="secondary"
                className="min-h-14"
                disabled={busy}
                onClick={() => {
                  const next = { ...session, phase: "WAITING_DESTINATION" as const, destinationId: undefined, intent: undefined };
                  sessionRef.current = next;
                  setSession(next);
                  setNotice(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </section>
        ) : null}

        {box && session.phase === "WAITING_DESTINATION" && box.currentLocationId ? (
          <Button
            variant="danger"
            className="min-h-14"
            onClick={() => {
              const result = requestRemoval(session);
              if (!result.ignored) {
                sessionRef.current = result.session;
                setSession(result.session);
                setNotice(result.error ?? null);
              }
            }}
          >
            Remover da localização
          </Button>
        ) : null}

        {session.phase === "COMPLETED" ? (
          <Button variant="primary" className="min-h-14" onClick={another}>
            Movimentar outra caixa
          </Button>
        ) : null}
      </div>
    </AppShell>
  );
}
