# Integración EP3: services listos para Spring Boot y foto de nutricionistas

Rama: `ep3/services-foto`. Autor de los cambios: Simon. Base: tag `ep2-entrega`.

El objetivo es que, al pasar a los microservicios, **solo cambie el interior de los services** (de `data/` a `fetch`). Las páginas y los componentes no deberían cambiar. Para eso, en esta rama los services ya se comportan como lo harán los endpoints: validan, revisan permisos y lanzan errores con el código HTTP que devolverá cada microservicio.

> **Actualización del 12-11-2026.** El contrato definitivo del backend está en [`ep3/contrato-backend.md`](ep3/contrato-backend.md). Reemplaza a este documento en dos puntos: el **formato de error** (ahora `timestamp`, `status`, `error`, `mensaje`, `ruta` y `errores`) y las **rutas de los endpoints** (ahora siguen el plan semestral, por ejemplo `/api/disponibilidad`, `/api/citas/mias`, `PATCH /api/citas/{id}/reprogramar` y `/api/pacientes`). También cambia el flujo del pago: ahora se hace en un solo endpoint, `POST /api/citas`. Las secciones 1 y 2 de este documento quedan como registro de la preparación de EP2.

## 1. Contrato común de los services

| Regla                      | Detalle                                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Todo es `async`            | Todas las funciones exportadas de `services/` devuelven una promesa.                                                                                                                                                                             |
| `obtener…` devuelve `null` | Si no existe, `null` (el cliente HTTP traducirá el 404 a `null`).                                                                                                                                                                                |
| `listar…` devuelve `[]`    | Nunca `null`.                                                                                                                                                                                                                                    |
| Errores tipados            | Se lanza un `ErrorApi` (`utils/errores.js`) con `estado`, `codigo`, `message` y, según el caso, `campo` o `errores`. La UI no cambió: sigue leyendo `error.message`, `error.campo` y `error.errores`.                                            |
| Sin datos sensibles        | `usuariosService` nunca devuelve `clave`. La tarjeta se valida en `pagosService` y solo se guardan los 4 últimos dígitos.                                                                                                                        |
| La UI no lee `data/`       | Antes, Consejos y ConsejoDetalle leían la semilla de artículos directamente. Ahora pasan por `articulosService`. Las únicas excepciones son `reservaData` (estado de la pestaña, se queda en el navegador) e `infoClinica` (configuración fija). |

### Cuerpo de error acordado para el `@RestControllerAdvice`

```json
{
  "estado": 409,
  "codigo": "CONFLICTO",
  "mensaje": "Ya existe un usuario con ese correo.",
  "errores": { "correo": "Ya existe un usuario con ese correo." }
}
```

| `codigo`            | HTTP | Cuándo                                                                                         |
| ------------------- | ---- | ---------------------------------------------------------------------------------------------- |
| `VALIDACION`        | 400  | Datos con formato o rango inválido.                                                            |
| `NO_AUTENTICADO`    | 401  | Sin sesión (sin JWT válido).                                                                   |
| `PROHIBIDO`         | 403  | El rol o el dueño no corresponde.                                                              |
| `NO_ENCONTRADO`     | 404  | El recurso no existe.                                                                          |
| `CONFLICTO`         | 409  | Choca con el estado actual: horario tomado, transición no permitida, duplicado, regla de 24 h. |
| `MUY_GRANDE`        | 413  | Foto de más de 2 MB.                                                                           |
| `TIPO_NO_SOPORTADO` | 415  | Foto que no es JPG, PNG ni WebP.                                                               |

`ErrorApi#aCuerpo()` arma ese JSON. `desdeRespuesta(cuerpo, estado)` hace lo contrario: reconstruye el error en el cliente HTTP de EP3.

## 2. Mapa de services a endpoints

En EP2 el actor sale de la sesión (`obtenerSesion`), o del `usuarioId` que entrega la página en el módulo de citas. En EP3 sale del JWT y no lo envía el frontend.

### ms-usuarios (8081): `usuariosService`, `articulosService`

| Función                                     | Endpoint                                        | Permiso                                                                                           |
| ------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `listarUsuarios(filtros)`                   | `GET /api/usuarios?rol&activo&texto`            | Personal de la clínica                                                                            |
| `obtenerUsuario(id)`                        | `GET /api/usuarios/{id}`                        | Personal de la clínica o el propio usuario                                                        |
| `crearUsuario(datos)`                       | `POST /api/usuarios`                            | ADMIN                                                                                             |
| `actualizarUsuario(id, cambios)`            | `PATCH /api/usuarios/{id}`                      | ADMIN (todo, salvo su propio rol y estado) o el propio usuario (solo nombre, apellido y teléfono) |
| `cambiarEstado(id, activo)`                 | `PATCH /api/usuarios/{id}/estado`               | ADMIN, nunca sobre sí mismo                                                                       |
| `cambiarRol(id, rol)`                       | `PATCH /api/usuarios/{id}/rol`                  | ADMIN, nunca sobre sí mismo                                                                       |
| `registrarPaciente(datos)`                  | `POST /api/auth/registro`                       | Público                                                                                           |
| `cambiarClave(id, actual, nueva)`           | `PUT /api/usuarios/{id}/clave`                  | Solo el propio usuario                                                                            |
| `listarArticulos()` / `obtenerArticulo(id)` | `GET /api/articulos`, `GET /api/articulos/{id}` | Público                                                                                           |

### ms-citas (8082): `citasService`, `pagosService`

