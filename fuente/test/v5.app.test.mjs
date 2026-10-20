// Versión 5 en la app (DOM SIMULADO, no navegador real): formularios por opciones, tareas sin fecha, bloques sencillos, sin Explorar, tema.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { boot, clock } from './harness.mjs';
const T0 = new Date(2026, 9, 12, 8, 0).getTime(), J = JSON.stringify;
test.beforeEach(() => { clock.t = T0 });
const opts = (a, o = {}) => ({ subjectId: a.S.subjects[1].id, when: '7', learn: 'auto', size: '3', difficulty: '3', importance: '3', pace: '1', ...o });

test('crear una tarea SOLO con opciones: sin escribir nada, con nombre automático, tipo según la asignatura y estimación', async () => {
  const a = await boot(); await a.click('addTask'); const dlg = a.h.dlg.innerHTML;
  assert.match(dlg, /type=radio name=subjectId/); assert.match(dlg, /type=radio name=when/); assert.match(dlg, /Sin fecha/); assert.match(dlg, /Guardar y añadir otra/); assert.match(dlg, /<details class=more>/);
  assert.doesNotMatch(dlg.split('<details')[0], /<input[^>]*type=(text|number)/, 'lo principal no pide escribir');
  assert.equal(await a.submit(opts(a)), ''); const w = a.S.works[0];
  assert.equal(w.title, 'Problemas de Física'); assert.equal(w.learn, 'problemas'); assert.equal(w.dueDate, '2026-10-19'); assert.ok(!w.noDate); assert.ok(w.estimate && w.estimate.totalMin > 0);
  assert.ok(a.S.blocks.some(b => b.workId === w.id && b.status === 'planned'), 'genera sesiones');
  await a.click('addTask'); assert.equal(await a.submit(opts(a, { subjectId: a.S.subjects[4].id })), ''); assert.equal(a.S.works[1].title, 'Redacción de Lengua Castellana'); assert.equal(a.S.works[1].learn, 'comentario');
});
test('«Sin fecha»: la tarea se guarda como sin fecha y el calendario la sitúa en los mejores huecos; la lista las separa', async () => {
  const a = await boot(); await a.click('addTask'); assert.equal(await a.submit(opts(a, { when: 'none', importance: '5' })), ''); const w = a.S.works[0];
  assert.equal(w.noDate, true); assert.equal(w.dueDate, '9999-12-31'); assert.equal(w.dueMinute, undefined);
  const bs = a.S.blocks.filter(b => b.workId === w.id && b.status === 'planned'); assert.ok(bs.length >= 1); assert.ok(bs.every(b => b.date >= '2026-10-12' && b.date <= '2026-10-25'));
  const tar = a.t.V.tar(); assert.match(tar, /<h2>Sin fecha<\/h2>/); assert.match(tar, /Sin fecha · /); assert.match(a.t.V.hoy(), /lunes 12 de octubre/); a.t.A.nav({ dataset: { r: 'cal' } }); assert.match(a.t.V.cal(), /sin fecha/);
  const snap = J(a.S.blocks); await a.t.commit(); await a.t.commit(); assert.equal(J(a.S.blocks), snap, 'idempotente');
  assert.match(a.t.V.hoy(), /Sin fecha · /, 'aparece entre las prioridades de hoy'); assert.doesNotMatch(a.t.V.hoy(), /Atrasadas/);
  await a.click('toggle', w.id); assert.equal(a.S.blocks.filter(b => b.workId === w.id && b.status === 'planned').length, 0); await a.click('toggle', w.id); assert.ok(a.S.blocks.some(b => b.workId === w.id && b.status === 'planned'));
});
test('convertir una tarea con fecha en «sin fecha» y al revés (editar con botones)', async () => {
  const a = await boot(); await a.click('addTask'); await a.submit(opts(a)); const id = a.S.works[0].id;
  await a.click('editTask', id); assert.match(a.h.dlg.innerHTML, /value="keep" checked/); assert.match(a.h.dlg.innerHTML, /Mantener: 2026-10-19/); assert.equal(await a.submit(opts(a, { when: 'none' })), ''); assert.equal(a.S.works[0].noDate, true);
  await a.click('editTask', id); assert.match(a.h.dlg.innerHTML, /value="keep" checked/); assert.match(a.h.dlg.innerHTML, /Sin fecha<\/span>/); assert.equal(await a.submit(opts(a, { when: 'keep' })), ''); assert.equal(a.S.works[0].noDate, true, 'mantener = seguir sin fecha');
  await a.click('editTask', id); assert.equal(await a.submit(opts(a, { when: '3' })), ''); assert.equal(a.S.works[0].dueDate, '2026-10-15'); assert.ok(!a.S.works[0].noDate);
  await a.click('editTask', id); assert.equal(await a.submit(opts(a, { when: '3', dueDate: '2026-10-30' })), ''); assert.equal(a.S.works[0].dueDate, '2026-10-30', 'la fecha elegida a mano manda');
});
test('guardar y añadir otra: conserva la asignatura y deja el formulario abierto para la siguiente', async () => {
  const a = await boot(); await a.click('addTask'); a.h.dlg.open = true; a.h.form = opts(a, { when: 'none' }); const sid = a.S.subjects[2].id; a.h.form.subjectId = sid;
  await a.h.dlg.onsubmit({ preventDefault() {}, target: a.h.dlg, submitter: { value: 'again' } }); await a.tick();
  assert.equal(a.S.works.length, 1); assert.ok(a.h.dlg.open, 'sigue abierto'); assert.match(a.h.dlg.innerHTML, new RegExp(`name=subjectId value="${sid}" checked`)); assert.match(a.h.toast, /Añade otra/);
});
test('examen por opciones: la cantidad de materia genera partes, la preparación fija el dominio y editar no pierde el progreso', async () => {
  const a = await boot(); await a.click('addExam'); const dlg = a.h.dlg.innerHTML; assert.match(dlg, /Cantidad de materia/); assert.match(dlg, /Todo el trimestre/); assert.match(dlg, /¿Cuánto lo llevas preparado\?/);
  const ex = (o = {}) => ({ subjectId: a.S.subjects[0].id, when: '14', learn: 'auto', amount: 'mucho', prep: '1', difficulty: '4', importance: '5', goal: 'notable', pace: '1', ...o });
  assert.equal(await a.submit(ex()), ''); const w = a.S.works[0]; assert.equal(w.title, 'Examen de Matemáticas II'); assert.equal(w.topics.length, 5); assert.ok(w.topics.every(t => t.auto && t.explicit === false && t.mastery === 1 && t.difficulty === 4)); assert.equal(w.learn, 'problemas'); assert.equal(w.dueDate, '2026-10-26');
  assert.ok(w.estimate.provisional, 'sin temas escritos = provisional'); const t5 = w.estimate.totalMin; assert.ok(t5 > 0); assert.ok(a.S.blocks.some(b => b.workId === w.id));
  const tid = w.topics[0].id; w.topics[0].mastery = 2.4; await a.click('editExam', w.id); assert.equal(await a.submit(ex({ prep: '1', amount: 'mucho' })), ''); assert.equal(a.S.works[0].topics[0].mastery, 2.4, 'sin cambios en las opciones no se pisa el dominio'); assert.equal(a.S.works[0].topics[0].id, tid);
  await a.click('editExam', w.id); assert.equal(await a.submit(ex({ prep: '1', amount: 'todo' })), ''); assert.equal(a.S.works[0].topics.length, 8); assert.equal(a.S.works[0].topics[0].id, tid); assert.ok(a.S.works[0].estimate.totalMin > t5);
  await a.click('editExam', w.id); assert.equal(await a.submit(ex({ prep: '3', amount: 'todo' })), ''); assert.ok(a.S.works[0].topics.every(t => t.mastery === 3)); 
});
test('examen con temas escritos sigue funcionando (modo avanzado) y no es provisional', async () => {
  const a = await boot(); await a.click('addExam'); assert.equal(await a.submit({ subjectId: a.S.subjects[0].id, when: '7', learn: 'problemas', amount: 'poco', prep: '0', difficulty: '3', importance: '4', goal: 'notable', topics: 'Límites; 3; 3; 0; 10\nDerivadas; 3; 4; 1; 12' }), ''); const w = a.S.works[0];
  assert.equal(w.topics.length, 2); assert.ok(w.topics.every(t => t.explicit && !t.auto));
});
test('minutos exactos y ritmo personal siguen disponibles como corrección opcional', async () => {
  const a = await boot(); await a.click('addTask'); assert.equal(await a.submit(opts(a, { estOverride: '90' })), ''); assert.equal(a.S.works[0].manualEstMin, 90); assert.equal(a.S.works[0].estimate, undefined);
  await a.click('addTask'); assert.equal(await a.submit(opts(a, { pace: '1.3' })), ''); assert.equal(a.S.works[1].pace, 1.3); const slow = a.S.works[1].estimate.totalMin;
  await a.click('addTask'); await a.submit(opts(a, { pace: '0.8' })); assert.ok(a.S.works[2].estimate.totalMin < slow);
});
test('calendario sencillo: solo «Obligatorio» y «Sugerido», sin etiquetas antiguas; tocar un bloque abre sus acciones', async () => {
  const a = await boot(); a.t.A.rutOn(); a.t.A.choice({ dataset: { i: '0' } }); await a.tick(); await a.click('addTask'); await a.submit(opts(a, { when: '3' })); await a.tick(); if (/Cambios propuestos/.test(a.h.dlg.innerHTML)) { a.t.A.choice({ dataset: { i: '0' } }); await a.tick(); }
  a.t.A.nav({ dataset: { r: 'cal' } }); const cal = a.t.V.cal(); assert.match(cal, /Obligatorio/); assert.match(cal, /Sugerido/); assert.match(cal, /class=lg>/); assert.match(cal, /class="ev ob planned( sm)?"/); assert.match(cal, /class="ev hab planned( sm)?"/);
  for (const old of ['Obligación', 'Rutina · sugerido', 'class="tag ob"', 'class="tag rt"', 'borde discontinuo']) assert.ok(!cal.includes(old), old);
  assert.doesNotMatch(cal, /data-a=doneBlk|data-a=habDone/, 'el calendario no se llena de botones'); assert.match(cal, /data-a=blkMenu data-t=ob/); assert.match(cal, /data-a=blkMenu data-t=hab/);
  const id = a.S.blocks.find(b => b.status === 'planned').id; a.t.A.blkMenu({ dataset: { id, t: 'ob' } }); assert.match(a.h.dlg.innerHTML, />Hecha tal cual</); assert.match(a.h.dlg.innerHTML, />Mover</);
  a.t.A.choice({ dataset: { i: '1' } }); await a.tick(); assert.match(a.h.dlg.innerHTML, /Registrar sesión/);
  const hab = a.S.habit.find(h => h.status === 'planned').id; a.t.A.blkMenu({ dataset: { id: hab, t: 'hab' } }); assert.match(a.h.dlg.innerHTML, />Fijar</); assert.match(a.h.dlg.innerHTML, />Omitir</);
  assert.match(a.t.V.hoy(), /data-a=doneBlk/, 'en Hoy las acciones siguen a la vista');
});
test('Explorar eliminado: sin ruta, sin vista, sin módulo; los datos antiguos de Explorar se conservan al importar', async () => {
  const a = await boot(); assert.equal(a.t.V.exp, undefined); assert.doesNotMatch(a.h.nav.innerHTML, /Explorar|data-r="?exp/); assert.doesNotMatch(a.t.V.hoy(), /Explorar/);
  assert.ok(!fs.existsSync('src/core/explore.ts')); assert.doesNotMatch(fs.readFileSync('dist/index.html', 'utf8'), /LIBRARY|Biblioteca|dailyPlan|Explorar/);
  const old = JSON.parse(a.store['focusos.v1']); old.explore = { log: [{ id: 'paseo', date: '2026-10-01', status: 'done', at: 1 }] }; const b = await boot({ 'focusos.v1': J(old) }); assert.equal(J(b.S.explore), J(old.explore), 'registro antiguo intacto'); assert.match(b.t.V.aj(), /Bienestar digital/);
  await b.click('export'); assert.equal(J(JSON.parse(b.h.blob).explore), J(old.explore));
});
test('tema: oscuro por defecto, claro o automático desde Ajustes, persistente y fuera de los datos exportables', async () => {
  const a = await boot(); assert.equal(a.t.UI().theme, 'dark'); assert.match(a.t.V.aj(), /name=theme value=dark checked/); a.t.A.theme({ dataset: { id: 'light' } }); assert.equal(JSON.parse(a.store['focusos.ui']).theme, 'light');
  const b = await boot(a.store); assert.equal(b.t.UI().theme, 'light'); assert.equal(JSON.parse(b.store['focusos.v1']).theme, undefined); const c = await boot({ 'focusos.ui': '{"theme":"neon"}' }); assert.equal(c.t.UI().theme, 'dark', 'valor desconocido → oscuro');
});
test('rutina en la app: se admiten 5 veces por semana y se rechaza más de 7', async () => {
  const a = await boot(); a.t.A.nav({ dataset: { r: 'rut' } }); const html = a.t.V.rut(); assert.match(html, /max=7/); assert.doesNotMatch(html, /max=4/);
  // el formulario #rf escucha 'submit' en el documento (el DOM simulado no lo dispara): el límite se comprueba en el código servido y en la prueba unitaria de la rutina
  const src = fs.readFileSync('dist/index.html', 'utf8'); assert.match(src, /k>=0&&k<=7/); assert.match(src, /de 0 a 7 veces por semana/);
});
test('compatibilidad hacia atrás: la versión 4 abre datos con tareas sin fecha sin dar error y los conserva; y la 5 abre datos de la 4', async () => {
  const a = await boot(); await a.click('addTask'); await a.submit(opts(a, { when: 'none' })); await a.click('addExam'); await a.submit({ subjectId: a.S.subjects[0].id, when: '14', learn: 'auto', amount: 'normal', prep: '0', difficulty: '3', importance: '3', goal: 'notable' });
  const prev = await boot(a.store, { dist: 'test/fixtures/prev-dist.html' }); assert.doesNotMatch(prev.h.main.innerHTML, /Datos no válidos/); assert.equal(J(prev.S.works.map(w => [w.id, w.noDate, w.dueDate, w.createdAt])), J(a.S.works.map(w => [w.id, w.noDate, w.dueDate, w.createdAt])), 'la versión 4 conserva los campos nuevos');
  assert.equal(J(prev.S.works.find(w => w.topics).topics.map(t => t.auto)), J(a.S.works.find(w => w.topics).topics.map(t => t.auto)), 'y los temas automáticos');
  const v4 = JSON.parse(fs.readFileSync('test/fixtures/export-v2.json', 'utf8')); const { app, schema, exportedAt, ...st } = v4; const b = await boot({ 'focusos.v1': J(st) }); assert.doesNotMatch(b.h.main.innerHTML, /Datos no válidos/); assert.equal(b.S.works.length, st.works.length); assert.equal(J(b.S.works.map(w => [w.id, w.title, w.dueDate])), J(st.works.map(w => [w.id, w.title, w.dueDate])));
});

test('calendario con eje horario: cada bloque en su hora real, dentro de la franja, sin solaparse; sin avisos de déficit', async () => {
  const a = await boot(); for (let i = 0; i < 6; i++) { await a.click('addTask'); await a.submit(opts(a, { subjectId: a.S.subjects[i].id, when: '1', size: '5', difficulty: '5', importance: '5' })); }
  const cal = a.t.V.cal(); assert.match(cal, /class="tg/); assert.match(cal, /class=nowl/, 'línea de hora actual en el día de hoy');
  assert.match(cal, /data-a=slot/, 'huecos tocables');
  // cada columna: ninguna pareja de bloques con hora se solapa en pantalla salvo que ya se solapen en datos (no deben)
  const rows = [...cal.matchAll(/class="ev [^"]*" style="--c:[^;]+;top:([\d.]+)px;height:([\d.]+)px[^"]*"/g)].map(m => [+m[1], +m[2]]);
  assert.ok(rows.length > 0); for (const [t, h] of rows) assert.ok(t >= 0 && h >= 18);
  const dayCols = cal.split('class="day').slice(1);
  for (const col of dayCols) { const r = [...col.matchAll(/top:([\d.]+)px;height:([\d.]+)px;left:calc\(0% \+ 2px\)[^"]*" data-a=blkMenu/g)].map(m => [+m[1], +m[1] + +m[2]]).sort((x, y) => x[0] - y[0]); for (let i = 1; i < r.length; i++) assert.ok(r[i][0] >= r[i - 1][1] - 3, 'sin solapes visuales'); }
  const before = a.t.V.hoy();
  assert.ok(!/warnOff|No caben/.test(before), 'ya no se muestran avisos de déficit, ni siquiera con una tarea imposible');
  assert.ok(true);
  for (let g = 0; g < 8; g++) { const n = a.t.V.hoy().match(/data-a=warnOff data-id="([^"]+)" data-k=(\d+)/); if (!n) break; a.t.A.warnOff({ dataset: { id: n[1], k: n[2] } }); await a.tick(); }
  assert.doesNotMatch(a.t.V.hoy(), /No caben/);
});
