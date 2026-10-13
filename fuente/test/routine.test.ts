// Rutina semanal habitual + adaptación a obligaciones (unitarias reales en Node).
import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, proposeSchedule, regenerate, DEFAULT_ROUTINE, INTENSITY, mondayOf } from '../src/core/routine.ts';
import { DEFAULT_SETTINGS, addDays } from '../src/core/planner.ts';
import { DEFAULT_SUBJECT_COLORS as C } from '../src/core/palette.ts';
import type { Block, HabitBlock, Routine, Work } from '../src/core/types.ts';

const NOW = { date: '2026-10-12', minute: 480 }; // lunes 08:00
const names = Object.keys(C), subjects = names.map((n, i) => ({ id: 's' + i, name: n, colorKey: n }));
const sid = (n: string) => subjects.find(s => s.name === n)!.id;
const R = (o: Partial<Routine> = {}): Routine => ({ ...DEFAULT_ROUTINE, enabled: true, ...o });
const gen = (o: any = {}) => generate({ settings: DEFAULT_SETTINGS, routine: R(), subjects, works: [], blocks: [], activities: [], habit: [], now: NOW, from: NOW.date, to: addDays(NOW.date, 13), ...o });
const hab = (n: string, date: string, start: number, end: number, o: Partial<HabitBlock> = {}): HabitBlock => ({ id: `hab:${date}:${start}:${sid(n)}`, date, start, end, subjectId: sid(n), kind: 'estudio', title: n, detail: '', status: 'planned', pinned: false, ...o });
const task = (n: string, o: Partial<Work> = {}): Work => ({ id: 'w' + n, kind: 'task', subjectId: sid(n), title: 'Deberes de ' + n, dueDate: '2026-10-13', estMin: 45, difficulty: 3, importance: 3, readiness: 0, status: 'pending', ...o });
const items = (r: { habit: HabitBlock[]; blocks: Block[] }) => [...r.habit.filter(h => h.status === 'planned' || h.status === 'done'), ...r.blocks.filter(b => b.status === 'planned' || b.status === 'done')].map(x => ({ date: x.date, start: x.start, end: x.end, id: x.id }));
const noOverlap = (xs: { date: string; start: number; end: number; id: string }[]) => { for (const a of xs) for (const b of xs) if (a !== b && a.date === b.date) assert.ok(a.end <= b.start || b.end <= a.start, `solape ${a.id} / ${b.id}`); };
const windowsOk = (xs: { date: string; start: number; end: number }[]) => xs.forEach(x => assert.ok((DEFAULT_SETTINGS.availability[new Date(x.date + 'T00:00:00Z').getUTCDay()] ?? []).some(w => w.start <= x.start && x.end <= w.end), `fuera de disponibilidad ${x.date} ${x.start}`));

