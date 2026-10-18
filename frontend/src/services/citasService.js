import * as citasData from "../data/citasData.js";
import * as pagosData from "../data/pagosData.js";
import * as citasUtils from "../utils/citas.js";
import {
  listarNutricionistas,
  listarServicios,
  obtenerNutricionista,
  obtenerServicio,
} from "./serviciosService.js";

const esPresencial = (servicio) => servicio.modalidad.startsWith("Presencial");

// RN-10 a RN-13: la fecha está dentro de los 60 días y la hora es una de las que el asistente
// ofrecería (dentro de la jornada, sin choques, sin horas pasadas y con la cita completa).
// Usa la misma función que el asistente, así la página y el service no pueden contradecirse.
async function exigirHoraDisponible({ nutricionistaId, fecha, hora, duracionMin }, idExcluido) {
  const ahora = new Date();
  const errorFecha = citasUtils.validarFechaCita(fecha, ahora);
  if (errorFecha) throw new Error(errorFecha);

  const [citas, nutricionista] = await Promise.all([
    citasData.listar(),
    obtenerNutricionista(nutricionistaId),
  ]);
  if (!nutricionista) throw new Error("El nutricionista elegido no existe.");

  const otras = citas.filter((c) => c.id !== idExcluido);
  const libres = citasUtils.horariosDisponibles(nutricionista, fecha, otras, duracionMin, ahora);
  if (!libres.includes(hora)) {
    throw new Error("Esa hora no está disponible con este nutricionista. Elige otra.");
  }
}

export async function listarCitas({ pacienteId, nutricionistaId, estado, desde, hasta } = {}) {
  const citas = await citasData.listar();
  return citasUtils.filtrarCitas(citas, { pacienteId, nutricionistaId, estado, desde, hasta });
}

export async function obtenerCita(id) {
  return citasData.obtener(id);
}

// RN-16: los servicios no presenciales (hoy solo CN004) exigen una atención presencial previa.
// Combina el catálogo de Catalina con las citas del paciente, por eso vive en el service.
// Es una función nueva: no cambia ninguna firma del contrato. La usa el asistente (paso 1).
export async function puedeAgendarTeleconsulta(pacienteId) {
  const [servicios, citas] = await Promise.all([
    listarServicios({ soloActivos: false }),
    listarCitas({ pacienteId }),
  ]);
  const noPresenciales = servicios.filter((s) => !esPresencial(s)).map((s) => s.codigo);
  return citasUtils.puedeAgendarTeleconsulta(citas, noPresenciales);
}

// RN-35: una cita solo se crea con un pago APROBADO, por el precio exacto del servicio,
// y que no esté asociado a otra cita. Después de crearla, el pago queda enlazado a ella.
// También repite las reglas del asistente (RN-10 a RN-13 y RN-16): la página ayuda, el service decide.
export async function crearCita(datos) {
  const [pago, servicio] = await Promise.all([
    pagosData.obtener(datos.pagoId),
    obtenerServicio(datos.servicioCodigo),
  ]);
  if (!servicio || !servicio.activo) throw new Error("El servicio elegido no está disponible.");
  if (!pago) throw new Error("La cita necesita un pago registrado.");
  if (pago.estado !== "APROBADO") throw new Error("El pago no fue aprobado.");
  if (pago.citaId) throw new Error("Ese pago ya está asociado a otra cita.");
  if (pago.monto !== servicio.precio) {
    throw new Error("El monto pagado no coincide con el precio del servicio.");
  }
  if (!esPresencial(servicio) && !(await puedeAgendarTeleconsulta(datos.pacienteId))) {
    throw new Error("La teleconsulta requiere haber tenido antes una consulta presencial.");
  }
  await exigirHoraDisponible({ ...datos, duracionMin: servicio.duracionMin });

  const cita = citasData.crear({ ...datos, duracionMin: servicio.duracionMin });
  pagosData.actualizar(pago.id, { citaId: cita.id });
  return cita;
}

// RN-08: al cancelar, el pago de la cita pasa a REEMBOLSADO.
export async function cambiarEstado(id, nuevoEstado, usuarioId) {
  const cita = citasData.cambiarEstado(id, nuevoEstado, usuarioId);
  if (nuevoEstado === "CANCELADA" && cita.pagoId && pagosData.obtener(cita.pagoId)) {
    pagosData.actualizar(cita.pagoId, { estado: "REEMBOLSADO" });
  }
  return cita;
}

// RN-05 y RN-10 a RN-13: la nueva hora debe ser una que el asistente ofrecería.
// Si la cita no existe o ya terminó, no se revisa la agenda: citasData.reprogramar
// lanza el error que corresponde ("no existe" o "Solo se puede reprogramar...").
// usuarioId es un cuarto parámetro opcional: no cambia el contrato y alimenta el historial.
export async function reprogramarCita(id, fecha, hora, usuarioId) {
  const cita = citasData.obtener(id);
  if (cita && citasUtils.ESTADOS_QUE_OCUPAN.includes(cita.estado)) {
    await exigirHoraDisponible({ ...cita, fecha, hora }, id);
  }
  return citasData.reprogramar(id, fecha, hora, usuarioId);
}

// RN-10 a RN-12: horas libres del nutricionista ese día, sin choques ni horas pasadas.
// duracionMin e idExcluido son parámetros opcionales: no cambian el contrato.
// idExcluido sirve para reprogramar: la propia cita no ocupa su horario (igual que en reprogramarCita).
export async function horariosDisponibles(
  nutricionistaId,
  fecha,
  duracionMin = 30,
  idExcluido = null,
) {
  const [citas, nutricionista] = await Promise.all([
    citasData.listar(),
    obtenerNutricionista(nutricionistaId),
  ]);
  if (!nutricionista) return [];
  const otras = citas.filter((c) => c.id !== idExcluido);
  return citasUtils.horariosDisponibles(nutricionista, fecha, otras, duracionMin, new Date());
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
