// v14 en la app (DOM SIMULADO): cuaderno de errores, resumen semanal, simulacro.
import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const T0 = new Date(2026, 9, 12, 8, 0).getTime();
test.beforeEach(() => { clock.t = T0 });

test('cuaderno de errores: anotar un fallo, aparece a los 2 días en Hoy y «Ya lo sé» lo avanza una sola vez', async () => {
  const a = await boot(); await a.click('addErr'); const sid = a.S.subjects[0].id;
  assert.equal(await a.submit({ subjectId: sid, text: '  ' }), 'Escribe en una línea qué fallaste.');
  assert.equal(await a.submit({ subjectId: sid, text: 'Signo al derivar e^(-x)' }), ''); assert.equal(a.S.errors.length, 1); assert.equal(a.S.errors[0].next, '2026-10-14');
  assert.ok(!/Rehacer hoy/.test(a.t.V.hoy()), 'hoy no toca');
  clock.t += 2 * 864e5; const r = await boot(a.store); assert.match(r.t.V.hoy(), /Rehacer hoy/); assert.match(r.t.V.hoy(), /Signo al derivar/);
  const id = r.S.errors[0].id; await r.click('errOk', id); await r.click('errOk', id); assert.equal(r.S.errors[0].stage, 1, 'dos toques el mismo día = una etapa'); assert.ok(!/Rehacer hoy/.test(r.t.V.hoy()));
  assert.equal(r.S.errors[0].next, '2026-10-21');
});
test('registro detallado con fallo: pasa al cuaderno; «Aún falla» lo devuelve a mañana', async () => {
  const a = await boot(); await a.click('addTask'); await a.submit({ subjectId: a.S.subjects[1].id, when: '0', title: 'Problemas' });
  const b = a.S.blocks.find(x => x.status === 'planned'); await a.click('doneBlk', b.id);
  assert.equal(await a.submit({ actualMin: '30', goalMet: '1', fallo: 'Confundí energía con potencia', quality: '', progress: '60', difficulty: '3', interrupted: '0' }), '');
  assert.equal(a.S.errors.length, 1); assert.equal(a.S.errors[0].subjectId, a.S.subjects[1].id);
  clock.t += 2 * 864e5; const r = await boot(a.store); await r.click('errNo', r.S.errors[0].id); assert.equal(r.S.errors[0].next, '2026-10-15'); assert.equal(r.S.errors[0].misses, 1);
});
test('resumen semanal: el lunes aparece con el cumplimiento de la semana anterior y «Entendido» lo oculta', async () => {
  const a = await boot(); await a.click('addTask'); await a.submit({ subjectId: a.S.subjects[1].id, when: '0', title: 'T' });
  const b = a.S.blocks.find(x => x.status === 'planned'); b.status = 'done'; b.actualMin = b.end - b.start; a.S.blocks.push({ ...b, id: 'sk', start: b.end + 20, end: b.end + 80, status: 'skipped', reason: 'otro' });
  await a.t.commit({ quiet: true }); clock.t = new Date(2026, 9, 19, 9, 0).getTime(); const r = await boot(a.store);
  assert.match(r.t.V.hoy(), /Tu semana/); assert.match(r.t.V.hoy(), /cumplimiento/); await r.click('semOk', '2026-10-12'); assert.ok(!/Tu semana/.test(r.t.V.hoy()));
  clock.t = new Date(2026, 9, 21, 9, 0).getTime(); const m = await boot(a.store); assert.ok(!/Tu semana/.test(m.t.V.hoy()), 'solo domingo y lunes');
});
test('semana de examen: el repaso final es un simulacro cronometrado', async () => {
  const a = await boot(); await a.click('addExam'); await a.submit({ subjectId: a.S.subjects[0].id, when: '14', learn: 'auto', amount: 'normal', prep: '0', difficulty: '3', importance: '5', goal: 'notable' });
  assert.match(a.t.MET.howFor('Matemáticas II', undefined, { phase: 'simulacro' }), /^Simulacro cronometrado/);
  const rev = a.S.blocks.find(x => x.part === 'review' && x.status === 'planned'); assert.ok(rev, 'hay sesión de repaso final');
});
