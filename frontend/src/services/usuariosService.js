import * as usuariosData from "../data/usuariosData.js";
import { obtenerSesion } from "../auth/auth.js";
import { ErrorApi, errorNoAutenticado, errorProhibido } from "../utils/errores.js";

// Campos que cada persona puede cambiar de su propia cuenta desde Mi perfil (RF-ACC-05).
// Correo, RUT, rol, estado y vínculo con nutricionista solo los cambia el administrador.
// La clave nunca pasa por aquí: se cambia con cambiarClave, que exige la actual.
const CAMPOS_PERFIL_PROPIO = ["nombre", "apellido", "telefono"];

function prohibidoEnCampo(campo, mensaje) {
  return new ErrorApi(mensaje, { codigo: "PROHIBIDO", campo });
}

// En EP3 la sesión viene del JWT y estas reglas pasan a @PreAuthorize en ms-usuarios.
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

export async function listarUsuarios({ rol, activo, texto } = {}) {
  return usuariosData.listar({ rol, activo, texto }).map(sinClave);
}

// Convención de los services (y del cliente HTTP de EP3): obtener devuelve null si no existe (404).
export async function obtenerUsuario(id) {
  return sinClave(usuariosData.obtener(id));
}

export async function crearUsuario(datos) {
  exigirAdmin();
  return sinClave(usuariosData.crear(datos));
}

// El admin edita cualquier cuenta (menos su propio rol y estado). Cualquier otro rol solo edita
// su propia cuenta y solo nombre, apellido y teléfono.
export async function actualizarUsuario(id, cambios) {
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
  exigirAdmin();
  protegerCuentaPropia(id, { activo: Boolean(activo) });
  return sinClave(usuariosData.cambiarEstado(id, activo));
}

export async function cambiarRol(id, rol) {
  exigirAdmin();
  protegerCuentaPropia(id, { rol });
  return sinClave(usuariosData.cambiarRol(id, rol));
}

export async function registrarPaciente(datos) {
  return sinClave(usuariosData.registrarPaciente(datos));
}

// Cada persona cambia solo su propia clave.
export async function cambiarClave(id, claveActual, claveNueva) {
  const sesion = exigirSesion();
  if (sesion.id !== id) throw errorProhibido("Solo puedes cambiar tu propia contraseña.");
  return sinClave(usuariosData.cambiarClave(id, claveActual, claveNueva));
}
