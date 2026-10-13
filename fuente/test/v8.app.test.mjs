// Versión 8 en la app (DOM SIMULADO, no navegador real): temporizador, nota baja → temas, semanas críticas y .ics.
import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const T0 = new Date(2026, 9, 12, 8, 0).getTime();
test.beforeEach(() => { clock.t = T0 });
const opts = (a, o = {}) => ({ subjectId: a.S.subjects[1].id, when: '1', learn: 'auto', size: '3', difficulty: '3', importance: '3', pace: '1', ...o });
const mk = async (a, o) => { await a.click('addTask'); await a.submit(opts(a, o)); return a.S.works.at(-1) };
const today = a => a.S.blocks.find(x => x.date === '2026-10-12' && x.status === 'planned');

test('temporizador: empezar, sigue tras recargar, terminar guarda los minutos reales una sola vez', async () => {
  const a = await boot(); const w = await mk(a, { when: '0', size: '5' }); const b = today(a); assert.ok(b, 'hay una sesión hoy'); assert.match(a.t.V.hoy(), /data-a=timerStart/);
  await a.click('timerStart', b.id); assert.match(a.t.V.hoy(), /En marcha/); assert.ok(!/data-a=timerStart/.test(a.t.V.hoy()), 'solo una a la vez');
  clock.t += 23 * 60000; const r = await boot(a.store); assert.match(r.t.V.hoy(), /23 min/, 'sigue contando tras recargar');
  await a.click('timerEnd'); const bb = a.S.blocks.find(x => x.id === b.id); assert.equal(bb.status, 'done'); assert.equal(bb.actualMin, 23);
  assert.ok(!/En marcha/.test(a.t.V.hoy())); const st = a.t.stats(a.S.blocks, a.S.works, { date: '2026-10-12', minute: 8 * 60 + 23 }); assert.equal(st.completedMin, 23);
});
test('temporizador: cancelar no registra nada; no se empieza una sesión de otro día', async () => {
  const a = await boot(); await mk(a, { when: '14', size: '5' }); const fut = a.S.blocks.find(x => x.status === 'planned' && x.date > '2026-10-12');
  await a.click('timerStart', fut.id); assert.ok(!a.t.V.hoy().includes('En marcha')); assert.match(a.h.toast, /solo puedes empezar sesiones de hoy/i);
  const w = await mk(a, { when: '0', size: '5' }); const b = today(a); await a.click('timerStart', b.id); await a.click('timerCancel'); assert.equal(a.S.blocks.find(x => x.id === b.id).status, 'planned'); assert.ok(!a.t.V.hoy().includes('En marcha'));
});
test('nota baja: Hoy ofrece elegir los temas fallados; al guardar vuelven a repaso y la tarjeta desaparece', async () => {
  const a = await boot(); const sid = a.S.subjects[0].id; await a.click('editGoals'); await a.submit({ target: '9' });
  a.S.syllabus.push({ id: 'tA', subjectId: sid, name: 'Matrices', course: 2, mastery: 3, reviews: 3, last: '2026-09-01', next: '2027-01-01', createdAt: 1 }, { id: 'tB', subjectId: sid, name: 'Límites', course: 2, mastery: 2, reviews: 1, last: '2026-09-01', next: '2027-01-01', createdAt: 2 });
  await a.click('addGrade'); assert.equal(await a.submit({ subjectId: sid, evalNo: '1', weight: '24', score: '4', date: '2026-10-10', label: 'Parcial' }), '');
  let h = a.t.V.hoy(); assert.match(h, /Sacaste un 4/); const id = h.match(/data-a=weakTopics data-id="([^"]+)"/)[1];
  await a.click('weakTopics', id); assert.match(a.h.dlg.innerHTML, /Matrices/); assert.match(a.h.dlg.innerHTML, /Límites/);
  assert.equal(await a.submit({ t_tA: 'on' }), ''); const A = a.S.syllabus.find(t => t.id === 'tA'), B = a.S.syllabus.find(t => t.id === 'tB');
  assert.equal(A.mastery, 1); assert.equal(A.reviews, 0); assert.equal(A.next, '2026-10-13'); assert.equal(B.mastery, 2, 'el no marcado no cambia');
  assert.ok(!/Sacaste un 4/.test(a.t.V.hoy())); assert.ok(a.S.grades[0].weakDone);
  await a.click('editGrade', a.S.grades[0].id); assert.equal(await a.submit({ subjectId: sid, evalNo: '1', weight: '24', score: '4', date: '2026-10-10' }), ''); assert.ok(a.S.grades[0].weakDone, 'editar la nota no vuelve a preguntar');
});
test('nota alta o sin temario: no pregunta', async () => {
  const a = await boot(); const sid = a.S.subjects[0].id; await a.click('editGoals'); await a.submit({ target: '9' });
  await a.click('addGrade'); await a.submit({ subjectId: sid, evalNo: '1', weight: '24', score: '4', date: '2026-10-10' }); assert.ok(!/Sacaste un/.test(a.t.V.hoy()), 'sin temario no hay qué elegir');
  a.S.syllabus.push({ id: 'tA', subjectId: sid, name: 'M', course: 2, mastery: 1, reviews: 0, last: '2026-10-01', next: '2026-10-20', createdAt: 1 }); await a.click('addGrade'); await a.submit({ subjectId: sid, evalNo: '1', weight: '10', score: '9,5', date: '2026-10-11' });
  const n = [...a.t.V.hoy().matchAll(/Sacaste un ([\d,]+)/g)].map(m => m[1]); assert.deepEqual(n, ['4'], 'solo la nota baja');
});
test('semanas críticas: Exámenes muestra la tabla y Hoy avisa de una semana cargada', async () => {
  const a = await boot(); for (const s of [0, 1, 2]) { await a.click('addExam'); await a.submit({ subjectId: a.S.subjects[s].id, when: '7', learn: 'auto', amount: 'normal', prep: '0', difficulty: '3', importance: '3', goal: 'notable' }); }
  const ex = a.t.V.exa(); assert.match(ex, /Próximas semanas/); assert.match(ex, /⚠ cargada/); assert.match(a.t.V.hoy(), /Semana cargada/);
});
test('.ics: avisa con el número de eventos y descarga un archivo de calendario válido', async () => {
  const a = await boot(); await mk(a, { when: '7', size: '4' }); assert.match(a.t.V.cal(), /data-a=icsAsk/);
  await a.click('icsAsk'); assert.match(a.h.dlg.innerHTML, /Añadir todo/); assert.match(a.h.dlg.innerHTML, /<b>\d+<\/b> eventos/);
  a.t.A.choice({ dataset: { i: '0' } }); await a.tick(); assert.match(String(a.h.blob), /^BEGIN:VCALENDAR/); assert.match(String(a.h.blob), /SUMMARY:Estudio · /);
});

