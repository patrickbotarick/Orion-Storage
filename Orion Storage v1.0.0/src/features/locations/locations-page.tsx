import { useCallback, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  LOCATION_STATUSES,
  LOCATION_STATUS_LABEL,
  STORAGE_AREA_STATUS_LABEL,
  buildLocationCode,
  createLocationQrPayload,
  emptyAreaForm,
  emptyLocationForm,
  filterLocations,
  groupLocations,
  normalizeForComparison,
  validateAreaCreateForm,
  validateAreaUpdateForm,
  validateLocationForm,
  type Location,
  type LocationFormValues,
  type LocationQuery,
  type LocationStatus,
  type StorageArea,
  type StorageAreaFormValues,
  type StorageAreaStatus,
} from "@orion/domain";
import { X } from "lucide-react";

import { getBrowserBoxService } from "@/application/boxes/box-service";
import { getBrowserLocationService } from "@/application/locations/location-service";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Field, controlClass } from "@/components/ui/field";
import { LocationLabel } from "@/features/identification/location-label";
import { PrintLabelDialog } from "@/features/identification/print-label-dialog";
import { QrCode } from "@/features/identification/qr-code";

type Editor =
  | { kind: "area-create" }
  | { kind: "area-edit"; area: StorageArea }
  | { kind: "location-create" }
  | { kind: "location-edit"; location: Location }
  | { kind: "location-detail"; location: Location };

const INITIAL_QUERY: LocationQuery = { text: "", areaId: "", status: "ALL", aisle: "", rack: "" };

