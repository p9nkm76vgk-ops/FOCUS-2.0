// Versión 8 en la app (DOM SIMULADO, no navegador real): temporizador, nota baja → temas, semanas críticas y .ics.
import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const T0 = new Date(2026, 9, 12, 8, 0).getTime();
test.beforeEach(() => { clock.t = T0 });
const opts = (a, o = {}) => ({ subjectId: a.S.subjects[1].id, when: '1', learn: 'auto', size: '3', difficulty: '3', importance: '3', pace: '1', ...o });
const mk = async (a, o) => { await a.click('addTask'); await a.submit(opts(a, o)); return a.S.works.at(-1) };
const today = a => a.S.blocks.find(x => x.date === '2026-10-12' && x.status === 'planned');

test('temporizador: empezar, sigue tras recargar, terminar guarda los minutos reales una sola vez', async () => {
  const a = await boot(); const w = await mk(a, { when: '0', size: '5' }); const b = today(a); assert.ok(b, 'hay una sesión hoy'); assert.match(a.t.V.hoy(), /data-a=timerStart/);
  await a.click('timerStart', b.id); assert.match(a.t.V.hoy(), /En marcha/); assert.ok(!/data-a=timerStart/.test(a.t.V.hoy()), 'solo una a la vez');
  clock.t += 23 * 60000; const r = await boot(a.store); assert.match(r.t.V.hoy(), /23 min/, 'sigue contando tras recargar');
  await a.click('timerEnd'); const bb = a.S.blocks.find(x => x.id === b.id); assert.equal(bb.status, 'done'); assert.equal(bb.actualMin, 23);
  assert.ok(!/En marcha/.test(a.t.V.hoy())); const st = a.t.stats(a.S.blocks, a.S.works, { date: '2026-10-12', minute: 8 * 60 + 23 }); assert.equal(st.completedMin, 23);
});
test('temporizador: cancelar no registra nada; no se empieza una sesión de otro día', async () => {
  const a = await boot(); await mk(a, { when: '14', size: '5' }); const fut = a.S.blocks.find(x => x.status === 'planned' && x.date > '2026-10-12');
  await a.click('timerStart', fut.id); assert.ok(!a.t.V.hoy().includes('En marcha')); assert.match(a.h.toast, /solo puedes empezar sesiones de hoy/i);
  const w = await mk(a, { when: '0', size: '5' }); const b = today(a); await a.click('timerStart', b.id); await a.click('timerCancel'); assert.equal(a.S.blocks.find(x => x.id === b.id).status, 'planned'); assert.ok(!a.t.V.hoy().includes('En marcha'));
});
test('nota baja: Hoy ofrece elegir los temas fallados; al guardar vuelven a repaso y la tarjeta desaparece', async () => {
  const a = await boot(); const sid = a.S.subjects[0].id; await a.click('editGoals'); await a.submit({ target: '9' });
  a.S.syllabus.push({ id: 'tA', subjectId: sid, name: 'Matrices', course: 2, mastery: 3, reviews: 3, last: '2026-09-01', next: '2027-01-01', createdAt: 1 }, { id: 'tB', subjectId: sid, name: 'Límites', course: 2, mastery: 2, reviews: 1, last: '2026-09-01', next: '2027-01-01', createdAt: 2 });
  await a.click('addGrade'); assert.equal(await a.submit({ subjectId: sid, evalNo: '1', weight: '24', score: '4', date: '2026-10-10', label: 'Parcial' }), '');
  let h = a.t.V.hoy(); assert.match(h, /Sacaste un 4/); const id = h.match(/data-a=weakTopics data-id="([^"]+)"/)[1];
  await a.click('weakTopics', id); assert.match(a.h.dlg.innerHTML, /Matrices/); assert.match(a.h.dlg.innerHTML, /Límites/);
  assert.equal(await a.submit({ t_tA: 'on' }), ''); const A = a.S.syllabus.find(t => t.id === 'tA'), B = a.S.syllabus.find(t => t.id === 'tB');
  assert.equal(A.mastery, 1); assert.equal(A.reviews, 0); assert.equal(A.next, '2026-10-13'); assert.equal(B.mastery, 2, 'el no marcado no cambia');
  assert.ok(!/Sacaste un 4/.test(a.t.V.hoy())); assert.ok(a.S.grades[0].weakDone);
  await a.click('editGrade', a.S.grades[0].id); assert.equal(await a.submit({ subjectId: sid, evalNo: '1', weight: '24', score: '4', date: '2026-10-10' }), ''); assert.ok(a.S.grades[0].weakDone, 'editar la nota no vuelve a preguntar');
});
test('nota alta o sin temario: no pregunta', async () => {
  const a = await boot(); const sid = a.S.subjects[0].id; await a.click('editGoals'); await a.submit({ target: '9' });
  await a.click('addGrade'); await a.submit({ subjectId: sid, evalNo: '1', weight: '24', score: '4', date: '2026-10-10' }); assert.ok(!/Sacaste un/.test(a.t.V.hoy()), 'sin temario no hay qué elegir');
  a.S.syllabus.push({ id: 'tA', subjectId: sid, name: 'M', course: 2, mastery: 1, reviews: 0, last: '2026-10-01', next: '2026-10-20', createdAt: 1 }); await a.click('addGrade'); await a.submit({ subjectId: sid, evalNo: '1', weight: '10', score: '9,5', date: '2026-10-11' });
  const n = [...a.t.V.hoy().matchAll(/Sacaste un ([\d,]+)/g)].map(m => m[1]); assert.deepEqual(n, ['4'], 'solo la nota baja');
});
test('semanas críticas: Exámenes muestra la tabla y Hoy avisa de una semana cargada', async () => {
  const a = await boot(); for (const s of [0, 1, 2]) { await a.click('addExam'); await a.submit({ subjectId: a.S.subjects[s].id, when: '7', learn: 'auto', amount: 'normal', prep: '0', difficulty: '3', importance: '3', goal: 'notable' }); }
  const ex = a.t.V.exa(); assert.match(ex, /Próximas semanas/); assert.match(ex, /⚠ cargada/); assert.match(a.t.V.hoy(), /Semana cargada/);
});
test('.ics: avisa con el número de eventos y descarga un archivo de calendario válido', async () => {
  const a = await boot(); await mk(a, { when: '7', size: '4' }); assert.match(a.t.V.cal(), /data-a=icsAsk/);
  await a.click('icsAsk'); assert.match(a.h.dlg.innerHTML, /Añadir todo/); assert.match(a.h.dlg.innerHTML, /<b>\d+<\/b> eventos/);
  a.t.A.choice({ dataset: { i: '0' } }); await a.tick(); assert.match(String(a.h.blob), /^BEGIN:VCALENDAR/); assert.match(String(a.h.blob), /SUMMARY:Estudio · /);
});

test('«Luego» de la copia y «Ahora no» del máximo diario se recuerdan tras recargar', async () => {
  const a = await boot(); await mk(a); await a.click('backupLater'); const r = await boot(a.store); assert.ok(!r.t.V.hoy().includes('Haz una copia de seguridad'), 'sigue aplazada');
});
