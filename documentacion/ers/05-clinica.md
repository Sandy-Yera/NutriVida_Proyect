# 5. Módulo clínico: sitio público y ficha clínica

Responsable: Catalina. Tareas C-01 a C-12 del plan del proyecto. ERS V2 (EP2, frontend React con datos simulados).

## 5.1 Alcance

El módulo es la cara visible de la clínica y su información clínica. Incluye el sitio público (inicio, catálogo de servicios, planes, la clínica y su equipo, contacto con mapa y pie de página), el progreso del paciente, la ficha clínica que usa el nutricionista y la administración del catálogo de servicios.

El módulo no agenda citas: cuando el visitante elige un servicio o un nutricionista, lo envía al módulo de citas con la URL acordada (sección 5.9 del plan).

## 5.2 Actores

| Actor | Qué hace en este módulo |
| --- | --- |
| Visitante (sin sesión) | Recorre el inicio, el catálogo, los planes, la clínica y su equipo; envía un mensaje de contacto y abre la ruta para llegar. |
| Paciente | Lo mismo que el visitante, más su progreso (mediciones y gráfico), su plan alimenticio vigente y su próxima cita. |
| Nutricionista | Ve solo a sus pacientes, crea fichas, registra mediciones y guarda el plan alimenticio. |
| Administrador | Crea, edita, activa y desactiva servicios del catálogo. |

La secretaria no ve fichas ni mediciones (regla del caso).

## 5.3 Requisitos funcionales

### RF-CLI-01 Inicio con acceso directo a agendar y próximas horas libres

- **Descripción:** la portada invita a agendar sin llamar por teléfono, muestra las próximas horas libres y resume la clínica.
- **Actores:** todos.
- **Prioridad:** alta.
- **Vista:** `/` (`pages/clinica/Inicio.jsx`).
- **Contenido:**
  - Portada "Agenda tu control sin llamar por teléfono" con dos selectores (servicio y nutricionista) y el botón "Ver horas disponibles".
  - Panel "Próximas horas libres" con 4 horas; cada una lleva a Solicitar cita con ese nutricionista.
  - Carta de servicios por tipo, resumida, con enlace al catálogo completo.
  - Bloque breve del equipo y bloque "Cómo llegar" con el mapa.
- **Reglas:**
  - El botón arma la URL del contrato con el módulo de citas: `/citas/solicitar?servicio=CN001&nutricionista=NUT003`. Ambos parámetros son opcionales; si no se elige nada, va a `/citas/solicitar`.
  - Solo se ofrecen servicios activos y agendables (consultas, evaluaciones y planes). Los talleres se inscriben en recepción.
- **Datos:** `serviciosService.listarServicios()`, `serviciosService.listarNutricionistas()` y `citasService.proximasHorasLibres(4)` del módulo de citas.
- **Criterio de aceptación:** al elegir CN001 y Daniela Morales, "Ver horas disponibles" lleva a `/citas/solicitar?servicio=CN001&nutricionista=NUT003`.
- **Pruebas:** pruebas extra de `Inicio.test.jsx` (con `vi.mock` de `citasService`).

### RF-CLI-02 Catálogo de servicios por tipo, búsqueda y detalle

- **Descripción:** el visitante recorre los 18 servicios agrupados por tipo, filtra por categoría, busca por texto y abre el detalle de cada uno.
- **Actores:** todos.
- **Prioridad:** alta.
- **Vistas:**
  - `/servicios` (`Servicios.jsx`): pestañas por tipo y buscador "Buscar por nombre o descripción". La carta se muestra en filas con `ServicioFila` (props: `servicio`): nombre, duración, modalidad y precio a la derecha.
  - `/servicios/categoria/:tipo` (`Servicios.jsx` con `useParams`): la misma vista filtrada por `consultas`, `planes`, `evaluaciones` o `talleres`.
  - `/servicios/:codigo` (`DetalleServicio.jsx`): descripción, duración, modalidad, precio y el botón "Solicitar cita" a `/citas/solicitar?servicio=CODIGO`.
- **Reglas:**
  - La búsqueda no distingue mayúsculas ni tildes y busca en el nombre y la descripción (`filtrarServicios`, con `normalize("NFD")`).
  - Sin resultados se muestra "No hay servicios que coincidan con ‘…’. Prueba con otra palabra." y el botón "Limpiar búsqueda".
  - Un plan no muestra duración. Un taller muestra su cupo e "Inscripción en recepción" en vez del botón.
  - Un servicio desactivado no aparece en el catálogo ni en el asistente de citas; su detalle dice "Este servicio no está disponible por ahora.". Una categoría inexistente muestra "Categoría no encontrada".
