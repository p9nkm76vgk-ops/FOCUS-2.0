// v13 en la app (DOM SIMULADO): cronómetro que sigue pasada la hora, sin avisos de déficit, fase «comprender», tarjeta de medición.
import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const T0 = new Date(2026, 9, 12, 8, 0).getTime();
test.beforeEach(() => { clock.t = T0 });
const opts = (a, o = {}) => ({ subjectId: a.S.subjects[1].id, when: '1', learn: 'auto', size: '3', difficulty: '3', importance: '3', pace: '1', ...o });

test('cronómetro: al pasar la hora prevista sigue en marcha, la sesión no se cierra y se guardan los minutos reales', async () => {
  const a = await boot(); await a.click('addTask'); await a.submit(opts(a, { when: '0', size: '5' }));
  const b = a.S.blocks.find(x => x.date === '2026-10-12' && x.status === 'planned'); assert.ok(b);
  await a.click('timerStart', b.id); assert.ok(a.S.blocks.find(x => x.id === b.id).running, 'se guarda en el bloque');
  clock.t += (b.end - b.start + 40) * 60000; await a.tick(); const r = await boot(a.store);
  const same = r.S.blocks.find(x => x.id === b.id); assert.equal(same.status, 'planned', 'no se cierra como omitida/reprogramada');
  assert.match(r.t.V.hoy(), /En marcha/); assert.match(r.t.V.hoy(), /de más/, 'avisa de los minutos extra pero sigue contando');
  await r.click('timerEnd'); const done = r.S.blocks.find(x => x.id === b.id); assert.equal(done.status, 'done'); assert.equal(done.actualMin, b.end - b.start + 40); assert.ok(!done.running);
});
test('Hoy nunca muestra avisos de déficit aunque haya más trabajo del que cabe', async () => {
  const a = await boot(); for (let i = 0; i < 4; i++) { await a.click('addTask'); await a.submit(opts(a, { when: '0', size: '5', subjectId: a.S.subjects[i].id })); }
  const h = a.t.V.hoy(); assert.ok(!/No caben|warnOff|déficit/i.test(h));
});
test('examen con poca preparación: primeras sesiones de la fase 1, luego las siguientes (fases por asignatura); tarjeta de medición sin datos inventados', async () => {
  const a = await boot(); await a.click('addExam'); await a.submit({ subjectId: a.S.subjects[0].id, when: '14', learn: 'auto', amount: 'normal', prep: '0', difficulty: '3', importance: '3', goal: 'notable' });
  const w = a.S.works.at(-1), ms = a.S.blocks.filter(x => x.workId === w.id && x.part !== 'review' && x.status === 'planned').sort((x, y) => x.date.localeCompare(y.date) || x.start - y.start);
  assert.ok(ms.length >= 3, 'varias sesiones principales: ' + ms.length);
  const html = a.t.V.cal ? a.t.V.hoy() + a.t.V.cal({}) : '';
  assert.ok(a.t.MET.howFor('Física', undefined, { phase: 'comprender' }).startsWith('Comprender antes de practicar'));
  assert.equal(a.t.MET.phaseFor(20, 0, 5), 'comprender'); assert.equal(a.t.MET.phaseFor(20, 4, 5), 'practicar'); assert.equal(a.t.MET.phaseFor(80, 0, 5), 'practicar', 'con buena preparación no hay fase de comprensión');
  const met = a.t.V.met(); assert.match(met, /¿Te está funcionando\?/); assert.match(met, /aún sin datos/); assert.match(met, /Fases de la preparación del examen/); assert.match(met, /Autopsia de exámenes/);
});

test('horario de clases: se valida, se guarda en el estado y el .ics lleva cada clase con aviso 10 min antes', async () => {
  const a = await boot(); const TT = a.t.TT;
  assert.match(TT.parse('08:00-09:00', 1).err, /usa «08:00-08:55/); assert.match(TT.parse('09:00-08:00 Mates', 1).err, /posterior/);
  assert.match(TT.parse('08:00-09:00 Mates\n08:30-09:30 Física', 1).err, /se solapan/);
  const ok = TT.parse('08:00-08:55 Matemáticas II\n09:05–10:00 Física', 1); assert.equal(ok.list.length, 2); assert.equal(ok.list[1].start, 545);
  a.S.timetable = [...ok.list, ...TT.parse('08:00-08:55 Química', 3).list];
  const r = a.t.ICS.buildIcs({ blocks: [], works: [], subjects: [], classes: a.S.timetable, today: '2026-10-12', stampUtc: '20261012T060000Z' });
  assert.equal(r.count, 3); assert.match(r.text, /SUMMARY:Clase · Matemáticas II/); assert.match(r.text, /RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20270615T235959/);
  assert.match(r.text, /TRIGGER:-PT10M/); assert.match(r.text, /DTSTART:20261012T080000/, 'primer lunes = hoy'); assert.match(r.text, /DTSTART:20261014T080000/, 'primer miércoles');
  assert.deepEqual(TT.next({ date: '2026-10-12', minute: 8 * 60 + 56 }) && { n: TT.next({ date: '2026-10-12', minute: 8 * 60 + 56 }).name }, { n: 'Física' });
});
