# Integración EP2

Responsable: Gabriel (tarea G-INT). Rama de entrega: `main`. Tag de entrega: `ep2-entrega`.

## Orden de integración

Todas las uniones se hicieron con `git merge --no-ff`, sin squash, para conservar la autoría de cada commit.

| Fecha | Rama unida | Contenido |
| --- | --- | --- |
| 11-10-2026 | `ep2/catalina` | C-01 a C-11: sitio público, ficha clínica y servicios. |
| 11-10-2026 | `ep2/gabriel` | G-00 a G-10: acceso, roles y administración. |
| 11-10-2026 | `main` y las 3 ramas | README en la raíz, idéntico en todas las ramas. |
| 18-10-2026 | `ep2/catalina` | Solo la copia del README; sin cambios de código. |
| 18-10-2026 | `ep2/simon` | S-01 a S-10: citas, pagos simulados y agendas. |
| 18-10-2026 | `ep2/gabriel` | Solo la copia del README; sin cambios de código. |

El plan pedía unir en el orden catalina, simon, gabriel. En la primera parte se unió `ep2/gabriel` antes que `ep2/simon` porque Simon hizo sus commits al final; la segunda parte vuelve al orden del plan. No hubo conflictos en ninguna unión.

## Cambios en archivos de otro integrante

| Archivo | Dueño | Qué cambió | Por qué |
| --- | --- | --- | --- |
| `frontend/src/components/citas/TablaCitasAdmin.jsx` | Simon | La tabla quedó dentro de `<div className="table-responsive">`. | Entre 768 y 1280 px la tabla de `/admin/citas` era más ancha que la pantalla (831 px en una de 768 px) y movía toda la página hacia el lado. Ahora solo se desplaza la tabla dentro de su caja; bajo 768 px sigue como lista de tarjetas. |
| `frontend/src/components/clinica/TablaServicios.jsx` | Catalina | La tabla se muestra desde 1200 px (`d-xl-table`) y la lista hasta 1199 px (`d-xl-none`); antes el corte era 992 px. | A 992 px, con la barra lateral del panel, la tabla de `/admin/servicios` sobresalía 117 px y movía la página. |

Cada dueño fue avisado para que pueda explicar el cambio en la defensa.

## Cambios en archivos propios

- `documentacion/ers/.gitignore`: excepciones para las 5 secciones del ERS (01 a 05). Los archivos ya estaban versionados; las excepciones dejan explícito que forman parte del repositorio.
- `.gitignore` de la raíz: excepción para este archivo.

## Decisiones del equipo

- Los comentarios del código del módulo de citas se mantienen (decisión del 18-10-2026).
- El panel de usuarios usa `DialogoConfirmacion` (Gabriel) y el de servicios `ConfirmarDesactivacion` (Catalina). Se mantienen los dos para que cada dueño explique el suyo.

## Verificación del 18-10-2026

- Ningún service quedó como stub: `usuariosService` (usuariosData), `citasService` (citasData y pagosData), `pagosService` (pagosData), `serviciosService` (serviciosData y contactosData; los nutricionistas son datos estáticos) y `fichasService` (fichasData).
- `npm test`: 62 archivos y 396 pruebas en verde, incluidas las 12 oficiales (G-T1 a G-T4, S-T1 a S-T4 y C-T1 a C-T4).
- `npm run lint` sin errores y Prettier sin diferencias.
- `npm run build` sin advertencias: paquete principal de 455 kB; Leaflet y Recharts se cargan en diferido.
- `npm run test:coverage`: 93,51 % de sentencias, 83,30 % de ramas, 94,28 % de funciones y 94,69 % de líneas. El detalle está en el documento de cobertura (G-11).
- Recorrido por rol con los usuarios demo:
  - Paciente: solicita una cita, paga con la tarjeta rechazada y luego con la aprobada, la ve en Mis citas y cancela otra con reembolso.
  - Secretaria: confirma una cita y marca una inasistencia.
  - Nutricionista: marca la cita como atendida, abre la ficha, la crea y registra una medición.
  - Paciente: ve la medición nueva en Mi progreso.
  - Administrador: crea un usuario, edita un servicio y revisa el dashboard y los reportes.
- Responsive: 21 rutas revisadas en 360, 768, 992 y 1280 px, sin desplazamiento horizontal de la página.
- Clon limpio en otra carpeta: `npm install`, `npm run dev` y `npm test` funcionan.

## Entrega

- Tag `ep2-entrega` sobre `main`, después de esta integración.
- Zip `DSY1104-SSS-GXX-EP2.zip` con `frontend/` sin `node_modules`, generado con `git archive` desde el tag.
- Repositorio público y enlaces probados en una ventana de incógnito.