- **Datos:** `serviciosService.listarServicios({ tipo, texto })` y `obtenerServicio(codigo)` sobre `nv_servicios`.
- **Criterio de aceptación:** con tipo PLAN y el texto "VEGANA" aparece solo PL005; sin filtros aparecen los 18.
- **Pruebas:** C-T2 y C-T3, más las pruebas extra de `Servicios.test.jsx`, `DetalleServicio.test.jsx` y `serviciosData.test.js`.

### RF-CLI-03 Planes especializados destacados

- **Descripción:** una vista reúne los 6 planes especializados con lo que incluye cada uno.
- **Actores:** todos.
- **Prioridad:** media.
- **Vista:** `/planes` (`Planes.jsx`, vista "Ofertas" de la plantilla).
- **Reglas:**
  - Cada plan muestra su nombre, "Qué incluye" (la descripción "Incluye A + B + C" se convierte en lista con `incluyeDelPlan`), su precio y el botón "Contratar plan", que lleva a `/citas/solicitar?servicio=PL…`.
  - Un plan desactivado no aparece. Sin planes se muestra "No hay planes disponibles por ahora.".
- **Pruebas:** pruebas extra de `Planes.test.jsx` y de `incluyeDelPlan`.

### RF-CLI-04 Clínica y equipo con especialidad, días y horario

- **Descripción:** la vista cuenta la historia de la clínica y presenta a los 4 nutricionistas.
- **Actores:** todos.
- **Prioridad:** media.
- **Vista:** `/nosotros` (`Nosotros.jsx`).
- **Reglas:**
  - Historia según el caso: fundada en 2016 en Temuco, 4 nutricionistas, cerca de 60 pacientes por semana, controles cada 15 días o cada mes y sus 4 enfoques.
  - `TarjetaNutricionista` (props: `nutricionista`) muestra especialidad, días de atención escritos como en el catálogo ("Lunes, miércoles y viernes", "Lunes a viernes", con `describirDias`) y horario, más el botón "Agendar con Carolina", que lleva a `/citas/solicitar?nutricionista=NUT001`.
- **Pruebas:** pruebas extra de `TarjetaNutricionista.test.jsx`, `Nosotros.test.jsx` y de `describirDias`.

### RF-CLI-05 Contacto con validación y mapa con indicaciones para llegar

- **Descripción:** el visitante escribe a la clínica y ve cómo llegar. Todas las páginas terminan con el pie de página.
- **Actores:** todos.
- **Prioridad:** alta.
- **Vista:** `/contacto` (`Contacto.jsx` con `FormContacto` y `MapaClinica`), más `Footer` en el layout principal.
- **Campos:** nombre, correo, teléfono (opcional), motivo y mensaje.
- **Reglas:**
  - Nombre obligatorio de al menos 2 caracteres; correo con formato nombre@dominio; teléfono, si se escribe, celular chileno (+56 9 y 8 dígitos); motivo de la lista; mensaje de 10 a 500 caracteres con contador.
  - Cada error aparece bajo su campo con role="alert" y el foco va al primer campo con error. Al enviar: "Mensaje enviado. Te responderemos al correo que indicaste." (role="status") y el formulario se limpia.
  - `MapaClinica` usa react-leaflet: `MapContainer`, `TileLayer` de OpenStreetMap con su atribución y `Marker` con `Popup` (nombre, dirección y "Cómo llegar"). El mapa tiene alto definido y se carga diferido (`MapaDiferido` con `React.lazy`) para que Leaflet no pese en el paquete principal.
  - El botón "Cómo llegar" abre Google Maps con la clínica como destino: `https://www.google.com/maps/dir/?api=1&destination=-38.739,-72.599`.
  - El pie de página muestra la dirección, el horario, el teléfono y el correo (con enlaces `tel:` y `mailto:`) y los enlaces del sitio público.
- **Datos:** guarda cada mensaje en `nv_contactos` con `serviciosService.registrarContacto(datos)` (ids CT001, CT002…).
- **Criterio de aceptación:** un mensaje de 4 caracteres muestra el error y no se guarda; uno válido queda en `nv_contactos`.
- **Pruebas:** pruebas extra de `FormContacto.test.jsx` (con `vi.fn()` como `onEnviar`), `Contacto.test.jsx`, `MapaClinica.test.jsx`, `Footer.test.jsx` y de `validarContacto`.

