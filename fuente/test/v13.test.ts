// v13: exámenes antes que entregas; cronómetro en marcha protegido; sin déficit visible.
import test from 'node:test';
import assert from 'node:assert/strict';
import { plan, DEFAULT_SETTINGS } from '../src/core/planner.ts';
import type { Block, Work } from '../src/core/types.ts';

const w = (id: string, o: Partial<Work> = {}): Work => ({ id, kind: 'task', subjectId: 's1', title: id, dueDate: '2026-10-21', estMin: 120, difficulty: 3, importance: 3, readiness: 0, status: 'pending', createdAt: 0, ...o });
const NOW = { date: '2026-10-20', minute: 17 * 60 + 50 }; // martes 17:50
const mins = (bl: Block[], id: string, from = '0') => bl.filter(b => b.workId === id && b.status === 'planned' && b.date >= from).reduce((a, b) => a + b.end - b.start, 0);

test('examen de química pasado mañana va antes que una entrega de catalán más temprana: el examen se cubre primero', () => {
  const works = [w('cat', { subjectId: 's2', dueDate: '2026-10-21', estMin: 240 }), w('qui', { kind: 'exam', subjectId: 's3', dueDate: '2026-10-22', dueMinute: 9 * 60, estMin: 240, importance: 5 })];
  const r = plan({ settings: { ...DEFAULT_SETTINGS, maxDayMin: 180 }, works, blocks: [] }, NOW);
  assert.ok(mins(r.blocks, 'qui') >= 120, 'química recibe la mayor parte de su tiempo: ' + mins(r.blocks, 'qui'));
  const first = r.blocks.filter(b => b.status === 'planned').sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)[0];
  assert.equal(first.workId, 'qui', 'lo primero del calendario es el examen');
  const r2 = plan({ settings: { ...DEFAULT_SETTINGS, maxDayMin: 180 }, works, blocks: r.blocks }, NOW);
  assert.equal(JSON.stringify(r2.blocks), JSON.stringify(r.blocks), 'idempotente');
});

test('cuando no cabe todo, la entrega cede ante el examen (no al revés)', () => {
  const works = [w('cat', { dueDate: '2026-10-21', estMin: 600 }), w('qui', { kind: 'exam', subjectId: 's3', dueDate: '2026-10-22', dueMinute: 9 * 60, estMin: 300, importance: 5 })];
  const r = plan({ settings: DEFAULT_SETTINGS, works, blocks: [] }, NOW);
  assert.ok(mins(r.blocks, 'qui') >= 0.8 * 300 * 1, 'el examen queda cubierto casi entero: ' + mins(r.blocks, 'qui'));
});

test('sesión con cronómetro en marcha: pasada su hora NO se cierra como omitida ni se reprograma', () => {
  const works = [w('a', { estMin: 100 })];
  const run: Block = { id: 'run', workId: 'a', date: '2026-10-20', start: 15 * 60 + 30, end: 16 * 60 + 20, status: 'planned', manual: false, running: 1 };
  const r = plan({ settings: DEFAULT_SETTINGS, works, blocks: [run] }, NOW);
  const b = r.blocks.find(x => x.id === 'run')!;
  assert.equal(b.status, 'planned'); assert.equal(b.running, 1);
  const stopped = plan({ settings: DEFAULT_SETTINGS, works, blocks: [{ ...run, running: undefined }] }, NOW);
  assert.notEqual(stopped.blocks.find(x => x.id === 'run')!.status, 'planned', 'sin cronómetro, la sesión pasada sí se cierra');
});

test('protección de examen: con examen en 2 días, hoy y mañana solo se estudia esa asignatura; una entrega posterior espera', async () => {
  const { examGuard } = await import('../src/core/planner.ts');
  const works = [w('cat', { subjectId: 's2', dueDate: '2026-10-24', estMin: 120 }), w('qui', { kind: 'exam', subjectId: 's3', dueDate: '2026-10-22', dueMinute: 9 * 60, estMin: 240, importance: 5 })];
  const r = plan({ settings: DEFAULT_SETTINGS, works, blocks: [] }, NOW);
  const onGuard = r.blocks.filter(b => b.workId === 'cat' && b.status === 'planned' && b.date <= '2026-10-22');
  assert.equal(onGuard.length, 0, 'catalán no ocupa los días previos al examen');
  assert.ok(mins(r.blocks, 'cat') >= 120, 'pero se hace después del examen (23–24)');
  assert.ok(mins(r.blocks, 'qui') >= 180);
  assert.deepEqual([...examGuard(works, '2026-10-20')], ['s3']); assert.equal(examGuard(works, '2026-10-17').size, 1, 'peso 5: protege 5 días (semana de examen)'); assert.equal(examGuard(works, '2026-10-16').size, 0);
  assert.equal(examGuard([{ ...works[1], importance: 3 }], '2026-10-18').size, 0, 'peso normal: solo 3 días'); assert.equal(examGuard([{ ...works[1], importance: 3 }], '2026-10-19').size, 1); assert.equal(examGuard(works, '2026-10-23').size, 0);
});
test('protección de examen: una entrega que vence mañana sí puede usar su último día', () => {
  const works = [w('cat', { subjectId: 's2', dueDate: '2026-10-21', estMin: 60 }), w('qui', { kind: 'exam', subjectId: 's3', dueDate: '2026-10-22', dueMinute: 9 * 60, estMin: 240, importance: 5 })];
  const r = plan({ settings: DEFAULT_SETTINGS, works, blocks: [] }, NOW);
  assert.equal(r.blocks.filter(b => b.workId === 'cat' && b.date === '2026-10-20').length, 0, 'hoy no');
  assert.ok(mins(r.blocks, 'cat') > 0, 'mañana sí, es su último día');
});
