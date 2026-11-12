# Roadmap EP3 · Simon (ms-citas e integración de citas)

**Entrega: miércoles 25/11/2026** (se planifica como sección 001). Defensa: semana 17.
Última actualización: 12/11/2026.

## Decisiones tomadas

| # | Decisión | Detalle |
| --- | --- | --- |
| 1 | `DELETE /api/citas/{id}` solo de citas **canceladas** | Solo ADMIN; razón documentada en `contrato-backend.md` §6.1 (la rúbrica exige eliminar en el CRUD). |
| 2 | Mismos IDs de EP2 en los 3 esquemas | `U001…`, `NUT001…`, `CN001…`, `C0001…`, `P0001…`. |
| 3 | Simon arma la base común (G-30) | Hecho: 3 microservicios, Docker, proxy, `http.js`. |
| 4 | **MySQL 8 en Docker** | Un esquema por microservicio; H2 solo para pruebas. |
| 5 | **Formato de error común** | `timestamp, status, error, mensaje, ruta, errores` (`contrato-backend.md` §2). |
| 6 | **Pago y cita en un solo endpoint** | `POST /api/citas` cobra y crea en una transacción; 402 si se rechaza. |
| 7 | **Modo dual** del frontend | `VITE_API_MODE=api/local`; las pruebas de Vitest siguen en local. |
| 8 | **Todo ejecutable desde Docker** | `docker compose up -d --build`: MySQL + 3 microservicios + frontend con Nginx (proxy `/api`). Funciona en Windows y Linux sin Java/Maven/Node instalados. |
| 9 | **Verificación con script** | `scripts\verificar.ps1` es la definición de terminado de cada ítem: JUnit de ms-citas (Docker, Java 21), Vitest, los 5 servicios, `validate` del esquema y peticiones de humo. Un commit por ítem, solo si da PASA. |
| 10 | **Modelo de ms-citas (R3)** | `pago` guarda `paciente_id`; `cita.pago_id` es `NOT NULL UNIQUE`; candado `agenda_dia` por nutricionista y día; `contador` para los IDs. Razones en "Notas para la defensa". |

## Estado

| Ítem | Descripción | Fecha | Estado |
| --- | --- | --- | --- |
| Prep. | Services del frontend listos para API, errores tipados, foto de nutricionistas, sección crítica en `crearCita` | 11/11 | **Hecho** (commit `c7d345a`) |
| G-30 | Base común: 3 microservicios (estructura DoggySpa), error común, JWT, Swagger, CORS, perfil `dev` con token de prueba; `http.js`, proxy de Vite | 12/11 | **Hecho** (commit `9634f5b`) |
| R1 | Proyecto ms-citas en 8082 | 12–13/11 | **Hecho**: arranca con H2 en el PC de Simon |
| R2 | Docker: compose con MySQL 8, Dockerfiles multi-etapa, Nginx | 13/11 | **Hecho** (12/11): los 5 servicios levantan; lo comprueba `scripts\verificar.ps1` |
| R4 | Formato de error: `GlobalExceptionHandler` + 401/403 por el mismo JSON | 15/11 | **Hecho en la base** (faltan pruebas) |
| R3 | Modelo y BD (S-30): `EstadoCita`, `Cita`, `HistorialCita`, `Pago`, `Recordatorio`; `database/02_citas.sql` con semillas; `UNIQUE(pago_id)` | 13–15/11 | **Hecho** (12/11): 7 entidades, 4 repositorios, 8 pruebas JUnit; `validate` pasa en MySQL |
| R5 | Reglas en Java (puerto de `utils/citas.js`): transiciones, 24 h, bloques, choques, 60 días, teleconsulta | 16–17/11 | Sin empezar |
| R6 | Cliente de ms-clinica (`NUTRIVIDA_CLINICA_URL`) para horario y duración, con simulado | 17/11 | Sin empezar · depende de C-31 |
| R7 | API + Swagger (S-31 a S-33): endpoints de `contrato-backend.md` §6, DTOs, `@Valid` | 17–18/11 | Sin empezar |
| R8 | Seguridad: `@PreAuthorize` por rol y reglas de dueño con `UsuarioActual` | 19/11 | **En riesgo** · depende de G-32 (plan B: perfil `dev`) |
| R9 | Frontend modo dual (S-35): adaptadores API de `citasService`/`pagosService`; `Pago.jsx` en una sola llamada; 401 → `/login` | 20–21/11 | Sin empezar |
| R10 | Integración con los 3 servicios + `peticiones.http` + 4 pruebas JUnit/Mockito (transiciones, 24 h, pago doble, 403) | 22/11 | Sin empezar |
| R11 | **Video** (tope duro): Swagger de citas, flujo React→API→BD, paciente vs secretaria (403), recarga con sesión | **23/11** | Sin empezar |
| R12 | Documentación (S-37): sección del documento de integración, ERS V3, manual con capturas | 24/11 | Sin empezar |
| — | Entrega: ZIPs, enlaces, revisión en incógnito | 25/11 | — |

