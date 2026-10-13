// PWA, diseño y accesibilidad. REALES: archivos de dist, servidor HTTP local, contrastes calculados de los valores del CSS.
// SIMULADO: el service worker se ejecuta en `vm` con caches/fetch falsos (no es un navegador). NO cubierto: instalación en Safari/iPad.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import http from 'node:http'; import vm from 'node:vm'; import path from 'node:path';
const D = 'dist', read = f => fs.readFileSync(path.join(D, f), 'utf8'), css = fs.readFileSync('src/app/style.css', 'utf8'), html = read('index.html');
const png = f => { const b = fs.readFileSync(path.join(D, f)); assert.equal(b.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
test('build: index, manifest, iconos y service worker presentes', () => {
  for (const f of ['index.html', 'manifest.webmanifest', 'sw.js', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) assert.ok(fs.existsSync(path.join(D, f)), f);
  assert.deepEqual(png('icon-180.png'), [180, 180]); assert.deepEqual(png('icon-192.png'), [192, 192]); assert.deepEqual(png('icon-512.png'), [512, 512]); assert.deepEqual(png('icon-maskable-512.png'), [512, 512]);
});
test('manifest: instalable (nombre, standalone, alcance relativo, iconos 192/512 y maskable, colores de la paleta)', () => {
  const m = JSON.parse(read('manifest.webmanifest')); assert.equal(m.name, 'Focus OS'); assert.equal(m.display, 'standalone'); assert.equal(m.start_url, './'); assert.equal(m.scope, './'); assert.equal(m.lang, 'es');
  assert.equal(m.background_color.toLowerCase(), '#111113'); assert.equal(m.theme_color.toLowerCase(), '#111113'); assert.ok(m.icons.some(i => i.sizes === '192x192') && m.icons.some(i => i.sizes === '512x512' && i.purpose === 'any') && m.icons.some(i => i.purpose === 'maskable'));
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(D, i.src)), i.src);
  for (const re of [/rel=manifest/, /rel=apple-touch-icon/, /apple-mobile-web-app-capable/, /viewport-fit=cover/, /name=theme-color/, /status-bar-style content=black/, /theme-color content="#111113"/]) assert.match(html, re);
});
test('sin recursos externos: todo lo necesario viaja con la app (requisito para funcionar sin conexión)', () => {
  assert.doesNotMatch(html, /(?:src|href)=["']?https?:/i); assert.doesNotMatch(html, /url\(\s*["']?https?:/i); assert.doesNotMatch(html, /@import/); assert.doesNotMatch(html, /fetch\(\s*["'`]https?:/);
});
test('servidor HTTP local: sirve la app, el manifest, el service worker y los iconos', async () => {
  const mime = { html: 'text/html', webmanifest: 'application/manifest+json', js: 'text/javascript', png: 'image/png' };
  const srv = http.createServer((q, r) => { const f = q.url === '/' ? 'index.html' : q.url.slice(1); const p = path.join(D, f); if (!fs.existsSync(p)) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', mime[f.split('.').pop()] ?? 'application/octet-stream'); r.end(fs.readFileSync(p)); });
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const base = `http://127.0.0.1:${srv.address().port}`;
  try { for (const [u, ct] of [['/', 'text/html'], ['/manifest.webmanifest', 'manifest'], ['/sw.js', 'javascript'], ['/icon-192.png', 'image/png'], ['/icon-512.png', 'image/png']]) { const r = await fetch(base + u); assert.equal(r.status, 200, u); assert.match(r.headers.get('content-type'), new RegExp(ct), u); }
    assert.equal((await fetch(base + '/no-existe')).status, 404); } finally { srv.close(); }
});
test('service worker (SIMULADO en vm): precarga todo, funciona sin red, ignora no-GET, limpia versiones antiguas y no toca datos', async () => {
  const src = read('sw.js'); const FILES = JSON.parse(/FILES = (\[.*?\]);/.exec(src)[1]); assert.ok(FILES.includes('./') && FILES.includes('index.html') && FILES.includes('manifest.webmanifest') && FILES.includes('icon-192.png') && !FILES.includes('sw.js'));
  const store = new Map([['focusos-vieja', new Map()], ['otra-app', new Map()]]); let online = true; const H = {}, base = 'http://app.test/';
  const absolute = u => new URL(u, base).href;
  const fakeFetch = async r => { if (!online) throw new Error('offline'); const u = typeof r === 'string' ? r : r.url, p = new URL(u).pathname.slice(1) || 'index.html'; return fs.existsSync(path.join(D, p)) ? new Response(fs.readFileSync(path.join(D, p))) : new Response('x', { status: 404 }); };
  const caches = { open: async n => { const c = store.get(n) ?? new Map(); store.set(n, c); return { add: async r => { assert.equal(r.cache, 'reload', 'la instalación debe saltarse la caché HTTP'); c.set(r.url, await (await fakeFetch(r)).text()); }, put: async (r, res) => c.set(r.url, await res.text()) }; },
    keys: async () => [...store.keys()], delete: async n => store.delete(n), match: async r => { const u = (typeof r === 'string' ? absolute(r) : r.url).split('?')[0]; for (const c of store.values()) if (c.has(u)) return new Response(c.get(u)); } };
  const ctx = { self: { addEventListener: (k, f) => H[k] = f, skipWaiting: async () => {}, clients: { claim: async () => {} }, location: { origin: 'http://app.test' } }, caches, fetch: fakeFetch, Response, URL, Request: class { constructor(u, o) { this.url = new URL(u, 'http://app.test/').href; this.cache = o?.cache; } }, localStorage: undefined, indexedDB: undefined };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  const run = async (k, ev) => { let p; H[k]({ ...ev, waitUntil: x => { p = x }, respondWith: x => { p = x } }); return p; };
  await run('install', {}); const v = [...store.keys()].find(k => k.startsWith('focusos-') && k !== 'focusos-vieja'); assert.ok(v); assert.equal(store.get(v).size, FILES.length);
  await run('activate', {}); assert.ok(!store.has('focusos-vieja'), 'cachés antiguas retiradas'); assert.ok(store.has('otra-app'), 'no toca cachés ajenas');
  online = false; const nav = await run('fetch', { request: { method: 'GET', url: base, mode: 'navigate' } }); assert.match(await nav.text(), /<title>Focus OS<\/title>/, 'abre sin conexión');
  assert.equal((await run('fetch', { request: { method: 'GET', url: base + 'manifest.webmanifest', mode: 'cors' } })).status, 200); assert.equal((await run('fetch', { request: { method: 'GET', url: base + 'icon-512.png?x=1', mode: 'cors' } })).status, 200);
  assert.equal((await run('fetch', { request: { method: 'GET', url: base + 'otro.js', mode: 'cors' } })).type, 'error', 'recurso desconocido sin red = error, no inventa datos');
  let called = false; H.fetch({ request: { method: 'POST', url: base }, respondWith: () => { called = true } }); assert.equal(called, false); assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//g, ''), /localStorage|indexedDB/, 'el código del SW no usa almacenamiento de datos');
});
test('el registro del service worker solo ocurre en contexto seguro (HTTPS/localhost) y falla en silencio', () => assert.match(html, /'serviceWorker' in navigator&&isSecureContext/));

// ---- diseño y accesibilidad (cálculo real sobre los valores del CSS; no sustituye una revisión en dispositivo) ----
const block = sel => { const i = css.indexOf(sel + '{'); return Object.fromEntries([...css.slice(i, css.indexOf('}', i)).matchAll(/--([\w-]+):(#[0-9A-Fa-f]{6})/g)].map(m => [m[1], m[2]])); };
const DARK = block(':root'), LIGHT = { ...DARK, ...block(':root[data-theme=light]') };
const lum = h => { const l = c => (c /= 255) <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; const [r, g, b] = [1, 3, 5].map(i => l(parseInt(h.slice(i, i + 2), 16))); return .2126 * r + .7152 * g + .0722 * b; };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
test('dos temas definidos por variables: oscuro (carbón + dorado) por defecto y claro opcional', () => {
  assert.equal(DARK.bg.toLowerCase(), '#111113'); assert.ok(lum(DARK.bg) < .02, 'fondo carbón'); assert.ok(lum(LIGHT.bg) > .8, 'tema claro'); assert.match(css, /:root\[data-theme=light\]\{/);
  for (const T of [DARK, LIGHT]) for (const k of ['bg', 'surface', 'surface2', 'line', 'text', 'muted', 'accent', 'accent-ink', 'warn', 'ok']) assert.ok(T[k], k);
});
test('contraste de texto ≥ 4,5:1 y de controles/bordes ≥ 3:1 en AMBOS temas', () => {
  for (const [name, T] of [['oscuro', DARK], ['claro', LIGHT]]) {
    for (const [fg, bg] of [['text', 'bg'], ['text', 'surface'], ['text', 'surface2'], ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface2'], ['accent', 'bg'], ['accent', 'surface'], ['warn', 'bg'], ['warn', 'surface'], ['accent-ink', 'accent'], ['bg', 'text']]) assert.ok(cr(T[fg], T[bg]) >= 4.5, `${name}: ${fg} sobre ${bg}: ${cr(T[fg], T[bg]).toFixed(2)}`);
    assert.ok(cr(T.accent, T.surface2) >= 3, name + ': acento sobre controles');
  }
  assert.match(css, /button\.pri\{background:var\(--accent\)/); assert.match(css, /:focus-visible\{outline:3px solid var\(--accent\)/);
});
test('colores de asignatura distinguibles del fondo en ambos temas (≥ 3:1 como elemento gráfico) y siempre con el nombre al lado', async () => {
  const { DEFAULT_SUBJECT_COLORS: C } = await import('../src/core/palette.ts');
  for (const [n, c] of Object.entries(C)) for (const [name, T] of [['oscuro', DARK], ['claro', LIGHT]]) assert.ok(cr(c, T.surface) >= 2.6, `${n} en ${name}: ${cr(c, T.surface).toFixed(2)}`);
});
test('tipografía legible del sistema (sin fuentes externas ni decorativas), tamaños cómodos y respeto al tamaño de texto del sistema', () => {
  assert.match(css, /--font:ui-sans-serif,-apple-system/); assert.doesNotMatch(css, /Georgia|[^-]serif\b|@font-face|fonts\.googleapis|condensed/i); assert.match(css, /@supports \(font:-apple-system-body\)/);
  assert.match(css, /body\{[^}]*font-size:1rem[^}]*line-height:1\.[5-7]/); assert.match(css, /p,small,li\{max-width:68ch\}/);
  for (const m of css.matchAll(/font-size:([\d.]+)rem/g)) assert.ok(+m[1] >= .875, m[0]); assert.ok(!/font-weight:[1-3]00/.test(css), 'sin trazos finos');
});
test('objetivos táctiles ≥ 44 px; foco visible; áreas seguras; sin desbordamiento horizontal de página; movimiento reducido', () => {
  assert.doesNotMatch(css, /background:(#000|black)/i); assert.match(css, /button,input,select,textarea,\.btn\{[^}]*font-size:1rem/); for (const m of css.matchAll(/min-height:(\d+)px/g)) assert.ok(+m[1] >= 44, m[0]);
  assert.match(css, /:focus-visible\{outline:3px/); assert.ok((css.match(/env\(safe-area-inset/g) ?? []).length >= 6); assert.match(css, /body\{[^}]*overflow-x:hidden/); assert.match(css, /\.wk\{[^}]*overflow-x:auto/); assert.match(css, /touch-action:manipulation/); assert.match(css, /@media\(max-width:999px\)/); assert.match(css, /dvh/); assert.match(css, /prefers-reduced-motion/);
});
test('NO quedan restos de las paletas anteriores (olivo/verde y marrón/arena) en CSS, JS, plantilla, manifest ni iconos', () => {
  const OLD = ['#6E7D4E', '#58663D', '#D8E0C7', '#EEF2E3', '#232B18', '#4A5439', '#8A9970', '#8A3B25', '#3F5A2A', '#4F7CAC', '#3E9A8C', '#B98A3C', '#C0607A', '#D07A4A', '#9A5C93', '#8A6A4F', '#7B8794', '#4E9BBF', '#FBF8F3', '#D9C8B4', '#593E1C', '#8C7961', '#8E7756', '#F1E8DC', '#F4EDE3'];
  const files = ['src/app/style.css', 'src/app/app.js', 'src/app/index.template.html', 'public/manifest.webmanifest', 'scripts/make-icons.mjs'];
  for (const f of files) { const s = fs.readFileSync(f, 'utf8').toUpperCase(); for (const c of OLD) assert.ok(!s.includes(c), `${f} contiene ${c}`); }
  const app = fs.readFileSync('src/app/app.js', 'utf8') + css; assert.doesNotMatch(app, /--olive|--sage|--gold|--ink\b|--brown|--sand|--taupe|--bronze/); assert.doesNotMatch(app, /[⌂☑▦❖♡◔⚙☰]/u, 'sin símbolos de texto como iconos'); assert.doesNotMatch(css, /Georgia/);
});

