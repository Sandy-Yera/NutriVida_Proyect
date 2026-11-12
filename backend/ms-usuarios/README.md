# ms-usuarios · puerto 8081 · dueño: Gabriel

Identidad, inicio de sesión, emisión del JWT, roles y perfil.

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

- Swagger: http://localhost:8081/swagger-ui.html
- OpenAPI: http://localhost:8081/v3/api-docs
- Contrato común (errores, JWT, rutas): `documentacion/ep3/contrato-backend.md`
