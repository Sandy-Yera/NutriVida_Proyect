# 3. Módulo de acceso y administración

Responsable: Gabriel. Tareas G-00 a G-11 del plan del proyecto. ERS V2 (EP2, frontend React con datos simulados).

## 3.1 Alcance

El módulo controla quién entra al sistema y qué puede ver cada rol. Incluye el inicio y cierre de sesión, el registro de pacientes, el perfil de cada usuario, la protección de rutas por rol, el panel de administración (usuarios, dashboard y reportes) y los consejos nutricionales públicos.

Todos los roles pasan por este módulo: el login es la puerta de entrada y la navegación cambia según el rol de la sesión.

## 3.2 Actores

| Actor | Qué hace en este módulo |
| --- | --- |
| Visitante (sin sesión) | Inicia sesión, se registra como paciente y lee los consejos nutricionales. |
| Paciente | Inicia y cierra sesión, edita su perfil y cambia su contraseña. |
| Secretaria | Inicia y cierra sesión, edita su perfil y cambia su contraseña. |
| Nutricionista | Inicia y cierra sesión, edita su perfil y cambia su contraseña. |
| Administrador | Todo lo anterior, más la gestión de usuarios, el dashboard y los reportes. |

## 3.3 Requisitos funcionales

### RF-ACC-01 Iniciar sesión y llegar a la vista de su rol

- **Descripción:** el usuario ingresa su correo y su contraseña. Si son correctos y la cuenta está activa, entra al sistema y llega a la vista de su rol.
- **Actores:** todos los roles.
- **Prioridad:** alta.
- **Vista:** `/login` (`pages/acceso/Login.jsx`).
- **Reglas:**
  - El correo se compara sin distinguir mayúsculas.
  - Si el usuario llegó al login desde una ruta protegida, vuelve a esa ruta con sus parámetros. Si no, va a la vista de su rol: Administrador a `/admin`, Secretaria a `/secretaria/agenda`, Nutricionista a `/nutricionista/agenda` y Paciente a `/mis-citas`.
  - La sesión guarda solo `id`, `nombre`, `rol` y `nutricionistaId`. Nunca guarda la contraseña.
- **Mensajes (role="alert"):** "Debe completar correo y contraseña.", "Correo o contraseña incorrectos." y "Tu cuenta está desactivada. Contacta a la clínica.".
- **Datos:** lee `nv_usuarios`; escribe la sesión en `usuarioActual`.
- **Criterio de aceptación:** los 4 usuarios demo entran y llegan a su vista; los 3 mensajes de error se muestran en sus casos.
- **Pruebas:** G-T3, más las pruebas extra de `Login.test.jsx` y `auth.test.js`.

### RF-ACC-02 Registrarse como paciente

- **Descripción:** un visitante crea su cuenta de paciente. Al terminar queda con la sesión iniciada.
- **Actores:** visitante.
- **Prioridad:** alta.
- **Vista:** `/registro` (`pages/acceso/Registro.jsx`).
- **Campos:** nombre, apellido, RUT, teléfono celular, correo, fecha de nacimiento, contraseña, confirmación y aceptación del tratamiento de los datos de salud.
- **Reglas:**
  - Nombre y apellido: obligatorios, de 2 a 50 caracteres y solo letras.
  - RUT: dígito verificador módulo 11, con o sin puntos y guion, con K mayúscula o minúscula. Se guarda con el formato 12.345.678-5.
  - Teléfono: celular chileno, +56 9 y 8 dígitos. Se guarda con el formato +56 9 1234 5678.
  - Correo: formato nombre@dominio. Se guarda en minúsculas.
  - Fecha de nacimiento: obligatoria y no futura.
  - Contraseña: 8 o más caracteres, con al menos una mayúscula y un número. La confirmación debe coincidir.
  - La aceptación del tratamiento de datos de salud es obligatoria.
  - El correo y el RUT no pueden estar registrados.
  - La cuenta nace con rol PACIENTE y activa.
- **Comportamiento:**
  - Cada error aparece bajo su campo, con role="alert", y el foco va al primer campo con error.
  - Al registrar, inicia la sesión y lleva a `/mis-citas` con el aviso "Cuenta creada. Ya puedes solicitar tu primera cita." (role="status").
