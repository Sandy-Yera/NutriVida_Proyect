import { serviciosSemilla } from "../data/semillas/servicios.js";
import { nutricionistasSemilla } from "../data/semillas/nutricionistas.js";

export async function listarServicios({ tipo, texto, soloActivos } = {}) {
  return serviciosSemilla;
}

export async function obtenerServicio(codigo) {
  return serviciosSemilla.find((s) => s.codigo === codigo) ?? null;
}

export async function crearServicio(datos) {
  return { ...datos, activo: true };
}

export async function actualizarServicio(codigo, cambios) {
  const servicio = await obtenerServicio(codigo);
  return { ...servicio, ...cambios };
}

export async function cambiarEstadoServicio(codigo, activo) {
  const servicio = await obtenerServicio(codigo);
  return { ...servicio, activo };
}

export async function listarNutricionistas() {
  return nutricionistasSemilla;
}

export async function obtenerNutricionista(id) {
  return nutricionistasSemilla.find((n) => n.id === id) ?? null;
}
