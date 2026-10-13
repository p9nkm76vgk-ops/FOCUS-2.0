// Versión 7 (núcleo, Node real): sin fragmentos, franjas a evitar, aprendizaje de cumplimiento, máximo diario sugerido, dominio→horas de examen y «¿tardaste más o menos?».
import test from 'node:test';
import assert from 'node:assert/strict';
import { plan, DEFAULT_SETTINGS, hourBucket } from '../src/core/planner.ts';
import * as G from '../src/core/goals.ts';
import type { Block, Now, Work } from '../src/core/types.ts';

const now: Now = { date: '2026-10-12', minute: 480 }; // lunes
const task = (id: string, o: Partial<Work> = {}): Work => ({ id, kind: 'task', subjectId: 's1', title: 'T' + id, dueDate: '2026-10-13', estMin: 60, difficulty: 3, importance: 3, readiness: 0, status: 'pending', ...o });
const blk = (id: string, date: string, start: number, status: Block['status'], o: Partial<Block> = {}): Block => ({ id, workId: 'w', date, start, end: start + 50, status, manual: false, ...o });
const settings = (av: Record<number, { start: number; end: number }[]>) => ({ ...DEFAULT_SETTINGS, availability: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], ...av } });

test('sin fragmentos: 60 min en una ventana de 50 se parten en 35 + 25, nunca 50 + 10', () => {
  const r = plan({ settings: settings({ 1: [{ start: 600, end: 650 }], 2: [{ start: 600, end: 650 }] }), works: [task('a')], blocks: [] }, now);
  const l = r.blocks.filter(b => b.status === 'planned').sort((x, y) => x.date.localeCompare(y.date));
  assert.equal(l.reduce((s, b) => s + b.end - b.start, 0), 60); assert.ok(l.every(b => b.end - b.start >= 25), JSON.stringify(l.map(b => b.end - b.start)));
});
test('franja a evitar: con hueco por la mañana y por la noche, la sesión nueva va a la mañana', () => {
  const s = settings({ 1: [{ start: 1200, end: 1260 }, { start: 1020, end: 1080 }], 2: [{ start: 1200, end: 1260 }, { start: 1020, end: 1080 }] });
  const w = [task('a', { estMin: 50, dueDate: '2026-10-14' })];
  const sin = plan({ settings: s, works: w, blocks: [] }, now).blocks.filter(b => b.status === 'planned');
  const con = plan({ settings: s, works: w, blocks: [], avoid: { hours: [hourBucket(1200)], days: [] } }, now).blocks.filter(b => b.status === 'planned');
  assert.ok(con.every(b => hourBucket(b.start) !== 3), 'no usa la franja de las 20:00 si hay otra'); assert.equal(con.reduce((x, b) => x + b.end - b.start, 0), 50);
  assert.equal(sin.length, con.length);
  const again = plan({ settings: s, works: w, blocks: con, avoid: { hours: [3], days: [] } }, now); assert.deepEqual(again.created, [], 'idempotente');
});
test('si no hay otra opción, la franja a evitar se usa igualmente (nunca se pierde capacidad)', () => {
  const s = settings({ 1: [{ start: 1200, end: 1260 }] });
  const r = plan({ settings: s, works: [task('a', { estMin: 50 })], blocks: [], avoid: { hours: [3], days: [] } }, now).blocks.filter(b => b.status === 'planned');
  assert.equal(r.reduce((x, b) => x + b.end - b.start, 0), 50);
});
test('slotStats: pocos datos no evita nada; con muchos fallos por la noche, evita esa franja (y los imprevistos no cuentan)', () => {
  const few = [blk('1', '2026-10-01', 1200, 'skipped')]; const s0 = G.slotStats(few, now.date); assert.equal(s0.avoidHours.length, 0);
  const bs: Block[] = [];
  for (let i = 0; i < 6; i++) bs.push(blk('d' + i, '2026-10-0' + (1 + i), 600, 'done'));                 // mañana: todo hecho
  for (let i = 0; i < 6; i++) bs.push(blk('n' + i, '2026-10-0' + (1 + i), 1250, i < 5 ? 'skipped' : 'done')); // noche: 5 de 6 falladas
  const s1 = G.slotStats(bs, now.date); assert.deepEqual(s1.avoidHours, [3]); assert.equal(s1.total, 12);
  const imp = bs.map(b => b.status === 'skipped' ? { ...b, reason: 'imprevisto' as const } : b); assert.deepEqual(G.slotStats(imp, now.date).avoidHours, [], 'un imprevisto no es culpa de la franja');
  assert.deepEqual(G.slotStats(bs, '2026-10-05').avoidHours, [], 'solo cuenta lo anterior a hoy');
});
test('suggestCap: sube si cumples ≥90 % y llegas al tope; baja si cumples <60 %; sin datos suficientes, nada', () => {
  const mk = (n: number, miss: number) => Array.from({ length: n }, (_, i) => ({ ...blk('c' + i, `2026-10-${String(1 + (i % 4)).padStart(2, '0')}`, 1000 + (i % 3) * 60, i < miss ? 'skipped' : 'done'), end: 1000 + (i % 3) * 60 + 120 }) as Block);
  assert.equal(G.suggestCap(mk(4, 0), now.date, 240), null);
  const up = G.suggestCap(mk(12, 0), now.date, 240); assert.ok(up && up.cap === 270, JSON.stringify(up));
  const dn = G.suggestCap(mk(12, 8), now.date, 240); assert.ok(dn && dn.cap === 210);
  assert.equal(G.suggestCap(mk(12, 0), now.date, 360), null, 'no pasa de 6 h');
});
test('dominio del temario → horas de examen: poco dominio sube, mucho baja; necesita ≥3 temas; se combina con la brecha', () => {
  const t = (id: string, m: 0 | 1 | 2 | 3) => G.newTopic(id, 's1', id, m, '2026-10-12');
  assert.equal(G.masteryFactor([t('a', 0), t('b', 0)], 's1'), null);
  assert.equal(G.masteryFactor([t('a', 0), t('b', 0), t('c', 0)], 's1'), 1.2);
  assert.equal(G.masteryFactor([t('a', 3), t('b', 3), t('c', 3)], 's1'), 0.9);
  const b = G.examBoosts(undefined, [], [t('a', 0), t('b', 0), t('c', 0)], [{ id: 's1' }, { id: 's2' }], now.date); assert.deepEqual(b, { s1: 1.2 });
  const e = (id: string): Work => ({ id, kind: 'exam', subjectId: 's1', title: id, dueDate: '2026-10-26', estMin: 300, difficulty: 3, importance: 3, readiness: 0, status: 'pending' });
  const m = (boost?: Record<string, number>) => plan({ settings: DEFAULT_SETTINGS, works: [e('x')], blocks: [], boost }, now).blocks.filter(x => x.status === 'planned').reduce((s, x) => s + x.end - x.start, 0);
  assert.ok(m({ s1: 1.2 }) > m(), 'más horas con poco dominio');
});
test('«¿tardaste más o menos?»: lo anotado ajusta el ritmo aprendido (más → factor mayor)', () => {
  const mk = (felt?: -1 | 0 | 1): [Work[], Block[]] => { const ws: Work[] = [], bs: Block[] = []; for (let i = 0; i < 4; i++) { ws.push({ ...task('w' + i, { status: 'done', base0: 60, felt }), }); bs.push({ ...blk('b' + i, '2026-10-01', 1000, 'done', { workId: 'w' + i }), end: 1060 }); } return [ws, bs]; };
  const f = (x?: -1 | 0 | 1) => { const [w, b] = mk(x); return G.learnedPace(w, b)['s1']?.factor; };
  assert.ok(f(1)! > f(0)! && f(0)! > f(-1)!, `${f(-1)} < ${f(0)} < ${f(1)}`);
});
