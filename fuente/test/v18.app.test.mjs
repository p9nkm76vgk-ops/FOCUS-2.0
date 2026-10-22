// v18 (DOM SIMULADO): Progreso con datos reales, estados vacíos, tarjeta del temporizador.
import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const T0 = new Date(2026, 9, 14, 10, 0).getTime();
test.beforeEach(() => { clock.t = T0 });
const blk = (id, workId, date, st, s = 600, e = 660, extra = {}) => ({ id, workId, date, start: s, end: e, status: st, kind: 'main', ...extra });

test('Progreso: sin datos muestra estado vacío y «—»; no inventa nada', async () => {
  const a = await boot(); const h = a.t.V.seg();
  assert.match(h, /Aún no hay nada que medir/); assert.match(h, /aria-label="Cumplimiento sin datos"/); assert.match(h, /<b>0 días<\/b>/);
});
test('Progreso: cumplimiento, racha, semana y reparto por asignatura salen de los bloques (reprogramados no cuentan)', async () => {
  const a = await boot(); const [s1, s2] = a.S.subjects; const wid = [];
  for (const s of [s1, s2]) { await a.click('addTask'); await a.submit({ subjectId: s.id, when: '14', title: 'T ' + s.name }); wid.push(a.S.works.at(-1).id) }
  a.S.blocks = [blk('d1', wid[0], '2026-10-14', 'done'), blk('d2', wid[0], '2026-10-13', 'done'), blk('d3', wid[0], '2026-10-12', 'done', 600, 690), blk('k1', wid[1], '2026-10-13', 'skipped'), blk('r1', wid[1], '2026-10-13', 'rescheduled'), blk('d4', wid[1], '2026-10-12', 'done', 600, 630)];
  const D = a.t.segCalc({ date: '2026-10-14', minute: 600 });
  assert.equal(D.streak, 3, 'hoy, ayer y anteayer'); assert.equal(D.closed, 5);
  assert.equal(D.all, Math.round(100 * (60 + 60 + 90 + 30) / (60 + 60 + 90 + 30 + 60)), 'hechas / (hechas + omitidas) en minutos previstos');
  const x0 = D.subs.find(x => x.s.id === s1.id), x1 = D.subs.find(x => x.s.id === s2.id);
  assert.equal(x0.done, 210); assert.equal(x0.comp, 100); assert.equal(x1.done, 30); assert.equal(x1.comp, 33);
  assert.equal(D.wDone, 240, 'semana del 12 al 18'); assert.equal(D.weeks.length, 6);
  const h = a.t.V.seg(); assert.match(h, /aria-label="Cumplimiento 80 %"/); assert.match(h, /<b>3 días<\/b>/); assert.doesNotMatch(h, /Aún no hay nada que medir/); assert.match(h, new RegExp(s1.name));
  assert.match(h, /Lo que aprende el planificador/, 'se conservan las secciones anteriores');
});
test('racha: si hoy aún no hay sesión hecha cuenta desde ayer; un hueco la corta', async () => {
  const a = await boot(); await a.click('addTask'); await a.submit({ subjectId: a.S.subjects[0].id, when: '14', title: 'T' }); const w = a.S.works.at(-1).id;
  a.S.blocks = [blk('a', w, '2026-10-13', 'done'), blk('b', w, '2026-10-12', 'done'), blk('c', w, '2026-10-10', 'done')];
  assert.equal(a.t.segCalc({ date: '2026-10-14', minute: 600 }).streak, 2); assert.equal(a.t.segCalc({ date: '2026-10-16', minute: 600 }).streak, 0);
});
test('estados vacíos útiles en Tareas y Exámenes, con su acción', async () => {
  const a = await boot(); const t = a.t.V.tar(), e = a.t.V.exa();
  assert.match(t, /class=empty/); assert.match(t, /data-a=addTask/); assert.match(e, /class=empty/); assert.match(e, /data-a=addExam/);
});
test('temporizador: tarjeta con anillo, fase y «Qué hacer»; sigue mostrando los minutos y ofrece el modo concentración', async () => {
  const a = await boot(); await a.click('addExam'); const sid = a.S.subjects.find(s => s.name === 'Catalán').id;
  await a.submit({ subjectId: sid, when: '14', learn: 'auto', amount: 'normal', prep: '0', difficulty: '3', importance: '3', goal: 'notable' });
  const b = a.S.blocks.filter(x => x.status === 'planned' && x.date === '2026-10-14').sort((x, y) => x.start - y.start)[0] ?? a.S.blocks.find(x => x.status === 'planned');
  b.date = '2026-10-14'; await a.click('timerStart', b.id); clock.t += 12 * 60000;
  const h = a.t.V.hoy(); assert.match(h, /class="card timer"/); assert.match(h, /class=ring/); assert.match(h, /12 min/); assert.match(h, /data-a=focusOn/); assert.match(h, /Escribir el guion/);
});
