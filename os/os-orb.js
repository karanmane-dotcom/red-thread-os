/* Red Thread OS: the orb. A field of points on a turning sphere that breathes when idle,
   tightens and speeds up while Red Thread is working, and ripples when a module is hovered. */
(() => {
  'use strict';
  const RT = window.RT;
  let cv = null, ctx = null, raf = 0, st = 'idle', energy = 0, pulseT = 0, pts = [], W = 0, H = 0, dpr = 1;
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const N = 420;
  const seed = () => { pts = []; const g = Math.PI * (3 - Math.sqrt(5)); for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = g * i; pts.push([Math.cos(th) * r, y, Math.sin(th) * r, Math.random()]); } };
  const size = () => { if (!cv) return; const b = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = b.width; H = b.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); };
  const tone = () => cv?.closest('#rtos')?.getAttribute('data-tone') === 'light' ? [9, 9, 10] : [243, 242, 239];
  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    if (!cv || !cv.isConnected) { cancelAnimationFrame(raf); raf = 0; return; }
    const target = st === 'working' ? 1 : 0; energy += (target - energy) * 0.04; pulseT *= 0.94;
    const time = t / 1000, rot = time * (0.18 + energy * 0.9), tilt = 0.42;
    const R = Math.min(W, H) * (0.36 - energy * 0.05) * (1 + Math.sin(time * 1.6) * 0.015 * (1 - energy)) * (1 + pulseT * 0.06);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const [ir, ig, ib] = tone(), cx = W / 2, cy = H / 2, cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), stl = Math.sin(tilt);
    for (const p of pts) {
      let [x, y, z, k] = p;
      const wob = 1 + Math.sin(time * 2.2 + k * 12) * (0.02 + energy * 0.08) + pulseT * Math.sin(k * 30) * 0.08;
      x *= wob; y *= wob; z *= wob;
      const x1 = x * cr - z * sr, z1 = x * sr + z * cr, y1 = y * ct - z1 * stl, z2 = y * stl + z1 * ct;
      const depth = (z2 + 1.2) / 2.2, sx = cx + x1 * R, sy = cy + y1 * R, red = k < 0.12 + energy * 0.35;
      ctx.fillStyle = red ? `rgba(255,0,25,${(0.35 + depth * 0.65).toFixed(3)})` : `rgba(${ir},${ig},${ib},${(0.08 + depth * 0.55).toFixed(3)})`;
      const s = (red ? 1.8 : 1.3) * (0.5 + depth);
      ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
    }
    // the thread: one red line wrapping the sphere
    ctx.beginPath();
    for (let i = 0; i <= 160; i++) { const a = (i / 160) * Math.PI * 2, x = Math.cos(a), z = Math.sin(a), y = Math.sin(a * 3 + time * (0.6 + energy * 2)) * 0.18; const x1 = x * cr - z * sr, z1 = x * sr + z * cr, y1 = y * ct - z1 * stl; const sx = cx + x1 * R * 1.08, sy = cy + y1 * R * 1.08; i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }
    ctx.strokeStyle = `rgba(255,0,25,${0.55 + energy * 0.4})`; ctx.lineWidth = 1.2 + energy * 1.2; ctx.stroke();
  };
  const still = () => { st = 'idle'; frame(performance.now()); cancelAnimationFrame(raf); raf = 0; };
  RT.orb = {
    mount(host) {
      if (!pts.length) seed();
      cv = document.createElement('canvas'); cv.className = 'rt-orb'; cv.setAttribute('aria-hidden', 'true'); host.replaceChildren(cv);
      ctx = cv.getContext('2d'); size();
      new ResizeObserver(size).observe(cv);
      if (reduced()) { requestAnimationFrame(still); return; }
      if (!raf) raf = requestAnimationFrame(frame);
    },
    state(s) { st = s; document.getElementById('rtos')?.classList.toggle('busy', s === 'working'); },
    pulse() { pulseT = 1; },
  };
})();
