# Documento de integración frontend–backend · NutriVida EP3

DSY1104 Desarrollo Fullstack II · Forma D "Clínica Nutricional NutriVida" · Sección 005 · 2026-2.
Integrantes: Gabriel (ms-usuarios), Simon (ms-citas) y Catalina (ms-clinica).

Este documento reúne la arquitectura, los componentes, el flujo REST, la configuración y los pasos para ejecutar. El detalle de cada módulo está en [`integracion-ep3.md`](integracion-ep3.md) (§7 citas, §8 usuarios, §9 clínica, §10 integración en `main`) y el contrato común en [`ep3/contrato-backend.md`](ep3/contrato-backend.md).

## 1. Arquitectura

```text
                        ┌──────────────────────────── Docker Compose ─────────────────────────────┐
Navegador ── :8080 ──► │ frontend (Nginx)                                                          │
                        │   ├─ sirve el build de React (Vite)                                       │
                        │   ├─ /api/auth, /api/usuarios, /api/articulos ─────► ms-usuarios :8081 ─┐ │
                        │   ├─ /api/citas, /api/pagos, /api/disponibilidad ──► ms-citas    :8082 ─┼─► MySQL 8.4 :3306
                        │   └─ /api/servicios, /api/nutricionistas,          ► ms-clinica  :8083 ─┘ │   nutrivida_usuarios
                        │      /api/pacientes, /api/contactos                                       │   nutrivida_citas
                        │                       ms-citas ──► ms-usuarios (¿cuenta activa?)          │   nutrivida_clinica
                        │                       ms-citas ──► ms-clinica  (servicios y horarios)     │
                        └───────────────────────────────────────────────────────────────────────────┘
```

- **Microservicios independientes:** cada uno tiene su propio esquema MySQL, sin claves foráneas entre esquemas. Los IDs de otro servicio (`pacienteId`, `nutricionistaId`, `servicioCodigo`) se guardan por valor y se consultan por REST al dueño del dato.
- **Una sola puerta de entrada:** el navegador habla solo con Nginx (:8080), que reparte cada `/api/...` al microservicio dueño. No hay CORS entre puertos y el frontend no conoce los puertos internos. En desarrollo, el proxy de `vite.config.js` tiene la misma tabla.

## 2. Componentes

| Componente | Tecnología | Responsabilidad | Dueño |
| --- | --- | --- | --- |
| `frontend/` | React 19 + Vite, React Router, Bootstrap 5, Vitest | Pantallas de los 4 roles. Los services eligen API o datos locales con `usarApi()` (modo dual) | Los 3, por módulo |
| `frontend/nginx.conf` | Nginx 1.27 | Sirve el build y hace de proxy de `/api` | Simon |
| `backend/ms-usuarios` | Spring Boot 4.1, Java 21, JPA, Security, jjwt, springdoc | Login con BCrypt, emisión del JWT, cuentas y roles, consejos | Gabriel |
| `backend/ms-citas` | ídem | Citas, disponibilidad, pago simulado, estadísticas | Simon |
| `backend/ms-clinica` | ídem | Servicios, nutricionistas, fichas, mediciones, planes, contactos | Catalina |
| `database/` | MySQL 8.4 | `00_esquemas.sh` crea los 3 esquemas; `01_usuarios.sql`, `02_citas.sql` y `03_clinica.sql`, las tablas y las semillas | Cada dueño |

Estructura de cada microservicio (como la solución DoggySpa del curso): `model → repository → service → controller`, más `dto` (entrada y salida sin exponer entidades), `exception` (formato de error común), `security` (JWT y roles, igual en los 3) y `config` (Swagger).

## 3. Flujo REST

### 3.1 Inicio de sesión y petición protegida

