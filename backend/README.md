# Backend NutriVida (EP3)

Tres microservicios Spring Boot independientes (Forma D, sección 0.4), uno por integrante.
Todos siguen la estructura de la solución DoggySpa del curso.

| Microservicio | Puerto | Esquema MySQL | Dueño | Responsabilidad |
| --- | --- | --- | --- | --- |
| `ms-usuarios` | 8081 | `nutrivida_usuarios` | Gabriel | Login, registro, emisión del JWT, usuarios y roles |
| `ms-citas` | 8082 | `nutrivida_citas` | Simon | Citas, disponibilidad, pago simulado, estadísticas |
| `ms-clinica` | 8083 | `nutrivida_clinica` | Catalina | Servicios, nutricionistas, fichas, mediciones, planes |

## Opción A: todo en Docker (recomendada, cualquier equipo)

Solo requiere **Docker** (Docker Desktop en Windows/macOS, Docker Engine en Linux). Java 21, Maven, Node y las dependencias van dentro de las imágenes.

```bash
copy .env.example .env          # Windows (en Linux/macOS: cp .env.example .env) y editar JWT_SECRET
docker compose up -d --build    # MySQL 8 + ms-usuarios + ms-citas + ms-clinica + frontend (Nginx)
```

La primera vez demora varios minutos (descarga imágenes y dependencias); después reutiliza la caché.
Cada cambio de código se aplica con `docker compose up -d --build <servicio>`.

| Qué | URL |
| --- | --- |
| **App completa** (Nginx: frontend + proxy `/api`) | http://localhost:8080 |
| Swagger ms-usuarios | http://localhost:8081/swagger-ui.html |
| Swagger ms-citas | http://localhost:8082/swagger-ui.html |
| Swagger ms-clinica | http://localhost:8083/swagger-ui.html |
| MySQL | `localhost:3306` (usuario y clave del `.env`) |

```
Navegador ─► frontend (Nginx :8080) ─ /api/auth, /api/usuarios, /api/articulos ──► ms-usuarios :8081 ─┐
                                    ─ /api/citas, /api/pagos, /api/disponibilidad ─► ms-citas    :8082 ─┼─► MySQL 8
                                    ─ /api/servicios, /api/nutricionistas, … ──────► ms-clinica  :8083 ─┘  (3 esquemas)
```

Útiles: `docker compose ps`, `docker compose logs -f ms-citas`, `docker compose down` (conserva los datos) y `docker compose down -v` (borra los datos y vuelve a cargar las semillas de `database/`).

## Opción B: un microservicio desde el IDE (para programar)

Requiere JDK 21 (y Node 22 para el frontend). Se deja la base en Docker y se corre lo que se está editando:

```powershell
docker compose up -d mysql
$env:JWT_SECRET = "<el mismo valor del .env>"
cd backend\ms-citas; .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=mysql"
cd frontend; npm run dev        # http://localhost:5173, con el proxy de vite.config.js
```

Si ese microservicio también está corriendo en Docker, detenlo antes (`docker compose stop ms-citas`) para liberar el puerto.

**Regla:** `frontend/vite.config.js` (desarrollo) y `frontend/nginx.conf` (Docker) tienen la misma tabla de rutas `/api/...`. Si se agrega una ruta, se agrega en los dos.

Sin Docker, cada microservicio también arranca solo con H2 en memoria: `.\mvnw.cmd spring-boot:run`.

## Perfiles

| Perfil | Base de datos | Uso |
| --- | --- | --- |
| (ninguno) | H2 en memoria | Probar rápido; los datos se pierden al detener |
| `mysql` | MySQL 8 del `docker-compose.yml` | Docker, desarrollo integrado, video y entrega |
| `dev` | (se suma a otro) | Habilita `POST /api/dev/token` para tokens de prueba. Nunca en la entrega |

## Contrato común

Formato de error, JWT, rutas y reglas compartidas: [`documentacion/ep3/contrato-backend.md`](../documentacion/ep3/contrato-backend.md).