### RF-CLI-06 Paciente: historial de mediciones con gráfico y plan vigente

- **Descripción:** el paciente ve su progreso en un gráfico, sus mediciones, su plan alimenticio vigente y su próxima cita.
- **Actores:** paciente.
- **Prioridad:** alta.
- **Vista:** `/mi-progreso` (`MiProgreso.jsx`), protegida para PACIENTE y cargada en diferido para que Recharts no pese en el paquete principal.
- **Contenido:**
  - Próxima cita: la cita pendiente o confirmada más cercana del paciente (`proximaCita`); si no hay, "No tienes citas próximas." y el enlace "Solicitar cita".
  - `GraficoProgreso` (Recharts, props: `mediciones` e `indicador`) con los botones Peso, Cintura, IMC y % grasa. El indicador vive en el state de la página.
  - `CintaMetrica` (SVG) como eje inferior: una marca por día, más larga los lunes y con el mes en cada día 1, y un punto por medición alineado con el gráfico.
  - Tabla de mediciones (fecha, peso, cintura, IMC, % grasa y nutricionista), que en el móvil pasa a lista.
  - Plan vigente: objetivo, kcal diarias, desayuno, colación, almuerzo, once, cena e indicaciones.
- **Reglas:**
  - Solo se muestran los datos del paciente en sesión.
  - El IMC no se guarda: se calcula con el peso y la talla de cada medición (`calcularImc`, redondeado a 1 decimal).
  - Sin mediciones: "Aún no tienes mediciones: se registran en tu primera consulta.".
  - La línea se dibuja con una animación al cargar, que se desactiva con `prefers-reduced-motion`.
- **Datos:** `fichasService.listarMediciones(pacienteId)` y `obtenerPlan(pacienteId)`; `citasService.listarCitas({ pacienteId })` del módulo de citas.
- **Criterio de aceptación:** Javiera Soto ve 5 mediciones, "Actual: 72,4 kg" y un cambio de −5,6 kg; Ana Pérez ve el estado vacío.
- **Pruebas:** C-T1, más las pruebas extra de `GraficoProgreso.test.jsx`, `CintaMetrica.test.jsx`, `MiProgreso.test.jsx` y de `serieProgreso`, `marcasCinta` y `proximaCita`.

### RF-CLI-07 Nutricionista: solo sus pacientes; ficha, mediciones con IMC automático y plan

- **Descripción:** el nutricionista ve la lista de sus pacientes, abre la ficha, registra mediciones y guarda el plan alimenticio.
- **Actores:** nutricionista.
- **Prioridad:** alta.
- **Vistas:**
  - `/nutricionista/pacientes` (`MisPacientes.jsx`): sus pacientes con ficha (RUT, objetivo y última medición), buscador por nombre o RUT y la sección "Con cita y sin ficha", con el enlace "Crear ficha".
  - `/nutricionista/pacientes/:pacienteId` (`FichaPaciente.jsx`): datos y objetivo del paciente, historial de mediciones con IMC y clasificación, `FormMedicion` y `FormPlan`. Es el destino del enlace "Abrir ficha" de la agenda del nutricionista (contrato con el módulo de citas).
- **Campos:**
  - `FormMedicion` (props: `onGuardar`, `objetivo`, `tallaSugerida` y `hoy`): fecha, peso, talla, cintura, cadera, % grasa y notas.
  - `FormPlan` (props: `plan` y `onGuardar`): objetivo, kcal diarias, las 5 comidas e indicaciones.
  - `FormFicha` (props: `onCrear`): objetivo y antecedentes.
- **Reglas:**
  - La lista usa `pacientesDeNutricionista` con el `nutricionistaId` de la sesión.
  - Si la ficha es de otro nutricionista se muestra solo "Esta ficha pertenece a otro nutricionista." y no se piden sus datos (`accesoFicha`). En EP3 esta regla se repite en el servidor (403).
  - Si el paciente no tiene ficha, el formulario "Crear ficha" la deja a cargo del nutricionista en sesión.
  - Rangos de `validarMedicion`: peso de 2 a 300 kg, talla de 45 a 230 cm, cintura y cadera de 30 a 200 cm, grasa de 2 a 70 % y fecha no futura. El IMC se calcula en vivo mientras se escribe.
  - Clasificación OMS para adultos: bajo peso bajo 18,5; normal de 18,5 a 24,9; sobrepeso de 25 a 29,9; obesidad desde 30. En nutrición infantil se muestra sin clasificar.
  - El plan exige el objetivo, kcal enteras de 800 a 5000 y las 5 comidas. Cada plan guardado queda vigente desde hoy y el anterior se conserva.
