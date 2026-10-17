# 4. Módulo de citas: solicitud, pago simulado y agendas

Responsable: Simon. Tareas S-01 a S-10 del plan del proyecto. ERS V2 (EP2, frontend React con datos simulados).

## 4.1 Alcance

El módulo es el "pedido" del caso: el flujo completo de una cita, desde que el paciente la solicita y la paga hasta que queda Atendida o en Inasistencia. Incluye el asistente para solicitar una cita, el pago simulado, Mis citas (ver, cancelar y reprogramar), la agenda de la secretaria, la agenda del nutricionista y la vista de citas del administrador con el comprobante del pago.

El módulo no administra servicios ni nutricionistas: los lee del módulo clínico (`serviciosService`). Tampoco maneja la sesión: la lee del módulo de acceso (`auth.js`).

**Estado en esta versión:** los 9 requisitos (RF-CIT-01 a RF-CIT-09) están construidos y probados.

## 4.2 Actores

| Actor | Qué hace en este módulo |
| --- | --- |
| Paciente | Solicita una cita, la paga, ve sus citas y las cancela o reprograma con más de 24 h de anticipación. |
| Secretaria | Ve la agenda de los 4 nutricionistas; confirma, reprograma, cancela y marca inasistencias. No ve fichas ni mediciones. |
| Nutricionista | Ve solo sus citas, las marca como atendidas o como inasistencia y abre la ficha del paciente. |
| Administrador | Ve todas las citas con filtros, el total de montos y el comprobante de cada pago. También entra a la agenda de la secretaria. |

## 4.3 Ciclo de vida de una cita

Estados: `PENDIENTE`, `CONFIRMADA`, `ATENDIDA`, `CANCELADA` e `INASISTENCIA`.

| Estado actual | Puede pasar a |
| --- | --- |
| PENDIENTE | CONFIRMADA o CANCELADA |
| CONFIRMADA | ATENDIDA, INASISTENCIA o CANCELADA |
| ATENDIDA, CANCELADA, INASISTENCIA | Ninguno: son estados finales |

- Toda cita nace PENDIENTE, después de un pago aprobado (RN-03).
- Reprogramar no es un cambio de estado: es una operación aparte que deja la cita en PENDIENTE con la nueva fecha y hora, y solo se permite desde PENDIENTE o CONFIRMADA (RN-05).
- Cada cambio de estado y cada reprogramación agrega una entrada al historial de la cita: `{ fecha, de, a, por }` (RN-04).
- Al cancelar una cita, su pago pasa a REEMBOLSADO (RN-08).

## 4.4 Requisitos funcionales

### RF-CIT-01 Solicitar una cita

- **Descripción:** el paciente elige un servicio, un nutricionista, una fecha y una hora, escribe el motivo y revisa el resumen con el precio antes de ir al pago.
- **Actores:** paciente.
- **Prioridad:** alta.
- **Vista:** `/citas/solicitar` (`pages/citas/SolicitarCita.jsx`), con `PasosWizard`, `SelectorHorario`, `ResumenCita` y `ChipEstado`.
- **Pasos:** (1) servicio, (2) nutricionista, (3) fecha y hora, (4) motivo y resumen. El botón final es "Ir al pago".
- **Reglas:**
  - Solo se agendan Consultas, Evaluaciones y Planes activos. Los talleres no se agendan aquí (RN-15).
  - La fecha va desde hoy hasta 60 días adelante (RN-13).
  - El motivo, sin espacios al inicio ni al final, tiene entre 10 y 300 caracteres (RN-14).
  - No se avanza sin completar el paso: el botón queda deshabilitado y debajo se explica qué falta (RN-17).
  - Acepta `?servicio=` y `?nutricionista=` en la URL (contrato con el módulo clínico) y parte en el primer paso que falta. Un código que no se puede agendar se ignora con un aviso (RN-17).
  - La selección se guarda en `sessionStorage` (`nv_reserva`): no se pierde con F5 ni al ir al pago. Si la guardó otro paciente en la misma pestaña, se descarta (RN-17).
  - Cambiar un paso borra lo que dependía de él: otro nutricionista borra la fecha y la hora; otra fecha borra la hora.
  - El resumen informa que la solicitud quedará Pendiente hasta que la clínica la confirme (RN-03).