export function LocationsPage() {
  const [areas, setAreas] = useState<StorageArea[] | null>(null);
  const [locations, setLocations] = useState<Location[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<LocationQuery>(INITIAL_QUERY);
  const [areaText, setAreaText] = useState("");
  const [view, setView] = useState<"addresses" | "structure" | "areas">("addresses");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [signage, setSignage] = useState<{ location: Location; autoPrint: boolean } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    const service = getBrowserLocationService();
    const [nextAreas, nextLocations, boxes] = await Promise.all([
      service.listAreas(),
      service.listLocations(),
      getBrowserBoxService().list(),
    ]);
    const nextCounts: Record<string, number> = {};
    for (const box of boxes) {
      if (!box.currentLocationId) continue;
      nextCounts[box.currentLocationId] = (nextCounts[box.currentLocationId] ?? 0) + 1;
    }
    setAreas(nextAreas);
    setLocations(nextLocations);
    setCounts(nextCounts);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    reload().catch((caught: unknown) => {
      if (!cancelled)
        setError(caught instanceof Error ? caught.message : "Não foi possível carregar.");
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const items = useMemo(() => {
    if (!locations || !areas) return [];
    return locations.map((location) => ({
      location,
      area: areas.find((area) => area.id === location.areaId) ?? null,
      boxCount: counts[location.id] ?? 0,
    }));
  }, [areas, locations, counts]);

  const visibleAreas = useMemo(() => {
    const text = normalizeForComparison(areaText);
    if (!areas || !text) return areas ?? [];
    return areas.filter((area) =>
      [area.code, area.name, area.notes]
        .map((value) => normalizeForComparison(value))
        .join(" ")
        .includes(text),
    );
  }, [areaText, areas]);
  const visible = useMemo(() => filterLocations(items, query), [items, query]);
  const tree = useMemo(() => groupLocations(visible), [visible]);
  const aisles = useMemo(
    () => [...new Set(locations?.map((location) => location.aisle) ?? [])].sort(),
    [locations],
  );
  const racks = useMemo(
    () => [...new Set(locations?.map((location) => location.rack) ?? [])].sort(),
    [locations],
  );

  async function run(action: () => Promise<void>) {
    setSubmitting(true);
    setFormError(null);
    try {
      await action();
      await reload();
      setEditor(null);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AppShell section="locations">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Estoque físico</p>
            <h1 className="text-2xl font-semibold text-ink">Endereçamento</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Áreas e posições onde uma caixa pode ficar. O mapa gráfico fica para uma fase
              seguinte.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setFormError(null);
                setEditor({ kind: "area-create" });
              }}
            >
              Nova área
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setFormError(null);
                setEditor({ kind: "location-create" });
              }}
            >
              Novo endereço
            </Button>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          <ViewButton current={view} value="addresses" onChange={setView}>
            Endereços
          </ViewButton>
          <ViewButton current={view} value="structure" onChange={setView}>
            Estrutura
          </ViewButton>
          <ViewButton current={view} value="areas" onChange={setView}>
            Áreas
          </ViewButton>
        </div>

        {view !== "areas" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              type="search"
              value={query.text ?? ""}
              onChange={(event) => setQuery({ ...query, text: event.target.value })}
              placeholder="Código, área, corredor ou posição"
              aria-label="Buscar endereços"
              className={controlClass}
            />
            <select
              aria-label="Filtrar por área"
              value={query.areaId ?? ""}
              onChange={(event) => setQuery({ ...query, areaId: event.target.value })}
              className={controlClass}
            >
              <option value="">Todas as áreas</option>
              {(areas ?? []).map((area) => (
                <option key={area.id} value={area.id}>
                  {area.code} — {area.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por corredor"
              value={query.aisle ?? ""}
              onChange={(event) => setQuery({ ...query, aisle: event.target.value })}
              className={controlClass}
            >
              <option value="">Todos os corredores</option>
              {aisles.map((aisle) => (
                <option key={aisle} value={aisle}>
                  {aisle}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por prateleira"
              value={query.rack ?? ""}
              onChange={(event) => setQuery({ ...query, rack: event.target.value })}
              className={controlClass}
            >
              <option value="">Todas as prateleiras</option>
              {racks.map((rack) => (
                <option key={rack} value={rack}>
                  {rack}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por status"
              value={query.status ?? "ALL"}
              onChange={(event) =>
                setQuery({ ...query, status: event.target.value as LocationQuery["status"] })
              }
              className={controlClass}
            >
              <option value="ALL">Todos os status</option>
              {LOCATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {LOCATION_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {error ? (
          <p
            className="mt-4 rounded-md border border-danger px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-4">
          {areas == null || locations == null ? (
            <p className="text-sm text-muted">Carregando endereçamento…</p>
          ) : view === "areas" ? (
            <>
              <div className="mb-4">
                <input
                  type="search"
                  value={areaText}
                  onChange={(event) => setAreaText(event.target.value)}
                  placeholder="Buscar área por código ou nome"
                  aria-label="Buscar áreas"
                  className={controlClass}
                />
              </div>
              <AreaTable
                areas={visibleAreas}
                onEdit={(area) => {
                  setFormError(null);
                  setEditor({ kind: "area-edit", area });
                }}
                onStatus={(area, status) =>
                  void run(() =>
                    getBrowserLocationService()
                      .setAreaStatus(area.id, status)
                      .then(() => undefined),
                  )
                }
              />
            </>
          ) : view === "structure" ? (
            <LocationTree
              trees={tree}
              onLabel={(location) => setSignage({ location, autoPrint: false })}
            />
          ) : (
            <LocationTable
              items={visible}
              onOpen={(location) => {
                setFormError(null);
                setEditor({ kind: "location-detail", location });
              }}
              onLabel={(location) => setSignage({ location, autoPrint: false })}
              onEdit={(location) => {
                setFormError(null);
                setEditor({ kind: "location-edit", location });
              }}
              onStatus={(location, status) =>
                void run(() =>
                  getBrowserLocationService()
                    .setLocationStatus(location.id, status)
                    .then(() => undefined),
                )
              }
            />
          )}
        </div>
      </AppShell>

      <Dialog.Root
        open={editor != null}
        onOpenChange={(open) => {
          if (!open && !submitting) {
            setEditor(null);
            setFormError(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/50" />
          <Dialog.Content className="catalog-dialog fixed top-4 right-4 left-4 z-50 mx-auto overflow-y-auto rounded-lg border border-line bg-surface p-5 shadow-xl md:top-10 md:max-w-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <Dialog.Title className="text-xl font-semibold text-ink">
                {editor?.kind === "area-edit"
                  ? "Editar área"
                  : editor?.kind === "area-create"
                    ? "Nova área"
                    : editor?.kind === "location-edit" || editor?.kind === "location-detail"
                      ? editor.location.code
                      : "Novo endereço"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" aria-label="Fechar" disabled={submitting}>
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </Dialog.Close>
            </div>
            {formError ? (
              <p
                className="mb-4 rounded-md border border-danger px-3 py-2 text-sm text-danger"
                role="alert"
              >
                {formError}
              </p>
            ) : null}
            {editor?.kind === "area-create" || editor?.kind === "area-edit" ? (
              <AreaForm
                area={editor.kind === "area-edit" ? editor.area : undefined}
                submitting={submitting}
                onCancel={() => setEditor(null)}
                onSubmit={(values) =>
                  void run(async () => {
                    const service = getBrowserLocationService();
                    if (editor.kind === "area-edit") {
                      const parsed = validateAreaUpdateForm(values);
                      if (!parsed.value)
                        throw new Error(parsed.issues[0]?.message ?? "Dados inválidos.");
                      await service.updateArea(editor.area.id, parsed.value);
                      return;
                    }
                    const parsed = validateAreaCreateForm(values);
                    if (!parsed.value)
                      throw new Error(parsed.issues[0]?.message ?? "Dados inválidos.");
                    await service.createArea(parsed.value);
                  })
                }
              />
            ) : null}
            {editor?.kind === "location-create" || editor?.kind === "location-edit" ? (
              <LocationForm
                areas={areas ?? []}
                location={editor.kind === "location-edit" ? editor.location : undefined}
                occupied={
                  editor.kind === "location-edit" ? (counts[editor.location.id] ?? 0) > 0 : false
                }
                submitting={submitting}
                onCancel={() => setEditor(null)}
                onSubmit={(values) =>
                  void run(async () => {
                    const parsed = validateLocationForm(values);
                    if (!parsed.value)
                      throw new Error(parsed.issues[0]?.message ?? "Dados inválidos.");
                    const service = getBrowserLocationService();
                    if (editor.kind === "location-edit")
                      await service.updateLocation(editor.location.id, parsed.value);
                    else await service.createLocation(parsed.value);
                  })
                }
              />
            ) : null}
            {editor?.kind === "location-detail" ? (
              <LocationSignage
                location={editor.location}
                area={areas?.find((area) => area.id === editor.location.areaId) ?? null}
                onPreview={() => setSignage({ location: editor.location, autoPrint: false })}
                onPrint={() => setSignage({ location: editor.location, autoPrint: true })}
              />
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <PrintLabelDialog
        open={signage != null}
        title="Sinalização do endereço"
        autoPrint={signage?.autoPrint ?? false}
        onOpenChange={(open) => {
          if (!open) setSignage(null);
        }}
      >
        {signage ? (
          <LocationLabel
            location={signage.location}
            area={areas?.find((area) => area.id === signage.location.areaId) ?? null}
          />
        ) : null}
      </PrintLabelDialog>
    </>
  );
}

function ViewButton({
  current,
  value,
  onChange,
  children,
}: {
  current: string;
  value: "addresses" | "structure" | "areas";
  onChange: (value: "addresses" | "structure" | "areas") => void;
  children: string;
}) {
  return (
    <Button variant={current === value ? "primary" : "secondary"} onClick={() => onChange(value)}>
      {children}
    </Button>
  );
}

function AreaTable({
  areas,
  onEdit,
  onStatus,
}: {
  areas: StorageArea[];
  onEdit: (area: StorageArea) => void;
  onStatus: (area: StorageArea, status: StorageAreaStatus) => void;
}) {
  if (areas.length === 0) return <Empty text="Nenhuma área cadastrada." />;
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead className="bg-bg text-xs tracking-wide text-muted uppercase">
          <tr>
            <th className="px-3 py-3 font-medium">Código</th>
            <th className="px-3 py-3 font-medium">Nome</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {areas.map((area) => (
            <tr key={area.id} className="border-t border-line">
              <td className="px-3 py-3 font-mono text-xs">{area.code}</td>
              <td className="px-3 py-3">{area.name}</td>
              <td className="px-3 py-3">{STORAGE_AREA_STATUS_LABEL[area.status]}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1">
                  <Button variant="ghost" className="px-2" onClick={() => onEdit(area)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-2"
                    onClick={() => onStatus(area, area.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                  >
                    {area.status === "ACTIVE" ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LocationTable({
  items,
  onOpen,
  onLabel,
  onEdit,
  onStatus,
}: {
  items: ReturnType<typeof filterLocations>;
  onOpen: (location: Location) => void;
  onLabel: (location: Location) => void;
  onEdit: (location: Location) => void;
  onStatus: (location: Location, status: LocationStatus) => void;
}) {
  if (items.length === 0) return <Empty text="Nenhum endereço encontrado." />;
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead className="bg-bg text-xs tracking-wide text-muted uppercase">
          <tr>
            <th className="px-3 py-3 font-medium">Código</th>
            <th className="px-3 py-3 font-medium">Área</th>
            <th className="px-3 py-3 font-medium">Corredor</th>
            <th className="px-3 py-3 font-medium">Prateleira</th>
            <th className="px-3 py-3 font-medium">Nível</th>
            <th className="px-3 py-3 font-medium">Posição</th>
            <th className="px-3 py-3 font-medium">Caixas</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.location.id} className="border-t border-line">
              <td className="px-3 py-3 font-mono text-xs">
                <button
                  type="button"
                  className="underline-offset-2 hover:underline"
                  onClick={() => onOpen(item.location)}
                >
                  {item.location.code}
                </button>
              </td>
              <td className="px-3 py-3">{item.area?.name ?? "—"}</td>
              <td className="px-3 py-3">{item.location.aisle}</td>
              <td className="px-3 py-3">{item.location.rack}</td>
              <td className="px-3 py-3">{item.location.level}</td>
              <td className="px-3 py-3">{item.location.position}</td>
              <td className="px-3 py-3 whitespace-nowrap">
                {item.boxCount}
                {item.location.capacityBoxes != null ? ` / ${item.location.capacityBoxes}` : ""}
              </td>
              <td className="px-3 py-3">{LOCATION_STATUS_LABEL[item.location.status]}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1">
                  <Button variant="ghost" className="px-2" onClick={() => onOpen(item.location)}>
                    Detalhe
                  </Button>
                  <Button variant="ghost" className="px-2" onClick={() => onLabel(item.location)}>
                    Etiqueta
                  </Button>
                  <Button variant="ghost" className="px-2" onClick={() => onEdit(item.location)}>
                    Editar
                  </Button>
                  {item.location.status !== "ACTIVE" ? (
                    <Button
                      variant="ghost"
                      className="px-2"
                      onClick={() => onStatus(item.location, "ACTIVE")}
                    >
                      Ativar
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="px-2"
                      onClick={() => onStatus(item.location, "BLOCKED")}
                    >
                      Bloquear
                    </Button>
                  )}
                  {item.location.status !== "INACTIVE" ? (
                    <Button
                      variant="ghost"
                      className="px-2"
                      onClick={() => onStatus(item.location, "INACTIVE")}
                    >
                      Inativar
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LocationTree({
  trees,
  onLabel,
}: {
  trees: ReturnType<typeof groupLocations>;
  onLabel: (location: Location) => void;
}) {
  if (trees.length === 0) return <Empty text="Nenhuma posição para mostrar." />;
  return (
    <div className="flex flex-col gap-4">
      {trees.map((area) => (
        <section key={area.areaId} className="rounded-lg border border-line bg-surface p-4">
          <h2 className="font-semibold text-ink">
            {area.areaName} <span className="font-mono text-xs text-muted">{area.areaCode}</span>
          </h2>
          <ul className="mt-3 flex flex-col gap-3 border-l border-line pl-4">
            {area.aisles.map((aisle) => (
              <li key={aisle.aisle}>
                <p className="text-sm font-medium">Corredor {aisle.aisle}</p>
                <ul className="mt-2 flex flex-col gap-2 pl-4">
                  {aisle.racks.map((rack) => (
                    <li key={rack.rack}>
                      <p className="text-sm">Prateleira {rack.rack}</p>
                      <ul className="mt-1 flex flex-col gap-1 pl-4 text-sm">
                        {rack.levels.map((level) => (
                          <li key={level.level}>
                            Nível {level.level}
                            <ul className="pl-4 text-muted">
                              {level.positions.map((item) => (
                                <li
                                  key={item.location.id}
                                  className="flex flex-wrap items-center gap-2 font-mono text-xs text-ink"
                                >
                                  <span>
                                    Posição {item.location.position} · {item.location.code} ·{" "}
                                    {item.boxCount}
                                    {item.location.capacityBoxes != null
                                      ? ` / ${item.location.capacityBoxes}`
                                      : ""}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    className="px-2"
                                    onClick={() => onLabel(item.location)}
                                  >
                                    Etiqueta
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function AreaForm({
  area,
  submitting,
  onSubmit,
  onCancel,
}: {
  area?: StorageArea;
  submitting: boolean;
  onSubmit: (values: StorageAreaFormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<StorageAreaFormValues>(
    area ? { code: area.code, name: area.name, notes: area.notes ?? "" } : emptyAreaForm(),
  );
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <Field label="Código" htmlFor="area-code" required>
        <input
          id="area-code"
          value={values.code}
          disabled={Boolean(area) || submitting}
          onChange={(event) => setValues({ ...values, code: event.target.value })}
          className={controlClass}
          placeholder="SUP"
        />
      </Field>
      <Field label="Nome" htmlFor="area-name" required>
        <input
          id="area-name"
          value={values.name}
          disabled={submitting}
          onChange={(event) => setValues({ ...values, name: event.target.value })}
          className={controlClass}
          placeholder="Estoque Superior"
        />
      </Field>
      <Field label="Observação" htmlFor="area-notes">
        <textarea
          id="area-notes"
          value={values.notes}
          disabled={submitting}
          onChange={(event) => setValues({ ...values, notes: event.target.value })}
          className={`${controlClass} min-h-20 py-2`}
        />
      </Field>
      <div className="flex gap-2">
        <Button variant="primary" type="submit" disabled={submitting}>
          {submitting ? "Salvando…" : "Salvar"}
        </Button>
        <Button variant="secondary" type="button" disabled={submitting} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function LocationForm({
  areas,
  location,
  occupied,
  submitting,
  onSubmit,
  onCancel,
}: {
  areas: StorageArea[];
  location?: Location;
  occupied: boolean;
  submitting: boolean;
  onSubmit: (values: LocationFormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<LocationFormValues>(
    location
      ? {
          areaId: location.areaId,
          aisle: location.aisle,
          rack: location.rack,
          level: location.level,
          position: location.position,
          capacityBoxes: location.capacityBoxes == null ? "" : String(location.capacityBoxes),
          notes: location.notes ?? "",
        }
      : emptyLocationForm(areas.find((area) => area.status === "ACTIVE")?.id ?? ""),
  );
  const area = areas.find((item) => item.id === values.areaId);
  let preview = location?.code ?? "";
  if (area && values.aisle && values.rack && values.level && values.position) {
    try {
      preview = buildLocationCode(area.code, values);
    } catch {
      preview = location?.code ?? "";
    }
  }
  const lock = occupied || submitting;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <p className="font-mono text-sm text-ink">
        {preview || "O código será gerado ao preencher o endereço."}
      </p>
      {occupied ? (
        <p className="text-sm text-muted">
          Há caixas neste endereço. Só capacidade e observação podem mudar.
        </p>
      ) : null}
      <Field label="Área" htmlFor="loc-area" required>
        <select
          id="loc-area"
          value={values.areaId}
          disabled={lock}
          onChange={(event) => setValues({ ...values, areaId: event.target.value })}
          className={controlClass}
        >
          <option value="">Selecione</option>
          {areas
            .filter((item) => item.status === "ACTIVE" || item.id === location?.areaId)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} — {item.name}
              </option>
            ))}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Part
          id="loc-aisle"
          label="Corredor"
          value={values.aisle}
          disabled={lock}
          onChange={(aisle) => setValues({ ...values, aisle })}
        />
        <Part
          id="loc-rack"
          label="Prateleira"
          value={values.rack}
          disabled={lock}
          onChange={(rack) => setValues({ ...values, rack })}
        />
        <Part
          id="loc-level"
          label="Nível"
          value={values.level}
          disabled={lock}
          onChange={(level) => setValues({ ...values, level })}
        />
        <Part
          id="loc-position"
          label="Posição"
          value={values.position}
          disabled={lock}
          onChange={(position) => setValues({ ...values, position })}
        />
      </div>
      <Field
        label="Capacidade (caixas)"
        htmlFor="loc-capacity"
        hint="Opcional. Em branco não limita a posição."
      >
        <input
          id="loc-capacity"
          inputMode="numeric"
          value={values.capacityBoxes}
          disabled={submitting}
          onChange={(event) => setValues({ ...values, capacityBoxes: event.target.value })}
          className={controlClass}
          placeholder="4"
        />
      </Field>
      <Field label="Observação" htmlFor="loc-notes">
        <textarea
          id="loc-notes"
          value={values.notes}
          disabled={submitting}
          onChange={(event) => setValues({ ...values, notes: event.target.value })}
          className={`${controlClass} min-h-20 py-2`}
        />
      </Field>
      <div className="flex gap-2">
        <Button variant="primary" type="submit" disabled={submitting}>
          {submitting ? "Salvando…" : "Salvar"}
        </Button>
        <Button variant="secondary" type="button" disabled={submitting} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Part({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} htmlFor={id} required>
      <input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={controlClass}
      />
    </Field>
  );
}

function LocationSignage({
  location,
  area,
  onPreview,
  onPrint,
}: {
  location: Location;
  area: StorageArea | null;
  onPreview: () => void;
  onPrint: () => void;
}) {
  const payload = createLocationQrPayload(location.code);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <QrCode value={payload} title={`QR do endereço ${location.code}`} />
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Info label="Área" value={area ? `${area.name} (${area.code})` : "Área não encontrada"} />
          <Info label="Corredor" value={location.aisle} />
          <Info label="Prateleira" value={location.rack} />
          <Info label="Nível" value={location.level} />
          <Info label="Posição" value={location.position} />
        </dl>
      </div>
      <p className="font-mono text-xs break-all text-muted">{payload}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onPreview}>
          Visualizar sinalização
        </Button>
        <Button variant="primary" onClick={onPrint}>
          Imprimir
        </Button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-16 text-center text-sm text-muted">
      {text}
    </div>
  );
}
