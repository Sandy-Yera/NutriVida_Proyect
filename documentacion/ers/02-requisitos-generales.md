# 2. Requisitos generales

Requisitos que valen para todo el sistema. Consolida: Simon (tarea S-10). Lo propio de cada módulo está en las secciones 3, 4 y 5.

## 2.1 Requisitos no funcionales

### RNF-01 Responsive

- Todas las vistas se revisan en 360, 768 y 1280 px, sin scroll horizontal.
- Grilla de Bootstrap 5: una columna en el móvil, dos en tablet y el diseño completo en escritorio.
- Bajo 992 px la barra superior pasa a menú hamburguesa. Bajo 768 px las tablas pasan a lista de tarjetas.
- La agenda de la secretaria se ve por columnas en escritorio y con una pestaña por nutricionista en el móvil.

### RNF-02 Seguridad simulada en EP2

- La sesión (`usuarioActual`) y las contraseñas se guardan en `localStorage`. Es una **simulación académica**, igual que en el Tutorial 03 del curso, y **no es segura**: cualquiera puede leer o editar el almacenamiento del navegador.
- Por la misma razón, las reglas por rol (por ejemplo, que un nutricionista vea solo sus fichas o que un paciente vea solo sus citas) se cumplen en el frontend y se podrían saltar.
- El pago es simulado: no se envía a ningún banco y solo se guardan los 4 últimos dígitos de la tarjeta.
- En EP3 se reemplaza por contraseñas con hash BCrypt, tokens JWT y validación de roles en cada microservicio.

### RNF-03 Accesibilidad

- Todos los campos tienen `<label>`.
- Los errores usan `role="alert"`; las confirmaciones y avisos, `role="status"`. Así los anuncian los lectores de pantalla y las pruebas los encuentran.
- El foco de teclado es visible (contorno Miel de 3 px).
- Texto blanco solo sobre Maqui, Cilantro o Murta, por contraste.
- Los estados de una cita siempre se muestran con color y texto, nunca solo con color.
- Los gráficos tienen una tabla con los mismos números.

### RNF-04 Usabilidad

- Los errores dicen qué corregir (por ejemplo, "El RUT no es válido: revisa el dígito verificador.").
- Cada vista resuelve tres estados: cargando, vacío con una acción sugerida y con datos.
- Cada acción mantiene su verbo de principio a fin: "Solicitar cita" termina en "Solicitud enviada".
- Los formularios usan `noValidate` y validación propia, y conservan lo escrito cuando muestran errores.

### RNF-05 Diseño

- Concepto "Maqui y cinta métrica": colores tomados de la despensa local de la Araucanía, y la cinta de medir como elemento memorable en Mi progreso.
- Paleta: Maqui `#4A2B66` (principal), Cilantro `#2E7D57` (progreso y Confirmada), Murta `#B03A4A` (errores y Cancelada), Miel `#C68A1E` (Pendiente), Grafito `#23272C` (texto) y Neblina `#F2F4F3` (fondo).
- Tipografías: Alegreya para los títulos y Atkinson Hyperlegible Next para el texto, instaladas por npm con Fontsource (no dependen de internet en el laboratorio).
- Precios y fechas siempre con `utils/formato.js`: `$35.000` y "vie 16 oct".

### RNF-06 Mantenibilidad y pruebas

- Cada módulo tiene un dueño y solo él edita sus archivos. Lo que se necesite de otro módulo se pide por su service.
- Pruebas con Vitest y React Testing Library junto al archivo que verifican. El proyecto corre desde un clon limpio con `npm install`, `npm run dev` y `npm test`.
- Las funciones que usan fechas reciben la fecha actual por parámetro, para que las pruebas den siempre el mismo resultado.
- Formato con Prettier (2 espacios, 100 columnas) y revisión con ESLint.
- Commits pequeños con el formato `tipo(módulo): qué cambió`; la integración a `main` usa `merge --no-ff` para conservar la autoría.

