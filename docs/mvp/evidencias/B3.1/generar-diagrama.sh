#!/usr/bin/env bash
# B3.1 · Exporta el primer bloque Mermaid de docs/mvp/arquitectura.md a SVG y PNG.
#
# Uso (desde cualquier carpeta del repositorio):
#   MMDC=/ruta/a/node_modules/.bin/mmdc [CHROME=/ruta/a/chrome] bash docs/mvp/evidencias/B3.1/generar-diagrama.sh
#
# MMDC   Mermaid CLI (@mermaid-js/mermaid-cli 11.17.0). No es dependencia del proyecto.
# CHROME Opcional: navegador ya instalado, para no descargar el de Puppeteer.
set -euo pipefail

: "${MMDC:?Define MMDC con la ruta de mmdc (ver docs/mvp/arquitectura.md)}"
cd "$(git rev-parse --show-toplevel)"

DOC=docs/mvp/arquitectura.md
OUT=docs/mvp/img
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
# Rutas con formato Windows (C:/...) para que Node las entienda desde Git Bash.
if command -v cygpath >/dev/null 2>&1; then tmp="$(cygpath -m "$tmp")"; fi

# Primer bloque ```mermaid del documento, sin retornos de carro.
awk '/^```mermaid/{dentro=1; next} /^```/{if (dentro) exit} dentro' "$DOC" | tr -d '\r' > "$tmp/arquitectura.mmd"
[ -s "$tmp/arquitectura.mmd" ] || { echo "No se encontró un bloque mermaid en $DOC" >&2; exit 1; }

cat > "$tmp/config.json" <<'JSON'
{
  "theme": "base",
  "htmlLabels": false,
  "themeVariables": { "fontFamily": "Arial, Helvetica, sans-serif", "fontSize": "18px", "lineColor": "#334155" },
  "flowchart": { "htmlLabels": false, "nodeSpacing": 45, "rankSpacing": 60, "curve": "basis", "padding": 14, "wrappingWidth": 420 }
}
JSON

puppeteer=()
if [ -n "${CHROME:-}" ]; then
  printf '{ "executablePath": "%s" }\n' "$CHROME" > "$tmp/puppeteer.json"
  puppeteer=(-p "$tmp/puppeteer.json")
fi

mkdir -p "$OUT"
"$MMDC" -i "$tmp/arquitectura.mmd" -o "$OUT/arquitectura.svg" -c "$tmp/config.json" -b white "${puppeteer[@]}"
"$MMDC" -i "$tmp/arquitectura.mmd" -o "$OUT/arquitectura.png" -c "$tmp/config.json" -b white -s 2 -w 1600 "${puppeteer[@]}"

"$MMDC" --version
ls -l "$OUT/arquitectura.svg" "$OUT/arquitectura.png"
