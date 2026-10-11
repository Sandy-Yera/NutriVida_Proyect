import { fichasSemilla, medicionesSemilla, planesSemilla } from "../data/semillas/fichas.js";

export async function listarPacientes(nutricionistaId) {
  return fichasSemilla;
}

export async function obtenerFicha(pacienteId) {
  return fichasSemilla.find((f) => f.id === pacienteId) ?? null;
}

export async function crearFicha(datos) {
  return { ...datos, creadaEn: new Date().toLocaleDateString("sv-SE") };
}

export async function listarMediciones(pacienteId) {
  return medicionesSemilla.filter((m) => m.pacienteId === pacienteId);
}

export async function registrarMedicion(pacienteId, datos) {
  return { ...datos, id: "M9999", pacienteId };
}

export async function obtenerPlan(pacienteId) {
  return planesSemilla.find((p) => p.pacienteId === pacienteId) ?? null;
}

export async function guardarPlan(pacienteId, plan) {
  return { ...plan, pacienteId };
}
