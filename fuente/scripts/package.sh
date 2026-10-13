#!/bin/sh
# Paquete definitivo desde el código actual: sh scripts/package.sh <focus-os-final.zip> <1-publicar.zip>
set -e; ROOT=$(pwd); OUT=${1:-focus-os-final.zip}; PUB=${2:-1-publicar.zip}; case "$OUT" in /*) ;; *) OUT="$ROOT/$OUT";; esac; case "$PUB" in /*) ;; *) PUB="$ROOT/$PUB";; esac
npm run build >/dev/null; T=$(mktemp -d)/focus-os-final
mkdir -p "$T/1-publicar" "$T/2-proyecto" "$T/3-docs" "$T/4-copias-de-seguridad"
cp -R dist/. "$T/1-publicar/"; rm -f "$T/1-publicar/_headers"
tar --exclude=./dist --exclude=./node_modules -cf - . | (cd "$T/2-proyecto" && tar xf -)
cp docs/*.md "$T/3-docs/"; cp docs/README-PUBLICAR.md "$T/README-PUBLICAR.md"
for f in /home/claude/backups/*.zip; do [ -e "$f" ] && cp "$f" "$T/4-copias-de-seguridad/"; done
cat > "$T/LEEME.md" <<'EOT'
# Focus OS — paquete final
- **README-PUBLICAR.md**: cómo actualizar tu GitHub Pages desde el iPad (empieza aquí).
- **1-publicar/**: los 7 archivos de la web (los mismos que contiene 1-publicar.zip).
- **2-proyecto/**: código fuente y pruebas (`npm run build`, `npm test`; Node ≥ 22.18).
- **3-docs/**: guía de uso y recuperación, rutina y reglas, recursos verificados, estimador 2.0, estado e informe final.
- **4-copias-de-seguridad/**: proyecto anterior a cada fase (intactas).
EOT
rm -f "$OUT" "$PUB"; (cd "$(dirname "$T")" && zip -qr "$OUT" focus-os-final); (cd "$T/1-publicar" && zip -qr "$PUB" .); echo "paquete: $OUT / $PUB"
