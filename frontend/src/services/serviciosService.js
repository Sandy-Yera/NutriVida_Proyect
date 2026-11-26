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
import { apiFetch, apiFetchONull, leerToken, query, usarApi } from "./http.js";

// Modo API (EP3, C-34): mismas firmas, contra ms-clinica (contrato §1: /api/servicios,
// /api/nutricionistas y /api/contactos). Los permisos los aplica el backend con el token; los
// errores llegan con el formato común y los formularios los muestran igual que en modo local.
async function conToken(ruta, opciones) {
  return apiFetch(ruta, opciones);
}

const codigoEnRuta = (codigo) => encodeURIComponent(codigo);

// Catálogo público con respaldo, igual que el modo auto de ms-citas (ClinicaConRespaldo): si
// ms-clinica no responde (sin conexión o 503), se muestran las semillas de EP2. Solo lecturas;
// crear, editar o desactivar nunca usan el respaldo.
async function catalogoConRespaldo(llamada, local) {
  try {
    return await llamada();
  } catch (error) {
    if (error.codigo === "SIN_CONEXION") return local();
    throw error;
  }
}

// Los formularios envían texto ("40", ""); la API recibe números o null.
function numeroONull(valor) {
  if (valor === undefined) return undefined;
  if (valor === null || valor === "") return null;
  const numero = Number(valor);
  return Number.isNaN(numero) ? null : numero;
}

function cuerpoServicio(datos) {
  return {
    ...datos,
    duracionMin: numeroONull(datos.duracionMin),
    precio: numeroONull(datos.precio),
    cupoMax: numeroONull(datos.cupoMax),
  };
}

// La foto viaja reducida (prepararFoto) como multipart, igual que la elige el usuario.
function dataUrlABlob(dataUrl) {
  const [cabecera, base64] = dataUrl.split(",");
  const tipo = cabecera.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: tipo });
}

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
  if (usarApi()) {
    const filtros = query({ tipo, texto, soloActivos: soloActivos ? undefined : false });
    return catalogoConRespaldo(
      () => conToken(`/api/servicios${filtros}`),
      () => serviciosData.listar({ tipo, texto, soloActivos }),
    );
  }
  return serviciosData.listar({ tipo, texto, soloActivos });
}

// Convención: obtener devuelve null si no existe (el cliente HTTP de EP3 traduce el 404 a null).
export async function obtenerServicio(codigo) {
  if (usarApi()) {
    return catalogoConRespaldo(
      () => apiFetchONull(`/api/servicios/${codigoEnRuta(codigo)}`),
      () => serviciosData.obtener(codigo),
    );
  }
  return serviciosData.obtener(codigo);
}

export async function crearServicio(datos) {
  if (usarApi()) return conToken("/api/servicios", { method: "POST", body: cuerpoServicio(datos) });
  exigirAdmin();
  return serviciosData.crear(datos);
}

export async function actualizarServicio(codigo, cambios) {
  if (usarApi()) {
    return conToken(`/api/servicios/${codigoEnRuta(codigo)}`, {
      method: "PATCH",
      body: cuerpoServicio(cambios),
    });
  }
  exigirAdmin();
  return serviciosData.actualizar(codigo, cambios);
}

export async function cambiarEstadoServicio(codigo, activo) {
  if (usarApi()) {
    return conToken(`/api/servicios/${codigoEnRuta(codigo)}/estado`, {
      method: "PATCH",
      body: { activo: Boolean(activo) },
    });
  }
  exigirAdmin();
  return serviciosData.cambiarEstado(codigo, activo);
}

// ---- Nutricionistas ----

export async function listarNutricionistas() {
  if (usarApi()) {
    return catalogoConRespaldo(
      () => apiFetch("/api/nutricionistas"),
      () => nutricionistasData.listar(),
    );
  }
  return nutricionistasData.listar();
}

export async function obtenerNutricionista(id) {
  if (usarApi()) {
    return catalogoConRespaldo(
      () => apiFetchONull(`/api/nutricionistas/${encodeURIComponent(id)}`),
      () => nutricionistasData.obtener(id),
    );
  }
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
  if (!usarApi()) exigirPermisoFoto(id); // en modo API decide ms-clinica (403)
  const error = validarArchivoFoto(archivo);
  if (error) {
    const codigo = archivo && !TIPOS_FOTO.includes(archivo.type) ? "TIPO_NO_SOPORTADO" : null;
    throw new ErrorApi(error, {
      codigo: codigo ?? (archivo ? "MUY_GRANDE" : "VALIDACION"),
      campo: "foto",
    });
  }
  const fotoUrl = await prepararFoto(archivo);
  if (usarApi()) {
    const formulario = new FormData();
    formulario.append("foto", dataUrlABlob(fotoUrl), archivo.name || "foto.jpg");
    return conToken(`/api/nutricionistas/${encodeURIComponent(id)}/foto`, {
      method: "PUT",
      body: formulario,
    });
  }
  return nutricionistasData.actualizarFoto(id, fotoUrl);
}

// EP3: DELETE /api/nutricionistas/{id}/foto.
export async function eliminarFotoNutricionista(id) {
  if (usarApi()) {
    await conToken(`/api/nutricionistas/${encodeURIComponent(id)}/foto`, { method: "DELETE" });
    return obtenerNutricionista(id);
  }
  exigirPermisoFoto(id);
  return nutricionistasData.actualizarFoto(id, null);
}

// ---- Contacto ----

export async function registrarContacto(datos) {
  if (usarApi()) {
    try {
      return await conToken("/api/contactos", { method: "POST", body: datos });
    } catch (error) {
      // Tarea de integración: hasta que SecurityConfig de ms-clinica declare público el POST,
      // un visitante sin sesión recibe 401. Mientras tanto el mensaje queda en este navegador.
      if (error.estado === 401 && !leerToken()) return contactosData.registrar(datos);
      throw error;
    }
  }
  return contactosData.registrar(datos);
}

export async function listarContactos() {
  if (usarApi()) return conToken("/api/contactos");
  exigirAdmin();
  return contactosData.listar();
}