- **Criterio de aceptación:** desde el botón "Agendar con Daniela" del módulo clínico, el asistente parte en el paso 1 con Daniela ya elegida; al completar los 4 pasos llega al pago, y F5 no pierde la selección.
- **Pruebas:** `SolicitarCita.test.jsx`, `ComponentesCita.test.jsx`, `reservaData.test.js` y `utils/citas.test.js` (`primerPasoIncompleto`, `rangoFechasCita`, `validarMotivo`, `validarFechaCita`).

### RF-CIT-02 Mostrar solo horarios dentro de la jornada y libres

- **Descripción:** el paso 3 muestra todos los bloques de la jornada del nutricionista ese día. Los que no se pueden elegir aparecen deshabilitados.
- **Actores:** paciente (también se usa al reprogramar).
- **Prioridad:** alta.
- **Componentes y lógica:** `SelectorHorario` (props `horarios`, `ocupados`, `seleccionado`, `onSeleccionar`), `generarBloques`, `horariosDisponibles` y `horasNoElegibles`.
- **Reglas:**
  - Bloques de 30 min entre la hora de inicio y de término del nutricionista, solo los días en que atiende. Si no atiende ese día, se muestra "Ese día no hay atención. Elige otra fecha." (RN-09).
  - Un bloque está ocupado si lo usa una cita PENDIENTE o CONFIRMADA del mismo nutricionista y fecha (RN-10).
  - Un servicio de 50 min necesita 2 bloques seguidos, libres y dentro de la jornada; los de 30 min o menos, 1. Los planes ocupan 1 bloque (RN-11).
  - Si la fecha es hoy, no se ofrecen horas ya pasadas (RN-12).
  - La prop `ocupados` contiene todos los bloques **no elegibles**: tomados, pasados o donde el servicio no cabe completo.
- **Criterio de aceptación:** Daniela Morales un lunes muestra 10 bloques (08:00 a 12:30); con una cita a las 09:00, ese bloque sale deshabilitado.
- **Pruebas:** S-T1, S-T3, más `horariosDisponibles` y `chocaConOtraCita` en `utils/citas.test.js` y `citasService.test.js`.

### RF-CIT-03 Pago simulado con resultado aprobado o rechazado

- **Descripción:** el paciente paga la cita con una tarjeta simulada. Si el pago se aprueba, se crea la cita; si se rechaza, ve el motivo y puede intentar con otra tarjeta.
- **Actores:** paciente.
- **Prioridad:** alta.
- **Vistas:** `/citas/pago` (`Pago.jsx` con `ResumenCita` y `FormPago`), `/citas/pago/exito/:citaId` (`PagoExitoso.jsx`) y `/citas/pago/error` (`PagoError.jsx`).
- **Campos:** titular, número de tarjeta, vencimiento (MM/AA) y CVV.
- **Reglas:**
  - Tarjeta de 16 dígitos que pase el algoritmo de Luhn, vencimiento MM/AA no vencido, CVV de 3 dígitos y titular de al menos 3 letras. Los errores aparecen bajo cada campo con role="alert" (RN-18).
  - La tarjeta 4000 0000 0000 0002 se rechaza; cualquier otra tarjeta válida se aprueba (RN-19).
  - Solo se guardan los 4 últimos dígitos (`ultimos4`), nunca el número completo (RN-20).
  - Aviso siempre visible: "Pago simulado: no se envían datos a ningún banco.". El botón dice "Pagar $35.000" y se deshabilita mientras procesa (RN-21, RN-23).
  - **Antes de cobrar**, la página revisa que la reserva siga siendo válida (hora libre, fecha, motivo y teleconsulta). Si no lo es, no muestra el formulario y ofrece volver a la solicitud.
  - Pago aprobado: se crea la cita PENDIENTE con su `pagoId`, se borra `nv_reserva` y se va a la pantalla de éxito, que dice "Solicitud enviada" y muestra la tarjeta terminada en sus 4 últimos dígitos (RN-22).
  - Pago rechazado: se va a la pantalla de error con el motivo y "Intentar con otra tarjeta". La reserva sigue intacta (RN-22).
  - Si el pago se aprueba pero la cita no se puede crear (otro paciente tomó la hora en ese instante), el pago se reembolsa automáticamente y se informa que no se hizo ningún cobro.
  - La pantalla de éxito solo muestra citas del paciente en sesión (RN-24).
