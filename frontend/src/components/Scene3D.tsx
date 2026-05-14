"use client";
import { useEffect, useRef } from 'react';

interface P3 { x: number; y: number; z: number; }

const rotY = (p: P3, a: number): P3 => ({
  x: p.x * Math.cos(a) + p.z * Math.sin(a),
  y: p.y,
  z: -p.x * Math.sin(a) + p.z * Math.cos(a),
});
const rotX = (p: P3, a: number): P3 => ({
  x: p.x,
  y: p.y * Math.cos(a) - p.z * Math.sin(a),
  z: p.y * Math.sin(a) + p.z * Math.cos(a),
});
const project = (p: P3, cx: number, cy: number, fov: number) => {
  const z = p.z + fov;
  const s = fov / z;
  return { sx: cx + p.x * s, sy: cy + p.y * s, depth: p.z };
};

export default function Scene3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const SIZE = 340;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const cx = SIZE / 2, cy = SIZE / 2, FOV = 340;
    const R = 110;

    // Build sphere lattice (lat/lon grid)
    const LAT = 10, LON = 18;
    const vertices: P3[] = [];
    for (let i = 0; i <= LAT; i++) {
      const phi = (Math.PI * i) / LAT - Math.PI / 2;
      for (let j = 0; j < LON; j++) {
        const theta = (2 * Math.PI * j) / LON;
        vertices.push({
          x: R * Math.cos(phi) * Math.cos(theta),
          y: R * Math.sin(phi),
          z: R * Math.cos(phi) * Math.sin(theta),
        });
      }
    }

    // Edges: lat lines
    const edges: [number, number][] = [];
    for (let i = 0; i <= LAT; i++)
      for (let j = 0; j < LON; j++)
        edges.push([i * LON + j, i * LON + ((j + 1) % LON)]);
    // lon lines
    for (let j = 0; j < LON; j++)
      for (let i = 0; i < LAT; i++)
        edges.push([i * LON + j, (i + 1) * LON + j]);

    // Orbiting dots
    const orbiters = Array.from({ length: 5 }, (_, k) => ({
      angle: (k / 5) * Math.PI * 2,
      speed: 0.008 + k * 0.003,
      orbitR: R + 28 + k * 8,
      tilt: (k / 5) * Math.PI * 0.6,
    }));

    let angleY = 0, angleX = 0.3;
    let targetY = 0, targetX = 0.3;
    let animId: number;

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / SIZE - 0.5;
      const my = (e.clientY - rect.top) / SIZE - 0.5;
      targetY = mx * 1.2;
      targetX = 0.3 - my * 0.8;
    };
    canvas.addEventListener('mousemove', onMove);

    const tick = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Ease toward mouse
      angleY += (targetY - angleY) * 0.04;
      angleX += (targetX - angleX) * 0.04;
      targetY += 0.003; // slow auto-rotate

      // Rotate vertices
      const rotated = vertices.map(v => rotX(rotY(v, angleY), angleX));

      // Draw edges
      for (const [a, b] of edges) {
        const pa = project(rotated[a], cx, cy, FOV);
        const pb = project(rotated[b], cx, cy, FOV);
        const depth = (rotated[a].z + rotated[b].z) / 2;
        const alpha = Math.max(0.04, Math.min(0.28, (depth + R) / (2 * R) * 0.28));
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.strokeStyle = `rgba(249,115,22,${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Draw vertex dots
      for (const v of rotated) {
        const { sx, sy, depth } = project(v, cx, cy, FOV);
        const alpha = Math.max(0.08, (v.z + R) / (2 * R) * 0.6);
        const r = Math.max(1, (v.z + R) / (2 * R) * 2.8);
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(249,115,22,${alpha})`;
        ctx.fill();
        void depth;
      }

      // Draw orbiters
      for (const orb of orbiters) {
        orb.angle += orb.speed;
        const raw: P3 = {
          x: orb.orbitR * Math.cos(orb.angle),
          y: orb.orbitR * Math.sin(orb.angle) * Math.sin(orb.tilt),
          z: orb.orbitR * Math.sin(orb.angle) * Math.cos(orb.tilt),
        };
        const rv = rotX(rotY(raw, angleY), angleX);
        const { sx, sy } = project(rv, cx, cy, FOV);
        const alpha = Math.max(0.3, (rv.z + orb.orbitR) / (2 * orb.orbitR));
        // Glow
        const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10);
        grd.addColorStop(0, `rgba(249,115,22,${alpha * 0.5})`);
        grd.addColorStop(1, 'rgba(249,115,22,0)');
        ctx.beginPath();
        ctx.arc(sx, sy, 10, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
        // Core
        ctx.beginPath();
        ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(249,115,22,${alpha})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-[340px] h-[340px] drop-shadow-2xl"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
