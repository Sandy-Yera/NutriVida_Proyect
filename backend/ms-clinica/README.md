# ms-clinica · puerto 8083 · dueño: Catalina

Servicios, nutricionistas, fichas, mediciones y planes.

Misma estructura que la solución DoggySpa del curso (`model → repository → service → controller`),
más `dto`, `exception` (formato de error común), `security` (JWT) y `config` (Swagger).

## Ejecutar

| Modo | Comando |
| --- | --- |
| **Docker (recomendado)** | Desde la raíz: `docker compose up -d --build` (levanta MySQL y los 3 microservicios) |
| H2 en memoria | `.\mvnw.cmd spring-boot:run` |
| MySQL 8 (Docker) | `.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=mysql"` |
| MySQL + tokens de prueba | `.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=mysql,dev"` |

Para correrlo desde el IDE con MySQL: `docker compose up -d mysql` en la raíz y luego el comando con el perfil `mysql`.

- Swagger: http://localhost:8083/swagger-ui.html
- OpenAPI: http://localhost:8083/v3/api-docs
- Contrato común (errores, JWT, rutas): `documentacion/ep3/contrato-backend.md`

## Endpoints (C-31 a C-33)

| Método y ruta | Quién | Respuestas |
| --- | --- | --- |
| `GET /api/servicios?tipo&texto&soloActivos` | Público (`soloActivos=false`: ADMIN) | 200 · 403 |
| `GET /api/servicios/{codigo}` | Público | 200 · 404 |
| `POST /api/servicios` | ADMIN | 201 · 400 · 409 |
| `PATCH /api/servicios/{codigo}` | ADMIN | 200 · 400 · 404 |
| `PATCH /api/servicios/{codigo}/estado` | ADMIN | 200 |
| `GET /api/nutricionistas`, `/{id}`, `/{id}/foto` | Público | 200 · 404 |
| `PUT` · `DELETE /api/nutricionistas/{id}/foto` | El propio nutricionista o ADMIN | 200/204 · 403 · 413 · 415 |
| `GET /api/pacientes?nutricionistaId` | NUTRICIONISTA (los suyos), ADMIN | 200 · 403 |
| `GET /api/pacientes/{id}` | A cargo, el paciente, ADMIN (otro nutricionista: solo el dueño) | 200 · 403 · 404 |
| `POST /api/pacientes` | NUTRICIONISTA | 201 · 400 · 403 · 409 |
| `GET` · `POST /api/pacientes/{id}/mediciones` | Leer: a cargo, paciente, ADMIN · Escribir: a cargo | 200/201 · 400 · 403 · 404 |
| `GET` · `PUT /api/pacientes/{id}/plan` | Igual que mediciones | 200 · 400 · 403 · 404 |
| `POST /api/contactos` | Cualquiera (hoy pide token: tarea de integración) | 201 · 400 |
| `GET /api/contactos` · `DELETE /api/contactos/{id}` | ADMIN y SECRETARIA · ADMIN | 200 · 204 · 404 |

Pruebas: `mvn test` (80 JUnit: reglas espejo de EP2, catálogo, CRUD y matriz 401/403/200/201).
Peticiones de ejemplo en orden de demo: `peticiones.http`.
