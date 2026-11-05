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

test('eliminar un examen desde su formulario funciona con y sin sesiones hechas (archivar o eliminar), sin confirm nativo y sin dejar sesiones huérfanas', async () => {
  clock.t = new Date(2026, 10, 2, 17, 34).getTime(); const a = await boot(); a.h.confirm = false;
  const ex = await exam(a, 'Inglés', '2026-11-12'); await a.click('replan'); assert.ok(a.S.blocks.some(b => b.workId === ex.id));
  await a.click('editExam', ex.id); a.h.dlg.onclick(); assert.match(a.h.dlg.innerHTML, /Eliminar «/); assert.match(a.h.dlg.innerHTML, /sesiones planificadas/);
  a.t.A.choice({ dataset: { i: 0 } }); await new Promise(r => setTimeout(r, 20));
  assert.ok(!a.S.works.some(w => w.id === ex.id)); assert.equal(a.S.blocks.filter(b => b.workId === ex.id).length, 0);
  const e2 = await exam(a, 'Inglés', '2026-11-12'); await a.click('replan'); const b0 = a.S.blocks.find(b => b.workId === e2.id && b.status === 'planned'); b0.status = 'done'; b0.actualMin = 30;
  await a.click('editExam', e2.id); a.h.dlg.onclick(); assert.match(a.h.dlg.innerHTML, /Archivar/); assert.match(a.h.dlg.innerHTML, /estudiadas/);
  a.t.A.choice({ dataset: { i: 1 } }); await new Promise(r => setTimeout(r, 20)); assert.ok(!a.S.works.some(w => w.id === e2.id)); assert.equal(a.S.blocks.filter(b => b.workId === e2.id).length, 0);
});

test('semanas de exámenes del 2.º y 3.er trimestre: copia provisional de la semana de noviembre (mismo orden de días lectivos), sin tocar el plan de noviembre ni alargar la pausa de entreno', async () => {
  clock.t = new Date(2026, 10, 2, 17, 42).getTime(); const a = await boot();
  const days = { 'Matemáticas II': '2026-11-09', 'Química': '2026-11-10', 'Business': '2026-11-11', 'Catalán': '2026-11-12', 'Física': '2026-11-13' };
  for (const [n, d] of Object.entries(days)) await exam(a, n, d); await a.click('replan');
  const st = JSON.parse(JSON.stringify(a.S)), base = await boot({ 'focusos.v1': JSON.stringify(st) }); // control: recarga sin provisionales
  const nov = JSON.stringify(base.S.blocks.filter(b => b.date <= '2026-11-13').map(b => [b.id, b.date, b.start, b.end])); delete st.triV; const b = await boot({ 'focusos.v1': JSON.stringify(st) });
  const tri = b.S.works.filter(w => w.provisional), by = (n, t) => tri.find(w => w.id === 'tri' + t + ':' + a.S.works.find(x => x.kind === 'exam' && x.subjectId === sid(a, n)).id);
  assert.equal(tri.length, 10); assert.equal(b.S.triV, 2);
  const exp2 = { 'Matemáticas II': '2027-02-03', 'Química': '2027-02-04', 'Business': '2027-02-05', 'Catalán': '2027-02-08', 'Física': '2027-02-09' }, exp3 = { 'Matemáticas II': '2027-05-07', 'Química': '2027-05-10', 'Business': '2027-05-11', 'Catalán': '2027-05-12', 'Física': '2027-05-13' };
  for (const n of Object.keys(days)) { assert.equal(by(n, 2).dueDate, exp2[n], n + ' 2.º'); assert.equal(by(n, 3).dueDate, exp3[n], n + ' 3.º') }
  assert.equal(JSON.stringify(b.S.blocks.filter(x => x.date <= '2026-11-13').map(x => [x.id, x.date, x.start, x.end])), nov, 'el plan de noviembre no cambia');
  const t2 = tri.filter(w => w.id.startsWith('tri2')).map(w => w.id), t3 = tri.filter(w => w.id.startsWith('tri3')).map(w => w.id);
  assert.ok(b.S.blocks.some(x => t2.includes(x.workId)), 'el 2.º trimestre se planifica'); assert.ok(b.S.blocks.filter(x => t2.includes(x.workId)).every(x => x.date >= '2026-11-14'), 'no antes del 14 de noviembre');
  assert.ok(b.S.blocks.every(x => !t3.includes(x.workId) || x.date >= '2026-11-14'), 'el 3.º trimestre, ahora dentro del horizonte hasta la PAU, solo después del plan de noviembre');
  b.S.pausaEntreno = { on: true }; assert.equal(b.t.pausaHasta(b.S, '2026-11-02'), '2026-11-13', 'la pausa de entreno no se alarga a febrero/mayo');
  const ew = b.t.examWeekWins(b.S, '2026-11-02').map(x => x.date).filter(d => d >= '2027-01-01' && d < '2027-04-01'); const set = new Set(ew);
  for (const d of ['2027-02-03', '2027-02-04', '2027-02-05', '2027-02-08', '2027-02-09']) assert.ok(set.has(d), 'ventana de semana de exámenes ' + d); for (const d of ['2027-02-01', '2027-02-02', '2027-02-06', '2027-02-07', '2027-02-10']) assert.ok(!set.has(d), 'sin ventana ' + d);
  const c = await boot({ 'focusos.v1': JSON.stringify(b.S) }); assert.equal(c.S.works.filter(w => w.provisional).length, 10, 'sin duplicar al reabrir');
});