## 2.2 Decisiones técnicas

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Framework | React 19 + Vite | El usado en las prácticas de clase; arranque y recarga rápidos. |
| Navegación | React Router 7, con un archivo de rutas por módulo (`rutasAcceso`, `rutasCitas`, `rutasClinica`) | Cada integrante agrega sus rutas sin tocar `App.jsx` y sin conflictos. |
| Estilos | Bootstrap 5 instalado por npm, más `tema.css` con las variables `--nv-*` | La rúbrica evalúa Bootstrap; el tema da la identidad de la clínica. |
| Capas | Vistas (`pages`, `components`) → `services` (asíncronos) → `data` (CRUD sobre `localStorage`). Funciones puras en `utils`. | Las vistas no saben de dónde salen los datos: en EP3 solo cambian los services. |
| Persistencia | `almacen.js` con `leer(clave, semilla)` y `guardar(clave, datos)`; claves `nv_*` | Un solo mecanismo para todos los módulos; `restablecerDatosDemo()` vuelve a la semilla. |
| Reglas | Las reglas de datos se validan en `data` y lanzan un `Error`; los `utils` no lanzan, devuelven valores o mensajes; el service coordina entre módulos | Un lugar claro para cada regla y mensajes de error reutilizables en las vistas. |
| Pruebas | Vitest + React Testing Library (jsdom), `vi.fn()` y `vi.mock` para aislar dependencias | Las del curso. 12 pruebas comprometidas; la rúbrica pide 10 para el máximo. |
| Gráficos y mapa | Recharts y Leaflet, cargados en diferido | El paquete principal queda bajo 500 kB. |

## 2.3 Rutas de la aplicación

| Ruta | Vista | Acceso | Módulo |
| --- | --- | --- | --- |
| `/` | Inicio | Público | Clínico |
| `/servicios`, `/servicios/categoria/:tipo`, `/servicios/:codigo` | Servicios, por tipo y detalle | Público | Clínico |
| `/planes` | Planes especializados | Público | Clínico |
| `/nosotros` | Clínica y equipo | Público | Clínico |
| `/contacto` | Contacto y mapa | Público | Clínico |
| `/consejos`, `/consejos/:id` | Consejos nutricionales y detalle | Público | Acceso |
| `/login`, `/registro` | Iniciar sesión y registro de paciente | Público | Acceso |
| `/perfil` | Mi perfil | Con sesión | Acceso |
| `/citas/solicitar` | Solicitar cita (acepta `?servicio=` y `?nutricionista=`) | Paciente | Citas |
| `/citas/pago`, `/citas/pago/exito/:citaId`, `/citas/pago/error` | Pago simulado y su resultado | Paciente | Citas |
| `/mis-citas` | Mis citas | Paciente | Citas |
| `/mi-progreso` | Mi progreso y plan | Paciente | Clínico |
| `/secretaria/agenda` | Agenda de los 4 nutricionistas | Secretaria y Administrador | Citas |
| `/nutricionista/agenda` | Mi agenda | Nutricionista | Citas |
| `/nutricionista/pacientes`, `/nutricionista/pacientes/:pacienteId` | Mis pacientes y ficha | Nutricionista | Clínico |
| `/admin`, `/admin/usuarios…`, `/admin/reportes` | Dashboard, usuarios y reportes | Administrador | Acceso |
| `/admin/citas`, `/admin/citas/:id` | Citas y comprobante del pago | Administrador | Citas |
| `/admin/servicios…` | Servicios | Administrador | Clínico |
| `*` | Página no encontrada | Público | Acceso |

Sin sesión, una ruta protegida lleva a `/login` y recuerda la ruta de origen. Con sesión pero sin el rol, vuelve al inicio con el aviso "No tienes acceso a esa sección.". Después del login, cada rol llega a su vista: Administrador a `/admin`, Secretaria a `/secretaria/agenda`, Nutricionista a `/nutricionista/agenda` y Paciente a `/mis-citas`.

## 2.4 Modelo de datos

| Entidad | Módulo | Campos | Clave de almacenamiento |
| --- | --- | --- | --- |
| usuario | Acceso | id, nombre, apellido, rut, correo, telefono, fechaNacimiento, clave (solo EP2, simulada), rol, activo, nutricionistaId, creadoEn | `nv_usuarios` |
| sesión | Acceso | id, nombre, rol, nutricionistaId | `usuarioActual` |
| articulo | Acceso | id, titulo, resumen, contenido, autorNutricionistaId, fecha | estático |
| cita | Citas | id, pacienteId, nutricionistaId, servicioCodigo, fecha, hora, duracionMin, motivo, estado, pagoId, historial, creadaEn | `nv_citas` |
| pago | Citas | id, citaId, monto, ultimos4, estado, motivo, fecha | `nv_pagos` |
| reserva en curso | Citas | pacienteId, servicioCodigo, nutricionistaId, fecha, hora, motivo, paso | `nv_reserva` (`sessionStorage`) |
| servicio | Clínico | codigo, tipo, nombre, duracionMin, modalidad, precio, descripcion, destacado, activo, cupoMax | `nv_servicios` |
| nutricionista | Clínico | id, usuarioId, nombre, especialidad, dias, horaInicio, horaFin | estático |
| ficha, medición y plan | Clínico | ver la sección 5.4 | `nv_fichas` |
| contacto | Clínico | id, nombre, correo, telefono, motivo, mensaje, fecha | `nv_contactos` |

