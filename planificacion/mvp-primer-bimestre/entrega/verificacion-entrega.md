# Verificación de la entrega

Revisión local del 18 de noviembre de 2026 sobre `deploy/kawsay-nan`.

- `npm test` aprobó 34 pruebas. `npm run lint` terminó correctamente. La prueba de dos cuentas incluye el evento adicional que recibe un usuario fuera de la sala.
- El recorrido local con dos perfiles y TLS confirmó WSS autenticado con estado 101, el aviso «1 mensaje nuevo», la visualización del historial y dos usuarios conectados. Azure queda por verificar en la URL definitiva.
- El repositorio es público. El historial conserva contribuciones de los cuatro integrantes. La etiqueta se aplicará al ejecutar el pipeline.
- Se repitió el escaneo histórico de patrones de secretos sobre el árbol y 110 commits locales. Señaló dos archivos con URL de PostgreSQL de ejemplo. Al comparar los valores de configuración local, la URL de conexión a PostgreSQL y la clave de servicio de Supabase no aparecieron en el árbol ni en el historial. Las coincidencias correspondieron a marcadores de desarrollo y a direcciones de servicio. El archivo `.env` está ignorado. La auditoría se limita a los patrones del escáner y a las referencias Git locales. La [revisión histórica de B3.3](../../historico-mvp/evidencias/B3.3/secretos.md) documenta los correos asociados a commits y otros límites.

La defensa y la subida a la plataforma requieren la participación del equipo. Los materiales están en la [presentación](Kawsay-Nan-Primer-Bimestre.pptx) y el [guion](guion-demo.md).
