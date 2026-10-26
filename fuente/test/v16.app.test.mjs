// v16 (DOM SIMULADO): búsqueda global, menú plano, barra de pestañas, barra de saltos, progreso del día.
import test from 'node:test'; import assert from 'node:assert/strict';
import { boot, clock } from './harness.mjs';
const T0 = new Date(2026, 9, 12, 16, 0).getTime();
test.beforeEach(() => { clock.t = T0 });

test('búsqueda: encuentra pantallas, acciones, tareas, exámenes y temas sin acentos ni mayúsculas, y abre lo elegido', async () => {
  const a = await boot(); const sid = a.S.subjects.find(s => s.name === 'Química').id;
  await a.click('addTask'); await a.submit({ subjectId: sid, when: '3', title: 'Ejercicios de estequiometría' });
  await a.click('addExam'); await a.submit({ subjectId: sid, when: '14', learn: 'auto', amount: 'normal', prep: '0', difficulty: '3', importance: '3', goal: 'notable', title: 'Parcial disoluciones' });
  a.S.syllabus = [{ id: 't1', subjectId: sid, name: 'Equilibrio químico', mastery: 0, reviews: 0, last: null, next: null, createdAt: 1, course: 2 }];
  await a.click('search'); assert.ok(a.h.dlg.open); assert.match(a.h.dlg.innerHTML, /id=sq/);
  const find = q => a.t.searchItems(q).map(x => x.kind + ':' + x.title);
  assert.ok(find('estequiometria').includes('Tarea:Ejercicios de estequiometría'), 'sin acentos');
  assert.ok(find('DISOLUC').includes('Examen:Parcial disoluciones'));
  assert.ok(find('equilibrio').includes('Tema:Equilibrio químico'));
  assert.ok(find('metodo').includes('Pantalla:Método de estudio'));
  assert.ok(find('guion').includes('Pantalla:Método de estudio'), 'por palabras clave');
  assert.ok(find('nuevo exa').includes('Acción:Nuevo examen'));
  assert.equal(find('zzzzqq').length, 0);
  assert.ok(a.t.searchItems('').length > 0 && a.t.searchItems('').length <= 8, 'sin texto: sugerencias');
  const r = a.t.searchItems('disoluc')[0]; assert.equal(r.kind, 'Examen'); r.go(); await a.tick(); assert.match(a.h.dlg.innerHTML, /Editar examen/);
  const p = a.t.searchItems('calendario').find(x => x.kind === 'Pantalla'); p.go(); assert.equal(a.t.route, 'cal');
});
test('menú plano: todo a un toque (sin grupos desplegables), buscador arriba y barra de pestañas inferior con la sección activa', async () => {
  const a = await boot(); const nav = a.h.nav.innerHTML;
  for (const r of ['hoy', 'cal', 'tar', 'exa', 'tem', 'met', 'obj', 'cur', 'seg', 'rut', 'est', 'aj']) assert.match(nav, new RegExp(`data-a=nav data-r=${r}[ >]`), r);
  assert.equal((nav.match(/aria-expanded/g) ?? []).length, 0); assert.match(nav, /data-a=search/);
  assert.match(a.h.tabs.innerHTML, /data-r=hoy/); assert.match(a.h.tabs.innerHTML, /data-a=menu/);
  a.t.A.nav({ dataset: { r: 'tar' } }); assert.match(a.h.tabs.innerHTML, /data-r=tar aria-label="Tareas" aria-current=page/);
  a.t.A.nav({ dataset: { r: 'tem' } }); assert.match(a.h.tabs.innerHTML, /data-a=menu aria-label="Más" aria-current=page/, 'secciones secundarias marcan «Más»');
});
test('barra de saltos en Ajustes, Método y Temario; Hoy muestra el progreso del día (sin tira semanal: se quitó por confusa)', async () => {
  const a = await boot();
  const aj = a.t.V.aj(); assert.match(aj, /class=jump/); assert.match(aj, /data-sec="datos"/); assert.match(aj, /data-a=jump data-k="datos"/);
  const met = a.t.V.met(); assert.match(met, /class=jump/); assert.ok((met.match(/data-a=jump/g) ?? []).length >= 9);
  assert.match(a.t.V.tem(), /class=jump/);
  const sid = a.S.subjects[0].id; await a.click('addTask'); await a.submit({ subjectId: sid, when: '1', title: 'Algo' });
  const hoy = a.t.V.hoy(); assert.match(hoy, /role=progressbar|<h1>Hoy<\/h1>/);
});
