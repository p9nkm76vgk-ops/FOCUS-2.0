// Versión 8 (núcleo, Node real): archivo .ics, semanas críticas y tema fallado.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIcs } from '../src/core/ics.ts';
import * as G from '../src/core/goals.ts';
import type { Block, Work } from '../src/core/types.ts';

const subs = [{ id: 's1', name: 'Física' }, { id: 's2', name: 'Química, orgánica' }];
const w = (id: string, o: Partial<Work> = {}): Work => ({ id, kind: 'task', subjectId: 's1', title: 'Tarea ' + id, dueDate: '2026-10-20', estMin: 60, difficulty: 3, importance: 3, readiness: 0, status: 'pending', ...o });
const b = (id: string, date: string, start: number, status: Block['status'] = 'planned', o: Partial<Block> = {}): Block => ({ id, workId: 'a', date, start, end: start + 50, status, manual: false, ...o });
const A = { subjects: subs, today: '2026-10-13', stampUtc: '20261013T100000Z' };

test('ics: solo sesiones planificadas futuras + exámenes y entregas con fecha; formato válido, escapado y UID estable', () => {
  const works = [w('a'), w('e', { kind: 'exam', subjectId: 's2', title: 'Parcial; tema 1, 2', dueDate: '2026-10-22', dueMinute: 540 }), w('x', { kind: 'exam', dueDate: '2026-10-25' }), w('u', { noDate: true }), w('d', { status: 'done' }), w('r', { auto: 'review' })];
  const blocks = [b('b1', '2026-10-14', 1000), b('b2', '2026-10-14', 1100, 'done'), b('b3', '2026-10-10', 1000), b('b4', '2026-10-15', 1000, 'skipped')];
  const r = buildIcs({ ...A, blocks, works }); const t = r.text;
  assert.equal(r.count, 4, 'b1 + examen con hora + examen sin hora + entrega a'); assert.ok(t.startsWith('BEGIN:VCALENDAR\r\n') && t.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!/\n(?<!\r\n)/.test(t.replace(/\r\n/g, '')), 'solo CRLF'); assert.match(t, /UID:b1@focusos/); assert.ok(!/UID:b2@|UID:b3@|UID:b4@|UID:u@|UID:d@|UID:r@/.test(t));
  assert.match(t, /DTSTART:20261014T164000/); assert.match(t, /DTEND:20261014T173000/); assert.match(t, /TRIGGER:-PT10M/);
  assert.match(t, /DTSTART:20261022T090000/); assert.match(t, /TRIGGER:-P1D/); assert.match(t, /SUMMARY:EXAMEN · Química\\, orgánica · Parcial\; tema 1\\, 2/);
  assert.match(t, /DTSTART;VALUE=DATE:20261025/); assert.match(t, /DTEND;VALUE=DATE:20261026/);
  for (const l of t.split('\r\n')) assert.ok(l.length <= 75, 'líneas plegadas: ' + l.length);
  assert.equal(buildIcs({ ...A, blocks, works }).text, t, 'determinista: mismo resultado');
  assert.equal(new Set([...t.matchAll(/UID:(\S+)/g)].map(m => m[1])).size, 4, 'UIDs únicos');
});
test('ics: sin nada que exportar, calendario vacío válido', () => { const r = buildIcs({ ...A, blocks: [], works: [] }); assert.equal(r.count, 0); assert.match(r.text, /BEGIN:VCALENDAR[\s\S]*END:VCALENDAR/); });
test('semanas críticas: cuenta exámenes/entregas por semana lunes-domingo y marca las cargadas; ignora repasos, sin fecha, hechos', () => {
  const works = [w('e1', { kind: 'exam', dueDate: '2026-10-20' }), w('e2', { kind: 'exam', dueDate: '2026-10-21' }), w('t1', { dueDate: '2026-10-22' }), w('t2', { dueDate: '2026-10-23' }),
    w('r', { auto: 'review', dueDate: '2026-10-21' }), w('n', { noDate: true, dueDate: '9999-12-31' }), w('h', { dueDate: '2026-10-21', status: 'done' }), w('e3', { kind: 'exam', dueDate: '2026-10-29' })];
  const L = G.weekLoads(works, [b('p', '2026-10-21', 1000), b('q', '2026-10-21', 1100, 'skipped')], '2026-10-13', 4);
  assert.equal(L.length, 4); assert.equal(L[0].from, '2026-10-12'); assert.deepEqual([L[0].exams, L[0].tasks, L[0].flag], [0, 0, false]);
  assert.deepEqual([L[1].from, L[1].exams, L[1].tasks, L[1].flag, L[1].plannedMin], ['2026-10-19', 2, 2, true, 50], '2 exámenes + 2 entregas = cargada; el bloque omitido no cuenta');
  assert.deepEqual([L[2].exams, L[2].flag], [1, false]);
});
test('tema fallado: vuelve a «Visto», pierde repasos acumulados y se repasa mañana', () => {
  const t = { ...G.newTopic('t', 's1', 'Matrices', 3, '2026-09-01'), reviews: 3, next: '2026-12-01' }; const f = G.failedTopic(t, '2026-10-13');
  assert.equal(f.mastery, 1); assert.equal(f.reviews, 0); assert.equal(f.next, '2026-10-14'); assert.equal(f.last, '2026-10-13');
  assert.equal(G.failedTopic(G.newTopic('u', 's1', 'X', 0, '2026-10-13'), '2026-10-13').mastery, 1, 'sin ver también pasa a Visto: salió en el examen');
});
import { plan, DEFAULT_SETTINGS } from '../src/core/planner.ts';
test('«No la haré»: el hueco liberado no se vuelve a rellenar con estudio (cena, descanso)', () => {
  const now = { date: '2026-10-13', minute: 600 }; // martes
  const s = { ...DEFAULT_SETTINGS, availability: { ...DEFAULT_SETTINGS.availability, 2: [{ start: 1275, end: 1320 }] } }; // solo 21:15–22:00
  const work = w('a', { dueDate: '2026-10-13', estMin: 45 });
  const first = plan({ settings: s, works: [work], blocks: [] }, now), blk0 = first.blocks.find(x => x.status === 'planned')!; assert.equal(blk0.date, '2026-10-13');
  const declined = first.blocks.map(x => x.id === blk0.id ? { ...x, status: 'skipped' as const, reason: 'otro' as const } : x);
  const again = plan({ settings: s, works: [work], blocks: declined }, now);
  assert.ok(!again.blocks.some(x => x.status === 'planned' && x.date === '2026-10-13' && x.start < 1320 && x.end > 1275), 'nada en la franja rechazada');
  const sinMotivo = plan({ settings: s, works: [work], blocks: first.blocks.map(x => x.id === blk0.id ? { ...x, status: 'skipped' as const } : x) }, now);
  assert.ok(sinMotivo.blocks.some(x => x.status === 'planned'), 'una omitida sin motivo (hueco incumplido) sí se puede reprogramar');
  assert.deepEqual(plan({ settings: s, works: [work], blocks: again.blocks }, now).created, [], 'idempotente');
});
test('sin sesiones diminutas: tras varios días de estudio real (≈70 % hecho) ninguna sesión planificada baja de 20 min si el trabajo necesita ≥ 60', () => {
  const works: Work[] = [w('e', { kind: 'exam', dueDate: '2026-10-24', estMin: 285 }), w('f', { kind: 'exam', subjectId: 's2', dueDate: '2026-10-26', estMin: 285 })];
  let blocks: Block[] = []; let seed = 3; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; const tiny: string[] = [];
  for (let d = 0; d < 9; d++) {
    const date = new Date(Date.UTC(2026, 9, 13 + d)).toISOString().slice(0, 10), now = { date, minute: 420 };
    blocks = plan({ settings: DEFAULT_SETTINGS, works, blocks }, now).blocks;
    for (const x of blocks.filter(y => y.status === 'planned')) if (x.end - x.start < 20) tiny.push(`${x.date} ${x.end - x.start}`);
    blocks = blocks.map(x => x.date === date && x.status === 'planned' && rnd() < 0.7 ? { ...x, status: 'done' as const, actualMin: x.end - x.start } : x);
  }
  assert.deepEqual(tiny, []);
});