- **Datos:** crea un usuario en `nv_usuarios` con un id correlativo (U103, U104…).
- **Criterio de aceptación:** un RUT con dígito verificador incorrecto muestra "El RUT no es válido: revisa el dígito verificador."; un registro válido entra a Mis citas con la sesión iniciada.
- **Pruebas:** G-T1 y G-T2, más las pruebas extra de `Registro.test.jsx` y `validaciones.test.js`.

### RF-ACC-03 Cerrar sesión

- **Descripción:** el usuario termina su sesión desde el menú de usuario de la barra superior o desde la barra lateral del panel de administración.
- **Actores:** todos los roles con sesión.
- **Prioridad:** alta.
- **Vistas:** `Navbar` (menú de usuario) y `LayoutAdmin` (barra lateral).
- **Reglas:** se elimina `usuarioActual` y se vuelve al inicio (`/`). Las rutas protegidas vuelven a pedir el login.
- **Pruebas:** pruebas extra de `Navbar.test.jsx` y `auth.test.js`.

### RF-ACC-04 Restringir las vistas según los 4 roles

- **Descripción:** cada ruta protegida declara qué roles pueden verla. La barra de navegación muestra solo los enlaces del rol de la sesión.
- **Actores:** todos.
- **Prioridad:** alta.
- **Componentes:** `RutaProtegida` (prop `roles`) y `Navbar` con los menús de `config/menu.js`.
- **Reglas:**
  - Sin sesión, la ruta protegida redirige a `/login` y recuerda la ruta de origen.
  - Con sesión pero sin el rol, vuelve a `/` con el aviso "No tienes acceso a esa sección.".
  - Si el usuario de la sesión fue desactivado o ya no existe, la sesión se cierra en la siguiente vista.
  - Menú público: Servicios, Planes, Nosotros, Consejos y Contacto. Además, Paciente ve Mis citas y Mi progreso; Secretaria, Agenda; Nutricionista, Mi agenda y Mis pacientes; Administrador, Panel.
  - El botón "Solicitar cita" está siempre visible.
- **Criterio de aceptación:** escribir `/admin` a mano sin sesión termina en `/login`; cada rol ve solo su menú.
- **Pruebas:** G-T4, más las pruebas extra de `Navbar.test.jsx` y `auth.test.js`.

### RF-ACC-05 Ver y editar el perfil; cambiar la contraseña

- **Descripción:** cualquier usuario con sesión ve sus datos, edita su nombre, su apellido y su teléfono, y cambia su contraseña.
- **Actores:** todos los roles con sesión.
- **Prioridad:** media.
- **Vista:** `/perfil` (`pages/acceso/Perfil.jsx`), protegida sin restricción de rol.
- **Reglas:**
  - El RUT, el correo y el rol se muestran, pero no se editan desde el perfil.
  - Nombre, apellido y teléfono siguen las mismas reglas del registro.
  - Para cambiar la contraseña se pide la actual, la nueva y la confirmación. La actual debe ser correcta, la nueva cumple las reglas de contraseña y debe ser distinta de la actual.
- **Mensajes:** "Ingresa tu contraseña actual.", "La contraseña actual no es correcta.", "La nueva contraseña debe ser distinta de la actual."; en caso de éxito, "Datos actualizados." y "Contraseña actualizada." (role="status").
- **Datos:** actualiza el usuario en `nv_usuarios`. La barra superior muestra el nombre nuevo de inmediato.
- **Criterio de aceptación:** los cambios siguen ahí después de recargar (F5) y la sesión muestra el nombre nuevo.
- **Pruebas:** pruebas extra de `Perfil.test.jsx`, `usuariosData.test.js` y `validaciones.test.js`.

### RF-ACC-06 Administrador: listar, buscar y filtrar usuarios

- **Descripción:** el administrador ve todos los usuarios en una tabla, que en el móvil se muestra como lista de tarjetas.
- **Actores:** administrador.
- **Prioridad:** alta.
- **Vista:** `/admin/usuarios` (`AdminUsuarios.jsx`, con `FiltroUsuarios` y `TablaUsuarios`).
- **Reglas:**
  - La búsqueda por texto compara el nombre completo sin distinguir tildes ni mayúsculas, el correo y el RUT con o sin puntos.
  - Filtros por rol (todos o uno de los 4) y por estado (todos, activos o inactivos).
  - Sin resultados se muestra "No hay usuarios que coincidan con la búsqueda." y el botón "Limpiar filtros".
  - Columnas: nombre, RUT, correo, rol, estado y acciones.
