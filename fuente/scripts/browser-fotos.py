import sys,subprocess,time
from playwright.sync_api import sync_playwright
IMG=sys.argv[1]
srv=subprocess.Popen(['python3','-m','http.server','8766','-d','dist'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
ok=[]
try:
  with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8766/index.html');pg.wait_for_timeout(800)
    ok.append(('tarjeta vacía',pg.locator('text=Mi porqué').count()>0))
    pg.set_input_files('#fotoIn',IMG);pg.wait_for_selector('img[alt="Foto personal"]',timeout=5000)
    w=pg.evaluate("document.querySelector('img[alt=\"Foto personal\"]').naturalWidth")
    ok.append(('reducida a 1200',w==1200))
    pg.reload();pg.wait_for_selector('img[alt="Foto personal"]',timeout=5000);ok.append(('persiste',True))
    pg.click('[data-a=fotoDel]');pg.click('[data-a=choice][data-i="1"]');pg.wait_for_timeout(500)
    ok.append(('borrada',pg.locator('img[alt="Foto personal"]').count()==0))
    ok.append(('sin errores',not errs))
finally: srv.kill()
for n,v in ok:print('OK ' if v else 'FALLO',n)
sys.exit(0 if all(v for _,v in ok) else 1)