- **Criterio de aceptación:** con 4242 4242 4242 4242 se crea la cita y se llega a "Solicitud enviada"; con 4000 0000 0000 0002 se llega a la pantalla de error y no se crea ninguna cita.
- **Pruebas:** S-T4, más `Pago.test.jsx`, `PagoResultado.test.jsx`, `utils/pagos.test.js` y `pagosService.test.js`.

### RF-CIT-04 Paciente: ver, cancelar y reprogramar sus citas

- **Descripción:** el paciente ve sus citas en dos pestañas, Próximas e Historial, y puede cancelar o reprogramar las próximas.
- **Actores:** paciente.
- **Prioridad:** alta.
- **Vista:** `/mis-citas` (`MisCitas.jsx` con `TarjetaCita`, `PanelReprogramar` (que usa `SelectorHorario`) y `DialogoConfirmacion`). Es la vista a la que llega el paciente después del login y del registro.
- **Reglas:**
  - Solo se muestran las citas del paciente en sesión (RN-24).
  - Próximas: las PENDIENTE y CONFIRMADA que no han empezado, de la más cercana a la más lejana. Historial: todas las demás, de la más reciente a la más antigua.
  - Cancelar y reprogramar solo se permiten con más de 24 h de anticipación. Si no, en vez de los botones se muestra "Ya no puedes cancelar: faltan menos de 24 h. Llama a la clínica." (RN-06).
  - Cancelar pide confirmación en un diálogo; al confirmar, la cita queda CANCELADA y el pago REEMBOLSADO (RN-08).
  - Reprogramar reutiliza `SelectorHorario`; la propia cita no ocupa su horario. La cita queda PENDIENTE con la nueva fecha y hora (RN-05).
  - Después de cancelar o reprogramar, la lista se actualiza sin recargar la página.
  - Sin citas se muestra "Aún no tienes citas." con el botón Solicitar cita (RN-32).
- **Mensajes (role="status"):** "Cita cancelada. El pago quedó reembolsado." y "Cita reprogramada para el … a las …. Queda pendiente hasta que la clínica la confirme.".
- **Criterio de aceptación:** al cancelar la cita de Tomás (C0005), pasa al historial como Cancelada sin recargar y su pago queda reembolsado.
- **Pruebas:** `MisCitas.test.jsx`, más `puedeCancelar` y `separarProximasEHistorial` en `utils/citas.test.js`.

### RF-CIT-05 Recordatorio 24 h antes

- **Descripción:** si el paciente tiene una cita CONFIRMADA a la que le faltan 24 h o menos, Mis citas muestra un aviso arriba.
- **Actores:** paciente.
- **Prioridad:** media.
- **Vista:** `/mis-citas`.
- **Reglas:** el aviso (role="status") indica la fecha, la hora y el nutricionista (RN-07). En EP2 es visible en la página; en EP3 se enviará de forma automática.
- **Criterio de aceptación:** con la semilla, Javiera ve el recordatorio de su cita C0003 (CONFIRMADA) cuando faltan 24 h o menos para ella.
- **Pruebas:** `MisCitas.test.jsx` y `necesitaRecordatorio` en `utils/citas.test.js`.

### RF-CIT-06 Secretaria: agenda de los 4 nutricionistas y sus acciones

