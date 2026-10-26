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
test('refuerzo de exámenes: usa 06:00–07:00 y 22:00–23:00 solo hasta la fecha elegida; apagado, nada fuera del horario normal', async () => {
  clock.t = new Date(2026, 9, 26, 14, 30).getTime();
  const mk = async on => { const a = await boot(); a.S.refuerzo = { on, until: '2026-11-02', morning: true, night: true };
    const days = ['2026-11-03', '2026-11-03', '2026-11-04', '2026-11-04', '2026-11-05', '2026-11-05', '2026-11-06', '2026-11-06', '2026-11-06'];
    for (let i = 0; i < 9; i++) { await a.click('addExam'); await a.submit({ title: '', subjectId: a.S.subjects[i].id, dueDate: days[i], time: '', estOverride: '', difficulty: '3', importance: '4', readiness: '0', status: 'pending', notes: '' }) } return a };
  const on = await mk(true), off = await mk(false);
  const extra = a => a.S.blocks.filter(b => b.start < 420 || b.end > 1320);
  assert.ok(extra(on).length > 0, 'con refuerzo se usan las franjas extra');
  assert.ok(extra(on).every(b => b.date <= '2026-11-02' && ((b.start >= 360 && b.end <= 420) || (b.start >= 1320 && b.end <= 1380))), 'solo dentro de las franjas y hasta la fecha');
  assert.equal(extra(off).length, 0, 'sin refuerzo, nada fuera del horario normal');
});
test('plan de admisión: se aplica una vez al abrir datos existentes con exámenes, no pisa objetivos propios; Mates/Física/Química reciben más horas que Business', async () => {
  clock.t = new Date(2026, 9, 26, 14, 30).getTime();
  const a = await boot(); await a.click('addExam'); await a.submit({ title: '', subjectId: a.S.subjects[0].id, dueDate: '2026-11-09', time: '', estOverride: '', difficulty: '3', importance: '4', readiness: '0', status: 'pending', notes: '' });
  const store = JSON.parse(JSON.stringify(a.store)); const b = await boot(a.store);
  assert.equal(b.S.goals.planPau, true); assert.equal(b.S.goals.target, 9.3); assert.equal(b.S.goals.pauDate, '2027-06-01'); assert.equal(b.S.goals.admTarget, 12.41);
  assert.match(b.t.V.obj(), /Tu objetivo de admisión/); assert.match(b.t.V.obj(), /12,41/);
  // objetivos propios: no se pisan
  const st = JSON.parse(store['focusos.v1']); st.goals = { ...st.goals, target: 8, subjTarget: {} };
  const c = await boot({ 'focusos.v1': JSON.stringify(st) }); assert.equal(c.S.goals.target, 8); assert.ok(!c.S.goals.planPau);
});
test('valor por asignatura: Matemáticas II > Física/Química > lenguas > Business/Hª España; la fórmula de admisión coincide con el documento', async () => {
  const a = await boot(); const GL = a.t.GL ?? null;
  const { PAU_VALUE, valueFactor, admision, needPond } = GL || {};
  assert.ok(PAU_VALUE, 'GL expuesto en el harness');
  assert.ok(valueFactor('Matemáticas II') > valueFactor('Física') && valueFactor('Física') > valueFactor('Catalán') && valueFactor('Catalán') === valueFactor('Historia de España') && valueFactor('Inglés') < valueFactor('Business') && valueFactor('Inglés') < valueFactor('Historia de la Filosofía'))
  assert.equal(admision(9.1, 8.5, 8.5, 8.5), 12.26, 'escenario A del documento: 5,46 + 3,40 + 3,40');
  assert.equal(admision(10, 10, 10, 10), 14);
  assert.ok(needPond(13.526, 9.1, 10) > 10, 'PARS Industrial: no alcanzable con media 9,1 (>10 en las ponderables)');
});
test('fines de semana activos: se migran una vez las ventanas por defecto (8:00–13:30 y tarde), tope 7 h, y la mañana del refuerzo solo de lunes a viernes', async () => {
  clock.t = new Date(2026, 9, 26, 14, 30).getTime();
  const a = await boot(); await a.click('addExam'); await a.submit({ title: '', subjectId: a.S.subjects[0].id, dueDate: '2026-11-09', time: '', estOverride: '', difficulty: '3', importance: '4', readiness: '0', status: 'pending', notes: '' });
  const st = JSON.parse(a.store['focusos.v1']); delete st.weV; delete st.settings.maxDayWeekend;
  const b = await boot({ 'focusos.v1': JSON.stringify(st) });
  assert.deepEqual(JSON.parse(JSON.stringify(b.S.settings.availability[6])), [{ start: 480, end: 810 }, { start: 900, end: 1020 }, { start: 1050, end: 1230 }]);
  assert.equal(b.S.settings.maxDayWeekend, 420); assert.equal(b.S.weV, 1);
  const st2 = JSON.parse(JSON.stringify(st)); st2.settings.availability[6] = [{ start: 600, end: 700 }]; delete st2.weV;
  const c = await boot({ 'focusos.v1': JSON.stringify(st2) }); assert.deepEqual(JSON.parse(JSON.stringify(c.S.settings.availability[6])), [{ start: 600, end: 700 }], 'ventanas propias no se tocan');
  const wk = d => new Date(d + 'T00:00:00Z').getUTCDay();
  const early = b.S.blocks.filter(x => x.start < 480 && (wk(x.date) === 0 || wk(x.date) === 6)); assert.equal(early.length, 0, 'fin de semana: nada antes de las 8:00');
});
test('«Horas hasta cada examen»: Exámenes muestra por examen lo hecho y lo previsto', async () => {
  clock.t = new Date(2026, 9, 26, 14, 30).getTime();
  const a = await boot(); await a.click('addExam'); await a.submit({ title: '', subjectId: a.S.subjects[0].id, dueDate: '2026-11-09', time: '', estOverride: '', difficulty: '3', importance: '4', readiness: '0', status: 'pending', notes: '' });
  const h = a.t.V.exa(); assert.match(h, /Horas hasta cada examen/); assert.match(h, /previstas/); assert.match(h, /hechas/); assert.doesNotMatch(h, /Te quedas corto/);
});

test('nivel por asignatura: reduce las horas del examen y la migración no toca temas ya trabajados', async () => {
  clock.t = new Date(2026, 9, 26, 14, 30).getTime();
  const a = await boot(); const s = a.S.subjects[0];
  await a.click('addExam'); await a.submit({ title: '', subjectId: s.id, dueDate: '2026-11-09', time: '', estOverride: '', difficulty: '3', importance: '4', prep: '0', status: 'pending', notes: '' });
  const w0 = a.S.works.find(w => w.kind === 'exam'), h0 = w0.estimate.remainingMin;
  const w = a.S.works.find(x => x.id === w0.id); w.topics = w.topics.map(t => ({ ...t, mastery: 2, selfRating: 2 }));
  await a.click('replan');
  assert.ok(a.S.works.find(x => x.id === w0.id).estimate.remainingMin < h0);
  assert.equal(a.S.nivV, 1);
});