test('un día sin obligaciones recibe rutina; respeta disponibilidad, pasado, bloqueos y actividades fijas; sin solapes', () => {
  const g = gen({ from: NOW.date, to: NOW.date }); assert.ok(g.length >= 2 && g.length <= INTENSITY.equilibrado.daily + 1); noOverlap(items({ habit: g, blocks: [] })); windowsOk(g);
  const fixed = gen({ routine: R({ fixed: [{ id: 'f', name: 'Inglés particular', days: [1], start: 1020, end: 1140 }] }), from: NOW.date, to: NOW.date });
  assert.ok(fixed.every(h => h.end <= 1020 - 10 || h.start >= 1140 + 10), 'no pisa la actividad fija');
  const blocked = gen({ settings: { ...DEFAULT_SETTINGS, blockedDates: [{ date: NOW.date, start: 0, end: 1440 }] }, from: NOW.date, to: NOW.date }); assert.equal(blocked.length, 0);
  assert.equal(gen({ from: '2026-10-05', to: '2026-10-09' }).length, 0, 'nada en el pasado');
});
test('reparto equilibrado: cuota semanal por asignatura, alternancia entre días y repaso espaciado de una asignatura distinta', () => {
  const g = gen({ from: '2026-10-12', to: '2026-10-18' }); noOverlap(items({ habit: g, blocks: [] })); windowsOk(g);
  const per = (s: string) => g.filter(h => h.subjectId === sid(s) && h.kind === 'estudio').length; for (const n of names) assert.ok(per(n) <= INTENSITY.equilibrado.perWeek, n);
  assert.ok(new Set(g.map(h => h.subjectId)).size >= 6, 'varias asignaturas'); for (let d = 0; d < 6; d++) { const a = new Set(g.filter(h => h.date === addDays('2026-10-12', d) && h.kind === 'estudio').map(h => h.subjectId)), b = g.filter(h => h.date === addDays('2026-10-12', d + 1) && h.kind === 'estudio').map(h => h.subjectId); assert.ok(b.every(x => !a.has(x)) || a.size >= names.length - 1, 'sin repetir asignatura en días consecutivos'); }
  for (const d of ['2026-10-12', '2026-10-13']) { const day = g.filter(h => h.date === d), rev = day.find(h => h.kind === 'repaso'); if (rev) assert.ok(!day.some(h => h.kind === 'estudio' && h.subjectId === rev.subjectId)); }
  assert.equal(gen({ routine: R({ intensity: 'ligero' }), from: NOW.date, to: NOW.date }).length, 1); assert.ok(gen({ routine: R({ intensity: 'exigente' }), from: NOW.date, to: NOW.date }).length >= 3);
  assert.equal(gen({ routine: R({ perWeek: Object.fromEntries(subjects.map(s => [s.id, 0])) }), from: NOW.date, to: NOW.date }).length, 0, 'frecuencia 0 = no se genera');
});
test('sin información del último tema no se inventa temario; con tema indicado se usa; textos genéricos adaptables', () => {
  const g = gen({ from: NOW.date, to: NOW.date }); assert.ok(g.every(h => !h.detail.includes('Tema indicado por ti') && h.detail.length > 20 && h.title.length > 5));
  const t = gen({ routine: R({ lastTopic: Object.fromEntries(subjects.map(s => [s.id, 'La Restauración'])) }), from: NOW.date, to: NOW.date }); assert.ok(t.some(h => h.detail.includes('Tema indicado por ti: La Restauración.')));
  assert.ok(g.some(h => /: \S/.test(h.title) && /Por qué/.test(h.detail)));
});
test('generación idempotente: repetirla no añade nada', () => { const a = gen(), b = gen({ habit: a }); assert.equal(b.length, 0); });
const mon = [hab('Historia de España', '2026-10-12', 1050, 1095), hab('Lengua Castellana', '2026-10-12', 1110, 1155)];
const sched = (o: any = {}) => proposeSchedule({ settings: DEFAULT_SETTINGS, subjects, works: [], blocks: [], activities: [], routine: R(), habit: mon, now: NOW, ...o });
const ghost = (r: { habit: HabitBlock[] }) => r.habit.filter(h => h.date >= NOW.date && (h.status === 'replaced' || h.status === 'displaced'));
test('OBLIGACIONES PRIMERO: los deberes se colocan sin competir con la rutina; no queda ningún bloque «sustituido» ni «sin hueco»; sin solapes; repetir no cambia nada', () => {
  const r = sched({ works: [task('Historia de España')] });
  const wb = r.blocks.filter(b => b.workId === 'wHistoria de España' && b.status === 'planned'); assert.equal(wb.length, 1, 'sin duplicar'); assert.equal(wb[0].end - wb[0].start, 45);
  assert.deepEqual(ghost(r), [], 'nada tachado'); noOverlap(items(r)); windowsOk(items(r)); assert.ok(!r.warnings.some(w => w.type === 'deficit'));
  const again = sched({ works: [task('Historia de España')], blocks: r.blocks, habit: r.habit }); assert.equal(JSON.stringify(again.habit), JSON.stringify(r.habit), 'estable'); assert.equal(JSON.stringify(again.blocks), JSON.stringify(r.blocks));
  const third = sched({ works: [task('Historia de España')], blocks: again.blocks, habit: again.habit }); assert.equal(JSON.stringify(third.habit), JSON.stringify(r.habit));
});
test('los deberes cuentan para la cuota semanal: si hay deberes de Lengua esa semana, la rutina no añade otra clase de Lengua «al lado»', () => {
  const week = (works: Work[]) => { const r = sched({ works, habit: [], routine: R({ perWeek: Object.fromEntries(subjects.map(s => [s.id, s.name === 'Lengua Castellana' ? 2 : 0])) }) }); return r.habit.filter(h => h.subjectId === sid('Lengua Castellana') && h.kind === 'estudio' && h.date <= '2026-10-18').length; };
  const sin = week([]), con = week([task('Lengua Castellana', { dueDate: '2026-10-16', estMin: 45 })]); assert.equal(sin, 2); assert.equal(con, 1, 'los deberes cubren una de las dos sesiones');
});
test('la rutina nunca provoca déficit: con y sin rutina el aviso de falta de tiempo es el mismo', () => {
  const w = [task('Matemáticas II', { kind: 'exam', dueDate: '2026-10-16', estMin: 400 })], on = sched({ works: w }), off = sched({ works: w, routine: R({ enabled: false }), habit: [] });
  const def = (r: { warnings: { type: string; deficitMin?: number }[] }) => r.warnings.filter(x => x.type === 'deficit').map(x => x.deficitMin);
  assert.deepEqual(def(on), def(off)); assert.deepEqual(ghost(on), []); noOverlap(items(on));
});
test('bloques hechos, fijados y manuales nunca se sobrescriben; las obligaciones no pisan lo fijado', () => {
  const pinned = [hab('Historia de España', '2026-10-12', 1050, 1095, { pinned: true }), hab('Matemáticas II', '2026-10-12', 1110, 1155, { status: 'done' })], manual: Block = { id: 'm', workId: 'wFísica', date: '2026-10-12', start: 1170, end: 1230, status: 'planned', manual: true };
  const r = sched({ habit: pinned, blocks: [manual], works: [task('Historia de España'), task('Física', { estMin: 60 })] });
  for (const k of pinned) assert.deepEqual(r.habit.find(h => h.id === k.id), k); assert.deepEqual(r.blocks.find(b => b.id === 'm'), manual); noOverlap(items(r));
});
test('lo omitido y lo ya pasado se conservan como historial; lo demás se vuelve a generar sin duplicar', () => {
  const sk = hab('Física', '2026-10-13', 1050, 1095, { status: 'skipped' }), past = hab('Química', '2026-10-11', 600, 645), r = sched({ habit: [sk, past] });
  assert.deepEqual(r.habit.find(h => h.id === sk.id), sk); assert.deepEqual(r.habit.find(h => h.id === past.id), past);
  assert.equal(new Set(r.habit.map(h => h.id)).size, r.habit.length, 'ids únicos');
});
test('regenerar conserva hechos, fijados, omitidos y sustituidos; es idempotente', () => {
  const base = [hab('Historia de España', '2026-10-12', 1020, 1065, { status: 'done' }), hab('Lengua Castellana', '2026-10-12', 1080, 1125, { pinned: true }), hab('Física', '2026-10-13', 1020, 1065, { status: 'skipped' }), hab('Química', '2026-10-13', 1080, 1125, { status: 'replaced' }), hab('Inglés', '2026-10-14', 1020, 1065)];
  const a = regenerate({ settings: DEFAULT_SETTINGS, routine: R(), subjects, works: [], blocks: [], activities: [], habit: base, now: NOW });
  for (const k of base.slice(0, 4)) assert.deepEqual(a.habit.find(h => h.id === k.id), k); noOverlap(items({ habit: a.habit, blocks: [] }));
  const b = regenerate({ settings: DEFAULT_SETTINGS, routine: R(), subjects, works: [], blocks: [], activities: [], habit: a.habit, now: NOW }); assert.deepEqual(b.habit.map(h => h.id), a.habit.map(h => h.id));
});
test('el lunes puede mezclar rutina y obligaciones sin dos actividades simultáneas (varias semanas)', () => {
  const g = gen({ works: [task('Física', { dueDate: '2026-10-16', estMin: 120 })] }); const r = proposeSchedule({ settings: DEFAULT_SETTINGS, subjects, works: [task('Física', { dueDate: '2026-10-16', estMin: 120 })], blocks: [], activities: [], routine: R(), habit: g, now: NOW }); noOverlap(items(r)); windowsOk(items(r));
});
test('reparto semanal justo: en una semana «equilibrada» (21 bloques) todas las asignaturas aparecen y ninguna acapara estudio ni repasos', () => {
  const g = gen({ from: '2026-10-12', to: '2026-10-18' }), cnt = (n: string, k?: string) => g.filter(h => h.subjectId === sid(n) && (!k || h.kind === k)).length;
  assert.equal(g.length, 21); assert.equal(g.filter(h => h.kind === 'repaso').length, 7);
  for (const n of names) { assert.ok(cnt(n) >= 2 && cnt(n) <= 3, `${n}: ${cnt(n)} bloques`); assert.ok(cnt(n, 'repaso') <= 2, `${n}: repasos ${cnt(n, 'repaso')}`); }
  assert.ok(cnt('Historia de España') >= 2 && cnt('Historia de la Filosofía') >= 2, 'las Historias no quedan fuera');
});
