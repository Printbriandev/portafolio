/* script.js · navegación, apariciones, pausa de animaciones, traza lateral, /api/me y año.
   Cada módulo es independiente: si uno falla, los demás siguen y el contenido se ve igual. */
(() => {
  'use strict';
  const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const mod = (name, fn) => { try { fn(); } catch (e) { try { console.warn('[' + name + ']', e); } catch (_) { /* nada */ } } };

  /* ---------- menú, logo / "Volver arriba", sección actual y estado del header ---------- */
  mod('nav', () => {
    const hdr = document.querySelector('.hdr');
    const toggle = hdr.querySelector('.hdr__toggle');
    const menu = document.getElementById('menu');
    const outside = [document.getElementById('main'), document.querySelector('.ftr')].filter(Boolean);
    let open = false;
    const onKey = (e) => { if (e.key === 'Escape') setMenu(false, true); };
    function setMenu(v, focusBack) {
      if (open === v) return;
      open = v;
      toggle.setAttribute('aria-expanded', String(v));
      toggle.setAttribute('aria-label', v ? 'Cerrar menú' : 'Abrir menú');
      menu.classList.toggle('is-open', v);
      if (v) menu.scrollTop = 0;
      hdr.classList.toggle('is-open', v);
      outside.forEach((el) => { el.inert = v; });
      if (v) document.addEventListener('keydown', onKey); else document.removeEventListener('keydown', onKey);
      if (!v && focusBack) toggle.focus();
    }
    toggle.addEventListener('click', () => setMenu(!open, true));
    menu.addEventListener('click', (e) => {
      if (!open) return;
      if (e.target.closest('a')) setMenu(false, false);
      else if (e.target === menu) setMenu(false, true);
    });
    const wide = matchMedia('(min-width: 900px)');
    const onWide = () => { if (wide.matches) setMenu(false, false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide); else wide.addListener(onWide);

    document.querySelectorAll('a[href="#top"]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      setMenu(false, false);
      window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    }));

    if (!('IntersectionObserver' in window)) return;
    const sentinel = document.querySelector('.sentinel');
    if (sentinel) new IntersectionObserver(([e]) => hdr.classList.toggle('is-scrolled', !e.isIntersecting)).observe(sentinel);

    const links = [...menu.querySelectorAll('a[href^="#"]')];
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      const a = byId.get(en.target.id);
      if (!a) return;
      if (en.isIntersecting) { links.forEach((l) => l.removeAttribute('aria-current')); a.setAttribute('aria-current', 'true'); }
      else a.removeAttribute('aria-current');
    }), { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((a, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  });

  /* ---------- aparición de secciones (se anima el contenedor interno, nunca la sección) ---------- */
  mod('reveal', () => {
    const els = [...document.querySelectorAll('.reveal')];
    if (RM || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
    const vh = innerHeight;
    els.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < vh * 0.85 && r.bottom > 0) el.classList.add('is-in'); });
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -15% 0px' });
    els.forEach((el) => { if (!el.classList.contains('is-in')) io.observe(el); });
    document.documentElement.classList.add('rv');
    addEventListener('beforeprint', () => {
      els.forEach((el) => el.classList.add('is-in'));
      document.querySelectorAll('img[loading="lazy"]').forEach((im) => { im.loading = 'eager'; });
    });
  });

  /* ---------- registro de la visita: la hora real de cada salto en su etiqueta y en el monitor de Experiencia ----------
     Es la traza de esta visita tal como la ve el navegador. No se guarda ni se envía nada. */
  mod('visita', () => {
    if (!('IntersectionObserver' in window)) return;
    const secs = [...document.querySelectorAll('.sec[data-hop]')];
    const box = document.querySelector('.visit'), list = box && box.querySelector('.visit__log');
    const two = (n) => String(n).padStart(2, '0');
    const hms = (d) => `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
    const since = (ms) => {
      const s = Math.max(0, ms) / 1000;
      if (s < 10) return '+' + s.toFixed(1).replace('.', ',') + ' s';
      return s < 60 ? '+' + Math.round(s) + ' s' : '+' + Math.round(s / 60) + ' min';
    };
    const add = (cells) => {
      if (!list) return;
      const cur = list.querySelector('.cur'); if (cur) cur.classList.remove('cur');
      const li = document.createElement('li');
      cells.forEach(([k, t], i) => {
        if (i) li.appendChild(document.createTextNode('  '));
        const s = li.appendChild(document.createElement('span'));
        if (k) s.className = k;
        s.textContent = t;
      });
      li.className = 'cur';
      list.appendChild(li);
    };
    let prev = performance.timeOrigin || (Date.now() - performance.now());
    add([['t', hms(new Date(prev))], ['m', 'GET'], ['', '/'.padEnd(13)], ['s', '200'], ['d', 'inicio']]);
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      const now = Date.now(), d = new Date(now), hop = en.target.querySelector('.hop');
      if (hop && !hop.querySelector('.hop__t')) { const t = hop.appendChild(document.createElement('span')); t.className = 'hop__t'; t.textContent = hms(d); }
      add([['t', hms(d)], ['m', 'GET'], ['', ('/#' + en.target.id).padEnd(13)], ['s', '200'], ['d', since(now - prev)]]);
      prev = now;
      if (en.target.id === 'contacto') add([['ok', '→ 200 OK · respuesta entregada']]);
    }), { rootMargin: '0px 0px -25% 0px' });
    secs.forEach((s) => io.observe(s));
    if (box) { box.hidden = false; box.parentElement.classList.add('is-on'); }
  });

  /* ---------- «Pausar animaciones»: html.anim-off congela todos los bucles; escena.js escucha 'anim-pausa' ---------- */
  mod('pausa', () => {
    const btn = document.querySelector('.scene-toggle');
    if (!btn || RM) return; // con movimiento reducido no hay bucles que pausar
    const root = document.documentElement, label = btn.querySelector('.scene-toggle__t');
    let off = root.classList.contains('anim-off');
    const paint = () => {
      root.classList.toggle('anim-off', off);
      label.textContent = off ? 'Reanudar animaciones' : 'Pausar animaciones';
      btn.classList.toggle('is-off', off);
    };
    btn.addEventListener('click', () => {
      off = !off;
      try { localStorage.setItem('escena-pausada', off ? '1' : '0'); } catch (_) { /* sin almacenamiento */ }
      paint();
      document.dispatchEvent(new Event('anim-pausa'));
    });
    paint();
    btn.hidden = false;
  });

  /* ---------- animaciones de una sola vez y pausa fuera de pantalla ---------- */
  mod('once', () => {
    const items = [[document.querySelector('.chain-wrap'), 'is-run'], [document.querySelector('.log__e--scan'), 'is-scan']];
    items.forEach(([el, cls]) => {
      if (!el) return;
      if (RM || !('IntersectionObserver' in window)) { el.classList.add(cls); return; }
      const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { el.classList.add(cls); io.disconnect(); } }, { threshold: 0.5 });
      io.observe(el);
    });
    if (!('IntersectionObserver' in window)) return;
    const off = new IntersectionObserver((entries) => entries.forEach((en) => en.target.classList.toggle('is-offscreen', !en.isIntersecting)), { rootMargin: '80px 0px' });
    document.querySelectorAll('.sec, .switch').forEach((el) => off.observe(el));
  });

  /* ---------- traza lateral (≥1100 px) o línea de progreso bajo el header ---------- */
  mod('rail', () => {
    const secs = [...document.querySelectorAll('.sec[data-hop]')];
    const MQ = matchMedia('(min-width: 1100px) and (min-aspect-ratio: 4001/3000)');
    const bar = document.querySelector('.progress i');
    const rail = document.createElement('div');
    rail.className = 'rail';
    rail.setAttribute('aria-hidden', 'true');
    rail.appendChild(document.createElement('i')).className = 'rail__line';
    const nodes = secs.map((s) => {
      const n = rail.appendChild(document.createElement('span'));
      n.className = 'rail__node';
      n.appendChild(document.createElement('em')).textContent = s.dataset.hop;
      return n;
    });
    const pkt = rail.appendChild(document.createElement('i'));
    pkt.className = 'rail__pkt';
    pkt.appendChild(document.createElement('em')).textContent = '200 OK';
    document.body.appendChild(rail);

    const hero = document.querySelector('.sala');
    /* Un nodo se enciende cuando el inicio de su sección cruza la mitad de la ventana: el mismo umbral que
       marca la sección actual en el menú. Los nodos se colocan donde el paquete está en ese instante. */
    let on = MQ.matches, tops = [], max = 1, railH = 0, heroH = 0, half = 0, shown = false, ticking = false, lit = -2, okShown = false;
    function update() {
      ticking = false;
      const y = window.scrollY, p = Math.min(1, Math.max(0, y / max));
      if (on) {
        const vis = y > heroH * 0.55;
        if (vis !== shown) { shown = vis; rail.classList.toggle('is-on', vis); }
        pkt.style.transform = `translateY(${(p * railH).toFixed(1)}px)`;
        let a = -1;
        tops.forEach((t, i) => { if (y + 2 >= Math.min(Math.max(0, t - half), max)) a = i; });
        if (a !== lit) {
          lit = a;
          nodes.forEach((n, i) => { n.classList.toggle('is-lit', i <= a); n.classList.toggle('is-active', i === a); });
          if (a === nodes.length - 1 && !okShown) { okShown = true; pkt.classList.add('is-ok'); setTimeout(() => pkt.classList.remove('is-ok'), 2600); }
          else if (a !== nodes.length - 1) pkt.classList.remove('is-ok'); // al volver a subir, «200 OK» no acompaña al paquete
        }
      } else if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
    }
    function measure() {
      on = MQ.matches;
      max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      railH = rail.clientHeight;
      heroH = hero ? hero.offsetHeight : 0;
      half = innerHeight * 0.5;
      tops = secs.map((s) => s.getBoundingClientRect().top + window.scrollY);
      nodes.forEach((n, i) => {
        const top = railH * Math.min(1, Math.max(0, tops[i] - half) / max);
        n.style.top = top.toFixed(1) + 'px';
        n.classList.toggle('is-up', top + 14 + n.firstChild.offsetHeight > railH + 36); // la etiqueta vertical sube si no cabe debajo
      });
      lit = -2;
      update();
    }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    /* El alto de la ventana puede cambiar sin que cambie el body (F11, barra de descargas, DevTools). */
    let mTick = false;
    const remeasure = () => { if (!mTick) { mTick = true; requestAnimationFrame(() => { mTick = false; measure(); }); } };
    if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.body);
    addEventListener('resize', remeasure, { passive: true });
    if (MQ.addEventListener) MQ.addEventListener('change', measure); else MQ.addListener(measure);
    measure();
  });

  /* ---------- GET /api/me: al abrir la ficha se pide el JSON real y se mide en el navegador ---------- */
  mod('apiMe', () => {
    const det = document.querySelector('details.api');
    if (!det) return;
    const base = location.origin + location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
    const apiUrl = location.hostname.endsWith('vercel.app') ? `${location.origin}/api/me` : `${base}/me.json`;
    const link = det.querySelector('.api__link'), path = det.querySelector('.api__path');
    if (link) link.href = apiUrl;
    if (path) path.textContent = 'GET ' + new URL(apiUrl).pathname;
    const code = det.querySelector('.api__code'), ms = det.querySelector('[data-ms]'), status = det.querySelector('.api__status');
    let asked = false;
    det.addEventListener('toggle', () => {
      if (!det.open || asked || !window.fetch) return;
      asked = true;
      const t0 = performance.now();
      fetch(apiUrl, { cache: 'no-store' })
        .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then((data) => { code.textContent = JSON.stringify(data, null, 2); ms.textContent = String(Math.max(1, Math.round(performance.now() - t0))); })
        .catch(() => { status.textContent = 'Sin conexión: mostrando la copia local'; });
    });
  });

  /* ---------- año del footer ---------- */
  mod('year', () => { const y = document.getElementById('year'); if (y) y.textContent = String(new Date().getFullYear()); });
})();