| Función                                           | Endpoint                                                       | Permiso y reglas                                                                                                                                                                                                         |
| ------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `listarCitas(filtros)`                            | `GET /api/citas?pacienteId&nutricionistaId&estado&desde&hasta` | Según el rol                                                                                                                                                                                                             |
| `obtenerCita(id)`                                 | `GET /api/citas/{id}`                                          |                                                                                                                                                                                                                          |
| `crearCita(datos)`                                | `POST /api/citas`                                              | PACIENTE activo. Pago APROBADO por el precio exacto y sin cita, hora disponible, RN-16                                                                                                                                   |
| `cambiarEstado(id, estado)`                       | `PATCH /api/citas/{id}/estado`                                 | PACIENTE: solo CANCELADA, solo sus citas y con más de 24 h. NUTRICIONISTA: ATENDIDA o INASISTENCIA en su agenda. SECRETARIA: CONFIRMADA, CANCELADA o INASISTENCIA. ADMIN: todas. Al cancelar, el pago pasa a REEMBOLSADO |
| `reprogramarCita(id, fecha, hora)`                | `PATCH /api/citas/{id}/horario`                                | PACIENTE (las suyas, con más de 24 h), SECRETARIA o ADMIN                                                                                                                                                                |
| `horariosDisponibles(nutId, fecha, dur, excluir)` | `GET /api/agenda/{nutId}/disponibles?fecha&duracion&excluir`   | Público                                                                                                                                                                                                                  |
| `proximasHorasLibres(n)`                          | `GET /api/agenda/proximas?cantidad=n`                          | Público                                                                                                                                                                                                                  |
| `puedeAgendarTeleconsulta(pacienteId)`            | `GET /api/citas/teleconsulta/habilitada?pacienteId`            |                                                                                                                                                                                                                          |
| `estadisticas(desde, hasta)`                      | `GET /api/citas/estadisticas?desde&hasta`                      | ADMIN                                                                                                                                                                                                                    |
| `procesarPago(datos)`                             | `POST /api/pagos`                                              | PACIENTE                                                                                                                                                                                                                 |
| `reembolsarPagoSinCita(id)`                       | `POST /api/pagos/{id}/reembolso`                               | Dueño del pago                                                                                                                                                                                                           |
| `obtenerPago(id)` / `listarPagos({citaIds})`      | `GET /api/pagos/{id}`, `GET /api/pagos?citaIds`                | ADMIN o dueño                                                                                                                                                                                                            |

### ms-clinica (8083): `serviciosService`, `fichasService`

| Función                                                          | Endpoint                                                                                       | Permiso                                                                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `listarServicios(filtros)` / `obtenerServicio(codigo)`           | `GET /api/servicios`, `GET /api/servicios/{codigo}`                                            | Público                                                                                       |
| `crearServicio` / `actualizarServicio` / `cambiarEstadoServicio` | `POST /api/servicios`, `PATCH /api/servicios/{codigo}`, `PATCH /api/servicios/{codigo}/estado` | ADMIN                                                                                         |
| `listarNutricionistas()` / `obtenerNutricionista(id)`            | `GET /api/nutricionistas`, `GET /api/nutricionistas/{id}`                                      | Público. Incluye `fotoUrl`                                                                    |
| `actualizarFotoNutricionista(id, archivo)`                       | `PUT /api/nutricionistas/{id}/foto` (multipart, parte `foto`)                                  | ADMIN o el propio nutricionista. 2 MB máx.; JPG, PNG o WebP                                   |
| `eliminarFotoNutricionista(id)`                                  | `DELETE /api/nutricionistas/{id}/foto`                                                         | ADMIN o el propio nutricionista                                                               |
| `registrarContacto(datos)` / `listarContactos()`                 | `POST /api/contactos`, `GET /api/contactos`                                                    | Público / ADMIN                                                                               |
| `listarPacientes(nutId)`                                         | `GET /api/fichas?nutricionistaId`                                                              | El propio NUTRICIONISTA o ADMIN                                                               |
| `obtenerFicha(pacienteId)`                                       | `GET /api/fichas/{pacienteId}`                                                                 | A cargo, ADMIN o el propio paciente. Otro nutricionista recibe solo `{ id, nutricionistaId }` |
| `crearFicha(datos)`                                              | `POST /api/fichas`                                                                             | NUTRICIONISTA, a su propio nombre                                                             |
| `listarMediciones` / `obtenerPlan`                               | `GET /api/fichas/{pacienteId}/mediciones`, `GET /api/fichas/{pacienteId}/plan`                 | A cargo, ADMIN o el propio paciente                                                           |
| `registrarMedicion` / `guardarPlan`                              | `POST …/mediciones`, `PUT …/plan`                                                              | Solo el nutricionista a cargo                                                                 |

## 2b. Integridad: qué es síncrono y qué no

La API de los services es `async` porque en EP3 cada llamada viaja por HTTP (`fetch` no tiene versión síncrona). La integridad no depende de eso: depende de que **revisar la regla y escribir ocurran en un solo paso indivisible**.

| Capa                        | Síncrona     | Por qué                                                                                                                                                                                                                  |
| --------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `utils/` (reglas RN-xx)     | Sí           | Funciones puras: misma entrada, mismo resultado. Se reutilizan en Java tal cual.                                                                                                                                         |
| `data/` (escritura)         | Sí           | Cada `crear`/`cambiarEstado`/`reprogramar` vuelve a validar (choque de horario, transición, duplicados) y escribe sin `await` en medio.                                                                                  |
| Sección crítica del service | Sí           | Después del último `await`, se relee y se revisa antes de escribir. Ejemplo: `crearCita` relee el pago y `citasData.crear` repite el choque de horario. `cambiarEstado` (cancelar y reembolsar) no tiene ningún `await`. |
| Firma del service           | No (`async`) | En EP3 es un endpoint.                                                                                                                                                                                                   |

**En EP3, cada sección crítica es un `@Transactional` en el microservicio**, con restricciones en la base de datos que actúan de última barrera:

- `crearCita`: una transacción que valida el pago, inserta la cita y enlaza el pago. Lleva `UNIQUE (pago_id)` en `cita` y bloqueo `SELECT … FOR UPDATE` sobre la agenda del nutricionista para ese día.
- `cambiarEstado` en CANCELADA: la cita y el reembolso del pago, en la misma transacción.
- `reprogramarCita`: revalida el estado y el horario dentro de la transacción.
- Usuarios: `UNIQUE (correo)`, `UNIQUE (rut)`, `UNIQUE (nutricionista_id)`.

**Pendiente: pago y cita en dos llamadas.** Hoy la página Pago llama a `procesarPago` y luego a `crearCita`, y compensa con un reembolso si la segunda falla. Si el navegador se cierra entre ambas, queda un pago aprobado sin cita. En EP3 conviene un solo endpoint, `POST /api/citas` con los datos de la tarjeta: ms-citas cobra, crea la cita y enlaza el pago en una sola transacción.

