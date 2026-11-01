"use client";
import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { buildings, campusLocations } from "@/db/schema";
import { Search, X, Navigation, MapPin, Info } from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";

interface Props {
  buildings: (typeof buildings.$inferSelect)[];
  locations: (typeof campusLocations.$inferSelect)[];
}

function Building({
  building,
  selected,
  onSelect,
}: {
  building: typeof buildings.$inferSelect;
  selected: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (ref.current && selected) {
      ref.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1 + building.height / 2;
    } else if (ref.current) {
      ref.current.position.y = building.height / 2;
    }
  });

  return (
    <group position={[building.posX - 50, 0, building.posZ - 50]}>
      <group
        ref={ref}
        position={[0, building.height / 2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[building.width, building.height, building.depth]} />
          <meshStandardMaterial
            color={selected ? "#06b6d4" : building.color}
            emissive={hovered || selected ? building.color : "#000"}
            emissiveIntensity={hovered ? 0.3 : selected ? 0.5 : 0}
          />
        </mesh>
        {/* Roof accent */}
        <mesh position={[0, building.height / 2 + 0.1, 0]}>
          <boxGeometry args={[building.width * 0.95, 0.2, building.depth * 0.95]} />
          <meshStandardMaterial color="#0a1244" />
        </mesh>
        {/* Label */}
        <Html position={[0, building.height / 2 + 2, 0]} center distanceFactor={55}>
          <div
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap shadow pointer-events-none ${
              selected
                ? "bg-navy-900 text-white ring-2 ring-cyan-400"
                : "bg-white/90 text-navy-950 ring-1 ring-slate-300"
            }`}
          >
            {building.shortName || building.name}
            {selected ? ` · ${building.floors}F` : ""}
          </div>
        </Html>
      </group>
      {/* Base */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[building.width + 1, 0.1, building.depth + 1]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
    </group>
  );
}

function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      {/* Grid */}
      <gridHelper args={[200, 40, "#94a3b8", "#cbd5e1"]} position={[0, 0.01, 0]} />
    </group>
  );
}

function Trees() {
  const positions = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      arr.push([x, 0, z]);
    }
    return arr;
  }, []);

  return (
    <>
      {positions.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <coneGeometry args={[1.2, 3, 8]} />
            <meshStandardMaterial color="#047857" />
          </mesh>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.6]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Scene({ buildings, selectedId, onSelect }: Props & { selectedId: number | null; onSelect: (id: number) => void }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[50, 80, 30]} intensity={1.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <directionalLight position={[-30, 40, -20]} intensity={0.3} color="#a5f3fc" />
      <Ground />
      <Trees />
      {buildings.map((b) => (
        <Building
          key={b.id}
          building={b}
          selected={b.id === selectedId}
          onSelect={() => onSelect(b.id)}
        />
      ))}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={30}
        maxDistance={150}
      />
    </>
  );
}

export function CampusMap3D({ buildings, locations }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const selected = selectedId ? buildings.find((b) => b.id === selectedId) : null;
  const selectedLocations = selectedId
    ? locations.filter((l) => l.buildingId === selectedId)
    : [];

  const filteredBuildings = search
    ? buildings.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.shortName?.toLowerCase().includes(search.toLowerCase())
      )
    : buildings;

  return (
    <div className="grid lg:grid-cols-4 gap-4">
      {/* Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        <Card padding="md">
          <h3 className="font-semibold text-navy-950 text-sm mb-3">Search campus</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Building name..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-navy-500"
            />
          </div>
          <div className="mt-3 space-y-1 max-h-[400px] overflow-y-auto">
            {filteredBuildings.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm transition-colors ${
                  selectedId === b.id ? "bg-navy-50 ring-1 ring-navy-200" : "hover:bg-slate-50"
                }`}
              >
                <span
                  className="h-3 w-3 rounded-sm flex-shrink-0"
                  style={{ background: b.color }}
                />
                <span className="truncate text-navy-900 font-medium">{b.shortName || b.name}</span>
              </button>
            ))}
          </div>
        </Card>

        {selected && (
          <Card padding="md" className="bg-gradient-to-br from-navy-50 to-cyan-50 ring-1 ring-navy-100">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-navy-950 text-sm">{selected.name}</h3>
                <div className="text-xs text-slate-500 font-mono mt-0.5">{selected.code}</div>
              </div>
              <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">{selected.description}</p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Badge variant="navy">{selected.floors} floors</Badge>
              {selected.facilities?.slice(0, 3).map((f) => (
                <Badge key={f} variant="default">{f}</Badge>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-navy-200/50">
              <div className="text-xs font-semibold text-navy-900 mb-2 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Rooms & facilities ({selectedLocations.length})
              </div>
              {selectedLocations.length === 0 ? (
                <div className="text-xs text-slate-500">No specific locations recorded.</div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedLocations.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-white/70">
                      <div className="h-1.5 w-1.5 rounded-full bg-cyan-600" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-navy-900">{l.name}</div>
                        <div className="text-[10px] text-slate-500">Floor {l.floor} · {l.type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* 3D Canvas */}
      <div className="lg:col-span-3">
        <Card padding="none" className="aspect-[4/3] min-h-[500px] relative overflow-hidden">
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
            <div className="glass rounded-lg px-3 py-1.5 text-xs font-medium text-navy-900 pointer-events-auto">
              <div className="flex items-center gap-1.5">
                <Navigation className="h-3 w-3" />
                3D Campus · Conceptual Model
              </div>
            </div>
            <div className="glass rounded-lg px-3 py-1.5 text-xs text-slate-700 pointer-events-auto">
              Drag to rotate · Scroll to zoom · Click building
            </div>
          </div>
          <Suspense fallback={<div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-500 text-sm">Loading 3D campus...</div>}>
            <Canvas
              shadows
              camera={{ position: [80, 60, 80], fov: 45 }}
              style={{ background: "linear-gradient(to bottom, #e0f2fe, #f1f5f9)" }}
            >
              <Scene
                buildings={buildings}
                locations={locations}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </Canvas>
          </Suspense>
          {!selected && (
            <div className="absolute bottom-4 left-4 right-4 z-10 glass rounded-xl px-4 py-3 text-xs text-slate-700 flex items-start gap-2">
              <Info className="h-4 w-4 text-navy-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-navy-900">Conceptual Demo Model</div>
                <div className="text-slate-600 mt-0.5">
                  This is a conceptual representation of the Air University Karachi campus.
                  Super admins can replace it with verified architectural data.
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
