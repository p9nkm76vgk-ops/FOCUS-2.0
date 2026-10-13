"""Verificación en NAVEGADOR REAL (Chromium/Playwright; NO es Safari) de la versión 5. Contextos aislados con datos de prueba.
Uso: python3 scripts/browser-v5.py [carpeta_dist] [carpeta_capturas]"""
import subprocess, time, json, sys, os
from datetime import datetime
from playwright.sync_api import sync_playwright
DIST = sys.argv[1] if len(sys.argv) > 1 else 'dist'; SHOTS = sys.argv[2] if len(sys.argv) > 2 else '/home/claude/shots'; PORT = 8767; URL = f'http://127.0.0.1:{PORT}/'
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
def chip(p, name, text):  # pulsa un botón de opción por su texto
    p.locator(f'#dlg label.ch:has(input[name={name}])').filter(has_text=text).first.click()
def shot(p, n): p.screenshot(path=f'{SHOTS}/{n}.png')
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch()
    p = newpage(b)
    ck('arranca sin errores y con tema oscuro', p.evaluate("document.documentElement.dataset.theme") == 'dark' and not ERRS, str(ERRS[:2]))
    ck('no hay Explorar en el menú', 'Explorar' not in p.inner_text('#nav'))
    # --- tarea solo con botones
    p.click('text="+ Tarea"'); p.wait_for_selector('#dlg[open]'); shot(p, '01-form-tarea')
    chip(p, 'subjectId', 'Física'); chip(p, 'when', 'Sin fecha'); chip(p, 'size', 'Larga · ~2 h'); chip(p, 'difficulty', 'Difícil'); chip(p, 'importance', 'Alta')
    p.click('#dlg button:has-text("Guardar y añadir otra")'); p.wait_for_timeout(300)
    ck('«Guardar y añadir otra» deja el formulario abierto con la misma asignatura', p.evaluate("document.querySelector('#dlg').open") and p.evaluate("document.querySelector('#dlg input[name=subjectId]:checked').parentElement.innerText.includes('Física')"))
    chip(p, 'when', 'Mañana'); chip(p, 'learn', 'Memorizar'); chip(p, 'importance', 'Crítica'); p.click('#dlg button.pri'); p.wait_for_timeout(400)
    S = json.loads(p.evaluate("localStorage.getItem('focusos.v1')"))
    ck('2 tareas guardadas sin escribir nada; una sin fecha', len(S['works']) == 2 and S['works'][0].get('noDate') is True and S['works'][1]['dueDate'] == '2026-10-14', json.dumps([(w['title'], w['dueDate']) for w in S['works']]))
    ck('las dos tienen estimación y sesiones', all(w.get('estimate') for w in S['works']) and any(bl['workId'] == S['works'][0]['id'] for bl in S['blocks']))
    # --- examen solo con botones
    p.click('text="+ Examen"'); p.wait_for_selector('#dlg[open]'); chip(p, 'subjectId', 'Matemáticas II'); chip(p, 'when', 'En 2 semanas'); chip(p, 'amount', 'Mucha'); chip(p, 'prep', 'Algo'); chip(p, 'difficulty', 'Difícil'); chip(p, 'importance', 'Decisivo'); shot(p, '02-form-examen'); p.click('#dlg button.pri'); p.wait_for_timeout(400)
    S = json.loads(p.evaluate("localStorage.getItem('focusos.v1')")); ex = [w for w in S['works'] if w['kind'] == 'exam'][0]
    ck('examen: 5 partes automáticas, fecha +14 días, provisional', len(ex['topics']) == 5 and ex['dueDate'] == '2026-10-27' and ex['estimate']['provisional'], ex['dueDate'])
    for i in range(3):  # más pendientes sin fecha
        p.click('text="+ Tarea"'); p.wait_for_selector('#dlg[open]'); chip(p, 'subjectId', ['Química', 'Catalán', 'Inglés'][i]); chip(p, 'when', 'Sin fecha'); p.click('#dlg button.pri'); p.wait_for_timeout(250)
    S = json.loads(p.evaluate("localStorage.getItem('focusos.v1')"))
    und = [w for w in S['works'] if w.get('noDate')]; ck('4 tareas sin fecha en total', len(und) == 4)
    ck('todas las sin fecha tienen sesiones repartidas en ≤14 días', all(any(bl['workId'] == w['id'] and bl['status'] == 'planned' for bl in S['blocks']) for w in und) and max(bl['date'] for bl in S['blocks'] if bl['workId'] in [w['id'] for w in und]) <= '2026-10-26')
    shot(p, '03-hoy'); go(p, 'tar'); shot(p, '04-tareas'); go(p, 'cal'); shot(p, '05-calendario')
    # tocar un bloque abre sus acciones
    ck('calendario: la semana cabe sin scroll horizontal en iPad apaisado y hay eje horario, línea de ahora y franjas', p.evaluate("(()=>{const t=document.querySelector('.tg');return t.scrollWidth<=t.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth+1})()") and p.locator('.tg .nowl').count()==1 and p.locator('.tg .dc .av').count()>0)
    ck('calendario: ningún bloque se sale de su columna', p.evaluate("[...document.querySelectorAll('.tg .ev')].every(e=>{const c=e.closest('.dc').getBoundingClientRect(),r=e.getBoundingClientRect();return r.left>=c.left-1&&r.right<=c.right+1&&r.top>=c.top-1&&r.bottom<=c.bottom+1})"))
    p.set_viewport_size({'width':820,'height':1180}); p.wait_for_timeout(200); shot(p,'05b-calendario-vertical'); ck('calendario sin desbordamiento en iPad vertical', p.evaluate("document.documentElement.scrollWidth<=innerWidth+1")); p.set_viewport_size({'width':1180,'height':820}); p.wait_for_timeout(200)
    p.click('.tg .ev[data-a=blkMenu] >> nth=0'); p.wait_for_selector('#dlg[open]'); shot(p, '06-menu-bloque'); ck('tocar un bloque ofrece Hecha tal cual / Mover', 'Hecha tal cual' in p.inner_text('#dlg') and 'Mover' in p.inner_text('#dlg'))
    p.click('#dlg button:has-text("Cerrar")'); p.wait_for_timeout(150)
    # rutina con 5 clases/semana
    go(p, 'rut'); p.fill('input[name^=f_]:visible >> nth=0', '5'); p.click('#rf button.pri'); p.wait_for_timeout(200)
    ck('la rutina acepta 5 veces por semana', json.loads(p.evaluate("localStorage.getItem('focusos.v1')"))['routine']['perWeek'] and 5 in json.loads(p.evaluate("localStorage.getItem('focusos.v1')"))['routine']['perWeek'].values())
    p.fill('input[name^=f_]:visible >> nth=1', '8'); ck('8 veces por semana lo rechaza el propio campo (máx. 7)', p.evaluate("document.querySelectorAll('input[name^=f_]')[1].validity.rangeOverflow"))
    p.fill('input[name^=f_]:visible >> nth=1', '3'); p.click('#rf button.pri'); p.wait_for_timeout(200)
    p.click('text="Activar rutina semanal" >> nth=0'); p.wait_for_selector('#dlg[open]'); p.click('#dlg button.pri'); p.wait_for_timeout(500)
    S = json.loads(p.evaluate("localStorage.getItem('focusos.v1')")); mons = {}
    from datetime import date, timedelta
    f = [k for k, v in S['routine']['perWeek'].items() if v == 5][0]
    wk = {}
    for h in S['habit']:
        if h['subjectId'] == f and h['kind'] == 'estudio': d = date.fromisoformat(h['date']); wk.setdefault(d - timedelta(days=d.weekday()), set()).add(h['date'])
    ck('rutina genera 5 bloques en una semana completa para esa asignatura (días distintos)', any(len(v) == 5 for v in wk.values()), str({str(k): len(v) for k, v in wk.items()}))
    go(p, 'cal'); shot(p, '07-calendario-rutina')
    # tema claro
    go(p, 'aj'); p.click('label.ch:has(input[value=light])'); p.wait_for_timeout(200); ck('tema claro aplicado y persistente', p.evaluate("document.documentElement.dataset.theme") == 'light'); shot(p, '08-ajustes-claro')
    go(p, 'cal'); shot(p, '09-calendario-claro'); go(p, 'hoy'); shot(p, '10-hoy-claro')
    p.reload(); p.wait_for_selector('#main h1'); ck('el tema se conserva al recargar', p.evaluate("document.documentElement.dataset.theme") == 'light')
    # sin desbordamiento horizontal en todas las vistas, dos temas
    for th in ('dark', 'light'):
        p.evaluate(f"localStorage.setItem('focusos.ui', JSON.stringify({{theme:'{th}'}}))"); p.reload(); p.wait_for_selector('#main h1')
        for r in ['hoy', 'tar', 'exa', 'cal', 'rut', 'est', 'eje', 'seg', 'aj']:
            go(p, r); ok = p.evaluate("document.documentElement.scrollWidth<=innerWidth+1"); ck(f'sin desbordamiento horizontal: {r} ({th})', ok)
    b.close()
    # móvil/vertical
    b = pw.chromium.launch()
    for (w, h, n) in [(820, 1180, 'ipad-vertical'), (390, 844, 'movil')]:
        q = newpage(b, w, h); q.evaluate("localStorage.setItem('focusos.ui', JSON.stringify({theme:'dark'}))"); q.reload(); q.wait_for_selector('#main h1')
        q.click('text="+ Tarea"'); q.wait_for_selector('#dlg[open]'); shot(q, f'11-form-{n}'); q.click('#dlg button:has-text("Cancelar")')
        ck(f'formulario sin desbordamiento horizontal ({n})', q.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
        go(q, 'hoy'); shot(q, f'12-hoy-{n}')
    b.close()
finally:
    srv.terminate()
bad = [r for r in RES if not r[1]]; print(f'\n{len(RES)-len(bad)}/{len(RES)} comprobaciones correctas; errores de consola: {ERRS}')
sys.exit(1 if bad or ERRS else 0)
