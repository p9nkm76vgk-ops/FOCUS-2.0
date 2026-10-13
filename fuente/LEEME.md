# Código fuente de Focus OS

Esta carpeta guarda el código fuente y las pruebas de la app que se publica en la raíz de este repositorio (`index.html`, `sw.js`, manifest e iconos son el resultado de compilar esto).

- Compilar: `npm run build` (Node ≥ 22.18; sin dependencias) → genera `dist/`; sus 7 archivos son los de la raíz.
- Probar: `npm test`. En navegador real: `python3 scripts/browser-v5.py` (necesita Playwright + Chromium).
- Qué cambió en cada versión y qué se ha verificado: `docs/CAMBIOS-V5.md` y `docs/ESTADO.md`.

No hace falta tocar esta carpeta para usar la app: puedes borrarla sin afectar a la web publicada.
