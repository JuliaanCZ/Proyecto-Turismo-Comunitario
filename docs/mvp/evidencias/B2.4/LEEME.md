# Evidencias B2.4

## Base y prerrequisitos

- Rama comprobada: `bloque/B2.4-Seguridad`.
- Base: `b97dfdb`, el mismo commit que `main` al iniciar el bloque.
- B1.5 está integrado mediante `6a1f949` (PR #14).
- B2.1 está integrado mediante `b97dfdb` (PR #20).
- La sesión de WebSocket se resuelve y vuelve a comprobar mediante el servicio compartido de cuentas; B2.4 solo lo verifica y no añade un segundo mecanismo.

## Resultado ejecutado

- `node --test "tests/security/*.test.js"`: 10/10, sin fallos.
- `npm.cmd test`: 183/183, sin fallos.
- `npm.cmd run lint`: sin errores.
- No se detectaron defectos que deban devolverse a otro bloque y no se modificó código productivo.

Las salidas relevantes están en `pruebas-seguridad.txt`, `npm-test.txt` y `npm-lint.txt`. La matriz y el guion de tres minutos están en `docs/mvp/seguridad.md`.

## Capturas visuales pendientes

La automatización no pudo adjuntar las capturas porque el host de acceso al navegador local respondió `The browser access host is unavailable`. Esta limitación es externa a la aplicación; la comprobación HTTP automatizada de TM-SEG-05 sí pasó. Antes de abrir el PR, realizar esta comprobación manual con datos ficticios:

1. Ejecutar `npm.cmd start` desde PowerShell, ingresar con una cuenta sembrada de B2.2 o registrar una cuenta ficticia.
2. Crear una oferta válida cuyo título sea `<img src=x onerror=alert('xss')>` y cuya descripción incluya `<script>alert('xss')</script>` junto con texto suficiente para superar la validación.
3. Abrir «Mis ofertas» y comprobar que la etiqueta se ve literalmente como texto, sin imagen rota ni cuadro de diálogo. Guardar la pantalla como `xss-oferta-escapada.png` en esta carpeta.
4. Enviar en el chat `<script>alert('chat')</script>` y comprobar que se ve literalmente como texto y no se ejecuta. Guardar la pantalla como `xss-chat-escapado.png` en esta carpeta.
5. No abrir DevTools con cookies o tokens visibles y no incluir credenciales en las capturas.

Con esas dos imágenes queda completa la evidencia visual prevista por TM-SEG-05.
