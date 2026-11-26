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
