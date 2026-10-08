import { Component, lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Box as BoxIcon, Move, RotateCw, Layers, Pencil, Save, X, ScanLine } from "lucide-react";
import {
  cloneSpatial,
  createStructure,
  emptyLayout,
  layoutSlots,
  resizeLevel,
  structureGeometry,
  validateLayout,
  LOCATION_STATUS_LABEL,
  type Box,
  type FaceCode,
  type Location,
  type SpatialLayout,
  type SpatialSlot,
  type StorageArea,
  type StorageStructure,
  type StructureKind,
} from "@orion/domain";
import { getBrowserSpatialService } from "@/application/spatial/spatial-service";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/controls";
import { Field } from "@/components/ui/field";
import { Alert, EmptyState, LoadingState } from "@/components/ui/feedback";
import { Card } from "@/components/ui/surfaces";
import { ConfirmDialog } from "@/components/ui/modal";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { PrintLabelDialog } from "@/features/identification/print-label-dialog";
import { LocationLabel } from "@/features/identification/location-label";
const Scene = lazy(() => import("./spatial-scene"));
const KIND_LABEL: Record<StructureKind, string> = {
  SINGLE: "Prateleira simples",
  DOUBLE: "Prateleira dupla",
  HONEYCOMB: "Colmeia",
  FLOOR: "Posição de piso",
};
type Props = {
  area: StorageArea;
  locations: readonly Location[];
  boxes: readonly Box[];
  highlighted: ReadonlySet<string>;
  focusId: string | null;
  focusToken: number;
  onOpenLocation: (location: Location) => void;
  onSaved: () => Promise<void>;
  onEditing: (value: boolean) => void;
};
class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function supportsWebGL() {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) return false;
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return true;
}
const nextCode = (layout: SpatialLayout) => {
  let n = 1;
  while (layout.structures.some((s) => s.code === `E${String(n).padStart(3, "0")}`)) n++;
  return `E${String(n).padStart(3, "0")}`;
};
export function SpatialPanel({
  area,
  locations,
  boxes,
  highlighted,
  focusId,
  focusToken,
  onOpenLocation,
  onSaved,
  onEditing,
}: Props) {
  const [saved, setSaved] = useState<SpatialLayout | null>(null),
    [draft, setDraft] = useState<SpatialLayout | null>(null);
  const [editing, setEditing] = useState(false),
    [example, setExample] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState(""),
    [face, setFace] = useState<FaceCode>("U"),
    [slotId, setSlotId] = useState(""),
    [kind, setKind] = useState<StructureKind>("SINGLE");
  const [mode, setMode] = useState<"plan" | "3d">("plan"),
    [view, setView] = useState<"perspective" | "top" | "front">("perspective"),
    [reset, setReset] = useState(0),
    [snap, setSnap] = useState(true),
    [confirm, setConfirm] = useState(false),
    [label, setLabel] = useState<Location | null>(null);
  const [zoneCode, setZoneCode] = useState(""),
    [zoneName, setZoneName] = useState("");
  const [zoom, setZoom] = useState(0);
  useEffect(() => {
    let stopped = false;
    setSaved(null);
    setDraft(null);
    setError("");
    getBrowserSpatialService()
      .load(area.id)
      .then((layout) => {
        if (!stopped) {
          setSaved(layout);
          setDraft(cloneSpatial(layout));
          setSelectedId("");
          setSlotId("");
          setExample(false);
        }
      })
      .catch((e) => {
        if (!stopped)
          setError(e instanceof Error ? e.message : "Não foi possível carregar o layout.");
      });
    return () => {
      stopped = true;
    };
  }, [area.id]);
  useEffect(() => {
    onEditing(editing);
    return () => onEditing(false);
  }, [editing, onEditing]);
  const layout = draft;
  const selected = layout?.structures.find((s) => s.id === selectedId);
  const activeFace = selected?.faces.find((f) => f.code === face) ?? selected?.faces[0];
  const geometry = useMemo(() => (selected ? structureGeometry(selected) : []), [selected]);
  const cell = geometry.find((g) => g.slot.id === slotId);
  const location = locations.find((l) => l.id === cell?.slot.locationId);
  const errors = layout ? validateLayout(layout) : [];
  const select = (id: string) => {
    setSelectedId(id);
    setSlotId("");
    const s = layout?.structures.find((s) => s.id === id);
    if (s && !s.faces.some((f) => f.code === face)) setFace(s.faces[0]!.code);
  };
  useEffect(() => {
    if (!focusId || !saved) return;
    const target = layoutSlots(saved).find((c) => c.slot.locationId === focusId);
    if (target) {
      setSelectedId(target.structure.id);
      setFace(target.face);
      setSlotId(target.slot.id);
      setView("front");
      setReset((r) => r + 1);
    } else
      setNotice(
        "Este endereço ainda não está vinculado ao layout espacial. Consulte-o na lista abaixo ou no mapa operacional.",
      );
  }, [focusId, focusToken, saved]);
  function updateStructure(value: StorageStructure) {
    setDraft((current) =>
      current
        ? { ...current, structures: current.structures.map((s) => (s.id === value.id ? value : s)) }
        : current,
    );
    setNotice("");
  }
  function updateSlot(patch: Partial<SpatialSlot>) {
    if (!selected || !cell) return;
    const s = cloneSpatial(selected);
    Object.assign(
      s.faces.find((f) => f.code === cell.face)!.levels[cell.level - 1]!.slots[cell.position - 1]!,
      patch,
    );
    updateStructure(s);
  }
  function move(s: StorageStructure, x: number, z: number) {
    const grid = layout!.grid;
    updateStructure({
      ...s,
      x: snap ? Math.round(x / grid) * grid : x,
      z: snap ? Math.round(z / grid) * grid : z,
    });
  }
  function add() {
    if (!layout) return;
    const s = createStructure(kind, nextCode(layout));
    setDraft({ ...layout, structures: [...layout.structures, s] });
    setSelectedId(s.id);
    setFace(s.faces[0]!.code);
    setSlotId("");
  }
  function duplicate() {
    if (!selected || !layout) return;
    const s = cloneSpatial(selected);
    s.id = crypto.randomUUID();
    s.code = nextCode(layout);
    s.name = `${s.name.slice(0, 65)} (cópia)`;
    s.x += s.width + layout.grid;
    s.faces = s.faces.map((f) => ({
      ...f,
      levels: f.levels.map((l) => ({
        ...l,
        slots: l.slots.map((p) => ({ ...p, id: crypto.randomUUID(), locationId: undefined })),
      })),
    }));
    setDraft({ ...layout, structures: [...layout.structures, s] });
    setSelectedId(s.id);
    setSlotId("");
  }
  function changeKind(value: StructureKind) {
    if (!selected) return;
    const s = cloneSpatial(selected);
    s.kind = value;
    if (value === "DOUBLE" && s.faces.length === 1) {
      s.faces[0]!.code = "A";
      s.faces.push({
        code: "B",
        levels: s.faces[0]!.levels.map((l) => ({
          ...l,
          slots: l.slots.map((p) => ({
            ...p,
            id: crypto.randomUUID(),
            locationId: undefined,
            depth: s.depth / 2,
          })),
        })),
      });
      for (const l of s.faces[0]!.levels)
        for (const p of l.slots) p.depth = Math.min(p.depth, s.depth / 2);
    } else if (value !== "DOUBLE") {
      s.faces = [{ ...s.faces[0]!, code: "U" }];
    }
    setFace(s.faces[0]!.code);
    setSlotId("");
    updateStructure(s);
  }
  async function persist(confirmed = false) {
    if (!layout || !saved || example) return;
    const old = layoutSlots(saved).flatMap((c) => (c.slot.locationId ? [c.slot.locationId] : [])),
      remaining = new Set(layoutSlots(layout).map((c) => c.slot.locationId));
    if (!confirmed && old.some((id) => !remaining.has(id))) {
      setConfirm(true);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await getBrowserSpatialService().save(layout, confirmed);
      setSaved(result);
      setDraft(cloneSpatial(result));
      setEditing(false);
      setConfirm(false);
      setNotice("Layout salvo. As posições utilizam o estoque oficial.");
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }
  function cancel() {
    if (saved) setDraft(cloneSpatial(saved));
    setEditing(false);
    setExample(false);
    setError("");
    setNotice("Alterações descartadas.");
    setSelectedId("");
    setSlotId("");
  }
  function demo() {
    if (!saved) return;
    const l = emptyLayout(area.id);
    l.revision = saved.revision;
    const a = createStructure("SINGLE", "E001"),
      b = createStructure("DOUBLE", "E002"),
      c = createStructure("HONEYCOMB", "E003");
    a.x = 4;
    a.z = 3;
    b.x = 10;
    b.z = 6;
    c.x = 4;
    c.z = 9;
    l.structures = [a, b, c];
    setDraft(l);
    setExample(true);
    setEditing(true);
    setSelectedId("");
    setFace("U");
    setSlotId("");
    setError("");
    setNotice("");
  }
  function enable3d() {
    if (supportsWebGL()) {
      setMode("3d");
      setNotice("");
    } else {
      setMode("plan");
      setNotice("WebGL indisponível. Consulta, vista frontal e editor 2D continuam disponíveis.");
    }
  }
  if (!layout)
    return (
      <Card className="mt-6">
        {error ? (
          <Alert tone="danger">{error}</Alert>
        ) : (
          <LoadingState label="Carregando layout espacial…" />
        )}
      </Card>
    );
  const unlinked = locations.filter(
    (l) =>
      l.areaId === area.id &&
      !layoutSlots(layout).some((p) => p.slot.locationId === l.id) &&
      !l.spatial?.retired,
  );
  return (
    <section className="mt-6 space-y-4" aria-label="Mapa espacial">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-metadata text-muted">LOCALIZAÇÃO ESPACIAL · {area.code}</p>
            <h2>{area.name}</h2>
            <p className="mt-2 text-sm text-muted">
              {editing
                ? "Rascunho: valide antes de salvar. Nenhuma caixa é movimentada pelo editor."
                : "Consulta do layout e das posições oficiais. Use a vista frontal para selecionar um endereço."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <Button onClick={cancel} disabled={saving}>
                  <X className="size-4" aria-hidden="true" />
                  Cancelar edição
                </Button>
                <Button
                  variant="primary"
                  id="spatial-save-layout"
                  onClick={() => persist()}
                  disabled={!!errors.length || example}
                  loading={saving}
                >
                  <Save className="size-4" aria-hidden="true" />
                  Salvar layout
                </Button>
              </>
            ) : (
              <>
                <Button onClick={demo}>Exemplo interativo</Button>
                <Button
                  variant="primary"
                  id="spatial-edit-layout"
                  disabled={area.status !== "ACTIVE"}
                  onClick={() => {
                    setEditing(true);
                    setNotice("");
                  }}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  Editar layout
                </Button>
              </>
            )}
          </div>
        </div>
        {example ? (
          <Alert tone="info" className="mt-4">
            Exemplo sem medidas reais. A gravação está desabilitada e nenhum endereço de estoque
            será criado. Cancele para configurar o mapa verdadeiro.
          </Alert>
        ) : layout.revision === 0 ? (
          <Alert tone="info" className="mt-4">
            Área sem levantamento espacial. Dimensões iniciais são sugestões editáveis; confirme as
            medidas físicas antes de salvar. Endereços antigos permanecem disponíveis.
          </Alert>
        ) : null}
      </Card>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="info">{notice}</Alert> : null}
      <fieldset disabled={saving} className="min-w-0 space-y-4">
        {editing ? (
          <Card>
            <h3 className="mb-3">Área e configuração</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField
                label="Largura da área (m)"
                value={layout.width}
                onChange={(width) => setDraft({ ...layout, width })}
              />
              <NumberField
                label="Profundidade da área (m)"
                value={layout.depth}
                onChange={(depth) => setDraft({ ...layout, depth })}
              />
              <NumberField
                label="Grade (m)"
                value={layout.grid}
                onChange={(grid) => setDraft({ ...layout, grid })}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <Field label="Nova estrutura" htmlFor="spatial-kind">
                <Select
                  id="spatial-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as StructureKind)}
                >
                  {Object.entries(KIND_LABEL).map(([key, name]) => (
                    <option key={key} value={key}>
                      {name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button onClick={add}>
                <Layers className="size-4" aria-hidden="true" />
                Adicionar estrutura
              </Button>
              <label className="inline-flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
                Alinhar à grade
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Field label="Código da nova zona" htmlFor="zone-code">
                <Input
                  id="zone-code"
                  value={zoneCode}
                  onChange={(e) => setZoneCode(e.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Nome da nova zona" htmlFor="zone-name">
                <Input
                  id="zone-name"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                />
              </Field>
              <Button
                disabled={!zoneCode.trim() || !zoneName.trim()}
                onClick={() => {
                  setDraft({
                    ...layout,
                    zones: [
                      ...layout.zones,
                      { id: crypto.randomUUID(), code: zoneCode.trim(), name: zoneName.trim() },
                    ],
                  });
                  setZoneCode("");
                  setZoneName("");
                }}
              >
                Adicionar zona
              </Button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {layout.zones.map((z) => (
                <Field
                  key={z.id}
                  label={`Zona ${z.code}: nome/finalidade`}
                  htmlFor={`zone-${z.id}`}
                >
                  <Input
                    id={`zone-${z.id}`}
                    value={z.name}
                    onChange={(e) =>
                      setDraft({
                        ...layout,
                        zones: layout.zones.map((item) =>
                          item.id === z.id ? { ...item, name: e.target.value } : item,
                        ),
                      })
                    }
                  />
                </Field>
              ))}
            </div>
          </Card>
        ) : null}
        {editing && errors.length ? (
          <Alert tone="danger">
            <p className="font-semibold">Layout inválido — gravação bloqueada</p>
            <ul className="mt-2 list-disc pl-5">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Alert>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button selected={mode === "plan"} onClick={() => setMode("plan")}>
            Vista 2D / lista
          </Button>
          <Button selected={mode === "3d"} onClick={enable3d}>
            Ativar 3D
          </Button>
          {mode === "3d" && !errors.length ? (
            <>
              <Button
                aria-label="Aproximar câmera"
                disabled={zoom >= 5}
                onClick={() => setZoom((z) => z + 1)}
              >
                Aproximar
              </Button>
              <Button
                aria-label="Afastar câmera"
                disabled={zoom <= -3}
                onClick={() => setZoom((z) => z - 1)}
              >
                Afastar
              </Button>
              <Button onClick={() => setReset((r) => r + 1)}>Centralizar seleção</Button>
              <Button selected={view === "perspective"} onClick={() => setView("perspective")}>
                Perspectiva
              </Button>
              <Button selected={view === "top"} onClick={() => setView("top")}>
                Vista superior
              </Button>
              <Button
                onClick={() => {
                  setSelectedId("");
                  setSlotId("");
                  setView("perspective");
                  setZoom(0);
                  setReset((r) => r + 1);
                }}
              >
                Restaurar vista
              </Button>
            </>
          ) : null}
        </div>
        <Card className="overflow-hidden">
          <p className="mb-3 text-metadata text-muted">
            {mode === "3d"
              ? "Arraste para girar; gesto de pinça ou roda para zoom; botão direito/dois dedos para enquadrar."
              : "Selecione uma estrutura. Na edição, arraste no plano ou ajuste as coordenadas abaixo."}
          </p>
          {mode === "3d" && !errors.length ? (
            <div className="orion-spatial-viewport">
              <SceneBoundary
                onFailure={() => {
                  setMode("plan");
                  setNotice("Falha gráfica. A alternativa 2D continua disponível.");
                }}
              >
                <Suspense fallback={<LoadingState label="Carregando visualizador 3D…" />}>
                  <Scene
                    layout={layout}
                    selectedId={selectedId}
                    face={activeFace?.code ?? "U"}
                    view={view}
                    reset={reset}
                    zoom={zoom}
                    highlighted={highlighted}
                    locations={locations}
                    boxes={boxes}
                    onSelect={select}
                    onSlot={(id) => {
                      setSlotId(id);
                      const c = layoutSlots(layout).find((c) => c.slot.id === id);
                      if (c) setFace(c.face);
                    }}
                    onUnavailable={() => {
                      setMode("plan");
                      setNotice("Visualização gráfica indisponível. Use a alternativa 2D.");
                    }}
                  />
                </Suspense>
              </SceneBoundary>
            </div>
          ) : (
            <div
              className="orion-spatial-plan"
              style={{
                aspectRatio: `${Number.isFinite(layout.width) ? Math.max(1, layout.width) : 20} / ${Number.isFinite(layout.depth) ? Math.max(1, layout.depth) : 12}`,
              }}
              aria-label="Planta da área"
              role="region"
            >
              {layout.structures.map((s) => (
                <PlanStructure
                  key={s.id}
                  structure={s}
                  layout={layout}
                  selected={s.id === selectedId}
                  editing={editing}
                  invalid={errors.some((e) => e.includes(s.code))}
                  onSelect={() => select(s.id)}
                  onMove={(x, z) => move(s, x, z)}
                />
              ))}
            </div>
          )}
          <ul
            className="mt-3 flex flex-wrap gap-4 text-metadata text-muted"
            aria-label="Legenda espacial"
          >
            <li>Livre: superfície neutra</li>
            <li className="text-success">Ocupada: estoque oficial</li>
            <li className="text-danger">Bloqueada</li>
            <li>Inativa</li>
            <li className="text-info">Resultado de busca</li>
          </ul>
        </Card>
        {layout.structures.length === 0 ? (
          <EmptyState
            title="Nenhuma estrutura cadastrada."
            description="Edite o layout para criar estruturas ou consulte o exemplo sem gravar dados."
          />
        ) : (
          <Card>
            <h3 className="mb-3">Estruturas</h3>
            <div className="flex flex-wrap gap-2">
              {layout.structures.map((s) => (
                <Button key={s.id} selected={selectedId === s.id} onClick={() => select(s.id)}>
                  <BoxIcon className="size-4" aria-hidden="true" />
                  {s.code} · {s.name}
                </Button>
              ))}
            </div>
          </Card>
        )}
        {selected ? (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-mono">
                {selected.code} — {selected.name}
              </h3>
              <div className="flex flex-wrap gap-2">
                {selected.faces.map((f) => (
                  <Button
                    key={f.code}
                    selected={activeFace?.code === f.code}
                    onClick={() => {
                      setFace(f.code);
                      setSlotId("");
                    }}
                  >
                    Face {f.code}
                  </Button>
                ))}
                <Button
                  onClick={() => {
                    setView("front");
                    if (mode === "3d") setReset((r) => r + 1);
                  }}
                >
                  Visualização frontal
                </Button>
                {editing ? (
                  <>
                    <Button onClick={duplicate}>Duplicar configuração</Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        setDraft({
                          ...layout,
                          structures: layout.structures.filter((s) => s.id !== selected.id),
                        });
                        setSelectedId("");
                        setSlotId("");
                      }}
                    >
                      Remover estrutura
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            {editing ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Código da estrutura" htmlFor="structure-code">
                    <Input
                      id="structure-code"
                      value={selected.code}
                      onChange={(e) =>
                        updateStructure({ ...selected, code: e.target.value.toUpperCase() })
                      }
                    />
                  </Field>
                  <Field label="Nome da estrutura" htmlFor="structure-name">
                    <Input
                      id="structure-name"
                      value={selected.name}
                      onChange={(e) => updateStructure({ ...selected, name: e.target.value })}
                    />
                  </Field>
                  <Field label="Tipo da estrutura" htmlFor="structure-kind">
                    <Select
                      id="structure-kind"
                      value={selected.kind}
                      onChange={(e) => changeKind(e.target.value as StructureKind)}
                    >
                      {Object.entries(KIND_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Zona" htmlFor="structure-zone">
                    <Select
                      id="structure-zone"
                      value={selected.zoneId ?? ""}
                      onChange={(e) =>
                        updateStructure({ ...selected, zoneId: e.target.value || undefined })
                      }
                    >
                      <option value="">Sem zona</option>
                      {layout.zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.code} · {z.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <NumberField
                    label="Largura da estrutura (m)"
                    value={selected.width}
                    onChange={(width) => updateStructure({ ...selected, width })}
                  />
                  <NumberField
                    label="Altura da estrutura (m)"
                    value={selected.height}
                    onChange={(height) => updateStructure({ ...selected, height })}
                  />
                  <NumberField
                    label="Profundidade da estrutura (m)"
                    value={selected.depth}
                    onChange={(depth) => updateStructure({ ...selected, depth })}
                  />
                  <NumberField
                    label="Coordenada X (m)"
                    value={selected.x}
                    onChange={(x) => move(selected, x, selected.z)}
                  />
                  <NumberField
                    label="Coordenada Z (m)"
                    value={selected.z}
                    onChange={(z) => move(selected, selected.x, z)}
                  />
                  <NumberField
                    label="Rotação (graus)"
                    value={selected.rotation}
                    onChange={(rotation) => updateStructure({ ...selected, rotation })}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      updateStructure({ ...selected, rotation: (selected.rotation + 90) % 360 })
                    }
                  >
                    <RotateCw className="size-4" aria-hidden="true" />
                    Girar 90°
                  </Button>
                  {(
                    [
                      [-1, 0, "Esquerda"],
                      [1, 0, "Direita"],
                      [0, -1, "Para cima"],
                      [0, 1, "Para baixo"],
                    ] as const
                  ).map(([x, z, name]) => (
                    <Button
                      key={name}
                      aria-label={`Mover ${name}`}
                      onClick={() =>
                        move(selected, selected.x + x * layout.grid, selected.z + z * layout.grid)
                      }
                    >
                      <Move className="size-4" aria-hidden="true" />
                      {name}
                    </Button>
                  ))}
                </div>
                {activeFace ? (
                  <div>
                    <h4 className="mb-2 font-semibold">Modulação — face {activeFace.code}</h4>
                    <div className="space-y-3">
                      {activeFace.levels.map((l, i) => (
                        <div
                          key={i}
                          className="grid gap-3 rounded-control border border-line p-3 sm:grid-cols-3"
                        >
                          <NumberField
                            label={`Face ${activeFace.code} nível ${i + 1}: posições`}
                            value={l.slots.length}
                            step={1}
                            onChange={(count) =>
                              updateStructure(resizeLevel(selected, activeFace.code, i + 1, count))
                            }
                          />
                          <NumberField
                            label={`Face ${activeFace.code} nível ${i + 1}: altura (m)`}
                            value={l.height}
                            onChange={(height) => {
                              const s = cloneSpatial(selected);
                              s.faces.find((f) => f.code === activeFace.code)!.levels[i]!.height =
                                height;
                              updateStructure(s);
                            }}
                          />
                          <Button
                            variant="danger"
                            onClick={() => {
                              const s = cloneSpatial(selected);
                              s.faces.find((f) => f.code === activeFace.code)!.levels.splice(i, 1);
                              updateStructure(s);
                              setSlotId("");
                            }}
                          >
                            Remover nível {i + 1}
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="mt-3"
                      onClick={() => {
                        const s = cloneSpatial(selected);
                        s.faces
                          .find((f) => f.code === activeFace.code)!
                          .levels.push({
                            height: 0.4,
                            slots: [
                              {
                                id: crypto.randomUUID(),
                                width: s.width,
                                depth: s.depth / (s.kind === "DOUBLE" ? 2 : 1),
                                status: "ACTIVE",
                              },
                            ],
                          });
                        updateStructure(s);
                      }}
                    >
                      Adicionar nível
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div
              className="mt-5 overflow-x-auto"
              role="region"
              aria-label="Vista frontal de posições"
            >
              {activeFace?.levels
                .map((l, i) => ({ l, i }))
                .reverse()
                .map(({ l, i }) => (
                  <div key={i} className="mb-3 flex min-w-max items-stretch gap-2">
                    <span className="flex min-w-11 items-center font-mono text-code">
                      N{String(i + 1).padStart(2, "0")}
                    </span>
                    {l.slots.map((p, pi) => {
                      const loc = locations.find((l) => l.id === p.locationId),
                        count = boxes.filter(
                          (b) => !!p.locationId && b.currentLocationId === p.locationId,
                        ).length,
                        status = loc?.status ?? p.status;
                      return (
                        <Button
                          key={p.id}
                          selected={slotId === p.id}
                          onClick={() => setSlotId(p.id)}
                          className={`min-w-28 flex-col items-start ${highlighted.has(p.locationId ?? "") ? "border-info-border bg-info-bg" : status === "BLOCKED" ? "border-danger-border bg-danger-bg" : count ? "border-success-border bg-success-bg" : ""}`}
                          aria-label={`Face ${activeFace.code} nível ${i + 1} posição ${pi + 1}, ${LOCATION_STATUS_LABEL[status]}, ${count} caixas`}
                        >
                          <span className="font-mono">P{String(pi + 1).padStart(2, "0")}</span>
                          <span>
                            {LOCATION_STATUS_LABEL[status]} · {count} caixas
                          </span>
                          {highlighted.has(p.locationId ?? "") ? (
                            <span className="text-info">Resultado de busca</span>
                          ) : null}
                        </Button>
                      );
                    })}
                  </div>
                ))}
            </div>
          </Card>
        ) : null}
        {cell && selected ? (
          <Card>
            <h3 className="font-mono">
              {location?.code ??
                `${area.code}-${selected.code}-${cell.face}-N${String(cell.level).padStart(2, "0")}-P${String(cell.position).padStart(2, "0")}`}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {location
                ? "Endereço físico vinculado ao estoque oficial."
                : "Posição do rascunho: endereço será criado somente ao salvar o layout."}
            </p>
            {editing ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Vincular endereço existente" htmlFor="slot-location">
                  <Select
                    id="slot-location"
                    value={cell.slot.locationId ?? ""}
                    onChange={(e) => {
                      const l = locations.find((l) => l.id === e.target.value);
                      updateSlot({
                        locationId: e.target.value || undefined,
                        ...(l ? { status: l.status, capacityBoxes: l.capacityBoxes } : {}),
                      });
                    }}
                  >
                    <option value="">Criar endereço novo ao salvar</option>
                    {locations
                      .filter(
                        (l) =>
                          l.areaId === area.id &&
                          (!l.spatial || l.id === cell.slot.locationId) &&
                          !layoutSlots(layout).some(
                            (c) => c.slot.id !== cell.slot.id && c.slot.locationId === l.id,
                          ),
                      )
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.code} · {LOCATION_STATUS_LABEL[l.status]}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="Estado da posição" htmlFor="slot-status">
                  <Select
                    id="slot-status"
                    value={cell.slot.status}
                    onChange={(e) => updateSlot({ status: e.target.value as Location["status"] })}
                  >
                    {Object.entries(LOCATION_STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </Field>
                <NumberField
                  label="Largura do compartimento (m)"
                  value={cell.slot.width}
                  onChange={(width) => updateSlot({ width })}
                />
                <NumberField
                  label="Profundidade do compartimento (m)"
                  value={cell.slot.depth}
                  onChange={(depth) => updateSlot({ depth })}
                />
                <Field label="Capacidade em caixas (opcional)" htmlFor="slot-capacity">
                  <Input
                    id="slot-capacity"
                    type="number"
                    min={1}
                    step={1}
                    value={cell.slot.capacityBoxes ?? ""}
                    onChange={(e) =>
                      updateSlot({
                        capacityBoxes: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </Field>
              </div>
            ) : null}
            {location ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => onOpenLocation(location)}>
                  Consultar caixas e produtos
                </Button>
                <Button onClick={() => setLabel(location)}>
                  <ScanLine className="size-4" aria-hidden="true" />
                  Etiqueta da posição
                </Button>
              </div>
            ) : null}
          </Card>
        ) : null}
        {unlinked.length ? (
          <Card>
            <h3>Endereços sem vínculo espacial</h3>
            <p className="mt-2 text-sm text-muted">
              Disponíveis para consulta e operação; cadastre a estrutura real e vincule cada posição
              explicitamente.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {unlinked.map((l) => (
                <Button
                  key={l.id}
                  selected={highlighted.has(l.id)}
                  onClick={() => onOpenLocation(l)}
                  className="font-mono"
                >
                  {l.code}
                </Button>
              ))}
            </div>
          </Card>
        ) : null}
      </fieldset>
      <AlertDialog.Root
        open={confirm}
        onOpenChange={(open) => {
          if (!saving) setConfirm(open);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-graphite-950/60" />
          <ConfirmDialog
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              (
                document.getElementById("spatial-save-layout") ??
                document.getElementById("spatial-edit-layout")
              )?.focus();
            }}
          >
            <AlertDialog.Title className="text-heading-3 font-semibold">
              Desativar posições removidas?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-3 text-sm text-muted">
              Endereços vazios serão desativados, preservando registros, QR Codes e histórico.
              Posições com estoque não podem ser removidas.
            </AlertDialog.Description>
            {error ? (
              <Alert tone="danger" className="mt-3">
                {error}
              </Alert>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <AlertDialog.Cancel asChild>
                <Button disabled={saving}>Voltar ao editor</Button>
              </AlertDialog.Cancel>
              <Button variant="danger" loading={saving} onClick={() => persist(true)}>
                Confirmar e salvar layout
              </Button>
            </div>
          </ConfirmDialog>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      <PrintLabelDialog
        open={label != null}
        title="Sinalização da posição"
        onOpenChange={(open) => {
          if (!open) setLabel(null);
        }}
      >
        {label ? <LocationLabel location={label} area={area} /> : null}
      </PrintLabelDialog>
    </section>
  );
}
function NumberField({
  label,
  value,
  onChange,
  step = 0.05,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  const id = `spatial-${label.replace(/[^a-zA-Z0-9]/g, "-")}`;
  return (
    <Field label={label} htmlFor={id}>
      <Input
        id={id}
        type="number"
        step={step}
        value={Number.isFinite(value) ? Number(value.toFixed(4)) : ""}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
      />
    </Field>
  );
}
function PlanStructure({
  structure: s,
  layout,
  selected,
  editing,
  invalid,
  onSelect,
  onMove,
}: {
  structure: StorageStructure;
  layout: SpatialLayout;
  selected: boolean;
  editing: boolean;
  invalid: boolean;
  onSelect: () => void;
  onMove: (x: number, z: number) => void;
}) {
  const [drag, setDrag] = useState<{
    x: number;
    z: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  return (
    <button
      type="button"
      className={`orion-spatial-structure ${selected ? "border-accent bg-selected text-selected-fg" : "border-control-border bg-surface text-ink"} ${invalid ? "border-danger-border bg-danger-bg text-danger" : ""}`}
      style={{
        left: `${Number.isFinite(s.x / layout.width) ? (s.x / layout.width) * 100 : 0}%`,
        top: `${Number.isFinite(s.z / layout.depth) ? (s.z / layout.depth) * 100 : 0}%`,
        width: `${Number.isFinite(s.width / layout.width) ? (s.width / layout.width) * 100 : 1}%`,
        height: `${Number.isFinite(s.depth / layout.depth) ? (s.depth / layout.depth) * 100 : 1}%`,
        transform: `translate(-50%,-50%) rotate(${Number.isFinite(s.rotation) ? s.rotation : 0}deg)`,
        touchAction: editing ? "none" : "auto",
      }}
      onClick={onSelect}
      aria-label={`Estrutura ${s.code} ${s.name}`}
      onPointerDown={(e) => {
        if (!editing) return;
        onSelect();
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag({ x: s.x, z: s.z, clientX: e.clientX, clientY: e.clientY });
      }}
      onPointerMove={(e) => {
        if (!drag || !editing) return;
        const bounds = e.currentTarget.parentElement!.getBoundingClientRect();
        onMove(
          drag.x + ((e.clientX - drag.clientX) / bounds.width) * layout.width,
          drag.z + ((e.clientY - drag.clientY) / bounds.height) * layout.depth,
        );
      }}
      onPointerUp={() => setDrag(null)}
      onPointerCancel={() => setDrag(null)}
    >
      {s.code}
    </button>
  );
}