- **Criterio de aceptación:** cada filtro cambia la lista pidiendo los datos al servicio con el filtro aplicado.
- **Pruebas:** pruebas extra de `AdminUsuarios.test.jsx` (con `vi.mock` de `usuariosService`) y de `usuariosData.test.js`.

### RF-ACC-07 Administrador: crear, editar, asignar rol y desactivar usuarios

- **Descripción:** el administrador crea usuarios de cualquier rol, los edita y los activa o desactiva.
- **Actores:** administrador.
- **Prioridad:** alta.
- **Vistas:** `/admin/usuarios/nuevo` y `/admin/usuarios/:id` (`UsuarioFormulario.jsx` con `FormUsuario`); acciones de la tabla en `/admin/usuarios`.
- **Campos:** nombre, apellido, RUT, correo, teléfono, rol, nutricionista vinculado (solo con el rol NUTRICIONISTA), estado activo y clave temporal (solo al crear).
- **Reglas:**
  - Los usuarios no se eliminan: se desactivan, para conservar su historial de citas y fichas.
  - Activar o desactivar pide confirmación en un diálogo.
  - El correo, el RUT y el nutricionista vinculado son únicos. Los nutricionistas ya vinculados a otro usuario aparecen deshabilitados.
  - Al quitar el rol de nutricionista se libera el vínculo.
  - El administrador no puede desactivarse ni cambiar su propio rol: la vista lo bloquea y el servicio lo rechaza con "No puedes desactivar tu propia cuenta." y "No puedes cambiar tu propio rol.".
  - Los errores de correo, RUT o nutricionista repetido aparecen bajo el campo que corresponde.
  - La clave temporal sigue las reglas de contraseña. El usuario puede cambiarla en Mi perfil.
- **Criterio de aceptación:** se crea una secretaria nueva, entra y llega a su agenda; al desactivarla ya no puede entrar.
- **Pruebas:** pruebas extra de `FormUsuario.test.jsx` (con `vi.fn()` como `onGuardar`), `AdminUsuarios.test.jsx`, `usuariosService.test.js` y `validaciones.test.js`.

### RF-ACC-08 Administrador: dashboard y reportes

- **Descripción:** el administrador ve un resumen del mes y reportes por rango de fechas con gráficos y una tabla con los mismos números.
- **Actores:** administrador.
- **Prioridad:** alta.
- **Vistas:**
  - `/admin` (`Dashboard.jsx`): 4 indicadores (citas del mes, porcentaje de inasistencia del mes, pacientes activos y citas por confirmar) y accesos al resto del panel.
  - `/admin/reportes` (`Reportes.jsx`): rango de fechas con atajos (este mes, últimos 3 y 6 meses) y fechas propias; barras de atenciones por semana y por nutricionista, cada una con su tabla; indicadores del período y medidor de la tasa de inasistencia.
- **Reglas:**
  - Tasa de inasistencia = inasistencias / (atendidas + inasistencias). Si no hay atendidas ni inasistencias, se muestra "Sin datos".
  - Con un total de 0 citas se muestra "Sin datos en este período".
  - Si la fecha de inicio es posterior a la de término no se consulta y se muestra "La fecha de inicio debe ser anterior o igual a la de término.".
  - Gráficos con los colores de la paleta: Maqui para las atenciones y Murta para la inasistencia.
- **Datos:** las estadísticas se piden a `citasService.estadisticas(desde, hasta)` del módulo de citas; los pacientes activos, a `usuariosService.listarUsuarios`; las citas por confirmar, a `citasService.listarCitas`.
- **Criterio de aceptación:** al cambiar el rango cambian los gráficos y la tabla; la vista se ve bien en el móvil.
- **Pruebas:** pruebas extra de `Reportes.test.jsx` y `Dashboard.test.jsx` (con `vi.mock` de los servicios) y de `reportes.test.js`.

### RF-ACC-09 Consultar consejos nutricionales

