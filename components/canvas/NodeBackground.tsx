"use client";

/**
 * NodeBackground
 * --------------
 * A schematic network topology — not a generic particle cloud. Every node is
 * a real device type (router, firewall, NVR, cameras, web/db servers) wired
 * with the edges an actual small deployment would have. This is the visual
 * grounded in Masakhane's actual specialisation: he configures and
 * troubleshoots networks like this one, he doesn't just render sci-fi dots.
 *
 * Perf notes:
 *  - Fixed node count (11), no per-frame allocation.
 *  - dpr capped at 1.5; labels are lightweight drei <Html> overlays.
 *  - Falls back gracefully: if WebGL is unavailable, React renders nothing.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface NodeDef {
  id: string;
  label: string;
  pos: [number, number, number];
  accent: "cyan" | "emerald" | "violet";
}

const NODES: NodeDef[] = [
  { id: "cloud", label: "CLOUD", pos: [0, 7, -2], accent: "violet" },
  { id: "firewall", label: "FIREWALL", pos: [0, 4, -1], accent: "cyan" },
  { id: "core", label: "CORE-SW", pos: [0, 1, 0], accent: "cyan" },
  { id: "router", label: "ROUTER", pos: [-6, -1, -1], accent: "emerald" },
  { id: "edge-ai", label: "EDGE-AI", pos: [6, -1, -1], accent: "violet" },
  { id: "nvr", label: "NVR", pos: [-8.5, -4, -2], accent: "emerald" },
  { id: "web", label: "WEB-SRV", pos: [4, -4, 0], accent: "cyan" },
  { id: "db", label: "DB-SRV", pos: [8.5, -6.5, -1], accent: "cyan" },
  { id: "cam1", label: "CAM-01", pos: [-11, -6.5, -3], accent: "emerald" },
  { id: "cam2", label: "CAM-02", pos: [-6, -7.5, -3], accent: "emerald" },
  { id: "client", label: "CLIENT", pos: [0, -6.5, 1], accent: "violet" },
];

const EDGES: [string, string][] = [
  ["cloud", "firewall"],
  ["firewall", "core"],
  ["core", "router"],
  ["core", "edge-ai"],
  ["router", "nvr"],
  ["nvr", "cam1"],
  ["nvr", "cam2"],
  ["core", "web"],
  ["web", "db"],
  ["core", "client"],
];

const accentHex: Record<string, string> = {
  cyan: "#f2a93b",
  emerald: "#6fae8f",
  violet: "#948bc4",
};

function idIndex(id: string) {
  return NODES.findIndex((n) => n.id === id);
}

function Topology() {
  const groupRef = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  const linePositions = useMemo(() => {
    const arr = new Float32Array(EDGES.length * 2 * 3);
    EDGES.forEach(([a, b], i) => {
      const na = NODES[idIndex(a)].pos;
      const nb = NODES[idIndex(b)].pos;
      arr.set(na, i * 6);
      arr.set(nb, i * 6 + 3);
    });
    return arr;
  }, []);

  useFrame((state) => {
    const grp = groupRef.current;
    if (!grp) return;
    // gentle pointer parallax + slow idle drift — deliberately restrained so
    // the device labels stay legible rather than swimming across the screen
    grp.rotation.y += (pointer.x * 0.18 - grp.rotation.y) * 0.02;
    grp.rotation.x += (-pointer.y * 0.1 - grp.rotation.x) * 0.02;
    grp.position.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.15;
  });

  return (
    <group ref={groupRef} scale={0.62} position={[0, -0.5, 0]}>
      {/* schematic edges */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#f2a93b" transparent opacity={0.28} depthWrite={false} />
      </lineSegments>

      {/* device nodes */}
      {NODES.map((n) => (
        <group key={n.id} position={n.pos}>
          <mesh>
            <sphereGeometry args={[0.16, 16, 16]} />
            <meshBasicMaterial color={accentHex[n.accent]} />
          </mesh>
          <Html
            center
            distanceFactor={9}
            style={{
              pointerEvents: "none",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              color: accentHex[n.accent],
              whiteSpace: "nowrap",
              transform: "translateY(18px)",
              opacity: 0.85,
            }}
          >
            {n.label}
          </Html>
        </group>
      ))}
    </group>
  );
}

export default function NodeBackground() {
  // Touch devices don't get pointer-parallax anyway, and the R3F canvas is
  // the single heaviest thing on the page — skip it entirely on touch/coarse
  // pointers and fall back to a cheap static radial glow instead.
  const [canRender3D, setCanRender3D] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    setCanRender3D(!mq.matches);
  }, []);

  if (!canRender3D) {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(242,169,59,0.08), transparent 60%)",
        }}
      />
    );
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{ maskImage: "radial-gradient(circle at 50% 45%, black 60%, transparent 100%)" }}
    >
      <Canvas
        camera={{ position: [0, 0, 20], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Topology />
      </Canvas>
    </div>
  );
}
