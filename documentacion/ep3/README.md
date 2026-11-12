# Documentación EP3 · índice, reglas del equipo y traspaso

Punto de partida para cualquier integrante (o asistente como Claude Code) que retome el trabajo de la EP3.
Última actualización: 12/11/2026.

## 1. Orden de lectura

| # | Documento | Qué tiene |
| --- | --- | --- |
| 1 | [`roadmap-simon.md`](roadmap-simon.md) | Decisiones tomadas, estado de cada ítem (R1 a R12), fechas, prioridades, riesgos y pendientes. |
| 2 | [`contrato-backend.md`](contrato-backend.md) | Contrato común de los 3 microservicios: puertos, proxy, **formato de error**, JWT y roles, modo dual, integridad, endpoints de ms-citas y razón del `DELETE`. |
| 3 | [`../../backend/README.md`](../../backend/README.md) | Cómo ejecutar: todo en Docker (opción A) o un microservicio desde el IDE (opción B). |
| 4 | [`../integracion-ep3.md`](../integracion-ep3.md) | Registro de la preparación del frontend (EP2→EP3) y de los **cambios en archivos de otros integrantes**. Sus secciones 1 y 2 quedan como histórico: manda el contrato. |
| 5 | `NutriVida_Plan_Proyecto_Semestral.pdf` (proyecto de claude.ai) | Plan original del equipo, sección 8 (EP3). Lo que cambió está en el roadmap. |

Material oficial del curso (en el PC de Simon, fuera del repo): `Documentacion/ep3_Oficial_Profe/` (instrucciones, rúbrica, guía de video y defensa, solución DoggySpa).

## 2. Reglas del equipo

### Dueños y archivos ajenos

| Área | Gabriel | Simon | Catalina |
| --- | --- | --- | --- |
| Backend | `backend/ms-usuarios`, `database/01_usuarios.sql` | `backend/ms-citas`, `database/02_citas.sql` | `backend/ms-clinica`, `database/03_clinica.sql` |
| Frontend | acceso, contenido, `auth.js`, `usuariosService` | citas, `citasService`, `pagosService` | clínica, `serviciosService`, `fichasService` |
| Base común (G-30) | — | `docker-compose.yml`, `.env.example`, Dockerfiles, `frontend/nginx.conf`, `services/http.js`, `utils/errores.js`, `exception/` y `security/` de los 3 microservicios | — |

- Cada uno modifica **solo lo suyo**. Si es imprescindible tocar un archivo ajeno: se registra en `documentacion/integracion-ep3.md` (archivo, qué cambió y por qué) y se avisa al dueño, que debe poder explicarlo en la defensa.
- `exception/` y `security/` son **iguales en los 3 microservicios** (cambia solo el paquete). Un cambio en uno se replica en los otros dos.

### Git

- Una rama por persona: `ep3/gabriel`, `ep3/simon`, `ep3/catalina`.
- Mensajes con la forma `tipo(módulo): qué cambió`. Tipos: `feat`, `fix`, `test`, `docs`, `style`, `refactor`, `chore`.
- Unión a `main` con `git merge --no-ff`, **nunca squash**: los commits por integrante son evidencia individual.
- Nunca se suben secretos. El `.env` real queda fuera del repo; solo se versiona `.env.example`.

### Contrato (no se cambia sin avisar al equipo)

- **Errores:** todo error responde con el JSON común `timestamp, status, error, mensaje, ruta, errores` (contrato §2). Los services lanzan `ApiException`; ningún controlador arma errores a mano.
- **JWT:** HS256, 8 h, claims `sub, rol, nombre, nutricionistaId`. El mismo `JWT_SECRET` en los 3 servicios. Solo ms-usuarios lo emite.
- **Rutas:** `frontend/vite.config.js` (desarrollo) y `frontend/nginx.conf` (Docker) tienen **la misma tabla** de rutas `/api/...`. Una ruta nueva se agrega en los dos.
- **Datos:**
  - Mismos IDs y nombres de campo JSON que en EP2.
  - Fechas `AAAA-MM-DD`, horas `HH:mm`, zona `America/Santiago`.
  - Sin claves foráneas entre esquemas.
- **Integridad:** toda operación que revisa una regla y escribe es un método `@Transactional` del service. La base es la última barrera (`UNIQUE`, bloqueos).
- **Frontend:**
  - Los services mantienen sus firmas y eligen entre API y datos locales con `usarApi()` (modo dual).
  - Las pruebas de Vitest corren en modo local y **deben seguir pasando**.

### Ejecución y entrega

- La entrega debe poder levantarse con **solo Docker**: `docker compose up -d --build`, en Windows o Linux.
- El perfil `dev` (`POST /api/dev/token`) es solo para programar. No se activa en el video ni en la entrega.

## 3. Estado al 12/11/2026 y siguiente paso

- **Rama `ep3/simon`, sin commit.** Contiene:
  - la base común G-30;
  - los 3 microservicios vacíos;
  - Docker con Nginx;
  - `http.js`;
  - el contrato y el roadmap.
- **Ya probado en el PC de Simon:** ms-usuarios, ms-citas y ms-clinica arrancan con `mvnw.cmd spring-boot:run` (H2).
- **Falta verificar:** el primer `docker compose up -d --build` con los 5 servicios. Antes hay que borrar el contenedor viejo (`docker rm -f nutrivida-mysql`), porque ocupa el puerto 3306.
- **Siguiente ítem:** R3, el modelo de datos de ms-citas y `database/02_citas.sql` (ver roadmap).
- **Notas del entorno:**
  - El PC de Simon usa Java 25 localmente. En Docker siempre es Java 21.
  - `mvnw.cmd` fue corregido para rutas con espacios ("Semestre 4").
  - Si aparece `.git/stale-index-lock-claude`, se puede borrar: es un lock viejo renombrado.

### Encargo sugerido para Claude Code

> Lee `documentacion/ep3/README.md`, `roadmap-simon.md`, `contrato-backend.md` y `backend/README.md`. Respeta las reglas de la sección 2. Verifica la base: `docker compose up -d --build`, que `docker compose ps` muestre los 5 servicios en ejecución, `http://localhost:8080` (app), los Swagger en 8081 a 8083 y que `GET http://localhost:8082/api/citas` sin token responda 401 con el JSON común. Corre `npm test` en `frontend/`. Corrige lo que falle y haz el commit de la base. Luego sigue con R3 y actualiza el estado en `roadmap-simon.md` al terminar cada ítem.
