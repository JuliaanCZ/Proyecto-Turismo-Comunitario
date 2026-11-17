# Pruebas del MVP

Las pruebas automatizadas viven en `tests/` y usan identificadores `TM-`.
El arnés HTTP/WebSocket se ejecuta con `node --test tests/base/arnes.test.js`.
Los ayudantes insertan datos directamente por SQL y no importan servicios de negocio.
El contexto usa SQLite en memoria y el servidor usa un puerto efímero.

Ejemplo de uso:

```js
const ctx = createTestContext();
const user = createUser(ctx, { email: 'ana@test.local', displayName: 'Ana Test' });
const session = createSessionFor(ctx, user.id);
const server = await startTestServer(ctx);
const client = connect({ url: server.url, cookie: session.cookie, origin: ctx.container.config.appOrigin });
await client.waitForConnection();
```

`createSessionFor` genera 32 bytes en base64url, guarda `sha256(token)` en hexadecimal
minúscula en `sessions` y devuelve la cookie `tc_session`; no se registra ningún token
ni cookie.

`waitForConnection`, `waitFor` y `expectNoEvent` usan un tiempo máximo solo como
límite de seguridad. Las pruebas se sincronizan mediante `connect`, `connect_error`,
eventos testigo o `disconnect`; no usan pausas fijas. Si la conexión falla,
`waitForConnection` conserva el error original de Socket.IO.
