# v16 en Chromium real: búsqueda global, atajo «/», barra de pestañas en iPad vertical, menú plano, barra de saltos, calendario compacto.
import subprocess, time, json, sys
from datetime import datetime
from playwright.sync_api import sync_playwright
srv = subprocess.Popen(['python3', '-m', 'http.server', '8779', '--bind', '127.0.0.1'], cwd='dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
F = json.load(open('test/fixtures/export-v2.json')); [F.pop(k) for k in ('app', 'schema', 'exportedAt')]
res = []; errs = []
def ck(n, ok, d=''): res.append(bool(ok)); print(('OK    ' if ok else 'FALLO ') + n, d if not ok else '')
with sync_playwright() as p:
    b = p.chromium.launch()
    def page(w, h):
        c = b.new_context(viewport={'width': w, 'height': h}, has_touch=True, timezone_id='Europe/Madrid', locale='es-ES')
        c.add_init_script("if(!sessionStorage.getItem('s')){localStorage.setItem('focusos.v1'," + json.dumps(json.dumps(F)) + ");sessionStorage.setItem('s','1')}")
        pg = c.new_page(); pg.set_default_timeout(5000); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.clock.set_fixed_time(datetime.fromisoformat('2026-10-13T17:00:00')); pg.goto('http://127.0.0.1:8779/'); pg.wait_for_selector('#main h1'); return pg
    pg = page(1180, 820)
    ck('menú plano: 12 destinos visibles sin desplegar nada', pg.locator('#nav button.nv[data-r]').count() == 12 and all(pg.locator(f'#nav [data-r="{r}"]').is_visible() for r in ['tem', 'met', 'obj', 'aj', 'rut']))
    ck('barra de pestañas oculta en horizontal', not pg.locator('#tabs').is_visible())
    pg.click('#nav .srch'); pg.wait_for_selector('#sq')
    ck('el buscador se abre con el foco en el campo', pg.evaluate("document.activeElement&&document.activeElement.id")=='sq')
    pg.fill('#sq', 'filosofia'); pg.wait_for_timeout(100)
    ck('buscar «filosofia» (sin acento) encuentra el examen', pg.locator('#sr .sri').count() >= 1 and 'Filosof' in pg.inner_text('#sr'))
    pg.fill('#sq', 'parcial'); pg.wait_for_timeout(100); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    ck('Intro abre la primera coincidencia (editar examen)', 'Editar examen' in pg.inner_text('#dlg'), pg.inner_text('#dlg')[:80])
    pg.click('#dlg [data-a=close]'); pg.wait_for_timeout(200)
    pg.keyboard.press('/'); pg.wait_for_timeout(200); ck('la tecla «/» abre el buscador', pg.locator('#sq').is_visible())
    pg.fill('#sq', 'metodo'); pg.wait_for_timeout(100); pg.click('#sr .sri >> nth=0'); pg.wait_for_timeout(300)
    ck('elegir «Método de estudio» navega allí', pg.inner_text('#main h1') == 'Método de estudio', pg.inner_text('#main h1'))
    ck('Método: barra de saltos con asignaturas', pg.locator('#main .jump button').count() >= 9)
    pg.click('#nav [data-r="aj"]'); pg.wait_for_timeout(200)
    pg.click('#main .jump button >> text=Datos y copia'); pg.wait_for_timeout(800)
    ck('saltar a «Datos» deja la sección visible', pg.evaluate("(()=>{const r=document.querySelector('[data-sec=datos]').getBoundingClientRect();return r.top>=0&&r.top<400})()"))
    pg.click('#nav [data-r="cal"]'); pg.wait_for_timeout(300)
    hh = pg.evaluate("document.querySelector('.tg').getBoundingClientRect().height")
    ck('calendario compacto (< 1350 px; con refuerzo el día va de 06:00 a 23:00)', hh < 1350, hh)
    ck('bloques con nombre abreviado legible en semana', pg.evaluate("[...document.querySelectorAll('.ev .sn')].some(e=>e.offsetParent!==null&&e.textContent.length>2)"))
    pg.click('#nav [data-r="hoy"]'); pg.wait_for_timeout(200)
    ck('Hoy: barra de progreso del día', pg.locator('.dprog').count() == 1)
    pg2 = page(820, 1100)
    ck('iPad vertical: barra de pestañas visible con 5 botones y objetivos ≥ 44 px', pg2.locator('#tabs').is_visible() and pg2.evaluate("[...document.querySelectorAll('#tabs button')].length==5&&[...document.querySelectorAll('#tabs button')].every(b=>b.getBoundingClientRect().height>=44)"))
    ck('iPad vertical: sin desbordamiento horizontal', pg2.evaluate("document.documentElement.scrollWidth<=innerWidth"))
    pg2.click('#tabs [data-r="exa"]'); pg2.wait_for_timeout(200); ck('pestaña Exámenes navega y queda activa', pg2.inner_text('#main h1').startswith('Exámenes') and pg2.get_attribute('#tabs [data-r="exa"]', 'aria-current') == 'page')
    pg2.click('#tabs [data-a=menu]'); pg2.wait_for_timeout(300); ck('«Más» abre el menú completo', pg2.locator('#nav [data-r="aj"]').is_visible())
    pg2.click('#nav [data-r="tem"]'); pg2.wait_for_timeout(200); ck('desde «Más» se llega a Temario', pg2.inner_text('#main h1') == 'Temario')
    pg3 = page(390, 844); ck('móvil: sin desbordamiento horizontal y pestañas visibles', pg3.evaluate("document.documentElement.scrollWidth<=innerWidth") and pg3.locator('#tabs').is_visible())
    pg3.click('#topSearch'); pg3.wait_for_selector('#sq'); ck('móvil: el buscador cabe en pantalla', pg3.evaluate("document.querySelector('.srchbox').getBoundingClientRect().right<=innerWidth"))
    ck('sin errores de consola ni excepciones', not errs, errs[:3])
    b.close()
srv.kill(); print(f'{sum(res)}/{len(res)}'); sys.exit(0 if all(res) else 1)
