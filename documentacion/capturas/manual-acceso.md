# Manual de uso · Módulo de acceso (EP3)

Responsable: Gabriel. Capturas con la app en Docker y en modo API (`VITE_API_MODE=api`): lo que se ve viene de ms-usuarios y de MySQL, no del `localStorage` de EP2.

> **Pendiente:** las imágenes se guardan en `documentacion/capturas/acceso/` con el nombre que indica cada sección. La lista completa está en la sección 7.

## 1. Antes de empezar

1. Levantar todo: `docker compose up -d --build` en la raíz del proyecto (solo se necesita Docker).
2. Abrir **http://localhost:8080**.
3. Cuentas de prueba (credenciales ficticias de `database/01_usuarios.sql`):

| Rol | Correo | Clave | Llega a |
| --- | --- | --- | --- |
| Administrador | `admin@nutrivida.cl` | `Admin2026!` | `/admin` |
| Secretaria | `recepcion@nutrivida.cl` | `Recepcion2026!` | `/secretaria/agenda` |
| Nutricionista | `cfuentes@nutrivida.cl` | `Nutri2026!` | `/nutricionista/agenda` |
| Paciente | `javiera.soto@correo.cl` | `Paciente2026!` | `/mis-citas` |
| Paciente desactivado | `pedro.lagos@correo.cl` | `Paciente2026!` | No entra (403) |

Para volver a las semillas: `docker compose down -v` y `docker compose up -d --build`.

## 2. Iniciar sesión

`/login` envía `POST /api/auth/login`. Si es correcto, el navegador guarda el token (`tokenSesion`) y la sesión, y lleva a la vista del rol.

![Login con el token guardado (DevTools → Application → Local Storage)](acceso/01-login-token.png)

- Clave incorrecta o correo inexistente: "Correo o contraseña incorrectos." (401, el mismo mensaje en los dos casos).
- Cuenta desactivada: "Tu cuenta está desactivada. Contacta a la clínica." (403).

![Login con la cuenta desactivada](acceso/02-login-desactivada.png)

## 3. Sesión que sobrevive a F5

Al recargar la página la sesión sigue y el frontend la confirma con `GET /api/auth/me` (pestaña Network).

![F5: la sesión sigue y aparece GET /api/auth/me con 200](acceso/03-recarga-me.png)

Si el token vence (8 h) o la cuenta se desactiva, la siguiente petición responde 401, la sesión se cierra y se llega a `/login` con el aviso:

![Token vencido: /login con "Tu sesión expiró. Inicia sesión nuevamente."](acceso/04-sesion-expirada.png)

Para provocarlo sin esperar 8 h: en DevTools, cambiar un carácter del valor de `tokenSesion` y recargar ("La sesión no es válida. Inicia sesión nuevamente.").

## 4. Dos roles y el 403

- Un paciente que abre `/admin` vuelve al inicio con "No tienes acceso a esa sección." y **sigue con su sesión**.
- En la API, el mismo paciente recibe 403 al pedir la cuenta de otro (`GET /api/usuarios/U101`) o al crear usuarios.

![Paciente en /admin: aviso sin cerrar la sesión](acceso/05-paciente-admin-403.png)

![403 en Swagger con el JSON común](acceso/06-swagger-403.png)

## 5. Administrador: usuarios (CRUD React → API → MySQL)

**Usuarios** en el panel de administración. Crear, editar, activar o desactivar y eliminar.

![Lista de usuarios](acceso/07-admin-usuarios.png)

- **Crear:** `/admin/usuarios/nuevo` → `POST /api/usuarios` (201). Con un correo repetido el error aparece bajo el campo (409).

![Correo repetido bajo el campo](acceso/08-crear-correo-repetido.png)

- **Editar:** `PATCH /api/usuarios/{id}`.
- **Desactivar:** con confirmación. La cuenta ya no entra y pierde el acceso en ms-citas.
- **Eliminar:** el botón solo aparece en cuentas desactivadas (`DELETE /api/usuarios/{id}`, 204).

![Eliminar una cuenta desactivada](acceso/09-eliminar-desactivada.png)

Para mostrar que llegó a la base:

```bash
docker compose exec mysql mysql -unutrivida -pnutrivida_dev -e "SELECT id, correo, rol, activo FROM nutrivida_usuarios.usuario"
```

![El usuario nuevo en MySQL](acceso/10-mysql-usuario.png)

## 6. La API directamente (Swagger)

**http://localhost:8081/swagger-ui.html**. La descripción tiene la tabla de cuentas demo. Pasos: `POST /api/auth/login` → copiar `token` → **Authorize** (sin la palabra Bearer) → probar los protegidos.

![Swagger de ms-usuarios con Authorize](acceso/11-swagger-ms-usuarios.png)

| Código | Cuándo en ms-usuarios |
| --- | --- |
| 400 | Datos inválidos: RUT con dígito verificador incorrecto, clave débil, teléfono mal escrito |
| 401 | Login incorrecto, sin token, token vencido o inválido, cuenta desactivada en `/me` |
| 403 | Cuenta desactivada en el login, rol sin permiso, cuenta ajena, el admin sobre sí mismo |
| 404 | El usuario, el consejo o la ruta no existen |
| 409 | Correo, RUT o nutricionista repetidos; eliminar una cuenta activa |

## 7. Lista de capturas a tomar

| Archivo | Qué mostrar | Cómo |
| --- | --- | --- |
| `01-login-token.png` | Login correcto y `tokenSesion` en Local Storage | Paciente; DevTools → Application |
| `02-login-desactivada.png` | Alerta de cuenta desactivada | `pedro.lagos@correo.cl` |
| `03-recarga-me.png` | F5 con la sesión y `GET /api/auth/me` 200 | DevTools → Network, filtrar "me" |
| `04-sesion-expirada.png` | `/login` con "Tu sesión expiró" o "La sesión no es válida" | Editar `tokenSesion` y recargar |
| `05-paciente-admin-403.png` | Aviso "No tienes acceso a esa sección." con la sesión abierta | Paciente abre `/admin` |
| `06-swagger-403.png` | 403 con el JSON común | Swagger, token de paciente, `GET /api/usuarios/U101` |
| `07-admin-usuarios.png` | Lista de usuarios | Admin |
| `08-crear-correo-repetido.png` | 409 bajo el campo correo | Crear con `recepcion@nutrivida.cl` |
| `09-eliminar-desactivada.png` | Diálogo y aviso "Cuenta de … eliminada." | Eliminar a Pedro Lagos (U103) |
| `10-mysql-usuario.png` | El usuario nuevo en `nutrivida_usuarios.usuario` | Comando de la sección 5 |
| `11-swagger-ms-usuarios.png` | Swagger con Authorize y la tabla de cuentas | http://localhost:8081/swagger-ui.html |
| `12-movil-login.png` | Login en un teléfono (375 px) | DevTools → modo dispositivo |
