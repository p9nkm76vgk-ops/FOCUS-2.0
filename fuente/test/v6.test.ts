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

const T = '2026-10-13'; // 1.ª evaluación
const gw = (id: string, sid: string, score: number, weight: number | undefined, date = '2026-10-10', evalNo?: 1 | 2 | 3): G.Grade => ({ id, subjectId: sid, score, weight, date, evalNo });
test('evaluación por fecha: sept–dic 1.ª, ene–mar 2.ª, abr–ago 3.ª; evalNo manual manda', () => {
  assert.deepEqual(['2026-09-01', '2026-12-31', '2027-01-01', '2027-03-31', '2027-04-01', '2027-06-30'].map(G.evalOfDate), [1, 1, 2, 2, 3, 3]);
  assert.equal(G.gradeEval(gw('a', 's', 5, 10, '2026-10-01')), 1); assert.equal(G.gradeEval(gw('a', 's', 5, 10, '2026-10-01', 3)), 3);
});
test('tu ejemplo: Mates, examen del 24 %, un 4 → ganas 0,96; con objetivo 9 necesitas 10,58 en el 76 % restante: imposible, máximo 8,56', () => {
  const r = G.evalSummary([gw('1', 'mat', 4, 24)], 'mat', 1, 9);
  assert.equal(r.earned, 0.96); assert.equal(r.doneW, 24); assert.equal(r.remW, 76); assert.equal(r.cur, 4); assert.equal(r.need, 10.58); assert.equal(r.max, 8.56); assert.equal(r.status, 'imposible');
  const ok = G.evalSummary([gw('1', 'mat', 4, 24)], 'mat', 1, 8); assert.equal(ok.need, 9.26); assert.equal(ok.status, 'posible', '(8−0,96)·100/76');
  assert.equal(G.evalSummary([gw('1', 'mat', 4, 24)], 'mat', 1, 0.5).status, 'cumplido', 'con lo ganado ya basta');
});
test('evaluación: acumula porcentajes, avisa si pasan de 100, queda «completa» al llegar a 100 y separa evaluaciones y asignaturas', () => {
  const gs = [gw('1', 'a', 8, 30), gw('2', 'a', 6, 20), gw('3', 'a', 10, 50, '2027-02-02'), gw('4', 'b', 3, 100)];
  const r = G.evalSummary(gs, 'a', 1, 9); assert.equal(r.doneW, 50); assert.equal(r.earned, 3.6); assert.equal(r.cur, 7.2); assert.equal(r.need, 10.8); assert.equal(r.status, 'imposible'); assert.equal(G.evalSummary(gs, 'a', 1, 8).status, 'posible'); assert.equal(G.evalSummary(gs, 'a', 1, 8).need, 8.8);
  assert.equal(G.evalSummary(gs, 'a', 2, null).earned, 5, 'la 2.ª es independiente'); assert.equal(G.evalSummary(gs, 'b', 1, 9).status, 'completa'); assert.equal(G.evalSummary(gs, 'b', 1, 9).need, null);
  assert.equal(G.evalSummary([...gs, gw('5', 'a', 5, 60)], 'a', 1, 9).over, true);
  const none = G.evalSummary([], 'a', 1, 9); assert.equal(none.status, 'sin notas'); assert.equal(none.cur, null); assert.equal(none.remW, 100); assert.equal(none.need, 9);
  assert.equal(G.evalSummary([gw('x', 'a', 9, undefined)], 'a', 1, 9).n, 0, 'datos antiguos sin porcentaje no entran en el cálculo');
});
test('proyección: usa la evaluación en curso; sin notas en ella, la última anterior con datos', () => {
  const gs = [gw('1', 'a', 6, 50, '2026-10-05'), gw('2', 'b', 7, 100, '2026-11-20', 1), gw('3', 'b', 9, 40, '2027-02-01')];
  assert.equal(G.projected(goals(), gs, 'a', T).value, 6); assert.equal(G.projected(goals(), gs, 'a', T).evalNo, 1);
  assert.equal(G.projected(goals(), gs, 'a', '2027-02-10').evalNo, 1, 'en la 2.ª sin notas propias, cae a la 1.ª'); assert.equal(G.projected(goals(), gs, 'b', '2027-02-10').value, 9); assert.equal(G.projected(goals(), gs, 'b', T).value, 7);
  assert.equal(G.projected(goals(), [], 'a', T).value, null);
});
test('brecha, objetivo por asignatura y factor de horas de examen acotado (0,9–1,3)', () => {
  const g = goals({ target: 9, subjTarget: { b: 7 } }), gs = [gw('1', 'a', 6, 100), gw('2', 'b', 7.5, 100), gw('3', 'c', 9.8, 100)];
  assert.equal(G.gapOf(g, gs, 'a', T), 3); assert.equal(G.gapOf(g, gs, 'b', T), -0.5); assert.equal(G.gapOf(goals(), gs, 'a', T), null, 'sin objetivo no hay brecha'); assert.equal(G.gapOf(g, [], 'a', T), null, 'sin notas no hay brecha');
  assert.equal(G.boostFactor(3), 1.3); assert.equal(G.boostFactor(1), 1.1); assert.equal(G.boostFactor(-5), 0.9); assert.equal(G.boostFactor(null), 1);
  const b = G.boosts(g, gs, [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'z', archived: true }], T); assert.equal(b.a, 1.3); assert.equal(b.b, 0.95); assert.ok(!('z' in b));
});
test('media estimada, peor asignatura y nota de acceso con la media de bachillerato = media de 1.º y 2.º', () => {
  const g = goals({ target: 9, prevAvg: 7, pauExpected: 8, accessTarget: 9 }), gs = [gw('1', 'a', 7, 100), gw('2', 'b', 8, 100)];
  const ov = G.overall(g, gs, [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }], T);
  assert.equal(ov.media, 7.5); assert.equal(ov.worst!.id, 'a'); assert.equal(ov.covered, 2); assert.equal(ov.total, 3); assert.equal(ov.gap, 1.5);
  const ac = G.accessInfo(g, ov.media); assert.equal(ac.nmb, 7.25); assert.equal(ac.access, 7.55, '0,6·7,25 + 0,4·8'); assert.equal(ac.needMedia, 12.33); assert.equal(ac.feasible, false, '(9−3,2)/0,6 = 9,67 de bachillerato → 2·9,67−7');
  assert.equal(G.accessInfo(goals({ pauExpected: 8, accessTarget: 8 }), 8).needMedia, 8, 'sin media de 1.º: la media necesaria es la de bachillerato');
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
test('estado antiguo sin goals/grades/syllabus: la migración los añade y no pierde nada', async () => {
  const { migrateState, lostPaths } = await import('../src/core/migrate.ts');
  const old = { schemaVersion: 3, subjects: [{ id: 's' }], works: [], blocks: [], settings: DEFAULT_SETTINGS }, r = migrateState(old);
  assert.ok(r.state.goals && Array.isArray(r.state.grades) && Array.isArray(r.state.syllabus)); assert.deepEqual(lostPaths(old, r.state), []);
  const r2 = migrateState(r.state); assert.equal(r2.changed, false, 'idempotente');
});
test('todo se arrastra hasta la PAU: mantenimiento semanal por intervalo, altas escalonadas, cobertura por curso y menos capacidad para temario nuevo', () => {
  const t1 = G.newTopic('a', 's', 'Uno', 1, '2026-10-12', 0, 1), t2 = G.newTopic('b', 's', 'Dos', 0, '2026-10-12', 0, 2);
  assert.equal(t1.course, 1); assert.equal(G.newTopic('c', 's', 'x', 2, '2026-10-12').course, 2, '2.º por defecto');
  assert.equal(G.newTopic('d', 's', 'x', 1, '2026-10-12', 0, 1, 4).next, '2026-10-18', 'escalonado: +2 +4 días'); assert.equal(G.newTopic('e', 's', 'x', 0, '2026-10-12', 0, 1, 4).next, null);
  const m = G.maintenance([t1, t2]); assert.equal(m.nowWeekMin, Math.round(7 * 25 / 2), 'visto hace poco: intervalo 2 días'); assert.equal(m.steadyWeekMin, Math.round(2 * 7 * 25 / 90));
  const lots = Array.from({ length: 90 }, (_, i) => ({ ...G.newTopic('l' + i, 's', 'L' + i, 3, '2026-10-12', 0, 1), reviews: 4 })); assert.equal(G.maintenance(lots).nowWeekMin, Math.round(90 * 7 * 25 / 90), '90 temas dominados: 175 min/semana de mantenimiento');
  const cc = G.coverageByCourse([t1, t2, G.newTopic('f', 's', 'F', 2, '2026-10-12', 0, 1)]); assert.equal(cc[0].n, 2); assert.equal(cc[0].seen, 2); assert.equal(cc[1].n, 1); assert.equal(cc[1].pctSeen, 0);
  const S0 = { availability: DEFAULT_SETTINGS.availability, maxDayMin: 240 }, g = goals({ pauDate: '2027-06-02', start: '2026-10-12' }), a = Array.from({ length: 10 }, (_, i) => G.newTopic('n' + i, 's', 'N' + i, 0, '2026-10-12'));
  const m0 = G.macro({ goals: g, topics: a, settings: S0, today: '2026-10-12' }) as any, m1 = G.macro({ goals: g, topics: [...a, ...lots], settings: S0, today: '2026-10-12' }) as any;
  assert.ok(m1.maintNowWeekMin > m0.maintNowWeekMin); assert.ok(m1.capCoverageMin < m0.capCoverageMin, 'el mantenimiento de lo visto resta capacidad para lo nuevo'); assert.equal(m1.backlog, 0);
  const late = G.macro({ goals: g, topics: [{ ...t1, next: '2026-10-01' }], settings: S0, today: '2026-10-12' }) as any; assert.equal(late.backlog, 1);
});
