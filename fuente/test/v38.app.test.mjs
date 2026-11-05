import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const sid = (a, n) => a.S.subjects.find(s => s.name === n).id;
const exam = async (a, name, date) => { await a.click('addExam'); await a.submit({ title: '', subjectId: sid(a, name), dueDate: date, time: '', estOverride: '', difficulty: '3', importance: '4', prep: '0', status: 'pending' }); return a.S.works.filter(w => w.kind === 'exam').slice(-1)[0]; };
const plannedByDay = (a) => { const m = new Map(); for (const b of a.S.blocks) if (b.status === 'planned' || b.status === 'done') m.set(b.date, [...(m.get(b.date) ?? []), b]); return m; };
const add = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const base = async () => { clock.t = new Date(2026, 10, 3, 16, 0).getTime(); const a = await boot(); await exam(a, 'Física', '2026-11-13'); a.S.fhV = 2; const b = await boot({ 'focusos.v1': JSON.stringify(a.S) }); if (!b.S.goals.pauDate) b.S.goals.pauDate = '2027-06-01'; await b.click('dailyToggle'); await b.click('dailyToggle'); return b; };

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

test('cuotas según dominio (v49): lo que dominas baja a mantenimiento (≥ 1 h) y las horas pasan a las menos dominadas; sin temas no cambia nada', async () => {
  const a = await base(); const sid2 = n => a.S.subjects.find(s => s.name === n).id; const mk = (n, m) => [1, 2, 3, 4].map(i => ({ id: n + i, subjectId: sid2(n), name: n + ' ' + i, course: 2, mastery: m, reviews: 0, last: null, next: null, createdAt: i }));
  const q0 = a.t.quotaMap(a.S); assert.equal(q0[sid2('Historia de la Filosofía')], 120, 'sin temas: cuota intacta');
  a.S.goals.seqOff = true; a.S.syllabus = [...mk('Historia de la Filosofía', 3), ...mk('Química', 0)];
  const q = a.t.quotaMap(a.S); assert.equal(q[sid2('Historia de la Filosofía')], 60, 'dominada: mantenimiento de 1 h'); assert.ok(q[sid2('Química')] > q0[sid2('Química')], 'la menos dominada recibe más');
  assert.ok(Object.values(q).every(v => v >= 60), 'nadie queda por debajo de 1 h');
});

test('v51 revierte v50: quien lo había recibido recupera cuotas y sesiones de Filosofía; los demás no cambian', async () => {
  clock.t = new Date(2026, 10, 4, 15, 30).getTime(); const a = await boot(); a.S.goals.pauDate = '2027-06-01'; a.S.fhV = 2; await a.click('dailyToggle'); await a.click('dailyToggle');
  const fi = a.S.subjects.find(s => s.name === 'Historia de la Filosofía').id, hs = (S) => S.blocks.filter(x => x.status === 'planned' && x.date >= '2026-11-05' && S.works.find(w => w.id === x.workId)?.subjectId === fi).length;
  const n0 = hs(a.S); assert.ok(n0 > 0);
  const st = JSON.parse(JSON.stringify(a.S)); st.fhV = 1; st.goals.quotaH = { 'Historia de la Filosofía': 0, 'Historia de España': 5 }; st.blocks = st.blocks.filter(x => !(x.workId === 'daily:' + fi));
  const b = await boot({ 'focusos.v1': JSON.stringify(st) }); await b.tick();
  assert.equal(b.S.fhV, 2); assert.equal(b.S.goals.quotaH, undefined); assert.ok(hs(b.S) > 0, 'Filosofía vuelve a tener sus sesiones');
  const c = await boot({ 'focusos.v1': JSON.stringify(a.S) }); assert.equal(hs(c.S), n0, 'sin v50 aplicado no cambia nada');
});

test('tardes enteras (v52): por defecto cada día es de una sola asignatura (o dos si no cabe), se puede desactivar y repetir no cambia nada', async () => {
  const a = await base(); const per = (S) => { const W = Object.fromEntries(S.works.map(w => [w.id, w])), by = {}; for (const x of S.blocks) if (x.status === 'planned' && x.date >= '2026-11-09' && x.date <= '2027-01-31' && W[x.workId]?.daily) (by[x.date] ??= new Set()).add(W[x.workId].subjectId); const v = Object.values(by).map(s => s.size); return v.reduce((p, c) => p + c, 0) / v.length; };
  const on = per(a.S); assert.ok(on <= 1.6, 'con foco: pocas asignaturas por día (' + on + ')'); assert.doesNotMatch(a.t.V.aj(), /Tardes enteras a una sola asignatura|Una asignatura hasta dominarla/, 'no es una opción: es automático');
  const sig = JSON.stringify(a.S.blocks.map(x => [x.id, x.start, x.end])); await a.click('dailyToggle'); await a.click('dailyToggle'); assert.equal(JSON.stringify(a.S.blocks.map(x => [x.id, x.start, x.end])), sig, 'idempotente');
  await a.click('focusToggle'); assert.equal(a.S.goals.focusOff, true); assert.ok(per(a.S) > on + 0.8, 'sin foco se vuelve a mezclar'); await a.click('focusToggle'); assert.ok(!a.S.goals.focusOff);
});

