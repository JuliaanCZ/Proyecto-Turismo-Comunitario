# R1 · Problema, objetivos y cronograma

## Problema

Kawsay Ñan es una PYME ecuatoriana ficticia que coordina experiencias de turismo comunitario. Las ofertas, fotografías y consultas se gestionan en conversaciones y documentos dispersos. Esto dificulta saber qué experiencias siguen vigentes, encontrar opciones por provincia y controlar quién puede editar una publicación.

La aplicación centraliza el catálogo y la gestión de ofertas. Los visitantes consultan disponibilidad por WhatsApp o correo cuando hay un contacto habilitado. El equipo dispone de un panel privado y un chat con historial. El cupo es referencial. La confirmación de reservas y los pagos quedan fuera del alcance.

## Objetivo general

Desarrollar un monolito web que centralice las ofertas turísticas de la PYME, facilite el contacto con los visitantes y permita al equipo comunicarse en tiempo real. La aplicación usa Node.js, Express, EJS y Socket.IO, con PostgreSQL y Storage de Supabase para la persistencia.

## Objetivos específicos

1. Validar el registro en cliente y servidor, autenticar con contraseñas protegidas por Argon2id y demostrar la recuperación en desarrollo con un enlace de un solo uso que vence en 30 minutos. Para el envío en producción se prevé usar Brevo.
2. Permitir que un usuario gestione sus propias ofertas con búsqueda por provincia, páginas de diez elementos, detalle por ID y confirmación antes del borrado. Exponer en el catálogo las ofertas publicadas, futuras y con foto.
3. Hacer que dos cuentas intercambien mensajes y consulten su historial en una sala general, con presencia y aviso de mensajes nuevos en el panel.
4. Documentar el esquema de PostgreSQL y verificar validación, autenticación y CRUD con al menos cinco pruebas automatizadas relevantes.

## Equipo

| Integrante | Rol y responsabilidad |
| --- | --- |
| Mateo Yunga | Ofertas y despliegue. Reglas del CRUD, filtros, persistencia y configuración de publicación. |
| Mateo Calvache | Cuentas y sesión. Registro, ingreso, recuperación e integración de sesión HTTP con WebSocket. |
| Alexis Villareal | Tiempo real. Gateway, chat, historial, presencia y comprobaciones de seguridad. |
| Julian Camacho | Base web e integración. Panel, avisos de chat, arquitectura e integración del recorrido. |

## Cronograma

Semana de trabajo de cinco días laborables, con inicio el miércoles **11 de noviembre de 2026** y cierre el martes **17 de noviembre de 2026**.

| Día | Trabajo | Responsables |
| --- | --- | --- |
| Miércoles 11 | Definición del problema, historias y base del monolito. | Julian Camacho y Mateo Yunga |
| Jueves 12 | Registro, autenticación, recuperación y primeras operaciones de ofertas. | Mateo Calvache y Mateo Yunga |
| Viernes 13 | Panel, catálogo, chat autenticado, historial y presencia. | Julian Camacho, Mateo Yunga y Alexis Villareal |
| Lunes 16 | Integración de sesión y WebSocket, avisos, persistencia y pruebas del recorrido. | Los cuatro integrantes |
| Martes 17 | Revisión del MVP, documentación y preparación del despliegue. | Los cuatro integrantes |
