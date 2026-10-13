// Versión 7 en la app (DOM SIMULADO, no navegador real): «hecha tal cual», motivo al saltar, tardaste más/menos, repasos aparte, avisos y calendario sin tapar bloques.
import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const T0 = new Date(2026, 9, 12, 8, 0).getTime();
test.beforeEach(() => { clock.t = T0 });
const opts = (a, o = {}) => ({ subjectId: a.S.subjects[1].id, when: '7', learn: 'auto', size: '3', difficulty: '3', importance: '3', pace: '1', ...o });
const mk = async (a, o) => { await a.click('addTask'); await a.submit(opts(a, o)); return a.S.works.at(-1) };

test('«Hecha tal cual»: un toque, sin formulario; cuenta los minutos previstos una sola vez', async () => {
  const a = await boot(); const w = await mk(a); const b = a.S.blocks.find(x => x.workId === w.id && x.status === 'planned'); const d = b.end - b.start;
  await a.click('quickDone', b.id); assert.ok(!/Registrar sesión/.test(a.h.dlg.innerHTML), 'sin formulario');
  const bb = a.S.blocks.find(x => x.id === b.id); assert.equal(bb.status, 'done'); assert.equal(bb.actualMin, d);
  const st = a.t.stats(a.S.blocks, a.S.works, { date: '2026-10-12', minute: 480 }); assert.equal(st.completedMin, d);
});
test('«No la haré»: pregunta el motivo, la guarda como omitida con motivo y busca otro hueco para el trabajo', async () => {
  const a = await boot(); const w = await mk(a, { when: '14', size: '5' }); const b = a.S.blocks.find(x => x.workId === w.id && x.status === 'planned'); const need0 = a.S.blocks.filter(x => x.workId === w.id && x.status === 'planned').reduce((s, x) => s + x.end - x.start, 0);
  await a.click('skipBlk', b.id); assert.match(a.h.dlg.innerHTML, /Cansancio/); assert.match(a.h.dlg.innerHTML, /Imprevisto/);
  a.t.A.choice({ dataset: { i: '0' } }); await a.tick(); const sk = a.S.blocks.find(x => x.id === b.id); assert.equal(sk.status, 'skipped'); assert.equal(sk.reason, 'cansancio');
  const need1 = a.S.blocks.filter(x => x.workId === w.id && x.status === 'planned').reduce((s, x) => s + x.end - x.start, 0); assert.equal(need1, need0, 'el trabajo sigue completo: se recolocó');
  await a.click('quickDone', a.S.blocks.find(x => x.workId === w.id && x.status === 'planned').id);
});
test('sesión incumplida de ayer: Hoy pregunta qué pasó y guarda el motivo', async () => {
  const a = await boot(); const w = await mk(a, { when: '14', size: '5' }); const b = a.S.blocks.find(x => x.workId === w.id && x.status === 'planned');
  clock.t = new Date(2026, 9, 14, 8, 0).getTime(); await a.t.commit({ quiet: true }); await a.tick();
  const missed = a.S.blocks.filter(x => x.status === 'skipped' || x.status === 'rescheduled').sort((x, y) => x.date.localeCompare(y.date));
  assert.ok(missed.length, 'ha quedado una sesión sin hacer'); const h = a.t.V.hoy(); assert.match(h, /¿Qué pasó con/); const id = h.match(/data-a=why data-id="([^"]+)"/)[1];
  await a.click('why', id, 'imprevisto'); assert.equal(a.S.blocks.find(x => x.id === id).reason, 'imprevisto');
});
test('al completar una tarea con sesiones hechas pregunta «¿tardaste más o menos?» y lo guarda', async () => {
  const a = await boot(); const w = await mk(a); const b = a.S.blocks.find(x => x.workId === w.id && x.status === 'planned'); await a.click('quickDone', b.id);
  await a.click('toggle', w.id); assert.match(a.h.dlg.innerHTML, /¿Cuánto tardaste/); a.t.A.choice({ dataset: { i: '2' } }); await a.tick();
  assert.equal(a.S.works.find(x => x.id === w.id).felt, 1);
});
test('repasos del temario: fuera de Tareas/Estimaciones, en su propia sección', async () => {
  const a = await boot(); a.S.syllabus.push(a.t.A && { id: 'tp1', subjectId: a.S.subjects[0].id, name: 'Matrices', course: 2, mastery: 1, reviews: 0, last: '2026-10-10', next: '2026-10-12', createdAt: 1 }); await a.t.commit({ quiet: true });
  const rev = a.S.works.find(x => x.auto === 'review'); assert.ok(rev, 'hay tarea de repaso'); const tar = a.t.V.tar(), est = a.t.V.est();
  assert.match(tar, /Repasos del temario \(1\)/); assert.ok(!est.includes('Repaso: Matrices'), 'no en estimaciones'); assert.ok(!a.t.V.hoy().includes('<b>Repaso: Matrices</b>'), 'ni en prioridades de Hoy');
});
test('Seguimiento avisa de pocos datos y explica lo que aprende; Curso se marca provisional con pocos temas', async () => {
  const a = await boot(); const w = await mk(a); const b = a.S.blocks.find(x => x.workId === w.id && x.status === 'planned'); await a.click('quickDone', b.id);
  const sg = a.t.V.seg(); assert.match(sg, /pocos datos \(1 sesión cerrada\)/); assert.match(sg, /Lo que aprende el planificador/); assert.match(sg, /Aún tengo pocos datos/);
  await a.click('editGoals'); await a.submit({ target: '9', pauDate: '2027-06-02' }); for (const n of ['A', 'B', 'C', 'D']) a.S.syllabus.push({ id: 't' + n, subjectId: a.S.subjects[0].id, name: n, course: 2, mastery: 0, reviews: 0, last: null, next: null, createdAt: 1 });
  const cu = a.t.V.cur(); assert.match(cu, /provisional/); assert.match(cu, /menos de 6 temas/);
});
test('copia de seguridad: va al final de Hoy y «Luego» la aparta una semana', async () => {
  const a = await boot(); await mk(a); let h = a.t.V.hoy(); assert.match(h, /Haz una copia de seguridad/); assert.ok(h.indexOf('Haz una copia') > h.indexOf('Prioridades'), 'al final');
  await a.click('backupLater'); assert.ok(!a.t.V.hoy().includes('Haz una copia de seguridad'));
});
test('máximo diario sugerido: se ofrece con buen cumplimiento y «Aplicar» lo cambia', async () => {
  const a = await boot(); const w = await mk(a); const wid = w.id;
  for (let i = 0; i < 12; i++) a.S.blocks.push({ id: 'h' + i, workId: wid, date: '2026-10-0' + (1 + (i % 4)), start: 1000 + (i % 3) * 120, end: 1000 + (i % 3) * 120 + 90, status: 'done', manual: true, actualMin: 90 });
  const h = a.t.V.hoy(); assert.match(h, /¿Subimos tu máximo diario/); const cap = +h.match(/data-a=applyCap data-k=(\d+)/)[1]; assert.equal(cap, a.S.settings.maxDayMin + 30);
  await a.click('applyCap', null, cap); assert.equal(a.S.settings.maxDayMin, cap);
});
test('calendario: los bloques que se solapan a la vista se reparten en carriles y los cortos son legibles', async () => {
  const a = await boot(); const w = await mk(a, { when: '14' }); const b = a.S.blocks.find(x => x.workId === w.id && x.status === 'planned');
  a.S.blocks.push({ id: 'old1', workId: w.id, date: b.date, start: b.start + 5, end: b.start + 17, status: 'skipped', manual: false });
  const cal = a.t.V.cal(); assert.match(cal, /width:calc\(50% - 4px\)/, 'dos carriles'); assert.match(cal, /class="ev [^"]*sm/, 'bloque corto en una línea');
  const hs = [...cal.matchAll(/class="ev [^"]*" style="[^"]*?height:([\d.]+)px/g)].map(m => +m[1]); assert.ok(hs.length > 0 && hs.every(h => h >= 26), 'alto mínimo legible: ' + hs);
});