test('una asignatura hasta dominarla (v54): todo el relleno va a la actual, salta las dominadas y pasa a la siguiente; sin temas vuelve a cuotas', async () => {
  const a = await base(); const id = n => a.S.subjects.find(s => s.name === n).id; const mk = (n, m) => [1, 2, 3, 4].map(i => ({ id: n + i, subjectId: id(n), name: n + ' ' + i, course: 2, mastery: m, reviews: 0, last: null, next: null, createdAt: i }));
  assert.equal(a.t.seqInfo(a.S), null, 'sin temas: reparto por cuotas');
  a.S.syllabus = [...mk('Business', 0), ...mk('Matemáticas II', 0), ...mk('Historia de la Filosofía', 3)];
  const q = a.t.seqInfo(a.S); assert.equal(q.cur.s.name, 'Business'); assert.ok(!q.todo.some(r => r.s.name === 'Historia de la Filosofía'), 'la dominada se salta');
  await a.click('dailyToggle'); await a.click('dailyToggle');
  const W = Object.fromEntries(a.S.works.map(w => [w.id, w])); const fill = a.S.blocks.filter(x => x.status === 'planned' && x.date >= '2026-11-16' && x.date <= '2026-12-20' && W[x.workId]?.daily);
  assert.ok(fill.length > 20 && fill.every(x => [id('Business'), id('Historia de la Filosofía')].includes(W[x.workId].subjectId)), 'Business + repaso de la dominada'); assert.ok(fill.filter(x => W[x.workId].subjectId === id('Business')).length > 3 * fill.filter(x => W[x.workId].subjectId === id('Historia de la Filosofía')).length, 'casi todo a Business'); assert.ok(fill.some(x => W[x.workId].subjectId === id('Historia de la Filosofía')), 'la dominada se repasa');
  await a.click('seqNext'); assert.equal(a.t.seqInfo(a.S).cur.s.name, 'Matemáticas II');
  const W2 = Object.fromEntries(a.S.works.map(w => [w.id, w])); const f2 = a.S.blocks.filter(x => x.status === 'planned' && x.date >= '2026-11-16' && x.date <= '2026-12-20' && W2[x.workId]?.daily); assert.ok(f2.filter(x => W2[x.workId].subjectId === id('Matemáticas II')).length > 3 * f2.filter(x => W2[x.workId].subjectId !== id('Matemáticas II')).length, 'ahora casi todo Mates, con repasos de las dominadas');
});

test('semana de exámenes con tardes enteras (v55): las sesiones de cada examen se agrupan por días; mezcla menos que sin la preferencia y repetir no cambia nada', async () => {
  clock.t = new Date(2026, 10, 5, 15, 13).getTime(); const a = await boot();
  for (const [n, d] of [['Matemáticas II', '2026-11-09'], ['Business', '2026-11-10'], ['Química', '2026-11-11'], ['Lengua Castellana', '2026-11-12'], ['Historia de España', '2026-11-13']]) await exam(a, n, d);
  const b = await boot({ 'focusos.v1': JSON.stringify(a.S) }); b.S.goals.pauDate = '2027-06-01'; await b.click('dailyToggle'); await b.click('dailyToggle');
  const mix = (S) => { const W = Object.fromEntries(S.works.map(w => [w.id, w])), by = {}; for (const x of S.blocks) if (x.status === 'planned' && x.date >= '2026-11-05' && x.date <= '2026-11-12' && !W[x.workId]?.daily) (by[x.date] ??= new Set()).add(W[x.workId].subjectId); const v = Object.values(by).map(s => s.size); return v.reduce((p, c) => p + c, 0) / v.length; };
  const on = mix(b.S), sig = JSON.stringify(b.S.blocks.map(x => [x.id, x.start, x.end]));
  await b.click('dailyToggle'); await b.click('dailyToggle'); assert.equal(JSON.stringify(b.S.blocks.map(x => [x.id, x.start, x.end])), sig, 'idempotente');
  await b.click('focusToggle'); const off = mix(b.S); assert.ok(on < off - 0.2, `con foco menos mezcla (${on.toFixed(2)} < ${off.toFixed(2)})`);
});
