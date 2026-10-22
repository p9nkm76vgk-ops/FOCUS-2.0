# v18 en Chromium real: Progreso, estados vacíos, temporizador y modo concentración.
import subprocess, time, json, sys
from datetime import datetime
from playwright.sync_api import sync_playwright
srv = subprocess.Popen(['python3', '-m', 'http.server', '8781', '--bind', '127.0.0.1'], cwd='dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
F = json.load(open('test/fixtures/export-v2.json')); [F.pop(k) for k in ('app', 'schema', 'exportedAt')]
res = []; errs = []
def ck(n, ok, d=''): res.append(bool(ok)); print(('OK    ' if ok else 'FALLO ') + n, d if not ok else '')
with sync_playwright() as p:
    b = p.chromium.launch()
    def page(w, h, seed=True):
        c = b.new_context(viewport={'width': w, 'height': h}, has_touch=True, timezone_id='Europe/Madrid', locale='es-ES')
        if seed: c.add_init_script("if(!sessionStorage.getItem('s')){localStorage.setItem('focusos.v1'," + json.dumps(json.dumps(F)) + ");sessionStorage.setItem('s','1')}")
        pg = c.new_page(); pg.set_default_timeout(5000); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.clock.set_fixed_time(datetime.fromisoformat('2026-10-13T17:45:00')); pg.goto('http://127.0.0.1:8781/'); pg.wait_for_selector('#main h1'); return pg
    pg = page(1180, 820)
    pg.click('#nav [data-r="seg"]'); pg.wait_for_timeout(400)
    ck('Progreso: anillo, tres tarjetas, semana, evolución y asignaturas', pg.locator('#main svg.ring').count() == 1 and pg.locator('#main .pstats .card').count() == 3 and pg.locator('#main .wbars').count() == 2 and pg.locator('#main .srow').count() >= 1)
    ck('Progreso: sin desbordamiento horizontal', pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
    pg.click('#nav [data-r="hoy"]'); pg.wait_for_timeout(300)
    pg.click('.hero [data-a=timerStart]'); pg.wait_for_timeout(300)
    ck('temporizador: tarjeta con anillo y «Qué hacer»', pg.locator('.card.timer svg.ring').count() == 1 and pg.locator('.card.timer .how2').count() == 1)
    pg.click('[data-a=focusOn]'); pg.wait_for_timeout(1500)
    ck('modo concentración: pantalla completa con reloj hh:mm:ss', pg.locator('#focus').is_visible() and pg.evaluate("/^\\d\\d:\\d\\d:\\d\\d$/.test(document.querySelector('[data-fbig]').textContent)"))
    ck('modo concentración cubre toda la pantalla', pg.evaluate("(()=>{const r=document.getElementById('focus').getBoundingClientRect();return r.width>=innerWidth&&r.height>=innerHeight})()"))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200); ck('Esc sale del modo concentración y el temporizador sigue', pg.locator('#focus').count() == 0 and pg.locator('.card.timer').count() == 1)
    pg.click('[data-a=focusOn]'); pg.wait_for_timeout(300); pg.click('#focus [data-a=focusEnd]'); pg.wait_for_timeout(500)
    ck('Terminar desde el modo concentración guarda la sesión y lo cierra', pg.locator('#focus').count() == 0 and pg.locator('.card.timer').count() == 0)
    pg2 = page(1180, 820, seed=False); pg2.click('#nav [data-r="tar"]'); pg2.wait_for_timeout(300)
    ck('Tareas vacía: estado vacío con botón', pg2.locator('#main .empty button[data-a=addTask]').count() == 1)
    pg2.click('#nav [data-r="exa"]'); pg2.wait_for_timeout(300); ck('Exámenes vacío: estado vacío con botón', pg2.locator('#main .empty button[data-a=addExam]').count() == 1)
    pg2.click('#nav [data-r="seg"]'); pg2.wait_for_timeout(300); ck('Progreso vacío: mensaje claro', 'Aún no hay nada que medir' in pg2.inner_text('#main'))
    pg3 = page(390, 844); pg3.click('#topSearch'); pg3.keyboard.press('Escape'); pg3.click('#tabs [data-a=menu]'); pg3.click('#nav [data-r="seg"]'); pg3.wait_for_timeout(400)
    ck('móvil: Progreso sin desbordamiento horizontal', pg3.evaluate("document.documentElement.scrollWidth<=innerWidth"))
    ck('sin errores de consola ni excepciones', not errs, errs[:3])
    b.close()
srv.kill(); print(f'{sum(res)}/{len(res)}'); sys.exit(0 if all(res) else 1)
