// Versión 6: objetivos, notas, proyección, repaso espaciado, ritmo aprendido, curso, revisión semanal y reparto del planificador (unitarias reales en Node).
import test from 'node:test';
import assert from 'node:assert/strict';
import { plan, DEFAULT_SETTINGS, weekday, addDays } from '../src/core/planner.ts';
import { reestimate } from '../src/core/estimator.ts';
import * as G from '../src/core/goals.ts';
import type { Block, Now, Work } from '../src/core/types.ts';

const now: Now = { date: '2026-10-12', minute: 480 };
const J = JSON.stringify;
const goals = (o: Partial<G.Goals> = {}): G.Goals => ({ ...G.DEFAULT_GOALS, prev: {}, subjTarget: {}, ...o });
const gr = (id: string, sid: string, score: number, date: string, kind: G.GradeKind = 'examen'): G.Grade => ({ id, subjectId: sid, score, kind, date });
const exam = (id: string, sid: string, o: Partial<Work> = {}): Work => ({ id, kind: 'exam', subjectId: sid, title: 'Examen ' + id, dueDate: '2026-10-26', estMin: 300, difficulty: 3, importance: 3, readiness: 0, status: 'pending', ...o });
const live = (bs: Block[]) => bs.filter(b => b.status === 'planned');
const sum = (bs: Block[]) => bs.reduce((a, b) => a + b.end - b.start, 0);

