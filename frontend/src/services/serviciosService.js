import * as contactosData from "../data/contactosData.js";
import * as nutricionistasData from "../data/nutricionistasData.js";
import * as serviciosData from "../data/serviciosData.js";
import { obtenerSesion } from "../auth/auth.js";
import {
  ErrorApi,
  errorNoAutenticado,
  errorNoEncontrado,
  errorProhibido,
} from "../utils/errores.js";
import { prepararFoto, TIPOS_FOTO, validarArchivoFoto } from "../utils/fotos.js";

// En EP3 estas reglas pasan a @PreAuthorize en ms-clinica; la sesión sale del JWT.
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

// ---- Catálogo de servicios ----

export async function listarServicios({ tipo, texto, soloActivos = true } = {}) {
  return serviciosData.listar({ tipo, texto, soloActivos });
}

// Convención: obtener devuelve null si no existe (el cliente HTTP de EP3 traduce el 404 a null).
export async function obtenerServicio(codigo) {
  return serviciosData.obtener(codigo);
}

export async function crearServicio(datos) {
  exigirAdmin();
  return serviciosData.crear(datos);
}

export async function actualizarServicio(codigo, cambios) {
  exigirAdmin();
  return serviciosData.actualizar(codigo, cambios);
}

export async function cambiarEstadoServicio(codigo, activo) {
  exigirAdmin();
  return serviciosData.cambiarEstado(codigo, activo);
}

// ---- Nutricionistas ----

export async function listarNutricionistas() {
  return nutricionistasData.listar();
}

export async function obtenerNutricionista(id) {
  return nutricionistasData.obtener(id);
}

// La foto la cambia el propio nutricionista (Mi perfil) o el administrador (Editar usuario).
// Nadie más, y solo la foto: correo y teléfono no forman parte de la ficha pública.
function exigirPermisoFoto(id) {
  const sesion = exigirSesion();
  const esPropio = sesion.rol === "NUTRICIONISTA" && sesion.nutricionistaId === id;
  if (sesion.rol !== "ADMIN" && !esPropio) {
    throw errorProhibido("Solo puedes cambiar tu propia foto.");
  }
  if (!nutricionistasData.obtener(id)) throw errorNoEncontrado("El nutricionista no existe.");
}

// EP3: PUT /api/nutricionistas/{id}/foto (multipart/form-data, parte "foto").
// Recibe un File del <input type="file"> y devuelve el nutricionista con su fotoUrl nueva.
export async function actualizarFotoNutricionista(id, archivo) {
  exigirPermisoFoto(id);
  const error = validarArchivoFoto(archivo);
  if (error) {
    const codigo = archivo && !TIPOS_FOTO.includes(archivo.type) ? "TIPO_NO_SOPORTADO" : null;
    throw new ErrorApi(error, {
      codigo: codigo ?? (archivo ? "MUY_GRANDE" : "VALIDACION"),
      campo: "foto",
    });
  }
  const fotoUrl = await prepararFoto(archivo);
  return nutricionistasData.actualizarFoto(id, fotoUrl);
}

// EP3: DELETE /api/nutricionistas/{id}/foto.
export async function eliminarFotoNutricionista(id) {
  exigirPermisoFoto(id);
  return nutricionistasData.actualizarFoto(id, null);
}

// ---- Contacto ----

export async function registrarContacto(datos) {
  return contactosData.registrar(datos);
}

export async function listarContactos() {
  exigirAdmin();
  return contactosData.listar();
}
