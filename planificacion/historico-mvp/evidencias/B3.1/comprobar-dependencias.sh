#!/usr/bin/env bash
# B3.1 · Comprueba las reglas de dependencia descritas en docs/mvp/arquitectura.md
# (sección «Reglas reales de dependencia»). Solo lee; no modifica archivos.
#
# Uso: bash docs/mvp/evidencias/B3.1/comprobar-dependencias.sh
# Termina con código 1 si alguna comprobación falla.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

fallos=0
# vacio "descripción" comando...  → aprueba si el comando NO imprime nada
vacio() {
  local desc="$1"; shift
  local salida; salida="$("$@" 2>/dev/null)"
  if [ -z "$salida" ]; then echo "OK     $desc"; else echo "FALLA  $desc"; echo "$salida" | sed 's/^/         /'; fallos=$((fallos + 1)); fi
}
# igual "descripción" "esperado" comando...  → aprueba si la salida coincide
igual() {
  local desc="$1" esperado="$2"; shift 2
  local salida; salida="$("$@" 2>/dev/null)"
  if [ "$salida" = "$esperado" ]; then echo "OK     $desc"; else echo "FALLA  $desc (esperado: $esperado; real: $salida)"; fallos=$((fallos + 1)); fi
}

echo "== Regla 1: modules/** no importa express, socket.io ni ejs"
vacio "sin importaciones de frameworks en src/modules" grep -rnE "from '(express|socket\.io|ejs)'" src/modules

echo "== Regla 2: modules/** no importa src/web ni src/realtime"
vacio "sin importaciones de adaptadores en src/modules" grep -rnE "from '.*/(web|realtime)/" src/modules

echo "== Regla 3: un módulo importa a otro solo por su index.js (hoy no se importan)"
for m in accounts offers chat; do
  otros="$(printf '%s\n' accounts offers chat | grep -vx "$m" | paste -sd'|')"
  vacio "src/modules/$m no importa a $otros" grep -rnE "from '.*/($otros)/" "src/modules/$m"
done

echo "== Regla 4: src/web y src/realtime solo importan modules/<nombre>/index.js"
vacio "sin importaciones de data, service o domain desde adaptadores" grep -rnE "from '.*modules/[a-z]+/(data|service|domain)" src/web src/realtime
echo "   Importaciones de módulos desde adaptadores (todas deben terminar en /index.js):"
grep -rnE "from '.*modules/" src/web src/realtime | sed 's/^/     /'

echo "== Regla 5: solo src/shared/db.js importa node:sqlite dentro de src"
igual "único importador en src" "src/shared/db.js" grep -rlE "node:sqlite" src
echo "   Fuera de src (la regla de ESLint no lo cubre):"
grep -rlE "node:sqlite" scripts tests 2>/dev/null | sed 's/^/     /'

echo "== Regla 6: SQL solo en modules/*/data"
vacio "sin prepare() ni exec() de base de datos fuera de data (se descarta RegExp.exec)" \
  bash -c "grep -rnE '\.(prepare|exec)\(' src/modules src/web src/realtime src/shared/http src/container.js src/app.js | grep -v '/data/' | grep -v 'LINK_RE.exec'"

echo "== Regla 7: src/shared no importa de modules, web ni realtime"
vacio "sin importaciones hacia arriba desde src/shared" grep -rnE "from '.*(modules|/web/|realtime)" src/shared

echo "== Regla 8: los módulos solo importan de src/shared: errors, validation, db y time"
for m in accounts offers chat; do
  echo "   $m:"
  grep -rhoE "from '(\.\./){3}[^']+'" "src/modules/$m" | sort -u | sed 's/^/     /'
done
vacio "ningún módulo importa src/shared/http" grep -rnE "shared/http" src/modules

echo "== Regla 9: dentro de un módulo, domain no importa service ni data; data no importa service"
vacio "domain sin importaciones de service o data" grep -rnE "from '.*/(service|data)/" src/modules/accounts/domain src/modules/offers/domain src/modules/chat/domain
vacio "data sin importaciones de service" grep -rnE "from '.*/service/" src/modules/accounts/data src/modules/offers/data src/modules/chat/data

echo "== Regla 10: realtime no importa accounts por archivo; escucha sessionEvents; accounts lo emite"
vacio "src/realtime no importa src/modules" grep -rnE "from '.*modules" src/realtime
echo "   Emisores y oyente de 'session-revoked':"
grep -rn "session-revoked" src | sed 's/^/     /'

echo "== Un solo servidor: un único listen en el proyecto y un único createServer"
igual "listen() en server.js y src" "server.js" bash -c "grep -rlE '\.listen\(' server.js src"
igual "createServer() en src" "src/server.js" bash -c "grep -rlE 'createServer\(' src"

echo
echo "== ESLint (npm run lint): hace cumplir las reglas 1 a 5"
npm run lint --silent && echo "OK     npm run lint sin errores" || { echo "FALLA  npm run lint"; fallos=$((fallos + 1)); }

echo
echo "== Control negativo: ESLint rechaza una importación prohibida (archivo hipotético por stdin, no se escribe nada)"
rechaza() {
  local ruta="$1" codigo="$2" esperado="$3"
  local salida; salida="$(printf '%s\n' "$codigo" | npx eslint --stdin --stdin-filename "$ruta" 2>&1)"
  if echo "$salida" | grep -q "$esperado"; then echo "OK     rechazado en $ruta: $codigo"; else echo "FALLA  no se rechazó en $ruta: $codigo"; echo "$salida" | sed 's/^/         /'; fallos=$((fallos + 1)); fi
}
rechaza src/modules/chat/service/hipotetico.js "import express from 'express';" "no conoce Express"
rechaza src/modules/chat/service/hipotetico.js "import { createRouter } from '../../../web/chat.routes.js';" "no importa src/web"
rechaza src/modules/chat/service/hipotetico.js "import { x } from '../../accounts/service/login.js';" "solo por su index.js"
rechaza src/web/hipotetico.js "import { x } from '../modules/accounts/data/users.repo.js';" "no sus carpetas internas"
rechaza src/modules/offers/data/hipotetico.js "import { DatabaseSync } from 'node:sqlite';" "Solo src/shared/db.js abre SQLite"
echo "   Control positivo (permitido):"
sal="$(printf '%s\n' "import { PROVINCES } from '../modules/offers/index.js';" | npx eslint --stdin --stdin-filename src/web/hipotetico.js 2>&1)"
echo "$sal" | grep -q "no-restricted-imports" && { echo "FALLA  se rechazó una importación por index.js"; fallos=$((fallos + 1)); } || echo "OK     modules/offers/index.js desde src/web no se rechaza"

echo
[ "$fallos" -eq 0 ] && echo "Dependencias: TODAS LAS COMPROBACIONES PASAN" || echo "Dependencias: $fallos comprobación(es) fallida(s)"
[ "$fallos" -eq 0 ]
