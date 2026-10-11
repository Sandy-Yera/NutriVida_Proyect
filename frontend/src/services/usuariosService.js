import { usuariosSemilla } from "../data/semillas/usuarios.js";

export async function listarUsuarios({ rol, activo, texto } = {}) {
  return usuariosSemilla;
}

export async function obtenerUsuario(id) {
  return usuariosSemilla.find((u) => u.id === id) ?? null;
}

export async function crearUsuario(datos) {
  return { ...datos, id: "U999", activo: true };
}

export async function actualizarUsuario(id, cambios) {
  const usuario = await obtenerUsuario(id);
  return { ...usuario, ...cambios };
}

export async function cambiarEstado(id, activo) {
  const usuario = await obtenerUsuario(id);
  return { ...usuario, activo };
}

export async function cambiarRol(id, rol) {
  const usuario = await obtenerUsuario(id);
  return { ...usuario, rol };
}

export async function registrarPaciente(datos) {
  return { ...datos, id: "U999", rol: "PACIENTE", activo: true };
}
