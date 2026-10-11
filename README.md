# NutriVida · Frontend (EP2)

Clínica Nutricional NutriVida, Temuco. DSY1104 Desarrollo Fullstack II, Forma D, 2026-2.
React + Vite, React Router 7, Bootstrap 5, Vitest + React Testing Library.

## Requisitos

- Node.js 22 LTS y npm 10 o superior.

## Comandos

| Comando                  | Qué hace                                     |
| ------------------------ | -------------------------------------------- |
| `npm install`            | Instala exactamente lo del package-lock.json |
| `npm run dev`            | Servidor de desarrollo en localhost:5173     |
| `npm test`               | Ejecuta las pruebas una vez                  |
| `npm run test:watch`     | Pruebas en modo observación                  |
| `npm run test:coverage`  | Informe de cobertura en coverage/index.html  |
| `npm run build`          | Build de producción en dist/                 |
| `npm run lint`           | Revisión con ESLint                          |
| `npx prettier --write .` | Formato común según .prettierrc              |

Todos se ejecutan dentro de `frontend/`.

## Usuarios de demostración

| Rol           | Correo                  | Clave          |
| ------------- | ----------------------- | -------------- |
| Admin         | admin@nutrivida.cl      | Admin2026!     |
| Secretaria    | recepcion@nutrivida.cl  | Recepcion2026! |
| Nutricionista | cfuentes@nutrivida.cl   | Nutri2026!     |
| Nutricionista | rsepulveda@nutrivida.cl | Nutri2026!     |
| Nutricionista | dmorales@nutrivida.cl   | Nutri2026!     |
| Nutricionista | faraya@nutrivida.cl     | Nutri2026!     |
| Paciente      | javiera.soto@correo.cl  | Paciente2026!  |
| Paciente      | tomas.h@correo.cl       | Paciente2026!  |
| Paciente      | ana.perez@correo.cl     | Paciente2026!  |

La sesión y las claves en el navegador son una simulación académica de EP2. En EP3 se reemplazan por BCrypt y JWT en el servidor.

## Tarjetas de prueba (pago simulado)

| Número              | Resultado |
| ------------------- | --------- |
| 4242 4242 4242 4242 | Aprobada  |
| 4000 0000 0000 0002 | Rechazada |

## Datos simulados

Cada módulo persiste en `localStorage` con claves `nv_*`. Para volver a los datos semilla (por ejemplo, antes de grabar el video) ejecutar `restablecerDatosDemo()` de `src/data/almacen.js`.

## Estructura y dueños

| Carpeta              | Gabriel                                | Simon                      | Catalina                          |
| -------------------- | -------------------------------------- | -------------------------- | --------------------------------- |
| `src/rutas/`         | rutasAcceso.jsx                        | rutasCitas.jsx             | rutasClinica.jsx                  |
| `src/components/`    | comunes/Navbar, RutaProtegida, acceso/ | citas/                     | comunes/Footer, clinica/          |
| `src/pages/`         | acceso/, contenido/                    | citas/                     | clinica/                          |
| `src/services/`      | usuariosService                        | citasService, pagosService | serviciosService, fichasService   |
| `src/utils/`         | validaciones, formato                  | citas, pagos               | clinica                           |
| `src/data/semillas/` | usuarios, articulos                    | citas, pagos               | servicios, nutricionistas, fichas |

## Flujo de Git

- Mensajes: `tipo(módulo): qué cambió`. Tipos: feat, fix, test, docs, style, refactor, chore.
- Unión con `git merge --no-ff`, nunca squash. Tag de entrega: `ep2-entrega`.
