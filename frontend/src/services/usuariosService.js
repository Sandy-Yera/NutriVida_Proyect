import * as usuariosData from "../data/usuariosData.js";
import { obtenerSesion } from "../auth/auth.js";

function protegerCuentaPropia(id, cambios) {
  const sesion = obtenerSesion();
  if (!sesion || sesion.id !== id) return;
  if (cambios.activo === false) {
    throw usuariosData.errorDeCampo("activo", "No puedes desactivar tu propia cuenta.");
  }
  if (cambios.rol !== undefined && cambios.rol !== sesion.rol) {
    throw usuariosData.errorDeCampo("rol", "No puedes cambiar tu propio rol.");
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

export async function obtenerUsuario(id) {
  return sinClave(usuariosData.obtener(id));
}

export async function crearUsuario(datos) {
  return sinClave(usuariosData.crear(datos));
}

export async function actualizarUsuario(id, cambios) {
  protegerCuentaPropia(id, cambios);
  return sinClave(usuariosData.actualizar(id, cambios));
}

export async function cambiarEstado(id, activo) {
  protegerCuentaPropia(id, { activo: Boolean(activo) });
  return sinClave(usuariosData.cambiarEstado(id, activo));
}

export async function cambiarRol(id, rol) {
  protegerCuentaPropia(id, { rol });
  return sinClave(usuariosData.cambiarRol(id, rol));
}

export async function registrarPaciente(datos) {
  return sinClave(usuariosData.registrarPaciente(datos));
}

export async function cambiarClave(id, claveActual, claveNueva) {
  return sinClave(usuariosData.cambiarClave(id, claveActual, claveNueva));
}
