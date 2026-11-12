# Contrato del backend EP3 (G-30)

Acuerdo común de los tres microservicios de NutriVida. Lo que está aquí no se cambia sin avisar al equipo, porque el frontend y los otros dos servicios dependen de ello.

Base de cada proyecto: la solución DoggySpa del curso (Java 21, Spring Boot 4.1.x, Spring Web MVC, Spring Data JPA, Validation, springdoc), con estas piezas agregadas:

- `dto`: entrada y salida de la API, sin exponer las entidades JPA.
- `exception`: el formato de error común.
- `security`: validación del JWT y roles.
- `config`: configuración de Swagger.

## 1. Microservicios, puertos y esquemas

| Microservicio | Puerto | Esquema MySQL        | Dueño    | Rutas que atiende                                                           |
| ------------- | ------ | -------------------- | -------- | --------------------------------------------------------------------------- |
| `ms-usuarios` | 8081   | `nutrivida_usuarios` | Gabriel  | `/api/auth`, `/api/usuarios`, `/api/articulos`                              |
| `ms-citas`    | 8082   | `nutrivida_citas`    | Simon    | `/api/citas`, `/api/pagos`, `/api/disponibilidad`                           |
| `ms-clinica`  | 8083   | `nutrivida_clinica`  | Catalina | `/api/servicios`, `/api/nutricionistas`, `/api/pacientes`, `/api/contactos` |

- **Una base, tres esquemas.** MySQL 8 corre en Docker (`docker-compose.yml`, en la raíz, que también levanta los 3 microservicios y el frontend con Nginx), con un esquema por microservicio. No hay claves foráneas entre esquemas: `pacienteId` y `nutricionistaId` en `nutrivida_citas` son referencias por valor. Cada microservicio valida lo que necesita llamando por REST al dueño del dato.
- **Mismos IDs que en EP2.** Usuarios `U001`…`U102`, nutricionistas `NUT001`…`NUT004`, servicios `CN001`…, citas `C0001`… y pagos `P0001`…. Así las semillas de los tres esquemas calzan entre sí y con las pruebas del frontend.
- **JSON.** Mismos nombres de campo que en EP2. Fechas `AAAA-MM-DD`, horas `HH:mm` y zona `America/Santiago`.

### 1.1 Proxy: una sola puerta de entrada

El navegador nunca llama directo a los puertos 8081, 8082 u 8083. Llama a su propio origen, y el proxy reparte cada `/api/...` al microservicio dueño:

- **Desarrollo:** el proxy de `vite.config.js` (`npm run dev`, puerto 5173).
- **Docker:** Nginx en el contenedor `frontend` (`frontend/nginx.conf`, puerto 8080). También sirve el build de React.

Las dos tablas de rutas son iguales. Ventajas: no hay CORS, el frontend no conoce los puertos internos y en el examen final (EC2) se usa el mismo Nginx. Si un microservicio está caído, Nginx responde **503** con el mismo JSON de error común.

## 2. Formato de error común

### 2.1 Regla

**Todo error de cualquier microservicio responde con este mismo JSON, sin importar dónde se originó**: una validación, una regla de negocio, Spring Security o un error inesperado. El frontend tiene una sola forma de leerlo (`desdeRespuesta` en `utils/errores.js`) y los formularios funcionan igual en modo local y en modo API.

```json
{
  "timestamp": "2026-11-20T15:04:05Z",
  "status": 409,
  "error": "Conflict",
  "mensaje": "Ese horario ya está tomado. Elige otra hora.",
  "ruta": "/api/citas",
  "errores": { "hora": "Ese horario ya está tomado. Elige otra hora." }
}
```

### 2.2 Campos

