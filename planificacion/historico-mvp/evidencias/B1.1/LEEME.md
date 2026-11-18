# Evidencias B1.1 — Registro

## Capturas de `/registro` con errores

| Archivo | Qué muestra |
|---|---|
| `registro-con-errores.png` | Envío **sin JavaScript** (solo servidor): 422, aviso «Revisa los campos indicados» y mensajes junto a cada campo. |
| `registro-con-errores-js.png` | Envío **con JavaScript** (`form-validate.js` + el mismo `validate`): errores por campo sin llegar al servidor. |
| `registro-con-errores.html` | HTML 422 guardado desde la prueba automatizada (misma respuesta del servidor). |

Comprobado en navegador local (`http://localhost:3000/registro`) con datos inválidos (`Nombre=A`, `Correo=malo`, contraseñas cortas). Las contraseñas no se reimprimen en la respuesta del servidor.

## CSRF con sesión

Si el visitante ya tiene cookie de sesión, el formulario incluye `_csrf`. La prueba HTTP `POST /registro con sesión válida exige y acepta _csrf del formulario` abre el GET, lee el token y completa el POST.

## Comandos

Ver `npm-test.txt`, `npm-lint.txt` y `pruebas-bloque.txt`.
