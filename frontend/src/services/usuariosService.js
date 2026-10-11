import * as usuariosData from "../data/usuariosData.js";

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
  return sinClave(usuariosData.actualizar(id, cambios));
}

export async function cambiarEstado(id, activo) {
  return sinClave(usuariosData.cambiarEstado(id, activo));
}

export async function cambiarRol(id, rol) {
  return sinClave(usuariosData.cambiarRol(id, rol));
}

export async function registrarPaciente(datos) {
  return sinClave(usuariosData.registrarPaciente(datos));
}
