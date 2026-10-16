import { aFechaIso, aFechaLocal } from "./formato.js";

const MS_24_HORAS = 24 * 60 * 60 * 1000;
const DURACION_BLOQUE = 30;

// RN-01 y RN-02: estados de una cita y transiciones permitidas.
// ATENDIDA, CANCELADA e INASISTENCIA son finales. Reprogramar no es una transición:
// lo resuelve citasData.reprogramar, que deja la cita en PENDIENTE.
export const TRANSICIONES = {
  PENDIENTE: ["CONFIRMADA", "CANCELADA"],
  CONFIRMADA: ["ATENDIDA", "INASISTENCIA", "CANCELADA"],
  ATENDIDA: [],
  CANCELADA: [],
  INASISTENCIA: [],
};

// RN-10: solo estas citas ocupan horario en la agenda.
export const ESTADOS_QUE_OCUPAN = ["PENDIENTE", "CONFIRMADA"];

export function aMinutos(hora) {
  const [h, m] = hora.split(":").map(Number); // "08:30" → 510
  return h * 60 + m;
}

export function aHoraTexto(minutos) {
  const h = String(Math.floor(minutos / 60)).padStart(2, "0");
  const m = String(minutos % 60).padStart(2, "0");
  return `${h}:${m}`; // 510 → "08:30"
}

// RN-11: una cita ocupa ceil(duración / 30) bloques seguidos. Sin duración (planes), 1 bloque.
export function bloquesQueOcupa(hora, duracionMin) {
  const cantidad = Math.ceil((duracionMin ?? DURACION_BLOQUE) / DURACION_BLOQUE);
  const inicio = aMinutos(hora);
  const bloques = [];
  for (let i = 0; i < cantidad; i++) bloques.push(aHoraTexto(inicio + i * DURACION_BLOQUE));
  return bloques; // bloquesQueOcupa("08:30", 50) → ["08:30", "09:00"]
}

export function inicioDeCita(cita) {
  const [h, m] = cita.hora.split(":").map(Number);
  const inicio = aFechaLocal(cita.fecha);
  inicio.setHours(h, m, 0, 0);
  return inicio;
}

// RN-09: bloques de 30 min dentro de la jornada, solo los días en que el nutricionista atiende.
export function generarBloques(nutricionista, fecha) {
  const dia = aFechaLocal(fecha).getDay();
  if (!nutricionista.dias.includes(dia)) return [];

  const inicio = aMinutos(nutricionista.horaInicio);
  const fin = aMinutos(nutricionista.horaFin);
  const cantidad = Math.floor((fin - inicio) / DURACION_BLOQUE);

  const bloques = [];
  for (let i = 0; i < cantidad; i++) {
    bloques.push(aHoraTexto(inicio + i * DURACION_BLOQUE));
  }
  return bloques;
}

// RN-10: ¿la cita choca con otra pendiente o confirmada del mismo nutricionista y día?
// idExcluido permite ignorar la propia cita al reprogramarla.
export function chocaConOtraCita(citas, cita, idExcluido = null) {
  const pedidos = new Set(bloquesQueOcupa(cita.hora, cita.duracionMin));
  return citas.some(
    (c) =>
      c.id !== idExcluido &&
      c.nutricionistaId === cita.nutricionistaId &&
      c.fecha === cita.fecha &&
      ESTADOS_QUE_OCUPAN.includes(c.estado) &&
      bloquesQueOcupa(c.hora, c.duracionMin).some((b) => pedidos.has(b)),
  );
}

// RN-10 a RN-12: horas donde la cita cabe completa, sin choques y, si se pasa ahora, sin horas pasadas.
export function horariosDisponibles(nutricionista, fecha, citas, duracionMin, ahora) {
  const bloques = generarBloques(nutricionista, fecha);

  const ocupados = new Set();
  citas
    .filter(
      (c) =>
        c.nutricionistaId === nutricionista.id &&
        c.fecha === fecha &&
        ESTADOS_QUE_OCUPAN.includes(c.estado),
    )
    .forEach((c) => bloquesQueOcupa(c.hora, c.duracionMin).forEach((b) => ocupados.add(b)));

  return bloques.filter((b) => {
    const cabe = bloquesQueOcupa(b, duracionMin).every(
      (n) => bloques.includes(n) && !ocupados.has(n),
    );
    const noHaPasado = !ahora || inicioDeCita({ fecha, hora: b }) > ahora;
    return cabe && noHaPasado;
  });
}

export function puedeTransicionar(actual, nuevo) {
  return (TRANSICIONES[actual] ?? []).includes(nuevo);
}