test('«Luego» de la copia y «Ahora no» del máximo diario se recuerdan tras recargar', async () => {
  const a = await boot(); await mk(a); await a.click('backupLater'); const r = await boot(a.store); assert.ok(!r.t.V.hoy().includes('Haz una copia de seguridad'), 'sigue aplazada');
});
test('«No la haré» deja el hueco libre; «Nunca a esta hora» lo quita de la disponibilidad de ese día', async () => {
  const a = await boot(); await mk(a, { when: '0', size: '5' }); const b = today(a); assert.ok(b);
  await a.click('skipBlk', b.id); a.t.A.choice({ dataset: { i: '0' } }); await a.tick();
  const sk = a.S.blocks.find(x => x.id === b.id); assert.equal(sk.status, 'skipped');
  assert.ok(!a.S.blocks.some(x => x.status === 'planned' && x.date === sk.date && x.start < sk.end && x.end > sk.start), 'no se rellena el mismo hueco');
  const b2 = today(a); assert.ok(b2, 'queda otra sesión hoy'); { const wd = new Date(b2.date + 'T00:00:00Z').getUTCDay(), before = JSON.stringify(a.S.settings.availability[wd]); await a.click('skipBlk', b2.id); a.t.A.choice({ dataset: { i: '4' } }); await a.tick();
    assert.notEqual(JSON.stringify(a.S.settings.availability[wd]), before, 'disponibilidad recortada'); assert.ok(!a.S.blocks.some(x => x.status === 'planned' && x.date === b2.date && x.start < b2.end && x.end > b2.start)); }
});
test('pausa del plan: no se programa estudio en esos días, lo pendiente se recoloca y al reanudar vuelve; evolución de notas visible', async () => {
  const a = await boot(); await mk(a, { when: '14', size: '4' }); const need = () => a.S.blocks.filter(x => x.status === 'planned').reduce((s, x) => s + x.end - x.start, 0), n0 = need();
  await a.click('pause', null, 2); assert.ok(!a.S.blocks.some(x => x.status === 'planned' && (x.date === '2026-10-12' || x.date === '2026-10-13')), 'sin sesiones en la pausa'); assert.equal(need(), n0, 'lo pendiente se recoloca después');
  assert.match(a.t.V.hoy(), /Plan en pausa hasta/); assert.match(a.t.V.aj(), /Reanudar ya/);
  await a.click('resume'); assert.ok(!/Plan en pausa/.test(a.t.V.hoy()));
  const sid = a.S.subjects[0].id; await a.click('addGrade'); await a.submit({ subjectId: sid, evalNo: '1', weight: '20', score: '7', date: '2026-10-10' }); assert.match(a.t.V.obj(), /Evolución por evaluación/);
});
test('patrón nuevo: una instalación anterior se regenera una sola vez al abrir; «Regenerar futuro» respeta historial y sesiones manuales', async () => {
  const a = await boot(); await mk(a, { when: '14', size: '5' }); const done = a.S.blocks.find(x => x.status === 'planned'); await a.click('quickDone', done.id);
  await a.click('addBlk'); await a.submit({ workId: a.S.works[0].id, date: '2026-10-20', s: '16:00', e: '16:50' }); const man = a.S.blocks.find(x => x.manual);
  const old = JSON.parse(JSON.stringify(a.store)); const st = JSON.parse(old['focusos.v1']); delete (st.state ?? st).patternV; old['focusos.v1'] = JSON.stringify(st);
  const r = await boot(old); assert.equal(r.S.patternV, 2); assert.ok(r.S.blocks.find(x => x.id === done.id && x.status === 'done'), 'historial intacto'); assert.ok(r.S.blocks.find(x => x.id === man.id), 'manual intacta');
  const ids = r.S.blocks.map(x => x.id).sort().join(); const r2 = await boot(r.store); assert.equal(r2.S.blocks.map(x => x.id).sort().join(), ids, 'abrir otra vez no cambia nada');
  await r2.click('replan'); assert.equal(r2.S.blocks.map(x => x.id).sort().join(), ids, 'regenerar con los mismos datos da lo mismo (idempotente)'); assert.ok(r2.S.blocks.find(x => x.id === man.id));
});
test('cena y ducha: sin estudio de 20:30 a 22:00 por defecto; una instalación anterior se recorta una vez y lo que añadas después se respeta', async () => {
  const overlaps = av => Object.values(av).flat().some(w => w.start < 1320 && w.end > 1230);
  const a = await boot(); assert.ok(!overlaps(a.S.settings.availability), 'valores iniciales sin esa franja'); await mk(a, { when: '14', size: '5' }); assert.ok(a.S.blocks.filter(b => b.status === 'planned').every(b => b.end <= 1230), 'ninguna sesión pasa de las 20:30');
  const old = JSON.parse(JSON.stringify(a.store)); const st = JSON.parse(old['focusos.v1']), S0 = st.state ?? st; delete S0.cenaV; S0.settings.availability[3] = [{ start: 930, end: 1230 }, { start: 1275, end: 1320 }]; old['focusos.v1'] = JSON.stringify(st);
  const r = await boot(old); assert.equal(r.S.cenaV, 1); assert.ok(!overlaps(r.S.settings.availability), 'recortada la franja de 21:15–22:00'); assert.equal(JSON.stringify(r.S.settings.availability[3]), JSON.stringify([{ start: 930, end: 1230 }]));
  r.S.settings.availability[3] = [{ start: 930, end: 1230 }, { start: 1290, end: 1350 }]; await r.t.commit({ quiet: true }); const r2 = await boot(r.store);
  assert.equal(JSON.stringify(r2.S.settings.availability[3]), JSON.stringify([{ start: 930, end: 1230 }, { start: 1290, end: 1350 }]), 'lo que añades a mano se respeta en el siguiente arranque');
  assert.match(a.t.V.aj(), /Cena y ducha/);
});

