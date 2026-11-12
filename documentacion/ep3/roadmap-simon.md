# Roadmap EP3 · Simon (ms-citas e integración de citas)

**Entrega: miércoles 25/11/2026** (se planifica como sección 001). Defensa: semana 17.
Última actualización: 12/11/2026 (R7 a R10).

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
| 9 | **Verificación con script** | `scripts\verificar.ps1` es la definición de terminado de cada ítem: JUnit de ms-citas (Docker, Java 21), pruebas mutantes (PIT), Vitest, los 5 servicios, `validate` del esquema y peticiones de humo. Un commit por ítem, solo si da PASA. |
| 10 | **Modelo de ms-citas (R3)** | `pago` guarda `paciente_id`; `cita.pago_id` es `NOT NULL UNIQUE`; candado `agenda_dia` por nutricionista y día; `contador` para los IDs. Razones en "Notas para la defensa". |
| 11 | **Cliente de ms-clinica (R6)** | `ClinicaClient` con tres implementaciones; `NUTRIVIDA_CLINICA_MODO=auto` (por defecto) usa las semillas de EP2 mientras C-31 no exista; `http` para el video y la entrega. |
| 12 | **Pruebas mutantes (PIT)** | La lógica de cálculo de ms-citas (`ReglasCita`, `ReglasPago`, `Contador`, `Cita.registrarCambio`, `Tarjeta`, `ServicioClinica`) se prueba con PIT: 252 mutantes, 250 muertos y 2 equivalentes documentados. `verificar.ps1` falla si sobrevive uno nuevo. |
| 13 | **API de ms-citas (R7 y R8)** | Rol grueso con `@PreAuthorize` en el controlador; dueño, 24 h y transiciones en el service, con los mismos mensajes de EP2. Cliente de ms-usuarios con los tres modos de R6 (`NUTRIVIDA_USUARIOS_MODO`). |

## Estado

| Ítem | Descripción | Fecha | Estado |
| --- | --- | --- | --- |
| Prep. | Services del frontend listos para API, errores tipados, foto de nutricionistas, sección crítica en `crearCita` | 11/11 | **Hecho** (commit `c7d345a`) |
| G-30 | Base común: 3 microservicios (estructura DoggySpa), error común, JWT, Swagger, CORS, perfil `dev` con token de prueba; `http.js`, proxy de Vite | 12/11 | **Hecho** (commit `9634f5b`) |
| R1 | Proyecto ms-citas en 8082 | 12–13/11 | **Hecho**: arranca con H2 en el PC de Simon |
| R2 | Docker: compose con MySQL 8, Dockerfiles multi-etapa, Nginx | 13/11 | **Hecho** (12/11): los 5 servicios levantan; lo comprueba `scripts\verificar.ps1` |
| R4 | Formato de error: `GlobalExceptionHandler` + 401/403 por el mismo JSON | 15/11 | **Hecho** (12/11): `FormatoErrorTest`, 12 pruebas MockMvc con la seguridad real: 400, 401 (sin token, vencido, inválido, desactivado), 403, 404, 405, 409, 500 y 503 |
| R3 | Modelo y BD (S-30): `EstadoCita`, `Cita`, `HistorialCita`, `Pago`, `Recordatorio`; `database/02_citas.sql` con semillas; `UNIQUE(pago_id)` | 13–15/11 | **Hecho** (12/11): 7 entidades, 4 repositorios, 8 pruebas JUnit; `validate` pasa en MySQL |
| R5 | Reglas en Java (puerto de `utils/citas.js`): transiciones, 24 h, bloques, choques, 60 días, teleconsulta | 16–17/11 | **Hecho** (12/11): `ReglasCita` y `ReglasPago`, 45 pruebas JUnit espejo de las de EP2 (53 en total en ms-citas) |
| R6 | Cliente de ms-clinica (`NUTRIVIDA_CLINICA_URL`) para horario y duración, con simulado | 17/11 | **Hecho** (12/11): HTTP + semillas de respaldo, 21 pruebas JUnit (74 en total). Falta probarlo contra los endpoints reales de Catalina (C-31): `verificar.ps1` revisa su formato apenas existan |
| R7 | API + Swagger (S-31 a S-33): endpoints de `contrato-backend.md` §6, DTOs, `@Valid` | 17–18/11 | **Hecho** (12/11): 13 endpoints en 3 controladores (incluye `/api/disponibilidad/proximas`, decisión 3), `CitaService`, `PagoService` y `DisponibilidadService`; Swagger con ejemplos y códigos de respuesta |
| R8 | Seguridad: `@PreAuthorize` por rol y reglas de dueño con `UsuarioActual` | 19/11 | **Hecho** (12/11): rol en cada endpoint, dueño en los services y cuenta desactivada (decisión 2) con `VerificadorCuenta`. Mientras no esté el login (G-32), los tokens salen del perfil `dev` (plan B) |
| R9 | Frontend modo dual (S-35): adaptadores API de `citasService`/`pagosService`; `Pago.jsx` en una sola llamada; 401 → `/login` | 20–21/11 | **Hecho** (12/11): `citasService` y `pagosService` en modo API con las rutas del contrato §6; `pagarYCrearCita` cobra y crea en una llamada (201 / 402 / 409); `SesionExpirada` lleva a `/login` ante un 401; token del perfil `dev` mientras no hay login (`tokenPuente.js`). 20 pruebas Vitest nuevas (456 en total) y el flujo probado en el navegador contra Docker: Mis citas desde la API y pago con tarjeta 4242 → `C0007` / `P0008` en MySQL |
| R10 | Integración con los 3 servicios + `peticiones.http` + 4 pruebas JUnit/Mockito (transiciones, 24 h, pago doble, 403) | 22/11 | **Hecho** (12/11): `CitaServiceTest` (4 con Mockito), `ApiCitasTest` (16 de integración), `backend/ms-citas/peticiones.http` y 9 peticiones de humo autenticadas en `verificar.ps1` contra MySQL. 150 pruebas JUnit en total. Pendiente: repetirlo con el login real (G-32) y los catálogos de Catalina (C-31) |
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

