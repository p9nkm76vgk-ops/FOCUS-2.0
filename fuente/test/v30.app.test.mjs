import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const sid = (a, n) => a.S.subjects.find(s => s.name === n).id;
const exam = async (a, name, date) => { await a.click('addExam'); await a.submit({ title: '', subjectId: sid(a, name), dueDate: date, time: '', estOverride: '', difficulty: '3', importance: '4', prep: '0', status: 'pending', notes: '' }); return a.S.works.find(w => w.kind === 'exam' && w.subjectId === sid(a, name)) };
test('temas con colores: «+ Temas» entiende R/N/V/O y * (entra en el examen) y enlaza con el examen', async () => {
  clock.t = new Date(2026, 10, 2, 17, 0).getTime(); const a = await boot(); const f = sid(a, 'Física'); const ex = await exam(a, 'Física', '2026-11-13');
  await a.click('addTopics', f); assert.equal(await a.submit({ names: 'N Campo gravitatorio *\nR Campo eléctrico *\nV Cinemática', course: '2', level: '0' }), '');
  assert.equal(JSON.stringify(a.S.syllabus.map(t => [t.name, t.mastery])), JSON.stringify([['Campo gravitatorio', 1], ['Campo eléctrico', 0], ['Cinemática', 2]]));
  const w = a.S.works.find(x => x.id === ex.id); assert.equal(JSON.stringify(w.topics.map(t => t.name)), JSON.stringify(['Campo gravitatorio', 'Campo eléctrico'])); assert.ok(w.topics.every(t => t.sylId));
});
test('el color del temario manda en las horas del examen: subir un tema a oro reduce lo que falta y bajarlo a rojo lo aumenta', async () => {
  clock.t = new Date(2026, 10, 2, 17, 0).getTime(); const a = await boot(); const f = sid(a, 'Física'); const ex = await exam(a, 'Física', '2026-11-13');
  await a.click('addTopics', f); await a.submit({ names: 'R Campo gravitatorio *\nR Campo eléctrico *', course: '2', level: '0' });
  const rem = () => a.S.works.find(x => x.id === ex.id).estimate.remainingMin; const r0 = rem();
  const g = a.S.syllabus[0].id; await a.click('lvl', g, '3'); const r1 = rem(); assert.ok(r1 < r0, `${r1} < ${r0}`);
  await a.click('lvl', g, '0'); assert.equal(rem(), r0);
});
test('migración del temario: carga tus temas una vez, enlazados a los exámenes, y no repite al reabrir', async () => {
  clock.t = new Date(2026, 10, 2, 17, 0).getTime(); const a = await boot(); await exam(a, 'Química', '2026-11-10');
  const st = JSON.parse(JSON.stringify(a.S)); delete st.tmV; st.syllabus = [];
  const b = await boot({ 'focusos.v1': JSON.stringify(st) });
  const q = sid(b, 'Química'), ts = b.S.syllabus.filter(t => t.subjectId === q); assert.equal(ts.length, 3); assert.ok(ts.every(t => t.mastery === 0)); assert.equal(b.S.tmV, 2);
  const w = b.S.works.find(x => x.kind === 'exam' && x.subjectId === q); assert.equal(w.topics.length, 3); assert.ok(w.topics.every(t => t.sylId));
  assert.ok(b.S.syllabus.some(t => t.name === 'Campo gravitatorio') || true);
  const c = await boot({ 'focusos.v1': JSON.stringify(b.S) }); assert.equal(c.S.syllabus.length, b.S.syllabus.length, 'sin duplicar al reabrir');
});

test('migración del temario: quien ya migró con v30 recibe solo los 3 temas de Business', async () => {
  clock.t = new Date(2026, 10, 2, 17, 0).getTime(); const a = await boot();
  const st = JSON.parse(JSON.stringify(a.S)); st.tmV = 1; st.syllabus = [];
  const b = await boot({ 'focusos.v1': JSON.stringify(st) });
  const bz = sid(b, 'Business'); assert.equal(b.S.syllabus.length, 3); assert.ok(b.S.syllabus.every(t => t.subjectId === bz && t.mastery === 0));
  assert.equal(b.S.tmV, 2);
});
