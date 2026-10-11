import * as fichasData from "../data/fichasData.js";

export async function listarPacientes(nutricionistaId) {
  return fichasData.listarFichas(nutricionistaId);
}

export async function obtenerFicha(pacienteId) {
  return fichasData.obtenerFicha(pacienteId);
}

export async function crearFicha(datos) {
  return fichasData.crearFicha(datos);
}

export async function listarMediciones(pacienteId) {
  return fichasData.listarMediciones(pacienteId);
}

export async function registrarMedicion(pacienteId, datos) {
  return fichasData.registrarMedicion(pacienteId, datos);
}

export async function obtenerPlan(pacienteId) {
  return fichasData.obtenerPlan(pacienteId);
}

export async function guardarPlan(pacienteId, plan) {
  return fichasData.guardarPlan(pacienteId, plan);
}