```text
1. Login.jsx ──POST /api/auth/login {correo, clave}──► ms-usuarios
                                                       BCrypt.matches → JwtService.generar (HS256, 8 h)
   ◄── 200 {token, tipo, expiraEn, usuario} ──────────
   guarda tokenSesion y usuarioActual en localStorage

2. citasService ──GET /api/citas/mias  Authorization: Bearer <token>──► ms-citas
                  JwtFiltro valida la firma con el mismo JWT_SECRET → ROLE_PACIENTE
                  VerificadorCuenta ──GET /api/usuarios/U100──► ms-usuarios (¿activa? 30 s de memoria)
                  @PreAuthorize("hasRole('PACIENTE')") → CitaService (solo sus citas)
   ◄── 200 [citas] ───────────────────────────────────

3. F5 ──GET /api/auth/me──► ms-usuarios: la cuenta sigue activa → la sesión continúa
```

### 3.2 Reglas de la integración

| Situación | Backend | Frontend |
| --- | --- | --- |
| Sin token, token vencido o firma inválida | 401 con el JSON común y el motivo | `apiFetch` cierra la sesión y `SesionExpirada` lleva a `/login` con el aviso |
| Token válido pero rol o dueño que no corresponde | 403 (`@PreAuthorize` o regla de dueño en el service) | Muestra el mensaje y **no** cierra la sesión. Las rutas de otro rol vuelven al inicio con un aviso (`RutaProtegida`) |
| Cuenta desactivada con el token vigente | ms-usuarios: 401 en `/me`. ms-citas: 401 a más tardar 30 s después | Cierra la sesión |
| Datos inválidos o duplicados | 400 o 409 con `errores: { campo: mensaje }` | Cada formulario muestra el error bajo su campo |
| Un microservicio caído | Nginx o ms-citas responden 503 con el mismo JSON | Mensaje de "sin conexión" |

Formato de error común (todos los servicios, también los 401 y 403 de Spring Security):

```json
{ "timestamp": "2026-11-26T15:04:05Z", "status": 409, "error": "Conflict",
  "mensaje": "Ya existe un usuario con ese correo.", "ruta": "/api/usuarios",
  "errores": { "correo": "Ya existe un usuario con ese correo." } }
```

### 3.3 Endpoints

