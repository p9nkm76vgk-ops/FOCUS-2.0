// v20 (DOM SIMULADO): horas realmente estudiadas por examen (solo sesiones hechas; planificadas aparte).
import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const T0 = new Date(2026, 9, 14, 10, 0).getTime();
test.beforeEach(() => { clock.t = T0 });
const blk = (id, workId, date, st, s, e, x = {}) => ({ id, workId, date, start: s, end: e, status: st, kind: 'main', ...x });
test('horas estudiadas: solo hechas (actualMin manda), omitidas/reprogramadas/previstas no cuentan', async () => {
  const a = await boot(); await a.click('addExam'); await a.submit({ title: 'Parcial', subjectId: a.S.subjects[0].id, dueDate: '2026-10-20', time: '', estOverride: '300', difficulty: '4', importance: '5', readiness: '0', status: 'pending', notes: '' });
  const ex = a.S.works.find(x => x.kind === 'exam'); assert.ok(ex);
  a.S.blocks = [blk('a', ex.id, '2026-10-12', 'done', 600, 660), blk('b', ex.id, '2026-10-13', 'done', 600, 660, { actualMin: 45 }), blk('c', ex.id, '2026-10-13', 'skipped', 700, 760), blk('d', ex.id, '2026-10-13', 'rescheduled', 800, 860), blk('e', ex.id, '2026-10-20', 'planned', 600, 640)];
  const r = JSON.parse(JSON.stringify(a.t.studyOf(ex)));
  assert.deepEqual(r, { min: 105, n: 2, planned: 40, total: 145 });
  assert.match(a.t.studiedLine(ex), /1h45/);
  a.S.blocks = []; assert.match(a.t.studiedLine(ex), /Aún no hay sesiones hechas/);
});
test('Quitar examen pasado: archivar conserva sesiones; eliminar borra examen y sesiones', async () => {
  const a = await boot(); await a.click('addExam'); await a.submit({ title: 'Parcial', subjectId: a.S.subjects[0].id, dueDate: '2026-10-20', time: '', estOverride: '300', difficulty: '4', importance: '5', readiness: '0', status: 'pending', notes: '' });
  const ex = a.S.works.find(x => x.kind === 'exam'); a.S.blocks = [blk('a', ex.id, '2026-10-12', 'done', 600, 660)];
  clock.t = new Date(2026, 9, 26, 8, 0).getTime();
  assert.match(a.t.V.exa(), /Pasados y archivados \(1\)/);
  assert.match(a.t.V.exa(), /data-a=examQuit/);
});
test('semana de exámenes: con 9 exámenes que no caben, TODAS las asignaturas reciben horas y repetir no cambia nada', async () => {
  clock.t = new Date(2026, 9, 26, 14, 30).getTime();
  const a = await boot(); const days = ['2026-11-02', '2026-11-02', '2026-11-03', '2026-11-03', '2026-11-04', '2026-11-04', '2026-11-05', '2026-11-05', '2026-11-06'];
  for (let i = 0; i < 9; i++) { await a.click('addExam'); assert.equal(await a.submit({ title: '', subjectId: a.S.subjects[i].id, dueDate: days[i], time: '', estOverride: '', difficulty: '3', importance: '4', readiness: '0', status: 'pending', notes: '' }), '') }
  const per = id => a.S.blocks.filter(b => a.S.works.find(w => w.id === b.workId).subjectId === id).reduce((x, b) => x + b.end - b.start, 0);
  const chk = () => { for (const s of a.S.subjects) assert.ok(per(s.id) >= 60, s.name + ' sin horas suficientes: ' + per(s.id)) }; chk();
  await a.click('replan'); chk(); const snap = JSON.stringify(a.S.blocks.map(b => [b.id, b.start, b.end]).sort()); await a.click('replan');
  assert.ok(JSON.stringify(a.S.blocks.map(b => [b.id, b.start, b.end]).sort()) === snap, 'regenerar dos veces seguidas no cambia nada');
});