test('regenerar: la versión anterior desaparece por completo (sin «sustituidas» ni omitidas de rutina futuras) y no quedan solapes', async () => {
  const a = await boot(); await mk(a, { when: '5', size: '5' });
  a.S.habit.push({ id: 'hab:2026-10-16:930:x', date: '2026-10-16', start: 930, end: 980, subjectId: a.S.subjects[0].id, kind: 'estudio', title: 'x', detail: '', status: 'replaced', pinned: false });
  a.S.habit.push({ id: 'hab:2026-10-17:930:x', date: '2026-10-17', start: 930, end: 980, subjectId: a.S.subjects[0].id, kind: 'estudio', title: 'x', detail: '', status: 'skipped', pinned: false });
  await a.click('replan');
  const fut = a.S.habit.filter(h => h.date >= '2026-10-12');
  assert.ok(!fut.some(h => ['replaced', 'displaced', 'skipped'].includes(h.status)), 'sin fantasmas ' + JSON.stringify(fut.filter(h => h.status !== 'planned')));
  const live = [...a.S.blocks.filter(b => b.status === 'planned'), ...a.S.habit.filter(h => h.status === 'planned')];
  for (const x of live) for (const y of live) if (x !== y && x.date === y.date) assert.ok(x.end <= y.start || y.end <= x.start, `solape ${x.date} ${x.start}`);
});
