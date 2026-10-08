import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ClipboardCheck, ScanLine } from "lucide-react";
import {
  INVENTORY_CLASSIFICATIONS,
  INVENTORY_CLASSIFICATION_LABEL,
  INVENTORY_SCOPES,
  INVENTORY_SCOPE_LABEL,
  INVENTORY_STATUSES,
  INVENTORY_STATUS_LABEL,
  filterInventories,
  inventoryScopeLocations,
  resolveManualEntry,
  summarizeInventory,
  type Box,
  type InventoryScope,
  type InventorySession,
  type InventoryStatus,
  type Location,
  type StorageArea,
} from "@orion/domain";
import { getBrowserInventoryService } from "@/application/inventories/inventory-service";
import { getBrowserBoxService } from "@/application/boxes/box-service";
import { getBrowserLocationService } from "@/application/locations/location-service";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { controlClass, Field } from "@/components/ui/field";
import { useQrCamera } from "@/features/scanner/use-qr-camera";

const date = (value?: string) =>
  value ? new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";
const unique = (values: string[]) =>
  [...new Set(values)].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

export function InventoriesPage() {
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [areas, setAreas] = useState<StorageArea[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<InventorySession | null>(null);
  const [scope, setScope] = useState<InventoryScope>({ scope: "LOCATION", areaId: "" });
  const [notes, setNotes] = useState("");
  const [raw, setRaw] = useState("");
  const [foundLocationId, setFoundLocationId] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<InventoryStatus | "ALL">("ALL");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<"COMPLETED" | "CANCELLED" | null>(null);
  const lock = useRef(false);
  const acceptRef = useRef<(value: string) => Promise<void>>(async () => undefined);
  const camera = useQrCamera((value) => {
    void acceptRef.current(value);
  });

  async function reload() {
    const [nextSessions, nextAreas, nextLocations, nextBoxes] = await Promise.all([
      getBrowserInventoryService().list(),
      getBrowserLocationService().listAreas(),
      getBrowserLocationService().listLocations(),
      getBrowserBoxService().list(),
    ]);
    setSessions(nextSessions);
    setAreas(nextAreas);
    setLocations(nextLocations);
    setBoxes(nextBoxes);
  }
  useEffect(() => {
    reload()
      .catch((caught: unknown) => setError(message(caught)))
      .finally(() => setLoading(false));
  }, []);

  async function perform(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (caught) {
      setError(message(caught));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function accept(value: string) {
    await perform(async () => {
      if (selected && selected.status !== "IN_PROGRESS")
        throw new Error("Esta sessão está encerrada e não aceita alterações.");
      if (review) return;
      const currentBoxes = await getBrowserBoxService().list();
      const hit = resolveManualEntry(value, {
        boxes: currentBoxes,
        locations: selected?.locations ?? locations,
      });
      if (!selected) {
        if (hit.type !== "location")
          throw new Error("Leia uma posição para selecionar o escopo antes de iniciar.");
        const location = locations.find((item) => item.id === hit.entityId)!;
        setScope({ scope: "LOCATION", areaId: location.areaId, locationId: location.id });
        setNotice(`Posição identificada: ${location.code}. Confira e inicie o inventário.`);
        await camera.stop();
      } else if (hit.type === "location") {
        setFoundLocationId(hit.entityId);
        setNotice(`Posição de contagem: ${hit.code}. Agora leia as caixas encontradas aqui.`);
      } else {
        if (!foundLocationId)
          throw new Error("Selecione ou leia a posição onde encontrou a caixa.");
        const next = await getBrowserInventoryService().record(selected.id, value, foundLocationId);
        setSelected(next);
        setSessions((items) => items.map((item) => (item.id === next.id ? next : item)));
        setNotice(`Encontrada nesta posição: ${hit.code}.`);
      }
      setRaw("");
    });
  }
  acceptRef.current = accept;

  async function open(session: InventorySession) {
    await camera.stop();
    setSelected(session);
    setCreating(false);
    setReview(null);
    setRaw("");
    setError(null);
    setNotice(null);
    setFoundLocationId(session.scope === "LOCATION" ? session.locationId! : "");
  }
  async function back() {
    await camera.stop();
    setSelected(null);
    setCreating(false);
    setReview(null);
    setError(null);
    setNotice(null);
    setRaw("");
    await perform(reload);
  }
  async function start() {
    await perform(async () => {
      await camera.stop();
      const session = await getBrowserInventoryService().start(scope, notes);
      await reload();
      await open(session);
    });
  }
  async function closeSession() {
    if (!selected || !review) return;
    await perform(async () => {
      await camera.stop();
      const next =
        review === "COMPLETED"
          ? await getBrowserInventoryService().complete(selected.id)
          : await getBrowserInventoryService().cancel(selected.id);
      setSelected(next);
      setReview(null);
      await reload();
      setNotice(
        next.status === "COMPLETED"
          ? "Inventário finalizado. O estoque oficial foi preservado."
          : "Inventário cancelado. As observações foram preservadas.",
      );
    });
  }

  const areaLocations = locations.filter((location) => location.areaId === scope.areaId);
  const aisleLocations = areaLocations.filter((location) => location.aisle === scope.aisle);
  const rackLocations = aisleLocations.filter((location) => location.rack === scope.rack);
  let previewLocations: Location[] = [];
  try {
    previewLocations = inventoryScopeLocations(scope, locations);
  } catch {
    /* incomplete selection */
  }
  const expectedPreview = boxes.filter((box) =>
    previewLocations.some((location) => location.id === box.currentLocationId),
  ).length;
  const visible = filterInventories(sessions, { text, status });
  const counting = selected?.status === "IN_PROGRESS" && !review;

  return (
    <AppShell section="inventories">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              Conferência física
            </p>
            <h1 className="text-2xl font-semibold text-ink">Inventários</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Compare as caixas encontradas com o retrato do estoque no início da sessão.
              Divergências ficam registradas para revisão.
            </p>
          </div>
          {!selected && !creating ? (
            <Button
              variant="primary"
              disabled={loading || busy}
              onClick={() => {
                setCreating(true);
                setNotes("");
                setScope({ scope: "LOCATION", areaId: areas[0]?.id ?? "" });
                setError(null);
                setNotice(null);
              }}
            >
              <ClipboardCheck className="mr-2 size-4" />
              Novo inventário
            </Button>
          ) : (
            <Button variant="secondary" disabled={busy} onClick={() => void back()}>
              <ArrowLeft className="mr-2 size-4" />
              Voltar ao histórico
            </Button>
          )}
        </header>
        <p className="mt-4 rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink">
          Inventário é observação: nenhuma leitura altera a localização da caixa ou gera
          movimentação.
        </p>
        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-danger bg-surface p-3 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}
        {notice ? (
          <p
            role="status"
            className="mt-4 rounded-md border border-line bg-surface p-3 text-sm text-ink"
          >
            {notice}
          </p>
        ) : null}
        {loading ? <p className="mt-6 text-muted">Carregando inventários…</p> : null}

        {creating && !selected ? (
          <section className="mt-6 rounded-lg border border-line bg-surface p-4 md:p-6">
            <h2 className="text-lg font-semibold">Selecionar escopo</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Tipo de escopo" htmlFor="inventory-scope">
                <select
                  id="inventory-scope"
                  className={controlClass}
                  value={scope.scope}
                  onChange={(event) =>
                    setScope({
                      scope: event.target.value as InventoryScope["scope"],
                      areaId: scope.areaId,
                    })
                  }
                >
                  {INVENTORY_SCOPES.map((kind) => (
                    <option key={kind} value={kind}>
                      {INVENTORY_SCOPE_LABEL[kind]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Área" htmlFor="inventory-area">
                <select
                  id="inventory-area"
                  className={controlClass}
                  value={scope.areaId}
                  onChange={(event) => setScope({ scope: scope.scope, areaId: event.target.value })}
                >
                  <option value="">Selecione</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                      {area.status === "INACTIVE" ? " · Inativa" : ""}
                    </option>
                  ))}
                </select>
              </Field>
              {scope.scope === "LOCATION" ? (
                <Field label="Posição" htmlFor="inventory-location">
                  <select
                    id="inventory-location"
                    className={controlClass}
                    value={scope.locationId ?? ""}
                    onChange={(event) => setScope({ ...scope, locationId: event.target.value })}
                  >
                    <option value="">Selecione</option>
                    {areaLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.code}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {["AISLE", "RACK", "LEVEL"].includes(scope.scope) ? (
                <Field label="Corredor" htmlFor="inventory-aisle">
                  <select
                    id="inventory-aisle"
                    className={controlClass}
                    value={scope.aisle ?? ""}
                    onChange={(event) =>
                      setScope({
                        ...scope,
                        aisle: event.target.value,
                        rack: undefined,
                        level: undefined,
                      })
                    }
                  >
                    <option value="">Selecione</option>
                    {unique(areaLocations.map((location) => location.aisle)).map((aisle) => (
                      <option key={aisle}>{aisle}</option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {["RACK", "LEVEL"].includes(scope.scope) ? (
                <Field label="Prateleira" htmlFor="inventory-rack">
                  <select
                    id="inventory-rack"
                    className={controlClass}
                    value={scope.rack ?? ""}
                    onChange={(event) =>
                      setScope({ ...scope, rack: event.target.value, level: undefined })
                    }
                  >
                    <option value="">Selecione</option>
                    {unique(aisleLocations.map((location) => location.rack)).map((rack) => (
                      <option key={rack}>{rack}</option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {scope.scope === "LEVEL" ? (
                <Field label="Nível" htmlFor="inventory-level">
                  <select
                    id="inventory-level"
                    className={controlClass}
                    value={scope.level ?? ""}
                    onChange={(event) => setScope({ ...scope, level: event.target.value })}
                  >
                    <option value="">Selecione</option>
                    {unique(rackLocations.map((location) => location.level)).map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </select>
                </Field>
              ) : null}
            </div>
            <div className="mt-4">
              <Field label="Observações" htmlFor="inventory-notes">
                <textarea
                  id="inventory-notes"
                  className={`${controlClass} py-3`}
                  rows={2}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </Field>
            </div>
            <p className="mt-4 text-sm text-muted">
              {previewLocations.length} posições · {expectedPreview} caixas esperadas. O snapshot
              será capturado ao iniciar.
            </p>
            <Button
              className="mt-4"
              variant="primary"
              disabled={busy || !previewLocations.length}
              onClick={() => void start()}
            >
              Iniciar inventário
            </Button>
          </section>
        ) : null}

        {(creating && !selected) || counting ? (
          <section className="mt-6 rounded-lg border border-line bg-surface p-4 md:p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ScanLine className="size-5" />
              {selected ? "Registrar caixas encontradas" : "Identificar posição por QR"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {selected
                ? "Confirme a posição de contagem e leia as caixas presentes nela. Ler uma posição troca o local de contagem dentro do escopo."
                : "Leia ou digite o código da posição para preencher o escopo. O início continua exigindo confirmação."}
            </p>
            {selected ? (
              <div className="mt-4">
                <Field label="Encontrada nesta posição" htmlFor="inventory-found-location">
                  <select
                    id="inventory-found-location"
                    className={controlClass}
                    value={foundLocationId}
                    disabled={busy}
                    onChange={(event) => setFoundLocationId(event.target.value)}
                  >
                    <option value="">Selecione ou leia uma posição</option>
                    {selected.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.code}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : null}
            <div
              id="orion-qr-reader"
              className={
                camera.status === "live" || camera.status === "starting"
                  ? "mt-4 min-h-64 overflow-hidden rounded-lg bg-ink"
                  : "hidden"
              }
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="secondary"
                disabled={busy || camera.status === "starting"}
                onClick={() => void (camera.status === "live" ? camera.stop() : camera.start())}
              >
                {camera.status === "live"
                  ? "Parar câmera"
                  : camera.status === "starting"
                    ? "Abrindo câmera…"
                    : "Usar câmera"}
              </Button>
              <p className="self-center text-xs text-muted">
                A câmera requer permissão e HTTPS ou localhost.
              </p>
            </div>
            {camera.message ? (
              <p role="alert" className="mt-2 text-sm text-danger">
                {camera.message}
              </p>
            ) : null}
            <form
              className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                void accept(raw);
              }}
            >
              <div className="min-w-0 flex-1">
                <Field label="Digitar ou colar código" htmlFor="inventory-manual">
                  <input
                    id="inventory-manual"
                    className={controlClass}
                    value={raw}
                    onChange={(event) => setRaw(event.target.value)}
                    autoCapitalize="characters"
                    placeholder={
                      selected
                        ? "Código da caixa ou orion://v1/box/…"
                        : "Código da posição ou orion://v1/location/…"
                    }
                    disabled={busy}
                  />
                </Field>
              </div>
              <Button variant="primary" type="submit" disabled={busy || !raw.trim()}>
                {selected ? "Registrar leitura" : "Identificar posição"}
              </Button>
            </form>
          </section>
        ) : null}

        {selected ? (
          <section className="mt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-mono text-lg font-semibold">{selected.code}</h2>
                <p className="mt-1 text-sm">{selected.scopeLabel}</p>
                <p className="mt-1 text-xs text-muted">
                  Início: {date(selected.startedAt)} · Conclusão: {date(selected.completedAt)}
                  {selected.cancelledAt ? ` · Cancelamento: ${date(selected.cancelledAt)}` : ""}
                </p>
              </div>
              <span className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-on-ink">
                {INVENTORY_STATUS_LABEL[selected.status]}
              </span>
            </div>
            {selected.notes ? <p className="mt-3 text-sm text-muted">{selected.notes}</p> : null}
            <InventorySummary session={selected} />
            {selected.status === "IN_PROGRESS" ? (
              <div className="mt-4 rounded-lg border border-line bg-surface p-4">
                {review ? (
                  <>
                    <h3 className="text-base font-semibold">
                      {review === "COMPLETED" ? "Revisar e finalizar" : "Cancelar inventário"}
                    </h3>
                    <p className="mt-2 text-sm text-muted">
                      {review === "COMPLETED"
                        ? "Confira os grupos abaixo. As caixas ainda não lidas ficarão como faltando. A sessão encerrada não poderá receber alterações."
                        : "A sessão ficará encerrada, mantendo as observações. Cancelamentos não geram indicadores no mapa."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button variant="primary" disabled={busy} onClick={() => void closeSession()}>
                        {review === "COMPLETED" ? "Finalizar inventário" : "Confirmar cancelamento"}
                      </Button>
                      <Button variant="secondary" disabled={busy} onClick={() => setReview(null)}>
                        Voltar à contagem
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={() => {
                        void camera.stop();
                        setReview("COMPLETED");
                      }}
                    >
                      Revisar inventário
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        void camera.stop();
                        setReview("CANCELLED");
                      }}
                    >
                      Cancelar inventário
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">
                Sessão encerrada. Leituras e resultados estão preservados; novas leituras estão
                bloqueadas.
              </p>
            )}
            <InventoryGroups session={selected} />
          </section>
        ) : null}

        {!creating && !selected && !loading ? (
          <section className="mt-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Field label="Buscar inventário" htmlFor="inventory-search">
                  <input
                    id="inventory-search"
                    className={controlClass}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Código, escopo, caixa ou observação"
                  />
                </Field>
              </div>
              <Field label="Status" htmlFor="inventory-status">
                <select
                  id="inventory-status"
                  className={controlClass}
                  value={status}
                  onChange={(event) => setStatus(event.target.value as InventoryStatus | "ALL")}
                >
                  <option value="ALL">Todos</option>
                  {INVENTORY_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {INVENTORY_STATUS_LABEL[value]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="mt-4 text-sm text-muted">{visible.length} inventários</p>
            {!visible.length ? (
              <p className="mt-4 rounded-lg border border-line bg-surface p-6 text-sm text-muted">
                Nenhum inventário encontrado. Inicie uma conferência por posição, nível, prateleira,
                corredor ou área.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {visible.map((session) => {
                  const summary = summarizeInventory(session);
                  return (
                    <article
                      key={session.id}
                      className="rounded-lg border border-line bg-surface p-4"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <h2 className="font-mono text-sm font-semibold">{session.code}</h2>
                        <span className="text-xs font-medium">
                          {INVENTORY_STATUS_LABEL[session.status]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm">{session.scopeLabel}</p>
                      <p className="mt-2 text-xs text-muted">
                        Início: {date(session.startedAt)}
                        <br />
                        Conclusão: {date(session.completedAt)}
                      </p>
                      <p className="mt-3 text-sm">
                        Esperadas: {summary.expected} · Encontradas: {summary.found} ·{" "}
                        {session.status === "IN_PROGRESS"
                          ? "Divergências provisórias"
                          : "Divergências"}
                        : {summary.divergences}
                      </p>
                      <Button
                        className="mt-4"
                        variant="secondary"
                        onClick={() => void open(session)}
                      >
                        {session.status === "IN_PROGRESS" ? "Continuar contagem" : "Ver inventário"}
                      </Button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function InventorySummary({ session }: { session: InventorySession }) {
  const summary = summarizeInventory(session);
  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-3 lg:grid-cols-6">
      {[
        ["Esperadas", summary.expected],
        ["Encontradas", summary.found],
        ["Corretas", summary.match],
        ["Faltando", summary.missing],
        ["Inesperadas", summary.unexpected],
        ["Localização incorreta", summary.wrongLocation],
      ].map(([label, count]) => (
        <div key={label}>
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">{count}</dd>
        </div>
      ))}
    </dl>
  );
}

function InventoryGroups({ session }: { session: InventorySession }) {
  const locationCode = (id?: string) =>
    id ? (session.locations.find((location) => location.id === id)?.code ?? id) : "Sem localização";
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {INVENTORY_CLASSIFICATIONS.map((classification) => {
        const items = session.items.filter((item) => item.classification === classification);
        return (
          <section key={classification} className="rounded-lg border border-line bg-surface p-4">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              {classification !== "MATCH" ? (
                <AlertTriangle className="size-4 text-accent" />
              ) : (
                <ClipboardCheck className="size-4" />
              )}
              {INVENTORY_CLASSIFICATION_LABEL[classification]}{" "}
              <span className="text-sm text-muted">({items.length})</span>
            </h3>
            {classification === "MISSING" && session.status === "IN_PROGRESS" ? (
              <p className="mt-2 text-xs text-muted">
                Provisório: caixas esperadas que ainda não foram lidas.
              </p>
            ) : null}
            {!items.length ? (
              <p className="mt-3 text-sm text-muted">Nenhuma caixa neste grupo.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {items.map((item) => (
                  <li key={item.boxId} className="py-3">
                    <p className="break-all font-mono text-sm font-medium">{item.code}</p>
                    <p className="mt-1 text-xs text-muted">
                      Registrada no início:{" "}
                      {item.expectedLocationCode ?? locationCode(item.expectedLocationId)}
                      <br />
                      Encontrada: {item.found ? locationCode(item.foundLocationId) : "Não lida"}
                      {item.foundAt ? ` · ${date(item.foundAt)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
function message(caught: unknown) {
  return caught instanceof Error
    ? caught.message
    : "Não foi possível concluir a operação de inventário.";
}
