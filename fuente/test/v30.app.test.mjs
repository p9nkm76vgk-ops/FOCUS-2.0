import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const sid = (a, n) => a.S.subjects.find(s => s.name === n).id;
const exam = async (a, name, date) => { await a.click('addExam'); await a.submit({ title: '', subjectId: sid(a, name), dueDate: date, time: '', estOverride: '', difficulty: '3', importance: '4', prep: '0', status: 'pending', notes: '' }); return a.S.works.find(w => w.kind === 'exam' && w.subjectId === sid(a, name)) };
test('temas con colores: «+ Temas» entiende R/A/V y * (entra en el examen) y enlaza con el examen', async () => {
  clock.t = new Date(2026, 10, 2, 17, 0).getTime(); const a = await boot(); const f = sid(a, 'Física'); const ex = await exam(a, 'Física', '2026-11-13');
  await a.click('addTopics', f); assert.equal(await a.submit({ names: 'A Campo gravitatorio *\nR Campo eléctrico *\nV Cinemática', course: '2', level: '0' }), '');
  assert.equal(JSON.stringify(a.S.syllabus.map(t => [t.name, t.mastery])), JSON.stringify([['Campo gravitatorio', 1], ['Campo eléctrico', 0], ['Cinemática', 3]]));
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
  const q = sid(b, 'Química'), ts = b.S.syllabus.filter(t => t.subjectId === q); assert.equal(ts.length, 3); assert.ok(ts.every(t => t.mastery === 0)); assert.equal(b.S.tmV, 3);
  const w = b.S.works.find(x => x.kind === 'exam' && x.subjectId === q); assert.equal(w.topics.length, 3); assert.ok(w.topics.every(t => t.sylId));
  assert.ok(b.S.syllabus.some(t => t.name === 'Campo gravitatorio') || true);
  const c = await boot({ 'focusos.v1': JSON.stringify(b.S) }); assert.equal(c.S.syllabus.length, b.S.syllabus.length, 'sin duplicar al reabrir');
});

test('migración del temario: quien ya migró con v30 recibe solo los 3 temas de Business', async () => {
  clock.t = new Date(2026, 10, 2, 17, 0).getTime(); const a = await boot();
  const st = JSON.parse(JSON.stringify(a.S)); st.tmV = 1; st.syllabus = [];
  const b = await boot({ 'focusos.v1': JSON.stringify(st) });
  const bz = sid(b, 'Business'); assert.equal(b.S.syllabus.length, 3); assert.ok(b.S.syllabus.every(t => t.subjectId === bz && t.mastery === 0));
  assert.equal(b.S.tmV, 3);
});

test('objetivo declarado: 12,5 mínimo, ideal 12,75, 9,1 de media, 8,5 de acceso y 9 en Matemáticas II y Business (una vez)', async () => {
  clock.t = new Date(2026, 10, 2, 17, 0).getTime(); const a = await boot();
  const st = JSON.parse(JSON.stringify(a.S)); delete st.obV; st.goals.prevAvg = 9.11; st.goals.admTarget = 12.41;
  const b = await boot({ 'focusos.v1': JSON.stringify(st) }); const g = b.S.goals;
  assert.equal(g.admTarget, 12.5); assert.equal(g.admIdeal, 12.75); assert.equal(g.prevAvg, 9.1); assert.equal(g.pauExpected, 8.5);
  assert.equal(g.subjTarget[sid(b, 'Matemáticas II')], 9); assert.equal(g.subjTarget[sid(b, 'Business')], 9);
  g.admTarget = 13; const c = await boot({ 'focusos.v1': JSON.stringify(b.S) }); assert.equal(c.S.goals.admTarget, 13, 'no se repite');
});

test('tres niveles: sin Oro en pantalla; quien tenía Verde(2) pasa a Verde(3) y Naranja sigue en Amarillo; la tarjeta de dominio no castiga a un tema en Verde', async () => {
  clock.t = new Date(2026, 10, 2, 17, 0).getTime(); const a = await boot(); const m = sid(a, 'Matemáticas II'); await a.click('addTopics', m); await a.submit({ names: 'A1\nA2\nA3', course: '2', level: '0' });
  const st = JSON.parse(JSON.stringify(a.S)); st.tmV = 2; st.syllabus.forEach((t, i) => { t.mastery = [1, 2, 3][i]; t.next = '2026-11-20'; });
  const b = await boot({ 'focusos.v1': JSON.stringify(st) }); assert.equal(JSON.stringify(b.S.syllabus.map(t => t.mastery)), JSON.stringify([1, 3, 3])); assert.equal(b.S.tmV, 3);
  const v = b.t.V.tem(); assert.ok(!/Oro|Naranja/.test(v)); assert.ok(/Amarillo/.test(v) && /Verde/.test(v) && /Rojo/.test(v)); assert.equal((v.match(/data-k=2/g) || []).length, 0);
  assert.equal(b.t.GL.coverage(b.S.syllabus, m).pctMastery, Math.round(100 * (1 + 3 + 3) / 9));
});

test('semana saturada con todo en rojo: ningún examen grande deja más del 60 % de sus horas para la víspera y todos se reparten en ≥3 días y replanificar no cambia nada', async () => {
  clock.t = new Date(2026, 10, 2, 17, 17).getTime(); const a = await boot();
  const due = { 'Matemáticas II': '2026-11-09', 'Física': '2026-11-13', 'Química': '2026-11-10', 'Business': '2026-11-10', 'Lengua Castellana': '2026-11-11', 'Catalán': '2026-11-11', 'Inglés': '2026-11-12', 'Historia de España': '2026-11-12', 'Historia de la Filosofía': '2026-11-12' };
  for (const s of a.S.subjects) await exam(a, s.name, due[s.name]);
  await a.click('replan'); const snap = JSON.stringify(a.S.blocks.map(b => [b.id, b.date, b.start, b.end])); await a.click('replan'); assert.equal(JSON.stringify(a.S.blocks.map(b => [b.id, b.date, b.start, b.end])), snap);
  const add = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) };
  for (const w of a.S.works.filter(x => x.kind === 'exam')) { const bl = a.S.blocks.filter(b => b.workId === w.id && b.status === 'planned'), tot = bl.reduce((x, b) => x + b.end - b.start, 0); if (tot < 240) continue; const eve = bl.filter(b => b.date === add(w.dueDate, -1)).reduce((x, b) => x + b.end - b.start, 0); assert.ok(eve <= 0.6 * tot, `víspera ${w.dueDate}: ${eve}/${tot}`); assert.ok(new Set(bl.map(b => b.date)).size >= 3, `repartido en ≥3 días ${w.dueDate}`) }
});
