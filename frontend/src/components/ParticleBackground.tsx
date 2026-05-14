"use client";
import { useEffect, useRef } from 'react';

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = 0, h = 0;
    const mouse = { x: -999, y: -999 };
    const GAP = 28;
    const REPEL = 90;

    interface Dot { bx: number; by: number; x: number; y: number; vx: number; vy: number; }
    let dots: Dot[] = [];

    const build = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      dots = [];
      const cols = Math.ceil(w / GAP) + 1;
      const rows = Math.ceil(h / GAP) + 1;
      const ox = (w % GAP) / 2;
      const oy = (h % GAP) / 2;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          dots.push({ bx: ox + c * GAP, by: oy + r * GAP, x: ox + c * GAP, y: oy + r * GAP, vx: 0, vy: 0 });
    };

    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onLeave = () => { mouse.x = -999; mouse.y = -999; };

    window.addEventListener('resize', build);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    build();

    const tick = () => {
      ctx.clearRect(0, 0, w, h);

      for (const d of dots) {
        const dx = mouse.x - d.x, dy = mouse.y - d.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REPEL && dist > 0) {
          const f = ((REPEL - dist) / REPEL) * 3.5;
          d.vx -= (dx / dist) * f;
          d.vy -= (dy / dist) * f;
        }

        d.vx += (d.bx - d.x) * 0.06;
        d.vy += (d.by - d.y) * 0.06;
        d.vx *= 0.78;
        d.vy *= 0.78;
        d.x += d.vx;
        d.y += d.vy;

        const prox = dist < REPEL ? (1 - dist / REPEL) : 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 2.2 + prox * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(249,115,22,${0.38 + prox * 0.6})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', build);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
}
