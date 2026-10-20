// v14: cuaderno de errores, resumen semanal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { addFallo, dueFallos, answerFallo, falloStats, STAGES, type Fallo } from '../src/core/errores.ts';
import { resumenSemana, weekToReview } from '../src/core/semana.ts';
import type { Block, Work } from '../src/core/types.ts';

const addDaysT = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
test('fallo: se crea para dentro de 2 días, no se duplica y valida', () => {
  let l: Fallo[] = []; assert.match(addFallo(l, { subjectId: 's1', text: '  ' }, '2026-10-20', 'a').err!, /Escribe/); assert.match(addFallo(l, { subjectId: '', text: 'x' }, '2026-10-20', 'a').err!, /asignatura/);
  l = addFallo(l, { subjectId: 's1', text: 'Signo en la regla de la cadena' }, '2026-10-20', 'a').list; assert.equal(l[0].next, '2026-10-22');
  assert.equal(addFallo(l, { subjectId: 's1', text: ' signo  en la REGLA de la cadena' }, '2026-10-20', 'b').list.length, 1, 'mismo fallo, no se repite');
  assert.equal(addFallo(l, { subjectId: 's2', text: 'Signo en la regla de la cadena' }, '2026-10-20', 'c').list.length, 2, 'otra asignatura sí');
  assert.equal(addFallo([], { subjectId: 's1', text: 'x'.repeat(500) }, '2026-10-20', 'd').list[0].text.length, 140);
});
test('fallo: acertar sube de etapa (2, 7, 21, 35 días) y al final queda dominado; fallar vuelve a mañana', () => {
  let l = addFallo([], { subjectId: 's1', text: 'a' }, '2026-10-20', 'a').list, d = '2026-10-22';
  assert.equal(dueFallos(l, '2026-10-21').length, 0); assert.equal(dueFallos(l, d).length, 1);
  const days = [...STAGES]; let cur = d, prev = d;
  for (let i = 1; i < STAGES.length; i++) { prev = cur; l = answerFallo(l, 'a', true, cur); cur = l[0].next!; assert.equal(l[0].stage, i); assert.equal(cur, addDaysT(prev, days[i]));}
  l = answerFallo(l, 'a', true, cur); assert.equal(l[0].next, null); assert.equal(l[0].masteredAt, cur); assert.deepEqual(falloStats(l, cur), { open: 0, due: 0, mastered: 1 }); assert.deepEqual(days, [2, 7, 21, 35]);
  let m = addFallo([], { subjectId: 's1', text: 'b' }, '2026-10-20', 'b').list; m = answerFallo(m, 'b', true, '2026-10-22'); m = answerFallo(m, 'b', false, '2026-11-01'); assert.equal(m[0].stage, 0); assert.equal(m[0].next, '2026-11-02'); assert.equal(m[0].misses, 1);
});
test('fallo: responder dos veces el mismo día no avanza dos etapas (idempotente) y se muestran como mucho 3', () => {
  let l = addFallo([], { subjectId: 's1', text: 'a' }, '2026-10-20', 'a').list; const once = answerFallo(l, 'a', true, '2026-10-22'), twice = answerFallo(once, 'a', true, '2026-10-22');
  assert.equal(JSON.stringify(once), JSON.stringify(twice));
  for (let i = 0; i < 6; i++) l = addFallo(l, { subjectId: 's1', text: 'f' + i }, '2026-10-20', 'f' + i).list; assert.equal(dueFallos(l, '2026-10-30').length, 3);
});

const w = (id: string, s: string): Work => ({ id, kind: 'task', subjectId: s, title: id, dueDate: '2026-10-30', estMin: 60, difficulty: 3, importance: 3, readiness: 0, status: 'pending' });
const b = (id: string, wid: string, date: string, status: Block['status'], len = 60): Block => ({ id, workId: wid, date, start: 1000, end: 1000 + len, status, manual: false });
test('resumen semanal: solo domingo (semana en curso) y lunes (la anterior); cumplimiento con la fórmula de estadísticas; la asignatura más floja', () => {
  assert.equal(weekToReview('2026-10-20'), null); assert.equal(weekToReview('2026-10-25'), '2026-10-19'); assert.equal(weekToReview('2026-10-26'), '2026-10-19');
  const works = [w('m', 's1'), w('q', 's2')], blocks = [b('1', 'm', '2026-10-19', 'done'), b('2', 'm', '2026-10-20', 'done'), b('3', 'q', '2026-10-21', 'skipped'), b('4', 'q', '2026-10-22', 'done'), b('5', 'q', '2026-10-23', 'skipped'), b('6', 'q', '2026-10-24', 'rescheduled'), b('7', 'm', '2026-10-27', 'done')];
  const r = resumenSemana({ blocks, works, fallos: [], today: '2026-10-26' })!;
  assert.equal(r.plannedMin, 300, 'las reprogramadas no cuentan dos veces'); assert.equal(r.completedMin, 180); assert.equal(r.compliance, 60);
  assert.equal(r.weakest, 's2'); assert.equal(r.subjects.find(s => s.id === 's1')!.compliance, 100); assert.equal(resumenSemana({ blocks: [], works, fallos: [], today: '2026-10-26' }), null, 'sin datos no inventa');
  const f: Fallo[] = [{ id: 'a', subjectId: 's1', text: 't', created: '2026-10-21', stage: 4, next: null, hits: 4, misses: 0, masteredAt: '2026-10-23' }];
  const r2 = resumenSemana({ blocks, works, fallos: f, today: '2026-10-26' })!; assert.equal(r2.fallosNuevos, 1); assert.equal(r2.fallosDominados, 1);
});