## Decisiones del equipo (13/11)

1. **Rutas públicas:** se mantienen como están. Son públicos los `GET` de catálogo, disponibilidad y artículos, que usa el sitio público de EP2.
2. **Usuario desactivado:** pierde el acceso al instante, aunque su token siga vigente. En cada petición con token, ms-citas pregunta a ms-usuarios si la cuenta sigue activa (con caché de 30 s) y responde **401** _"Tu cuenta está desactivada. Contacta a la clínica."_. Ver R8.
3. **Agenda rápida del Inicio:** propuesta de Simon, implementada: `GET /api/disponibilidad/proximas?cantidad`. Es una sola llamada en vez de una por nutricionista y día, y la regla (`buscarProximasHorasLibres`) queda junto a la de disponibilidad.
4. **Catálogos de ms-clinica y usuarios de ms-usuarios:** ms-citas se construye con las semillas de EP2 (modo `auto`) sin tocar el código de Catalina ni el de Gabriel.
   - Cuando publiquen sus endpoints, ms-citas los usa solo: `verificar.ps1` avisa si traen el formato esperado.
   - El **503** se agregó a la tabla del contrato §2.3: ms-citas lo usa cuando el dueño de un dato no responde.

## Notas para la defensa

### R3 · Modelo y base de datos