- **Descripción:** cualquier visitante lee la lista de consejos y el detalle de cada uno.
- **Actores:** todos, sin necesidad de sesión.
- **Prioridad:** media.
- **Vistas:** `/consejos` (lista con `ArticuloCard`), `/consejos/:id` (detalle) y la página 404 (`NoEncontrada`) para rutas inexistentes.
- **Reglas:**
  - Cada consejo muestra el título, el resumen, el nutricionista autor y la fecha.
  - Si el id del consejo no existe, se muestra "El consejo que buscas no existe." y un enlace a la lista.
- **Datos:** artículos estáticos en `data/semillas/articulos.js`, firmados por nutricionistas de la clínica.

## 3.4 Datos del módulo

| Entidad | Campos | Persistencia |
| --- | --- | --- |
| usuario | id, nombre, apellido, rut, correo, telefono, fechaNacimiento, clave (solo EP2, simulada), rol, activo, nutricionistaId (solo nutricionistas), creadoEn | `localStorage`, clave `nv_usuarios` |
| sesión | id, nombre, rol, nutricionistaId | `localStorage`, clave `usuarioActual` |
| articulo | id, titulo, resumen, contenido, autorNutricionistaId, fecha | estático |

Roles: `ADMIN`, `SECRETARIA`, `NUTRICIONISTA` y `PACIENTE`. Los nombres de los campos se mantienen en EP3: la API devolverá el mismo JSON.

## 3.5 Interfaces que ofrece el módulo

- **`auth/auth.js`:** `iniciarSesion(correo, clave)`, `obtenerSesion()`, `cerrarSesion()`, `tieneRol(...roles)` y `rutaInicioPorRol(rol)`.
- **`services/usuariosService.js`** (asíncrono, nunca devuelve la contraseña): `listarUsuarios({ rol, activo, texto })`, `obtenerUsuario(id)`, `crearUsuario(datos)`, `actualizarUsuario(id, cambios)`, `cambiarEstado(id, activo)`, `cambiarRol(id, rol)` y `registrarPaciente(datos)`. Para Mi perfil se agrega `cambiarClave(id, claveActual, claveNueva)`, equivalente a `PUT /api/usuarios/me/clave` de EP3.
- **Componentes reutilizables para los otros módulos:** `RutaProtegida`, `DialogoConfirmacion` y la clase `.tabla-lista` del tema, que convierte una tabla en lista de tarjetas en el móvil.

## 3.6 Requisitos no funcionales del módulo

- **Seguridad simulada en EP2:** la sesión y las contraseñas guardadas en el navegador (`localStorage`) son una simulación académica, igual que en el Tutorial 03 del curso. No son seguras. En EP3 se reemplazan por contraseñas con hash BCrypt, tokens JWT y validación de roles en el servidor (ms-usuarios).
- **Responsive:** todas las vistas del módulo se revisaron en 360, 768 y 1280 px sin scroll horizontal. Bajo 992 px la barra superior pasa a menú hamburguesa; bajo 768 px las tablas pasan a lista de tarjetas.
- **Accesibilidad:**
  - Todos los campos tienen `<label>`.
  - Los errores usan role="alert" y las confirmaciones role="status".
  - El foco de teclado es visible.
  - El enlace activo se marca con `aria-current`.
  - Los gráficos tienen una tabla con los mismos números.
- **Usabilidad:** los errores dicen qué corregir (por ejemplo, "El RUT no es válido: revisa el dígito verificador.") y los formularios conservan lo escrito al mostrar errores.

## 3.7 Registro de pruebas del módulo

| Prueba | Archivo (en `frontend/src/`) | Comportamiento verificado | Tipo | Mock o spy |
| --- | --- | --- | --- | --- |
| G-T1 | `utils/validaciones.test.js` | `validarRut` acepta 12.345.678-5 y rechaza 12.345.678-9; también acepta el RUT sin puntos ni guion y con K minúscula. | Lógica | No |
| G-T2 | `utils/validaciones.test.js` | `validarClave` rechaza claves sin mayúscula, sin número o con menos de 8 caracteres, y acepta "Paciente2026!". | Lógica | No |
| G-T3 | `pages/acceso/Login.test.jsx` | Con las credenciales de la secretaria navega a `/secretaria/agenda`; con una clave incorrecta muestra la alerta y no navega (MemoryRouter). | Interacción y navegación | No |
| G-T4 | `components/comunes/RutaProtegida.test.jsx` | Sin sesión redirige a `/login` recordando la ruta; con el rol permitido muestra el contenido; con otro rol no lo muestra y vuelve al inicio con el aviso. | Componente y render condicional | `vi.mock` de `auth.js` para simular la sesión de cada rol |

