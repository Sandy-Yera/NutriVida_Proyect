# 1. Introducción

ERS V2 (Especificación de Requisitos de Software) del sistema NutriVida. Corresponde a la etapa EP2 del ramo DSY1104 Desarrollo Fullstack II (Duoc UC, 2026-2): frontend en React con datos simulados en el navegador.

Consolida: Simon (tarea S-10). Cada módulo escribe su propia sección (03, 04 y 05); esta introducción y la sección 2 son comunes.

## 1.1 Propósito

Este documento describe qué hace el sistema, para quién, con qué reglas y cómo se verifica cada requisito. Sirve para:

- Que el equipo construya cada módulo con el mismo contrato (rutas, datos y funciones).
- Que el docente pueda seguir cada requisito hasta la vista que lo implementa y la prueba que lo verifica (trazabilidad).
- Dejar escritas las decisiones y los datos que el caso no entrega.

## 1.2 El negocio

NutriVida es una clínica de nutrición de Temuco con 4 nutricionistas, que atiende unos 60 pacientes por semana. Hoy la agenda, las fichas y los planes alimenticios se llevan en papel.

El sistema reemplaza ese proceso con una aplicación web:

- Los pacientes agendan, pagan, cancelan y reprograman sus citas sin llamar por teléfono.
- Los nutricionistas registran mediciones y planes alimenticios en digital.
- La clínica obtiene estadísticas: atenciones por período, tasa de inasistencia y distribución por nutricionista.

**Flujo principal (el "pedido" del caso):** el paciente elige un servicio, un nutricionista, una fecha y una hora, escribe el motivo y paga (pago simulado). La cita queda Pendiente; la secretaria la confirma; el paciente puede cancelar o reprogramar hasta 24 h antes; el nutricionista la marca como Atendida o la secretaria la marca como Inasistencia.

## 1.3 Actores

| Actor | Qué puede hacer |
| --- | --- |
| Visitante (sin sesión) | Recorre el sitio público (inicio, servicios, planes, la clínica y su equipo, consejos y contacto), se registra como paciente e inicia sesión. |
| Paciente | Solicita y paga citas; ve, cancela y reprograma sus citas; ve su progreso, su plan alimenticio y su próxima cita; edita su perfil. |
| Secretaria | Gestiona la agenda de los 4 nutricionistas: confirma, reprograma, cancela y marca inasistencias. No ve fichas ni mediciones. |
| Nutricionista | Ve su agenda, marca las citas como atendidas, y gestiona las fichas, mediciones y planes solo de sus pacientes. |
| Administrador | Gestiona usuarios, roles y servicios; ve el dashboard, los reportes y todas las citas con sus comprobantes de pago. |

El rol Secretaria lo agregó el equipo como cuarto rol: es quien gestiona las agendas en el caso.

## 1.4 Alcance de EP2

Incluido:

- Las vistas de los 4 roles, con navegación por rol y rutas protegidas.
- Datos en archivos JavaScript con CRUD, guardados en `localStorage` y entregados por *services* asíncronos que imitan una API.
- Inicio de sesión, registro y roles simulados en el navegador.
- Pago simulado con tarjetas de prueba.
- Pruebas unitarias con Vitest y React Testing Library: 12 pruebas comprometidas (4 por integrante) y pruebas extra que suben la cobertura.

Fuera de alcance en EP2:

- **Inscripción a talleres grupales** (TG001 a TG003): se muestran en el catálogo, pero se inscriben en recepción.
- **Videollamada real** en la teleconsulta: solo se agenda la hora.
- **Pagos reales:** el pago es simulado y no se envía a ningún banco.
- **Envío de recordatorios** por correo: en EP2 el recordatorio es un aviso dentro de Mis citas.
- **Backend, base de datos y seguridad real** (BCrypt, JWT y validación en el servidor): llegan en EP3.

## 1.5 Organización del documento

| Sección | Contenido | Responsable |
| --- | --- | --- |
| 1. Introducción | Propósito, negocio, actores, alcance y glosario. | Simon |
| 2. Requisitos generales | Requisitos no funcionales, decisiones técnicas, rutas, modelo de datos, contratos entre módulos, datos asumidos y pruebas. | Simon |
| 3. Módulo de acceso y administración | RF-ACC-01 a RF-ACC-09. | Gabriel |
| 4. Módulo de citas | RF-CIT-01 a RF-CIT-09. | Simon |
| 5. Módulo clínico | RF-CLI-01 a RF-CLI-08. | Catalina |

Cada sección de módulo tiene la misma estructura: alcance, actores, requisitos funcionales (con reglas, criterio de aceptación y pruebas), datos, interfaces que ofrece, requisitos no funcionales propios, registro de pruebas, trazabilidad y datos asumidos.

## 1.6 Glosario

| Término | Significado |
| --- | --- |
| Bloque | Tramo de 30 minutos de la agenda de un nutricionista. Un servicio de 50 min ocupa 2 bloques seguidos. |
| Jornada | Días y horario en que atiende un nutricionista (por ejemplo, Daniela Morales: lunes a viernes de 08:00 a 13:00). |
| Service | Archivo de JavaScript que ofrece funciones asíncronas a las vistas (por ejemplo, `citasService.js`). En EP3 llamará a la API sin que las vistas cambien. |
| Contrato | Lo que los módulos acuerdan para trabajar por separado: rutas, forma de los datos y firmas de los services. |
| Semilla | Datos de demostración con los que parte la aplicación (usuarios, servicios, citas, pagos y fichas). |
| RN-xx | Regla de negocio numerada. Cada requisito indica qué reglas cumple. |
| Pago simulado | Pago que se valida y se resuelve en el navegador, sin banco. Guarda solo los 4 últimos dígitos de la tarjeta. |
| Teleconsulta | Consulta online por video (CN004). Requiere una atención presencial previa. |
