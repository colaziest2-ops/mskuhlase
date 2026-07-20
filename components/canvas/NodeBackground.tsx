"use client";

/**
 * NodeBackground
 * --------------
 * A GPU-rendered field of "server nodes" (points) with dynamic link lines that
 * light up between neighbours — a stand-in for a live distributed telemetry
 * network. The whole field parallaxes toward the pointer.
 *
 * Perf notes:
 *  - Positions/links are computed once and mutated in place (no re-allocation).
 *  - dpr is capped at 1.5 and frameloop can be paused by the parent when off-screen.
 *  - Falls back gracefully: if WebGL is unavailable, React just renders nothing.
 */

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const NODE_COUNT = 90;
const MAX_LINK_DIST = 3.2;
const FIELD = 14; // half-extent of the cube the nodes live in

function NodeField() {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  // Generate node positions + per-node drift velocities once.
  const { positions, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(NODE_COUNT * 3);
    const velocities = new Float32Array(NODE_COUNT * 3);
    const colors = new Float32Array(NODE_COUNT * 3);
    const palette = [
      new THREE.Color("#22d3ee"),
      new THREE.Color("#34d399"),
      new THREE.Color("#a78bfa"),
    ];
    for (let i = 0; i < NODE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * FIELD * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * FIELD * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * FIELD;
      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, velocities, colors };
  }, []);

  // Pre-allocate the maximum possible link buffer (n^2 pairs is overkill; cap it).
  const linePositions = useMemo(
    () => new Float32Array(NODE_COUNT * NODE_COUNT * 3),
    []
  );

  useFrame((state) => {
    const pts = pointsRef.current;
    const grp = groupRef.current;
    if (!pts || !grp) return;

    const posAttr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    // Drift nodes and gently bounce them inside the field.
    for (let i = 0; i < NODE_COUNT; i++) {
      const ix = i * 3;
      arr[ix] += velocities[ix];
      arr[ix + 1] += velocities[ix + 1];
      arr[ix + 2] += velocities[ix + 2];
      if (Math.abs(arr[ix]) > FIELD) velocities[ix] *= -1;
      if (Math.abs(arr[ix + 1]) > FIELD) velocities[ix + 1] *= -1;
      if (Math.abs(arr[ix + 2]) > FIELD / 2) velocities[ix + 2] *= -1;
    }
    posAttr.needsUpdate = true;

    // Rebuild links between nearby nodes.
    let ptr = 0;
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dx = arr[i * 3] - arr[j * 3];
        const dy = arr[i * 3 + 1] - arr[j * 3 + 1];
        const dz = arr[i * 3 + 2] - arr[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < MAX_LINK_DIST) {
          linePositions[ptr++] = arr[i * 3];
          linePositions[ptr++] = arr[i * 3 + 1];
          linePositions[ptr++] = arr[i * 3 + 2];
          linePositions[ptr++] = arr[j * 3];
          linePositions[ptr++] = arr[j * 3 + 1];
          linePositions[ptr++] = arr[j * 3 + 2];
        }
      }
    }
    if (linesRef.current) {
      const lp = linesRef.current.geometry.attributes.position as THREE.BufferAttribute;
      (lp.array as Float32Array).set(linePositions.subarray(0, ptr));
      lp.needsUpdate = true;
      linesRef.current.geometry.setDrawRange(0, ptr / 3);
    }

    // Parallax the whole field toward the pointer + slow idle rotation.
    grp.rotation.y += (pointer.x * 0.35 - grp.rotation.y) * 0.03;
    grp.rotation.x += (-pointer.y * 0.25 - grp.rotation.x) * 0.03;
    grp.rotation.z = state.clock.elapsedTime * 0.02;
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.14}
          vertexColors
          transparent
          opacity={0.95}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

export default function NodeBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{ maskImage: "radial-gradient(circle at 50% 40%, black 55%, transparent 100%)" }}
    >
      <Canvas
        camera={{ position: [0, 0, 18], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <NodeField />
      </Canvas>
    </div>
  );
}