## 3. Foto de perfil de los nutricionistas

- **Datos:** los nutricionistas pasan de una semilla fija a `nv_nutricionistas` (`data/nutricionistasData.js`), con el campo `fotoUrl` (`null` si no hay foto).
- **Reglas** (`utils/fotos.js`): JPG, PNG o WebP de hasta 2 MB. Antes de guardarla, el navegador la reduce a 320 px como máximo para no llenar el `localStorage`. Si no se puede guardar, el error es 413.
- **Quién la cambia:** el propio nutricionista, en Mi perfil, y el administrador, en Editar usuario. Solo la foto: correo y teléfono no son parte de la ficha pública.
- **Dónde se ve:** en Nosotros (`TarjetaNutricionista`), en el paso 2 de Solicitar cita y en los editores. Sin foto se muestran las iniciales (`FotoNutricionista`).
- **EP3:** la columna `foto_url`, o un almacenamiento de archivos, en `nutricionista` de ms-clinica, con `spring.servlet.multipart.max-file-size=2MB`.

## 4. Cambios en archivos de otro integrante

Cada dueño debe revisar su fila para poder explicarla en la defensa.

| Archivo                                                          | Dueño    | Qué cambió                                                                                                                                                                                                              | Por qué                                                                                             |
| ---------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `data/almacen.js`                                                | Gabriel  | `leer` vuelve a la semilla si el JSON guardado está dañado.                                                                                                                                                             | Antes, un `localStorage` dañado rompía toda la app.                                                 |
| `data/usuariosData.js`                                           | Gabriel  | Usa `errorDeCampo` y `errorConflicto` comunes (409 en correo, RUT o vínculo duplicado; 404 si no existe). Se mantiene el re-export de `errorDeCampo`.                                                                   | Contrato de errores.                                                                                |
| `services/usuariosService.js`                                    | Gabriel  | Exige sesión. Solo el ADMIN crea usuarios, cambia estado o cambia rol. Cada uno edita solo nombre, apellido y teléfono de su propia cuenta. `clave` se descarta en `actualizarUsuario`. Solo uno mismo cambia su clave. | Antes cualquiera podía llamar al service y cambiar cualquier dato, incluida la clave sin la actual. |
| `pages/acceso/Perfil.jsx`                                        | Gabriel  | Para un nutricionista, agrega la tarjeta "Foto de perfil".                                                                                                                                                              | Nueva función.                                                                                      |
| `pages/acceso/admin/UsuarioFormulario.jsx`                       | Gabriel  | Al editar un nutricionista, agrega el editor de su foto.                                                                                                                                                                | Nueva función.                                                                                      |
| `pages/contenido/Consejos.jsx`, `ConsejoDetalle.jsx` (+ test)    | Gabriel  | Leen con `articulosService` (async), no desde la semilla. El test espera con `findBy`.                                                                                                                                  | La UI no debe depender de `data/`.                                                                  |
| `services/serviciosService.js`                                   | Catalina | Nutricionistas desde `nutricionistasData`. Foto (`actualizarFotoNutricionista`, `eliminarFotoNutricionista`). Crear, editar o desactivar servicios y `listarContactos` exigen ADMIN.                                    | Foto y permisos.                                                                                    |
| `services/fichasService.js`                                      | Catalina | Reglas de acceso a la ficha (sección 2). `registrarMedicion` y `guardarPlan` usan el nutricionista de la sesión.                                                                                                        | Antes, cualquier sesión podía leer o escribir cualquier ficha llamando al service.                  |
| `data/serviciosData.js`, `data/fichasData.js`                    | Catalina | Errores tipados (404, 409, 400 con `errores`).                                                                                                                                                                          | Contrato de errores.                                                                                |
| `data/semillas/nutricionistas.js`                                | Catalina | `fotoUrl: null` en cada nutricionista.                                                                                                                                                                                  | Foto.                                                                                               |
| `components/clinica/TarjetaNutricionista.jsx` (+ test)           | Catalina | Muestra la foto o las iniciales.                                                                                                                                                                                        | Foto.                                                                                               |
| Tests `AdminServicios`, `ServicioFormulario`, `serviciosService` | Catalina | Inician sesión como admin en `beforeEach`.                                                                                                                                                                              | Ahora el service exige ADMIN.                                                                       |
| Tests `DetalleServicio`, `Planes`                                | Catalina | Desactivan el servicio de prueba con `serviciosData.cambiarEstado` (preparación de datos).                                                                                                                              | La preparación no debe depender del permiso del service.                                            |
| `.gitignore` (raíz)                                              | Gabriel  | `*.md` ya no ignora `documentacion/**` ni los `README.md`.                                                                                                                                                              | Antes, cualquier documento nuevo quedaba fuera del repo sin aviso.                                  |

### Archivos nuevos

- `utils/errores.js` (+ test)
- `utils/fotos.js` (+ test)
- `services/actor.js`
- `services/articulosService.js`
- `data/nutricionistasData.js`
- `components/clinica/FotoNutricionista.jsx`
- `components/clinica/EditorFotoNutricionista.jsx` (+ test)
- `services/fichasService.test.js`

### Archivos propios (Simon) modificados

- `services/citasService.js`: permisos por rol y regla de 24 h en el service (RN-06, RN-24 a RN-26); errores tipados; `crearCita` exige un paciente activo y relee el pago justo antes de escribir (sección crítica).
- `services/pagosService.js`, `data/citasData.js` y `data/pagosData.js`: errores tipados.
- `pages/citas/SolicitarCita.jsx`: foto en el paso 2.
- `services/citasService.test.js`: la reprogramación con el reloj de 2030 la hace la secretaria (U002), porque con la regla de 24 h ya no puede hacerla el paciente. Se agregaron pruebas de permisos.

## 5. Pendiente para EP3 (decisiones del equipo)

