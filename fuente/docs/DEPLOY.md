# Actualizar Focus OS en GitHub Pages desde el iPad (mismo repositorio, mismo historial)
Ver `README-PUBLICAR.md` (la guía corta). Este documento amplía los puntos técnicos.
- **Rutas**: la app usa rutas relativas (`./`): funciona en `https://USUARIO.github.io/focus-os/` y en cualquier subruta (verificado en Chromium bajo `/focus-os/`).
- **Caché**: el service worker cambia de versión en cada build y, al instalarse, descarga los archivos saltándose la caché HTTP (GitHub Pages envía `max-age=600`); retira las cachés antiguas. Verificado con una actualización simulada bajo `/focus-os/` con esa cabecera.
- **Datos**: viven en el `localStorage` del origen (`USUARIO.github.io`). Actualizar archivos no los toca; cambiar de URL sí los separa (exporta/importa).
- **Hosting alternativo** (Netlify/Cloudflare Pages): publica la carpeta `1-publicar`; `public/_headers` (en el proyecto) fija `no-cache` para `index.html`, `sw.js` y el manifest.
