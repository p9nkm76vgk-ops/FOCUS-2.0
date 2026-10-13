"""Comprobación en Chromium real de la tarjeta de cuenta (la red a Supabase no se prueba aquí)."""
from playwright.sync_api import sync_playwright
import sys
ok = 0; tot = 0
def ck(n, c):
    global ok, tot; tot += 1; ok += bool(c); print(('OK   ' if c else 'FALLA ') + n)
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/opt/pw-browsers/chromium' if False else None); p = b.new_page(viewport={'width': 1180, 'height': 820}); errs = []
    p.on('pageerror', lambda e: errs.append(str(e))); p.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    p.goto('file:///home/claude/focus-os/dist/index.html'); p.wait_for_selector('#main h1')
    p.click('#nav [data-r=aj]'); p.wait_for_selector('#authf')
    ck('tarjeta de cuenta visible en Ajustes', 'cuenta y sincronización' in p.inner_text('#main').lower() and p.locator('#authf input[type=password]').count() == 1)
    p.fill('#authf [name=email]', 'no-es-correo'); p.click('button[data-a=syncIn]'); ck('correo inválido: mensaje claro, sin red', 'correo válido' in p.inner_text('#autherr'))
    p.fill('#authf [name=email]', 'a@b.es'); p.fill('#authf [name=pw]', 'corta'); p.click('button[data-a=syncUp]'); ck('contraseña corta rechazada', '8 caracteres' in p.inner_text('#autherr'))
    ck('sin errores de consola', not [e for e in errs if 'Failed to load resource' not in e and 'ERR_' not in e]); print(f'{ok}/{tot}')
    b.close(); sys.exit(0 if ok == tot else 1)