- **Datos:** `fichasService` sobre `nv_fichas` (fichas, mediciones y planes); el nombre y el RUT del paciente se piden a `usuariosService` del módulo de acceso.
- **Criterio de aceptación:** Daniela Morales ve solo a sus pacientes, desde una cita llega a la ficha y registra una medición; Carolina Fuentes no ve la ficha de Tomás Huenchullán.
- **Pruebas:** C-T4, más las pruebas extra de `FichaPaciente.test.jsx`, `MisPacientes.test.jsx`, `FormPlan.test.jsx`, `fichasData.test.js` y de `accesoFicha`, `validarPlan` y `validarFicha`.

### RF-CLI-08 Administrador: crear, editar y desactivar servicios

- **Descripción:** el administrador mantiene el catálogo de servicios.
- **Actores:** administrador.
- **Prioridad:** alta.
- **Vistas:**
  - `/admin/servicios` (`AdminServicios.jsx`, vista "Productos" de la plantilla): `TablaServicios` (props: `servicios`, `onEditar` y `onCambiarEstado`) con filtros por tipo, estado y texto. Bajo 992 px pasa a lista.
  - `/admin/servicios/nuevo` y `/admin/servicios/:codigo` (`ServicioFormulario.jsx` con `FormServicio`).
- **Campos:** código, tipo, nombre, duración, modalidad, precio, descripción, destacado, cupo y activo.
- **Reglas:**
  - Código único con 2 letras y 3 números (CN001). Solo se escribe al crear.
  - La duración queda vacía en los planes; el cupo (de 1 a 50) solo se pide en los talleres. El precio debe ser mayor que 0 y sin decimales.
  - Los servicios no se eliminan: se desactivan. Desactivar pide confirmación en un diálogo, también al desmarcar "Activo" en el formulario. Activar es directo.
  - Los errores del guardado, como un código repetido ("Ya existe un servicio con ese código."), aparecen bajo su campo.
- **Datos:** `serviciosService.crearServicio`, `actualizarServicio` y `cambiarEstadoServicio` sobre `nv_servicios`.
- **Criterio de aceptación:** al desactivar CN004 desaparece del catálogo y de Solicitar cita; al activarlo vuelve.
- **Pruebas:** pruebas extra de `FormServicio.test.jsx` (con `vi.fn()` como `onGuardar`), `AdminServicios.test.jsx`, `ServicioFormulario.test.jsx` y de `validarServicio`.

## 5.4 Datos del módulo

| Entidad | Campos | Persistencia |
| --- | --- | --- |
| servicio | codigo, tipo, nombre, duracionMin (vacío en planes), modalidad, precio, descripcion, destacado, cupoMax (solo talleres), activo | `localStorage`, clave `nv_servicios` |
| nutricionista | id, usuarioId, nombre, especialidad, dias, horaInicio, horaFin | estático |
| ficha | id (el id del usuario paciente), nutricionistaId, objetivo, antecedentes, creadaEn | `localStorage`, clave `nv_fichas` |
| medicion | id, pacienteId, nutricionistaId, fecha, pesoKg, tallaCm, cinturaCm, caderaCm, grasaPct, notas | `localStorage`, clave `nv_fichas` |
| plan | id, pacienteId, nutricionistaId, vigenteDesde, objetivo, kcalDiarias, comidas (desayuno, colacion, almuerzo, once, cena), indicaciones | `localStorage`, clave `nv_fichas` |
| contacto | id, nombre, correo, telefono, motivo, mensaje, fecha | `localStorage`, clave `nv_contactos` |

Tipos de servicio: `CONSULTA`, `PLAN`, `EVALUACION` y `TALLER`. Objetivos de la ficha: `PERDIDA_PESO`, `METABOLICO`, `DEPORTIVA`, `VEGETARIANA` e `INFANTIL`. El IMC no se guarda: se calcula, para evitar datos inconsistentes y respetar la 3FN en EP3.

## 5.5 Interfaces que ofrece el módulo

