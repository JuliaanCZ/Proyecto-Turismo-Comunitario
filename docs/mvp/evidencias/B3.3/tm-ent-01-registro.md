# TM-ENT-01 — registro de la persona que repite el README

**Estado: PENDIENTE.** Esta prueba solo cuenta si la hace **una persona distinta de quien escribió el README** (Julián). La reproducción automatizada del autor ([`clon-limpio.txt`](clon-limpio.txt)) es una comprobación previa y **no la sustituye**.

## Instrucciones exactas

Requisitos: Node.js 24.22.3 (`node -v`; ver `.nvmrc`), npm y Git en el `PATH`, y el puerto 3000 libre. Trabaja en una **carpeta nueva y vacía**, fuera de cualquier copia anterior del proyecto, y **no copies ningún `.env`** de otra carpeta.

1. Cuando Julián haya hecho el commit y el push de la rama (o la haya integrado en `main`), clona el repositorio:

   ```powershell
   git clone https://github.com/JuliaanCZ/Proyecto-Turismo-Comunitario.git tc-limpio
   cd tc-limpio
   git checkout bloque/B3.3-documentacion   # solo si B3.3 aún no está en main
   ```

2. Abre `README.md` y sigue **solo lo que dice**, sin mirar otros documentos ni preguntar al autor. Sección «Ejecutar en local»: `npm ci`, crear `.env` desde `.env.example`, `npm run db:migrate`, `npm run seed:demo`, `npm test`, `npm start`. En Windows usa `npm.cmd` si PowerShell bloquea `npm.ps1`.
3. Con `npm start` en marcha, comprueba lo que el README promete: `http://localhost:3000/salud` responde `{"status":"ok"}`; `/ofertas` muestra 7 ofertas; en una ventana normal, `/ingreso` con `ana@demo.test` y la clave de `SEED_DEMO_PASSWORD` de tu `.env` entra a `/panel`; `/dev/bandeja` pide la clave de `DEMO_MAILBOX_PASSWORD`; `node scripts/check-ws.js http://localhost:3000` imprime `UNAUTHENTICATED` y sale con 1 (es lo esperado).
4. Anota abajo cada comando, su código de salida real, lo que no estaba claro o no funcionó y cuánto tardaste. **Si algo falla, cópialo tal cual** (sin contraseñas, tokens ni cookies). No corrijas el README tú mismo: describe el problema para que el autor lo arregle.
5. Confirma con **tu propia cuenta de GitHub** (comentario en el PR de B3.3 o commit con este archivo completado).

## Registro (completar)

| Campo | Valor |
|---|---|
| Persona (usuario de GitHub) | ☐ pendiente |
| Fecha y hora | ☐ pendiente |
| Sistema operativo y terminal | ☐ pendiente |
| `node -v` y `npm -v` | ☐ pendiente |
| Rama o commit clonado (`git rev-parse --short HEAD`) | ☐ pendiente |

| Paso del README | Comando | Código de salida | Resultado (pasó / falló) y observaciones |
|---|---|---|---|
| 1 | `npm ci` | ☐ | ☐ |
| 2 | Crear `.env` desde `.env.example` | ☐ | ☐ |
| 3 | `npm run db:migrate` | ☐ | ☐ |
| 4 | `npm run seed:demo` | ☐ | ☐ |
| 5 | `npm test` (esperado: todas las pruebas pasan) | ☐ | ☐ (pruebas totales y que pasan: ☐) |
| 6 | `npm start` y `/salud` | ☐ | ☐ |
| 7 | `/ofertas` muestra 7 ofertas | — | ☐ |
| 8 | Ingreso de Ana y `/panel` | — | ☐ |
| 9 | `/dev/bandeja` con clave | — | ☐ |

Dudas o errores del README: ☐ ninguno / ☐ _(describir)_

**Veredicto de TM-ENT-01:** ☐ pasa ☐ falla ☐ pasa con observaciones — Confirmado por: ☐ _(usuario de GitHub, fecha)_
