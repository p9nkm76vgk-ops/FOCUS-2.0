"""Verificación en NAVEGADOR REAL (Chromium/Playwright; NO es Safari) de la versión 6 (objetivos, notas, temario, repasos, curso, revisión, vista de día). Contextos aislados con datos de prueba.
Uso: python3 scripts/browser-v5.py [carpeta_dist] [carpeta_capturas]"""
import subprocess, time, json, sys, os
from datetime import datetime
from playwright.sync_api import sync_playwright
DIST = sys.argv[1] if len(sys.argv) > 1 else 'dist'; SHOTS = sys.argv[2] if len(sys.argv) > 2 else '/home/claude/shots'; PORT = 8768; URL = f'http://127.0.0.1:{PORT}/'
os.makedirs(SHOTS, exist_ok=True); RES, ERRS = [], []
def ck(name, cond, extra=''):
    RES.append((name, bool(cond), extra)); print(('OK   ' if cond else 'FALLO'), name, extra if not cond else '', flush=True)
srv = subprocess.Popen(['python3', '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=DIST, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
def newpage(b, w=1180, h=820, fixed='2026-10-13T17:00:00'):
    c = b.new_context(viewport={'width': w, 'height': h}, has_touch=True, timezone_id='Europe/Madrid', locale='es-ES')
    p = c.new_page(); p.set_default_timeout(8000); p.on('dialog', lambda d: d.accept())
    p.on('pageerror', lambda e: ERRS.append(('pageerror', str(e)))); p.on('console', lambda m: ERRS.append(('console', m.text)) if m.type == 'error' else None)
    p.clock.set_fixed_time(datetime.fromisoformat(fixed)); p.goto(URL); p.wait_for_selector('#main h1'); return p
def go(p, r):
    if p.evaluate("innerWidth<1000") and p.evaluate("!document.body.classList.contains('open')"): p.click('#menuBtn')
    g = {'cal': 'plan', 'tar': 'plan', 'exa': 'plan', 'rut': 'plan', 'est': 'plan', 'obj': 'goal', 'tem': 'goal', 'cur': 'goal'}.get(r)
    if g and p.get_attribute(f'#nav [data-g={g}]', 'aria-expanded') == 'false': p.click(f'#nav [data-g={g}]')
    p.click(f'#nav [data-r="{r}"]'); p.wait_for_timeout(150)
    p.evaluate("document.querySelectorAll('details.more').forEach(d=>d.open=true)")
def chip(p, name, text):  # pulsa un botón de opción por su texto
    p.locator(f'#dlg label.ch:has(input[name={name}])').filter(has_text=text).first.click()
def shot(p, n): p.screenshot(path=f'{SHOTS}/{n}.png')
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch(); p = newpage(b)
    def fill_form(vals):
        for k, v in vals.items(): p.fill(f'#dlg input[name={k}]', str(v))
    # --- objetivo
    go(p, 'obj'); ck('Objetivos pide definir el objetivo', 'AÚN NO HAY OBJETIVO' in p.inner_text('#main').upper()); shot(p, 'v6-01-objetivo-vacio')
    p.click('#main button.pri >> text=Definir objetivo'); p.wait_for_selector('#dlg[open]')
    p.fill('#dlg input[name=target]', '9'); p.fill('#dlg input[name=prevAvg]', '7.4'); ck('el formulario solo pide la media de 1.º (sin una nota por asignatura)', p.locator('#dlg input[name^=p_]').count()==0)
    p.click('#dlg details:has-text("PAU") summary'); p.fill('#dlg input[name=pauDate]', '2027-06-02'); p.fill('#dlg input[name=pauExpected]', '8'); shot(p, 'v6-02-form-objetivo')
    p.click('#dlg button.pri'); p.wait_for_timeout(400)
    S = json.loads(p.evaluate("localStorage.getItem('focusos.v1')"))
    ck('objetivo guardado con media de 1.º y fecha PAU', S['goals']['target'] == 9 and S['goals']['prevAvg'] == 7.4 and S['goals']['pauDate'] == '2027-06-02', json.dumps(S['goals'])[:200])
    p.reload(); p.wait_for_selector('#main h1'); go(p, 'obj'); txt = p.inner_text('#main')
    ck('tras recargar se ve el objetivo y la tabla por asignatura', 'OBJETIVO 9' in txt.upper() and 'MATEMÁTICAS II' in txt.upper() and 'NECESITAS EN EL RESTO' in txt.upper()); shot(p, 'v6-03-objetivos')
    ck('la tabla de asignaturas no desborda la página', p.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
    # --- nota con porcentaje (el ejemplo del usuario: Mates, 24 %, un 4)
    p.click('#main button:has-text("+ Nota de examen")'); p.wait_for_selector('#dlg[open]'); shot(p, 'v6-02b-form-nota'); chip(p, 'subjectId', 'Matemáticas II'); chip(p, 'evalNo', '1.ª'); p.fill('#dlg input[name=weight]', '24'); p.fill('#dlg input[name=score]', '4'); p.fill('#dlg input[name=label]', 'Límites'); p.click('#dlg button.pri'); p.wait_for_timeout(300)
    S = json.loads(p.evaluate("localStorage.getItem('focusos.v1')")); ck('nota 4 al 24 % guardada (decimales y porcentaje aceptados por los campos)', len(S['grades']) == 1 and S['grades'][0]['score'] == 4 and S['grades'][0]['weight'] == 24 and S['grades'][0]['evalNo'] == 1)
    t = p.inner_text('#main'); ck('Objetivos calcula: llevas 4, 24 % evaluado, no llegas al 9 (máx. 8,6)', 'NO LLEGAS (MÁX. 8,6)' in t.upper() and '24 %' in t); shot(p, 'v6-03b-objetivos-con-nota')
    p.click('#main button:has-text("+ Nota de examen")'); chip(p, 'subjectId', 'Matemáticas II'); chip(p, 'evalNo', '1.ª'); p.fill('#dlg input[name=weight]', '90'); p.fill('#dlg input[name=score]', '5'); p.click('#dlg button.pri'); ck('más de 100 % en una evaluación se rechaza con mensaje', 'PASARÍA DE 100' in p.inner_text('#dlg').upper()); p.click('#dlg button:has-text("Cancelar")')
    p.click('#main button:has-text("2.ª")'); p.wait_for_timeout(150); ck('la 2.ª evaluación es independiente (vacía)', 'TODAVÍA NO HAY NOTAS' in p.inner_text('#main').upper()); p.click('#main button:has-text("3.ª")'); ck('la 3.ª se explica como nota final de 2.º', 'NOTA FINAL DE 2.º' in p.inner_text('#main').upper()); p.click('#main button:has-text("1.ª")')
    # --- temario
    go(p, 'tem'); p.click('#main button:has-text("+ Temas") >> nth=0'); p.wait_for_selector('#dlg[open]'); p.fill('#dlg textarea[name=names]', 'Límites\nDerivadas\nIntegrales\nMatrices'); chip(p, 'level', 'Sin ver'); p.click('#dlg button.pri'); p.wait_for_timeout(300)
    ck('4 temas añadidos en bloque', p.locator('#main .trow:has(.lv)').count() == 4); shot(p, 'v6-04-temario')
    p.locator('#main .trow:has-text("Límites") .lv button:has-text("Entendido")').click(); p.wait_for_timeout(300)
    S = json.loads(p.evaluate("localStorage.getItem('focusos.v1')")); lim = [t for t in S['syllabus'] if t['name'] == 'Límites'][0]
    ck('marcar «Entendido» fija nivel 2 y repaso a +2 días', lim['mastery'] == 2 and lim['next'] == '2026-10-15', json.dumps(lim))
    rev = [w for w in S['works'] if w.get('auto') == 'review']; ck('se crea la tarea de repaso y se coloca en el calendario', len(rev) == 1 and any(bl['workId'] == rev[0]['id'] and bl['status'] == 'planned' for bl in S['blocks']))
    p.reload(); p.wait_for_selector('#main h1'); S2 = json.loads(p.evaluate("localStorage.getItem('focusos.v1')")); ck('recargar no duplica repasos', len([w for w in S2['works'] if w.get('auto') == 'review']) == 1)
    # --- completar el repaso con Bien
    go(p, 'hoy'); go(p, 'cal'); p.click('.tg .ev[data-a=blkMenu] >> nth=0'); p.wait_for_selector('#dlg[open]'); shot(p, 'v6-05-menu-bloque')
    p.click('#dlg button:has-text("Hecha, con detalle")'); p.wait_for_selector('#dlg[open]'); ck('el registro pide la calidad y «Bien» viene preseleccionado en un repaso', 'CÓMO HA IDO LA SESIÓN' in p.inner_text('#dlg').upper() and p.evaluate("document.querySelector('#dlg input[name=quality]:checked')?.value")=='3'); shot(p, 'v6-06-registro')
    p.click('#dlg button.pri'); p.wait_for_timeout(400)
    S = json.loads(p.evaluate("localStorage.getItem('focusos.v1')")); done = [bl for bl in S['blocks'] if bl['status'] == 'done']
    lim = [t for t in S['syllabus'] if t['name'] == 'Límites'][0]
    ck('repaso con «Bien»: calidad 3 guardada, nivel 3, 1 repaso y próximo a +7 días; una sola sesión hecha', len(done) == 1 and done[0].get('quality') == 3 and lim['mastery'] == 3 and lim['reviews'] == 1 and lim['next'] == '2026-10-20', json.dumps([done, lim])[:300])
    ck('no se crea otro repaso inmediato del mismo tema', len([w for w in S['works'] if w.get('auto') == 'review' and w['status'] == 'pending']) == 0)
    # --- curso, revisión
    ck('el menú ya no tiene Revisión semanal ni Asignaturas', 'REVISIÓN SEMANAL' not in p.inner_text('#nav').upper() and 'ASIGNATURAS' not in p.inner_text('#nav').upper()); go(p, 'cur'); t = p.inner_text('#main'); ck('Curso muestra cuenta atrás, fase y estado', '232 DÍAS' in t.upper() and 'COBERTURA' in t.upper()); shot(p, 'v6-07-curso')
    go(p, 'hoy'); shot(p, 'v6-09-hoy'); ck('Hoy muestra la tarjeta de objetivo', 'Llevas 4 de media' in p.inner_text('#main'))
    # --- vista de día
    go(p, 'cal'); p.click('#main button:has-text("Ver día")'); p.wait_for_timeout(200); shot(p, 'v6-10-dia')
    vis = p.evaluate("[...document.querySelectorAll('.tg .day')].filter(d=>getComputedStyle(d).display!=='none').length"); ck('vista de día: una sola columna visible', vis == 1)
    ck('vista de día sin desbordamiento', p.evaluate("document.documentElement.scrollWidth<=innerWidth+1")); p.click('#main button[aria-label="Semana siguiente"]'); p.wait_for_timeout(150)
    ck('→ avanza un día', 'miércoles' in p.inner_text('#main .wl').lower()); p.click('#main button:has-text("Ver semana")'); p.wait_for_timeout(150)
    ck('volver a semana muestra 7 columnas', p.evaluate("[...document.querySelectorAll('.tg .day')].filter(d=>getComputedStyle(d).display!=='none').length")==7)
    # --- tamaños táctiles y márgenes en las nuevas pantallas, claro y vertical
    for r in ['obj', 'tem', 'cur']:
        go(p, r); small = p.evaluate("[...document.querySelectorAll('#main button, #main [role=button]')].filter(e=>e.offsetParent&&e.getBoundingClientRect().height<43).map(e=>e.textContent.trim().slice(0,20))")
        ck(f'{r}: botones táctiles ≥ 44 px', not small, str(small[:5]))
    p.set_viewport_size({'width': 820, 'height': 1180}); 
    for r in ['obj', 'tem', 'cur', 'hoy']:
        go(p, r); ck(f'{r}: iPad vertical sin desbordamiento horizontal', p.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
    go(p, 'obj'); shot(p, 'v6-11-objetivos-vertical'); p.set_viewport_size({'width': 390, 'height': 844})
    for r in ['obj', 'tem', 'cur']:
        go(p, r); ck(f'{r}: móvil sin desbordamiento horizontal', p.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
    p.evaluate("localStorage.setItem('focusos.ui', JSON.stringify({theme:'light'}))"); p.reload(); p.wait_for_selector('#main h1'); go(p, 'obj'); shot(p, 'v6-12-claro-movil')
    ck('sin errores de consola ni excepciones', not ERRS, str(ERRS[:3]))
    b.close()
finally:
    srv.terminate()
print(f"{sum(1 for r in RES if r[1])}/{len(RES)} comprobaciones correctas; errores de consola: {ERRS[:3]}")
sys.exit(0 if all(r[1] for r in RES) and not ERRS else 1)