- **Por qué `pago` guarda `paciente_id` y no `cita_id`.** El enlace pago↔cita vive en un solo lugar, `cita.pago_id` (3FN, sin datos repetidos). Pero un pago RECHAZADO no tiene cita, y el pago de una cita cancelada que se elimina tampoco (§6.1). Sin `paciente_id` no se podría saber de quién es el comprobante para la regla "dueño o ADMIN" de `GET /api/pagos/{id}`.
- **Por qué `cita.pago_id` es `NOT NULL UNIQUE`.** `NOT NULL`: toda cita nace de `POST /api/citas`, que cobra primero. `UNIQUE`: es la última barrera contra el pago doble (RN-35). Si dos peticiones usan el mismo pago a la vez, la segunda choca en la base aunque el código fallara, y `GlobalExceptionHandler` la traduce a 409.
- **El candado `agenda_dia`.** Revisar si una hora está libre y luego guardar son dos pasos: dos pacientes podrían ver la misma hora libre y guardar los dos. Antes de revisar, la transacción ejecuta `INSERT … ON DUPLICATE KEY UPDATE` sobre la fila (nutricionista, día), que queda bloqueada hasta el COMMIT. La segunda reserva espera y, cuando entra, ya ve la cita de la primera. Es una sola sentencia porque "insertar si falta y después `SELECT … FOR UPDATE`" toma dos bloqueos y puede terminar en deadlock. Días o nutricionistas distintos no se esperan entre sí.
- **El `contador`.** Los IDs siguen el formato de EP2 (`C0006`). Calcular `MAX(id) + 1` choca si dos citas de nutricionistas distintos se crean a la vez; la fila del contador se lee con `SELECT … FOR UPDATE` y nunca entrega el mismo número dos veces.
- **Los `CHECK`.** Estados válidos, monto positivo, 4 dígitos y motivo de 10 a 300 caracteres también se validan en la base. MySQL 8 sí los aplica, y además impiden renombrar una columna que usan.
- **`ddl-auto=validate` en MySQL.** Las tablas las crea `02_citas.sql`, no Hibernate. Al arrancar, Hibernate compara entidades y tablas y no arranca si no calzan; `verificar.ps1` lo comprueba en cada ítem (probado rompiendo una columna a propósito: lo detecta y nombra la columna).
- **Semillas con fechas relativas.** Las 5 citas de EP2 se cargan con fechas calculadas desde el día de la carga, siempre en un día en que el nutricionista atiende. Así la demo siempre tiene citas pasadas, una para mañana (prueba de las 24 h) y otras para la semana.

### R5 · Reglas de negocio en Java

- **Dónde están.** `service/ReglasCita.java` y `service/ReglasPago.java`: el puerto de `utils/citas.js` y `utils/pagos.js`, con los mismos números de regla (RN-02 a RN-27) y los mismos mensajes, así el usuario ve el mismo texto en modo local y en modo API.
- **Por qué son funciones puras.** No leen la base ni el reloj y no lanzan excepciones: reciben los datos y `ahora`, y responden. El service (R7) las llama y decide el código HTTP. Así cada regla se prueba en milisegundos, sin Spring ni base de datos.
- **Pruebas espejo.** `ReglasCitaTest` y `ReglasPagoTest` repiten los casos de `citas.test.js` y `pagos.test.js` con los mismos horarios (Daniela, Rodrigo, Carolina), fechas y resultados. Si el frontend y el backend se contradijeran, una de las dos suites fallaría.
- **Las 24 h cuentan horas reales.** `puedeCancelar` calcula con la zona `America/Santiago`. El 6/9/2026 Chile adelanta el reloj y ese día dura 23 h: el sábado a las 09:30 el reloj dice que faltan 24 h 30 min para una cita del domingo a las 10:00, pero en realidad faltan 23 h 30 min, y no se puede cancelar. Restar horas del reloj daría lo contrario (hay una prueba para eso). Los 60 días, en cambio, se cuentan en días de calendario.
- **El backend vuelve a validar la tarjeta** (Luhn, vencimiento, CVV) aunque el formulario ya lo hizo, porque desde Swagger o Postman cualquiera puede llamar a `POST /api/citas` sin pasar por la página. De la tarjeta solo se guardan los 4 últimos dígitos, y `Tarjeta.toString()` oculta el número por si alguien la imprime en un log.
- **Qué permite cada rol** (RN-24 a RN-26) está en una tabla, `rolPuedeCambiarA`. Un rol desconocido o ausente no puede nada: la prueba encontró que sin un chequeo explícito un token sin rol habría dado 500 en vez de 403, y se corrigió.
- **No se portó** lo que es solo de pantalla (`armarAgenda`, `separarProximasEHistorial`, `primerPasoIncompleto`, acciones de botones). `buscarProximasHorasLibres` sí se portó después, con R7, cuando el equipo aprobó su endpoint (decisión 3).

### R6 · Cliente de ms-clinica

