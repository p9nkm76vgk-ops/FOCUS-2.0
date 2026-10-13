// Versión 5: tareas SIN fecha en el planificador, frecuencia de rutina hasta 7/semana, estimaciones por opciones (unitarias reales en Node).
import test from 'node:test';
import assert from 'node:assert/strict';
import { plan, priority, capacityFor, isUndated, NO_DATE, UNDATED_SPAN, DEFAULT_SETTINGS, weekday, addDays } from '../src/core/planner.ts';
import { reestimate, PARAMS } from '../src/core/estimator.ts';
import { generate, DEFAULT_ROUTINE, mondayOf } from '../src/core/routine.ts';
import { DEFAULT_SUBJECT_COLORS as C } from '../src/core/palette.ts';
import type { Block, Now, Work } from '../src/core/types.ts';

const now: Now = { date: '2026-10-12', minute: 480 }; // lunes 08:00
const T0 = Date.parse('2026-10-12T00:00:00Z');
const und = (id: string, o: Partial<Work> = {}): Work => ({ id, kind: 'task', subjectId: 'fis', title: 'Pendiente ' + id, dueDate: NO_DATE, noDate: true, createdAt: T0, estMin: 120, difficulty: 3, importance: 3, readiness: 0, status: 'pending', ...o });
const dated = (id: string, o: Partial<Work> = {}): Work => ({ id, kind: 'task', subjectId: 'mat', title: 'Con fecha ' + id, dueDate: '2026-10-14', estMin: 120, difficulty: 3, importance: 3, readiness: 0, status: 'pending', ...o });
const run = (works: Work[], blocks: Block[] = [], n = now) => plan({ settings: DEFAULT_SETTINGS, works, blocks }, n);
const live = (bs: Block[]) => bs.filter(b => b.status === 'planned');
const sum = (bs: Block[]) => bs.reduce((a, b) => a + b.end - b.start, 0);

