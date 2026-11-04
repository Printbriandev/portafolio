const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Menú móvil ---------- */
const toggle = document.querySelector('.nav__toggle');
const menu = document.getElementById('menu');
const setMenu = (open) => {
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  menu.classList.toggle('is-open', open);
};
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

/* ---------- Filtro de proyectos ---------- */
const chips = document.querySelectorAll('.chip');
const cards = document.querySelectorAll('.card');
chips.forEach((chip) =>
  chip.addEventListener('click', () => {
    chips.forEach((c) => c.classList.toggle('is-active', c === chip));
    const f = chip.dataset.filter;
    cards.forEach((card) => { card.hidden = f !== 'all' && card.dataset.type !== f; });
  })
);

/* ---------- Data center en 3D del hero: pasillo de racks, piso técnico y cables ---------- */
(function datacenter() {
  const canvas = document.getElementById('grid');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, dpr, f, vx, vy, raf, t0 = performance.now();
  let mx = 0, my = 0, tx = 0, ty = 0;

  const COLORS = { green: [52, 224, 161], blue: [77, 163, 255], violet: [167, 139, 250], amber: [251, 191, 90] };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  // Mundo: cámara en el origen mirando hacia +Z. Y crece hacia abajo.
  const FLOOR = 1.15, CEIL = -1.35, AISLE = 1.0, RACK_TOP = -0.95;
  const RACK_D = 0.78, GAP = 0.06, Z_START = 1.3, N_RACKS = 11, UNITS = 18;
  const racks = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < N_RACKS; i++) {
      const z0 = Z_START + i * (RACK_D + GAP);
      const leds = [];
      for (let u = 0; u < UNITS; u++) {
        if (Math.random() < 0.12) continue; // hueco vacío en el rack
        const n = 1 + (Math.random() * 3 | 0);
        for (let k = 0; k < n; k++) {
          const r = Math.random();
          leds.push({
            u, pos: 0.08 + k * 0.07,
            color: r < 0.62 ? COLORS.green : r < 0.84 ? COLORS.blue : r < 0.95 ? COLORS.violet : COLORS.amber,
            speed: 0.8 + Math.random() * 6, phase: Math.random() * 10, duty: 0.35 + Math.random() * 0.5,
          });
        }
      }
      racks.push({ side, z0, z1: z0 + RACK_D, leds });
    }
  }
  // cables en las bandejas del techo
  const trays = [-0.6, 0.6];
  const cables = [];
  for (const tx0 of trays) {
    ['blue', 'green', 'violet', 'amber', 'blue', 'green'].forEach((c, i) => cables.push({ x: tx0 + (i - 2.5) * 0.035, y: CEIL + 0.12, color: COLORS[c] }));
  }
  const packets = [];

  const P = (X, Y, Z) => [vx + (X * f) / Z, vy + (Y * f) / Z];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = canvas.offsetWidth; h = canvas.offsetHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    f = Math.max(h * 0.85, w * 0.42);
  }

  function quad(a, b, c, d) {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
  }

  function draw(now) {
    const t = (now - t0) / 1000;
    tx += (mx - tx) * 0.04; ty += (my - ty) * 0.04;
    vx = w * 0.5 + tx * w * 0.035;
    vy = h * 0.42 + ty * h * 0.025;
    ctx.clearRect(0, 0, w, h);

    // luz fría al fondo del pasillo
    const glow = ctx.createRadialGradient(vx, vy, 0, vx, vy, Math.max(w, h) * 0.5);
    glow.addColorStop(0, 'rgba(77,163,255,0.22)');
    glow.addColorStop(0.25, 'rgba(167,139,250,0.08)');
    glow.addColorStop(1, 'rgba(7,10,20,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);

    const ZF = Z_START + N_RACKS * (RACK_D + GAP);

    // piso técnico (baldosas) con avance lento: sensación de entrar
    const tile = 0.6, off = (t * 0.18) % tile;
    ctx.lineWidth = 1;
    for (let x = -3; x <= 3.001; x += tile) {
      const a = P(x, FLOOR, 0.9), b = P(x, FLOOR, ZF);
      ctx.strokeStyle = 'rgba(77,163,255,0.10)';
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    for (let z = 0.9 + tile - off; z < ZF; z += tile) {
      const a = P(-3, FLOOR, z), b = P(3, FLOOR, z);
      ctx.strokeStyle = `rgba(77,163,255,${0.16 * Math.min(1, 2.2 / z)})`;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    // franja de luz del pasillo en el piso
    const s1 = P(-0.25, FLOOR, 0.9), s2 = P(0.25, FLOOR, 0.9), s3 = P(0.25, FLOOR, ZF), s4 = P(-0.25, FLOOR, ZF);
    quad(s1, s2, s3, s4); ctx.fillStyle = 'rgba(52,224,161,0.035)'; ctx.fill();

    // bandejas y cables del techo
    for (const tx0 of trays) {
      const a = P(tx0 - 0.14, CEIL + 0.1, 0.9), b = P(tx0 + 0.14, CEIL + 0.1, 0.9), c = P(tx0 + 0.14, CEIL + 0.1, ZF), d = P(tx0 - 0.14, CEIL + 0.1, ZF);
      quad(a, b, c, d); ctx.fillStyle = 'rgba(20,30,52,0.55)'; ctx.fill();
      ctx.strokeStyle = 'rgba(77,163,255,0.18)'; ctx.stroke();
    }
    for (const c of cables) {
      const a = P(c.x, c.y, 0.9), b = P(c.x, c.y, ZF);
      ctx.strokeStyle = rgba(c.color, 0.22); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    // paquetes de datos que viajan por los cables hacia ti
    if (packets.length < 16 && Math.random() < 0.12) {
      const c = cables[(Math.random() * cables.length) | 0];
      packets.push({ c, z: ZF, v: 2.5 + Math.random() * 3.5 });
    }
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      p.z -= p.v * 0.016;
      if (p.z < 0.95) { packets.splice(i, 1); continue; }
      const head = P(p.c.x, p.c.y, p.z), tail = P(p.c.x, p.c.y, p.z + 0.9);
      const g = ctx.createLinearGradient(tail[0], tail[1], head[0], head[1]);
      g.addColorStop(0, rgba(p.c.color, 0)); g.addColorStop(1, rgba(p.c.color, 0.95));
      ctx.strokeStyle = g; ctx.lineWidth = Math.max(1, 3.2 / p.z);
      ctx.beginPath(); ctx.moveTo(tail[0], tail[1]); ctx.lineTo(head[0], head[1]); ctx.stroke();
    }

    // racks: del fondo hacia adelante
    const sorted = racks.slice().sort((a, b) => b.z0 - a.z0);
    for (const r of sorted) {
      const X = AISLE * r.side;
      const a = P(X, FLOOR, r.z0), b = P(X, RACK_TOP, r.z0), c = P(X, RACK_TOP, r.z1), d = P(X, FLOOR, r.z1);
      const depthFade = Math.min(1, 3.2 / r.z0);
      // cara del rack (puerta perforada)
      quad(a, b, c, d);
      ctx.fillStyle = 'rgba(16,24,44,0.96)'; ctx.fill();
      ctx.strokeStyle = `rgba(70,92,150,${0.8 * depthFade + 0.15})`; ctx.lineWidth = 1; ctx.stroke();
      // borde frontal iluminado
      ctx.strokeStyle = `rgba(77,163,255,${0.55 * depthFade})`; ctx.lineWidth = Math.max(1, 2.4 / r.z0);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.lineWidth = 1;
      // cara superior (techo del rack) para dar volumen
      const X2 = X + 0.5 * r.side;
      const e = P(X2, RACK_TOP, r.z0), g2 = P(X2, RACK_TOP, r.z1);
      quad(b, e, g2, c); ctx.fillStyle = 'rgba(18,26,46,0.9)'; ctx.fill();
      // líneas de cada unidad (U)
      ctx.strokeStyle = `rgba(60,80,130,${0.45 * depthFade})`;
      for (let u = 1; u < UNITS; u++) {
        const y = RACK_TOP + (FLOOR - RACK_TOP) * (u / UNITS);
        const p1 = P(X, y, r.z0 + 0.02), p2 = P(X, y, r.z1 - 0.02);
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      }
      // LEDs
      for (const L of r.leds) {
        const on = ((t * L.speed + L.phase) % 1) < L.duty;
        const y = RACK_TOP + (FLOOR - RACK_TOP) * ((L.u + 0.5) / UNITS);
        const z = r.z0 + RACK_D * L.pos;
        const [px, py] = P(X, y, z);
        const s = Math.max(1.2, 6 / z);
        ctx.fillStyle = rgba(L.color, on ? 0.95 * depthFade + 0.05 : 0.12);
        ctx.fillRect(px - s / 2, py - s / 2, s, s);
        if (on && z < 6) { ctx.fillStyle = rgba(L.color, 0.22); ctx.fillRect(px - s * 1.6, py - s * 1.6, s * 3.2, s * 3.2); }
      }
      // cable que baja del techo al rack
      if (r.z0 < ZF - 1) {
        const top = P(X - 0.25 * r.side, CEIL + 0.12, r.z0 + 0.4), bot = P(X - 0.05 * r.side, RACK_TOP, r.z0 + 0.4);
        ctx.strokeStyle = 'rgba(77,163,255,0.16)'; ctx.lineWidth = Math.max(1, 2 / r.z0);
        ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.quadraticCurveTo(top[0], bot[1], bot[0], bot[1]); ctx.stroke();
      }
    }

    // niebla para dar profundidad
    const fog = ctx.createRadialGradient(vx, vy, 0, vx, vy, Math.max(w, h) * 0.18);
    fog.addColorStop(0, 'rgba(7,10,20,0.85)'); fog.addColorStop(1, 'rgba(7,10,20,0)');
    ctx.fillStyle = fog; ctx.fillRect(0, 0, w, h);

    if (!reduceMotion) raf = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', () => { resize(); if (reduceMotion) draw(performance.now()); });
  window.addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });

  if (reduceMotion) { draw(performance.now()); return; }
  new IntersectionObserver(([e]) => {
    cancelAnimationFrame(raf);
    if (e.isIntersecting) raf = requestAnimationFrame(draw);
  }).observe(canvas);
})();

