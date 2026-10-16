import { citasSemilla } from "../data/semillas/citas.js";
import * as citasData from "../data/citasData.js";
import * as pagosData from "../data/pagosData.js";
import { filtrarCitas, calcularEstadisticas } from "../utils/citas.js";
import { listarNutricionistas } from "./serviciosService.js";

export async function listarCitas({ pacienteId, nutricionistaId, estado, desde, hasta } = {}) {
  const citas = await citasData.listar();
  return filtrarCitas(citas, { pacienteId, nutricionistaId, estado, desde, hasta });
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

// Pendiente (P1-5): calcular con utils/citas.horariosDisponibles.
export async function horariosDisponibles(nutricionistaId, fecha) {
  return ["09:00", "09:30", "10:00", "10:30"];
}

// Pendiente (P1-5): recorrer los próximos días con horariosDisponibles.
export async function proximasHorasLibres(cantidad) {
  const [, , c3, c4, c5] = citasSemilla;
  const ejemplos = [
    { nutricionistaId: "NUT001", fecha: c3.fecha, hora: "09:00" },
    { nutricionistaId: "NUT003", fecha: c4.fecha, hora: "10:00" },
    { nutricionistaId: "NUT002", fecha: c5.fecha, hora: "11:00" },
    { nutricionistaId: "NUT001", fecha: c3.fecha, hora: "15:00" },
  ];
  return ejemplos.slice(0, cantidad);
}

export async function estadisticas(desde, hasta) {
  const [citas, nutricionistas] = await Promise.all([citasData.listar(), listarNutricionistas()]);
  return calcularEstadisticas(citas, desde, hasta, nutricionistas.map((n) => n.id));
}