- **Por qué ms-citas pregunta y no copia.** El horario del nutricionista y el precio, la duración y la modalidad del servicio son de ms-clinica (Catalina). Si ms-citas guardara una copia, un cambio de precio en ms-clinica dejaría a ms-citas cobrando el precio viejo. Por eso no hay tablas de nutricionistas ni de servicios en `nutrivida_citas`: se piden por REST cada vez.
- **Una interfaz, tres implementaciones** (`client/`). Los services de R7 usan `ClinicaClient` y no saben cuál les tocó. `ClinicaConfig` la elige con `NUTRIVIDA_CLINICA_MODO`:
  - **`ClinicaHttp`** usa `RestClient` contra `NUTRIVIDA_CLINICA_URL`.
  - **`ClinicaSimulada`** tiene las semillas de EP2.
  - **`ClinicaConRespaldo`** (modo `auto`) prueba primero con ms-clinica y usa las semillas solo si no responde.
- **Por qué `auto` por defecto.** Los endpoints de Catalina (C-31) todavía no existen, y sin respaldo ms-citas no podría agendar nada. Con `auto`, ms-citas empieza a usar los datos reales apenas Catalina los publique, sin tocar código. Para el video se usa `http`, así se ve que los datos vienen de verdad de ms-clinica.
- **Cuándo se usan las semillas y cuándo no.** Se usan cuando ms-clinica no está: sin conexión, más de 3 s sin responder, un 5xx o un 404 en la lista, que significa que el endpoint aún no existe. **No** se usan cuando ms-clinica responde algo que no calza: un 401, un JSON paginado o un horario sin días. Eso es un error del contrato, y esconderlo con las semillas haría agendar con datos falsos sin que nadie lo note, así que sale como **503** con el JSON común.
- **Por qué listas y no `/{id}`.** El catálogo es chico (4 nutricionistas y 18 servicios) y se trae en una llamada. La regla de teleconsulta (RN-16) necesita todos los servicios, y las estadísticas todos los nutricionistas. Además, un 404 de `/api/nutricionistas/NUT009` podría ser "ese id no existe" o "el endpoint no existe"; en una lista solo puede ser lo segundo.
- **Se revisa lo que llega.** `ClinicaHttp` revisa cada horario (días 0-6, inicio antes del fin) y cada servicio (precio positivo, modalidad). Si un horario viniera sin días, el error saldría con nombre y apellido ("NUT001 viene sin dias…") y no como un 500 dentro de `ReglasCita`.
- **Tiempo máximo de 3 s.** Si ms-clinica se cuelga, la reserva no se cuelga con él. Hay una prueba con un servidor que tarda 1,5 s y un límite de 300 ms.
- **Token.** Hoy el catálogo es público (contrato §3), pero ms-citas reenvía el token del usuario por si el equipo decide exigirlo (pendiente 1).
- **Pruebas.** `ClinicaHttpTest` levanta un ms-clinica falso, un servidor HTTP real del JDK, y prueba lo que viaja por la red: JSON con campos de más, 404, 500, servicio apagado, tiempo agotado, 401, JSON que no calza y reenvío del token. `verificar.ps1` muestra con qué modo arrancó ms-citas y, apenas existan los endpoints de Catalina, revisa que traigan los campos que ms-citas usa.

### R4 · Formato de error común

- **Un solo lugar arma el JSON**, `GlobalExceptionHandler`. Los services lanzan `ApiException` con su código, y ningún controlador arma errores a mano.
- **Los 401 y 403 nacen antes del controlador**, en los filtros de Spring Security, donde `@RestControllerAdvice` no llega. `ManejadorErroresSeguridad` se los reenvía para que salgan con el mismo formato. El 503 de ms-usuarios también nace en el filtro (`JwtFiltro`) y sigue el mismo camino.
- **Qué prueba `FormatoErrorTest`.** Cada código del contrato §2.3 trae `timestamp` ISO, `status`, `error`, `mensaje` y `ruta`, y `errores` solo cuando hay campos. Corre con la seguridad real: `MockMvc` sobre el contexto completo con `springSecurity()`, no con la seguridad desactivada.
  - El **401** tiene tres mensajes distintos: sin token, token vencido (firmado con el mismo secreto, 9 h atrás) y firma inválida. Más un cuarto: cuenta desactivada con el token aún vigente.
  - El **500** no muestra el detalle técnico. La prueba fuerza un `IllegalStateException` y revisa que el mensaje sea el genérico.
