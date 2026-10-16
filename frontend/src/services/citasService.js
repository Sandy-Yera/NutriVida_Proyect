import * as citasData from "../data/citasData.js";
import * as pagosData from "../data/pagosData.js";
import * as citasUtils from "../utils/citas.js";
import { listarNutricionistas, obtenerNutricionista } from "./serviciosService.js";

export async function listarCitas({ pacienteId, nutricionistaId, estado, desde, hasta } = {}) {
  const citas = await citasData.listar();
  return citasUtils.filtrarCitas(citas, { pacienteId, nutricionistaId, estado, desde, hasta });
}

export async function obtenerCita(id) {
  return citasData.obtener(id);
}

export async function crearCita(datos) {
  return citasData.crear(datos);
}

// RN-08: al cancelar, el pago de la cita pasa a REEMBOLSADO.
export async function cambiarEstado(id, nuevoEstado, usuarioId) {
  const cita = citasData.cambiarEstado(id, nuevoEstado, usuarioId);
  if (nuevoEstado === "CANCELADA" && cita.pagoId && pagosData.obtener(cita.pagoId)) {
    pagosData.actualizar(cita.pagoId, { estado: "REEMBOLSADO" });
  }
  return cita;
}

// usuarioId es un cuarto parámetro opcional: no cambia el contrato y alimenta el historial.
export async function reprogramarCita(id, fecha, hora, usuarioId) {
  return citasData.reprogramar(id, fecha, hora, usuarioId);
}

// RN-10 a RN-12: horas libres del nutricionista ese día, sin choques ni horas pasadas.
// duracionMin es un tercer parámetro opcional: no cambia el contrato.
export async function horariosDisponibles(nutricionistaId, fecha, duracionMin = 30) {
  const [citas, nutricionista] = await Promise.all([
    citasData.listar(),
    obtenerNutricionista(nutricionistaId),
  ]);
  if (!nutricionista) return [];
  return citasUtils.horariosDisponibles(nutricionista, fecha, citas, duracionMin, new Date());
}

// Agenda rápida del Inicio (Catalina): las próximas horas libres de cualquier nutricionista.
export async function proximasHorasLibres(cantidad) {
  const [citas, nutricionistas] = await Promise.all([citasData.listar(), listarNutricionistas()]);
  return citasUtils.buscarProximasHorasLibres(nutricionistas, citas, new Date(), cantidad);
}

export async function estadisticas(desde, hasta) {
  const [citas, nutricionistas] = await Promise.all([citasData.listar(), listarNutricionistas()]);
  return citasUtils.calcularEstadisticas(
    citas,
    desde,
    hasta,
    nutricionistas.map((n) => n.id),
  );
}