| Campo       | Tipo                        | ¿Siempre? | Para qué sirve                                                                                                                                                                         | Quién lo usa                                 |
| ----------- | --------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `timestamp` | Texto ISO-8601 en UTC       | Sí        | Cuándo ocurrió. Permite cruzar el error con el log del servidor.                                                                                                                       | Desarrolladores                              |
| `status`    | Número                      | Sí        | El código HTTP, repetido en el cuerpo para que no se pierda si el error se copia o se registra sin la respuesta.                                                                       | Frontend (`error.estado`)                    |
| `error`     | Texto                       | Sí        | Nombre estándar del código (`Bad Request`, `Forbidden`…). Técnico: **no** se muestra al usuario.                                                                                       | Desarrolladores                              |
| `mensaje`   | Texto en español            | Sí        | **Lo único que ve el usuario.** Siempre es una frase lista para mostrar: nunca una traza, un nombre de clase ni un SQL.                                                                | Frontend (`error.message`)                   |
| `ruta`      | Texto                       | Sí        | El endpoint que falló. Útil porque el frontend llama a tres servicios.                                                                                                                 | Desarrolladores                              |
| `errores`   | Objeto `{ campo: mensaje }` | No        | Solo cuando el error es de campos del formulario. Si no aplica, la clave **no se envía**. Con un solo campo, el frontend también lo deja en `error.campo` y lo muestra bajo ese input. | Formularios (`error.errores`, `error.campo`) |

### 2.3 Qué código usar

| Status                        | Cuándo                                                        | Ejemplos                                                                                          | `errores`                           |
| ----------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **400** Bad Request           | Falla `@Valid`, el JSON no se puede leer o falta un parámetro | Motivo de menos de 10 caracteres; fecha que no es AAAA-MM-DD                                      | Sí, un mensaje por campo            |
| **401** Unauthorized          | No hay token, el token venció o la firma no es válida         | Sesión de 8 h vencida → _"Tu sesión expiró. Inicia sesión nuevamente."_                           | No                                  |
| **402** Payment Required      | El pago simulado fue rechazado en `POST /api/citas`           | Tarjeta `4000 0000 0000 0002` → _"El banco rechazó la tarjeta."_                                  | No                                  |
| **403** Forbidden             | Hay token, pero el rol o el dueño no corresponde              | Un paciente cancela la cita de otro paciente; un nutricionista abre la ficha de un paciente ajeno | No                                  |
| **404** Not Found             | El recurso o la ruta no existen                               | `GET /api/citas/C9999`                                                                            | No                                  |
| **409** Conflict              | La petición choca con el estado actual                        | Horario ya tomado; pasar de ATENDIDA a CANCELADA; quedan menos de 24 h; correo duplicado          | Opcional (p. ej. `hora` o `correo`) |
| **500** Internal Server Error | Error no previsto                                             | — _"Ocurrió un error inesperado. Intenta nuevamente."_ (el detalle queda solo en el log)          | No                                  |
| **503** Service Unavailable   | El dueño de un dato no responde                               | Nginx con un microservicio caído; ms-citas sin respuesta de ms-clinica o ms-usuarios en modo `http` | No                                  |

400, 409 o 403 se distinguen así: **400** si el dato está mal escrito, **409** si el dato está bien pero choca con lo que ya existe y **403** si el dato está bien pero no te corresponde.

### 2.4 Cómo se implementa en cada microservicio

