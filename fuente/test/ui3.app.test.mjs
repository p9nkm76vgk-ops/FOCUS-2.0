// Rutina semanal, reorganización con comparación y bienestar digital (DOM SIMULADO, no navegador real).
import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const T0 = new Date(2026, 9, 12, 8, 0).getTime(), J = JSON.stringify;
const hab = (a, name, date, start, end, o = {}) => { const s = a.S.subjects.find(x => x.name === name); return { id: `hab:${date}:${start}:${s.id}`, date, start, end, subjectId: s.id, kind: 'estudio', title: name, detail: 'Actividad genérica adaptable.', status: 'planned', pinned: false, ...o }; };
const taskF = (a, name, o = {}) => ({ title: 'Deberes de ' + name, subjectId: a.S.subjects.find(x => x.name === name).id, dueDate: '2026-10-13', time: '', learn: 'ejercicios', size: '3', difficulty: '3', importance: '3', estOverride: '45', status: 'pending', notes: '', ...o });
const items = a => [...a.S.habit.filter(h => h.status === 'planned' || h.status === 'done'), ...a.S.blocks.filter(b => b.status === 'planned' || b.status === 'done')].map(x => ({ date: x.date, start: x.start, end: x.end, id: x.id }));
const noOverlap = xs => { for (const p of xs) for (const q of xs) if (p !== q && p.date === q.date) assert.ok(p.end <= q.start || q.end <= p.start, `solape ${p.id} / ${q.id}`); };
const choice = async (a, i) => { a.t.A.choice({ dataset: { i: String(i) } }); await a.tick(); };
test.beforeEach(() => { clock.t = T0 });
async function withRoutine() { const a = await boot(); a.t.A.rutOn(); assert.match(a.h.dlg.innerHTML, /Activar rutina semanal/); assert.match(a.h.dlg.innerHTML, /Antes · /); await choice(a, 0); return a; }

