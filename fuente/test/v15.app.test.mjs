// v15 en la app (DOM SIMULADO): fases por asignatura, método editable, autopsia, confianza y guion por tema.
import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const T0 = new Date(2026, 9, 12, 8, 0).getTime();
test.beforeEach(() => { clock.t = T0 });
const byName = (a, n) => a.S.subjects.find(s => s.name === n);
const addExam = async (a, name, o = {}) => { await a.click('addExam'); const e = await a.submit({ subjectId: byName(a, name).id, when: '14', learn: 'auto', amount: 'normal', prep: '0', difficulty: '3', importance: '3', goal: 'notable', ...o }); assert.equal(e, ''); return a.S.works.at(-1) };

test('examen de Catalán: las sesiones recorren guion → memorizar → prueba en frío, en orden, y Hoy/Calendario muestran la fase', async () => {
  const a = await boot(); const w = await addExam(a, 'Catalán');
  const ms = a.S.blocks.filter(x => x.workId === w.id && x.part !== 'review' && x.status === 'planned').sort((x, y) => x.date.localeCompare(y.date) || x.start - y.start);
  assert.ok(ms.length >= 4, 'sesiones: ' + ms.length);
  const labels = ms.map(b => a.t.phaseOf(b).label);
  assert.equal(labels[0], 'Escribir el guion'); assert.equal(labels.at(-1), 'Prueba en frío'); assert.ok(labels.includes('Memorizar el guion'));
  const order = ['Escribir el guion', 'Memorizar el guion', 'Prueba en frío']; for (let i = 1; i < labels.length; i++) assert.ok(order.indexOf(labels[i]) >= order.indexOf(labels[i - 1]));
  assert.ok(labels.filter(l => l === 'Prueba en frío').length >= 2, 'producción mínima');
  const html = a.t.V.cal({}) + a.t.V.hoy(); assert.match(html, /Escribir el guion|Memorizar el guion|Prueba en frío/);
});
test('Business: «Solo teoría» = una fase (memorizar); «Con cálculo» = 70/30 y la fase de problemas llega al final', async () => {
  const a = await boot(); const t1 = await addExam(a, 'Business', { calc: '0' });
  const l1 = a.S.blocks.filter(x => x.workId === t1.id && x.part !== 'review').map(b => a.t.phaseOf(b).label); assert.equal(JSON.stringify([...new Set(l1)]), '["Memorizar"]');
  const t2 = await addExam(a, 'Business', { calc: '1' }); assert.equal(t2.calc, true);
  const ms = a.S.blocks.filter(x => x.workId === t2.id && x.part !== 'review').sort((x, y) => x.date.localeCompare(y.date) || x.start - y.start).map(b => a.t.phaseOf(b).label);
  assert.equal(ms[0], 'Memorizar'); assert.equal(ms.at(-1), 'Problemas');
});
test('método editable: se guarda en el estado, valida 100 %, se aplica a los bloques, sobrevive a recargar y se restaura', async () => {
  const a = await boot(), q = byName(a, 'Química'); await a.click('metEdit', q.id);
  assert.match(await a.submit({ l0: 'Teoría', p0: '40', x0: 'T', l1: 'Problemas', p1: '40', x1: 'P' }), /suman 80/); assert.equal(a.S.methodCfg, undefined);
  assert.equal(await a.submit({ l0: 'Base', p0: '40', x0: 'Mi texto base', l1: 'Problemas', p1: '60', x1: '' }), '');
  assert.equal(JSON.stringify(a.S.methodCfg[q.id].pcts), '[40,60]');
  const r = await boot(a.store); assert.equal(JSON.stringify(r.S.methodCfg[q.id].pcts), '[40,60]'); assert.match(r.t.V.met(), /Base/); assert.match(r.t.V.met(), /personalizado/);
  const w = await addExam(r, 'Química'); const first = r.S.blocks.filter(x => x.workId === w.id && x.part !== 'review').sort((x, y) => x.date.localeCompare(y.date) || x.start - y.start)[0];
  assert.equal(r.t.phaseOf(first).label, 'Base'); assert.match(r.t.howOf(first, q), /Mi texto base/);
  globalThis.confirm = () => true; await r.click('metReset', q.id); assert.equal(r.S.methodCfg[q.id], undefined);
  await r.click('metEdit', q.id); assert.equal(await r.submit({ l0: 'Teoría y fórmulas', p0: '25', x0: '', l1: 'Problemas', p1: '75', x1: '' }), ''); assert.equal(r.S.methodCfg[q.id], undefined, 'igual al defecto: no se guarda nada');
});
test('confianza previa: el día antes se pregunta una vez y se guarda en el examen', async () => {
  const a = await boot(); const w = await addExam(a, 'Física', { when: '2' });
  assert.ok(!/Cómo de seguro/.test(a.t.V.hoy()));
  clock.t += 1 * 864e5; assert.match(a.t.V.hoy(), /¿Cómo de seguro estás\?/);
  await a.click('conf', w.id, '2'); assert.equal(a.S.works.find(x => x.id === w.id).confidence, 2); assert.ok(!/Cómo de seguro/.test(a.t.V.hoy()));
  await a.click('conf', w.id, '9'); assert.equal(a.S.works.find(x => x.id === w.id).confidence, 2, 'valor no válido ignorado');
  const r = await boot(a.store); assert.equal(r.S.works.find(x => x.id === w.id).confidence, 2);
});
test('autopsia: aparece el día del examen a partir de las 14:30, se guarda una vez, manda temas flojos al cuaderno y pide la nota real', async () => {
  const a = await boot(); const w = await addExam(a, 'Química', { when: '2', title: 'Disoluciones', topics: 'Estequiometría\nEquilibrio' });
  const sid = w.subjectId; assert.equal(w.topics.length, 2);
  clock.t = new Date(2026, 9, 14, 13, 0).getTime(); assert.ok(!/¿Qué tal ha ido/.test(a.t.V.hoy()), 'antes de volver a casa no');
  clock.t = new Date(2026, 9, 14, 15, 0).getTime(); assert.match(a.t.V.hoy(), /¿Qué tal ha ido Química\?/);
  await a.click('autopsia', w.id);
  assert.match(await a.submit({ expected: '12' }), /0 a 10/);
  const f = { expected: '6.5', time: 'falto', c_concepto: 'on', c_tiempo: 'on', w_1: 'on', helped: 'problemas' };
  assert.equal(await a.submit(f), ''); assert.equal(a.S.autopsies.length, 1); assert.equal(JSON.stringify(a.S.autopsies[0].causes), '["concepto","tiempo"]'); assert.equal(JSON.stringify(a.S.autopsies[0].weakTopics), '["Equilibrio"]');
  assert.equal(a.S.errors.length, 1); assert.equal(a.S.errors[0].text, 'Tema flojo: Equilibrio'); assert.equal(a.S.errors[0].subjectId, sid);
  await a.click('autopsia', w.id); assert.equal(await a.submit(f), ''); assert.equal(a.S.autopsies.length, 1, 'guardar otra vez no duplica'); assert.equal(a.S.errors.length, 1, 'ni duplica el fallo');
  assert.ok(!/¿Qué tal ha ido/.test(a.t.V.hoy())); assert.match(a.t.V.hoy(), /¿Qué nota sacaste en Química\?/);
  const r = await boot(a.store); assert.equal(r.S.autopsies[0].expected, 6.5); assert.match(r.t.V.met(), /No entendía el concepto/);
});
test('autopsia «Ahora no» la oculta; el ajuste sugerido solo se aplica al confirmarlo', async () => {
  const a = await boot(), cat = byName(a, 'Catalán');
  const w1 = await addExam(a, 'Catalán', { when: '2' }), w2 = await addExam(a, 'Catalán', { when: '4' });
  a.S.autopsies = [w1, w2].map((w, i) => ({ id: 'a' + i, workId: w.id, subjectId: cat.id, date: w.dueDate, expected: 7, causes: ['concepto'], weakTopics: [], createdAt: i }));
  const before = JSON.stringify(a.S.methodCfg); assert.match(a.t.V.met(), /más peso a la primera fase/); assert.equal(JSON.stringify(a.S.methodCfg), before, 'ver la sugerencia no cambia nada');
  await a.click('metApply', cat.id, '0'); assert.equal(JSON.stringify(a.S.methodCfg[cat.id].pcts), '[45,40,15]');
  const b = await boot(); const w = await addExam(b, 'Física', { when: '2' }); clock.t = new Date(2026, 9, 14, 15, 0).getTime();
  assert.match(b.t.V.hoy(), /¿Qué tal ha ido/); await b.click('autSkip', w.id); assert.ok(!/¿Qué tal ha ido/.test(b.t.V.hoy()));
});
test('guion por tema: solo en asignaturas de guion; cada toque avanza escrito → memorizado → dominado → sin guion', async () => {
  const a = await boot(), fil = byName(a, 'Historia de la Filosofía'), fis = byName(a, 'Física');
  a.S.syllabus = [{ id: 'tf', subjectId: fil.id, name: 'Descartes', mastery: 0, reviews: 0, last: null, next: null, createdAt: 1, course: 2 }, { id: 'ts', subjectId: fis.id, name: 'Ondas', mastery: 0, reviews: 0, last: null, next: null, createdAt: 2, course: 2 }];
  const html = a.t.V.tem(); assert.match(html, /data-a=gs data-id="tf"/); assert.ok(!/data-a=gs data-id="ts"/.test(html));
  const seq = []; for (let i = 0; i < 4; i++) { await a.click('gs', 'tf'); seq.push(a.S.syllabus.find(t => t.id === 'tf').gs || 0) } assert.equal(JSON.stringify(seq), '[1,2,3,0]');
  await a.click('gs', 'tf'); const r = await boot(a.store); assert.equal(r.S.syllabus.find(t => t.id === 'tf').gs, 1);
});
