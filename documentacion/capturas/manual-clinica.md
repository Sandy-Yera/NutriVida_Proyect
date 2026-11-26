# Manual de uso · Módulo clínico (EP3)

Responsable: Catalina. Capturas con la app en Docker y en modo API (`VITE_API_MODE=api`): todo lo que se ve viene de ms-clinica y de MySQL, no del `localStorage` de EP2. Las imágenes van en `documentacion/capturas/clinica/` con el nombre de cada fila.

## 1. Antes de empezar

1. Levantar todo: `docker compose up -d --build` en la raíz (solo se necesita Docker).
2. Abrir **http://localhost:8080** (app) y **http://localhost:8083/swagger-ui.html** (Swagger de ms-clinica).
3. Cuentas de prueba (datos ficticios de las semillas de EP2):

| Rol                              | Correo                    | Clave            | Qué ve en este módulo          |
| -------------------------------- | ------------------------- | ---------------- | ------------------------------ |
| Paciente (U100, ficha de NUT001) | `javiera.soto@correo.cl`  | `Paciente2026!`  | Mi progreso                    |
| Nutricionista (U010, NUT001)     | `cfuentes@nutrivida.cl`   | `Nutri2026!`     | Mis pacientes y ficha          |
| Nutricionista (U011, NUT002)     | `rsepulveda@nutrivida.cl` | `Nutri2026!`     | Aviso de ficha ajena           |
| Secretaria                       | `recepcion@nutrivida.cl`  | `Recepcion2026!` | Bandeja de contactos (Swagger) |
| Administrador                    | `admin@nutrivida.cl`      | `Admin2026!`     | Servicios                      |

> Mientras el login de ms-usuarios (G-32) no esté, el token lo entrega el perfil `dev` de ms-citas sin que el usuario lo note (plan B). Para Swagger, el token se pide con `POST http://localhost:8082/api/dev/token` (ver `backend/ms-clinica/peticiones.http`) o, con el login listo, con `POST /api/auth/login`.

## 2. Capturas a tomar

| #   | Archivo                               | Dónde y cómo                                                                                                                         | Qué debe verse                                                                         | Indicador |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | --------- |
| 1   | `01-swagger-ms-clinica.png`           | Swagger :8083, todo colapsado                                                                                                        | Las 5 secciones (Servicios, Nutricionistas, Pacientes, Contactos) y el botón Authorize | IE3.1.1   |
| 2   | `02-swagger-get-servicios.png`        | Swagger → `GET /api/servicios` → Try it out, sin token                                                                               | 200 con la lista sin paginar                                                           | IE3.1.1   |
| 3   | `03-swagger-post-servicio-401.png`    | `POST /api/servicios` sin Authorize                                                                                                  | 401 con el JSON común (`timestamp, status, error, mensaje, ruta`)                      | IE3.3.2   |
| 4   | `04-swagger-post-servicio-201.png`    | Authorize con token de ADMIN, mismo POST con el ejemplo                                                                              | 201 y `Location: /api/servicios/CN006`                                                 | IE3.2.1   |
| 5   | `05-swagger-post-servicio-409.png`    | Repetir el POST                                                                                                                      | 409 "Ya existe un servicio con ese código." con `errores.codigo`                       | IE3.2.2   |
| 6   | `06-swagger-medicion-403.png`         | Authorize con token de NUT002, `POST /api/pacientes/U100/mediciones`                                                                 | 403 "Solo el nutricionista a cargo puede modificar esta ficha."                        | IE3.3.3   |
| 7   | `07-catalogo-servicios.png`           | App → Servicios (sin sesión)                                                                                                         | Catálogo cargado desde la API (DevTools → Red: `GET /api/servicios 200`)               | IE3.2.1   |
| 8   | `08-admin-servicios.png`              | Admin → Servicios                                                                                                                    | Tabla con los 18 servicios y filtros                                                   | IE3.2.1   |
| 9   | `09-admin-servicio-409.png`           | Admin → Nuevo servicio con código `CN001`                                                                                            | El 409 del backend bajo el campo Código                                                | IE3.2.2   |
| 10  | `10-admin-desactivar.png`             | Admin → desactivar un taller y volver a Servicios (público)                                                                          | El taller ya no aparece en el catálogo                                                 | IE3.2.1   |
| 11  | `11-mis-pacientes.png`                | Carolina → Mis pacientes                                                                                                             | Solo Javiera Soto (U100)                                                               | IE3.3.3   |
| 12  | `12-ficha-medicion.png`               | Carolina → ficha de U100 → registrar medición                                                                                        | La medición nueva en el historial (M0008)                                              | IE3.2.1   |
| 13  | `13-mysql-medicion.png`               | `docker compose exec mysql mysql -unutrivida -pnutrivida_dev -e "SELECT * FROM nutrivida_clinica.medicion ORDER BY id DESC LIMIT 3"` | La misma medición en MySQL                                                             | IE3.2.1   |
| 14  | `14-ficha-ajena.png`                  | Rodrigo → `/nutricionista/pacientes/U100`                                                                                            | "Esta ficha pertenece a otro nutricionista." sin datos clínicos                        | IE3.3.3   |
| 15  | `15-mi-progreso.png`                  | Javiera → Mi progreso, luego F5                                                                                                      | Gráfico y plan vigente; tras F5 sigue la sesión                                        | IE3.3.1   |
| 16  | `16-contacto.png`                     | Contacto sin sesión                                                                                                                  | "Mensaje enviado."                                                                     | IE3.2.1   |
| 17  | `17-swagger-contactos-secretaria.png` | Authorize con token de SECRETARIA, `GET /api/contactos`                                                                              | Bandeja con los mensajes                                                               | IE3.3.3   |
| 18  | `18-foto-nutricionista.png`           | Carolina → Mi perfil → subir foto, luego Nosotros                                                                                    | La foto en la tarjeta (`fotoUrl` con `?v=`)                                            | IE3.2.1   |

## 3. Notas para la defensa

- **Por qué la ficha usa el id del paciente como PK:** una ficha por paciente, y el dato vive en ms-usuarios; aquí se guarda por valor, sin FK entre esquemas.
- **Por qué no hay DELETE de servicios:** las citas guardan el código. Se desactiva y sale del catálogo, pero las citas antiguas siguen mostrando su nombre (`soloActivos=false`).
- **Dónde está la regla de dueño:** el rol grueso en el controlador (`@PreAuthorize`), el dueño en `FichaService` con el usuario del token (`UsuarioActual`).
- **Cómo se evitan IDs repetidos:** la fila `contador` se lee con `SELECT … FOR UPDATE` dentro de la misma transacción que guarda.
- **Mismos mensajes que EP2:** `ReglasClinica` es el puerto de `utils/clinica.js`, y `ReglasClinicaTest` repite sus casos.