test('sin fecha: se planifica entera dentro de los próximos días, en disponibilidad, sin pasado y sin superar el tope diario', () => {
  const r = run([und('a')]); const bs = live(r.blocks);
  assert.equal(sum(bs), 120); assert.equal(r.warnings.length, 0, 'sin avisos de atraso: no es una tarea atrasada');
  const last = addDays(now.date, UNDATED_SPAN - 1);
  for (const b of bs) { assert.ok(b.date >= now.date && b.date <= last, b.date); assert.ok(b.date > now.date || b.start >= now.minute); assert.ok((DEFAULT_SETTINGS.availability[weekday(b.date)] ?? []).some(w => w.start <= b.start && b.end <= w.end)); }
  const per = new Map<string, number>(); for (const b of bs) per.set(b.date, (per.get(b.date) ?? 0) + b.end - b.start); for (const m of per.values()) assert.ok(m <= DEFAULT_SETTINGS.maxDayMin);
});
test('sin fecha: se reparte en días distintos (los menos cargados), no se concentra', () => {
  const r = run([und('a', { estMin: 240 })]); const days = new Set(live(r.blocks).map(b => b.date));
  assert.ok(days.size >= 3, 'reparte en varios días: ' + [...days].join(','));
});
test('sin fecha: es idempotente y no duplica al repetir ni al avanzar el reloj dentro del mismo día', () => {
  const w = [und('a'), und('b', { importance: 5 }), dated('c')]; const r1 = run(w); const r2 = run(w, r1.blocks); assert.equal(JSON.stringify(r2.blocks), JSON.stringify(r1.blocks)); assert.equal(r2.created.length, 0); assert.equal(r2.removed.length, 0);
  const r3 = run(w, r2.blocks, { date: now.date, minute: 600 }); assert.equal(new Set(r3.blocks.map(b => b.id)).size, r3.blocks.length); assert.equal(sum(live(r3.blocks).filter(b => b.workId === 'a')), 120);
});
test('lo urgente va antes: una tarea con fecha próxima no pierde su hueco frente a una sin fecha', () => {
  const r = run([und('a', { estMin: 600, importance: 5 }), dated('c', { estMin: 180, dueDate: '2026-10-13' })]);
  assert.equal(sum(live(r.blocks).filter(b => b.workId === 'c')), 180); assert.ok(live(r.blocks).filter(b => b.workId === 'c').every(b => b.date <= '2026-10-13'));
  assert.ok(sum(live(r.blocks).filter(b => b.workId === 'a')) > 0, 'la tarea sin fecha también se coloca');
});
test('sin fecha: la importancia manda; la más importante se coloca antes en el calendario', () => {
  const r = run([und('baja', { importance: 1, estMin: 300 }), und('alta', { importance: 5, estMin: 300 })]); const first = (id: string) => live(r.blocks).filter(b => b.workId === id).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)[0];
  const a = first('alta'), b = first('baja'); assert.ok(a.date < b.date || (a.date === b.date && a.start <= b.start), `alta ${a.date} ${a.start} / baja ${b.date} ${b.start}`);
  assert.ok(priority(und('x', { importance: 5 }), now) > priority(und('y', { importance: 1 }), now));
});
test('sin fecha: cuanto más tiempo esperan, más prioridad ganan (sin pasar de un tope)', () => {
  const young = und('y', { createdAt: T0 }), old = und('o', { createdAt: T0 - 10 * 864e5 });
  assert.ok(priority(old, now) > priority(young, now)); assert.ok(priority(und('v', { createdAt: T0 - 400 * 864e5 }), now) < 40, 'acotado');
  assert.ok(priority(und('a', { importance: 5 }), now) >= 17, 'una pendiente importante cuenta como prioridad alta');
});
test('sin fecha: completar o archivar retira sus sesiones futuras; reabrir las vuelve a generar; no se toca lo hecho ni lo manual', () => {
  const w = und('a'); const r1 = run([w]); const first = live(r1.blocks)[0];
  const withDone = r1.blocks.map(b => b.id === first.id ? { ...b, status: 'done' as const } : b); const manual: Block = { id: 'man:1', workId: 'a', date: '2026-10-20', start: 1020, end: 1070, status: 'planned', manual: true };
  const r2 = run([{ ...w, status: 'done' }], [...withDone, manual]); assert.equal(live(r2.blocks).filter(b => !b.manual).length, 0); assert.ok(r2.blocks.some(b => b.id === first.id && b.status === 'done')); assert.ok(r2.blocks.some(b => b.id === 'man:1'));
  const r3 = run([{ ...w, status: 'pending' }], r2.blocks); assert.equal(sum(live(r3.blocks).filter(b => b.workId === 'a')) + sum(r3.blocks.filter(b => b.workId === 'a' && b.status === 'done')), 120);
});
test('sin fecha: si no cabe, se avisa con el déficit real (no se finge)', () => {
  const s = { ...DEFAULT_SETTINGS, maxDayMin: 30 }; const r = plan({ settings: s, works: [und('a', { estMin: 3000 })], blocks: [] }, now);
  const d = r.warnings.find(x => x.type === 'deficit'); assert.ok(d && d.deficitMin! > 0 && /sin fecha/.test(d.message)); assert.equal(sum(live(r.blocks)) + d!.deficitMin!, 3000);
});
test('capacidad de una tarea sin fecha usa la ventana móvil, no el horizonte entero', () => {
  const c = capacityFor(DEFAULT_SETTINGS, [], now, und('a')), h = capacityFor(DEFAULT_SETTINGS, [], now, dated('d', { dueDate: addDays(now.date, 27) })); assert.ok(c.freeMin > 0 && c.freeMin < h.freeMin);
  assert.ok(isUndated(und('a')) && !isUndated(dated('d')) && isUndated({ dueDate: NO_DATE }));
});
test('compatibilidad: el valor centinela es una fecha válida lejana (la versión anterior lo trata como «muy lejos»)', () => {
  assert.ok(!isNaN(Date.parse(NO_DATE)) && /^\d{4}-\d{2}-\d{2}$/.test(NO_DATE) && NO_DATE > '2100-01-01');
  const legacy = plan({ settings: DEFAULT_SETTINGS, works: [{ ...und('a'), noDate: undefined, createdAt: undefined }], blocks: [] }, now); assert.ok(legacy.blocks.length >= 0);
});