- **Descripción:** la secretaria ve la agenda del día de los 4 nutricionistas y gestiona las citas.
- **Actores:** secretaria y administrador.
- **Prioridad:** alta.
- **Vista:** `/secretaria/agenda` (`AgendaSecretaria.jsx` con `GrillaAgenda`, `PanelReprogramar`, `ChipEstado` y `DialogoConfirmacion`).
- **Reglas:**
  - Escritorio: filas por bloque de 30 min, desde la primera hora de inicio hasta la última de término del equipo, y una columna por nutricionista. Móvil: una pestaña por nutricionista. Los bloques fuera de la jornada se muestran con "—"; el segundo bloque de una consulta de 50 min, con "↳ continúa" (RN-09, RN-11, RN-33).
  - Navegación por día (día anterior, hoy, día siguiente y calendario), filtro por estado y contador de pendientes del día.
  - Al tocar una cita se abre un panel con el paciente, el servicio, el nutricionista, la fecha, el motivo y el historial (cada cambio con fecha, estado anterior, estado nuevo y quién lo hizo) (RN-04).
  - Las acciones salen de las transiciones permitidas para el estado de la cita, sin Marcar atendida, que es del nutricionista: PENDIENTE ofrece Confirmar y Cancelar; CONFIRMADA ofrece Marcar inasistencia y Cancelar; ambas ofrecen Reprogramar. Los estados finales muestran "Estado final: esta cita ya no cambia." (RN-02, RN-25).
  - Cancelar y Marcar inasistencia piden confirmación en un diálogo, porque no se pueden deshacer. Al cancelar, el pago queda REEMBOLSADO (RN-08).
  - La secretaria no tiene el límite de 24 h: gestiona las ausencias de los nutricionistas (RN-05, RN-06).
  - La secretaria no ve fichas ni mediciones: la agenda no tiene enlaces a la ficha (RN-25).
- **Mensajes (role="status"):** "Cita confirmada.", "Inasistencia registrada.", "Cita cancelada. El pago quedó reembolsado." y "Cita reprogramada para el … a las …. Queda pendiente.".
- **Criterio de aceptación:** desde la cuenta de Marta Ríos se confirma la cita C0004 y se marca una inasistencia.
- **Pruebas:** `AgendaSecretaria.test.jsx`, `GrillaAgenda.test.jsx`, y `armarAgenda` y `accionesSecretaria` en `utils/citas.test.js`.

### RF-CIT-07 Nutricionista: agenda propia, marcar atendida y abrir la ficha

- **Descripción:** el nutricionista ve sus citas del día y de la semana, y registra si el paciente asistió.
- **Actores:** nutricionista.
- **Prioridad:** alta.
- **Vista:** `/nutricionista/agenda` (`AgendaNutricionista.jsx`, con `ChipEstado` y `DialogoConfirmacion`).
- **Reglas:**
  - Solo ve sus citas, según el `nutricionistaId` de la sesión. Si su usuario no está vinculado a un nutricionista, se le pide que hable con el administrador (RN-26).
  - Dos vistas: Día y Semana (lunes a sábado, agrupada por día), con navegación anterior, hoy y siguiente. Al cambiar de día o de vista, la barra de navegación se mantiene y solo la lista muestra "Cargando".
  - Cada cita muestra la hora, el paciente, el servicio, el motivo y su estado.
  - Solo una cita CONFIRMADA se marca como atendida o inasistencia (RN-02). Una cita PENDIENTE muestra "Pendiente de confirmación de la secretaría.".
  - Marcar atendida se aplica directo (es lo habitual al terminar la consulta); Marcar inasistencia pide confirmación, porque no se puede deshacer. Cada cambio queda en el historial con el nutricionista que lo hizo (RN-04).
  - El enlace "Abrir ficha" lleva a `/nutricionista/pacientes/:pacienteId`, con el id del usuario paciente (contrato con el módulo clínico).
- **Mensajes (role="status"):** "Cita marcada como atendida." e "Inasistencia registrada.".
- **Criterio de aceptación:** Daniela Morales ve solo sus citas y desde una de ellas llega a la ficha del paciente.
- **Pruebas:** `AgendaNutricionista.test.jsx`, y `accionesNutricionista` y `diasDeLaSemana` en `utils/citas.test.js`.

### RF-CIT-08 Administrador: listado de citas y comprobante del pago

