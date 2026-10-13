// Versión 6 en la app (DOM SIMULADO, no navegador real): objetivo, notas, temario, repasos, revisión, vista de día y copia.
import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const T0 = new Date(2026, 9, 12, 8, 0).getTime(), J = JSON.stringify;
test.beforeEach(() => { clock.t = T0 });
const exam = (a, i, o = {}) => ({ subjectId: a.S.subjects[i].id, when: '14', learn: 'auto', amount: 'normal', prep: '0', difficulty: '3', importance: '3', goal: 'notable', ...o });
const mins = (a, wid) => a.S.blocks.filter(b => b.workId === wid && b.status === 'planned').reduce((s, b) => s + b.end - b.start, 0);

test('objetivo: formulario valida, guarda, persiste al recargar y la fecha de la PAU fija el inicio', async () => {
  const a = await boot(); const s0 = a.S.subjects[0].id; await a.click('editGoals');
  assert.match(a.h.dlg.innerHTML, /Nota media que quieres/); assert.match(a.h.dlg.innerHTML, /Notas finales de 1\.º/); assert.match(a.h.dlg.innerHTML, /Primer día de la PAU/);
  assert.match(await a.submit({ target: '11' }), /5 a 10/); assert.equal(a.S.goals.target, null, 'nada guardado con error');
  assert.match(await a.submit({ target: '9', ['p_' + s0]: '12' }), /Revisa las notas/);
  assert.equal(await a.submit({ target: '9', ['p_' + s0]: '6,5', pauDate: '2027-06-02', pauExpected: '8', accessTarget: '' }), '');
  assert.equal(a.S.goals.target, 9); assert.equal(a.S.goals.prev[s0], 6.5); assert.equal(a.S.goals.pauDate, '2027-06-02'); assert.equal(a.S.goals.start, '2026-10-12'); assert.equal(a.S.goals.accessTarget, null);
  const b = await boot(a.store); assert.equal(b.S.goals.target, 9); assert.equal(b.S.goals.prev[s0], 6.5, 'persiste');
});
test('notas: se guardan, se editan y se borran; la proyección y la pantalla Objetivos las reflejan; valida 0–10', async () => {
  const a = await boot(); const s0 = a.S.subjects[0].id; await a.click('editGoals'); await a.submit({ target: '9', ['p_' + s0]: '7' });
  await a.click('addGrade'); assert.match(await a.submit({ subjectId: s0, kind: 'examen', score: '11', date: '2026-10-10' }), /entre 0 y 10/); assert.equal(a.S.grades.length, 0);
  assert.equal(await a.submit({ subjectId: s0, kind: 'examen', score: '5,5', date: '2026-10-10', label: 'Límites' }), ''); assert.equal(a.S.grades.length, 1); assert.equal(a.S.grades[0].score, 5.5);
  const v = a.t.V.obj(); assert.match(v, /Media proyectada/); assert.match(v, /Te faltan/); assert.match(v, /×1,/, 'factor de horas de examen visible'); assert.match(v, /Límites/);
  const id = a.S.grades[0].id; await a.click('editGrade', id); assert.equal(await a.submit({ subjectId: s0, kind: 'examen', score: '8', date: '2026-10-10' }), ''); assert.equal(a.S.grades.length, 1); assert.equal(a.S.grades[0].score, 8);
  await a.click('editGrade', id); assert.match(a.h.dlg.innerHTML, /Editar nota/); assert.match(a.h.dlg.innerHTML, /id=fdel/); a.h.confirm = true; a.t.A.editGrade({ dataset: { id } });
});
test('el objetivo cambia el plan: un examen en la asignatura con brecha recibe más minutos que sin objetivo; replanificar no duplica', async () => {
  const a = await boot(); await a.click('addExam'); await a.submit(exam(a, 1)); const w = a.S.works[0], base = mins(a, w.id);
  await a.click('editGoals'); await a.submit({ target: '10', ['p_' + a.S.subjects[1].id]: '6' });
  const more = mins(a, w.id); assert.ok(more > base, `${more} > ${base}`); assert.ok(more <= Math.round(base * 1.3 / 5) * 5 + 5);
  const before = J(a.S.blocks); await a.click('replan'); assert.equal(J(a.S.blocks), before, 'idempotente'); assert.equal(a.S.blocks.filter(b => b.workId === w.id).length, new Set(a.S.blocks.filter(b => b.workId === w.id).map(b => b.id)).size);
  await a.click('editGoals'); await a.submit({ target: '5', ['p_' + a.S.subjects[1].id]: '9' }); assert.ok(mins(a, w.id) < base, 'objetivo cumplido con holgura: algo menos de horas de examen');
});
test('temario: añadir temas en bloque sin duplicar, marcar nivel programa el primer repaso a +2 días y crea la tarea de repaso al llegar el día', async () => {
  const a = await boot(); const s = a.S.subjects[0].id; await a.click('addTopics', s);
  assert.equal(await a.submit({ names: 'Límites\nDerivadas\n\nlímites\n  Integrales ', level: '0' }), ''); assert.equal(J(a.S.syllabus.map(t => t.name)), J(['Límites', 'Derivadas', 'Integrales'])); assert.ok(a.S.syllabus.every(t => t.mastery === 0 && t.next === null));
  assert.match(await a.submit({ names: 'LÍMITES', level: '0' }), /al menos un tema nuevo/);
  const id = a.S.syllabus[0].id; await a.click('lvl', id, '2'); assert.equal(a.S.syllabus[0].mastery, 2); assert.equal(a.S.syllabus[0].next, '2026-10-14');
  assert.ok(a.S.works.some(w => w.auto === 'review' && w.topicRef === id), 'toca en ≤2 días → tarea de repaso creada');
  const rw = a.S.works.find(w => w.auto === 'review'); assert.match(rw.title, /^Repaso: Límites/); assert.ok(a.S.blocks.some(b => b.workId === rw.id && b.status === 'planned'), 'colocada en el calendario');
  await a.click('replan'); assert.equal(a.S.works.filter(w => w.auto === 'review').length, 1, 'sin duplicados al replanificar');
  const v = a.t.V.tem(); assert.match(v, /Temario/); assert.match(v, /1 de 3 temas vistos/); assert.match(v, /aria-pressed=true/);
  await a.click('lvl', id, '0'); assert.equal(a.S.syllabus[0].next, null); assert.ok(!a.S.works.some(w => w.auto === 'review' && w.status === 'pending'), 'sin ver: el repaso pendiente se retira');
});
test('completar un repaso con «Bien» sube el nivel y reprograma a +7 días; «Mal» lo repite mañana; se guarda la calidad de la sesión', async () => {
  const a = await boot(); const s = a.S.subjects[0].id; await a.click('addTopics', s); await a.submit({ names: 'Límites\nDerivadas', level: '1' });
  const rws = a.S.works.filter(w => w.auto === 'review'); assert.equal(rws.length, 2);
  const blk = id => a.S.blocks.find(b => b.workId === id && b.status === 'planned');
  const w1 = rws.find(w => /Límites/.test(w.title)), w2 = rws.find(w => /Derivadas/.test(w.title)); const b1 = blk(w1.id), b2 = blk(w2.id);
  a.t.A.doneBlk({ dataset: { id: b1.id } }); assert.match(a.h.dlg.innerHTML, /¿Cómo ha ido la sesión\?/); assert.match(a.h.dlg.innerHTML, /value="3" checked/, 'repaso: «Bien» preseleccionado');
  assert.equal(await a.submit({ actualMin: '25', goalMet: '1', quality: '3', progress: '60', difficulty: '3', interrupted: '0' }), '');
  const t1 = a.S.syllabus.find(t => t.id === w1.topicRef); assert.equal(t1.reviews, 1); assert.equal(t1.mastery, 2); assert.equal(t1.next, '2026-10-19'); assert.equal(a.S.works.find(w => w.id === w1.id).status, 'done'); assert.equal(a.S.blocks.find(b => b.id === b1.id).quality, 3);
  assert.ok(!a.S.works.some(w => w.auto === 'review' && w.topicRef === t1.id && w.status === 'pending'), 'el siguiente repaso aún no toca');
  a.t.A.doneBlk({ dataset: { id: b2.id } }); assert.equal(await a.submit({ actualMin: '25', goalMet: '0', quality: '1', progress: '20', difficulty: '4', interrupted: '0' }), '');
  const t2 = a.S.syllabus.find(t => t.id === w2.topicRef); assert.equal(t2.next, '2026-10-13'); assert.equal(t2.mastery, 1); assert.equal(a.S.blocks.find(b => b.id === b2.id).quality, 1);
  assert.equal(a.t.stats(a.S.blocks, a.S.works, { date: '2026-10-12', minute: 480 }).completedMin, 50, 'las dos sesiones cuentan una sola vez');
});
test('sesión normal: la calidad es opcional (sin valorar no guarda nada) y no afecta a tareas no repaso', async () => {
  const a = await boot(); await a.click('addTask'); await a.submit({ subjectId: a.S.subjects[1].id, when: '3', learn: 'auto', size: '3', difficulty: '3', importance: '3', pace: '1' });
  const b = a.S.blocks.find(x => x.status === 'planned'); a.t.A.doneBlk({ dataset: { id: b.id } }); assert.doesNotMatch(a.h.dlg.innerHTML, /value="3" checked/);
  assert.equal(await a.submit({ actualMin: '40', goalMet: '1', quality: '', progress: '50', difficulty: '3', interrupted: '0' }), ''); assert.equal(a.S.blocks.find(x => x.id === b.id).quality, undefined);
});
test('curso hasta la PAU, revisión semanal y Hoy: se pintan con datos reales; sin datos piden definirlos', async () => {
  const a = await boot(); assert.match(a.t.V.cur(), /Falta la fecha de la PAU/); assert.match(a.t.V.obj(), /Aún no hay objetivo/); assert.doesNotMatch(a.t.V.hoy(), /Media proyectada/);
  const s0 = a.S.subjects[0].id; await a.click('editGoals'); await a.submit({ target: '9', ['p_' + s0]: '6', pauDate: '2027-06-02' });
  assert.match(a.t.V.cur(), /233 días/); assert.match(a.t.V.cur(), /Falta el temario/); assert.match(a.t.V.hoy(), /Media proyectada 6 · objetivo 9/);
  await a.click('addTopics', s0); await a.submit({ names: 'A\nB\nC', level: '0' }); assert.match(a.t.V.cur(), /Vas bien|Vas justo|no llegas/); assert.match(a.t.V.cur(), /Cobertura por asignatura/);
  assert.match(a.t.V.rev(), /Revisión semanal/); assert.match(a.t.V.rev(), /cumplimiento/);
  assert.match(a.t.V.hoy(), /Revisión semanal lista/, 'lunes: aparece la tarjeta');
});
test('Hoy pide la nota de un examen pasado y avisa de la copia de seguridad semanal; descargarla la apaga', async () => {
  const a = await boot(); await a.click('addExam'); await a.submit(exam(a, 0, { when: '2' })); clock.t = new Date(2026, 9, 16, 9, 0).getTime(); await a.t.commit({ quiet: true });
  const h = a.t.V.hoy(); assert.match(h, /¿Qué nota sacaste en/); assert.match(h, /data-a=gradeFor/); assert.match(h, /copia de seguridad/);
  await a.click('gradeFor', a.S.works[0].id); assert.match(a.h.dlg.innerHTML, /Nueva nota/); assert.equal(await a.submit({ subjectId: a.S.subjects[0].id, kind: 'examen', score: '7', date: '2026-10-14' }), ''); assert.equal(a.S.grades[0].workId, a.S.works[0].id);
  assert.doesNotMatch(a.t.V.hoy(), /¿Qué nota sacaste en/, 'con nota guardada ya no se pregunta');
  await a.click('export'); assert.doesNotMatch(a.t.V.hoy(), /copia de seguridad/); assert.match(a.h.blob, /"grades"/, 'la copia incluye las notas');
});
test('revisión semanal de lunes: aparece la tarjeta en Hoy y «Marcar como revisada» la apaga; acción «Aplicar» baja el máximo diario', async () => {
  const a = await boot(); assert.match(a.t.V.hoy(), /Revisión semanal lista/); await a.click('revSeen'); assert.doesNotMatch(a.t.V.hoy(), /Revisión semanal lista/); assert.equal(a.S.reviewedOn, '2026-10-12');
  assert.equal(a.S.settings.maxDayMin, 240); a.t.A.revApply({ dataset: { v: '180' } }); await a.tick(); assert.equal(a.S.settings.maxDayMin, 180);
});
test('vista de día del calendario: una sola columna, navega de día en día y vuelve a semana', async () => {
  const a = await boot(); await a.click('calMode'); let v = a.t.V.cal(); assert.match(v, /class="tg one"|class="tg hasnos one"/); assert.match(v, /Ver semana/); assert.equal((v.match(/class="day[^"]* sel"/g) || []).length, 1);
  assert.match(v, /lunes 12 de octubre/i); await a.click('wk', undefined, '7'); assert.match(a.t.V.cal(), /martes 13 de octubre/i); await a.click('wk', undefined, '-7'); await a.click('wk', undefined, '-7'); assert.match(a.t.V.cal(), /domingo 11 de octubre/i);
  await a.click('calMode'); v = a.t.V.cal(); assert.doesNotMatch(v, /class="tg one"/); assert.match(v, /Ver día/);
});
test('estado antiguo (sin goals/grades/syllabus) abre sin errores y los añade; exportar/importar conserva notas y temario', async () => {
  const a = await boot(); const s0 = a.S.subjects[0].id; await a.click('editGoals'); await a.submit({ target: '9' }); await a.click('addGrade'); await a.submit({ subjectId: s0, kind: 'tarea', score: '9', date: '2026-10-11' }); await a.click('addTopics', s0); await a.submit({ names: 'Uno', level: '1' });
  const st = JSON.parse(a.store['focusos.v1']); delete st.goals; delete st.grades; delete st.syllabus; const old = { 'focusos.v1': JSON.stringify(st) };
  const b = await boot(old); assert.ok(b.S.goals && Array.isArray(b.S.grades) && Array.isArray(b.S.syllabus)); assert.match(b.t.V.obj(), /Aún no hay objetivo/);
  const c = await boot(); await c.t.importText(JSON.stringify({ app: 'focus-os', schema: 3, ...JSON.parse(a.store['focusos.v1']) })); await c.tick();
  assert.equal(c.S.grades.length, 1); assert.equal(c.S.syllabus.length, 1); assert.equal(c.S.goals.target, 9);
});