// ---- estimaciones por opciones ----
const baseT = (o: Partial<Work> = {}): Work => ({ id: 't', kind: 'task', subjectId: 's', title: 'x', dueDate: '2026-10-20', estMin: 60, difficulty: 3, importance: 3, readiness: 0, status: 'pending', autoEst: true, size: 3, learn: 'comprension', ...o });
const est = (w: Work) => reestimate([w], [])[0].estimate!;
test('tamaño de tarea: minutos de referencia no lineales y fieles a la etiqueta con dificultad normal', () => {
  const m = [1, 2, 3, 4, 5].map(sz => est(baseT({ size: sz })).totalMin); assert.deepEqual(m, [15, 30, 60, 120, 240]); assert.deepEqual(Object.values(PARAMS.taskMin), [15, 30, 60, 120, 240]);
  assert.ok(est(baseT({ difficulty: 5 })).totalMin > est(baseT({ difficulty: 3 })).totalMin && est(baseT({ difficulty: 1 })).totalMin < est(baseT({ difficulty: 3 })).totalMin);
});
test('ritmo personal elegido: menos o más tiempo, acotado, y se ve en los factores; no cuenta si hay minutos fijados', () => {
  const n = est(baseT()).totalMin, f = est(baseT({ pace: 0.8 })), s = est(baseT({ pace: 1.3 })); assert.ok(f.totalMin < n && s.totalMin > n); assert.equal(f.totalMin, 48); assert.equal(s.totalMin, 78); assert.ok(f.factors.some(x => /Ritmo personal/.test(x)));
  assert.ok(est(baseT({ pace: 99 })).totalMin <= Math.round(60 * PARAMS.pace[1]) + 1, 'acotado'); assert.equal(est(baseT({ pace: 0.8, manualEstMin: 90 })).totalMin, 90);
});
test('examen por opciones: más materia y menos preparación → más tiempo, y se declara provisional (sin temas escritos)', () => {
  const mk = (n: number, size: number, mastery: number): Work => ({ id: 'e', kind: 'exam', subjectId: 's', title: 'E', dueDate: '2026-10-30', estMin: 60, difficulty: 3, importance: 3, readiness: 0, status: 'pending', learn: 'mixto', goal: 'notable', topics: Array.from({ length: n }, (_, i) => ({ id: 't' + i, name: 'Parte ' + (i + 1), size, difficulty: 3, mastery, explicit: false, auto: true, evidence: [] })) });
  const t = [[1, 2], [3, 3], [5, 3], [8, 3]].map(([n, sz]) => est(mk(n, sz, 0)).totalMin); for (let i = 1; i < t.length; i++) assert.ok(t[i] > t[i - 1], t.join(','));
  assert.ok(est(mk(3, 3, 2)).totalMin < est(mk(3, 3, 0)).totalMin); assert.equal(est(mk(3, 3, 0)).provisional, true); assert.ok(t[3] / 60 < 50 && t[0] / 60 >= 0.3);
});

// ---- rutina: hasta 5 (o 7) clases por semana de una asignatura ----
const names = Object.keys(C), subjects = names.map((n, i) => ({ id: 's' + i, name: n, colorKey: n }));
test('rutina: 5 veces por semana en una asignatura (como mucho una al día) y 7 como máximo', () => {
  const mon = mondayOf(now.date), R = { ...DEFAULT_ROUTINE, enabled: true, intensity: 'exigente' as const, perWeek: Object.fromEntries(subjects.map(s => [s.id, s.name === 'Matemáticas II' ? 5 : 0])) };
  const h = generate({ settings: DEFAULT_SETTINGS, routine: R, subjects, works: [], blocks: [], activities: [], habit: [], now, from: now.date, to: addDays(mon, 6) });
  const mat = h.filter(x => x.subjectId === 's0' && x.kind === 'estudio'); assert.equal(mat.length, 5, 'cinco bloques en la semana'); assert.equal(new Set(mat.map(x => x.date)).size, 5, 'en cinco días distintos');
  const R7 = { ...R, perWeek: { ...R.perWeek, s0: 7 } }; const h7 = generate({ settings: DEFAULT_SETTINGS, routine: R7, subjects, works: [], blocks: [], activities: [], habit: [], now, from: now.date, to: addDays(mon, 6) });
  assert.equal(h7.filter(x => x.subjectId === 's0' && x.kind === 'estudio').length, 7);
  const again = generate({ settings: DEFAULT_SETTINGS, routine: R, subjects, works: [], blocks: [], activities: [], habit: h, now, from: now.date, to: addDays(mon, 6) }); assert.equal(again.filter(x => x.subjectId === 's0' && x.kind === 'estudio').length, 0, 'idempotente: no repite');
});
test('rutina: 5 clases/semana se cumplen aun compitiendo con otras asignaturas y con intensidad normal (se admiten días seguidos cuando es imprescindible)', () => {
  const four = subjects.slice(0, 4), mon = mondayOf('2026-10-19'), nw = { date: '2026-10-12', minute: 480 };
  const R = { ...DEFAULT_ROUTINE, enabled: true, intensity: 'equilibrado' as const, perWeek: { s0: 5, s1: 2, s2: 2, s3: 2 } }; // 11 ≤ 14 huecos/semana
  const h = generate({ settings: DEFAULT_SETTINGS, routine: R, subjects: four, works: [], blocks: [], activities: [], habit: [], now: nw, from: mon, to: addDays(mon, 6) });
  const by = (id: string) => h.filter(x => x.subjectId === id && x.kind === 'estudio'); assert.equal(by('s0').length, 5); assert.equal(new Set(by('s0').map(x => x.date)).size, 5); for (const id of ['s1', 's2', 's3']) assert.equal(by(id).length, 2, id);
  const per = new Map<string, number>(); for (const x of h.filter(y => y.kind === 'estudio')) per.set(x.date, (per.get(x.date) ?? 0) + 1); for (const n of per.values()) assert.ok(n <= 2, 'tope diario de la intensidad');
});