- **Descripción:** el administrador revisa todas las citas y el comprobante de cada pago.
- **Actores:** administrador.
- **Prioridad:** media.
- **Vistas:** `/admin/citas` (`AdminCitas.jsx` con `FiltroCitas` y `TablaCitasAdmin`) y `/admin/citas/:id` (`AdminCitaDetalle.jsx` con `HistorialCita` y `ComprobantePago`), dentro del panel de administración.
- **Reglas:**
  - Tabla con todas las citas, de la más reciente a la más antigua: n.° de cita, fecha y hora, paciente, nutricionista, servicio, estado, estado del pago y monto. En el móvil pasa a lista de tarjetas (`.tabla-lista`).
  - Filtros por estado, nutricionista y rango de fechas, todos opcionales. Si las dos fechas están y la de inicio es posterior, se muestra "La fecha de inicio debe ser anterior o igual a la de término." (la misma regla de los reportes). Con algún filtro activo aparece "Limpiar filtros".
  - Arriba, la cantidad de citas y el total recaudado de las citas filtradas. El total suma solo los pagos APROBADOS: los rechazados no se cobraron y los reembolsados se devolvieron (RN-27).
  - El detalle muestra la cita, su historial (con quién hizo cada cambio) y el comprobante: n.° de pago, fecha, servicio, monto, estado y "Terminada en" con los últimos 4 dígitos (RN-04, RN-20, RN-23, RN-27).
  - Si la cita no existe se muestra "La cita … no existe." con el enlace para volver.
- **Criterio de aceptación:** el administrador abre una cita desde la tabla y ve su comprobante.
- **Pruebas:** `AdminCitas.test.jsx`, `AdminCitaDetalle.test.jsx` y `totalRecaudado` en `utils/pagos.test.js`.

### RF-CIT-09 Teleconsulta solo con una atención presencial previa

- **Descripción:** la teleconsulta (CN004) solo se puede agendar si el paciente ya tuvo una atención presencial.
- **Actores:** paciente.
- **Prioridad:** media.
- **Vista:** paso 1 de `/citas/solicitar`.
- **Reglas:**
  - El paciente necesita al menos una cita ATENDIDA de un servicio presencial. Una teleconsulta atendida no habilita otra (RN-16).
  - Un servicio es no presencial si su modalidad no empieza con "Presencial"; hoy solo CN004 ("Online (video)").
  - Sin atención previa, la teleconsulta se muestra deshabilitada con la explicación "Disponible después de tu primera atención presencial." (no se oculta, para que se entienda la regla).
  - `crearCita` vuelve a revisar la regla, aunque el asistente ya no la ofrezca.
- **Criterio de aceptación:** Ana Pérez ve la teleconsulta deshabilitada; Javiera Soto, que tiene la C0001 atendida, puede elegirla.
- **Pruebas:** `SolicitarCita.test.jsx`, `citasService.test.js` y `puedeAgendarTeleconsulta` en `utils/citas.test.js`.

## 4.5 Reglas agregadas por el equipo

Estas reglas no estaban en el plan original. Se acordaron durante el desarrollo.

- **RN-34, estadísticas para el dashboard y los reportes:** no cuentan las citas CANCELADAS. `tasaInasistencia = inasistencias / (atendidas + inasistencias)`, como proporción de 0 a 1 (0 si no hay ninguna); el módulo de acceso la muestra como porcentaje. `porNutricionista` incluye siempre a los 4, y `porSemana` incluye todas las semanas del rango, también las que tienen 0, rotuladas por la fecha de su lunes.
- **RN-35, pago de la cita:** una cita solo se crea con un pago APROBADO, por el precio exacto del servicio y que no esté asociado a otra cita. Después, el pago queda enlazado a la cita. La duración de la cita siempre sale del catálogo, no de la página.
- **El pago no tiene estado PENDIENTE:** el pago simulado responde al instante con APROBADO o RECHAZADO; después puede pasar a REEMBOLSADO. Los intentos rechazados también se guardan.
- **El service repite las reglas de la página:** `crearCita` y `reprogramarCita` vuelven a revisar la jornada, los choques, las horas pasadas, que la cita quepa completa, los 60 días y la teleconsulta. Lo que corre en el navegador se puede manipular (por ejemplo, editando `nv_reserva`); la página ayuda y el service decide.

## 4.6 Datos del módulo