/* ---------- Switches de 24 puertos RJ45 con cables de red ---------- */
(function switches() {
  const CABLE = ['#4da3ff', '#34e0a1', '#a78bfa', '#fbbf5a', '#4da3ff', '#e5e7eb'];
  document.querySelectorAll('.switch__ports').forEach((wrap, si) => {
    const n = +wrap.dataset.ports || 24;
    let html = '';
    for (let i = 0; i < n; i++) {
      const patched = Math.random() < 0.72;
      const color = CABLE[(i + si * 3) % CABLE.length];
      const drop = 26 + Math.round(Math.random() * 34);
      const speed = (0.18 + Math.random() * 0.9).toFixed(2);
      const delay = (-Math.random() * 2).toFixed(2);
      html += `<span class="port${patched ? ' port--patched' : ''}" style="--c:${color};--drop:${drop}px;--spd:${speed}s;--dl:${delay}s">` +
        `<i class="port__led port__led--link"></i><i class="port__led port__led--act"></i>` +
        `<b class="port__jack"></b>${patched ? '<b class="port__boot"></b><b class="port__cable"></b>' : ''}` +
        `<em class="port__n">${i + 1}</em></span>`;
    }
    wrap.innerHTML = html;
  });
})();

/* ---------- Entrada: arranque del servidor y puertas del rack ---------- */
(function boot() {
  const el = document.getElementById('boot');
  if (!el) return;
  let seen = false;
  try { seen = sessionStorage.getItem('bg-boot') === '1'; } catch (e) {}
  if (reduceMotion || seen) { el.remove(); return; }
  try { sessionStorage.setItem('bg-boot', '1'); } catch (e) {}
  document.documentElement.classList.add('is-booting');
  const log = el.querySelector('.boot__log');
  const lines = [
    ['ok', 'Encendiendo rack A-01'],
    ['ok', 'Switch BG-SW24: 24 puertos RJ45 · 1 Gbps'],
    ['ok', 'Enlace eth0 activo · full-duplex'],
    ['ok', 'Montando bases de datos: SQL Server · PostgreSQL'],
    ['ok', 'API REST escuchando en :443'],
    ['go', 'Bienvenido al data center de Brian'],
  ];
  let i = 0, done = false;
  const finish = () => {
    if (done) return; done = true;
    el.classList.add('is-open');
    document.documentElement.classList.remove('is-booting');
    setTimeout(() => el.remove(), 1100);
  };
  const next = () => {
    if (done) return;
    if (i >= lines.length) { setTimeout(finish, 380); return; }
    const [k, text] = lines[i++];
    const li = document.createElement('li');
    li.innerHTML = k === 'go' ? `<span class="go">&gt;</span> ${text}` : `<span class="ok">[ OK ]</span> ${text}`;
    log.appendChild(li);
    setTimeout(next, k === 'go' ? 420 : 230);
  };
  el.querySelector('.boot__skip').addEventListener('click', finish);
  document.addEventListener('keydown', finish, { once: true });
  setTimeout(next, 250);
  setTimeout(finish, 4500); // nunca bloquea más de 4.5 s
})();

