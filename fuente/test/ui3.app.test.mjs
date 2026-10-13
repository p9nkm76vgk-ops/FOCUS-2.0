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
test('EJEMPLO en la app: deberes de Historia → propuesta con comparación; aceptar sustituye Historia y mantiene Lengua', async () => {
  const a = await withRoutine(); a.S.habit = [hab(a, 'Historia de España', '2026-10-12', 1020, 1065), hab(a, 'Lengua Castellana', '2026-10-12', 1080, 1125)]; await a.t.commit({ quiet: true });
  await a.click('addTask'); a.h.dlg.innerHTML = ''; assert.equal(await a.submit(taskF(a, 'Historia de España')), ''); await a.tick();
  assert.ok(a.h.dlg.open, 'la ventana de propuesta sigue abierta tras guardar el formulario'); assert.match(a.h.dlg.innerHTML, /Cambios propuestos en tu rutina/); assert.match(a.h.dlg.innerHTML, /Antes · 10-12/); assert.match(a.h.dlg.innerHTML, /Propuesto · 10-12/); assert.match(a.h.dlg.innerHTML, /Sustituido por/); assert.match(a.h.dlg.innerHTML, /Aceptar cambios/); assert.match(a.h.dlg.innerHTML, /Cancelar/);
  await choice(a, 0); const h = a.S.habit.find(x => x.subjectId === a.S.subjects[7].id), l = a.S.habit.find(x => x.subjectId === a.S.subjects[4].id);
  assert.equal(h.status, 'replaced'); assert.equal(l.status, 'planned'); assert.deepEqual([l.date, l.start, l.end], ['2026-10-12', 1080, 1125]); const wb = a.S.blocks.filter(b => b.status === 'planned'); assert.equal(wb.length, 1); assert.deepEqual([wb[0].date, wb[0].start], ['2026-10-12', 1020]);
  noOverlap(items(a)); const snap = J([a.S.habit, a.S.blocks]); a.h.dlg.innerHTML = ''; await a.t.commit(); await a.t.commit(); assert.equal(J([a.S.habit, a.S.blocks]), snap, 'estable: no oscila'); assert.equal(a.h.dlg.innerHTML, '', 'no vuelve a preguntar');
  const st = a.t.stats(a.S.blocks, a.S.works, {}); assert.equal(st.completedMin, 0);
});
test('cancelar descarta el cambio; «mantener mi rutina» conserva la rutina y recuerda la decisión', async () => {
  const mk = async () => { const a = await withRoutine(); a.S.habit = [hab(a, 'Historia de España', '2026-10-12', 1020, 1065), hab(a, 'Lengua Castellana', '2026-10-12', 1080, 1125)]; await a.t.commit({ quiet: true }); return a; };
  const a = await mk(); const before = a.store['focusos.v1']; await a.click('addTask'); await a.submit(taskF(a, 'Historia de España')); await choice(a, 2);
  assert.equal(a.S.works.length, 0, 'cancelar: no se guarda la tarea'); assert.equal(a.store['focusos.v1'], before, 'almacenamiento intacto');
  const b = await mk(); await b.click('addTask'); await b.submit(taskF(b, 'Historia de España')); await choice(b, 1);
  assert.equal(b.S.works.length, 1); assert.equal(b.S.habit.find(h => h.subjectId === b.S.subjects[7].id).status, 'planned'); assert.ok(b.S.routine.declined.length >= 1); noOverlap(items(b));
  b.h.dlg.innerHTML = ''; await b.click('addTask'); await b.submit(taskF(b, 'Física', { title: 'Otra', estOverride: '30' })); assert.equal(b.S.works.length, 2); assert.doesNotMatch(b.h.dlg.innerHTML, /Cambios propuestos/, 'la decisión rechazada no se vuelve a ofrecer');
});
test('bloques de rutina: hecho, fijar, mover con conflicto informado, omitir; no cuentan como estudio ni tocan estimaciones', async () => {
  const a = await withRoutine(); a.S.habit = [hab(a, 'Matemáticas II', '2026-10-12', 1020, 1065), hab(a, 'Inglés', '2026-10-12', 1100, 1145)]; await a.t.commit({ quiet: true }); const works0 = J(a.S.works);
  const m = a.S.habit[0].id; await a.click('habDone', m); assert.equal(await a.submit({ actualMin: '40' }), ''); assert.equal(a.S.habit[0].status, 'done'); assert.equal(a.S.habit[0].actualMin, 40);
  const e = a.S.habit[1].id; await a.click('habPin', e); assert.equal(a.S.habit[1].pinned, true); await a.click('habMove', e); assert.match(await a.submit({ date: '2026-10-12', time: '17:20' }), /No se ha movido nada/);
  assert.equal(await a.submit({ date: '2026-10-13', time: '18:00' }), ''); assert.equal(a.S.habit[1].date, '2026-10-13'); assert.equal(a.S.habit[1].pinned, true);
  await a.click('habSkip', a.S.habit[1].id); assert.equal(a.S.habit[1].status, 'skipped'); assert.equal(a.t.stats(a.S.blocks, a.S.works, {}).completedMin, 0); assert.equal(J(a.S.works), works0); assert.match(a.t.V.seg(), /Rutina habitual esta semana/);
  a.h.confirm = true; await a.click('rutOff'); assert.equal(a.S.routine.enabled, false); assert.equal(a.S.habit.length, 2, 'desactivar conserva los bloques');
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