- **`services/serviciosService.js`** (asíncrono): `listarServicios({ tipo, texto, soloActivos })`, `obtenerServicio(codigo)`, `crearServicio(datos)`, `actualizarServicio(codigo, cambios)`, `cambiarEstadoServicio(codigo, activo)`, `listarNutricionistas()` y `obtenerNutricionista(id)`. Para el contacto se agregan `registrarContacto(datos)` y `listarContactos()`. `listarServicios` devuelve solo los activos salvo que se pida `soloActivos: false`.
- **`services/fichasService.js`** (asíncrono): `listarPacientes(nutricionistaId)` (devuelve las fichas), `obtenerFicha(pacienteId)`, `crearFicha({ id, nutricionistaId, objetivo, antecedentes })`, `listarMediciones(pacienteId)`, `registrarMedicion(pacienteId, datos)`, `obtenerPlan(pacienteId)` y `guardarPlan(pacienteId, plan)`.
- **URL para el módulo de citas:** `/citas/solicitar?servicio=CN001&nutricionista=NUT003`, armada con `urlSolicitarCita`.
- **URL que recibe del módulo de citas:** `/nutricionista/pacientes/:pacienteId` (el id del usuario paciente).

## 5.6 Requisitos no funcionales del módulo

- **Rendimiento:** Leaflet y Recharts se cargan en diferido (`React.lazy` y `Suspense`); el paquete principal queda bajo 500 kB y el build no da advertencias.
- **Responsive:** todas las vistas del módulo se revisaron en 360, 768 y 1280 px sin scroll horizontal. Las tablas pasan a lista en el móvil.
- **Accesibilidad:**
  - Todos los campos tienen `<label>`; los errores usan role="alert" y las confirmaciones role="status".
  - El gráfico tiene una descripción (`role="img"` con `aria-label`) y una tabla con los mismos datos. La cinta métrica es decorativa (`aria-hidden`).
  - El diálogo de desactivar deja el foco en "Cancelar" y se cierra con Escape.
  - Texto blanco solo sobre Maqui, Cilantro o Murta.
- **Diseño:** la carta de servicios va en filas y no en tarjetas iguales; la audacia está en la cinta métrica de Mi progreso. Los colores salen de las variables `--nv-*` del tema y de las clases de Bootstrap.
- **Privacidad simulada en EP2:** la regla de que un nutricionista solo ve sus fichas se cumple en el frontend, que se puede saltar editando `localStorage`. En EP3 ms-clinica la repite en el servidor y responde 403 con "No puedes ver la ficha de un paciente de otro nutricionista.".

## 5.7 Registro de pruebas del módulo

| Prueba | Archivo (en `frontend/src/`) | Comportamiento verificado | Tipo | Mock o spy |
| --- | --- | --- | --- | --- |
| C-T1 | `utils/clinica.test.js` | `calcularImc(72.4, 170)` da 25.1 y `clasificarImc(25.1)` da "Sobrepeso". | Lógica | No |
| C-T2 | `utils/clinica.test.js` | `filtrarServicios` con tipo PLAN y texto "VEGANA" devuelve solo PL005; sin filtros devuelve los 18. | Lógica | No |
| C-T3 | `components/clinica/ServicioFila.test.jsx` | Muestra nombre, "50 min" y "$35.000" recibidos por props; un plan sin duración no muestra minutos. | Componente, props y render condicional | No |
| C-T4 | `components/clinica/FormMedicion.test.jsx` | Con peso fuera de rango muestra el error y no llama a `onGuardar`; con datos válidos muestra el IMC en vivo y llama a `onGuardar` una vez con la medición. | Formulario, evento y state | `vi.fn()` como `onGuardar` |

**Pruebas extra del módulo**, que suben la cobertura:

- `utils/clinica.test.js`: tildes, URL del contrato, días de atención, validaciones de contacto, ficha, plan y servicio, serie del gráfico, marcas de la cinta, próxima cita, privacidad de la ficha y búsqueda de pacientes.
- `data/serviciosData.test.js` y `data/fichasData.test.js`: CRUD, código único y servicio desactivado fuera del catálogo; mediciones y planes por paciente.
- `services/serviciosService.test.js`: contrato asíncrono y registro de contactos.
- `pages/clinica/Inicio.test.jsx` (con `vi.mock` de `citasService`), `Servicios.test.jsx`, `DetalleServicio.test.jsx`, `Planes.test.jsx` y `Nosotros.test.jsx`.
- `components/clinica/TarjetaNutricionista.test.jsx`, `FormContacto.test.jsx` (con `vi.fn()`), `MapaClinica.test.jsx`, `pages/clinica/Contacto.test.jsx` y `components/comunes/Footer.test.jsx`.
- `components/clinica/GraficoProgreso.test.jsx` (con `vi.stubGlobal` de `matchMedia`), `CintaMetrica.test.jsx` y `pages/clinica/MiProgreso.test.jsx` (con `vi.mock` de `citasService`).
- `pages/clinica/FichaPaciente.test.jsx` (con un spy sobre `listarMediciones`), `MisPacientes.test.jsx` y `components/clinica/FormPlan.test.jsx`.
- `components/clinica/FormServicio.test.jsx`, `pages/clinica/admin/AdminServicios.test.jsx` y `ServicioFormulario.test.jsx`.