| Servicio | Endpoints principales | Detalle |
| --- | --- | --- |
| ms-usuarios | `POST /api/auth/login`, `POST /api/auth/registro`, `GET /api/auth/me`, CRUD de `/api/usuarios` (ADMIN), `GET /api/articulos` | [`integracion-ep3.md` §8.2](integracion-ep3.md#82-endpoints-de-ms-usuarios) |
| ms-citas | `POST /api/citas` (pago y cita en una transacción), `GET /api/citas/mias`, `/agenda`, `PATCH /{id}/estado`, `/reprogramar`, `DELETE /{id}`, `/api/pagos`, `/api/disponibilidad` | [`contrato-backend.md` §6](ep3/contrato-backend.md) y [`integracion-ep3.md` §7](integracion-ep3.md) |
| ms-clinica | `GET /api/servicios` y `/api/nutricionistas` (públicos), CRUD de servicios (ADMIN), `/api/pacientes` con mediciones y plan, `POST /api/contactos` (público) | [`integracion-ep3.md` §9.1](integracion-ep3.md) |

Swagger con **Authorize** en http://localhost:8081, :8082 y :8083 (`/swagger-ui.html`).

## 4. Configuración

Todo se configura con el archivo `.env` de la raíz, que se crea desde [`.env.example`](../.env.example). El `.env` real nunca se sube al repositorio.

| Variable | Valor de la entrega | Para qué |
| --- | --- | --- |
| `JWT_SECRET` | Texto aleatorio de 32 caracteres o más (lo genera `levantar`) | Firma y validación del JWT. El mismo en los 3 servicios |
| `MYSQL_ROOT_PASSWORD`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` | `root_dev`, `nutrivida`, `nutrivida_dev`, `3306` | MySQL del `docker-compose.yml` (credenciales de desarrollo) |
| `WEB_PORT` | `8080` | Puerto de la app (Nginx) |
| `NUTRIVIDA_USUARIOS_MODO` | `http` | ms-citas consulta a ms-usuarios si la cuenta sigue activa (`auto` y `simulado` quedan para programar) |
| `NUTRIVIDA_CLINICA_MODO` | `http` | ms-citas pide servicios y horarios a ms-clinica |
| `MS_CITAS_PERFILES` | `mysql` | Sin el perfil `dev` (`POST /api/dev/token` no existe en la entrega) |
| `VITE_API_MODE` | `api` | El frontend llama a los microservicios. Sin la variable (Vitest) usa los datos locales de EP2 |

Perfiles de Spring: sin perfil, H2 en memoria (para programar y para las pruebas); `mysql`, la base de Docker (`ddl-auto=validate`: si una entidad no calza con su tabla, el servicio no arranca).

## 5. Pasos para ejecutar

Requisito único: **Docker** (Docker Desktop en Windows y macOS, Docker Engine en Linux). Java, Maven y Node van dentro de las imágenes.

```powershell
git clone https://github.com/Sandy-Yera/NutriVida_Proyect.git
cd NutriVida_Proyect
.\scripts\levantar.ps1          # Windows
./scripts/levantar.sh           # Linux, macOS o Git Bash
```

El script crea `.env` (si falta), ejecuta `docker compose up -d --build`, espera los healthchecks y muestra las URLs. La primera vez tarda varios minutos. Para volver a las semillas: `docker compose down -v` y de nuevo el script.

Cuentas de demostración (ficticias, de las semillas):

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | admin@nutrivida.cl | Admin2026! |
| Secretaria | recepcion@nutrivida.cl | Recepcion2026! |
| Nutricionista | cfuentes@nutrivida.cl (NUT001) | Nutri2026! |
| Paciente | javiera.soto@correo.cl | Paciente2026! |
| Paciente desactivado | pedro.lagos@correo.cl | Paciente2026! |

Tarjetas del pago simulado: 4242 4242 4242 4242 (aprobada) y 4000 0000 0000 0002 (rechazada).

## 6. Pruebas de integración realizadas

| Nivel | Qué | Resultado (26-11-2026) |
| --- | --- | --- |
| JUnit + MockMvc (H2, JWT y seguridad reales) | ms-usuarios, ms-citas y ms-clinica: endpoints, matrices 401/403/200/201 por rol, reglas de dueño, formato de error, Mockito en los services | 78 + 156 + 81 pruebas, 0 fallas |
| Vitest en modo local | Las pantallas y services de EP2 | 490 pruebas, 0 fallas |
| Vitest en modo API (`fetch` simulado) | `accesoApi.test.js`, `modoApi.test.js`, `clinicaApi.test.js`, `PagoApi.test.jsx`: rutas por rol, login real, 401 → `/login`, 403 sin cerrar sesión | Incluidas en las 490 |
| Contenedores | `ddl-auto=validate` contra MySQL, healthchecks, ms-citas en modo `http` con ms-usuarios y ms-clinica, login HS256, `POST /api/dev/token` → 404, contacto anónimo 201, tildes de las semillas. `verificar.ps1` repite el humo con el login real (crear cita, 409, 402, 403, cancelar con reembolso, eliminar, POST por el proxy con `Origin`) | Verificado con peticiones por Nginx; `verificar.ps1` se corre antes de grabar el video |
| Recorrido en el navegador | Login, F5 con `/me`, ruta de otro rol, token vencido e inválido, CRUD de usuarios, Mis citas sin perfil `dev`, contacto anónimo | Sin errores |

Cómo repetirlas: `.\scripts\verificar.ps1` (todo) o `.\scripts\verificar.ps1 -Solo backend|frontend|docker`.

## 7. Documentos relacionados

| Documento | Contenido |
| --- | --- |
| [`manual-usuario.md`](manual-usuario.md) | Manual de usuario con capturas (índice de los 3 módulos) |
| [`ep3/contrato-backend.md`](ep3/contrato-backend.md) | Contrato común: puertos, errores, JWT, roles, integridad |
| [`integracion-ep3.md`](integracion-ep3.md) | Registro de integración por módulo y decisiones técnicas |
| [`ers/`](ers/) | ERS V3 por módulo (03 acceso, 04 citas, 05 clínica) |