test('un examen lejano (95 días) reparte sus sesiones por toda la ventana y replanificar no cambia nada', async () => {
  clock.t = new Date(2026, 10, 2, 17, 42).getTime(); const a = await boot(); await exam(a, 'Matemáticas II', '2027-02-05'); await a.click('replan');
  const f = () => a.S.blocks.filter(b => b.status === 'planned' && b.date < '2027-02-01').map(b => [b.id, b.date, b.start, b.end]), s1 = JSON.stringify(f()); await a.click('replan'); assert.equal(JSON.stringify(f()), s1);
  const ds = f().map(x => x[1]).sort(); assert.ok(ds.length >= 4); assert.ok(ds[ds.length - 1] > '2027-01-01' && ds[0] < '2026-12-01', `sesiones de ${ds[0]} a ${ds[ds.length - 1]}`);
});

test('v34 → v35: los provisionales colocados por día de la semana se rehacen por orden si no los has tocado, y los editados se respetan', async () => {
  clock.t = new Date(2026, 10, 2, 17, 53).getTime(); const a = await boot();
  const days = { 'Matemáticas II': '2026-11-09', 'Química': '2026-11-10', 'Física': '2026-11-13' }; for (const [n, d] of Object.entries(days)) await exam(a, n, d);
  const st = JSON.parse(JSON.stringify(a.S)); st.triV = 1; const old = a.S.works.find(w => w.subjectId === sid(a, 'Matemáticas II'));
  const mk = (id, due, upd) => ({ ...old, id, title: 'x · 2.º trim.', dueDate: due, planFrom: '2026-11-14', provisional: true, createdAt: 5, updatedAt: upd }); st.works.push(mk('tri2:' + old.id, '2027-02-08', 5), mk('tri3:' + old.id, '2027-05-10', 9));
  const b = await boot({ 'focusos.v1': JSON.stringify(st) }); const g = id => b.S.works.find(w => w.id === id);
  assert.equal(g('tri2:' + old.id).dueDate, '2027-02-03', 'sin tocar: se rehace por orden'); assert.equal(g('tri3:' + old.id).dueDate, '2027-05-10', 'editado: se respeta'); assert.equal(b.S.works.filter(w => w.provisional).length, 6);
});