test('proyección: sin datos null; solo 1.º = esa nota; solo notas = media ponderada; mixta diluye 1.º y las recientes pesan más', () => {
  assert.equal(G.projected(goals(), [], 'a').value, null);
  assert.equal(G.projected(goals({ prev: { a: 7 } }), [], 'a').value, 7);
  assert.equal(G.projected(goals({ prev: { a: 7 } }), [], 'a').source, '1º');
  assert.equal(G.projected(goals(), [gr('1', 'a', 6, '2026-10-01'), gr('2', 'a', 8, '2026-10-02')], 'a').source, 'notas');
  const same = G.projected(goals(), [gr('1', 'a', 6, '2026-10-01'), gr('2', 'a', 8, '2026-10-02')], 'a').value!;
  assert.ok(same > 7 && same < 8, 'la reciente pesa más que la antigua: ' + same);
  const mix = G.projected(goals({ prev: { a: 5 } }), [gr('1', 'a', 9, '2026-10-01')], 'a'); assert.equal(mix.source, 'mixta'); assert.ok(mix.value! > 5 && mix.value! < 9);
  assert.equal(G.projected(goals(), [gr('1', 'a', 6, '2026-10-01', 'evaluacion'), gr('2', 'a', 10, '2026-10-02', 'tarea')], 'a').value! < 8, true, 'la evaluación (3) pesa más que la tarea (1)');
  assert.equal(G.projected(goals(), [gr('1', 'b', 9, '2026-10-01')], 'a').value, null, 'notas de otra asignatura no cuentan');
});
test('brecha, objetivo por asignatura y factor de horas de examen acotado (0,9–1,3)', () => {
  const g = goals({ target: 9, subjTarget: { b: 7 }, prev: { a: 6, b: 7.5, c: 9.8 } });
  assert.equal(G.gapOf(g, [], 'a'), 3); assert.equal(G.gapOf(g, [], 'b'), -0.5); assert.equal(G.gapOf(goals({ prev: { a: 6 } }), [], 'a'), null, 'sin objetivo no hay brecha');
  assert.equal(G.boostFactor(3), 1.3); assert.equal(G.boostFactor(1), 1.1); assert.equal(G.boostFactor(-5), 0.9); assert.equal(G.boostFactor(null), 1);
  const b = G.boosts(g, [], [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'z', archived: true }]); assert.equal(b.a, 1.3); assert.equal(b.b, 0.95); assert.ok(!('z' in b));
});
test('media global, peor brecha, nota de acceso 0,6·media+0,4·PAU y media necesaria', () => {
  const g = goals({ target: 9, prev: { a: 7, b: 8 }, pauExpected: 8, accessTarget: 9 });
  const ov = G.overall(g, [], [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }]);
  assert.equal(ov.media, 7.5); assert.equal(ov.worst!.id, 'a'); assert.equal(ov.covered, 2); assert.equal(ov.total, 3); assert.equal(ov.gap, 1.5);
  const ac = G.accessInfo(g, ov.media); assert.equal(ac.access, 7.7); assert.equal(ac.needMedia, 9.67); assert.equal(ac.feasible, true);
  assert.equal(G.accessInfo(goals({ pauExpected: 5, accessTarget: 10 }), 8).feasible, false);
});
test('tendencia: necesita 3 notas; sube/baja respecto a las anteriores', () => {
  assert.equal(G.trend([gr('1', 'a', 5, '2026-10-01'), gr('2', 'a', 6, '2026-10-02')], 'a'), null);
  assert.equal(G.trend([gr('1', 'a', 5, '2026-10-01'), gr('2', 'a', 7, '2026-10-02'), gr('3', 'a', 9, '2026-10-03')], 'a'), 3);
  assert.ok(G.trend([gr('1', 'a', 9, '2026-10-01'), gr('2', 'a', 5, '2026-10-02'), gr('3', 'a', 5, '2026-10-03')], 'a')! < 0);
});
test('planificador: el examen con más brecha recibe más minutos (hasta +30 %), el que va holgado menos, y es idempotente', () => {
  const works = [exam('e1', 'a', { dueDate: '2026-10-28' }), exam('e2', 'b', { dueDate: '2026-10-28' })];
  const base = plan({ settings: DEFAULT_SETTINGS, works, blocks: [] }, now), mA = sum(live(base.blocks).filter(b => b.workId === 'e1'));
  const r1 = plan({ settings: DEFAULT_SETTINGS, works, blocks: [], boost: { a: 1.3, b: 0.9 } }, now);
  const a = sum(live(r1.blocks).filter(b => b.workId === 'e1')), b = sum(live(r1.blocks).filter(b => b.workId === 'e2'));
  assert.ok(a > mA, `${a} > ${mA}`); assert.ok(b < mA); assert.ok(Math.abs(a - Math.round(mA * 1.3 / 5) * 5) <= 5); assert.ok(Math.abs(b - Math.round(mA * 0.9 / 5) * 5) <= 5);
  const r2 = plan({ settings: DEFAULT_SETTINGS, works, blocks: r1.blocks, boost: { a: 1.3, b: 0.9 } }, now); assert.equal(J(r2.blocks), J(r1.blocks), 'idempotente con boost'); assert.equal(r2.created.length, 0);
  const t = plan({ settings: DEFAULT_SETTINGS, works: [{ ...works[0], kind: 'task' }], blocks: [], boost: { a: 1.3 } }, now); assert.equal(sum(live(t.blocks)), 300 - 0 === 300 ? sum(live(plan({ settings: DEFAULT_SETTINGS, works: [{ ...works[0], kind: 'task' }], blocks: [] }, now).blocks)) : 0, 'el boost no cambia las tareas');
});
test('planificador: evita dos sesiones de la misma asignatura pegadas cuando hay alternativa, y respeta disponibilidad', () => {
  const works: Work[] = ['x', 'y', 'z'].map((s, i) => ({ id: 'w' + i, kind: 'task', subjectId: s, title: 't' + i, dueDate: '2026-10-15', estMin: 100, difficulty: 3, importance: 3, readiness: 0, status: 'pending' }));
  const r = plan({ settings: DEFAULT_SETTINGS, works: [...works, { ...works[0], id: 'w9', title: 'otra x' }], blocks: [] }, now);
  const by = new Map<string, Block[]>(); for (const b of live(r.blocks)) (by.get(b.date) ?? by.set(b.date, []).get(b.date)!).push(b);
  const sx = (id: string) => works.find(w => w.id === id)?.subjectId ?? 'x';
  let adjacent = 0, total = 0;
  for (const bs of by.values()) { const s = [...bs].sort((p, q) => p.start - q.start); for (let i = 1; i < s.length; i++) { total++; if (sx(s[i].workId) === sx(s[i - 1].workId) && s[i].start - s[i - 1].end <= DEFAULT_SETTINGS.minGapMin + 5) adjacent++; } }
  assert.ok(total > 0); assert.equal(adjacent, 0, 'ninguna pareja de la misma asignatura pegada');
  for (const b of live(r.blocks)) assert.ok((DEFAULT_SETTINGS.availability[weekday(b.date)] ?? []).some(w => w.start <= b.start && b.end <= w.end));
});
test('repaso espaciado: primer repaso a +2 días; bien espacia 7/21/45/90 y sube nivel; regular +3; mal baja y +1', () => {
  let t = G.newTopic('t', 'a', 'Límites', 1, '2026-10-12'); assert.equal(t.next, '2026-10-14'); assert.equal(t.reviews, 0);
  t = G.reviewDone(t, 'bien', '2026-10-14'); assert.equal(t.next, '2026-10-21'); assert.equal(t.mastery, 2);
  t = G.reviewDone(t, 'bien', '2026-10-21'); assert.equal(t.next, '2026-11-11'); assert.equal(t.mastery, 3);
  t = G.reviewDone(t, 'bien', '2026-11-11'); assert.equal(t.next, '2026-12-26'); t = G.reviewDone(t, 'bien', '2026-12-26'); assert.equal(t.next, '2027-03-26'); t = G.reviewDone(t, 'bien', '2027-03-26'); assert.equal(t.next, '2027-06-24', 'tope 90 días'); assert.equal(t.mastery, 3);
  const r = G.reviewDone(t, 'regular', '2027-04-01'); assert.equal(r.next, '2027-04-04'); assert.equal(r.mastery, 3);
  const m = G.reviewDone(t, 'mal', '2027-04-01'); assert.equal(m.next, '2027-04-02'); assert.equal(m.mastery, 2); assert.equal(m.reviews, t.reviews - 1);
  assert.deepEqual(G.setMastery(t, 0, '2026-10-12'), { ...t, mastery: 0, reviews: 0, last: null, next: null });
  assert.equal(G.newTopic('u', 'a', 'x', 0, '2026-10-12').next, null, 'sin ver no programa repaso');
});
test('syncReviews: crea tareas de repaso solo de lo que toca, estables (ids), idempotente, sin duplicar y sin borrar lo ya trabajado', () => {
  const subs = [{ id: 'a' }, { id: 'b' }];
  const topics = [G.newTopic('t1', 'a', 'Límites', 1, '2026-10-10'), G.newTopic('t2', 'a', 'Derivadas', 1, '2026-10-12'), G.newTopic('t3', 'b', 'Cinemática', 0, '2026-10-12')];
  const s1 = G.syncReviews([], [], topics, subs, '2026-10-12', () => null);
  assert.deepEqual(s1.added, ['rev:t1:0', 'rev:t2:0'].filter(id => s1.added.includes(id)).sort() && s1.added); assert.ok(s1.added.includes('rev:t1:0')); assert.ok(!s1.added.some(i => i.includes('t3')), 'sin ver no se repasa');
  assert.ok(s1.works.every(w => w.auto === 'review' && w.kind === 'task' && w.estMin >= 20 && w.dueDate >= '2026-10-12'));
  const s2 = G.syncReviews(s1.works, [], topics, subs, '2026-10-12', () => null); assert.equal(J(s2.works), J(s1.works)); assert.equal(s2.added.length, 0);
  const t1b = G.reviewDone(topics[0], 'bien', '2026-10-12'), topics2 = [t1b, topics[1], topics[2]];
  const done = s1.works.map(w => w.id === 'rev:t1:0' ? { ...w, status: 'done' as const } : w);
  const s3 = G.syncReviews(done, [], topics2, subs, '2026-10-12', () => null); assert.equal(s3.works.filter(w => w.id === 'rev:t1:0').length, 1, 'el repaso hecho se conserva (historial)'); assert.ok(!s3.added.some(i => i.startsWith('rev:t1')), 'el siguiente repaso no toca aún');
  const del = G.syncReviews(s1.works, [{ id: 'b1', workId: 'rev:t2:0', date: '2026-10-12', start: 600, end: 625, status: 'done', manual: false }], [topics[0]], subs, '2026-10-12', () => null);
  assert.equal(del.works.find(w => w.id === 'rev:t2:0')!.status, 'archived', 'con sesión hecha se archiva, no se borra');
  const many = Array.from({ length: 20 }, (_, i) => G.newTopic('m' + i, 'a', 'T' + i, 1, '2026-10-01')); assert.equal(G.syncReviews([], [], many, subs, '2026-10-12', () => null).added.length, G.REVIEW_MAX_ACTIVE, 'tope de repasos activos');
  const prio = G.syncReviews([], [], [G.newTopic('p1', 'a', 'A', 1, '2026-10-01'), G.newTopic('p2', 'b', 'B', 1, '2026-10-05')], subs, '2026-10-12', sid => sid === 'b' ? 3 : 0); assert.equal(prio.works[0].subjectId, 'b', 'primero la asignatura con más brecha');
});
test('repasos y planificador: las tareas de repaso se colocan en el calendario sin pasarse del plazo ni duplicarse al replanificar', () => {
  const works = G.syncReviews([], [], [G.newTopic('t1', 'a', 'Límites', 1, '2026-10-10')], [{ id: 'a' }], '2026-10-12', () => null).works;
  const r1 = plan({ settings: DEFAULT_SETTINGS, works, blocks: [] }, now), r2 = plan({ settings: DEFAULT_SETTINGS, works, blocks: r1.blocks }, now);
  assert.equal(sum(live(r1.blocks)), works[0].estMin); assert.equal(J(r2.blocks), J(r1.blocks)); assert.ok(live(r1.blocks).every(b => b.date <= works[0].dueDate));
});
test('ritmo aprendido: necesita ≥3 trabajos terminados, se encoge hacia 1 y se acota; lo aplica el estimador y lo explica', () => {
  const mk = (i: number, inv: number, sid = 'a'): [Work, Block] => [{ id: 'w' + i, kind: 'task', subjectId: sid, title: 't', dueDate: '2026-10-05', estMin: 60, difficulty: 3, importance: 3, readiness: 0, status: 'done', base0: 60 }, { id: 'b' + i, workId: 'w' + i, date: '2026-10-04', start: 900, end: 900 + inv, status: 'done', manual: false }];
  const two = [mk(1, 90), mk(2, 90)]; assert.deepEqual(G.learnedPace(two.map(x => x[0]), two.map(x => x[1])), {});
  const four = [mk(1, 90), mk(2, 90), mk(3, 90), mk(4, 90)], L = G.learnedPace(four.map(x => x[0]), four.map(x => x[1]));
  assert.equal(L.a.n, 4); assert.ok(L.a.factor > 1 && L.a.factor < 1.5, 'tardas 1,5× lo estimado → ×' + L.a.factor);
  const wild = [1, 2, 3, 4, 5, 6, 7, 8].map(i => mk(i, 600)), W = G.learnedPace(wild.map(x => x[0]), wild.map(x => x[1])); assert.ok(W.a.factor <= 1.6);
  const fast = [1, 2, 3, 4, 5, 6].map(i => mk(i, 10)); assert.ok(G.learnedPace(fast.map(x => x[0]), fast.map(x => x[1])).a.factor >= 0.7);
  const t: Work = { id: 'n', kind: 'task', subjectId: 'a', title: 'nueva', dueDate: '2026-10-20', estMin: 60, difficulty: 3, importance: 3, readiness: 0, status: 'pending', autoEst: true, size: 3 };
  const plain = reestimate([t], [], {})[0], learned = reestimate([t], [], { learned: L })[0];
  assert.ok(learned.estimate!.totalMin > plain.estimate!.totalMin); assert.ok(learned.estimate!.factors.some(f => /ritmo real/.test(f))); assert.ok(!plain.estimate!.factors.some(f => /ritmo real/.test(f)));
  const other = reestimate([{ ...t, subjectId: 'z' }], [], { learned: L })[0]; assert.equal(other.estimate!.totalMin, plain.estimate!.totalMin, 'solo afecta a su asignatura');
  const man = reestimate([{ ...t, manualEstMin: 45 }], [], { learned: L })[0]; assert.ok(!man.estimate!.factors.some(f => /ritmo real/.test(f)), 'minutos fijados a mano: no se toca');
});
test('stampBase guarda la estimación inicial una sola vez, sin el ajuste aprendido, y no toca repasos ni v2 ni manuales', () => {
  const w: Work = { id: 'n', kind: 'task', subjectId: 'a', title: 'x', dueDate: '2026-10-20', estMin: 60, difficulty: 3, importance: 3, readiness: 0, status: 'pending', autoEst: true, size: 3 };
  const e = reestimate([w], [], { learned: { a: { factor: 1.2, n: 4 } } }), s1 = G.stampBase(e, { a: { factor: 1.2, n: 4 } });
  assert.ok(Math.abs(s1[0].base0! - e[0].estimate!.totalMin / 1.2) <= 1); assert.equal(G.stampBase(s1.map(x => ({ ...x, estimate: { ...x.estimate!, totalMin: 999 } })), {})[0].base0, s1[0].base0, 'una sola vez');
  assert.equal(G.stampBase([{ ...e[0], auto: 'review' }], {})[0].base0, undefined); assert.equal(G.stampBase([{ ...e[0], estimatorVersion: 2 }], {})[0].base0, undefined); assert.equal(G.stampBase([{ ...e[0], manualEstMin: 30 }], {})[0].base0, undefined);
});
test('calidad de sesión: mejor franja solo con datos suficientes y diferencia clara', () => {
  const b = (i: number, start: number, q: number): Block => ({ id: 'b' + i, workId: 'w', date: '2026-10-0' + (1 + i % 7), start, end: start + 50, status: 'done', manual: false, quality: q as 1 | 2 | 3 });
  assert.equal(G.bestHours([b(1, 960, 3), b(2, 960, 3)]), null);
  const bs = [...[1, 2, 3, 4].map(i => b(i, 960, 3)), ...[5, 6, 7, 8].map(i => b(i, 1320, 1))], r = G.bestHours(bs)!; assert.equal(r.label, '15:00–18:00'); assert.equal(r.avg, 3);
  assert.equal(G.bestHours([...[1, 2, 3, 4].map(i => b(i, 960, 2)), ...[5, 6, 7, 8].map(i => b(i, 1320, 2))]), null, 'sin diferencia no se afirma nada');
});
test('curso hasta la PAU: sin fecha null; fases, capacidad y estado bien/justo/no llegas con números explícitos', () => {
  const S0 = { availability: DEFAULT_SETTINGS.availability, maxDayMin: 240 };
  assert.equal(G.macro({ goals: goals(), topics: [], settings: S0, today: '2026-10-12' }), null);
  assert.equal((G.macro({ goals: goals({ pauDate: '2026-10-01' }), topics: [], settings: S0, today: '2026-10-12' }) as any).past, true);
  const g = goals({ pauDate: '2027-06-02', start: '2026-10-12' }), t = Array.from({ length: 10 }, (_, i) => G.newTopic('t' + i, 'a', 'T' + i, 0, '2026-10-12'));
  const m = G.macro({ goals: g, topics: t, settings: S0, today: '2026-10-12' }) as any;
  assert.equal(m.days, 233); assert.equal(m.phase.id, 'cobertura'); assert.equal(m.needMin, 1200); assert.equal(m.status, 'bien'); assert.equal(m.seenPct, 0); assert.equal(m.expectedPct, 0);
  const tooMany = Array.from({ length: 400 }, (_, i) => G.newTopic('x' + i, 'a', 'X' + i, 0, '2026-10-12')); assert.equal((G.macro({ goals: g, topics: tooMany, settings: S0, today: '2026-10-12' }) as any).status, 'no llegas');
  assert.equal((G.macro({ goals: g, topics: [], settings: S0, today: '2026-10-12' }) as any).status, 'sin temario');
  assert.equal((G.macro({ goals: g, topics: t, settings: S0, today: '2027-05-25' }) as any).phase.id, 'simulacros');
  assert.ok(m.capCoverageMin > 0 && m.capCoverageMin < m.capTotalMin); assert.equal((G.macro({ goals: g, topics: t, settings: S0, today: '2027-05-01' }) as any).phase.id, 'practica');
});
test('revisión semanal: cumplimiento por fórmula explícita, brecha vs. tiempo dedicado, notas pendientes y acción de bajar el máximo diario', () => {
  const works: Work[] = [{ id: 'w1', kind: 'task', subjectId: 'a', title: 'A', dueDate: '2026-10-20', estMin: 60, difficulty: 3, importance: 3, readiness: 0, status: 'pending' }, { id: 'w2', kind: 'task', subjectId: 'b', title: 'B', dueDate: '2026-10-20', estMin: 60, difficulty: 3, importance: 3, readiness: 0, status: 'pending' }, exam('ex', 'b', { dueDate: '2026-10-08' })];
  const blk = (i: number, w: string, st: 'done' | 'skipped', d = '2026-10-07'): Block => ({ id: 'b' + i, workId: w, date: d, start: 900, end: 960, status: st, manual: false });
  const bs = [blk(1, 'w1', 'done'), blk(2, 'w2', 'skipped'), blk(3, 'w2', 'skipped'), blk(4, 'w2', 'skipped'), { ...blk(5, 'w2', 'done'), date: '2026-10-20' }, { ...blk(6, 'w2', 'skipped'), status: 'rescheduled' as const }];
  const r = G.weekReview({ blocks: bs, works, subjects: [{ id: 'a', name: 'Física' }, { id: 'b', name: 'Química' }], grades: [], goals: goals({ target: 9, prev: { a: 6, b: 9 } }), settings: { maxDayMin: 240 }, today: '2026-10-12' });
  assert.equal(r.plannedMin, 240, 'planificado excluye reprogramadas y fuera de ventana'); assert.equal(r.doneMin, 60); assert.equal(r.compliance, 25, '60 hechos / (60 hechos + 180 omitidos)');
  assert.ok(r.lines.some(l => l.action?.a === 'maxDay' && l.action.v < 240), 'baja el máximo diario si cumples <60 %');
  assert.ok(r.lines.some(l => /Falta la nota de/.test(l.text)), 'examen pasado sin nota');
  const again = G.weekReview({ blocks: bs, works, subjects: [{ id: 'a', name: 'Física' }, { id: 'b', name: 'Química' }], grades: [], goals: goals({ target: 9, prev: { a: 6, b: 9 } }), settings: { maxDayMin: 240 }, today: '2026-10-12' }); assert.equal(J(again), J(r), 'determinista');
  assert.equal(G.weekReview({ blocks: [], works, subjects: [], grades: [], goals: goals(), settings: { maxDayMin: 240 }, today: '2026-10-12' }).compliance, null);
});
test('estado antiguo sin goals/grades/syllabus: la migración los añade y no pierde nada', async () => {
  const { migrateState, lostPaths } = await import('../src/core/migrate.ts');
  const old = { schemaVersion: 3, subjects: [{ id: 's' }], works: [], blocks: [], settings: DEFAULT_SETTINGS }, r = migrateState(old);
  assert.ok(r.state.goals && Array.isArray(r.state.grades) && Array.isArray(r.state.syllabus)); assert.deepEqual(lostPaths(old, r.state), []);
  const r2 = migrateState(r.state); assert.equal(r2.changed, false, 'idempotente');
});
