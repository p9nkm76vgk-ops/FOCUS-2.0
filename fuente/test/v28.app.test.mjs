// v28 (DOM SIMULADO): entreno diario de 1 hora (17:00–18:00), 30 min en la semana de exámenes, sin pausa y con aviso en el Calendario.
import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const addEx = async (a, n, days) => { for (let i = 0; i < n; i++) { await a.click('addExam'); await a.submit({ title: '', subjectId: a.S.subjects[i].id, dueDate: days[i], time: '', estOverride: '', difficulty: '3', importance: '4', prep: '0', status: 'pending', notes: '' }) } };
test('entreno 1 h: 17:00–18:00 libre cada día; en la semana de exámenes 17:00–17:30 y 17:30–18:00 se estudia', async () => {
  clock.t = new Date(2026, 9, 31, 10, 0).getTime();
  const a = await boot(); await addEx(a, 5, ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']); await a.click('replan');
  assert.equal(a.t.ejFin(a.S, '2026-11-04'), 1080); assert.equal(a.t.ejFin(a.S, '2026-11-10'), 1050); assert.equal(a.t.ejFin(a.S, '2026-11-14'), 1080);
  const pl = a.S.blocks.filter(b => b.status === 'planned');
  assert.equal(pl.filter(b => b.date < '2026-11-09' && b.start < 1080 && b.end > 1020).length, 0, 'nada encima del entreno de 1 h');
  assert.equal(pl.filter(b => b.date >= '2026-11-09' && b.date <= '2026-11-13' && b.start < 1050 && b.end > 1020).length, 0, 'los 30 min de entreno se respetan');
  assert.ok(pl.some(b => b.date >= '2026-11-09' && b.date <= '2026-11-13' && b.start < 1080 && b.end > 1050), 'de 17:30 a 18:00 se estudia en la semana de exámenes');
  assert.match(a.t.V.cal(), /Entreno/);
  const ics = a.t.ICS.buildIcs({ blocks: [], works: [], subjects: [], today: '2026-10-31', stampUtc: '20261031T090000Z', training: a.t.entrenoDias(a.S, '2026-10-31', 28) });
  assert.match(ics.text, /SUMMARY:Entreno · 60 min/); assert.match(ics.text, /SUMMARY:Entreno · 30 min/); assert.match(ics.text, /DTSTART:20261102T170000/);
});
test('migración v28: quita la pausa y mueve las ventanas de las 17:30/17:40 a las 18:00, una sola vez', async () => {
  const a = await boot(); const st = JSON.parse(a.store['focusos.v1']), S0 = st.state ?? st;
  S0.trV = 1; S0.pausaEntreno = { on: true }; S0.settings.availability[1] = [{ start: 1050, end: 1230 }]; S0.settings.availability[2] = [{ start: 1060, end: 1230 }]; S0.settings.availability[3] = [{ start: 930, end: 1020 }, { start: 1050, end: 1230 }];
  const b = await boot({ 'focusos.v1': JSON.stringify(st) });
  assert.equal(b.S.trV, 2); assert.equal(b.S.pausaEntreno.on, false);
  assert.equal(JSON.stringify(b.S.settings.availability[1]), JSON.stringify([{ start: 1080, end: 1230 }]));
  assert.equal(JSON.stringify(b.S.settings.availability[2]), JSON.stringify([{ start: 1080, end: 1230 }]));
  assert.equal(JSON.stringify(b.S.settings.availability[3]), JSON.stringify([{ start: 930, end: 1020 }, { start: 1080, end: 1230 }]));
});
