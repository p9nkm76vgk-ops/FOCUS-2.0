// Sincronización entre dispositivos (DOM SIMULADO + servidor falso en memoria; NO se probó contra Supabase real desde Node).
import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const T0 = new Date(2026, 9, 12, 8, 0).getTime();
test.beforeEach(() => { clock.t = T0 });
const opts = (a, o = {}) => ({ subjectId: a.S.subjects[1].id, when: '5', learn: 'auto', size: '3', difficulty: '3', importance: '3', pace: '1', ...o });
const mk = async (a, o) => { await a.click('addTask'); await a.submit(opts(a, o)); return a.S.works.at(-1) };
/** Servidor falso: auth por contraseña + tabla focus_state con control de versión (misma lógica que focus_push). */
function server() {
  const sv = { row: null, down: false, log: [], users: { 'a@b.es': 'clave-larga-1' } };
  sv.fetch = async (url, o = {}) => {
    sv.log.push(url.replace('https://bcdvhnfepscguihmfjma.supabase.co', ''));
    const res = (status, body) => ({ ok: status < 400, status, json: async () => body });
    if (sv.down) throw new TypeError('Failed to fetch');
    if (url.includes('/auth/v1/token?grant_type=password')) { const b = JSON.parse(o.body); return sv.users[b.email] === b.password ? res(200, { access_token: 'tok', refresh_token: 'ref', expires_in: 3600, user: { email: b.email } }) : res(400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' }); }
    if (url.includes('/auth/v1/signup')) return res(200, { user: { email: JSON.parse(o.body).email } });
    if (!o.headers || o.headers.Authorization !== 'Bearer tok') return res(401, { message: 'no autenticado' });
    if (url.includes('/rest/v1/focus_state')) return res(200, sv.row ? [{ data: JSON.parse(sv.row.data), version: sv.row.version }] : []);
    if (url.includes('/rpc/focus_push')) { const b = JSON.parse(o.body); if (b.p_base === 0) { if (sv.row) return res(200, [{ ok: false, version: sv.row.version }]); sv.row = { data: JSON.stringify(b.p_data), version: 1 }; return res(200, [{ ok: true, version: 1 }]); }
      if (!sv.row || sv.row.version !== b.p_base) return res(200, [{ ok: false, version: sv.row?.version ?? 0 }]); sv.row = { data: JSON.stringify(b.p_data), version: b.p_base + 1 }; return res(200, [{ ok: true, version: sv.row.version }]); }
    return res(404, {});
  };
  return sv;
}
const dev = async (sv, store = {}) => { const a = await boot(store); a.ctx.fetch = sv.fetch; return a };
const login = async a => { await a.t.SY.signIn('a@b.es', 'clave-larga-1'); await a.tick(); };

test('sincronización: sin cuenta no se llama a la red y los datos siguen locales', async () => {
  const sv = server(), a = await dev(sv); await mk(a); await a.t.SY.flush(); assert.equal(sv.log.length, 0); assert.equal(a.t.SY.on, false); assert.match(a.t.V.aj(), /Cuenta y sincronización/); assert.match(a.t.V.aj(), /Iniciar sesión/);
});
test('sincronización: iniciar sesión sube los datos; un dispositivo nuevo recibe los mismos datos; los cambios viajan en ambos sentidos', async () => {
  const sv = server(), A = await dev(sv); const w = await mk(A, { title: 'Del móvil' }); await login(A);
  assert.equal(A.t.SY.on, true); assert.ok(sv.row, 'subido'); assert.equal(sv.row.version, 1); assert.equal(A.t.SY.dirty, false); assert.match(A.t.V.aj(), /Sesión: <b>a@b.es/);
  const B = await dev(sv); assert.equal(B.S.works.length, 0); await login(B);
  assert.equal(B.S.works.length, 1, 'el iPad recibe lo del móvil'); assert.equal(B.S.works[0].id, w.id); assert.equal(B.S.blocks.length, A.S.blocks.length);
  const w2 = await mk(B, { title: 'Del iPad' }); await B.t.SY.flush(); await B.tick(); assert.equal(sv.row.version, 2); assert.equal(B.t.SY.dirty, false);
  await A.t.SY.flush(); await A.tick(); assert.equal(A.S.works.length, 2, 'el móvil recibe lo del iPad'); assert.ok(A.S.works.find(x => x.id === w2.id));
  const A2 = await boot(A.store); assert.equal(A2.S.works.length, 2, 'persiste tras recargar'); assert.ok(A.store['focusos.v1.syncbackup'], 'copia previa guardada al adoptar');
  assert.ok(!A.store['focusos.v1'].includes('tok'), 'el token no se mezcla con los datos');
});
test('sincronización: sin cambios no se vuelve a subir; sin conexión no se pierde nada y se reintenta', async () => {
  const sv = server(), A = await dev(sv); await mk(A); await login(A); const v = sv.row.version; await A.t.SY.flush(); await A.tick(); assert.equal(sv.row.version, v, 'sin cambios no sube');
  sv.down = true; await mk(A, { title: 'Sin red' }); await A.t.SY.flush(); await A.tick(); assert.equal(A.t.SY.dirty, true); assert.match(A.t.SY.status(), /conexión/i); assert.equal(A.S.works.length, 2, 'datos locales intactos');
  sv.down = false; await A.t.SY.flush(); await A.tick(); assert.equal(A.t.SY.dirty, false); assert.equal(JSON.parse(sv.row.data).works.length, 2);
});
test('sincronización: si los dos dispositivos cambiaron, se pregunta y se conserva copia de lo descartado', async () => {
  const sv = server(), A = await dev(sv); await mk(A, { title: 'Base' }); await login(A); const B = await dev(sv); await login(B);
  await mk(A, { title: 'Solo A' }); await mk(B, { title: 'Solo B' }); await B.t.SY.flush(); await B.tick(); assert.equal(sv.row.version, 2);
  await A.t.SY.flush(); await A.tick(); assert.match(A.h.dlg.innerHTML, /distintos en este dispositivo y en la nube/); assert.equal(A.S.works.length, 2, 'aún no se ha decidido nada');
  A.t.A.choice({ dataset: { i: '0' } }); await A.tick(); await A.tick(); assert.ok(A.S.works.find(x => x.title === 'Solo B') && !A.S.works.find(x => x.title === 'Solo A'), 'usar la nube'); assert.ok(JSON.parse(A.store['focusos.v1.syncbackup']).works.find(x => x.title === 'Solo A'), 'copia de lo descartado');
});
test('sincronización: contraseña incorrecta no inicia sesión; cerrar sesión conserva los datos locales', async () => {
  const sv = server(), A = await dev(sv); await mk(A); await assert.rejects(() => A.t.SY.signIn('a@b.es', 'mala'), /incorrectos/); assert.equal(A.t.SY.on, false);
  await login(A); A.t.SY.signOut(); assert.equal(A.t.SY.on, false); assert.equal(A.S.works.length, 1); assert.equal(sv.row.version, 1, 'la nube no se borra');
});