Relaciones principales: una cita pertenece a un paciente (usuario), a un nutricionista y a un servicio, y tiene un pago. Un nutricionista está vinculado a un usuario con rol NUTRICIONISTA. La ficha de un paciente usa como id el id de su usuario.

Las fechas se guardan como texto `AAAA-MM-DD` y las horas como `HH:mm`. Los nombres de los campos se mantienen en EP3: la API devolverá el mismo JSON y los componentes no cambian.

## 2.5 Contratos entre módulos

| Desde | Hacia | Contrato |
| --- | --- | --- |
| Clínico (Inicio, Servicios, Planes, Nosotros) y Acceso (Consejos) | Citas | `/citas/solicitar?servicio=CN001&nutricionista=NUT003`, ambos parámetros opcionales. |
| Citas (agenda del nutricionista) | Clínico | `/nutricionista/pacientes/:pacienteId`, con el id del usuario paciente. |
| Acceso (dashboard y reportes) | Citas | `estadisticas(desde, hasta)` y `listarCitas({ estado })`. |
| Clínico (Inicio, Mis pacientes, Mi progreso) | Citas | `proximasHorasLibres(cantidad)` y `listarCitas({ pacienteId })` y `listarCitas({ nutricionistaId })`. |
| Citas y Acceso | Clínico | `listarServicios`, `obtenerServicio`, `listarNutricionistas` y `obtenerNutricionista`. |
| Todos | Acceso | `auth.js` (sesión y rol), `RutaProtegida` y `utils/formato.js`. |

Los services son asíncronos y sus firmas no cambian. Agregar una función nueva o un parámetro opcional al final no rompe el contrato.

## 2.6 Datos asumidos comunes

El caso no entrega estos datos; se usan valores referenciales.

| Dato | Valor usado | Sección |
| --- | --- | --- |
| Ubicación, horario y contacto de la clínica | Sector Plaza Aníbal Pinto, Temuco; lunes a viernes de 08:00 a 19:00 y sábado de 09:00 a 14:00 | 5.9 |
| Usuarios de demostración | Uno o más por rol (admin, secretaria, 4 nutricionistas y 3 pacientes), con contraseñas ficticias | 3.9 |
| Tarjetas de prueba | 4242 4242 4242 4242 se aprueba; 4000 0000 0000 0002 se rechaza | 4.11 |
| Duración de los planes | Sin duración en el catálogo; se agendan como 1 bloque de 30 min | 4.11 |
| Citas, pagos, fichas y mediciones | Datos semilla con fechas relativas al día en que se abre la app | 4.11 y 5.9 |

## 2.7 Pruebas comprometidas

Las 12 pruebas unitarias, 4 por integrante. El detalle de cada una está en la sección de su módulo (3.7, 4.9 y 5.7).

| Prueba | Qué verifica | Tipo |
| --- | --- | --- |
| G-T1 | `validarRut` acepta y rechaza según el dígito verificador. | Lógica |
| G-T2 | `validarClave` exige 8 caracteres, una mayúscula y un número. | Lógica |
| G-T3 | El login de la secretaria navega a su agenda; con una clave incorrecta muestra la alerta. | Interacción y navegación |
| G-T4 | `RutaProtegida` redirige sin sesión y respeta el rol. | Componente, con `vi.mock` |
| S-T1 | `generarBloques`: Daniela un lunes da 10 bloques; Rodrigo un lunes, ninguno. | Lógica |
| S-T2 | `puedeTransicionar` permite PENDIENTE a CONFIRMADA y bloquea ATENDIDA a CANCELADA. | Lógica |
| S-T3 | `SelectorHorario` deshabilita los ocupados y avisa la hora elegida. | Componente, con `vi.fn()` |
| S-T4 | El pago llama una vez a `procesarPago` con el monto y, si se rechaza, navega al error. | Interacción, con `vi.mock` |
| C-T1 | `calcularImc` y `clasificarImc`. | Lógica |
| C-T2 | `filtrarServicios` por tipo y texto. | Lógica |
| C-T3 | `ServicioFila` muestra lo que recibe por props. | Componente |
| C-T4 | `FormMedicion` valida y llama a `onGuardar`. | Formulario, con `vi.fn()` |

La cobertura de todo el proyecto se informa en el documento de cobertura (`documentacion/cobertura/`), que consolida Gabriel.
