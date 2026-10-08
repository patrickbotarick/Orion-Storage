import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef } from "react";
import {
  Color,
  Euler,
  Matrix4,
  Quaternion,
  Vector3,
  CanvasTexture,
  type InstancedMesh,
} from "three";
import {
  localToWorld,
  structureGeometry,
  type Box,
  type FaceCode,
  type Location,
  type SpatialLayout,
} from "@orion/domain";
export type SpatialSceneProps = {
  layout: SpatialLayout;
  selectedId: string;
  face: FaceCode;
  view: "perspective" | "top" | "front";
  reset: number;
  zoom: number;
  highlighted: ReadonlySet<string>;
  locations: readonly Location[];
  boxes: readonly Box[];
  onSelect: (id: string) => void;
  onSlot: (id: string) => void;
  onUnavailable: () => void;
};
type Instance = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  rotation: number;
  color: string;
  structureId: string;
  slotId?: string;
};
function readColors() {
  const probe = document.createElement("span");
  document.body.append(probe);
  const result: Record<string, string> = {};
  for (const role of [
    "bg",
    "surface",
    "line",
    "ink",
    "muted",
    "accent",
    "info",
    "success",
    "danger",
    "disabled-bg",
    "steel-800",
  ]) {
    probe.style.color = `var(--color-${role})`;
    result[role] = getComputedStyle(probe).color;
  }
  probe.remove();
  return result;
}
function Instances({ data, onPick }: { data: Instance[]; onPick: (item: Instance) => void }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const matrix = new Matrix4(),
      quaternion = new Quaternion();
    data.forEach((item, i) => {
      quaternion.setFromEuler(new Euler(0, (item.rotation * Math.PI) / 180, 0));
      matrix.compose(
        new Vector3(item.x, item.y, item.z),
        quaternion,
        new Vector3(item.w, item.h, item.d),
      );
      ref.current!.setMatrixAt(i, matrix);
      ref.current!.setColorAt(i, new Color(item.color));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [data]);
  if (!data.length) return null;
  return (
    <instancedMesh
      key={data.length}
      ref={ref}
      args={[undefined, undefined, data.length]}
      onClick={(event) => {
        event.stopPropagation();
        if (event.instanceId != null) onPick(data[event.instanceId]!);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.85} />
    </instancedMesh>
  );
}
function CameraRig({ layout, selectedId, face, view, reset, zoom }: SpatialSceneProps) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, invalidate } = useThree();
  useEffect(() => {
    const s = layout.structures.find((s) => s.id === selectedId);
    const target = s
      ? new Vector3(s.x, s.height / 2, s.z)
      : new Vector3(layout.width / 2, 0, layout.depth / 2);
    const extent =
      (s
        ? Math.max(s.width, s.height, s.depth) * 2.5
        : Math.max(layout.width, layout.depth) * 0.85) * Math.pow(1.25, -zoom);
    if (view === "top") {
      camera.position.set(target.x, extent * 1.5, target.z + 0.001);
      camera.up.set(0, 0, -1);
    } else if (s && (view === "front" || selectedId)) {
      const p = localToWorld(s, 0, (face === "B" ? -1 : 1) * extent);
      camera.up.set(0, 1, 0);
      camera.position.set(p.x, view === "front" ? target.y : target.y + extent * 0.3, p.z);
    } else {
      camera.up.set(0, 1, 0);
      camera.position.set(target.x + extent, target.y + extent * 0.8, target.z + extent);
    }
    camera.lookAt(target);
    controls.current?.target.copy(target);
    controls.current?.update();
    invalidate();
    if ("isOrthographicCamera" in camera) {
      camera.zoom = Math.max(
        5,
        Math.min(150, Math.max(10, 30 - layout.width / 2) * Math.pow(1.25, zoom)),
      );
      camera.updateProjectionMatrix();
    }
  }, [camera, invalidate, layout, selectedId, face, view, reset, zoom]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping={false}
      enableRotate={view === "perspective"}
      minDistance={1}
      maxDistance={Math.max(layout.width, layout.depth) * 3}
      minPolarAngle={0.01}
      maxPolarAngle={Math.PI / 2 - 0.03}
      minZoom={5}
      maxZoom={150}
      onChange={() => {
        const target = controls.current?.target;
        if (target) {
          target.x = Math.max(0, Math.min(layout.width, target.x));
          target.z = Math.max(0, Math.min(layout.depth, target.z));
        }
        invalidate();
      }}
    />
  );
}
export default function SpatialScene(props: SpatialSceneProps) {
  const colors = useMemo(readColors, []);
  const { layout, selectedId, highlighted, locations, boxes } = props;
  const frames = useMemo(
    () =>
      layout.structures.flatMap((s) => {
        const output: Instance[] = [];
        const add = (x: number, y: number, z: number, w: number, h: number, d: number) => {
          const p = localToWorld(s, x, z);
          output.push({
            x: p.x,
            y,
            z: p.z,
            w,
            h,
            d,
            rotation: s.rotation,
            color: colors[s.id === selectedId ? "accent" : "steel-800"]!,
            structureId: s.id,
          });
        };
        for (const x of [-s.width / 2, s.width / 2])
          for (const z of [-s.depth / 2, s.depth / 2])
            add(x, s.height / 2, z, 0.045, s.height, 0.045);
        const heights = new Set([
          0,
          s.height,
          ...s.faces.flatMap((f) => {
            let y = 0;
            return f.levels.map((l) => {
              y += l.height;
              return y;
            });
          }),
        ]);
        for (const y of heights)
          for (const z of [-s.depth / 2, s.depth / 2]) add(0, y, z, s.width, 0.045, 0.045);
        return output;
      }),
    [layout, selectedId, colors],
  );
  const cells = useMemo(
    () =>
      layout.structures.flatMap((s) =>
        structureGeometry(s).map((g) => {
          const location = locations.find((l) => l.id === g.slot.locationId);
          const occupied = boxes.some(
            (b) => b.currentLocationId === g.slot.locationId && !!g.slot.locationId,
          );
          const role = highlighted.has(g.slot.locationId ?? "")
            ? "info"
            : (location?.status ?? g.slot.status) === "BLOCKED"
              ? "danger"
              : (location?.status ?? g.slot.status) === "INACTIVE"
                ? "muted"
                : occupied
                  ? "success"
                  : "disabled-bg";
          const p = localToWorld(s, g.x, g.z);
          return {
            x: p.x,
            y: g.y,
            z: p.z,
            w: Math.max(0.03, g.width - 0.06),
            h: Math.max(0.03, g.height - 0.07),
            d: Math.max(0.02, g.depth - 0.04),
            rotation: s.rotation,
            color: colors[role]!,
            structureId: s.id,
            slotId: g.slot.id,
          };
        }),
      ),
    [layout, locations, boxes, highlighted, colors],
  );
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "low-power" }}
    >
      <color attach="background" args={[colors.bg!]} />
      <ContextGuard onUnavailable={props.onUnavailable} />
      {props.view === "top" ? (
        <OrthographicCamera
          makeDefault
          position={[0, 20, 0]}
          zoom={Math.max(10, 30 - layout.width / 2)}
          near={0.01}
          far={3000}
        />
      ) : (
        <PerspectiveCamera makeDefault position={[20, 18, 20]} fov={45} near={0.01} far={3000} />
      )}
      <ambientLight intensity={1.2} />
      <directionalLight position={[10, 20, 8]} intensity={1.5} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[layout.width / 2, -0.03, layout.depth / 2]}>
        <planeGeometry args={[layout.width, layout.depth]} />
        <meshStandardMaterial color={colors.surface!} />
      </mesh>
      <gridHelper
        args={[
          Math.max(layout.width, layout.depth),
          Math.min(100, Math.ceil(Math.max(layout.width, layout.depth))),
          colors.line!,
          colors.line!,
        ]}
        position={[layout.width / 2, 0, layout.depth / 2]}
      />
      <Instances
        data={cells}
        onPick={(item) => {
          props.onSelect(item.structureId);
          if (item.slotId) props.onSlot(item.slotId);
        }}
      />
      <Instances data={frames} onPick={(item) => props.onSelect(item.structureId)} />
      {layout.structures.map((s) => (
        <StructureLabel
          key={s.id}
          code={s.code}
          position={[s.x, s.height + 0.35, s.z]}
          colors={colors}
          onSelect={() => props.onSelect(s.id)}
        />
      ))}
      <CameraRig {...props} />
    </Canvas>
  );
}
function ContextGuard({ onUnavailable }: { onUnavailable: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onUnavailable]);
  return null;
}
function StructureLabel({
  code,
  position,
  colors,
  onSelect,
}: {
  code: string;
  position: [number, number, number];
  colors: Record<string, string>;
  onSelect: () => void;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = colors.surface!;
    ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = colors.muted!;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 252, 92);
    ctx.fillStyle = colors.ink!;
    ctx.font = '600 42px "IBM Plex Mono", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(code, 128, 48);
    return new CanvasTexture(canvas);
  }, [code, colors]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite
      position={position}
      scale={[1.4, 0.525, 1]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <spriteMaterial map={texture} depthTest={false} />
    </sprite>
  );
}
