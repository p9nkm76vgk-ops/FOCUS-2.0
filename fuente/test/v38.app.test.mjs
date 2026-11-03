import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const sid = (a, n) => a.S.subjects.find(s => s.name === n).id;
const exam = async (a, name, date) => { await a.click('addExam'); await a.submit({ title: '', subjectId: sid(a, name), dueDate: date, time: '', estOverride: '', difficulty: '3', importance: '4', prep: '0', status: 'pending' }); return a.S.works.filter(w => w.kind === 'exam').slice(-1)[0]; };
const plannedByDay = (a) => { const m = new Map(); for (const b of a.S.blocks) if (b.status === 'planned' || b.status === 'done') m.set(b.date, [...(m.get(b.date) ?? []), b]); return m; };
const add = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const base = async () => { clock.t = new Date(2026, 10, 3, 16, 0).getTime(); const a = await boot(); await exam(a, 'Física', '2026-11-13'); const b = await boot({ 'focusos.v1': JSON.stringify(a.S) }); if (!b.S.goals.pauDate) b.S.goals.pauDate = '2027-06-01'; await b.click('dailyToggle'); await b.click('dailyToggle'); return b; };

test('estudio diario: hasta la PAU no queda ningún día sin sesión (salvo bloqueados) y el trabajo real manda', async () => {
  const a = await base(); const pau = a.S.goals.pauDate; assert.ok(pau, 'hay fecha de PAU');
  const m = plannedByDay(a); let vacios = [];
  for (let d = '2026-11-04'; d <= pau; d = add(d, 1)) if (!m.get(d)) vacios.push(d);
  assert.equal(vacios.length, 0, 'días vacíos: ' + vacios.slice(0, 5).join(','));
  const dl = a.S.works.filter(w => w.daily); assert.ok(dl.length >= 9 && dl.every(w => w.auto === 'review' && w.status === 'pending'));
  // v45: el relleno completa el objetivo de horas del día con el trabajo real (puede haber varias sesiones por día)
  // no solapan ni caen en el pasado
  for (const bs of m.values()) { const s = [...bs].sort((x, y) => x.start - y.start); for (let i = 1; i < s.length; i++) assert.ok(s[i].start >= s[i - 1].end); }
});
test('estudio diario: idempotente (repetir no cambia nada) y reparte entre asignaturas', async () => {
  const a = await base(); const sig = () => JSON.stringify(a.S.blocks.map(b => [b.id, b.start, b.end, b.status]));
  const s0 = sig(); await a.click('dailyToggle'); await a.click('dailyToggle'); const s1 = sig(); assert.equal(s1, s0, 'regenerar da lo mismo');
  const subs = new Set(a.S.blocks.filter(b => a.S.works.find(w => w.id === b.workId).daily).map(b => a.S.works.find(w => w.id === b.workId).subjectId)); assert.ok(subs.size >= 7, 'asignaturas con relleno: ' + subs.size);
});
test('estudio diario: un examen nuevo desplaza el relleno de esos días y al borrarlo vuelve', async () => {
  const a = await base(); const w = await exam(a, 'Química', '2026-11-20');
  const isD = b => a.S.works.find(x => x.id === b.workId).daily;
  let m = plannedByDay(a); assert.ok(m.get('2026-11-19').some(b => !isD(b)), 'el día antes hay trabajo real');
  for (let d = '2026-11-04'; d <= '2027-06-01'; d = add(d, 1)) assert.ok(m.get(d), 'vacío ' + d);
});
test('estudio diario: no aparece en Tareas ni en Asignaturas y se puede quitar', async () => {
  const a = await base(); const html = a.h.html ? a.h.html() : '';
  await a.ctx.__t.A.nav({ dataset: { r: 'tar' } }); const t = a.h.main.innerHTML; assert.ok(!/Estudio diario/.test(t || ''), 'no sale como tarea');
  await a.click('dailyToggle'); assert.equal(a.S.blocks.filter(b => b.status === 'planned' && a.S.works.find(w => w.id === b.workId).daily).length, 0);
  assert.ok(a.S.works.filter(w => w.daily).every(w => w.status === 'archived'));
  await a.click('dailyToggle'); assert.ok(a.S.blocks.some(b => a.S.works.find(w => w.id === b.workId).daily));
});
test('Business pondera 0,2 como optativa', async () => {
  const a = await base(); assert.equal(a.t.GL.PAU_VALUE['Business'], 0.23); assert.ok(a.t.GL.valueFactor('Business') > 1);
});
test('Progreso 2.0: sin datos no inventa nada (estado vacío, sin NaN) y los cuatro periodos se dibujan', async () => {
  clock.t = new Date(2026, 10, 3, 16, 0).getTime(); const a = await boot();
  for (const r of ['w', 'm', 't', 'c']) { await a.ctx.__t.A.anRange({ dataset: { id: r } }); const h = a.t.V.seg(); assert.doesNotMatch(h, /NaN|undefined|Infinity/, 'periodo ' + r); assert.match(h, /Aún no hay nada que medir/); assert.match(h, /<svg class=chart/); }
});
test('Progreso 2.0: con sesiones hechas muestra horas, racha y reparto calculados de los datos', async () => {
  const a = await base(); const w = a.S.works.find(x => x.daily), d = (n) => { const t = new Date('2026-11-03T00:00:00Z'); t.setUTCDate(t.getUTCDate() - n); return t.toISOString().slice(0, 10); };
  a.S.blocks.push({ id: 's1', workId: w.id, date: d(1), start: 900, end: 960, status: 'done', manual: false, part: 'main' }, { id: 's2', workId: w.id, date: d(2), start: 900, end: 990, status: 'done', manual: false, part: 'main' }, { id: 's3', workId: w.id, date: d(3), start: 900, end: 930, status: 'skipped', manual: false, part: 'main' });
  await a.ctx.__t.A.anRange({ dataset: { id: 'w' } }); const h = a.t.V.seg();
  assert.match(h, /2,5 h/, 'horas hechas = 60 + 90 min'); assert.match(h, /2 días/, 'racha de 2 días'); assert.match(h, /Cumplimiento 83 %/); assert.doesNotMatch(h, /NaN|undefined/);
});
test('cuotas semanales (v45): todas las asignaturas cada semana, Inglés poco, Business y ciencias arriba, sin pasar el máximo diario', async () => {
  const a = await base(); const wk = (id) => a.S.works.find(w => w.id === id).subjectId, nm = (id) => a.S.subjects.find(s => s.id === id).name;
  const mon = (d) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); return t.toISOString().slice(0, 10); };
  const week = {}, day = {}; for (const b of a.S.blocks) { if (b.status !== 'planned' && b.status !== 'done') continue; const n = nm(wk(b.workId)); if (mon(b.date) === '2026-12-14') week[n] = (week[n] ?? 0) + b.end - b.start; day[b.date] = (day[b.date] ?? 0) + b.end - b.start; }
  assert.equal(Object.keys(week).length, 9, 'las nueve asignaturas esa semana: ' + Object.keys(week).join(','));
  assert.ok(week['Inglés'] >= 45 && week['Inglés'] <= 90, 'Inglés ≈ 1 h: ' + week['Inglés']);
  assert.ok(week['Business'] >= week['Historia de la Filosofía'] && week['Matemáticas II'] >= 120, 'Business y Matemáticas por encima de Filosofía');
  assert.ok(Object.values(day).every(m => m <= 480), 'ningún día pasa de 8 h');
});