| Clase                                | Rol                                                                                                                                                                                                                                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exception/ErrorRespuesta`           | `record` con los seis campos. `@JsonInclude(NON_NULL)` hace que `errores` no viaje cuando no hay campos con error.                                                                                                                                                                                 |
| `exception/ApiException`             | La excepción del negocio: un código HTTP más un mensaje, y opcionalmente los errores por campo. Fábricas: `validacion(campo, msg)`, `prohibido`, `noEncontrado`, `conflicto`. Los services la lanzan y **ningún controlador arma un error a mano**.                                                |
| `exception/GlobalExceptionHandler`   | `@RestControllerAdvice`: el **único** lugar que construye el JSON. Traduce `ApiException`, `@Valid`, un JSON mal formado, 401, 403, 404, 405, choques de la base (UNIQUE, bloqueos → 409) y cualquier otra excepción (→ 500, con el detalle solo en el log).                                       |
| `security/ManejadorErroresSeguridad` | Los 401 y 403 ocurren en los **filtros** de Spring Security, antes del controlador, y `@RestControllerAdvice` no los alcanzaría. Esta clase es el `AuthenticationEntryPoint` y el `AccessDeniedHandler`, y reenvía esas excepciones al `GlobalExceptionHandler` para que salgan con el mismo JSON. |
| `security/JwtFiltro`                 | Si el token venció o es inválido, deja el motivo en la petición para que el 401 diga _"Tu sesión expiró"_ y no un texto genérico.                                                                                                                                                                  |

### 2.5 Cómo lo usa el frontend

- `services/http.js → apiFetch` convierte cualquier respuesta con error en un `ErrorApi`, mediante `desdeRespuesta(cuerpo, status)`:
  - `estado` = `status`
  - `message` = `mensaje`
  - `errores` = `errores`
  - `campo` = el único campo, si hay uno solo
- Si no hay respuesta (backend apagado o CORS), el error es `SIN_CONEXION` con un mensaje legible.
- Un **401 con token** borra el token, cierra la sesión y dispara el evento `nutrivida:sesion-expirada`. La app lo escucha y lleva a `/login`. Esto cubre el manejo de sesión vencida que pide la rúbrica.

## 3. JWT y roles

- **Formato:** HS256, vigencia 8 h. Claims `sub` (id del usuario), `rol`, `nombre` y `nutricionistaId` (solo para nutricionistas).
- **Secreto:** variable de entorno `JWT_SECRET`, con al menos 32 caracteres e **igual en los tres servicios**. Se define en `.env`, que nunca va al repositorio.
- **Emisión y validación:** solo `ms-usuarios` emite el token (`POST /api/auth/login`). `ms-citas` y `ms-clinica` solo lo validan con `JwtFiltro`, sin consultar a `ms-usuarios`. Esa es la ventaja del JWT: el token se valida solo.
- **Roles:** el rol llega como `ROLE_<ROL>`. Las reglas finas van con `@PreAuthorize("hasRole('PACIENTE')")` sobre cada endpoint. Las reglas de dueño ("esta cita es tuya") van en el service, con `UsuarioActual.obtener()`.
- **Público sin token** (Forma D 0.2: solo lo indispensable):
  - Swagger.
  - Login y registro.
  - `GET` del catálogo (`/api/servicios`, `/api/nutricionistas`) y de la disponibilidad.
- **Perfil `dev`:** agrega `POST /api/dev/token` para probar con tokens reales mientras `ms-usuarios` no está listo. **Nunca se activa en el video ni en la entrega.**
- **Frontend:** el token se guarda en `localStorage` (`tokenSesion`), por eso la sesión sobrevive a una recarga. `apiFetch` lo envía en `Authorization: Bearer …`.

## 4. Modo dual del frontend

`VITE_API_MODE=api` hace que los services llamen a los microservicios. Sin la variable, o con `local`, usan los datos de EP2 en `localStorage`.

- Las ~400 pruebas de Vitest corren en modo local sin cambios.
- La app real y el video corren en modo API.
- Cada service decide con `usarApi()` (de `services/http.js`) y mantiene sus firmas, así los componentes no cambian.

## 5. Integridad

- Toda operación que **revisa una regla y escribe** es un método `@Transactional` del service del microservicio.
- La base es la última barrera:
  - `UNIQUE` en `cita.pago_id`, en correo y en RUT.
  - Bloqueo de la agenda del nutricionista para ese día al crear o reprogramar una cita.
- **Pago y cita en un solo endpoint** (`POST /api/citas`): `ms-citas` valida la solicitud, simula el cobro, guarda el pago y crea la cita **en una sola transacción**. No puede quedar un pago aprobado sin cita.
  - Si la tarjeta se rechaza, se guarda el pago RECHAZADO, no se crea la cita y se responde **402**.

## 6. Endpoints de ms-citas (Simon)

| Método y ruta                                                  | Rol                                       | Respuesta            | Notas                                                                                                                |
| -------------------------------------------------------------- | ----------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `GET /api/disponibilidad?nutricionistaId&fecha&duracion`       | Público                                   | 200 `["09:00", …]`   | Pide el horario a `ms-clinica`.                                                                                      |
| `GET /api/disponibilidad/proximas?cantidad`                   | Público                                   | 200 `[{nutricionistaId, fecha, hora}]` | Agenda rápida del Inicio: las próximas horas libres de toda la clínica (hasta 14 días). Decisión del equipo 13/11. |
| `POST /api/citas`                                              | PACIENTE                                  | 201 cita · 402 · 409 | Cuerpo: datos de la cita más `tarjeta`. Una transacción (sección 5).                                                 |
| `GET /api/citas/mias`                                          | PACIENTE                                  | 200                  |                                                                                                                      |
| `GET /api/citas/agenda?desde&hasta`                            | NUTRICIONISTA                             | 200                  | Solo las de su `nutricionistaId`.                                                                                    |
| `GET /api/citas?pacienteId&nutricionistaId&estado&desde&hasta` | SECRETARIA, ADMIN                         | 200                  |                                                                                                                      |
| `GET /api/citas/{id}`                                          | Dueño, SECRETARIA, ADMIN                  | 200 · 404            |                                                                                                                      |
| `PATCH /api/citas/{id}/estado`                                 | Según el rol (RN-24 a RN-26)              | 200 · 403 · 409      | Al cancelar, el reembolso va en la misma transacción.                                                                |
| `PATCH /api/citas/{id}/reprogramar`                            | PACIENTE (más de 24 h), SECRETARIA, ADMIN | 200 · 409            |                                                                                                                      |
| `DELETE /api/citas/{id}`                                       | ADMIN                                     | 204 · 409            | Solo citas CANCELADAS (ver 6.1).                                                                                     |
| `GET /api/pagos/{id}`                                          | Dueño o ADMIN                             | 200                  | Comprobante; solo los 4 últimos dígitos.                                                                             |
| `GET /api/pagos?citaIds`                                       | ADMIN                                     | 200                  |                                                                                                                      |
| `GET /api/citas/estadisticas?desde&hasta`                      | ADMIN                                     | 200                  | Misma forma que en EP2 (`total`, `atendidas`, `inasistencias`, `tasaInasistencia`, `porNutricionista`, `porSemana`). |

### 6.1 Por qué existe `DELETE /api/citas/{id}` y por qué solo para canceladas

**Razón:** la rúbrica pide demostrar las cuatro operaciones del CRUD, incluida la eliminación (EP3, sección 5: _"lectura, creación, edición y eliminación desde el frontend y/o Swagger"_). En el negocio, una cita **no se borra: se cancela**. El historial de estados (RN-04), el reembolso (RN-08) y las estadísticas de inasistencia dependen de que la cita siga existiendo. Por eso el DELETE se limita al único caso en que borrar no daña nada:

- **Solo ADMIN.** Es una tarea de mantenimiento: limpiar citas canceladas por error o de prueba.
- **Solo citas CANCELADAS.** Una cita pendiente o confirmada ocupa agenda; una atendida o con inasistencia alimenta las estadísticas y la ficha. Borrar cualquiera de ellas responde **409**: _"Solo se puede eliminar una cita cancelada."_
- **El pago no se borra.** Queda como registro contable (REEMBOLSADO), porque el dinero se movió aunque la cita ya no exista. El enlace está en `cita.pago_id`, así que al borrar la cita el pago simplemente queda sin cita.
- **Se borra en una transacción** junto con su historial y sus recordatorios.
