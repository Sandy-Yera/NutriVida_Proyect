import { guardar, leer } from "./almacen.js";
import { citasSemilla } from "./semillas/citas.js";
import { aFechaIso } from "../utils/formato.js";
import { chocaConOtraCita, puedeTransicionar } from "../utils/citas.js";

const CLAVE = "nv_citas";
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function siguienteId(citas) {
  const mayor = citas.reduce((max, c) => Math.max(max, Number(c.id.slice(1)) || 0), 0);
  return `C${String(mayor + 1).padStart(4, "0")}`;
}

function buscarIndice(citas, id) {
  const indice = citas.findIndex((c) => c.id === id);
  if (indice === -1) throw new Error(`La cita ${id} no existe.`);
  return indice;
}

function validarFechaHora(fecha, hora) {
  if (!FORMATO_FECHA.test(String(fecha ?? ""))) {
    throw new Error("La fecha de la cita debe tener el formato AAAA-MM-DD.");
  }
  if (!FORMATO_HORA.test(String(hora ?? ""))) {
    throw new Error("La hora de la cita debe tener el formato HH:mm.");
  }
}

function validarHorarioLibre(citas, cita, idExcluido = null) {
  if (chocaConOtraCita(citas, cita, idExcluido)) {
    throw new Error("Ese horario ya está tomado. Elige otra hora.");
  }
}

function conHistorial(cita, nuevoEstado, usuarioId) {
  const entrada = {
    fecha: new Date().toISOString(),
    de: cita.estado,
    a: nuevoEstado,
    por: usuarioId ?? null,
  };
  return [...cita.historial, entrada];
}

function reemplazar(citas, indice, cita) {
  citas[indice] = cita;
  guardar(CLAVE, citas);
  return cita;
}

export function listar() {
  return leer(CLAVE, citasSemilla);
}

export function obtener(id) {
  return leer(CLAVE, citasSemilla).find((c) => c.id === id) ?? null;
}

// RN-03: toda cita nace PENDIENTE. RN-10: no puede ocupar un horario ya tomado.
export function crear(datos) {
  if (!datos.pacienteId || !datos.nutricionistaId || !datos.servicioCodigo) {
    throw new Error("Faltan datos de la cita: paciente, nutricionista y servicio.");
  }
  validarFechaHora(datos.fecha, datos.hora);
  const citas = leer(CLAVE, citasSemilla);
  const nueva = {
    id: siguienteId(citas),
    pacienteId: datos.pacienteId,
    nutricionistaId: datos.nutricionistaId,
    servicioCodigo: datos.servicioCodigo,
    fecha: datos.fecha,
    hora: datos.hora,
    duracionMin: datos.duracionMin ?? null,
    motivo: String(datos.motivo ?? "").trim(),
    estado: "PENDIENTE",
    pagoId: datos.pagoId ?? null,
    historial: [],
    creadaEn: aFechaIso(new Date()),
  };
  validarHorarioLibre(citas, nueva);
  guardar(CLAVE, [...citas, nueva]);
  return nueva;
}

// RN-02 y RN-04: solo transiciones permitidas, y cada cambio queda en el historial.
export function cambiarEstado(id, nuevoEstado, usuarioId) {
  const citas = leer(CLAVE, citasSemilla);
  const indice = buscarIndice(citas, id);
  const cita = citas[indice];
  if (!puedeTransicionar(cita.estado, nuevoEstado)) {
    throw new Error(
      `No se puede pasar una cita ${cita.estado.toLowerCase()} a ${String(nuevoEstado).toLowerCase()}.`,
    );
  }
  return reemplazar(citas, indice, {
    ...cita,
    estado: nuevoEstado,
    historial: conHistorial(cita, nuevoEstado, usuarioId),
  });
}

// RN-05: reprogramar deja la cita en PENDIENTE con la nueva fecha y hora, sin chocar con otra.
export function reprogramar(id, fecha, hora, usuarioId) {
  validarFechaHora(fecha, hora);
  const citas = leer(CLAVE, citasSemilla);
  const indice = buscarIndice(citas, id);
  const cita = citas[indice];
  if (!["PENDIENTE", "CONFIRMADA"].includes(cita.estado)) {
    throw new Error("Solo se puede reprogramar una cita pendiente o confirmada.");
  }
  validarHorarioLibre(citas, { ...cita, fecha, hora }, id);
  return reemplazar(citas, indice, {
    ...cita,
    fecha,
    hora,
    estado: "PENDIENTE",
    historial: conHistorial(cita, "PENDIENTE", usuarioId),
  });
}

// Para campos que no son de agenda (motivo, pagoId). El estado tiene sus propias operaciones.
export function actualizar(id, cambios) {
  if ("estado" in cambios || "historial" in cambios) {
    throw new Error("El estado de una cita se cambia con cambiarEstado o reprogramar.");
  }
  if ("fecha" in cambios || "hora" in cambios) {
    throw new Error("La fecha y la hora de una cita se cambian con reprogramar.");
  }
  const citas = leer(CLAVE, citasSemilla);
  const indice = buscarIndice(citas, id);
  const permitidos = { ...cambios };
  delete permitidos.id;
  delete permitidos.creadaEn;
  return reemplazar(citas, indice, { ...citas[indice], ...permitidos });
}