| Entidad | Campos | Persistencia |
| --- | --- | --- |
| cita | id, pacienteId, nutricionistaId, servicioCodigo, fecha (AAAA-MM-DD), hora (HH:mm), duracionMin, motivo, estado, pagoId, historial [{ fecha, de, a, por }], creadaEn | `localStorage`, clave `nv_citas` |
| pago | id, citaId, monto, ultimos4, estado (APROBADO, RECHAZADO, REEMBOLSADO), motivo, fecha | `localStorage`, clave `nv_pagos` |
| reserva en curso | pacienteId, servicioCodigo, nutricionistaId, fecha, hora, motivo, paso | `sessionStorage`, clave `nv_reserva` |

Las fechas se guardan como texto `AAAA-MM-DD` y se comparan como texto: así no dependen de la zona horaria ni del cambio de horario de verano. Los nombres de los campos se mantienen en EP3: la API devolverá el mismo JSON.

## 4.7 Interfaces que ofrece el módulo

- **`services/citasService.js`** (asíncrono): `listarCitas({ pacienteId, nutricionistaId, estado, desde, hasta })`, `obtenerCita(id)`, `crearCita(datos)`, `cambiarEstado(id, nuevoEstado, usuarioId)`, `reprogramarCita(id, fecha, hora)`, `horariosDisponibles(nutricionistaId, fecha)`, `proximasHorasLibres(cantidad)` y `estadisticas(desde, hasta)`. Agregados sin cambiar las firmas del contrato: `puedeAgendarTeleconsulta(pacienteId)`, un cuarto parámetro opcional `usuarioId` en `reprogramarCita` (para el historial) y parámetros opcionales `duracionMin` e `idExcluido` en `horariosDisponibles`.
- **`services/pagosService.js`** (asíncrono): `procesarPago({ titular, numero, vencimiento, cvv, monto })` y `obtenerPago(id)`. Agregados: `listarPagos({ citaIds })` y `reembolsarPagoSinCita(id)`.
- **Usado por el módulo de acceso:** `estadisticas` y `listarCitas({ estado: "PENDIENTE" })` en el dashboard y los reportes.
- **Usado por el módulo clínico:** `proximasHorasLibres(4)` en el Inicio, y `listarCitas` en Mis pacientes y Mi progreso.
- **URL que recibe:** `/citas/solicitar?servicio=CN001&nutricionista=NUT003` (ambos parámetros son opcionales).
- **URL que enlaza:** `/nutricionista/pacientes/:pacienteId`, la ficha del paciente del módulo clínico.

## 4.8 Requisitos no funcionales del módulo

- **Seguridad simulada en EP2:** el pago es simulado y no se envía a ningún banco; solo se guardan los 4 últimos dígitos de la tarjeta. Las reglas por rol (por ejemplo, que el paciente vea solo sus citas) se cumplen en el frontend, que se puede saltar editando el almacenamiento del navegador.
- **Responsive:** las vistas se revisan en 360, 768 y 1280 px. Las opciones del asistente pasan de una a dos columnas, y el pago muestra el resumen y la tarjeta lado a lado en escritorio.
- **Accesibilidad:**
  - Todos los campos tienen `<label>`; los errores usan role="alert" y las confirmaciones y avisos role="status".
  - El paso actual del asistente se marca con `aria-current="step"`; la hora elegida, con `aria-pressed`; las pestañas de Mis citas usan `role="tab"` y `aria-selected`.
  - Al cambiar de paso, el foco va al título del paso.
  - El estado de una cita siempre se muestra con color y texto (`ChipEstado`).
- **Usabilidad:**
  - El botón que no se puede usar explica qué falta ("Elige una hora disponible para continuar.").
  - Cada vista resuelve tres estados: cargando, vacío con una acción sugerida y con datos (RN-32).
  - La misma acción mantiene su verbo de principio a fin: "Solicitar cita" termina en "Solicitud enviada".
- **Pruebas independientes del día:** toda función que usa fechas recibe `ahora` por parámetro (RN-30). Las pruebas que dependen de la fecha fijan el reloj con `vi.useFakeTimers({ toFake: ["Date"] })` y se corren en dos zonas horarias (America/Santiago y UTC).

## 4.9 Registro de pruebas del módulo