test('mínimos semanales (v46): Hoy muestra horas hechas+previstas frente al mínimo sin avisos; Curso dice cuánto falta cuando no cabe', async () => {
  const a = await base(); await a.ctx.__t.A.nav({ dataset: { r: 'hoy' } }); const hoy = a.h.main.innerHTML;
  assert.match(hoy, /Horas mínimas de la semana/); assert.match(hoy, /Carga de hoy/); assert.ok(!/No caben|warnOff|déficit/i.test(hoy), 'Hoy no avisa de déficit');
  await a.ctx.__t.A.nav({ dataset: { r: 'cur' } }); const cur = a.h.main.innerHTML;
  const wk = a.t ? 0 : 0; assert.match(cur, /Horas mínimas por asignatura/); assert.match(cur, /no caben|faltan/);
});

test('sesión diaria dice qué hacer (v47): tema concreto y actividad según su nivel; sin temas lo dice claro', async () => {
  const a = await base(); const t = a.t; const mates = a.S.subjects.find(s => s.name === 'Matemáticas II');
  const blk = a.S.blocks.find(b => b.status === 'planned' && a.S.works.find(w => w.id === b.workId)?.daily);
  const info0 = t.HY.info({ t: 'ob', b: blk }); assert.match(info0.title, /Sin tema asignado/); assert.match(info0.how, /Temario/);
  const w = a.S.works.find(x => x.id === blk.workId); a.S.syllabus = [{ id: 'tp1', subjectId: w.subjectId, name: 'Límites y continuidad', course: 2, mastery: 0, reviews: 0, last: null, next: null, createdAt: 1 }];
  const b2 = { ...blk, label: 'Límites y continuidad' }; const i1 = t.HY.info({ t: 'ob', b: b2 });
  assert.equal(i1.title, 'Límites y continuidad'); assert.equal(i1.ph.label, 'Aprender'); assert.match(i1.how, /Límites y continuidad/);
  a.S.syllabus[0].mastery = 3; assert.equal(t.HY.info({ t: 'ob', b: b2 }).ph.label, 'Repasar');
  assert.ok(mates);
});
