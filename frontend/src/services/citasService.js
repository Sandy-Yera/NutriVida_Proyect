import { citasSemilla } from "../data/semillas/citas.js";

export async function listarCitas({ pacienteId, nutricionistaId, estado, desde, hasta } = {}) {
  return citasSemilla;
}

export async function obtenerCita(id) {
  return citasSemilla.find((c) => c.id === id) ?? null;
}

export async function crearCita(datos) {
  return {
    ...datos,
    id: "C9999",
    estado: "PENDIENTE",
    historial: [],
    creadaEn: new Date().toLocaleDateString("sv-SE"),
  };
}

export async function cambiarEstado(id, nuevoEstado, usuarioId) {
  const cita = await obtenerCita(id);
  return { ...cita, estado: nuevoEstado };
}

export async function reprogramarCita(id, fecha, hora) {
  const cita = await obtenerCita(id);
  return { ...cita, fecha, hora, estado: "PENDIENTE" };
}

export async function horariosDisponibles(nutricionistaId, fecha) {
  return ["09:00", "09:30", "10:00", "10:30"];
}

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
  return {
    total: 5,
    atendidas: 1,
    inasistencias: 1,
    tasaInasistencia: 0.5,
    porNutricionista: [
      { nutricionistaId: "NUT001", total: 2 },
      { nutricionistaId: "NUT002", total: 2 },
      { nutricionistaId: "NUT003", total: 1 },
      { nutricionistaId: "NUT004", total: 0 },
    ],
    porSemana: [
      { semana: "2026-09-07", total: 1 },
      { semana: "2026-09-28", total: 1 },
      { semana: "2026-10-05", total: 3 },
    ],
  };
}