1. **`auth.js` es síncrono.** `iniciarSesion` compara la clave en el navegador. En EP3 pasa a `POST /api/auth/login` (async, BCrypt + JWT) y `obtenerSesion` solo lee el token guardado. Afecta a Login y a unas 40 llamadas en las pruebas, por eso no se cambió en esta rama.
2. **Cliente HTTP:** crear `services/http.js` con `fetch`, base URL desde `import.meta.env.VITE_API_URL`, `Authorization: Bearer`, 404 → `null` en `obtener…` y el resto de los errores con `desdeRespuesta`.
3. **Crear fichas:** hoy cualquier nutricionista puede crear la ficha de un paciente que no tiene una. Falta decidir si debe exigir una cita previa con ese paciente.
4. **`procesarPago`** no recibe actor. En EP3 el endpoint debe exigir rol PACIENTE.

## 6. Verificación

Antes de unir, ejecutar en `frontend/`:

- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npx prettier --check .`
- [ ] `npm run build`
- [ ] Recorrido manual:
  - Nutricionista: sube su foto, la ve en Nosotros y al agendar, y la quita.
  - Admin: cambia la foto de otro nutricionista.
  - Paciente: no puede cancelar con menos de 24 h.

## 7. Integración de ms-citas (Simon, rama `ep3/simon-citas`)

Estado al 12-11-2026. El módulo de citas funciona de punta a punta: **React → Nginx → ms-citas → MySQL**. ms-citas consulta además a ms-clinica y a ms-usuarios. El detalle de cada ítem y las razones para la defensa están en [`ep3/roadmap-simon.md`](ep3/roadmap-simon.md).

### 7.1 Recorrido de una petición

```text
Navegador ── :8080 ──► Nginx (frontend) ── /api/citas, /api/pagos, /api/disponibilidad ──► ms-citas :8082 ──► MySQL nutrivida_citas
                                                                                          ├─► ms-clinica :8083  (servicios y horarios)
                                                                                          └─► ms-usuarios :8081 (¿la cuenta sigue activa?)
```

- El navegador habla solo con `:8080`. Nginx reparte por prefijo, con la misma tabla que `vite.config.js`, así no hay CORS entre puertos.
- ms-citas valida el JWT por su cuenta (mismo `JWT_SECRET`). No le pregunta a ms-usuarios quién es el usuario: eso viene en el token. Solo le pregunta si la cuenta sigue activa, con 30 s de memoria (decisión 2 del equipo).
- ms-citas no guarda copia del catálogo. El precio, la duración y la modalidad de cada servicio y el horario de cada nutricionista se piden a ms-clinica en cada reserva.

### 7.2 Services del frontend y endpoints (reemplaza la tabla de ms-citas de la sección 2)

Con `VITE_API_MODE=api` cada función llama a su endpoint. Con `local`, o sin la variable (como en Vitest), usa los datos de EP2. Las firmas no cambiaron, así que las páginas tampoco.

| Función                                          | Endpoint                                                      | Quién                                   |
| ------------------------------------------------ | ------------------------------------------------------------- | --------------------------------------- |
| `listarCitas(filtros)`                           | `GET /api/citas/mias` · `/api/citas/agenda` · `/api/citas`    | Según el rol de la sesión               |
| `obtenerCita(id)`                                | `GET /api/citas/{id}` (404 → `null`)                          | Dueño, SECRETARIA, ADMIN                |
| `pagarYCrearCita({ reserva, tarjeta })` (nueva)  | `POST /api/citas` → 201 · 402 · 409                           | PACIENTE                                |
| `cambiarEstado(id, estado)`                      | `PATCH /api/citas/{id}/estado`                                | Según el rol (RN-24 a RN-26)            |
| `reprogramarCita(id, fecha, hora)`               | `PATCH /api/citas/{id}/reprogramar`                           | PACIENTE (más de 24 h), SECRETARIA, ADMIN |
| `horariosDisponibles(nutId, fecha, dur, excluir)` | `GET /api/disponibilidad?nutricionistaId&fecha&duracion&excluir` | Público                              |
| `proximasHorasLibres(n)`                         | `GET /api/disponibilidad/proximas?cantidad=n`                 | Público                                 |
| `puedeAgendarTeleconsulta(pacienteId)`           | Se arma con `listarCitas` y `listarServicios`                 | PACIENTE. ms-citas la vuelve a revisar al crear |
| `estadisticas(desde, hasta)`                     | `GET /api/citas/estadisticas?desde&hasta`                     | ADMIN                                   |
| `obtenerPago(id)` / `listarPagos({ citaIds })`   | `GET /api/pagos/{id}` · `GET /api/pagos?citaIds`              | Dueño o ADMIN · ADMIN                   |
| `crearCita`, `procesarPago`, `reembolsarPagoSinCita` | No existen en modo API (responden 409)                    | Pago y cita van juntos (decisión 6)     |

- **El usuario sale del token.** Los parámetros `usuarioId` que reciben `cambiarEstado` y `reprogramarCita` se ignoran en modo API.
- **401 → `/login`.** Si ms-citas responde 401 a una petición con token, `apiFetch` cierra la sesión y avisa a la app. `SesionExpirada` (en `App.jsx`) lleva a `/login` con el mensaje y la página de origen.

### 7.3 Lo que ms-citas necesita de los otros microservicios

Mientras los endpoints de Catalina (C-31) y de Gabriel (G-32) no existan, ms-citas usa las semillas de EP2 (modo `auto`) y **no se tocó el código de ms-clinica ni el de ms-usuarios**. Cuando los publiquen, ms-citas los usa solo, sin cambios. Para eso deben responder así:

| Endpoint                     | Dueño    | Campos que lee ms-citas                                                                                               |
| ---------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `GET /api/servicios`         | Catalina | Lista (no paginada) con `codigo`, `tipo`, `nombre`, `duracionMin`, `modalidad`, `precio`, `activo`, como en EP2      |
| `GET /api/nutricionistas`    | Catalina | Lista con `id`, `dias` (0 = domingo a 6), `horaInicio` y `horaFin` (`"HH:mm"`), como en EP2. Los campos de más se ignoran |
| `GET /api/usuarios/{id}`     | Gabriel  | `id`, `activo`. ms-citas lo llama con el token del propio usuario, así que debe permitir que cada uno se lea a sí mismo |

`.\scripts\verificar.ps1 -Solo docker` revisa estos formatos apenas los endpoints existan, y avisa qué campo falta.

### 7.4 Variables de entorno de ms-citas

| Variable                  | Valor por defecto        | Para el video y la entrega |
| ------------------------- | ------------------------ | -------------------------- |
| `NUTRIVIDA_CLINICA_MODO`  | `auto` (semillas si ms-clinica no responde) | `http`      |
| `NUTRIVIDA_USUARIOS_MODO` | `auto`                   | `http`                     |
| `MS_CITAS_PERFILES`       | `mysql,dev` (incluye `POST /api/dev/token`) | `mysql`     |
| `JWT_SECRET`              | El de `.env`             | El mismo en los 3 microservicios |

`http` solo se puede usar cuando C-31 y G-32 estén listos. Antes, ms-citas respondería 503.

### 7.5 Cambios en archivos comunes

No hay cambios en archivos de Gabriel ni de Catalina. Estos archivos son de la base común (G-30) y los usan los tres:

| Archivo                   | Qué cambió                                                                                                   | Por qué                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `frontend/nginx.conf`     | `proxy_set_header Host $http_host` (antes `$host`) y la ruta `/api/dev`.                                     | Con `$host` se perdía el puerto 8080 y Spring rechazaba con **403 de CORS** todo `POST`/`PATCH`/`DELETE` del navegador, **en los 3 microservicios**. |
| `frontend/vite.config.js` | Ruta `/api/dev` → ms-citas.                                                                                  | La misma tabla que Nginx.                                                                                 |
| `frontend/src/App.jsx`    | `<SesionExpirada />` antes de las rutas.                                                                     | Un 401 de cualquier microservicio lleva a `/login`. También sirve para los services de Gabriel y Catalina. |
| `docker-compose.yml`, `.env.example` | Variables de la sección 7.4.                                                                      | Modos de los clientes y perfil `dev`.                                                                     |

### 7.6 Pendientes al llegar el login (G-32)

1. **Borrar `services/tokenPuente.js`** y sus dos llamadas (`asegurarToken`) en `citasService.js`. Hoy cambia la sesión local de EP2 por un token del perfil `dev`. Con el login real, el token lo guarda `Login.jsx` con `guardarToken`.
2. Pasar `NUTRIVIDA_USUARIOS_MODO` a `http` y `MS_CITAS_PERFILES` a `mysql`.
3. **Algoritmo del JWT.** El contrato dice HS256, pero jjwt elige el algoritmo por el largo de la clave: con el `JWT_SECRET` actual (64 bytes o más) firma con **HS512**. La validación acepta los dos, así que no rompe nada. Hay que decidir si se corrige el contrato o se fija el algoritmo en el login.

### 7.7 Verificación

`.\scripts\verificar.ps1` (sin parámetros) da **PASA** con: 156 pruebas JUnit de ms-citas, pruebas mutantes (PIT) sin sobrevivientes nuevos, 456 pruebas de Vitest y ESLint, los 5 contenedores, el `validate` del esquema en MySQL y las peticiones de humo autenticadas: crear, 409, 402, 403, secretaria por el proxy, `POST` con `Origin` por el proxy, cancelar con reembolso y eliminar.

El manual con capturas del módulo está en [`capturas/manual-citas.md`](capturas/manual-citas.md).

## 8. Integración de ms-usuarios (Gabriel, rama `gabriel-ep3`)

Estado al 23-11-2026. Login real con JWT, cuentas en MySQL y el frontend de acceso en modo dual: **React → Nginx → ms-usuarios → MySQL `nutrivida_usuarios`**. ms-usuarios es el único que emite el token; ms-citas y ms-clinica solo lo validan.

### 8.1 Recorrido del login

```text
Login.jsx ── POST /api/auth/login ──► Nginx :8080 ──► ms-usuarios :8081 ── BCrypt ──► MySQL nutrivida_usuarios
   │ guarda tokenSesion y usuarioActual
   ├─ F5: LayoutPrincipal / LayoutAdmin ── GET /api/auth/me ──► ¿la cuenta sigue activa? (401 → /login)
   └─ cada petición: Authorization: Bearer … ──► ms-citas / ms-clinica validan el JWT con el mismo JWT_SECRET
                                                   └─ ms-citas ── GET /api/usuarios/{id} ──► ms-usuarios (¿activa?)
