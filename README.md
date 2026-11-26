# NutriVida · Clínica Nutricional (EP3)

DSY1104 Desarrollo Fullstack II · Forma D "Clínica Nutricional NutriVida", Temuco · Sección 005 · 2026-2.

Aplicación web de la clínica: catálogo de servicios, solicitud y pago simulado de citas, agendas, fichas nutricionales y administración, con 4 roles (paciente, secretaria, nutricionista y administrador). Frontend React integrado por REST con 3 microservicios Spring Boot y MySQL, con autenticación JWT y control de acceso por rol.

| Integrante | Módulo | Backend | Frontend |
| --- | --- | --- | --- |
| Gabriel | Acceso y administración | `backend/ms-usuarios` (:8081) | acceso, contenido, `auth.js`, `usuariosService` |
| Simon | Citas y pago | `backend/ms-citas` (:8082) | citas, `citasService`, `pagosService` |
| Catalina | Clínica | `backend/ms-clinica` (:8083) | clínica, `serviciosService`, `fichasService` |

## Repositorio

Un solo repositorio con el frontend y el backend en carpetas separadas:

| Carpeta | Contenido |
| --- | --- |
| [`frontend/`](frontend/) | **Frontend**: React 19 + Vite, React Router 7, Bootstrap 5, Vitest. `nginx.conf` sirve el build y hace de proxy de `/api` |
| [`backend/`](backend/) | **Backend**: `ms-usuarios`, `ms-citas` y `ms-clinica` (Spring Boot 4.1, Java 21, JPA, Spring Security + JWT, Swagger) |
| [`database/`](database/) | Esquemas y semillas de MySQL 8.4 (uno por microservicio) |
| [`scripts/`](scripts/) | `levantar.ps1` / `levantar.sh` (arranque en un paso) y `verificar.ps1` (pruebas y humo) |
| [`documentacion/`](documentacion/) | Documento de integración, manual de usuario, ERS y contrato |
| `docker-compose.yml` | MySQL + 3 microservicios + frontend, con healthchecks |

## Ejecutar (solo se necesita Docker)

Requisito: Docker Desktop (Windows y macOS) o Docker Engine (Linux). Java, Maven y Node van dentro de las imágenes.

```powershell
git clone https://github.com/Sandy-Yera/NutriVida_Proyect.git
cd NutriVida_Proyect
.\scripts\levantar.ps1      # Windows (PowerShell)
./scripts/levantar.sh       # Linux, macOS o Git Bash
```

El script crea `.env` desde `.env.example` con un `JWT_SECRET` aleatorio (si no existe), ejecuta `docker compose up -d --build`, espera a que los servicios queden *healthy* y muestra las URLs. La primera vez tarda varios minutos.

Sin el script: `copy .env.example .env` (o `cp`), definir `JWT_SECRET` (32 caracteres o más) y `docker compose up -d --build`.

| Qué | URL |
| --- | --- |
| Aplicación | http://localhost:8080 |
| Swagger ms-usuarios | http://localhost:8081/swagger-ui.html |
| Swagger ms-citas | http://localhost:8082/swagger-ui.html |
| Swagger ms-clinica | http://localhost:8083/swagger-ui.html |

Volver a los datos de demostración: `docker compose down -v` y de nuevo el script.

### Cuentas de demostración

Credenciales ficticias de las semillas (`database/01_usuarios.sql`). En Swagger: `POST /api/auth/login` en :8081, copiar el `token` y pegarlo en **Authorize**.

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | admin@nutrivida.cl | Admin2026! |
| Secretaria | recepcion@nutrivida.cl | Recepcion2026! |
| Nutricionista | cfuentes@nutrivida.cl (también rsepulveda, dmorales, faraya) | Nutri2026! |
| Paciente | javiera.soto@correo.cl (también tomas.h, ana.perez) | Paciente2026! |
| Paciente desactivado | pedro.lagos@correo.cl | Paciente2026! |

Pago simulado: 4242 4242 4242 4242 (aprobada) · 4000 0000 0000 0002 (rechazada).

## Pruebas

| Qué | Comando | Resultado |
| --- | --- | --- |
| Todo (JUnit en Docker, Vitest, contenedores y humo) | `.\scripts\verificar.ps1` | Tabla PASA/FALLA |
| JUnit de un microservicio | `cd backend\ms-usuarios; .\mvnw.cmd test` | ms-usuarios 78 · ms-citas 156 · ms-clinica 81 |
| Frontend | `cd frontend; npm ci; npm test` | 490 pruebas |

## Documentación

| Documento | Para qué |
| --- | --- |
| [Documento de integración frontend–backend](documentacion/documento-integracion.md) | Arquitectura, componentes, flujo REST, configuración, pasos y pruebas de integración |
| [Manual de usuario](documentacion/manual-usuario.md) | Uso por módulo y por rol, con capturas |
| [Contrato del backend](documentacion/ep3/contrato-backend.md) | Errores, JWT, roles, puertos e integridad comunes a los 3 servicios |
| [Registro de integración](documentacion/integracion-ep3.md) | Detalle por módulo y decisiones técnicas |
| [ERS V3](documentacion/ers/) | Requisitos por módulo |

## Flujo de Git

- Una rama por integrante (`gabriel-ep3`, `catalina-ep3`, `simon-ep3`) y unión a `main` con `git merge --no-ff`, nunca squash.
- Mensajes `tipo(módulo): qué cambió` (feat, fix, test, docs, style, refactor, chore).
- Nunca se suben secretos: el `.env` real está en `.gitignore`; solo se versiona `.env.example`.