// RN-06: el paciente cancela o reprograma solo con más de 24 h de anticipación.
export function puedeCancelar(cita, ahora) {
  if (!puedeTransicionar(cita.estado, "CANCELADA")) return false;
  return inicioDeCita(cita) - ahora > MS_24_HORAS;
}

// RN-07: recordatorio para citas confirmadas a las que les faltan 24 h o menos.
export function necesitaRecordatorio(cita, ahora) {
  if (cita.estado !== "CONFIRMADA") return false;
  const faltanteMs = inicioDeCita(cita) - ahora;
  return faltanteMs > 0 && faltanteMs <= MS_24_HORAS;
}

// RN-16: la teleconsulta exige una atención presencial previa.
// codigosNoPresenciales se recibe por parámetro para no depender del catálogo:
// si se agrega otro servicio online, el service le pasa la lista actualizada.
export function puedeAgendarTeleconsulta(citasDelPaciente, codigosNoPresenciales = ["CN004"]) {
  return citasDelPaciente.some(
    (cita) => cita.estado === "ATENDIDA" && !codigosNoPresenciales.includes(cita.servicioCodigo),
  );
}

// Filtros opcionales: si no se pasa uno, no restringe. Fechas en texto "AAAA-MM-DD".
export function filtrarCitas(citas, { pacienteId, nutricionistaId, estado, desde, hasta } = {}) {
  return citas
    .filter(
      (c) =>
        (!pacienteId || c.pacienteId === pacienteId) &&
        (!nutricionistaId || c.nutricionistaId === nutricionistaId) &&
        (!estado || c.estado === estado) &&
        (!desde || c.fecha >= desde) &&
        (!hasta || c.fecha <= hasta),
    )
    .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
}

export function agruparPorNutricionista(citas, nutricionistaIds) {
  return nutricionistaIds.map((nutricionistaId) => ({
    nutricionistaId,
    total: citas.filter((cita) => cita.nutricionistaId === nutricionistaId).length,
  }));
}

export function agruparPorSemana(citas, desde, hasta) {
  const ultima = lunesDeLaSemana(hasta);
  const semanas = [];
  for (let lunes = lunesDeLaSemana(desde); lunes <= ultima; lunes = sumarDias(lunes, 7)) {
    semanas.push(lunes);
  }
  return semanas.map((semana) => ({
    semana,
    total: citas.filter((cita) => lunesDeLaSemana(cita.fecha) === semana).length,
  }));
}

export function lunesDeLaSemana(fecha) {
  const d = aFechaLocal(fecha);
  const dia = d.getDay();
  d.setDate(d.getDate() - dia + (dia === 0 ? -6 : 1));
  return aFechaIso(d);
}

function sumarDias(fecha, dias) {
  // texto → texto, con días de calendario
  const d = aFechaLocal(fecha);
  d.setDate(d.getDate() + dias);
  return aFechaIso(d);
}

export function calcularEstadisticas(citas, desde, hasta, nutricionistaIds) {
  const delPeriodo = filtrarCitas(citas, { desde, hasta }).filter((c) => c.estado !== "CANCELADA");
  const total = delPeriodo.length;
  const atendidas = delPeriodo.filter((c) => c.estado === "ATENDIDA").length;
  const inasistencias = delPeriodo.filter((c) => c.estado === "INASISTENCIA").length;
  const tasaInasistencia =
    atendidas + inasistencias > 0 ? inasistencias / (atendidas + inasistencias) : 0;
  const porNutricionista = agruparPorNutricionista(delPeriodo, nutricionistaIds);
  const porSemana = agruparPorSemana(delPeriodo, desde, hasta);

  return {
    total,
    atendidas,
    inasistencias,
    tasaInasistencia,
    porNutricionista,
    porSemana,
  };
}

// Para el Inicio (agenda rápida): las próximas horas libres de toda la clínica, desde ahora.
// Recorre día por día (con un tope) y ordena por fecha, hora y nutricionista.
export function buscarProximasHorasLibres(
  nutricionistas,
  citas,
  ahora,
  cantidad,
  diasMaximos = 14,
) {
  const encontradas = [];
  let fecha = aFechaIso(ahora);
  for (let dia = 0; dia < diasMaximos && encontradas.length < cantidad; dia++) {
    const delDia = nutricionistas.flatMap((nutricionista) =>
      horariosDisponibles(nutricionista, fecha, citas, DURACION_BLOQUE, ahora).map((hora) => ({
        nutricionistaId: nutricionista.id,
        fecha,
        hora,
      })),
    );
    delDia.sort(
      (a, b) => a.hora.localeCompare(b.hora) || a.nutricionistaId.localeCompare(b.nutricionistaId),
    );
    encontradas.push(...delDia);
    fecha = sumarDias(fecha, 1);
  }
  return encontradas.slice(0, Math.max(0, cantidad));
}