- ms-usuarios y ms-clinica son mocks en esta prueba (`@MockitoBean`, `@MockitoSpyBean`). Así se fuerzan el 503 y el 500 sin apagar servicios.

### R7 · API de ms-citas

- **13 endpoints en 3 controladores** (`CitaController`, `PagoController`, `DisponibilidadController`), uno por fila del contrato §6. Los controladores no deciden nada: reciben, validan la forma con `@Valid` y llaman al service.
- **`POST /api/citas` en una transacción** (decisión 6). El orden importa:
  1. Se valida todo lo que no toca la base: servicio activo, nutricionista, motivo, fecha y tarjeta.
  2. Se revisa la teleconsulta.
  3. Se toma el candado `agenda_dia` y se revisa que la hora siga libre.
  4. Recién entonces se cobra.

  Así, una hora tomada no cobra nada, y no queda un pago aprobado sin cita. Si el banco rechaza, el pago RECHAZADO se guarda (`noRollbackFor`) y la respuesta es **402**.
- **Lo que se ofrece es lo que se acepta.** `GET /api/disponibilidad` y la validación de `POST /api/citas` usan la misma función, `ReglasCita.horariosDisponibles`. No puede pasar que el asistente ofrezca una hora y la reserva la rechace.
- **El paciente sale del token**, no del cuerpo. Nadie puede agendar a nombre de otro, aunque arme la petición a mano en Swagger.
- **Cambios de estado con la cita bloqueada** (`SELECT … FOR UPDATE`). Si la secretaria confirma mientras el paciente cancela, la segunda petición espera y ve el estado que dejó la primera. Al cancelar, el reembolso va en la misma transacción (RN-08).
- **Las entidades nunca salen por la API.** `CitaRespuesta` y `PagoRespuesta` tienen exactamente los campos de EP2 (`hora` como `"HH:mm"`, historial con `de`, `a` y `por`), así el frontend no cambia entre modo local y modo API.
- **`/api/disponibilidad/proximas`** (decisión 3) recorre hasta 14 días y entrega entre 1 y 20 horas. Una llamada reemplaza a las 4 × 14 que haría el frontend preguntando por cada nutricionista y día.

### R8 · Roles, dueño y cuenta desactivada

- **Dos capas.** El rol va en el controlador con `@PreAuthorize("hasRole('PACIENTE')")`, a la vista junto al endpoint. Lo que depende del dato va en el service con `UsuarioActual`:
  - El paciente solo ve y cambia sus citas: "Esa cita no es tuya.".
  - El nutricionista, solo las de su agenda: "Esa cita no está en tu agenda.".
  - Qué estado puede poner cada rol (RN-24 a RN-26).
  - La regla de 24 h, que es solo para el paciente.
- **El comprobante** lo ve quien pagó o el admin. Por eso `pago` guarda `paciente_id` (ver R3).
- **Cuenta desactivada (decisión 2).** Un JWT vale 8 h por sí solo: sin revisar, un usuario desactivado seguiría entrando hasta que el token venza. `JwtFiltro` pregunta a ms-usuarios (`GET /api/usuarios/{id}`, con el token del propio usuario) y responde **401** _"Tu cuenta está desactivada. Contacta a la clínica."_.
- **Por qué 30 s de memoria.** Una página hace varias peticiones seguidas: sin memoria, cada una consultaría a ms-usuarios. Con 30 s por usuario, la cuenta pierde el acceso a más tardar 30 s después de desactivarla, contra 8 h sin la revisión.
- **Mismos tres modos que ms-clinica** (`NUTRIVIDA_USUARIOS_MODO`). `GET /api/usuarios/{id}` todavía no existe (G-32), y ms-usuarios responde 404 _"La ruta solicitada no existe."_. En modo `auto`, ms-citas lo reconoce y usa las semillas de EP2, con las 9 cuentas activas. Un usuario que no está en las semillas (un paciente recién registrado) no se bloquea. Un 401 o un 404 del usuario sí significa que ms-usuarios no reconoce la cuenta.
- **Si ms-usuarios no responde en modo `http`**, la respuesta es **503** con el JSON común, no un 500. El filtro le pasa el error a `GlobalExceptionHandler`, igual que los 401 y 403.
- **Plan B mientras no hay login.** El perfil `dev` agrega `POST /api/dev/token` y está activo por defecto en `docker-compose.yml` (`MS_CITAS_PERFILES=mysql,dev`). **Para el video y la entrega se apaga** con `MS_CITAS_PERFILES=mysql` en `.env`; `verificar.ps1` muestra si quedó activo.

