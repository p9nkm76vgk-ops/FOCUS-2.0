// Versión 6 en la app (DOM SIMULADO, no navegador real): objetivo, notas, temario, repasos, revisión, vista de día y copia.
import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const T0 = new Date(2026, 9, 12, 8, 0).getTime(), J = JSON.stringify;
test.beforeEach(() => { clock.t = T0 });
const exam = (a, i, o = {}) => ({ subjectId: a.S.subjects[i].id, when: '14', learn: 'auto', amount: 'normal', prep: '0', difficulty: '3', importance: '3', goal: 'notable', ...o });
const mins = (a, wid) => a.S.blocks.filter(b => b.workId === wid && b.status === 'planned').reduce((s, b) => s + b.end - b.start, 0);

test('objetivo: formulario valida, guarda, persiste al recargar y la fecha de la PAU fija el inicio', async () => {
  const a = await boot(); const s0 = a.S.subjects[0].id; await a.click('editGoals');
  assert.match(a.h.dlg.innerHTML, /Nota media que quieres/); assert.match(a.h.dlg.innerHTML, /Nota media de 1\.º de Bachillerato/); assert.doesNotMatch(a.h.dlg.innerHTML, /name=p_/, 'solo se pide la media de 1.º, no una nota por asignatura'); assert.match(a.h.dlg.innerHTML, /Primer día de la PAU/);
  assert.match(await a.submit({ target: '11' }), /5 a 10/); assert.equal(a.S.goals.target, null, 'nada guardado con error');
  assert.match(await a.submit({ target: '9', prevAvg: '12' }), /media de 1\.º va de 0 a 10/);
  assert.equal(await a.submit({ target: '9', prevAvg: '6,5', pauDate: '2027-06-02', pauExpected: '8', accessTarget: '' }), '');
  assert.equal(a.S.goals.target, 9); assert.equal(a.S.goals.prevAvg, 6.5); assert.equal(a.S.goals.pauDate, '2027-06-02'); assert.equal(a.S.goals.start, '2026-10-12'); assert.equal(a.S.goals.accessTarget, null);
  const b = await boot(a.store); assert.equal(b.S.goals.target, 9); assert.equal(b.S.goals.prevAvg, 6.5, 'persiste');
});
test('añadir nota de examen con porcentaje: valida, calcula lo que llevas y lo que necesitas, edita, borra y no deja pasar de 100 %', async () => {
  const a = await boot(); const mat = a.S.subjects[0].id; await a.click('editGoals'); await a.submit({ target: '9' });
  await a.click('addGrade'); const f = a.h.dlg.innerHTML; assert.match(f, /Porcentaje que valía el examen/); assert.match(f, /Nota sacada/); assert.match(f, /1\.ª/); assert.match(f, /3\.ª · final/);
  assert.match(await a.submit({ subjectId: mat, evalNo: '1', weight: '24', score: '11', date: '2026-10-10' }), /entre 0 y 10/); assert.match(await a.submit({ subjectId: mat, evalNo: '1', weight: '0', score: '4', date: '2026-10-10' }), /porcentaje/); assert.equal(a.S.grades.length, 0);
  assert.equal(await a.submit({ subjectId: mat, evalNo: '1', weight: '24', score: '4', date: '2026-10-10', label: 'Límites' }), ''); assert.equal(a.S.grades.length, 1); assert.equal(a.S.grades[0].weight, 24); assert.equal(a.S.grades[0].evalNo, 1);
  let v = a.t.V.obj(); assert.match(v, /Cómo vas/); assert.match(v, /<b>4<\/b>/, 'llevas un 4'); assert.match(v, /24 %/); assert.match(v, /No llegas \(máx\. 8,6\)/, 'tu ejemplo: con un 4 al 24 % el 9 ya no es posible'); assert.match(v, /Límites/);
  const id = a.S.grades[0].id; await a.click('editGrade', id); assert.match(a.h.dlg.innerHTML, /Editar nota/); assert.equal(await a.submit({ subjectId: mat, evalNo: '1', weight: '24', score: '9', date: '2026-10-10' }), ''); assert.equal(a.S.grades.length, 1);
  assert.match(a.t.V.obj(), /<b>9<\/b><\/td><\/tr>/, 'un 9 al 24 % con objetivo 9: necesitas otro 9 de media en el 76 % restante');
  await a.click('addGrade'); assert.match(await a.submit({ subjectId: mat, evalNo: '1', weight: '80', score: '5', date: '2026-10-11' }), /pasaría de 100/); assert.equal(a.S.grades.length, 1);
  assert.equal(await a.submit({ subjectId: mat, evalNo: '2', weight: '80', score: '5', date: '2027-02-11' }), '', 'otra evaluación: su propio 100 %'); assert.equal(a.S.grades.length, 2);
  a.t.A.objEv({ dataset: { k: 2 } }); assert.match(a.t.V.obj(), /2\.ª evaluación/); assert.match(a.t.V.obj(), /80 %/); a.t.A.objEv({ dataset: { k: 3 } }); assert.match(a.t.V.obj(), /nota final de 2\.º de Bachillerato/);
  await a.click('editGrade', id); a.h.confirm = true; const del = a.h.dlg; assert.match(del.innerHTML, /id=fdel/); 
});
test('el objetivo cambia el plan: tras un mal resultado el siguiente examen de esa asignatura recibe más minutos (≤ +30 %) y replanificar no duplica', async () => {
  const a = await boot(); await a.click('addExam'); await a.submit(exam(a, 0)); const w = a.S.works[0], base = mins(a, w.id), mat = a.S.subjects[0].id;
  await a.click('editGoals'); await a.submit({ target: '10' }); assert.equal(mins(a, w.id), base, 'sin notas no hay brecha: el plan no cambia');
  await a.click('addGrade'); await a.submit({ subjectId: mat, evalNo: '1', weight: '24', score: '4', date: '2026-10-10' });
  const more = mins(a, w.id); assert.ok(more > base, `${more} > ${base}`); assert.ok(more <= Math.round(base * 1.3 / 5) * 5 + 5);
  const before = J(a.S.blocks); await a.click('replan'); assert.equal(J(a.S.blocks), before, 'idempotente'); assert.equal(a.S.blocks.filter(b => b.workId === w.id).length, new Set(a.S.blocks.filter(b => b.workId === w.id).map(b => b.id)).size);
  await a.click('addGrade'); await a.submit({ subjectId: mat, evalNo: '1', weight: '24', score: '10', date: '2026-10-11' }); await a.click('editGoals'); await a.submit({ target: '5' }); assert.ok(mins(a, w.id) < base, 'objetivo cumplido con holgura: algo menos de horas de examen');
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
test('curso hasta la PAU, Objetivos y Hoy: se pintan con datos reales; sin datos piden definirlos', async () => {
  const a = await boot(); assert.match(a.t.V.cur(), /Falta la fecha de la PAU/); assert.match(a.t.V.obj(), /Aún no hay objetivo/); assert.doesNotMatch(a.t.V.hoy(), /Llevas/);
  const s0 = a.S.subjects[0].id; await a.click('editGoals'); await a.submit({ target: '9', pauDate: '2027-06-02' });
  assert.match(a.t.V.cur(), /233 días/); assert.match(a.t.V.cur(), /Falta el temario/); assert.doesNotMatch(a.t.V.hoy(), /Llevas/, 'sin notas no hay media');
  await a.click('addGrade'); await a.submit({ subjectId: s0, evalNo: '1', weight: '30', score: '6', date: '2026-10-10' }); assert.match(a.t.V.hoy(), /Llevas 6 de media · objetivo 9/);
  await a.click('addTopics', s0); await a.submit({ names: 'A\nB\nC', course: '2', level: '0' }); assert.match(a.t.V.cur(), /Vas bien|Vas justo|no llegas/); assert.match(a.t.V.cur(), /Cobertura por asignatura/);
  assert.doesNotMatch(a.t.V.hoy(), /Revisión semanal/); assert.equal(a.t.V.rev, undefined, 'la revisión semanal ya no existe');
});
test('Hoy pide la nota de un examen pasado y avisa de la copia de seguridad semanal; descargarla la apaga', async () => {
  const a = await boot(); await a.click('addExam'); await a.submit(exam(a, 0, { when: '2' })); clock.t = new Date(2026, 9, 16, 9, 0).getTime(); await a.t.commit({ quiet: true });
  const h = a.t.V.hoy(); assert.match(h, /¿Qué nota sacaste en/); assert.match(h, /data-a=gradeFor/); assert.match(h, /copia de seguridad/);
  await a.click('gradeFor', a.S.works[0].id); assert.match(a.h.dlg.innerHTML, /Añadir nota de examen/); assert.equal(await a.submit({ subjectId: a.S.subjects[0].id, evalNo: '1', weight: '25', score: '7', date: '2026-10-14' }), ''); assert.equal(a.S.grades[0].workId, a.S.works[0].id);
  assert.doesNotMatch(a.t.V.hoy(), /¿Qué nota sacaste en/, 'con nota guardada ya no se pregunta');
  await a.click('export'); assert.doesNotMatch(a.t.V.hoy(), /copia de seguridad/); assert.match(a.h.blob, /"grades"/, 'la copia incluye las notas');
});

test('vista de día del calendario: una sola columna, navega de día en día y vuelve a semana', async () => {
  const a = await boot(); await a.click('calMode'); let v = a.t.V.cal(); assert.match(v, /class="tg one"|class="tg hasnos one"/); assert.match(v, /Ver semana/); assert.equal((v.match(/class="day[^"]* sel"/g) || []).length, 1);
  assert.match(v, /lunes 12 de octubre/i); await a.click('wk', undefined, '7'); assert.match(a.t.V.cal(), /martes 13 de octubre/i); await a.click('wk', undefined, '-7'); await a.click('wk', undefined, '-7'); assert.match(a.t.V.cal(), /domingo 11 de octubre/i);
  await a.click('calMode'); v = a.t.V.cal(); assert.doesNotMatch(v, /class="tg one"/); assert.match(v, /Ver día/);
});
test('estado antiguo (sin goals/grades/syllabus) abre sin errores y los añade; una nota antigua sin porcentaje se conserva pero no cuenta; exportar/importar conserva notas y temario', async () => {
  const a = await boot(); const s0 = a.S.subjects[0].id; await a.click('editGoals'); await a.submit({ target: '9' }); await a.click('addGrade'); await a.submit({ subjectId: s0, evalNo: '1', weight: '20', score: '9', date: '2026-10-11' }); await a.click('addTopics', s0); await a.submit({ names: 'Uno', course: '2', level: '1' });
  const st = JSON.parse(a.store['focusos.v1']); delete st.goals; delete st.grades; delete st.syllabus; const old = { 'focusos.v1': JSON.stringify(st) };
  const b = await boot(old); assert.ok(b.S.goals && Array.isArray(b.S.grades) && Array.isArray(b.S.syllabus)); assert.match(b.t.V.obj(), /Aún no hay objetivo/);
  const legacy = JSON.parse(a.store['focusos.v1']); legacy.grades = [{ id: 'g0', subjectId: s0, score: 8, kind: 'examen', date: '2026-10-05' }]; const l = await boot({ 'focusos.v1': JSON.stringify(legacy) });
  assert.match(l.t.V.obj(), /falta el porcentaje/); assert.equal(l.S.grades.length, 1, 'se conserva'); assert.doesNotMatch(l.t.V.hoy(), /Llevas/, 'sin porcentaje no cuenta');
  const c = await boot(); await c.t.importText(JSON.stringify({ app: 'focus-os', schema: 3, ...JSON.parse(a.store['focusos.v1']) })); await c.tick();
  assert.equal(c.S.grades.length, 1); assert.equal(c.S.syllabus.length, 1); assert.equal(c.S.goals.target, 9);
});
test('temario por curso: 1.º y 2.º en bloques separados, altas escalonadas (3 por día) para no crear avalancha de repasos', async () => {
  const a = await boot(); const sid = a.S.subjects[0].id; await a.click('addTopics', sid); assert.match(a.h.dlg.innerHTML, /Curso al que pertenecen/); assert.match(a.h.dlg.innerHTML, /todo el temario acumulado/);
  const names = Array.from({ length: 9 }, (_, i) => 'Tema ' + (i + 1)).join('\n'); assert.equal(await a.submit({ names, course: '1', level: '2' }), '');
  assert.ok(a.S.syllabus.every(t => t.course === 1)); const nx = a.S.syllabus.map(t => t.next); assert.equal(J(nx), J(['2026-10-14', '2026-10-14', '2026-10-14', '2026-10-15', '2026-10-15', '2026-10-15', '2026-10-16', '2026-10-16', '2026-10-16']));
  assert.equal(a.S.works.filter(w => w.auto === 'review').length, 3, 'solo los 3 que tocan en ≤2 días; el resto entra día a día');
  await a.click('addTopics', sid); assert.equal(await a.submit({ names: 'Tema de 2.º', course: '2', level: '0' }), '');
  const v = a.t.V.tem(); assert.match(v, /1\.º de Bachillerato/); assert.match(v, /2\.º de Bachillerato/); assert.ok(v.indexOf('1.º de Bachillerato</h4>') < v.indexOf('2.º de Bachillerato</h4>'));
  await a.click('editGoals'); await a.submit({ target: '9', pauDate: '2027-06-02' }); const c = a.t.V.cur(); assert.match(c, /Todo se arrastra hasta la PAU/); assert.match(c, /Cobertura por curso/);
});

test('solo se pide la media de 1.º (sirve para la nota de acceso, no se mezcla con las notas de cada asignatura de 2.º)', async () => {
  const a = await boot(); await a.click('editGoals'); await a.submit({ target: '9', prevAvg: '7', pauDate: '', pauExpected: '8' }); const x = a.S.subjects[0].id;
  assert.doesNotMatch(a.t.V.obj(), /Nota de acceso estimada/, 'sin notas de 2.º aún no hay media');
  await a.click('addGrade'); await a.submit({ subjectId: x, evalNo: '1', weight: '100', score: '9', date: '2026-10-10' });
  const v = a.t.V.obj(); assert.match(v, /Nota de acceso estimada \(0,6 · media de bachillerato 8 \+ 0,4 · PAU\): <b>8<\/b>/, '(7+9)/2 = 8 → 0,6·8 + 0,4·8 = 8');
  assert.match(v, /<td>—<\/td><td class="">0 %<\/td>/, 'las asignaturas sin notas no heredan la media de 1.º');
});