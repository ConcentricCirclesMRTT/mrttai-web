import { useEffect, useRef } from "react";

/**
 * Hero backdrop: a slowly receding perspective blueprint grid with a drifting
 * constraint network. Pauses off-screen / in background tabs; static when the
 * visitor prefers reduced motion.
 */
export function GridField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true, t0 = performance.now();
    const nodes = Array.from({ length: 46 }, () => ({
      x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.00006, vy: (Math.random() - 0.5) * 0.00006,
    }));

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      const horizon = h * 0.42;
      const cx = w * 0.62;

      // perspective floor
      ctx.lineWidth = 1;
      const rows = 16;
      const scroll = reduce ? 0 : (t * 0.18) % 1;
      for (let i = 0; i < rows; i++) {
        const k = (i + scroll) / rows;
        const y = horizon + Math.pow(k, 2.1) * (h - horizon);
        ctx.strokeStyle = `rgba(75,220,155,${0.05 + k * 0.17})`;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      const cols = 26;
      for (let i = -cols; i <= cols; i++) {
        const spread = i / cols;
        ctx.strokeStyle = `rgba(75,220,155,${0.05 + (1 - Math.abs(spread)) * 0.08})`;
        ctx.beginPath(); ctx.moveTo(cx + spread * w * 0.08, horizon); ctx.lineTo(cx + spread * w * 1.4, h); ctx.stroke();
      }

      // constraint network
      for (const n of nodes) {
        if (!reduce) { n.x += n.vx * 16; n.y += n.vy * 16; }
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      }
      const maxD = Math.min(w, 900) * 0.15;
      for (let a = 0; a < nodes.length; a++) {
        const A = nodes[a]; const ax = A.x * w, ay = A.y * h * 0.8;
        for (let b = a + 1; b < nodes.length; b++) {
          const B = nodes[b]; const dx = ax - B.x * w, dy = ay - B.y * h * 0.8;
          const d = Math.hypot(dx, dy);
          if (d < maxD) {
            ctx.strokeStyle = `rgba(120,200,255,${(1 - d / maxD) * 0.22})`;
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(B.x * w, B.y * h * 0.8); ctx.stroke();
          }
        }
        ctx.fillStyle = "rgba(160,235,255,.55)";
        ctx.fillRect(ax - 1.5, ay - 1.5, 3, 3);
      }
    };

    const loop = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf && !reduce) raf = requestAnimationFrame(loop); };

    resize();
    draw(performance.now());
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); });
    io.observe(canvas);
    const onVis = () => { if (!document.hidden) start(); };
    const onResize = () => { resize(); draw(performance.now()); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", onResize);
    start();
    return () => {
      cancelAnimationFrame(raf); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="grid-field" aria-hidden="true" />;
}