### R10 · Integración y pruebas de la API

- **Cuatro niveles de prueba, de más rápido a más real:**
  1. `ReglasCitaTest` y `ReglasPagoTest` (R5): funciones puras, con PIT.
  2. `CitaServiceTest`: el service con Mockito. Repositorios y usuario del token son mocks, sin Spring ni base. Las 4 pruebas del plan: transición no permitida, 24 h, pago (rechazado sin cita y hora tomada sin cobro) y 403 de dueño.
  3. `ApiCitasTest`: la API completa sobre H2 con JWT reales, `@PreAuthorize` y las semillas de ms-clinica y ms-usuarios. 16 recorridos: crear, 409, 402, 400, teleconsulta, cada rol con lo suyo, dueño, ciclo de vida, cancelar → reembolso → eliminar, 24 h justas, reprogramar, disponibilidad y estadísticas.
  4. `verificar.ps1 -Solo docker`: 9 peticiones contra los contenedores reales con MySQL y Nginx. Crea una cita, repite la hora (409), paga con la tarjeta rechazada (402), pide la cita como otro paciente (403) y como secretaria por el proxy, la cancela (reembolso) y la elimina.
- **Reloj fijo.** Las pruebas de la API corren "el lunes 16/11/2026 a las 08:00" (`ApoyoApi`): "mañana a las 08:00" está a 24 h justas, el borde exacto de RN-06. Por eso `CitaService` lee la hora de un `Clock` y no de `LocalDateTime.now()`.
- **"Pago doble"** ya no puede ocurrir como en EP2, porque el pago y la cita nacen en la misma petición. La prueba revisa los dos casos que quedan: un rechazo guarda el pago sin cita, y una hora tomada se rechaza antes de cobrar.
- **`peticiones.http`** recorre el contrato §6 en orden, para la extensión REST Client de VS Code: tokens, disponibilidad, crear, 409, 402, 400, 403, consultas por rol, estados, reprogramar, 24 h, eliminar y estadísticas. Sirve de guion para la parte de Swagger del video.

### R9 · Frontend en modo dual

- **Las páginas no cambian, cambian los services.** `citasService.js` y `pagosService.js` tienen las mismas funciones que en EP2. Con `VITE_API_MODE=api` cada una llama a su ruta del contrato §6; con `local` siguen usando `localStorage`. Por eso las 436 pruebas de Vitest anteriores siguen pasando sin tocarlas.
- **Cada rol lista por su ruta.** `listarCitas` va a `/api/citas/mias` (paciente), `/api/citas/agenda` (nutricionista) o `/api/citas` (secretaria y admin), y después aplica los mismos filtros de pantalla que en modo local.
- **`Pago.jsx` en una sola llamada** (decisión 6). En modo local paga y después crea la cita, en dos pasos. En modo API llama a `pagarYCrearCita`, que hace un solo `POST /api/citas`:
  - 201 → pantalla de éxito, y la reserva se borra.
  - 402 → pantalla de pago rechazado con el motivo del backend; la reserva se conserva para reintentar.
  - Un error de la tarjeta → bajo su campo. Uno de la hora (409) → arriba del formulario, aclarando que no hubo cobro.
- **401 → `/login`.** `apiFetch` avisa con un evento y `SesionExpirada` (en `App.jsx`) lleva al login recordando la página de origen y el mensaje, por ejemplo _"Tu cuenta está desactivada."_.
- **Plan B del token** (`tokenPuente.js`). Mientras el login de Gabriel (G-32) no exista, la sesión de EP2 se cambia por un token del perfil `dev` de ms-citas, con el mismo `JWT_SECRET`. Si el token guardado es de otro usuario, pide uno nuevo. Sin el perfil (como en la entrega), `/api/dev/token` da 404 y no se inventa nada. Cuando exista el login, este archivo se borra.
- **Un error que solo apareció en el navegador.** Las peticiones de humo de `verificar.ps1` pasaban, pero desde el navegador todo `POST` por Nginx daba 403. El navegador manda `Origin: http://localhost:8080`, y Nginx reenviaba `Host: localhost` sin el puerto, así que Spring creía que era otro sitio y lo rechazaba por CORS. Se corrigió con `proxy_set_header Host $http_host`, y `verificar.ps1` ahora repite un `POST` con `Origin` por el proxy para que no vuelva.

