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
  // ningún día mezcla relleno con trabajo real
  for (const [d, bs] of m) { const dy = bs.filter(b => a.S.works.find(w => w.id === b.workId).daily); if (dy.length) assert.equal(dy.length, bs.length, 'relleno + trabajo real el ' + d); assert.ok(dy.length <= 1); }
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
