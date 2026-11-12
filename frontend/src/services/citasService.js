import * as citasData from "../data/citasData.js";
import * as pagosData from "../data/pagosData.js";
import * as citasUtils from "../utils/citas.js";
import {
  errorConflicto,
  errorDeCampo,
  errorNoEncontrado,
  errorProhibido,
} from "../utils/errores.js";
import { exigirActor } from "./actor.js";
import { obtener as obtenerUsuarioData } from "../data/usuariosData.js";
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
  if (errorFecha) throw errorDeCampo("fecha", errorFecha);

  const [citas, nutricionista] = await Promise.all([
    citasData.listar(),
    obtenerNutricionista(nutricionistaId),
  ]);
  if (!nutricionista) throw errorNoEncontrado("El nutricionista elegido no existe.");

  const otras = citas.filter((c) => c.id !== idExcluido);
  const libres = citasUtils.horariosDisponibles(nutricionista, fecha, otras, duracionMin, ahora);
  if (!libres.includes(hora)) {
    throw errorConflicto("Esa hora no está disponible con este nutricionista. Elige otra.", {
      campo: "hora",
    });
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
  exigirPaciente(datos.pacienteId);
  if (!servicio || !servicio.activo) {
    throw errorDeCampo("servicioCodigo", "El servicio elegido no está disponible.");
  }
  if (!pago) throw errorDeCampo("pagoId", "La cita necesita un pago registrado.");
  if (pago.estado !== "APROBADO") throw errorConflicto("El pago no fue aprobado.");
  if (pago.citaId) throw errorConflicto("Ese pago ya está asociado a otra cita.");
  if (pago.monto !== servicio.precio) {
    throw errorConflicto("El monto pagado no coincide con el precio del servicio.");
  }
  if (!esPresencial(servicio) && !(await puedeAgendarTeleconsulta(datos.pacienteId))) {
    throw errorConflicto("La teleconsulta requiere haber tenido antes una consulta presencial.");
  }
  await exigirHoraDisponible({ ...datos, duracionMin: servicio.duracionMin });

  // Sección crítica, sin ningún await: entre los await de arriba otra pestaña pudo usar este
  // pago, así que se vuelve a leer y se revisa justo antes de escribir. citasData.crear repite
  // el choque de horario (RN-10) en el mismo paso. Revisar, crear y enlazar no se separan.
  // En EP3 esto es un solo @Transactional en ms-citas (con UNIQUE en cita.pago_id).
  const pagoActual = pagosData.obtener(pago.id);
  if (pagoActual?.estado !== "APROBADO") throw errorConflicto("El pago no fue aprobado.");
  if (pagoActual.citaId) throw errorConflicto("Ese pago ya está asociado a otra cita.");
  const cita = citasData.crear({ ...datos, duracionMin: servicio.duracionMin });
  pagosData.actualizar(pago.id, { citaId: cita.id });
  return cita;
}

// RN-24 a RN-26 y RN-06: qué puede hacer cada rol sobre una cita. La página ya esconde los
// botones que no corresponden; aquí se vuelve a revisar porque en EP3 esta función será un
// endpoint (PATCH /api/citas/{id}/estado) y cualquiera podría llamarlo sin pasar por la página.
const ACCIONES_POR_ROL = {
  PACIENTE: ["CANCELADA"],
  NUTRICIONISTA: ["ATENDIDA", "INASISTENCIA"],
  SECRETARIA: ["CONFIRMADA", "CANCELADA", "INASISTENCIA"],
  ADMIN: ["CONFIRMADA", "CANCELADA", "ATENDIDA", "INASISTENCIA"],
};

export const MENSAJE_24H =
  "Solo puedes cancelar o reprogramar con más de 24 horas de anticipación. Llama a la clínica.";

function exigirCita(id) {
  const cita = citasData.obtener(id);
  if (!cita) throw errorNoEncontrado(`La cita ${id} no existe.`);
  return cita;
}

function exigirPaciente(pacienteId) {
  const paciente = pacienteId ? obtenerUsuarioData(pacienteId) : null;
  if (!paciente || paciente.rol !== "PACIENTE" || !paciente.activo) {
    throw errorDeCampo("pacienteId", "La cita debe ser de un paciente con cuenta activa.");
  }
}

// La cita tiene que ser "suya": del paciente que la pidió o del nutricionista que atiende.
function exigirCitaPropia(actor, cita) {
  if (actor.rol === "PACIENTE" && cita.pacienteId !== actor.id) {
    throw errorProhibido("Esa cita no es tuya.");
  }
  if (actor.rol === "NUTRICIONISTA" && cita.nutricionistaId !== actor.nutricionistaId) {
    throw errorProhibido("Esa cita no está en tu agenda.");
  }
}

// RN-02 a RN-08: valida el actor y la regla de 24 h; la transición la valida citasData.
// usuarioId lo entrega la página en EP2; en EP3 lo toma el microservicio desde el JWT.
export async function cambiarEstado(id, nuevoEstado, usuarioId) {
  const actual = exigirCita(id);
  const actor = exigirActor(usuarioId);
  exigirCitaPropia(actor, actual);
  if (!(ACCIONES_POR_ROL[actor.rol] ?? []).includes(nuevoEstado)) {
    throw errorProhibido("Tu rol no puede hacer ese cambio en la cita.");
  }
  if (
    actor.rol === "PACIENTE" &&
    citasUtils.puedeTransicionar(actual.estado, nuevoEstado) &&
    !citasUtils.puedeCancelar(actual, new Date())
  ) {
    throw errorConflicto(MENSAJE_24H);
  }

  // RN-08: al cancelar, el pago de la cita pasa a REEMBOLSADO. Esta función no tiene ningún
  // await: leer, validar, cambiar el estado y reembolsar ocurren en un solo paso.
  const cita = citasData.cambiarEstado(id, nuevoEstado, actor.id);
  if (nuevoEstado === "CANCELADA" && cita.pagoId && pagosData.obtener(cita.pagoId)) {
    pagosData.actualizar(cita.pagoId, { estado: "REEMBOLSADO" });
  }
  return cita;
}

// RN-05 y RN-10 a RN-13: la nueva hora debe ser una que el asistente ofrecería.
// Si la cita ya terminó, no se revisa la agenda: citasData.reprogramar lanza
// "Solo se puede reprogramar...". usuarioId alimenta el historial y los permisos.
// RN-06: el paciente solo reprograma con más de 24 h. El nutricionista no reprograma (RN-26).
export async function reprogramarCita(id, fecha, hora, usuarioId) {
  const cita = exigirCita(id);
  const actor = exigirActor(usuarioId, ["PACIENTE", "SECRETARIA", "ADMIN"]);
  exigirCitaPropia(actor, cita);
  if (actor.rol === "PACIENTE" && citasUtils.ESTADOS_QUE_OCUPAN.includes(cita.estado)) {
    if (!citasUtils.puedeCancelar(cita, new Date())) throw errorConflicto(MENSAJE_24H);
  }
  if (citasUtils.ESTADOS_QUE_OCUPAN.includes(cita.estado)) {
    await exigirHoraDisponible({ ...cita, fecha, hora }, id);
  }
  // Después del await, citasData.reprogramar vuelve a revisar en un solo paso el estado
  // (RN-05) y el choque de horario (RN-10) antes de escribir.
  return citasData.reprogramar(id, fecha, hora, actor.id);
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
