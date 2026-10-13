"""Publicación bajo /focus-os/ (como GitHub Pages: subruta + Cache-Control max-age=600) en Chromium real. Uso: python3 scripts/browser-pages.py <dist>"""
import http.server, threading, shutil, sys, os, re, json, time
from playwright.sync_api import sync_playwright
DIST = sys.argv[1] if len(sys.argv) > 1 else 'dist'; ROOT = {'d': DIST}; LOG = []; PORT = 8767; R = []
def ck(n, c, x=''): R.append(bool(c)); print('OK   ' if c else 'FALLO', n, '' if c else x, flush=True)
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = path.split('?')[0]
        if not path.startswith('/focus-os/') and path != '/focus-os': return '/nonexistent'
        rel = path[len('/focus-os/'):] or 'index.html'; return os.path.join(ROOT['d'], rel)
    def end_headers(self): self.send_header('Cache-Control', 'max-age=600'); super().end_headers()
    def log_message(self, f, *a): LOG.append((a[0], a[1]))
srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{PORT}/focus-os/'
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1180, 'height': 820}); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(URL); pg.wait_for_selector('#main h1'); pg.evaluate("navigator.serviceWorker.ready.then(()=>1)"); pg.wait_for_timeout(500)
    reg = pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>({scope:r.scope,active:!!r.active,script:r.active&&r.active.scriptURL}))")
    ck('Se sirve bajo /focus-os/', pg.title() == 'Focus OS'); ck('SW registrado con alcance /focus-os/', reg['scope'] == URL and reg['script'] == URL + 'sw.js', str(reg))
    mf = pg.evaluate("fetch('manifest.webmanifest').then(r=>r.json())"); ck('Manifest: start_url y scope relativos resuelven bajo /focus-os/', pg.evaluate("new URL(document.querySelector('link[rel=manifest]').href).pathname") == '/focus-os/manifest.webmanifest' and mf['start_url'] == './' and mf['scope'] == './')
    ck('Iconos del manifest accesibles bajo la subruta', all(pg.evaluate("(u)=>fetch(new URL(u,location.href)).then(r=>r.status)", i['src']) == 200 for i in mf['icons']))
    ck('Ninguna petición fuera de /focus-os/ ni 404 de recursos de la app', not [l for l in LOG if '404' in str(l[1]) and 'favicon.ico' not in l[0]], str([l for l in LOG if '404' in str(l[1])][:3]))
    keys1 = pg.evaluate("caches.keys()"); ck('Caché del SW creada con versión', len(keys1) == 1 and keys1[0].startswith('focusos-'), str(keys1))
    pg.evaluate("localStorage.setItem('focusos.v1', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('focusos.v1')), {marca:'dato-usuario'})))"); snap = pg.evaluate("localStorage.getItem('focusos.v1')")
    # nueva versión desplegada (GitHub Pages sigue enviando max-age=600): el SW debe bajarla saltándose la caché HTTP
    shutil.rmtree('/tmp/dist-nueva', ignore_errors=True); shutil.copytree(DIST, '/tmp/dist-nueva'); sw = open('/tmp/dist-nueva/sw.js').read(); open('/tmp/dist-nueva/sw.js', 'w').write(re.sub(r'focusos-[0-9a-f]+', 'focusos-v-nueva', sw))
    ix = open('/tmp/dist-nueva/index.html').read(); open('/tmp/dist-nueva/index.html', 'w').write(ix.replace('</body>', '<!--MARCA-NUEVA--></body>')); ROOT['d'] = '/tmp/dist-nueva'
    pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.update())"); pg.wait_for_timeout(1800); keys2 = pg.evaluate("caches.keys()")
    ck('Actualización: el SW instala la versión nueva y retira la antigua', keys2 == ['focusos-v-nueva'], str(keys2)); ck('Los datos del usuario no se tocan al actualizar', pg.evaluate("localStorage.getItem('focusos.v1')") == snap)
    c.set_offline(True); html = pg.evaluate("fetch('./').then(r=>r.text())"); ck('Sin conexión se sirve la versión NUEVA (no archivos antiguos de la caché)', 'MARCA-NUEVA' in html)
    pg.reload(); pg.wait_for_selector('#main h1'); ck('Reabrir sin conexión funciona y conserva el dato', 'dato-usuario' in (pg.evaluate("localStorage.getItem('focusos.v1')") or '')); c.set_offline(False)
    ck('Sin errores de consola', not errs, str(errs[:3])); b.close()
srv.shutdown(); print(f"\nRESULTADO: {sum(R)}/{len(R)} comprobaciones superadas (subruta /focus-os/, Chromium real)"); sys.exit(0 if all(R) else 1)