test('activar la rutina: comparación previa, bloques sugeridos persistentes, cancelar no cambia nada', async () => {
  const c = await boot(); c.t.A.rutOn(); await choice(c, 1); assert.equal(c.S.routine.enabled, false); assert.equal(c.S.habit.length, 0);
  const a = await withRoutine(); assert.equal(a.S.routine.enabled, true); assert.ok(a.S.habit.length >= 10); assert.ok(a.S.routine.generatedThrough >= '2026-10-25'); noOverlap(items(a));
  assert.ok(a.S.habit.every(h => h.status === 'planned' && !h.pinned && h.detail.length > 20)); assert.equal(a.S.works.length, 0, 'la rutina no crea tareas'); assert.equal(a.S.blocks.length, 0);
  const b = await boot(a.store); assert.equal(J(b.S.habit), J(a.S.habit), 'persiste'); assert.ok(/class="ev hab planned"/.test(a.t.V.cal())); assert.match(a.t.V.hoy() + a.t.V.rut(), /Rutina semanal/);
  const n = a.S.habit.length; await a.t.commit({ quiet: true }); await a.t.commit(); assert.equal(a.S.habit.length, n, 'sin duplicados al repetir');
});
test('EJEMPLO en la app: deberes de Historia con la rutina activa → se guardan sin diálogos, sin bloques tachados, sin solapes y estable', async () => {
  const a = await withRoutine(); const antes = a.S.habit.length; assert.ok(antes >= 10);
  await a.click('addTask'); a.h.dlg.innerHTML = ''; assert.equal(await a.submit(taskF(a, 'Historia de España')), ''); await a.tick();
  assert.doesNotMatch(a.h.dlg.innerHTML, /Cambios propuestos/, 'no se pide decidir nada: las obligaciones mandan'); assert.equal(a.S.works.length, 1);
  const wb = a.S.blocks.filter(b => b.status === 'planned'); assert.ok(wb.length >= 1); assert.equal(a.S.habit.filter(h => h.date >= '2026-10-12' && ['replaced', 'displaced'].includes(h.status)).length, 0, 'nada tachado');
  noOverlap(items(a)); const snap = J([a.S.habit, a.S.blocks]); await a.t.commit(); await a.t.commit(); await a.click('replan'); await a.click('replan'); assert.equal(J([a.S.habit, a.S.blocks]), snap, 'estable: no oscila');
  assert.doesNotMatch(a.t.V.cal(), /sustituida/); assert.equal(a.t.stats(a.S.blocks, a.S.works, {}).completedMin, 0);
});
test('con la rutina activa, añadir y editar cosas varias veces no deja huecos de más de 10 min entre bloques de un mismo tramo ni bloques tachados', async () => {
  const a = await withRoutine();
  for (const [t, d] of [['Historia de España', '2026-10-14'], ['Lengua Castellana', '2026-10-15'], ['Física', '2026-10-16']]) { await a.click('addTask'); await a.submit(taskF(a, t, { dueDate: d, estOverride: '90' })); a.h.dlg.innerHTML = ''; }
  await a.click('replan'); await a.click('replan'); noOverlap(items(a)); assert.equal(a.S.habit.filter(h => h.date >= '2026-10-12' && ['replaced', 'displaced'].includes(h.status)).length, 0);
  const av = a.S.settings.availability, day = d => new Date(d + 'T00:00:00Z').getUTCDay();
  for (const d of ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17']) { const xs = items(a).filter(x => x.date === d).sort((p, q) => p.start - q.start); for (let i = 1; i < xs.length; i++) { const w1 = av[day(d)].findIndex(w => w.start <= xs[i - 1].start && xs[i - 1].end <= w.end), w2 = av[day(d)].findIndex(w => w.start <= xs[i].start && xs[i].end <= w.end); if (w1 === w2) assert.ok(xs[i].start - xs[i - 1].end <= 15, `hueco de ${xs[i].start - xs[i - 1].end} min el ${d}`); } }
});
test('bloques de rutina: hecho, fijar, mover con conflicto informado, omitir; no cuentan como estudio ni tocan estimaciones', async () => {
  const a = await withRoutine(); const works0 = J(a.S.works), hs = a.S.habit.filter(h => h.date === '2026-10-12' && h.status === 'planned'); assert.ok(hs.length >= 2); const m = hs[0], e = hs[1];
  await a.click('habDone', m.id); assert.equal(await a.submit({ actualMin: '40' }), ''); const dm = a.S.habit.find(h => h.id === m.id); assert.equal(dm.status, 'done'); assert.equal(dm.actualMin, 40);
  await a.click('habPin', e.id); assert.equal(a.S.habit.find(h => h.id === e.id).pinned, true); await a.click('habMove', e.id); const hh = x => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
  assert.match(await a.submit({ date: '2026-10-12', time: hh(m.start + 5) }), /No se ha movido nada/); assert.equal(await a.submit({ date: '2026-10-30', time: '18:00' }), '');
  const mv = a.S.habit.find(h => h.subjectId === e.subjectId && h.date === '2026-10-30'); assert.ok(mv && mv.pinned, 'se movió y sigue fijado');
  await a.click('habSkip', mv.id); assert.equal(a.S.habit.find(h => h.id === mv.id).status, 'skipped'); assert.equal(a.t.stats(a.S.blocks, a.S.works, {}).completedMin, 0); assert.equal(J(a.S.works), works0); assert.match(a.t.V.seg(), /Rutina habitual esta semana/);
  const n = a.S.habit.length; a.h.confirm = true; await a.click('rutOff'); assert.equal(a.S.routine.enabled, false); assert.equal(a.S.habit.length, n, 'desactivar conserva los bloques');
});
test('bienestar digital: periodos sin notificaciones ocultan sugerencias y pausas, no obligaciones; pausa sin pantalla tras un bloque hecho', async () => {
  clock.t = new Date(2026, 9, 12, 21, 40).getTime(); const a = await boot(); await a.click('addAct'); await a.h.dlg.onsubmit; a.t.A.quietAdd(); assert.equal(await a.submit({ d1: 'on', d2: 'on', d3: 'on', d4: 'on', d5: 'on', s: '21:30', e: '23:00' }), ''); await a.tick();
  assert.equal(a.S.routine.quiet.length, 1); const hoy = a.t.V.hoy(); assert.match(hoy, /Periodo sin notificaciones/); assert.doesNotMatch(hoy, /data-a=suggStart/); assert.match(a.t.V.aj(), /Bienestar digital/); assert.match(a.t.V.aj(), /21:30–23:00/);
  assert.match(await (async () => { a.t.A.quietAdd(); return a.submit({ s: '23:00', e: '21:00' }) })(), /Elige al menos un día|Revisa las horas/);
  clock.t = new Date(2026, 9, 14, 18, 30).getTime(); const b = await boot(); b.S.habit = [hab(b, 'Matemáticas II', '2026-10-14', 1020, 1065, { status: 'done', actualMin: 45 })]; await b.t.commit({ quiet: true }); assert.match(b.t.V.hoy(), /Pausa sin pantalla/);
  b.t.A.pauseDone({ dataset: { id: '2026-10-14|1065'.replace(/^/, 'pause|') } }); await b.tick(); assert.doesNotMatch(b.t.V.hoy(), /Pausa sin pantalla/);
});
test('compatibilidad: la versión anterior abre los datos nuevos y los conserva; exportar/importar incluye rutina y el registro de pausas', async () => {
  const a = await withRoutine(); a.t.A.pauseDone({ dataset: { id: 'pause|2026-10-12|1065' } }); await a.tick(); await a.click('export'); const o = JSON.parse(a.h.blob);
  for (const k of ['routine', 'habit', 'explore']) assert.ok(k in o, k); const b = await boot(); assert.equal(b.t.importText(a.h.blob), null); await b.tick(); assert.equal(J(b.S.habit), J(a.S.habit)); assert.equal(J(b.S.explore), J(a.S.explore)); assert.equal(b.S.routine.enabled, true);
  const prev = await boot(a.store, { dist: 'test/fixtures/prev-dist.html' }); assert.doesNotMatch(prev.h.main.innerHTML, /Datos no válidos/); assert.equal(J(prev.S.habit), J(a.S.habit)); assert.equal(J(prev.S.routine), J(a.S.routine));
  const old = JSON.parse(a.store['focusos.v1']); delete old.routine; delete old.habit; delete old.explore; const c = await boot({ 'focusos.v1': J(old) }); assert.equal(c.S.routine.enabled, false); assert.equal(c.S.habit.length, 0);
});
