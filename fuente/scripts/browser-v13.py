"""v13 en Chromium real (NO Safari): Hoy sin ruido, Hecho / No hecho a un toque, horario de clases y .ics con aviso 10 min antes."""
import subprocess, time, json, sys
from datetime import datetime
from playwright.sync_api import sync_playwright
PORT = 8779; RES = []
def ck(n, c, x=''): RES.append(bool(c)); print(('OK   ' if c else 'FALLO'), n, x if not c else '', flush=True)
srv = subprocess.Popen(['python3', '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd='dist', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
FIX = json.load(open('test/fixtures/export-v2.json')); [FIX.pop(k) for k in ('app', 'schema', 'exportedAt')]
ls = lambda p: json.loads(p.evaluate("localStorage.getItem('focusos.v1')") or 'null')
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch(); c = b.new_context(viewport={'width': 1180, 'height': 820}, has_touch=True, timezone_id='Europe/Madrid', locale='es-ES', accept_downloads=True)
    c.add_init_script("if(!sessionStorage.getItem('s')){localStorage.setItem('focusos.v1'," + json.dumps(json.dumps(FIX)) + ");sessionStorage.setItem('s','1')}")
    errs = []; p = c.new_page(); p.set_default_timeout(8000); p.on('pageerror', lambda e: errs.append(str(e))); p.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    p.clock.set_fixed_time(datetime.fromisoformat('2026-10-13T17:00:00')); p.goto(f'http://127.0.0.1:{PORT}/'); p.wait_for_selector('#main h1')
    t = p.inner_text('#main').lower()
    ck('Hoy: tarjeta principal con Hecho y No hecho', p.locator('.hero button[data-a=quickDone]').count() == 1 and p.locator('.hero button[data-a=noHecho]').count() == 1)
    ck('Hoy: sin avisos de déficit ni mensajes de estado', 'déficit' not in t and 'no caben' not in t and p.locator('.warn').count() == 0)
    ck('Hoy: lo demás está plegado', p.locator('details.more').count() >= 1 and not p.evaluate("document.querySelector('details.more').open"))
    sk0 = sum(1 for x in ls(p)['blocks'] if x['status'] == 'skipped'); id0 = p.get_attribute('.hero button[data-a=noHecho]', 'data-id')
    p.click('.hero button[data-a=noHecho]'); p.wait_for_timeout(500)
    S = ls(p); bl = [x for x in S['blocks'] if x['id'] == id0]
    ck('No hecho: un solo toque, sesión omitida y sin diálogo', bl and bl[0]['status'] == 'skipped' and not p.evaluate("document.querySelector('#dlg')?.open"), str(bl))
    ck('No hecho: el trabajo se reprograma solo', any(x['status'] == 'planned' and x['workId'] == bl[0]['workId'] for x in S['blocks']))
    p.click('#nav [data-r="aj"]'); p.wait_for_selector('#tt1')
    p.fill('#tt1', '08:00-08:55 Matemáticas II\n09:05-10:00 Física'); p.fill('#tt3', '08:00-08:55 Química'); p.click('button[data-a=ttSave]'); p.wait_for_timeout(400)
    ck('Horario de clases guardado en el estado', len(ls(p).get('timetable', [])) == 3, str(ls(p).get('timetable')))
    p.fill('#tt2', '10:00-09:00 Mal'); p.click('button[data-a=ttSave]'); p.wait_for_timeout(300)
    ck('Horario inválido: rechaza y no guarda', 'posterior' in p.inner_text('#ttMsg') and len(ls(p).get('timetable', [])) == 3)
    p.fill('#tt2', ''); p.click('button[data-a=icsAsk]'); p.wait_for_selector('#dlg[open]')
    with p.expect_download() as d: p.click('#dlg button:has-text("Descargar")')
    txt = open(d.value.path(), encoding='utf-8').read()
    ck('.ics: 3 clases semanales con aviso 10 min antes', txt.count('SUMMARY:Clase') == 3 and txt.count('RRULE:FREQ=WEEKLY') == 3 and 'TRIGGER:-PT10M' in txt, txt[:200])
    p.reload(); p.wait_for_selector('#main h1')
    ck('Tras recargar el horario sigue', len(ls(p).get('timetable', [])) == 3)
    ck('Sin errores de consola', not errs, str(errs))
finally: srv.kill()
print(f'{sum(RES)}/{len(RES)}'); sys.exit(0 if all(RES) else 1)
