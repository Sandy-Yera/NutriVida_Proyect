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
