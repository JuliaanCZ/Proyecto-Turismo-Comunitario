#!/usr/bin/env bash
# TM-ARQ-01 · Cada carpeta y archivo nombrado en docs/mvp/arquitectura.md existe (test -e).
#
# Uso (desde cualquier carpeta del repositorio):
#   bash docs/mvp/evidencias/B3.1/comprobar-rutas.sh
#   ARQ_DOC=otro.md bash docs/mvp/evidencias/B3.1/comprobar-rutas.sh   # control negativo
#
# Qué se extrae del documento y cómo se comprueba:
#   1. Rutas con «/» dentro de código en línea (`...`) o del bloque Mermaid  → test -e desde la raíz.
#      Las que llevan «*» se expanden como patrón (compgen -G).
#   2. Nombres de archivo sueltos (server.js, hasher.js...) en código en línea  → deben existir
#      en alguna carpeta del repositorio (se muestra dónde).
#   3. Destinos de enlaces Markdown relativos [texto](destino)  → test -e desde la carpeta del documento.
# No se comprueban: rutas de la aplicación web (empiezan por «/»), patrones de ESLint (llevan «**»)
# y los archivos que crea la aplicación al arrancar (data/app.sqlite, no versionado).
# Termina con código 1 si falta algo.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

DOC="${ARQ_DOC:-docs/mvp/arquitectura.md}"
DOCDIR="$(dirname "$DOC")"
GENERADAS='app\.sqlite'
EXT='js|mjs|ejs|sql|md|css|svg|png|json|sh|txt'

LIMPIO="$(mktemp)"
trap 'rm -f "$LIMPIO"' EXIT
tr -d '\r' < "$DOC" | sed 's#<br/>#\n#g' > "$LIMPIO"

# Palabras que pueden ser rutas: solo [A-Za-z0-9_./*-]; lo demás separa.
palabras() { tr -c 'A-Za-z0-9_./*-' '\n' | sed -E 's/[.,;:]+$//' | grep -v '^$'; }
en_linea()  { grep -oE '`[^`]+`' "$LIMPIO" | tr -d '`' | palabras; }
en_mermaid() { awk '/^```mermaid/{dentro=1; next} /^```/{dentro=0} dentro' "$LIMPIO" | palabras; }
enlaces()   { grep -oE '\]\([^)#]+(#[^)]*)?\)' "$LIMPIO" | sed -E 's/^\]\(//; s/(#[^)]*)?\)$//' | grep -vE '^[a-z]+://|^mailto:' | sort -u; }

mapfile -t RUTAS < <( { en_linea; en_mermaid; } | grep -E '/' | grep -vE '^/|\*\*|^\.\.?$' | sed -E 's#^\./##; s#/$##' | sort -u )
mapfile -t SUELTOS < <( { en_linea; en_mermaid; } | grep -E "^[A-Za-z0-9_-]+\.($EXT)$" | sort -u )
mapfile -t ENLACES < <( enlaces )

echo "Documento: $DOC"
echo "Rutas con carpeta: ${#RUTAS[@]} · nombres sueltos: ${#SUELTOS[@]} · enlaces relativos: ${#ENLACES[@]}"
faltan=0; generadas=0; comprobadas=0

echo
echo "== 1. Rutas desde la raíz (test -e)"
printf '%-7s %-10s %s\n' ESTADO VERSIONADO RUTA
for ruta in "${RUTAS[@]}"; do
  if [[ "$ruta" =~ $GENERADAS ]]; then printf '%-7s %-10s %s\n' generada - "$ruta"; generadas=$((generadas + 1)); continue; fi
  comprobadas=$((comprobadas + 1))
  if [[ "$ruta" == *'*'* ]]; then compgen -G "$ruta" > /dev/null; existe=$?; ver='-'
  else
    test -e "$ruta"; existe=$?
    if [ -n "$(git ls-files -- "$ruta" | head -n 1)" ]; then ver=si; else ver=no; fi
  fi
  if [ "$existe" -eq 0 ]; then estado=OK; else estado=FALTA; faltan=$((faltan + 1)); fi
  printf '%-7s %-10s %s\n' "$estado" "$ver" "$ruta"
done

echo
echo "== 2. Nombres de archivo sueltos (deben existir en alguna carpeta del repositorio)"
for nombre in "${SUELTOS[@]}"; do
  comprobadas=$((comprobadas + 1))
  donde="$(find . -name "$nombre" -not -path './node_modules/*' -not -path './.git/*' | sed 's#^\./##' | head -n 2 | paste -sd' ')"
  if [ -n "$donde" ]; then printf '%-7s %-34s %s\n' OK "$nombre" "$donde"
  else printf '%-7s %-34s\n' FALTA "$nombre"; faltan=$((faltan + 1)); fi
done

echo
echo "== 3. Enlaces Markdown relativos (desde $DOCDIR)"
for destino in "${ENLACES[@]}"; do
  comprobadas=$((comprobadas + 1))
  if test -e "$DOCDIR/$destino"; then printf '%-7s %s\n' OK "$destino"
  else printf '%-7s %s\n' FALTA "$destino"; faltan=$((faltan + 1)); fi
done

echo
echo "Elementos comprobados: $comprobadas; generados al arrancar (no se comprueban): $generadas; faltan: $faltan"
echo "(VERSIONADO = «no» solo es esperado, antes del commit, para los archivos nuevos de B3.1)"
if [ "$faltan" -eq 0 ]; then echo "TM-ARQ-01: APROBADA"; else echo "TM-ARQ-01: FALLA"; fi
[ "$faltan" -eq 0 ]