| Prueba | Archivo (en `frontend/src/`) | Comportamiento verificado | Tipo | Mock o spy |
| --- | --- | --- | --- | --- |
| S-T1 | `utils/citas.test.js` | `generarBloques`: Daniela Morales un lunes da 10 bloques (08:00 a 12:30); Rodrigo Sepúlveda un lunes da `[]` porque no atiende. | Lógica | No |
| S-T2 | `utils/citas.test.js` | `puedeTransicionar` permite PENDIENTE a CONFIRMADA y bloquea ATENDIDA a CANCELADA. | Lógica | No |
| S-T3 | `components/citas/SelectorHorario.test.jsx` | Los horarios ocupados salen deshabilitados; un clic en uno libre llama a `onSeleccionar` una vez con esa hora y un clic en uno ocupado no la llama. | Componente, props y evento | `vi.fn()` como `onSeleccionar` |
| S-T4 | `pages/citas/Pago.test.jsx` | Al pagar, `procesarPago` se llama una vez con el monto del servicio ($35.000); si responde RECHAZADO, la vista navega a `/citas/pago/error` con el motivo y no crea la cita. | Interacción y mock de servicio | `vi.mock` de `pagosService.js` (y de `citasService.js`) |

**Pruebas extra del módulo**, que suben la cobertura:

- `utils/citas.test.js`: bloques que ocupa cada cita, choques, horas pasadas, servicios de 50 min, cancelar con 24 h, recordatorio, teleconsulta, filtros, estadísticas (RN-34), próximas horas libres, motivo, rango de fechas (incluido el cambio de horario de abril), próximas e historial, y primer paso incompleto.
- `utils/pagos.test.js`: Luhn, vencimiento, CVV, titular, simulación del pago y total recaudado.
- `data/citasData.test.js` y `data/pagosData.test.js`: CRUD, historial, transiciones, choques, motivo y solo 4 dígitos.
- `data/reservaData.test.js`: la reserva en `sessionStorage`, de un solo paciente y sin campos extra.
- `services/citasService.test.js`: filtros, reembolso al cancelar, reprogramar, estadísticas, horas libres y las reglas repetidas en `crearCita` (RN-13, RN-16, RN-35), con el reloj fijo.
- `services/pagosService.test.js`: pago aprobado y rechazado, errores por campo y reembolso de un pago sin cita.
- `components/citas/ComponentesCita.test.jsx`: `ChipEstado`, `PasosWizard` y `ResumenCita`.
- `pages/citas/SolicitarCita.test.jsx`: parámetros de la URL, talleres fuera, teleconsulta, fecha pasada, horas ocupadas, recorrido completo hasta el pago y F5.
- `pages/citas/Pago.test.jsx` y `PagoResultado.test.jsx`: pago aprobado, botón deshabilitado, validación, errores del service, reembolso, reserva inválida, pantalla de éxito solo con citas propias y pantalla de error.
- `pages/citas/MisCitas.test.jsx`: pestañas, citas propias, recordatorio, regla de 24 h, cancelar con reembolso, reprogramar y estado vacío.
- `pages/citas/AgendaSecretaria.test.jsx`: grilla del día con "—" y continuación, acciones según el estado, confirmar con historial, inasistencia y cancelación con diálogo, reprogramar sin el límite de 24 h, filtro, navegación por día y sin enlaces a fichas.
- `components/citas/GrillaAgenda.test.jsx`: pestañas por nutricionista en el móvil y aviso de la cita elegida.
- `pages/citas/admin/AdminCitas.test.jsx` y `AdminCitaDetalle.test.jsx`: lista con el total, total sin reembolsos ni rechazos, filtros por estado, nutricionista y fechas, rango al revés, comprobante con los 4 últimos dígitos, historial y cita inexistente.
- `pages/citas/AgendaNutricionista.test.jsx`: solo sus citas, marcar atendida con el historial, inasistencia con diálogo, pendiente sin acciones, enlace a la ficha, vista semana y navegación.

## 4.10 Trazabilidad

