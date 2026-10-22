// v15: fases por asignatura (secuenciales, editables), autopsia por reglas, calibración y confianza.
import test from 'node:test';
import assert from 'node:assert/strict';
import { planFor, defaultPlan, assignPhases, validatePcts } from '../src/core/fases.ts';
import { makeAutopsy, saveAutopsy, causeFreq, calibration, confidenceInsight, suggestions, shift, type Autopsy } from '../src/core/autopsia.ts';

const eq = (n: number, m = 60) => Array(n).fill(m);
test('planes por defecto: guion 35/50/15, Business 100 o 70/30, Inglés 25/75, ciencias 25/75, Mates 10/90', () => {
  assert.deepEqual(planFor('Historia de la Filosofía', false).map(p => p.pct), [35, 50, 15]);
  assert.deepEqual(planFor('Business', false).map(p => p.pct), [100]);
  assert.deepEqual(planFor('Business', true).map(p => p.pct), [70, 30]);
  assert.deepEqual(planFor('Inglés', false).map(p => p.pct), [25, 75]);
  assert.deepEqual(planFor('Química', false).map(p => p.pct), [25, 75]);
  assert.deepEqual(planFor('Matemáticas II', false).map(p => p.pct), [10, 90]);
  assert.equal(planFor('Asignatura nueva', false).length, 2, 'asignaturas propias: plan genérico');
  for (const n of ['Física', 'Catalán', 'Business', 'Inglés']) assert.equal(validatePcts(planFor(n, true).map(p => p.pct)), null);
});
test('las instrucciones no llevan cantidades fijas (nada de «20 + 3»)', () => {
  for (const n of ['Química', 'Física', 'Matemáticas II', 'Catalán']) for (const p of planFor(n, true)) assert.ok(!/\b\d{2}\b|\b\d\s*problemas/.test(p.text), p.text);
});
test('asignación secuencial: monótona, sin saltarse fases y la última fase tiene ≥ 2 sesiones (si hay ≥ 3)', () => {
  const g = planFor('Catalán', false);
  for (let n = 1; n <= 20; n++) {
    const a = assignPhases(g, eq(n)); assert.equal(a.length, n);
    for (let i = 1; i < n; i++) { assert.ok(a[i] >= a[i - 1], `monótona n=${n}`); assert.ok(a[i] - a[i - 1] <= 1 || n < 3, `sin saltos n=${n}`) }
    if (n >= 3) { assert.equal(new Set(a).size, 3, 'las tres fases aparecen n=' + n); assert.ok(a.filter(x => x === 2).length >= 2 || n === 3, 'producción mínima n=' + n) }
  }
  assert.deepEqual(assignPhases(g, eq(10)), [0, 0, 0, 1, 1, 1, 1, 1, 2, 2]);
});
test('reparto proporcional a los minutos y plan de una fase', () => {
  assert.deepEqual(assignPhases(planFor('Business', true), eq(10)), [0, 0, 0, 0, 0, 0, 0, 1, 1, 1].map((x, i) => i < 7 ? 0 : 1));
  assert.deepEqual(assignPhases(planFor('Business', false), eq(4)), [0, 0, 0, 0]);
  assert.deepEqual(assignPhases(planFor('Química', false), eq(8)), [0, 0, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(assignPhases(planFor('Química', false), []), []);
});
test('personalización: porcentajes inválidos se ignoran; textos y nombres se aplican', () => {
  const ok = planFor('Química', false, { pcts: [40, 60], labels: ['Base', ''], texts: ['Mi texto', ''] });
  assert.deepEqual(ok.map(p => p.pct), [40, 60]); assert.equal(ok[0].label, 'Base'); assert.equal(ok[1].label, 'Problemas'); assert.equal(ok[0].text, 'Mi texto');
  assert.deepEqual(planFor('Química', false, { pcts: [40, 40] }).map(p => p.pct), [25, 75], 'no suma 100: se ignora');
  assert.match(validatePcts([40, 40])!, /suman 80/); assert.equal(validatePcts([-5, 105]), 'Cada porcentaje debe estar entre 0 y 100.');
  assert.deepEqual(defaultPlan('Química').map(p => p.pct), [25, 75], 'defaultPlan no se muta');
});
test('autopsia: validación, una por examen (idempotente) y frecuencia de causas', () => {
  assert.match(makeAutopsy({ workId: 'w', subjectId: 's', expected: 11 }, '2026-10-22', 'a', 1).err!, /0 a 10/);
  assert.match(makeAutopsy({ workId: 'w', subjectId: 's', comments: 2.5 }, '2026-10-22', 'a', 1).err!, /entero/);
  const a = makeAutopsy({ workId: 'w', subjectId: 's', expected: 7, causes: ['tiempo', 'tiempo', 'x'] }, '2026-10-22', 'a', 1).a!;
  assert.deepEqual(a.causes, ['tiempo']);
  const l1 = saveAutopsy([], a), l2 = saveAutopsy(l1, { ...a, id: 'b', expected: 8 }); assert.equal(l2.length, 1); assert.equal(l2[0].expected, 8);
  assert.deepEqual(causeFreq(l2).map(x => [x.id, x.n]), [['tiempo', 1]]);
});
const mk = (workId: string, subjectId: string, causes: string[], expected: number | null = null): Autopsy => ({ id: workId, workId, subjectId, date: '2026-10-22', expected, causes, weakTopics: [], createdAt: 1 });
test('calibración: solo exámenes con nota esperada y real', () => {
  const c = calibration([mk('a', 's', [], 8), mk('b', 's', [], 6), mk('c', 's', [], null)], [{ workId: 'a', score: 6 }, { workId: 'b', score: 6 }, { workId: 'c', score: 5 }]);
  assert.equal(c.n, 2); assert.equal(c.mean, 1); assert.equal(calibration([], []).mean, null);
});
test('confianza previa: sin datos hasta 3 exámenes; «poco fiable» si con poca confianza sacas buena nota', () => {
  const w = (id: string, confidence?: number) => ({ id, confidence });
  assert.equal(confidenceInsight([w('a', 1), w('b', 2)], [{ workId: 'a', score: 8 }, { workId: 'b', score: 8 }]).verdict, 'sin-datos');
  const r = confidenceInsight([w('a', 1), w('b', 2), w('c', 5)], [{ workId: 'a', score: 8 }, { workId: 'b', score: 7 }, { workId: 'c', score: 9 }]);
  assert.equal(r.verdict, 'poco-fiable'); assert.equal(r.low, 7.5); assert.equal(r.lowN, 2);
  assert.equal(confidenceInsight([w('a', 1), w('b', 2), w('c', 5), w('d', 4)], [{ workId: 'a', score: 4 }, { workId: 'b', score: 3 }, { workId: 'c', score: 9 }, { workId: 'd', score: 8 }]).verdict, 'fiable');
});
test('ajustes sugeridos: solo con ≥ 2 autopsias, causa en ≥ 50 %, nunca automáticos y siempre suman 100', () => {
  const ph = planFor('Catalán', false);
  assert.deepEqual(suggestions([mk('a', 's', ['concepto'])], 's', ph), [], 'una sola autopsia no basta');
  assert.deepEqual(suggestions([mk('a', 's', ['concepto']), mk('b', 's', [])], 's', ph), [], 'solo en 1 de 2 no basta (<2 veces)');
  const s = suggestions([mk('a', 's', ['concepto', 'tiempo']), mk('b', 's', ['concepto', 'tiempo'])], 's', ph);
  assert.equal(s.length, 2); assert.equal(s.find(x => x.cause === 'concepto')!.pcts[0], 45); assert.equal(s.find(x => x.cause === 'tiempo')!.pcts[2], 25);
  for (const x of s) assert.equal(Math.round(x.pcts.reduce((a, b) => a + b, 0) * 10) / 10, 100);
  const o = suggestions([mk('a', 's', ['olvido']), mk('b', 's', ['olvido'])], 's', ph)[0]; assert.deepEqual(o.pcts, [25, 55, 20]);
  assert.equal(shift([5, 95], [0], 10)![0], 15); assert.equal(shift([5, 5], [0], 10), null, 'no baja de 5');
});