## Prioridad (MoSCoW)

- **Imprescindible:** R1 a R9, R11 y R12 (cubren los 6 indicadores de la rúbrica EP3).
- **Importante:** 4 pruebas JUnit, `DELETE` de canceladas, ejemplos en Swagger.
- **Si sobra tiempo:** recordatorio con `@Scheduled` (S-34), más pruebas.
- **Fuera de EP3:** imágenes en EC2/AWS y correo de recordatorio (son del EFT).

## Riesgos y dependencias

| Riesgo | Plan B | Fecha límite |
| --- | --- | --- |
| Login JWT de Gabriel (G-32) atrasado | Perfil `dev` + `POST /api/dev/token` con el mismo `JWT_SECRET` | 19/11 |
| Endpoints de Catalina (C-31) atrasados | Cliente de ms-clinica simulado con las semillas | 20/11 |
| Video atrasado | Tope 23/11 con un día de margen | 23/11 |

## Pendiente de decidir con el equipo

1. **Rutas públicas vs. Forma D:** la Forma D pide que ningún endpoint responda sin autenticación salvo login y registro. Hoy son públicos los `GET` de catálogo, disponibilidad y artículos (los usa el sitio público de EP2). ¿Se mantienen o se exige token?
2. **JWT de 8 h:** un usuario desactivado sigue con acceso hasta que vence su token (ms-citas y ms-clinica no consultan a ms-usuarios). Preparar la respuesta para la defensa o acortar la vigencia.

## Notas para la defensa

### R3 · Modelo y base de datos

- **Por qué `pago` guarda `paciente_id` y no `cita_id`.** El enlace pago↔cita vive en un solo lugar, `cita.pago_id` (3FN, sin datos repetidos). Pero un pago RECHAZADO no tiene cita, y el pago de una cita cancelada que se elimina tampoco (§6.1). Sin `paciente_id` no se podría saber de quién es el comprobante para la regla "dueño o ADMIN" de `GET /api/pagos/{id}`.
- **Por qué `cita.pago_id` es `NOT NULL UNIQUE`.** `NOT NULL`: toda cita nace de `POST /api/citas`, que cobra primero. `UNIQUE`: es la última barrera contra el pago doble (RN-35). Si dos peticiones usan el mismo pago a la vez, la segunda choca en la base aunque el código fallara, y `GlobalExceptionHandler` la traduce a 409.
- **El candado `agenda_dia`.** Revisar si una hora está libre y luego guardar son dos pasos: dos pacientes podrían ver la misma hora libre y guardar los dos. Antes de revisar, la transacción ejecuta `INSERT … ON DUPLICATE KEY UPDATE` sobre la fila (nutricionista, día), que queda bloqueada hasta el COMMIT. La segunda reserva espera y, cuando entra, ya ve la cita de la primera. Es una sola sentencia porque "insertar si falta y después `SELECT … FOR UPDATE`" toma dos bloqueos y puede terminar en deadlock. Días o nutricionistas distintos no se esperan entre sí.
- **El `contador`.** Los IDs siguen el formato de EP2 (`C0006`). Calcular `MAX(id) + 1` choca si dos citas de nutricionistas distintos se crean a la vez; la fila del contador se lee con `SELECT … FOR UPDATE` y nunca entrega el mismo número dos veces.
- **Los `CHECK`.** Estados válidos, monto positivo, 4 dígitos y motivo de 10 a 300 caracteres también se validan en la base. MySQL 8 sí los aplica, y además impiden renombrar una columna que usan.
- **`ddl-auto=validate` en MySQL.** Las tablas las crea `02_citas.sql`, no Hibernate. Al arrancar, Hibernate compara entidades y tablas y no arranca si no calzan; `verificar.ps1` lo comprueba en cada ítem (probado rompiendo una columna a propósito: lo detecta y nombra la columna).
- **Semillas con fechas relativas.** Las 5 citas de EP2 se cargan con fechas calculadas desde el día de la carga, siempre en un día en que el nutricionista atiende. Así la demo siempre tiene citas pasadas, una para mañana (prueba de las 24 h) y otras para la semana.

## Cambios respecto del plan semestral

- S-32: `POST /api/pagos` se integra en `POST /api/citas`.
- S-34 (recordatorio) pasa a "si sobra tiempo"; S-36 se reduce a 4 pruebas clave.
- El video se adelanta al 23/11.
- Se agregan: formato de error común, modo dual, `DELETE` de canceladas, Docker completo con Nginx.