| Requisito | Vistas | Componentes y lógica | Pruebas |
| --- | --- | --- | --- |
| RF-CIT-01 | `/citas/solicitar` | `SolicitarCita`, `PasosWizard`, `ResumenCita`, `ChipEstado`, `reservaData`, `primerPasoIncompleto`, `validarMotivo`, `validarFechaCita` | `SolicitarCita.test.jsx`, `ComponentesCita.test.jsx`, `reservaData.test.js`, `citas.test.js` |
| RF-CIT-02 | `/citas/solicitar`, `/mis-citas` | `SelectorHorario`, `generarBloques`, `horariosDisponibles`, `horasNoElegibles` | S-T1, S-T3, `citas.test.js`, `citasService.test.js` |
| RF-CIT-03 | `/citas/pago`, `/citas/pago/exito/:citaId`, `/citas/pago/error` | `Pago`, `FormPago`, `PagoExitoso`, `PagoError`, `procesarPago`, `crearCita`, `reembolsarPagoSinCita` | S-T4, `Pago.test.jsx`, `PagoResultado.test.jsx`, `pagos.test.js`, `pagosService.test.js` |
| RF-CIT-04 | `/mis-citas` | `MisCitas`, `TarjetaCita`, `PanelReprogramar`, `DialogoConfirmacion`, `puedeCancelar`, `cambiarEstado`, `reprogramarCita` | `MisCitas.test.jsx`, `citas.test.js`, `citasService.test.js` |
| RF-CIT-05 | `/mis-citas` | `MisCitas`, `necesitaRecordatorio` | `MisCitas.test.jsx`, `citas.test.js` |
| RF-CIT-06 | `/secretaria/agenda` | `AgendaSecretaria`, `GrillaAgenda`, `PanelReprogramar`, `HistorialCita`, `armarAgenda`, `accionesSecretaria`, `TRANSICIONES` | S-T2, `AgendaSecretaria.test.jsx`, `GrillaAgenda.test.jsx`, `citas.test.js` |
| RF-CIT-07 | `/nutricionista/agenda` | `AgendaNutricionista`, `accionesNutricionista`, `diasDeLaSemana` | `AgendaNutricionista.test.jsx`, `citas.test.js` |
| RF-CIT-08 | `/admin/citas`, `/admin/citas/:id` | `AdminCitas`, `AdminCitaDetalle`, `FiltroCitas`, `TablaCitasAdmin`, `HistorialCita`, `ComprobantePago`, `totalRecaudado`, `listarPagos`, `obtenerPago` | `AdminCitas.test.jsx`, `AdminCitaDetalle.test.jsx`, `pagos.test.js` |
| RF-CIT-09 | `/citas/solicitar` | `puedeAgendarTeleconsulta` (util y service), `crearCita` | `SolicitarCita.test.jsx`, `citasService.test.js`, `citas.test.js` |

## 4.11 Datos asumidos

| Dato | Valor usado | Por qué |
| --- | --- | --- |
| Tarjeta de prueba aprobada | 4242 4242 4242 4242, con cualquier vencimiento futuro (por ejemplo 12/30) y cualquier CVV de 3 dígitos | Número conocido que pasa el algoritmo de Luhn. |
| Tarjeta de prueba rechazada | 4000 0000 0000 0002 | Permite demostrar la pantalla de error con el motivo "El banco rechazó la tarjeta.". |
| Duración de los planes | Sin duración en el catálogo; ocupan 1 bloque de 30 min | La primera sesión de un plan se agenda como una consulta corta. Pendiente de confirmar con la clínica. |
| Citas semilla | C0001 (Javiera, atendida, ~35 días atrás), C0002 (Tomás, inasistencia), C0003 (Javiera, confirmada, próximo día hábil), C0004 (Ana, pendiente, en 2 días hábiles), C0005 (Tomás, pendiente, en ~3 días) | Fechas relativas al día en que se abre la app, para demostrar el historial, el recordatorio, confirmar y cancelar. |
| Pagos semilla | P0001 a P0005, aprobados, terminados en 4242 | Cada cita semilla tiene su pago. |
| Anticipación máxima | 60 días | Indicada en el plan del proyecto. |
| Restablecer los datos | `restablecerDatosDemo()` de `almacen.js` | Vuelve las citas y los pagos a la semilla antes de grabar el video. |
