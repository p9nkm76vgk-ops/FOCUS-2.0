# Focus OS — publicar la nueva versión desde el iPad (sin ordenador)
**Versión de esta entrega: `9db9217fc9`** (la verás en la app: Ajustes → Datos → «Versión de la app cargada»).
Esto **actualiza tu repositorio actual de GitHub Pages**: no crea otro sitio y **conserva el historial** (cada subida es un commit nuevo).

## 0. Antes (1 minuto, importante)
Abre tu Focus OS actual → **Ajustes → Exportar copia JSON** y guárdala en Archivos. Tus datos están en el navegador: actualizar archivos no los borra, pero así tienes una copia por si acaso. **No borres «Datos de sitios web» de Safari**: perderías tus datos.

## 1. Obtén los archivos
Descarga **1-publicar.zip** (desde la página de descargas que te dio Claude). En la app **Archivos**, tócalo para descomprimirlo: aparece una carpeta con **7 archivos** sueltos:
`index.html`, `sw.js`, `manifest.webmanifest`, `icon-180.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.

## 2. Súbelos a tu repositorio actual
1. Safari → **github.com** → inicia sesión → abre tu repositorio (`focus-os`).
2. Comprueba dónde está tu `index.html` actual (en la raíz del repositorio, o en la carpeta que indique *Settings → Pages → Source*). **Sube los 7 archivos a esa misma ubicación.**
3. **Add file → Upload files** → «choose your files» → selecciona los 7 archivos de la carpeta descomprimida.
4. Escribe un mensaje (por ejemplo «Focus OS: rutina, Explorar y nuevo diseño») → **Commit changes** (en la rama que usa Pages, normalmente `main`).
5. Los archivos con el **mismo nombre se sustituyen**; no hay que borrar nada. Si en tu repositorio hay archivos extra de la versión anterior (por ejemplo `_headers`), déjalos: no estorban.
6. Espera 1–2 minutos (*Settings → Pages* muestra «Your site is live»).

## 3. Comprueba que usas la versión nueva
1. Abre `https://TU-USUARIO.github.io/focus-os/sw.js` en Safari: la primera línea con `V =` debe contener **`focusos-9db9217fc9`**.
2. Abre Focus OS (con conexión). **Ciérrala del todo (desliza hacia arriba) y vuelve a abrirla**: la primera apertura puede mostrar aún la versión antigua mientras la nueva se descarga; la segunda ya usa la nueva.
3. **Ajustes → Datos → «Versión de la app cargada»** debe decir **`9db9217fc9`**. Si dice otra cosa, repite el paso 2 con conexión.
4. Si abriste la app desde la pantalla de inicio, no necesitas volver a «Añadir a pantalla de inicio».

## Si algo falla
- Se ve la versión antigua tras dos aperturas: comprueba que subiste los archivos a la carpeta correcta y que `sw.js` muestra la versión nueva (paso 3.1).
- Tus datos no aparecen: estás en otra dirección (otro usuario o repositorio). Importa tu copia JSON en Ajustes.
- Volver atrás: en GitHub abre el commit anterior de cada archivo y restáuralo, o reutiliza el ZIP de la versión previa de la carpeta `4-copias-de-seguridad`.