### Pruebas mutantes (PIT)

- **Qué son.** La cobertura dice qué líneas se ejecutaron, no si alguna prueba revisa el resultado. PIT cambia el código compilado de a un detalle por vez (`>` por `>=`, `+` por `-`, `true` por `false`, quita un `if`) y corre las pruebas con cada cambio, llamado *mutante*. Si alguna prueba falla, el mutante está *muerto*. Si todas pasan, sobrevive: hay un error posible que ninguna prueba detectaría.
- **Qué encontró.** Con 98 % de líneas cubiertas, la primera pasada mató el 92 %. Los mutantes que sobrevivieron mostraron pruebas que faltaban:
  - Luhn nunca se había probado con un dígito que al duplicarse pasa de 9: las tarjetas `4242…` no lo ejercitan.
  - Nadie probaba una jornada con medias horas. Cambiar `h*60 + m` por `h*60 - m` pasaba todas las pruebas.
  - Faltaba una cita *antes* del período en las estadísticas.
  - Faltaba el choque con una hora contigua libre.
  - Faltaban los mensajes de CVV, vencimiento y titular vacíos o cortos.

  Se agregaron 29 pruebas (103 en total), entre ellas los bordes exactos de 24 h y 60 días y el cambio de horario de abril, que es el caso inverso al de septiembre.
- **También simplificó el código.** PIT mostró condiciones que no cambiaban nada, y se quitaron:
  - `nuevo != null` en `puedeTransicionar`.
  - El `if` de `ultimos4`.
  - La constante `ESTADOS_QUE_OCUPAN`, que repetía `EstadoCita.ocupaAgenda()` sin que nadie la usara.
- **Los 2 sobrevivientes son equivalentes:** cambian el código pero no el resultado, así que ninguna prueba puede matarlos. Los dos están en `pasaLuhn`:
  - `d > 9` → `d >= 9` da lo mismo, porque un dígito duplicado es par y nunca vale 9.
  - `suma += d` → `suma -= d` da lo mismo, porque −x es múltiplo de 10 exactamente cuando x lo es.

  `verificar.ps1` los acepta por nombre y falla con cualquier otro. Se probó quitando una prueba: el paso da FALLA y nombra los mutantes vivos.
- **Atrapó una función sin pruebas.** `buscarProximasHorasLibres` se agregó con R7 (decisión 3) y solo la probaban las pruebas de la API. La verificación completa dio FALLA: 10 mutantes de esa función sin cobertura. Se agregaron sus 6 pruebas espejo de `citas.test.js` (156 JUnit en total). También se reescribió con un stream: la condición `encontradas.size() < cantidad` del bucle solo ahorraba trabajo y habría dejado un mutante equivalente más. Ahora son 252 mutantes, 250 muertos.
- **Por qué solo la lógica de cálculo.** Ahí un `>=` mal puesto cuesta caro: una cita cancelable con 23 h o un cobro mal validado. Los controladores y repositorios se prueban mejor con pruebas de integración (R10); mutar getters o el arranque de Spring solo agregaría ruido.
- **Cómo correrlo:** `.\scripts\verificar.ps1 -Solo mutantes` (cerca de 1 min). El reporte queda en `backend/ms-citas/target/pit-reports/index.html`, con cada línea en verde o rojo.

## Cambios respecto del plan semestral

- S-32: `POST /api/pagos` se integra en `POST /api/citas`.
- S-34 (recordatorio) pasa a "si sobra tiempo"; S-36 se reduce a 4 pruebas clave.
- El video se adelanta al 23/11.
- Se agregan: formato de error común, modo dual, `DELETE` de canceladas, Docker completo con Nginx.