/* ---------- Terminal que escribe la respuesta de /api/me ---------- */
(function terminal() {
  const el = document.querySelector('#terminal code');
  if (!el) return;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const lines = [
    ['ps', '$ '], ['cmd', 'curl -s https://brianguzman.vercel.app/api/me\n'],
    ['meta', 'HTTP/1.1 200 OK · content-type: application/json\n\n'],
    ['p', '{\n'],
    ['k', '  "nombre"'], ['p', ': '], ['s', '"Brian Guzmán Mañón"'], ['p', ',\n'],
    ['k', '  "rol"'], ['p', ': '], ['s', '"Junior Backend Developer"'], ['p', ',\n'],
    ['k', '  "trabajo"'], ['p', ': '], ['s', '"Fraud Analyst Jr. @ MIO"'], ['p', ',\n'],
    ['k', '  "estudios"'], ['p', ': '], ['s', '"Desarrollo de Software @ ITLA"'], ['p', ',\n'],
    ['k', '  "stack"'], ['p', ': ['], ['s', '"C#"'], ['p', ', '], ['s', '"ASP.NET Core"'], ['p', ', '], ['s', '"Node.js"'], ['p', ', '], ['s', '"SQL"'], ['p', '],\n'],
    ['k', '  "construye_con"'], ['p', ': ['], ['s', '"Claude"'], ['p', ', '], ['s', '"Claude Code"'], ['p', '],\n'],
    ['k', '  "disponible"'], ['p', ': '], ['b', 'true'], ['p', '\n}\n'],
  ];
  const cls = { ps: 't-ps', cmd: 't-cmd', meta: 't-meta', k: 't-key', s: 't-str', b: 't-bool', p: '' };
  const render = (upto) => {
    let html = '', left = upto;
    for (const [type, text] of lines) {
      if (left <= 0) break;
      const part = text.slice(0, left); left -= text.length;
      html += cls[type] ? `<span class="${cls[type]}">${esc(part)}</span>` : esc(part);
    }
    el.innerHTML = html + '<span class="caret"></span>';
  };
  const total = lines.reduce((n, [, t]) => n + t.length, 0);
  if (reduceMotion) { render(total); return; }
  render(0);
  let started = false;
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting || started) return;
    started = true; obs.disconnect();
    let i = 0;
    const tick = () => {
      i += i < 50 ? 1 : 3;          // el comando se "teclea" y la respuesta llega más rápido
      render(i);
      if (i < total) setTimeout(tick, i < 50 ? 38 : 12);
    };
    tick();
  }, { threshold: 0.4 }).observe(el);
})();

/* ---------- Contadores ---------- */
(function counters() {
  const nums = document.querySelectorAll('[data-count]');
  const run = (el) => {
    const target = +el.dataset.count;
    if (reduceMotion) { el.textContent = target; return; }
    const start = performance.now(), dur = 900;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(target * t);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(() => { el.textContent = target; }, dur + 400);
  };
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
  }));
  nums.forEach((n) => io.observe(n));
})();

/* ---------- Aparición de secciones ---------- */
const sections = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reduceMotion) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
  }), { threshold: 0.06 });
  sections.forEach((s) => io.observe(s));
} else {
  sections.forEach((s) => s.classList.add('is-visible'));
}

document.getElementById('year').textContent = new Date().getFullYear();