**Pruebas extra del módulo**, que suben la cobertura:

- `data/usuariosData.test.js`: CRUD, unicidad de correo, RUT y nutricionista, y desactivación sin borrar.
- `services/usuariosService.test.js`: no devuelve la contraseña; reglas de la cuenta propia del administrador.
- `auth/auth.test.js`: sesión mínima, usuario desactivado y ruta de inicio por rol.
- `components/comunes/Navbar.test.jsx`: menú por rol, enlace activo, menú hamburguesa y cierre de sesión.
- `pages/acceso/Registro.test.jsx`: errores por campo, registro completo y correo repetido.
- `components/acceso/FormUsuario.test.jsx`: crear, editar y cuenta propia, con `vi.fn()` como `onGuardar`.
- `pages/acceso/admin/AdminUsuarios.test.jsx`: desactivar con confirmación y filtros, con `vi.mock` de `usuariosService`.
- `pages/acceso/admin/Reportes.test.jsx` y `Dashboard.test.jsx`: carga con `useEffect` y cambio de rango, con `vi.mock` de los servicios.
- `utils/formato.test.js` y `utils/reportes.test.js`: formatos y rangos de fechas.

## 3.8 Trazabilidad

| Requisito | Vistas | Componentes y lógica | Pruebas |
| --- | --- | --- | --- |
| RF-ACC-01 | `/login` | `Login`, `auth.iniciarSesion`, `rutaInicioPorRol` | G-T3, `Login.test.jsx`, `auth.test.js` |
| RF-ACC-02 | `/registro` | `Registro`, `CampoTexto`, `validaciones.js`, `registrarPaciente` | G-T1, G-T2, `Registro.test.jsx` |
| RF-ACC-03 | Barra superior y barra lateral del admin | `Navbar`, `LayoutAdmin`, `auth.cerrarSesion` | `Navbar.test.jsx`, `auth.test.js` |
| RF-ACC-04 | Todas las rutas protegidas | `RutaProtegida`, `Navbar`, `config/menu.js` | G-T4, `Navbar.test.jsx` |
| RF-ACC-05 | `/perfil` | `Perfil`, `actualizarUsuario`, `cambiarClave` | `Perfil.test.jsx` |
| RF-ACC-06 | `/admin/usuarios` | `AdminUsuarios`, `FiltroUsuarios`, `TablaUsuarios` | `AdminUsuarios.test.jsx`, `usuariosData.test.js` |
| RF-ACC-07 | `/admin/usuarios/nuevo`, `/admin/usuarios/:id` | `UsuarioFormulario`, `FormUsuario`, `DialogoConfirmacion` | `FormUsuario.test.jsx`, `AdminUsuarios.test.jsx`, `usuariosService.test.js` |
| RF-ACC-08 | `/admin`, `/admin/reportes` | `Dashboard`, `Reportes`, `TarjetaKpi`, `GraficoBarras`, `MedidorInasistencia` | `Dashboard.test.jsx`, `Reportes.test.jsx`, `reportes.test.js` |
| RF-ACC-09 | `/consejos`, `/consejos/:id`, `*` | `Consejos`, `ConsejoDetalle`, `ArticuloCard`, `NoEncontrada` | Revisión manual |

## 3.9 Datos asumidos

Usuarios de demostración, uno o más por rol. Los RUT son ficticios y solo cumplen el dígito verificador.

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | admin@nutrivida.cl | Admin2026! |
| Secretaria | recepcion@nutrivida.cl | Recepcion2026! |
| Nutricionista | cfuentes@nutrivida.cl, rsepulveda@nutrivida.cl, dmorales@nutrivida.cl, faraya@nutrivida.cl | Nutri2026! |
| Paciente | javiera.soto@correo.cl, tomas.h@correo.cl, ana.perez@correo.cl | Paciente2026! |
