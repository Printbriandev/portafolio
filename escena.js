/* escena.js · Escena del inicio.
   La foto (generada con IA) es fija. Encima, en el mismo espacio de píxeles de la foto (2752×1536),
   se montan pantallas con código de ejemplo que se escribe en vivo, LEDs de rack y luz de pantalla.
   Una «lupa» repite a tamaño legible la pantalla donde escribe la persona con capucha.
   Todo el código y los datos que aparecen son ficticios. Si algo falla, .stage se vacía y queda la foto. */
(() => {
  'use strict';
  const sala = document.querySelector('.sala');
  const stage = sala && sala.querySelector('.stage');
  if (!stage || !window.matchMedia || !window.requestAnimationFrame) return;
  let raf = 0, dead = false;
  const fail = (e) => {
    dead = true; cancelAnimationFrame(raf);
    try {
      stage.textContent = ''; stage.removeAttribute('style');
      sala.classList.remove('is-live', 'is-paused'); sala.classList.add('sin-escena');
      const ly = sala.querySelector('.lupa-layer'); if (ly) ly.remove();
    } catch (_) { /* nada */ }
    try { console.warn('[escena]', e); } catch (_) { /* nada */ }
  };
  /* Se monta después del primer pintado: el texto del inicio nunca espera a la escena. */
  requestAnimationFrame(() => setTimeout(() => { try { boot(); } catch (e) { fail(e); } }, 0));

  function boot() {
    const MQ_BAND = '(max-width: 899px), (max-aspect-ratio: 4/3)';
    const FRAME = { desk: { x: 0, y: 0, w: 2752, h: 1536 }, band: { x: 1150, y: 460, w: 1560, h: 1000 } };
    const mq = matchMedia(MQ_BAND);
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const NAV = navigator, CONN = NAV.connection;
    const LOW = !!(CONN && CONN.saveData) || ((NAV.hardwareConcurrency || 8) <= 4 && (NAV.deviceMemory || 8) <= 4);
    const DBG = /[?&]calibrar\b/.test(location.search);
    const cam = sala.querySelector('.scene__cam'), img = sala.querySelector('.scene__img');
    const copy = sala.querySelector('.sala__copy');
    const doc = document;
    let band = mq.matches;

    /* ---------- utilidades ---------- */
    const R = Math.random, rnd = (a, b) => a + R() * (b - a), pick = (a) => a[(R() * a.length) | 0];
    const gauss = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const keyDelay = () => Math.min(260, Math.max(35, 85 * Math.exp(0.42 * gauss())));
    const hex = (n) => { let s = ''; while (s.length < n) s += ((R() * 16) | 0).toString(16); return s; };
    const two = (n) => String(n).padStart(2, '0');
    const hms = (d) => two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds());
    const el = (tag, cls, parent) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; };

    /* ---------- resaltado: se tokeniza una sola vez, nunca con reemplazos sobre HTML ---------- */
    const KW = {
      cs: 'public private sealed class string var if return null new async await is not void int bool true false static',
      js: 'const let var async await return if else new true false null function',
      sql: 'SELECT TOP FROM WHERE AND OR GROUP BY HAVING ORDER DESC AS',
      py: 'def if not raise return import from class None True False and or in for',
      sh: ''
    };
    for (const k in KW) KW[k] = new Set(KW[k].split(' '));
    const CM = { cs: '//', js: '//', sql: '--', py: '#', sh: '#' };
    const RX = /\s+|\$?"[^"]*"?|'[^']*'?|\d[\d.]*m?(?![\w])|[A-Za-z_À-ſ][\wÀ-ſ]*|[\s\S]/y;
    const ID0 = /[A-Za-z_À-ſ]/;
    function lex(src, lang) {
      const out = [], kw = KW[lang], cm = CM[lang];
      const add = (k, t) => { const l = out[out.length - 1]; if (l && l[0] === k) l[1] += t; else out.push([k, t]); };
      let i = 0;
      while (i < src.length) {
        if (cm && src.startsWith(cm, i)) { add('com', src.slice(i)); break; }
        RX.lastIndex = i;
        const t = RX.exec(src)[0], c = t[0];
        let k = '';
        if (c === '"' || c === "'" || (c === '$' && t.length > 1)) k = 'str';
        else if (c >= '0' && c <= '9') k = 'num';
        else if (ID0.test(c)) {
          const nx = src[i + t.length], pv = src[i - 1];
          if (kw.has(t)) k = 'kw';
          else if (pv === '.') k = nx === '(' ? 'fn' : '';
          else if (lang !== 'sql' && lang !== 'sh' && c >= 'A' && c <= 'Z') k = 'ty';
          else if (nx === '(') k = 'fn';
        }
        add(k, t); i += t.length;
      }
      return out;
    }
    function lexSh(line) {
      if (!line.startsWith('$ ')) return [['', line]];
      const r = line.slice(2), sp = r.indexOf(' ');
      return [['pr', '$ '], ['fn', sp < 0 ? r : r.slice(0, sp)]].concat(sp < 0 ? [] : lex(r.slice(sp), 'sh'));
    }
    function lexDiff(line) {
      const c = line[0], k = c === '+' ? 'add' : c === '-' ? 'del' : '';
      const t = [[k || 'dim', c]].concat(lex(line.slice(1), 'py'));
      if (k) t.c = k;
      return t;
    }
    const lines = (lang, src) => src.split('\n').map((l) => lang === 'diff' ? lexDiff(l) : lang === 'sh' ? lexSh(l) : lex(l, lang));

    /* ---------- fragmentos de ejemplo (estilo de sus proyectos públicos, datos ficticios) ---------- */
    const S = {
      s1: { tab: 'ReglaVelocidad.cs', l: lines('cs', `// Ejemplo · datos ficticios
public sealed class ReglaVelocidad : IRegla
{
    public string Nombre => "velocidad";

    public Alerta? Evaluar(Transaccion tx,
        IHistorial historial)
    {
        var intentos = historial.Contar(
            tx.TarjetaHash,
            TimeSpan.FromMinutes(10));

        if (intentos < 5
            || tx.Monto < 250m)
            return null;

        return Alerta.Revisar(tx.Id, Nombre,
            $"{intentos} intentos en 10 min");
    }
}`) },
      s2a: { tab: 'PagosEndpoints.cs', l: lines('cs', `app.MapPost("/api/pagos", async (PagoDto dto,
    AppDbContext db, IMotorReglas reglas) =>
{
    if (dto.Monto <= 0)
        return Results.BadRequest("Monto inválido");

    var alerta = await reglas.EvaluarAsync(dto);
    if (alerta is not null)
        return Results.Accepted(
            $"/api/revisiones/{alerta.Id}");

    db.Pagos.Add(dto.ToEntity());
    await db.SaveChangesAsync();
    return Results.Created($"/api/pagos/{dto.Id}", dto);
});`) },
      s2b: { tab: 'OrdenesController.cs', l: lines('cs', `[ApiController, Route("api/ordenes")]
public class OrdenesController(TallerDbContext db)
    : ControllerBase
{
    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrdenDto>>
        Obtener(int id)
    {
        var orden = await db.Ordenes.AsNoTracking()
            .Where(o => o.Id == id)
            .Select(o => new OrdenDto(
                o.Id, o.Vehiculo.Placa, o.Estado))
            .FirstOrDefaultAsync();

        return orden is null ? NotFound() : Ok(orden);
    }
}`) },
      s3: { l: lines('cs', `[Fact]
public void Revisa_5_intentos()
{
  var historial =
    HistorialFalso.Con(5);
  var tx = new Transaccion(
    "tx-demo", 900m);

  var alerta = new ReglaVelocidad()
    .Evaluar(tx, historial);

  Assert.NotNull(alerta);
}
`) },
      s4: { tab: 'reservas.routes.js', l: lines('js', `// reservas.routes.js · ejemplo
const limite = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20 });

router.post("/reservas", limite,
  validar(esquemaReserva), async (req, res) => {
    const { data, error } = await supabase
      .from("reservas").insert(req.body)
      .select().single();
    if (error) return res.status(400)
      .json({ error: "No se pudo guardar" });
    await avisarAlEstudio(data); // WhatsApp + correo
    res.status(201).json(data);
  });`) },
      s5: { tab: 'consulta.sql', l: lines('sql', `-- ejemplo · datos ficticios
SELECT TOP (5) comercio_id,
       COUNT(*)   AS intentos,
       SUM(monto) AS total
FROM dbo.Transacciones
WHERE creada_en >= DATEADD(HOUR, -1,
        SYSUTCDATETIME())
  AND estado = 'rechazada'
GROUP BY comercio_id
HAVING COUNT(*) >= 5
ORDER BY intentos DESC;`) },
      s7: { l: lines('diff', `@@ routers/citas.py
 @router.post("/citas")
 def crear_cita(cita, db):
+    if not hay_disponibilidad(
+            db, cita.profesional_id,
+            cita.inicio):
+        raise HTTPException(
+            409, "Horario no disponible")
     nueva = Cita(**cita.model_dump())
     db.add(nueva)
     db.commit()
     return nueva
 `) }
    };
    S.s7.l[0] = [['rev', '@@ routers/citas.py']];
    const RES5 = [[], [['dim', 'comercio  intentos  total']], [['', 'CM-0193   12   '], ['num', 'RD$ 18,400']],
      [['', 'CM-0457    9   '], ['num', 'RD$ 7,950']], [['', 'CM-0021    6   '], ['num', 'RD$ 3,100']], [['dim', '(3 filas · ficticio)']]];
    const PYTEST = [lexSh('$ pytest -q'), [['', '........']], [['ok', '[100%]']], [['ok', '8 superadas']]];
    const GIT_SEED = [
      [['', '* '], ['num', '9c1e2f4'], ['', ' '], ['rev dv', '(develop) '], ['', 'feat: validar horario']],
      [['', '| * '], ['num', '41ab7d0'], ['', ' '], ['rev', '(qa)'], ['', ' fix: zona horaria']],
      [['', '|/']],
      [['', '* '], ['num', '7d03c55'], ['', ' '], ['rev', '(main)'], ['', ' chore: preparar versión']],
      [['', '* '], ['num', '3b8a1c9'], ['', ' feat: agenda de citas']]
    ];
    /* [peso, ruta, estado, color, solo tras «npm run dev», nota que solo cabe en la lupa] */
    const LOGT = [[4, 'POST /api/pagos', '201', 'ok', 0, ''], [3, 'GET /api/citas', '200', 'ok', 0, ''], [2, 'POST /api/pagos', '202', 'rev', 0, 'revisión'],
      [2, 'GET /api/galeria?estilo=fineline', '200', 'ok', 1, ''], [1, 'POST /api/opiniones', '201', 'ok', 1, 'pendiente de moderación'],
      [1, 'POST /api/reservas', '429', 'warn', 1, 'límite alcanzado']];
    const AMT = ['   320', '   780', ' 1,450', ' 2,300', ' 6,150', ' 8,900', '12,400'];

    /* ---------- pantallas: cuadriláteros medidos sobre la foto maestra (px) ---------- */
    const DEF = [
      { id: 'a-editor', g: 0, q: [[2060, 736], [2276, 736], [2275, 876], [2058, 876]], bg: '#1f2e3c', fs: 14, lh: 20, gut: 1 },
      { id: 'a-term', g: 0, q: [[2058, 881], [2302, 881], [2301, 931], [2057, 931]], bg: '#1f2f3c', fs: 13, lh: 18, wrap: 1, keep: 12 },
      { id: 'b-code', g: 1, q: [[2326, 740], [2438, 740], [2437, 848], [2325, 848]], bg: '#08121c', fs: 12, lh: 17 },
      { id: 'b-demo', g: 1, q: [[2443, 740], [2578, 740], [2577, 872], [2443, 866]], bg: '#0b1520', fs: 12, lh: 17, head: 2 },
      { id: 'b-logs', g: 1, q: [[2322, 856], [2433, 858], [2432, 972], [2321, 966]], bg: '#0c1624', fs: 12, lh: 17,
        clip: [[2322, 856], [2433, 858], [2432, 972], [2352, 970], [2349, 952], [2321, 950]] },
      { id: 'b-sql', g: 1, q: [[2440, 880], [2576, 880], [2574, 1016], [2440, 994]], bg: '#0d1522', fs: 12, lh: 17 },
      { id: 'lap', g: 2, q: [[2147, 953], [2342, 962], [2306, 1098], [2114, 1074]], bg: '#0d1d31', fs: 14, lh: 20, gut: 1, tab: 1,
        clip: [[2147, 953], [2342, 962], [2306, 1098], [2185, 1083], [2180, 1072], [2114, 1066]] },
      { id: 'l3', g: 3, q: [[1646, 722], [1735, 722], [1735, 885], [1646, 885]], bg: '#2a3c4a', fs: 12, lh: 17,
        clip: [[1646, 722], [1735, 722], [1735, 798], [1712, 833], [1686, 857], [1662, 879], [1646, 885]] },
      { id: 'l2', g: 3, q: [[1384, 721], [1475, 721], [1475, 840], [1384, 840]], bg: '#111e2a', fs: 12, lh: 17,
        clip: [[1384, 721], [1475, 721], [1475, 779], [1452, 798], [1420, 815], [1395, 831], [1384, 837]] },
      { id: 'l1', g: 3, q: [[1271, 722], [1323, 722], [1323, 798], [1271, 798]], bg: '#1c2c39', fs: 12, lh: 17 },
      { id: 'lap2', g: 3, q: [[1247, 858], [1306, 858], [1303, 922], [1245, 920]], bg: '#0a1927', fs: 12, lh: 17, wrap: 1 }
    ];
    /* En equipos modestos (LOW) solo siguen vivas estas pantallas; incluyen el portátil de cada persona que escribe. */
    const LIVE_LOW = new Set(['lap', 'a-term', 'a-editor', 'b-demo', 'b-logs', 'lap2']);
    /* LEDs: máximos locales turquesa de los racks [x, y, encendido(1)/apagado(0), visible en el recorte móvil] */
    const LEDS = [[2016,458,1,0],[2200,446,0,0],[1906,475,1,1],[2279,417,0,0],[1960,480,1,1],[1772,506,0,1],[1773,567,1,1],[1961,628,0,1],[1656,633,1,1],[1773,638,0,1],[1640,580,1,1],[2018,637,0,1],[1732,640,1,1],[1907,606,0,1],[1792,336,1,0],[1814,500,0,1],[1792,425,1,0],[1623,528,0,1],[1529,649,1,1],[1528,448,0,0],[1932,370,1,0],[2239,456,0,0],[2163,466,1,1],[1421,647,0,1],[2014,266,1,0],[1750,399,0,0],[1528,406,1,0],[1655,441,0,0],[2016,351,1,0],[2162,423,0,0],[1400,569,1,1],[2238,410,0,0],[1489,652,1,1],[1731,490,0,1],[1322,668,1,1],[1514,594,0,1],[1528,532,1,1],[1345,610,0,1],[1338,561,1,1],[1608,645,0,1],[1410,493,1,1],[1906,402,0,0],[1321,512,1,1],[2017,597,0,1],[1962,292,1,0],[2406,649,0,1],[1749,348,1,0],[2399,436,0,0]];

    /* Heckbert: caja local w×h → cuadrilátero TL,TR,BR,BL. Si es casi un paralelogramo, matriz 2D (menos capas). */
    function homography(w, h, q) {
      const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
      const ex = x1 + x3 - x0 - x2, ey = y1 + y3 - y0 - y2;
      if (Math.hypot(ex, ey) <= 1.5) return `matrix(${(x1 - x0) / w},${(y1 - y0) / w},${(x3 - x0) / h},${(y3 - y0) / h},${x0},${y0})`;
      const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
      const det = dx1 * dy2 - dx2 * dy1, g = (dx3 * dy2 - dx2 * dy3) / det, k = (dx1 * dy3 - dx3 * dy1) / det;
      const a = x1 - x0 + g * x1, b = x3 - x0 + k * x3, d = y1 - y0 + g * y1, e = y3 - y0 + k * y3;
      return `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${k / h},0,0,1,0,${x0},${y0},0,1)`;
    }
    const dist = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);

    /* ---------- montaje ---------- */
    const glows = el('div', 'sc-layer sc-glows', stage);
    const scrs = el('div', 'sc-layer sc-scrs', stage);
    const leds = el('div', 'sc-layer sc-leds', stage);
    const SC = {};
    for (const d of DEF) {
      const q = d.q;
      const w = 2 * Math.round((dist(q[0], q[1]) + dist(q[3], q[2])) / 2), h = 2 * Math.round((dist(q[0], q[3]) + dist(q[1], q[2])) / 2);
      const s = Object.assign({}, d, { w, h, n: 0, line: null, sc: 0, ri: 0 });
      s.el = el('div', 'scr');
      s.el.style.cssText = `width:${w}px;height:${h}px;background:${d.bg};box-shadow:0 0 2px 1px ${d.bg};font-size:${d.fs}px;line-height:${d.lh}px;--lh:${d.lh}px;--dl:${d.g * 80}ms;transform:${homography(w, h, q)}`;
      if (d.tab) s.tab = el('div', 'scr__tab', s.el);
      if (d.head) s.hd = el('div', 'scr__head', s.el);
      s.body = el('div', 'scr__body', s.el);
      s.rows = Math.floor((h - 12) / d.lh) - (d.tab ? 1 : 0) - (d.head || 0);
      s.cols = Math.floor((w - 16) / (d.fs * 0.6)) - (d.gut ? 4 : 0);
      s.live = !RM && (!LOW || LIVE_LOW.has(d.id));
      if (d.keep) { s.el.classList.add('scr--term'); s.body.style.height = s.rows * d.lh + 'px'; } // terminal: guarda historial y muestra el final
      let host = scrs;
      if (d.clip) { host = el('div', 'sc-layer ocl', scrs); host.style.clipPath = 'polygon(' + d.clip.map((p) => p[0] + 'px ' + p[1] + 'px').join(',') + ')'; }
      host.appendChild(s.el);
      SC[d.id] = s;
    }
    const AE = SC['a-editor'], AT = SC['a-term'], BC = SC['b-code'], BD = SC['b-demo'], BL = SC['b-logs'], BS = SC['b-sql'];
    const LAP = SC.lap, L3 = SC.l3, L2 = SC.l2, L1 = SC.l1, LAP2 = SC.lap2;

    function mkLine(s, toks, top) {
      const ln = doc.createElement('div');
      ln.className = toks && toks.c ? 'ln ' + toks.c : 'ln';
      if (s.gut) el('span', 'gut', ln).textContent = String(++s.n).padStart(3) + ' ';
      if (toks) for (const [k, t] of toks) { const sp = el('span', k, ln); sp.textContent = t; }
      if (top) s.body.insertBefore(ln, s.body.firstChild); else s.body.appendChild(ln);
      return ln;
    }
    const trim = (s) => { const k = s.keep || s.rows; while (s.body.childElementCount > k) s.body.firstChild.remove(); };
    /* Parte una línea de tokens en trozos de «cols» caracteres (terminales estrechos). */
    function wrapToks(toks, cols) {
      const out = []; let cur = [], n = 0;
      for (const [k, t] of toks) {
        let i = 0;
        while (i < t.length) { const take = Math.min(cols - n, t.length - i); cur.push([k, t.slice(i, i + take)]); n += take; i += take; if (n >= cols) { out.push(cur); cur = []; n = 0; } }
      }
      if (cur.length || !out.length) out.push(cur);
      return out;
    }
    const split = (s, l) => (s.wrap ? wrapToks(l, s.cols) : [l]);
    const fill = (s, ls) => { for (const l of ls) for (const p of split(s, l)) mkLine(s, p); trim(s); s.line = s.body.lastChild; };
    const setTab = (s, name) => { if (!s.tab) return; s.tab.textContent = ''; el('span', 'on', s.tab).textContent = name; el('span', 'dim', s.tab).textContent = '  ×'; };
    const demoHead = () => { el('div', 'ln', BD.hd).textContent = 'Monitor de transacciones · DEMO'; el('div', 'ln dim', BD.hd).textContent = 'datos ficticios'; };
    const demoRow = (flag) => {
      const r = [['dim', 'tx-' + hex(4) + '  '], ['', 'RD$ ' + pick(AMT) + '  ' + pick(['web', 'app', 'pos']) + '  '], flag ? ['warn', 'REVISAR'] : ['ok', 'OK']];
      if (flag) r.c = 'flag';
      return r;
    };
    let logsNode = false;
    const logRow = (d) => {
      const pool = LOGT.filter((t) => !t[4] || logsNode);
      let w = pool.reduce((a, t) => a + t[0], 0) * R();
      const t = pool.find((x) => (w -= x[0]) < 0) || pool[0], tm = hms(d || new Date());
      let route = t[1];
      if (tm.length + route.length + t[2].length + 2 > BL.cols) route = route.replace('/api/', '/').replace(/\?.*$/, '');
      const r = [['dim', tm + ' '], ['', route + ' '], [t[3], t[2]]];
      r.full = [['dim', tm + '  '], ['', t[1] + '  '], [t[3], t[2] + (t[5] ? ' · ' + t[5] : '')]];
      return r;
    };
    const pastLogs = (n) => { const ts = []; let t = Date.now(); for (let i = 0; i < n; i++) { t -= rnd(1200, 2400); ts.unshift(t); } return ts.map((x) => logRow(new Date(x))); };
    const cycle = (src, from, n) => { const o = []; for (let i = 0; i < n; i++) o.push(src[(from + i) % src.length]); return o; };

    /* Contenido inicial: en vivo se llena 40-70 %; estático (movimiento reducido o pantalla en pausa) se ve completo. */
    LAP.pre = Math.round(S.s1.l.length * 0.7);
    demoHead();
    const live = (s) => s.live;
    setTab(LAP, S.s1.tab); fill(LAP, S.s1.l.slice(0, LAP.pre)); // también el cuadro fijo: a mitad del archivo, en la regla
    fill(AE, live(AE) ? S.s2b.l.slice(0, Math.round(S.s2b.l.length * 0.6)) : S.s2a.l);
    fill(AT, live(AT) ? [lexSh('$ dotnet build'), [['', 'Compilación correcta.']], [['pr', '$ ']]] : [lexSh('$ dotnet test'), [['', 'Compilación correcta.']], [['ok', 'Superado ✓'], ['', '  ReglaVelocidadTests']]]);
    AT.prompt = live(AT);
    fill(BC, cycle(S.s3.l, 0, BC.rows)); BC.ri = BC.rows;
    for (let i = 0; i < (live(BD) ? 6 : BD.rows); i++) mkLine(BD, demoRow(!live(BD) && i % 4 === 2));
    const pl = pastLogs(live(BL) ? 6 : BL.rows);
    fill(BL, pl); BL.lastFull = pl[pl.length - 1].full;
    fill(BS, live(BS) ? S.s5.l.slice(0, 6) : S.s5.l);
    while (S.s7.l.length < L3.rows + 2) S.s7.l.push([['', ' ']]);
    fill(L3, S.s7.l.slice(0, L3.rows)); L3.ri = L3.rows;
    fill(L2, GIT_SEED);
    fill(L1, PYTEST);
    fill(LAP2, live(LAP2) ? [lexSh('$ git pull'), [['', 'Actualizado.']], [['pr', '$ ']]] : lines('sh', '$ git add .\n$ git commit -m "feat: validar horario disponible"\n$ git push'));
    LAP2.prompt = live(LAP2);
    LAP.title = S.s1.tab; AE.title = live(AE) ? S.s2b.tab : S.s2a.tab; AT.title = 'terminal'; BS.title = S.s5.tab;

    /* ---------- lupa: copia ampliada y legible de la pantalla donde escribe quien lleva capucha ----------
       Decorativa (aria-hidden). Clona las últimas líneas de esa pantalla cada vez que cambian; un visor de
       cuatro esquinas la marca en la foto y, en escritorio, una línea fina une visor y tarjeta. */
    const sceneEl = sala.querySelector('.scene');
    const ly = el('div', 'lupa-layer');
    ly.setAttribute('aria-hidden', 'true');
    sceneEl.insertBefore(ly, sceneEl.querySelector('.scene__tag'));
    const LU = { el: el('div', 'lupa', ly), rows: 0, src: null, first: null, n: -1, x: 0, y: 0, w: 0, h: 0, cw: 0, inner: 0, sx: 0 };
    const lhd = el('div', 'lupa__hd', LU.el);
    el('i', 'lupa__led', lhd); el('span', 'lupa__live', lhd); // «en vivo», «en pausa» o «cuadro fijo» (lo pone el CSS)
    LU.name = el('span', 'lupa__name', lhd);
    LU.note = el('span', 'lupa__note', lhd);
    LU.note.textContent = 'ejemplo · datos ficticios';
    LU.body = el('div', 'lupa__body', LU.el);
    const lft = el('div', 'lupa__ft', LU.el);
    el('span', 'lupa__k', lft).textContent = 'registro';
    LU.log = el('span', 'lupa__log', lft);
    LU.line = el('i', 'lupa__line', ly);
    const VF = el('div', 'sc-layer vf', stage), VFC = [0, 1, 2, 3].map((i) => el('i', 'vf__c vf__c--' + i, VF));
    function setLog(toks) { if (!toks) return; LU.log.textContent = ''; for (const [k, t] of toks) el('span', k, LU.log).textContent = t; }
    setLog(BL.lastFull);
    function luRender(full) {
      const s = LU.src; if (!s || !LU.rows) return;
      const kids = s.body.children, n = kids.length, from = Math.max(0, n - LU.rows), first = kids[from] || null;
      if (full || first !== LU.first || n !== LU.n || !LU.body.lastChild) {
        const fr = doc.createDocumentFragment();
        for (let i = from; i < n; i++) fr.appendChild(kids[i].cloneNode(true));
        LU.body.textContent = ''; LU.body.appendChild(fr); LU.first = first; LU.n = n;
      } else if (n) LU.body.replaceChild(kids[n - 1].cloneNode(true), LU.body.lastChild);
      follow();
    }
    /* Desplazamiento horizontal, como en un editor: si la línea que se escribe (la del cursor) ya no cabe,
       todo el código se corre a la izquierda para que el cursor siga a la vista; el número de línea queda fijo. */
    function follow() {
      const last = LU.body.lastChild;
      let sx = 0;
      if (last && LU.cw && last.querySelector('.caret')) {
        const g = LU.src && LU.src.gut ? 4 : 0, cols = Math.floor(LU.inner / LU.cw) - g;
        const len = last.textContent.length - g + 1;
        if (len > cols - 1) sx = len - cols + 3;
      }
      if (sx !== LU.sx) { LU.sx = sx; LU.body.style.setProperty('--sx', String(sx)); }
    }
    const MO = window.MutationObserver ? new MutationObserver(() => { try { luRender(false); } catch (e) { fail(e); } }) : null;
    function mirror(s) {
      if (MO) MO.disconnect();
      LU.src = s; LU.name.textContent = s.title || '';
      luRender(true);
      if (MO) MO.observe(s.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
      aim(true);
    }
    /* Visor sobre la pantalla (espacio de la foto) y línea desde la tarjeta (espacio de la escena). */
    let FIT = null, camDX = 0, camDY = 0;
    const vfBox = (s) => { const xs = s.q.map((p) => p[0]), ys = s.q.map((p) => p[1]); return [Math.min(...xs) - 10, Math.min(...ys) - 10, Math.max(...xs) + 10, Math.max(...ys) + 10]; };
    function aim(move) {
      const s = LU.src; if (!s) return;
      const [x0, y0, x1, y1] = vfBox(s), A = 26, pts = [[x0, y0], [x1 - A, y0], [x1 - A, y1 - A], [x0, y1 - A]];
      VF.classList.toggle('is-move', !!move);
      VFC.forEach((c, i) => { c.style.transform = `translate(${pts[i][0]}px,${pts[i][1]}px)`; });
      lineTo(move);
    }
    function lineTo(move) {
      const s = LU.src;
      if (!s || !FIT || band || !LU.w) { LU.line.style.visibility = 'hidden'; return; }
      const [x0, y0] = vfBox(s), W = cam.clientWidth, H = cam.clientHeight;
      const k = FINE && sala.classList.contains('sc-fx') ? 1.04 : 1; // misma escala que .scene__cam con paralaje
      const px = W / 2 + (FIT.tx + x0 * FIT.s - W / 2) * k + camDX, py = H / 2 + (FIT.ty + y0 * FIT.s - H / 2) * k + camDY;
      const ax = LU.x + LU.w - 26, ay = LU.y + LU.h, dx = px - ax, dy = py - ay;
      LU.line.classList.toggle('is-move', !!move);
      LU.line.style.visibility = '';
      LU.line.style.transform = `translate(${ax.toFixed(1)}px,${ay.toFixed(1)}px) rotate(${Math.atan2(dy, dx).toFixed(4)}rad) scaleX(${Math.hypot(dx, dy).toFixed(1)})`;
    }
    /* Tarjeta en escritorio: sobre los racks, a la derecha del texto y por encima de las cabezas.
       En la banda (móvil): una franja de una línea justo debajo del portátil, si cabe antes del texto. */
    function layoutLupa() {
      if (!FIT) return;
      const W = cam.clientWidth, H = sceneEl.clientHeight;
      ly.classList.remove('is-off'); // se mide visible: oculta (display:none) mediría 0 y la decisión oscilaría
      const lh = parseFloat(getComputedStyle(LU.body).lineHeight) || 19;
      LU.body.style.height = '0px';
      const chrome = LU.el.offsetHeight;
      let rows = 0, x = 0, y = 0, w = 0;
      if (band) {
        rows = 1; y = Math.round(FIT.ty + 1106 * FIT.s);
        if (y + chrome + lh > H - 62) rows = 0;
        LU.el.style.width = '';
      } else {
        const sb = sceneEl.getBoundingClientRect(), cb = copy.getBoundingClientRect();
        const ax = FIT.tx + 2000 * FIT.s, ay = FIT.ty + 600 * FIT.s;
        w = Math.min(460, Math.max(340, W * 0.28));
        x = Math.max(ax - w, cb.right - sb.left + 28);
        if (x + w > W - 24) w = W - 24 - x;
        rows = Math.min(10, Math.floor((ay - 84 - chrome) / lh));
        if (w < 320 || rows < 3) rows = 0; // con menos de tres líneas no se entiende el código: mejor sin tarjeta
        y = ay - chrome - rows * lh;
        LU.el.style.width = Math.round(w) + 'px';
        LU.note.textContent = w >= 420 ? 'ejemplo · datos ficticios' : 'datos ficticios'; // en tarjetas estrechas el nombre del archivo cabe entero
      }
      const bcs = getComputedStyle(LU.body);
      LU.cw = (parseFloat(bcs.fontSize) || 13) * 0.6; // JetBrains Mono: cada carácter mide 0,6 em
      LU.inner = LU.body.clientWidth - (parseFloat(bcs.paddingLeft) || 0) - (parseFloat(bcs.paddingRight) || 0);
      const off = !rows;
      ly.classList.toggle('is-off', off);
      LU.rows = rows; LU.x = band || off ? 0 : x; LU.y = y; LU.w = band || off ? 0 : w; LU.h = chrome + rows * lh;
      LU.body.style.height = rows * lh + 'px';
      LU.el.style.transform = band ? `translateY(${y}px)` : `translate(${Math.round(x)}px,${Math.round(y)}px)`;
      luRender(true);
      aim(false);
    }
    mirror(LAP);

    /* ---------- ambiente: luz de pantalla y LEDs (solo transform/opacity) ---------- */
    /* Luz de pantalla: un solo elemento con tres focos (escritorio y manos, borde de la capucha, cara). */
    const glow = el('i', 'glow', glows);
    glow.style.cssText = 'left:1440px;top:520px;width:1100px;height:800px;background:' +
      [[790, 490, 260], [400, 260, 200], [160, 280, 120]].map(([x, y, r]) => `radial-gradient(circle ${r}px at ${x}px ${y}px,rgba(120,190,255,.18),rgba(120,190,255,0))`).join(',');
    const pulseEl = el('i', 'glow glow--pulse', glows);
    pulseEl.style.cssText = 'left:2160px;top:640px;width:560px;height:560px';
    /* LEDs por grupos: cada grupo es un elemento con un punto (degradado) por LED, así hay pocas capas. */
    let burstG = null;
    function buildLeds() {
      leds.textContent = ''; burstG = null;
      if (RM) return;
      const lite = LOW || band;
      const list = lite ? LEDS.filter((l) => !band || l[3]).slice(0, 16) : LEDS;
      const near = new Set(list.map((l, i) => [dist(l, [2450, 880]), i]).filter((a) => list[a[1]][2]).sort((a, b) => a[0] - b[0]).slice(0, 6).map((a) => a[1]));
      const nOn = lite ? 2 : 4, nOff = lite ? 1 : 2, G = [];
      for (let i = 0; i < nOn; i++) G.push(['led-g', []]);
      for (let i = 0; i < nOff; i++) G.push(['led-g led-g--off', []]);
      G.push(['led-g led-g--burst', []]);
      let on = 0, off = 0;
      list.forEach((l, i) => G[near.has(i) ? G.length - 1 : l[2] ? on++ % nOn : nOn + (off++ % nOff)][1].push(l));
      for (const [cls, items] of G) {
        if (!items.length) continue;
        const xs = items.map((l) => l[0]), ys = items.map((l) => l[1]);
        const x0 = Math.min(...xs) - 6, y0 = Math.min(...ys) - 6, w = Math.max(...xs) + 6 - x0, h = Math.max(...ys) + 6 - y0;
        const g = el('i', cls, leds);
        g.style.cssText = `left:${x0}px;top:${y0}px;width:${w}px;height:${h}px;--d:${rnd(0.6, 3.4).toFixed(2)}s;--o:${(-rnd(0, 3)).toFixed(2)}s;background:` +
          items.map((l) => `radial-gradient(circle ${l[2] ? 4 : 5}px at ${l[0] - x0}px ${l[1] - y0}px,${l[2] ? '#c8fff2 0,#34e0a1 40%,rgba(52,224,161,0) 70%' : 'rgba(6,12,18,.92) 0 45%,rgba(6,12,18,0) 72%'})`).join(',');
        if (cls.includes('burst')) burstG = g;
      }
    }
    buildLeds();

    if (DBG) {
      doc.body.classList.add('dbg');
      const NS = 'http://www.w3.org/2000/svg', svg = doc.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'sc-layer dbg-svg'); svg.setAttribute('viewBox', '0 0 2752 1536');
      const poly = (pts, c) => { const p = doc.createElementNS(NS, 'polygon'); p.setAttribute('points', pts.map((x) => x.join(',')).join(' ')); p.setAttribute('fill', 'none'); p.setAttribute('stroke', c); p.setAttribute('stroke-width', '3'); svg.appendChild(p); };
      for (const d of DEF) { poly(d.q, '#ff00ff'); if (d.clip) poly(d.clip, '#00ffff'); }
      stage.appendChild(svg);
    }

    /* ---------- encaje: la misma cuenta que object-fit:cover + object-position ----------
       El recorte se decide por la foto que de verdad se muestra (currentSrc), así las pantallas
       siguen a la imagen incluso mientras el navegador cambia de fuente al redimensionar. */
    const shownBand = () => { const u = img.currentSrc || ''; return u ? /escena-movil/.test(u) : band; };
    function fit() {
      const f = shownBand() ? FRAME.band : FRAME.desk;
      const W = cam.clientWidth, H = cam.clientHeight;
      if (!W || !H) return;
      const cs = getComputedStyle(doc.documentElement);
      const fx = parseFloat(cs.getPropertyValue('--fx')) || 0, fy = parseFloat(cs.getPropertyValue('--fy')) || 0;
      const s = Math.max(W / f.w, H / f.h), tx = (W - f.w * s) * fx - f.x * s, ty = (H - f.h * s) * fy - f.y * s;
      stage.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
      FIT = { tx, ty, s };
      layoutLupa();
    }
    /* El ResizeObserver ya llama a fit() al empezar a observar: no hace falta un layout forzado aquí. */
    new ResizeObserver(() => { try { fit(); } catch (e) { fail(e); } }).observe(cam);
    img.addEventListener('load', () => { try { fit(); } catch (e) { fail(e); } });
    const onBand = () => { try { band = mq.matches; if (band) { cam.style.transform = ''; copy.style.transform = ''; camDX = camDY = 0; } setFx(); fit(); buildLeds(); } catch (e) { fail(e); } };
    if (mq.addEventListener) mq.addEventListener('change', onBand); else mq.addListener(onBand);
    function setFx() { sala.classList.toggle('sc-fx', !RM && !LOW && !band); }
    setFx();

    if (RM) { sala.classList.add('is-live'); return; } // movimiento reducido: cuadro fijo, sin bucle

    /* ---------- motor: un solo bucle rAF, reloj propio que se congela al pausar ---------- */
    let clock = 0, last = 0, running = false, fastUntil = 0, demoFlag = false;
    const timers = [];
    const later = (ms, fn) => { timers.push([clock + ms, fn]); };
    const owner = () => ({ caret: el('i', 'caret'), scr: null, tn: null, typing: false, col: 0 });
    const hoodO = owner(), beardO = owner();
    const setTyping = (o, on) => { if (o.typing !== on) { o.typing = on; o.caret.classList.toggle('is-typing', on); } };
    const newLn = (s, o) => { o.tn = null; o.col = 0; s.line = mkLine(s); trim(s); s.line.appendChild(o.caret); };
    function put(s, o, k, str) {
      if (!o.tn) { const sp = doc.createElement('span'); if (k) sp.className = k; o.tn = doc.createTextNode(str); sp.appendChild(o.tn); s.line.insertBefore(sp, o.caret); }
      else o.tn.data += str;
      o.col += str.length;
    }
    function unscroll(s) { if (!s.sc) return; s.sc = 0; s.body.style.transition = 'none'; s.body.style.transform = ''; trim(s); }
    function feed(s, toks) { // línea de máquina con desplazamiento suave (solo transform)
      unscroll(s);
      s.line = mkLine(s, toks);
      if (s.body.childElementCount > s.rows) {
        s.sc = 1; s.body.style.transition = 'transform .14s ease-out'; s.body.style.transform = `translateY(-${s.lh}px)`;
        later(150, () => unscroll(s));
      }
    }
    function burst() { if (!burstG) return; const g = burstG; g.classList.add('is-burst'); later(600, () => g.classList.remove('is-burst')); }
    function pulse() { pulseEl.classList.add('is-on'); later(120, () => pulseEl.classList.remove('is-on')); }
    function emit(ev) {
      if (ev === 'pruebas:ok') { demoFlag = true; burst(); pulse(); }
      else if (ev === 'api:arriba') fastUntil = clock + 20000;
      else if (ev === 'node:arriba') { fastUntil = clock + 20000; logsNode = true; }
      else { burst(); if (ev === 'flag') pulse(); }
    }

    /* Persona escribiendo: ritmo log-normal, pausas tras signos y saltos de línea, errores y autocompletado. */
    const NB = { a: 'sq', b: 'vn', c: 'xv', d: 'sf', e: 'wr', f: 'dg', g: 'fh', h: 'gj', i: 'uo', j: 'hk', k: 'jl', l: 'k', m: 'n', n: 'bm', o: 'ip', p: 'o', q: 'w', r: 'et', s: 'ad', t: 'ry', u: 'yi', v: 'cb', w: 'qe', x: 'zc', y: 'tu', z: 'x' };
    const isW = (c) => /[\wÀ-ſ]/.test(c);
    function* typeLine(s, o, toks) {
      let first = true;
      for (const [k, t] of toks) {
        let i = 0, wl = 0;
        o.tn = null;
        if (first) { const ind = /^\s*/.exec(t)[0]; if (ind) { put(s, o, k, ind); i = ind.length; } }
        first = false;
        if (i && i === t.length) continue;
        while (i < t.length) {
          const ch = t[i];
          if (s.wrap && o.col >= s.cols) { s.line = mkLine(s); trim(s); s.line.appendChild(o.caret); o.tn = null; o.col = 0; }
          setTyping(o, true);
          const nb = NB[ch.toLowerCase()];
          if (nb && R() < 0.015) {
            put(s, o, k, nb[(R() * nb.length) | 0]); yield rnd(150, 260);
            o.tn.data = o.tn.data.slice(0, -1); o.col--; yield keyDelay();
          }
          if (isW(ch)) {
            if (++wl === 4) {
              let e = i; while (e < t.length && isW(t[e])) e++;
              if (3 + e - i >= 6 && R() < 0.12) { put(s, o, k, t.slice(i, e)); i = e; wl = 0; yield rnd(60, 120); continue; }
            }
          } else wl = 0;
          put(s, o, k, ch); i++;
          yield keyDelay() + (/[;{}(),]/.test(ch) ? rnd(120, 300) : 0);
        }
      }
    }
    function* focus(o, s) {
      if (o.scr === s) return;
      setTyping(o, false);
      const hd = o === hoodO;
      if (hd) LU.el.classList.add('is-switch');
      yield rnd(400, 900);
      o.scr = s; o.tn = null;
      if (s.line && s.line.isConnected) s.line.appendChild(o.caret); else o.caret.remove();
      if (hd) { mirror(s); LU.el.classList.remove('is-switch'); }
      yield rnd(120, 260);
    }
    function* clearScr(s, o) {
      const m = LU.src === s;
      s.el.classList.add('is-sel'); if (m) LU.el.classList.add('is-sel'); yield 220;
      s.body.textContent = ''; s.el.classList.remove('is-sel'); LU.el.classList.remove('is-sel'); s.line = null; s.n = 0; o.tn = null;
      yield rnd(250, 450);
    }
    function* edit(s, o, sn, from) {
      if (!s.live) return;
      yield* focus(o, s);
      if (!from) {
        if (s.body.firstChild) yield* clearScr(s, o);
        if (sn.tab) { setTab(s, sn.tab); s.title = sn.tab; if (LU.src === s) LU.name.textContent = sn.tab; }
      }
      for (let li = from || 0; li < sn.l.length; li++) {
        if (li > (from || 0)) { const p = rnd(180, 520) + (R() < 0.2 ? rnd(800, 2200) : 0); if (p > 600) setTyping(o, false); yield p; }
        newLn(s, o);
        yield* typeLine(s, o, sn.l[li]);
      }
      setTyping(o, false);
      yield rnd(2500, 4000);
    }
    function* cmd(s, o, text, out, os) {
      if (!s.live) return;
      yield* focus(o, s);
      if (!s.prompt) { newLn(s, o); put(s, o, 'pr', '$ '); }
      else { s.line.appendChild(o.caret); o.tn = null; o.col = 2; }
      s.prompt = false; o.tn = null;
      yield rnd(300, 700);
      yield* typeLine(s, o, lexSh(text).slice(1));
      setTyping(o, false);
      yield rnd(250, 600);
      const dst = os && os.live ? os : s;
      for (const l of out || []) {
        if (dst === s) for (const p of split(s, l)) { s.line = mkLine(s, p); trim(s); }
        else feed(dst, l);
        yield rnd(60, 140);
      }
      newLn(s, o); put(s, o, 'pr', '$ '); s.prompt = true; o.tn = null;
      yield rnd(600, 1200);
    }
    function* paste(s, o, ls, res) {
      if (!s.live) return;
      yield* focus(o, s);
      if (s.body.firstChild) yield* clearScr(s, o);
      for (const l of ls) { s.line = mkLine(s, l); trim(s); s.line.appendChild(o.caret); yield rnd(40, 60); }
      yield rnd(700, 1200);
      for (const l of res) { s.line = mkLine(s, l); trim(s); yield rnd(60, 140); }
      yield rnd(2500, 4000);
    }
    function gitLog(msg) {
      if (!L2.live) return;
      const dv = L2.body.querySelector('.dv'); if (dv) dv.remove();
      mkLine(L2, [['', '* '], ['num', hex(7)], ['', ' '], ['rev dv', '(develop) '], ['', msg]], true);
      while (L2.body.childElementCount > L2.rows) L2.body.lastChild.remove();
    }

    /* Coreografía de quien lleva capucha (una sola pantalla activa a la vez). */
    function* hood() {
      for (let n = 0; ; n++) {
        yield* edit(LAP, hoodO, S.s1, n === 0 ? LAP.pre : 0);
        yield* cmd(AT, hoodO, '$ dotnet test', [[['', 'Compilación correcta.']], [['ok', 'Superado ✓'], ['', '  ReglaVelocidadTests']]]);
        emit('pruebas:ok'); yield rnd(1200, 2400);
        yield* edit(AE, hoodO, S.s2a);
        yield* cmd(AT, hoodO, '$ dotnet watch run', [[['ok', 'info: '], ['', 'Escuchando en http://localhost:5000']]]);
        emit('api:arriba'); yield rnd(1500, 3000);
        yield* paste(BS, hoodO, S.s5.l, RES5);
        yield* cmd(AT, hoodO, '$ git switch -c feature/regla-velocidad', [[['dim', "Se cambió a la rama nueva 'feature/regla-velocidad'"]]]);
        yield* cmd(AT, hoodO, '$ git add .', []);
        yield* cmd(AT, hoodO, '$ git commit -m "feat: regla de velocidad (ejemplo)"', [[['dim', '2 archivos cambiados, 41 inserciones(+)']]]);
        yield* cmd(AT, hoodO, '$ git push -u origin feature/regla-velocidad', [[['ok', '✓ GitHub Actions: compilación y pruebas correctas']]]);
        emit('push:ok'); yield rnd(1500, 3000);
        yield* edit(LAP, hoodO, S.s4);
        yield* cmd(AT, hoodO, '$ npm run dev', [[['', 'Servidor listo en http://localhost:3000']]]);
        emit('node:arriba'); yield rnd(1500, 3000);
        yield* edit(AE, hoodO, S.s2b);
        yield* cmd(AT, hoodO, '$ dotnet test', [[['', 'Compilación correcta.']], [['ok', 'Superado ✓'], ['', '  OrdenesControllerTests']]]);
        yield rnd(2000, 4000);
      }
    }
    /* Quien tiene barba: pruebas y Git Flow en su portátil; la salida va a sus monitores.
       En la banda (móvil) la cámara se detiene sobre su puesto: ahí descansa poco, para que siempre haya alguien escribiendo. */
    function* beard() {
      const F = [['horario-disponible', 'validar horario disponible'], ['agenda-citas', 'agenda de citas'], ['zona-horaria', 'ajustar zona horaria']];
      for (let n = 0; ; n++) {
        const [br, msg] = F[n % 3];
        yield band ? rnd(600, 1200) : rnd(3000, 6000);
        yield* cmd(LAP2, beardO, '$ pytest -q', PYTEST.slice(1), L1);
        yield band ? rnd(700, 1400) : rnd(1500, 3000);
        yield* cmd(LAP2, beardO, '$ git add .', []);
        yield* cmd(LAP2, beardO, `$ git commit -m "feat: ${msg}"`, []);
        gitLog('feat: ' + msg);
        yield* cmd(LAP2, beardO, `$ git push -u origin feature/${br}`, []);
        yield band ? rnd(900, 1800) : rnd(9000, 16000);
      }
    }
    function* logs() { for (;;) { yield Math.max(120, -Math.log(1 - R()) * (clock < fastUntil ? 800 : 1600)); const r = logRow(); feed(BL, r); setLog(r.full); } }
    function* demo() { for (;;) { yield rnd(1400, 2600); const f = demoFlag && R() < 0.2; feed(BD, demoRow(f)); if (f) emit('flag'); } }
    function* reader(s, src, a, b) { for (;;) { yield rnd(a, b); feed(s, src[s.ri++ % src.length]); } }
    function* pytestEcho() { for (;;) { yield rnd(9000, 15000); feed(L1, PYTEST[0]); for (const l of PYTEST.slice(1)) { yield rnd(120, 400); feed(L1, l); } } }

    const actors = [];
    const actor = (gen) => { let it = gen(); actors.push({ at: 0, step() { let r = it.next(); if (r.done) { it = gen(); r = it.next(); } return typeof r.value === 'number' ? r.value : 1000; } }); };
    actor(hood);
    if (LAP2.live) actor(beard); else if (L1.live) actor(pytestEcho);
    if (BL.live) actor(logs);
    if (BD.live) actor(demo);
    if (L3.live) actor(() => reader(L3, S.s7.l, 1200, 2000));
    if (BC.live) actor(() => reader(BC, S.s3.l, 4000, 6000));
    LAP.line.appendChild(hoodO.caret); hoodO.scr = LAP;
    if (LAP2.live && LAP2.line) { LAP2.line.appendChild(beardO.caret); beardO.scr = LAP2; }

    /* Cámara: paralaje con el puntero solo en escritorio con ratón. */
    const para = FINE && !LOW;
    let tx = 0, ty = 0, cx = 0, cy = 0, moved = -1e9;
    if (para) addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; moved = performance.now(); }, { passive: true });
    function parallax(t) {
      if (band || (t - moved > 2000 && Math.abs(tx - cx) < 0.002 && Math.abs(ty - cy) < 0.002)) return;
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      camDX = -cx * 16; camDY = -cy * 10;
      cam.style.transform = `translate3d(${camDX.toFixed(2)}px,${camDY.toFixed(2)}px,0) scale(1.04)`;
      copy.style.transform = `translate3d(${(cx * 6).toFixed(2)}px,${(cy * 6).toFixed(2)}px,0)`;
      lineTo(false); // la línea de la lupa sigue a la pantalla
    }

    function loop(t) {
      raf = requestAnimationFrame(loop);
      try {
        if (para) parallax(t);
        const step = 1000 / ((band || LOW) ? 24 : 30) - 2;
        if (t - last < step) return;
        const dt = Math.min(t - last, 100); last = t; clock += dt;
        if (t - lastAct > 120000) { idle = true; sync(); return; }
        for (let i = timers.length - 1; i >= 0; i--) if (clock >= timers[i][0]) { const f = timers[i][1]; timers.splice(i, 1); f(); }
        for (const a of actors) if (clock >= a.at) a.at = (clock - a.at < 100 ? a.at : clock) + a.step();
      } catch (e) { fail(e); }
    }
    function start() { if (running || dead) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    /* Pausas: fuera de pantalla, pestaña oculta, botón «Pausar animaciones» (html.anim-off, lo gestiona script.js) o 2 min sin actividad. */
    const root = doc.documentElement;
    let vis = true, userPaused = root.classList.contains('anim-off'), idle = false, lastAct = performance.now(), ready = false;
    function sync() {
      const on = vis && !doc.hidden && !userPaused;
      sala.classList.toggle('is-paused', !on || idle);
      sala.classList.toggle('is-idle', on && idle); // la lupa dice «en espera» en vez de «en vivo»
      if (on && !idle && ready) start(); else stop(); // no escribe nada hasta que la escena se ve
    }
    const act = () => { lastAct = performance.now(); if (idle) { idle = false; sync(); } };
    for (const ev of ['scroll', 'pointermove', 'pointerdown', 'touchstart', 'wheel', 'focusin']) addEventListener(ev, act, { passive: true });
    /* Al volver a la pestaña se reinicia el contador de inactividad: quien vuelve ve la escena en marcha. */
    doc.addEventListener('visibilitychange', () => { if (!doc.hidden) { lastAct = performance.now(); idle = false; } sync(); });
    new IntersectionObserver((en) => { vis = en[en.length - 1].isIntersecting; sync(); }, { threshold: 0 }).observe(sala);
    doc.addEventListener('anim-pausa', () => { userPaused = root.classList.contains('anim-off'); sync(); });

    /* Arranque: cuando la foto está decodificada y la fuente mono cargada (máx. 1,5 s). */
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const fontOk = doc.fonts && doc.fonts.load ? doc.fonts.load('400 14px "JetBrains Mono"').catch(() => 0) : Promise.resolve();
    const imgOk = img.decode ? img.decode().catch(() => { if (!img.naturalWidth) throw new Error('foto sin cargar'); }) : Promise.resolve();
    stage.style.visibility = 'hidden';
    Promise.all([imgOk, Promise.race([fontOk, wait(1500)])]).then(() => {
      if (dead) return;
      stage.style.visibility = '';
      fit();
      sala.classList.add('is-live');
      ready = true; lastAct = performance.now();
      sync();
    }).catch(fail);
  }
})();