## 5.8 Trazabilidad

| Requisito | Vistas | Componentes y lógica | Pruebas |
| --- | --- | --- | --- |
| RF-CLI-01 | `/` | `Inicio`, `urlSolicitarCita`, `MapaDiferido` | `Inicio.test.jsx` |
| RF-CLI-02 | `/servicios`, `/servicios/categoria/:tipo`, `/servicios/:codigo` | `Servicios`, `ServicioFila`, `DetalleServicio`, `filtrarServicios` | C-T2, C-T3, `Servicios.test.jsx`, `DetalleServicio.test.jsx` |
| RF-CLI-03 | `/planes` | `Planes`, `incluyeDelPlan` | `Planes.test.jsx` |
| RF-CLI-04 | `/nosotros` | `Nosotros`, `TarjetaNutricionista`, `describirDias` | `Nosotros.test.jsx`, `TarjetaNutricionista.test.jsx` |
| RF-CLI-05 | `/contacto` y pie de página | `Contacto`, `FormContacto`, `MapaClinica`, `Footer`, `validarContacto` | `FormContacto.test.jsx`, `Contacto.test.jsx`, `MapaClinica.test.jsx`, `Footer.test.jsx` |
| RF-CLI-06 | `/mi-progreso` | `MiProgreso`, `GraficoProgreso`, `CintaMetrica`, `calcularImc`, `proximaCita` | C-T1, `GraficoProgreso.test.jsx`, `CintaMetrica.test.jsx`, `MiProgreso.test.jsx` |
| RF-CLI-07 | `/nutricionista/pacientes`, `/nutricionista/pacientes/:pacienteId` | `MisPacientes`, `FichaPaciente`, `FormMedicion`, `FormPlan`, `FormFicha`, `accesoFicha`, `validarMedicion` | C-T1, C-T4, `FichaPaciente.test.jsx`, `MisPacientes.test.jsx`, `FormPlan.test.jsx` |
| RF-CLI-08 | `/admin/servicios`, `/admin/servicios/nuevo`, `/admin/servicios/:codigo` | `AdminServicios`, `TablaServicios`, `ServicioFormulario`, `FormServicio`, `ConfirmarDesactivacion`, `validarServicio` | `FormServicio.test.jsx`, `AdminServicios.test.jsx`, `ServicioFormulario.test.jsx` |

## 5.9 Datos asumidos

El caso no entrega estos datos; se usan valores referenciales y se declaran aquí.

| Dato | Valor usado | Por qué |
| --- | --- | --- |
| Ubicación | Sector Plaza Aníbal Pinto, Temuco (aprox. -38.739, -72.599) | El caso no da dirección: se usa una ubicación céntrica de Temuco. |
| Horario de la clínica | Lunes a viernes de 08:00 a 19:00; sábado de 09:00 a 14:00 | Cubre los horarios de los 4 nutricionistas de la semilla. |
| Teléfono | +56 45 200 0000 | Número de ejemplo con el código de área de Temuco. |
| Correo | contacto@nutrivida.cl | Dominio de ejemplo de la clínica. |
| Mediciones y planes | Javiera Soto: 5 mediciones de julio a octubre de 2026 y plan de 1.800 kcal; Tomás Huenchullán: 2 mediciones y plan deportivo; Ana Pérez: sin ficha | Permiten demostrar el gráfico, la privacidad entre nutricionistas y "Crear ficha". |
| Motivos de contacto | Consulta general, Agendamiento de horas, Planes y precios, Talleres grupales y Otro | Cubren las consultas habituales de una clínica. |
| Modalidades | Presencial, Online (video) y Presencial (grupo) | Las que usa el catálogo de 18 servicios. |