```

### 8.2 Endpoints de ms-usuarios

| Método y ruta | Quién | Respuesta | Notas |
| --- | --- | --- | --- |
| `POST /api/auth/login` | Público | 200 `{ token, tipo, expiraEn, usuario }` · 401 · 403 | Clave o correo incorrectos: el mismo 401. Cuenta desactivada: 403. |
| `POST /api/auth/registro` | Público | 201 cuenta · 400 · 409 | Siempre PACIENTE activo. RUT con dígito verificador. |
| `GET /api/auth/me` | Con token | 200 · 401 | Lee la cuenta de la base: desactivada → 401. |
| `GET /api/usuarios?rol&activo&texto` | NUTRICIONISTA (solo `rol=PACIENTE`), SECRETARIA, ADMIN | 200 | Texto sin tildes en nombre, correo o RUT. |
| `GET /api/usuarios/{id}` | La propia cuenta (cualquier rol), SECRETARIA, ADMIN; NUTRICIONISTA solo pacientes | 200 `{ id, …, activo }` · 403 · 404 | Lo usa `UsuariosHttp` de ms-citas con el token del propio usuario. |
| `POST /api/usuarios` | ADMIN | 201 · 400 · 409 | 409 con `errores.correo`, `rut` o `nutricionistaId`. |
| `PATCH /api/usuarios/{id}` | ADMIN (menos su rol y estado) o el propio usuario (nombre, apellido, teléfono) | 200 · 403 · 409 | Campo ausente = sin cambio. |
| `PATCH /api/usuarios/{id}/estado` | ADMIN, nunca sobre sí mismo | 200 · 403 | |
| `PATCH /api/usuarios/{id}/rol` | ADMIN, nunca sobre sí mismo | 200 · 403 · 409 | |
| `PUT /api/usuarios/{id}/clave` | El propio usuario | 200 · 400 · 403 | Exige la clave actual. |
| `DELETE /api/usuarios/{id}` | ADMIN | 204 · 403 · 409 | Solo cuentas ya desactivadas (ver 8.5). |
| `GET /api/articulos`, `GET /api/articulos/{id}` | Público | 200 · 404 | Los consejos de EP2. |

Swagger: http://localhost:8081/swagger-ui.html (botón **Authorize** con el token del login, sin la palabra Bearer).

### 8.3 Services del frontend (modo dual)

Con `VITE_API_MODE=api` cada función llama a su endpoint; sin la variable (Vitest) usa `data/` como en EP2. Las firmas no cambiaron.

| Función | Modo API |
| --- | --- |
| `ingresar(correo, clave)` (nueva, `auth.js`) | `POST /api/auth/login`; guarda el token (`guardarToken`) y la sesión |
| `obtenerSesion()` | Con token: la sesión del login mientras el token no venza (claim `exp`). Sin token: igual que EP2 |
| `verificarSesion()` (nueva) | `GET /api/auth/me` al montar los layouts (F5) |
| `cerrarSesion()` | Borra `usuarioActual` y `tokenSesion` |
| `listarUsuarios`, `obtenerUsuario`, `crearUsuario`, `actualizarUsuario`, `cambiarEstado`, `cambiarRol`, `cambiarClave`, `registrarPaciente` | Endpoints de 8.2 (`obtenerUsuario` → `null` con 404) |
| `eliminarUsuario(id)` (nueva) | `DELETE /api/usuarios/{id}` |
| `listarArticulos`, `obtenerArticulo` | `GET /api/articulos`, `/{id}` |

- **401:** `apiFetch` cierra la sesión y `SesionExpirada` lleva a `/login`. Si el token venció mientras la página estaba cerrada, `RutaProtegida` lleva a `/login` con el aviso "Tu sesión expiró. Inicia sesión nuevamente.".
- **403:** no cierra la sesión. La página muestra el mensaje del backend; una ruta de otro rol vuelve al inicio con "No tienes acceso a esa sección.".
- `iniciarSesion` (login de EP2, síncrono) se mantiene: lo usan las pruebas de los tres módulos, incluidas las de modo API de citas.

### 8.4 Decisión: algoritmo del JWT (pendiente 7.6.3)

**Problema.** `JwtService.generar` firma con `signWith(clave)`, y jjwt elige el algoritmo por el largo de la clave: HS256 con 32 a 47 bytes, HS384 con 48 a 63 y HS512 con 64 o más. Con un `JWT_SECRET` de 48 caracteres el login real emitió **HS384** (comprobado contra MySQL el 23-11). La validación de los tres servicios acepta cualquiera, así que nada se rompe, pero no cumple el contrato (§3: HS256).

**Decisión.** Se mantiene HS256 en el contrato y se fija en el emisor: `signWith(clave, Jwts.SIG.HS256)` en `JwtService` de ms-usuarios. Así el algoritmo no depende del largo del secreto que genere `levantar.ps1`. Como `security/` es igual en los tres servicios y su dueño es Simon, el cambio va como **tarea de integración** (8.6), con el parche listo. `ApiAuthTest.algoritmoDelContrato` ya revisa que el login emita HS256 con el secreto de desarrollo.

### 8.5 Decisiones del módulo

1. **Eliminar solo cuentas desactivadas.** ms-citas y ms-clinica guardan `pacienteId` y `nutricionistaId` por valor, sin claves foráneas. Borrar una cuenta activa dejaría citas y fichas apuntando a nadie. Se desactiva primero (pierde el acceso en todos los servicios) y recién entonces se puede borrar. Mismo criterio que el `DELETE` de citas (contrato §6.1).
2. **El nutricionista lee pacientes.** Su agenda y sus fichas muestran nombres, por eso puede listar y leer cuentas de rol PACIENTE, pero no las del personal.
3. **Mismo 401 para correo inexistente y clave incorrecta**, para no revelar qué correos están registrados.
4. **U103 desactivada** en las semillas, para mostrar en el video el 403 del login y el 401 de ms-citas.
5. **`SET NAMES utf8mb4` en `01_usuarios.sql`.** El cliente `mysql` del contenedor lee los scripts en latin1 y las tildes quedaban dañadas ("TomÃ¡s").

### 8.6 Tareas de integración (después de unir en `main`)

| # | Dueño | Archivo | Qué | Por qué |
| --- | --- | --- | --- | --- |
| 1 | Simon | `backend/*/security/JwtService.java` | `.signWith(clave, Jwts.SIG.HS256)` en `generar` (los 3, para que sigan iguales) | Decisión 8.4 |
| 2 | Simon | `database/02_citas.sql` | `SET NAMES utf8mb4;` antes de `USE nutrivida_citas;` | El motivo "Plan de alimentación…" queda como "alimentaciÃ³n" en MySQL |
| 3 | Simon | `frontend/src/services/tokenPuente.js`, `citasService.js` | Borrar el puente y sus llamadas `asegurarToken` | El token ahora lo guarda `ingresar` |
| 4 | Simon | `.env.example`, `docker-compose.yml` | `NUTRIVIDA_USUARIOS_MODO=http`, `MS_CITAS_PERFILES=mysql` | ms-usuarios ya responde `GET /api/usuarios/{id}` |
| 5 | Simon (opcional) | `backend/ms-usuarios/security/SecurityConfig.java` | Dejar públicas solo `/api/auth/login` y `/api/auth/registro` en vez de `/api/auth/**` | Hoy `/me` se protege en `AuthService`; funciona, pero es más claro en la configuración |
| 6 | Simon (opcional) | `SecurityConfig` | `POST /api/usuarios` con `hasRole('ADMIN')` en la configuración | Hoy un paciente con un cuerpo inválido recibe 400 (corre `@Valid`) antes del 403 de `@PreAuthorize`. Con un cuerpo válido recibe 403. Pasa igual en ms-citas |

No se modificó ningún archivo de Simon ni de Catalina en esta rama.

### 8.7 Verificación (23-11-2026)

- `mvn test` en ms-usuarios: **78 pruebas** (repositorio, login y registro, API de usuarios, matriz de seguridad de 28 filas, Mockito, reglas y Swagger).
- `npm test`: **476 pruebas** (las 456 de antes más 20 de modo API de acceso), `npm run lint`, `npx prettier --check .` y `npm run build`.
- Docker (MySQL 8.4 y los 5 contenedores, con imágenes armadas desde los `.jar` y el `dist` compilados en el equipo) con `ddl-auto=validate` contra `01_usuarios.sql`, y peticiones de humo por Nginx: login, `/me` con y sin token, 403 de paciente sobre otra cuenta, crear (201) y duplicar (409), y ms-citas en modo `http` (200 con la cuenta activa y 401 a los 30 s de desactivarla).
- Navegador (Playwright, :8080): login, F5 con la sesión, `/admin` como paciente (aviso sin cerrar sesión), token vencido → `/login` con aviso, eliminar una cuenta desactivada, token con firma falsa → `/login` y logout.

El manual con las capturas está en [`capturas/manual-acceso.md`](capturas/manual-acceso.md).

## 9. Integración de ms-clinica (Catalina, rama `catalina-ep3`)

Estado al 23-11-2026. El módulo clínico funciona de punta a punta: **React → Nginx → ms-clinica → MySQL**, y ms-citas lee los catálogos reales en modo `http`. El detalle de requisitos está en [`ers/05-clinica.md`](ers/05-clinica.md) §5.10 a 5.15 y el manual en [`capturas/manual-clinica.md`](capturas/manual-clinica.md).

### 9.1 Services del frontend y endpoints (reemplaza la tabla de ms-clinica de la sección 2)

Las firmas no cambiaron. Con `VITE_API_MODE=api` cada función llama a su endpoint; con `local`, o sin la variable (Vitest), usa los datos de EP2.

| Función                                                          | Endpoint                                                                 | Quién                                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `listarServicios(filtros)` / `obtenerServicio(codigo)`           | `GET /api/servicios?tipo&texto&soloActivos` · `/{codigo}` (404 → `null`) | Público                                                                           |
| `crearServicio` · `actualizarServicio` · `cambiarEstadoServicio` | `POST /api/servicios` · `PATCH /{codigo}` · `PATCH /{codigo}/estado`     | ADMIN                                                                             |
| `listarNutricionistas()` / `obtenerNutricionista(id)`            | `GET /api/nutricionistas` · `/{id}`                                      | Público                                                                           |
| `actualizarFotoNutricionista` · `eliminarFotoNutricionista`      | `PUT` (multipart, parte `foto`) · `DELETE /api/nutricionistas/{id}/foto` | El propio nutricionista o ADMIN                                                   |
| `registrarContacto` · `listarContactos`                          | `POST /api/contactos` · `GET /api/contactos`                             | Público (ver 9.4) · ADMIN y SECRETARIA                                            |
| `listarPacientes(nutId)`                                         | `GET /api/pacientes?nutricionistaId`                                     | NUTRICIONISTA (los suyos) o ADMIN                                                 |
| `obtenerFicha(pacienteId)`                                       | `GET /api/pacientes/{id}` (404 → `null`)                                 | A cargo, el paciente o ADMIN; otro nutricionista recibe `{ id, nutricionistaId }` |
| `crearFicha(datos)`                                              | `POST /api/pacientes`                                                    | NUTRICIONISTA, a su nombre                                                        |
| `listarMediciones` · `registrarMedicion`                         | `GET` · `POST /api/pacientes/{id}/mediciones`                            | Leer: a cargo, paciente, ADMIN · Escribir: a cargo                                |
| `obtenerPlan` · `guardarPlan`                                    | `GET` (404 → `null`) · `PUT /api/pacientes/{id}/plan`                    | Igual que mediciones                                                              |

- **Errores en los formularios.** `FormContacto`, `FormFicha`, `FormPlan`, `FormMedicion` y `FormServicio` muestran `errores` bajo cada campo y `mensaje` arriba del botón, venga de la validación local o del backend.
- **Catálogo con respaldo.** Si ms-clinica no responde, las lecturas del catálogo usan las semillas de EP2, igual que el modo `auto` de ms-citas. Crear, editar o desactivar nunca usan el respaldo.
- **Token.** Desde la integración (§10) los dos services usan el token que guarda el login real (G-32); `tokenPuente.js` ya no existe.

### 9.2 Lo que ms-citas lee de ms-clinica (cumple la tabla de 7.3)

| Endpoint                  | Campos                                                                                           | Verificado              |
| ------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------- |
| `GET /api/servicios`      | Lista sin paginar con `codigo`, `tipo`, `nombre`, `duracionMin`, `modalidad`, `precio`, `activo` | `CatalogoTest` y Docker |
| `GET /api/nutricionistas` | Lista con `id`, `dias` (0-6), `horaInicio` y `horaFin` en `"HH:mm"`                              | `CatalogoTest` y Docker |

Contra Docker, con `NUTRIVIDA_CLINICA_MODO=http`: el log de ms-citas dice `ms-clinica: modo HTTP http://ms-clinica:8083`, `GET /api/disponibilidad` y `/proximas` responden con la jornada real y `POST /api/citas` crea la cita (201).

### 9.3 Cambios en archivos de otros integrantes

Ninguno. Lo que hace falta en archivos ajenos queda como tarea de integración (9.4).

### 9.4 Tareas de integración (después de unir en `main`)

| #   | Dueño    | Archivo                                                           | Qué hacer                                                                                                                                           | Por qué                                                                                                                                         |
| --- | -------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Simon    | `backend/ms-clinica/.../security/SecurityConfig.java`             | Agregar `.requestMatchers(HttpMethod.POST, "/api/contactos").permitAll()` antes de `anyRequest()` (patch de una línea entregado aparte).            | El formulario de contacto es para visitantes sin sesión (C-32). Hoy responde 401.                                                               |
| 2   | Catalina | `frontend/src/services/serviciosService.js`, `clinicaApi.test.js` | Después de la tarea 1: quitar el respaldo local de `registrarContacto` ante un 401 y su prueba.                                                     | Ya no hará falta.                                                                                                                               |
| 3   | Simon    | `serviciosService.js`, `fichasService.js`                         | Al borrar `tokenPuente.js`, quitar también `asegurarToken` de los `conToken` de estos dos services (quedan como `apiFetch`).                        | Si no, el build falla por el import.                                                                                                            |
| 4   | Simon    | `.env.example`, `docker-compose.yml`                              | `NUTRIVIDA_CLINICA_MODO=http` para el video y la entrega.                                                                                           | C-31 ya está.                                                                                                                                   |
| 5   | Simon    | `database/02_citas.sql` (y Gabriel en `01_usuarios.sql`)          | Agregar `SET NAMES utf8mb4;` después del `USE`.                                                                                                     | El cliente `mysql` del entrypoint lee los archivos como latin1 y guarda "alimentación" como "alimentaciÃ³n" (verificado con `HEX()` en Docker). |
| 6   | Simon    | `exception/GlobalExceptionHandler.java` (los 3)                   | Opcional: traducir `HttpMediaTypeNotSupportedException` (415), `MaxUploadSizeExceededException` (413) y `MissingServletRequestPartException` (400). | Hoy salen como 500 si alguien llama mal a la foto desde Swagger. Desde React no ocurre.                                                         |
| 7   | Simon    | `scripts/verificar.ps1` (S-41)                                    | Correr `mvn test` de ms-clinica (80 pruebas).                                                                                                       | Definición de terminado común.                                                                                                                  |

### 9.5 Verificación

- `mvn test` en `backend/ms-clinica`: **80 pruebas, 0 fallas**.
- `npm test` en `frontend`: **473 pruebas** (456 anteriores + 17 de `clinicaApi.test.js`), `npm run lint` y `npm run build` sin errores.
- `docker compose up -d --build`: los 5 contenedores arriba, ms-clinica arranca con `ddl-auto=validate` contra MySQL 8.4 y Swagger responde en :8083.
- En el navegador (Docker, modo API): catálogo, ficha propia con mediciones y plan, aviso de ficha ajena, 409 de código repetido bajo el campo y contacto de un visitante.

## 10. Integración en `main` (Gabriel, 26-11-2026)

Orden: `gabriel-ep3` y `catalina-ep3` con `git merge --no-ff`. El único conflicto fue este documento (las dos ramas agregaron una sección 8): la de ms-clinica pasó a ser la sección 9. Después se hicieron las tareas de integración de las secciones 8.6 y 9.4. Son archivos de Simon y de Catalina: quedan registrados aquí y se avisó a sus dueños.

### 10.1 Tareas hechas

| Tarea | Archivos | Commit |
| --- | --- | --- |
| 8.6.1 JWT con HS256 en los 3 servicios | `backend/*/security/JwtService.java` | `fix(repo): JWT firmado con HS256 y tildes de 02_citas.sql` |
| 8.6.2 y 9.4.5 `SET NAMES utf8mb4` | `database/02_citas.sql` | el mismo |
| 8.6.3 y 9.4.3 borrar el puente de token | `tokenPuente.js` (borrado), `citasService.js`, `pagosService.js`, `serviciosService.js`, `fichasService.js`, `modoApi.test.js`, `clinicaApi.test.js` | `refactor(repo): quita tokenPuente` |
| 9.4.1 contacto sin token | `backend/ms-clinica/.../SecurityConfig.java`, `ContactoController.java` (comentario), `SeguridadClinicaTest.java` (fila anónima) | `fix(clinica): POST /api/contactos sin token` |
| 8.6.4 y 9.4.4 modos `http` sin perfil dev; humo con el login | `docker-compose.yml`, `.env.example`, `scripts/verificar.ps1`, `backend/ms-citas/peticiones.http` | `chore(repo): ms-citas en modo http y sin perfil dev` |

### 10.2 Pendientes

- **Catalina (9.4.2):** quitar el respaldo local de `registrarContacto` ante un 401 y su prueba. Ya no hace falta.
- **Simon:** si sube su propia versión de S-40 a S-43, al unir `simon-ep3` habrá conflictos en `docker-compose.yml`, `.env.example`, `verificar.ps1` y los documentos de 10.4: conservar los modos `http`, el perfil `mysql` y los healthchecks.
- **Capturas:** faltan las de `capturas/acceso/` (12, Gabriel) y `capturas/clinica/` (18, Catalina). Las de citas ya están.
- **Opcionales:** 8.6.5, 8.6.6 y 9.4.6.

### 10.3 Verificación (26-11-2026)

- JUnit: ms-usuarios 78, ms-citas 156, ms-clinica 81. Vitest: 490, más ESLint y `npm run build`.
- Docker con los 5 contenedores y el `.env` sacado de `.env.example`: el login emite HS256, `POST /api/dev/token` da 404, ms-citas arranca en modo HTTP con ms-usuarios y ms-clinica, Mis citas, disponibilidad y servicios por el proxy, contacto anónimo con 201 y tildes correctas en las citas.
- Navegador (Playwright, :8080): el recorrido de acceso (login, F5, 403, token vencido, eliminar, logout) y Mis citas sin llamadas a `/api/dev`.
- `verificar.ps1` no se ejecutó en este equipo (sin PowerShell): correrlo en Windows antes de grabar.

### 10.4 Tareas de Simon hechas en la integración (26-11-2026)

Simon no alcanzó a subir `simon-ep3`. Para dejar la entrega completa, Gabriel hizo estas tareas; Simon debe revisarlas antes de la defensa.

| Tarea | Archivos |
| --- | --- |
| S-40 arranque en un solo comando y healthchecks | `scripts/levantar.ps1`, `scripts/levantar.sh`, `docker-compose.yml` (healthcheck con `/v3/api-docs` en los 3 microservicios y el frontend con `depends_on: service_healthy`) |
| S-41 pruebas de los 3 microservicios en `verificar.ps1` | `scripts/verificar.ps1` (omite con aviso un servicio sin pruebas) |
| S-43 documento de integración y README | `documentacion/documento-integracion.md`, `documentacion/manual-usuario.md`, `README.md` |

También se actualizaron las menciones al perfil `dev` en `manual-citas.md`, `manual-clinica.md`, `ep3/README.md`, §9.1 y `backend/ms-clinica/peticiones.http` (tokens desde el login).

Verificación: `levantar.sh` con las imágenes armadas en el equipo crea el `.env`, espera los 4 *healthy* y Nginx parte después. `levantar.ps1` y `verificar.ps1` no se ejecutaron aquí (sin PowerShell): se prueban en Windows antes de grabar.

