import * as contactosData from "../data/contactosData.js";
import * as serviciosData from "../data/serviciosData.js";
import { nutricionistasSemilla } from "../data/semillas/nutricionistas.js";

export async function listarServicios({ tipo, texto, soloActivos = true } = {}) {
  return serviciosData.listar({ tipo, texto, soloActivos });
}

export async function obtenerServicio(codigo) {
  return serviciosData.obtener(codigo);
}

export async function crearServicio(datos) {
  return serviciosData.crear(datos);
}

export async function actualizarServicio(codigo, cambios) {
  return serviciosData.actualizar(codigo, cambios);
}

export async function cambiarEstadoServicio(codigo, activo) {
  return serviciosData.cambiarEstado(codigo, activo);
}

export async function listarNutricionistas() {
  return nutricionistasSemilla.map((nutricionista) => ({ ...nutricionista }));
}

export async function obtenerNutricionista(id) {
  const encontrado = nutricionistasSemilla.find((n) => n.id === id);
  return encontrado ? { ...encontrado } : null;
}

export async function registrarContacto(datos) {
  return contactosData.registrar(datos);
}

export async function listarContactos() {
  return contactosData.listar();
}
