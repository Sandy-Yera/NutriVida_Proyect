import * as usuariosData from "../data/usuariosData.js";
import { obtenerSesion, refrescarSesion } from "../auth/auth.js";
import { ErrorApi, errorConflicto, errorNoAutenticado, errorProhibido } from "../utils/errores.js";
import { apiFetch, apiFetchONull, query, usarApi } from "./http.js";

// Campos que cada persona puede cambiar de su propia cuenta desde Mi perfil (RF-ACC-05).
// Correo, RUT, rol, estado y vínculo con nutricionista solo los cambia el administrador.
// La clave nunca pasa por aquí: se cambia con cambiarClave, que exige la actual.
const CAMPOS_PERFIL_PROPIO = ["nombre", "apellido", "telefono"];

function prohibidoEnCampo(campo, mensaje) {
  return new ErrorApi(mensaje, { codigo: "PROHIBIDO", campo });
}

// Modo local: las mismas reglas que ms-usuarios aplica con @PreAuthorize y en UsuarioService.
function exigirSesion() {
  const sesion = obtenerSesion();
  if (!sesion) throw errorNoAutenticado();
  return sesion;
}

function exigirAdmin() {
  const sesion = exigirSesion();
  if (sesion.rol !== "ADMIN") throw errorProhibido("Solo el administrador puede hacer esto.");
  return sesion;
}

function protegerCuentaPropia(id, cambios) {
  const sesion = obtenerSesion();
  if (!sesion || sesion.id !== id) return;
  if (cambios.activo === false) {
    throw prohibidoEnCampo("activo", "No puedes desactivar tu propia cuenta.");
  }
  if (cambios.rol !== undefined && cambios.rol !== sesion.rol) {
    throw prohibidoEnCampo("rol", "No puedes cambiar tu propio rol.");
  }
}

function sinClave(usuario) {
  if (!usuario) return null;
  const copia = { ...usuario };
  delete copia.clave;
  return copia;
}

// Modo API (G-35): sin campos vacíos, de solo lectura ni la clave. En un PATCH, campo
// ausente = sin cambio.
function aCuerpo(datos, { conClave = false } = {}) {
  const cuerpo = {};
  Object.entries(datos).forEach(([campo, valor]) => {
    if (valor === "" || valor === undefined || ["id", "creadoEn", "confirmacion"].includes(campo))
      return;
    if (campo === "clave" && !conClave) return;
    cuerpo[campo] = valor;
  });
  return cuerpo;
}

export async function listarUsuarios({ rol, activo, texto } = {}) {
  if (usarApi()) return apiFetch(`/api/usuarios${query({ rol, activo, texto })}`);
  return usuariosData.listar({ rol, activo, texto }).map(sinClave);
}

// Convención de los services (y del cliente HTTP de EP3): obtener devuelve null si no existe (404).
export async function obtenerUsuario(id) {
  if (usarApi()) return apiFetchONull(`/api/usuarios/${encodeURIComponent(id)}`);
  return sinClave(usuariosData.obtener(id));
}

export async function crearUsuario(datos) {
  if (usarApi()) {
    return apiFetch("/api/usuarios", { method: "POST", body: aCuerpo(datos, { conClave: true }) });
  }
  exigirAdmin();
  return sinClave(usuariosData.crear(datos));
}

// El admin edita cualquier cuenta (menos su propio rol y estado). Cualquier otro rol solo edita
// su propia cuenta y solo nombre, apellido y teléfono.
export async function actualizarUsuario(id, cambios) {
  if (usarApi()) {
    const actualizado = await apiFetch(`/api/usuarios/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: aCuerpo(cambios),
    });
    refrescarSesion(actualizado);
    return actualizado;
  }
  const sesion = exigirSesion();
  const limpios = { ...cambios };
  delete limpios.clave;
  if (sesion.rol !== "ADMIN") {
    if (sesion.id !== id) throw errorProhibido("Solo puedes editar tu propia cuenta.");
    const noPermitido = Object.keys(limpios).find((c) => !CAMPOS_PERFIL_PROPIO.includes(c));
    if (noPermitido) {
      throw prohibidoEnCampo(noPermitido, "Ese dato solo lo puede cambiar el administrador.");
    }
  }
  protegerCuentaPropia(id, limpios);
  return sinClave(usuariosData.actualizar(id, limpios));
}

export async function cambiarEstado(id, activo) {
  if (usarApi()) {
    return apiFetch(`/api/usuarios/${encodeURIComponent(id)}/estado`, {
      method: "PATCH",
      body: { activo: Boolean(activo) },
    });
  }
  exigirAdmin();
  protegerCuentaPropia(id, { activo: Boolean(activo) });
  return sinClave(usuariosData.cambiarEstado(id, activo));
}

export async function cambiarRol(id, rol) {
  if (usarApi()) {
    return apiFetch(`/api/usuarios/${encodeURIComponent(id)}/rol`, {
      method: "PATCH",
      body: { rol },
    });
  }
  exigirAdmin();
  protegerCuentaPropia(id, { rol });
  return sinClave(usuariosData.cambiarRol(id, rol));
}

// G-33: solo el admin, nunca su propia cuenta y solo cuentas ya desactivadas (las demás
// tienen historial en citas y fichas).
export async function eliminarUsuario(id) {
  if (usarApi()) {
    await apiFetch(`/api/usuarios/${encodeURIComponent(id)}`, { method: "DELETE" });
    return;
  }
  const sesion = exigirAdmin();
  if (sesion.id === id) throw errorProhibido("No puedes eliminar tu propia cuenta.");
  const usuario = usuariosData.obtener(id);
  if (usuario?.activo) throw errorConflicto("Desactiva la cuenta antes de eliminarla.");
  usuariosData.eliminar(id);
}

export async function registrarPaciente(datos) {
  if (usarApi()) {
    return apiFetch("/api/auth/registro", {
      method: "POST",
      body: aCuerpo(datos, { conClave: true }),
    });
  }
  return sinClave(usuariosData.registrarPaciente(datos));
}

// Cada persona cambia solo su propia clave.
export async function cambiarClave(id, claveActual, claveNueva) {
  if (usarApi()) {
    return apiFetch(`/api/usuarios/${encodeURIComponent(id)}/clave`, {
      method: "PUT",
      body: { claveActual, claveNueva },
    });
  }
  const sesion = exigirSesion();
  if (sesion.id !== id) throw errorProhibido("Solo puedes cambiar tu propia contraseña.");
  return sinClave(usuariosData.cambiarClave(id, claveActual, claveNueva));
}
