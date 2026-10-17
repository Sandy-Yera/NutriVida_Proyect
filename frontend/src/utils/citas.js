import { aFechaIso, aFechaLocal, formatearFechaLarga } from "./formato.js";

const MS_24_HORAS = 24 * 60 * 60 * 1000;
const DURACION_BLOQUE = 30;
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const DIAS_ANTICIPACION = 60;
export const MOTIVO_MIN = 10;
export const MOTIVO_MAX = 300;

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

// RN-01: texto que acompaña al color de cada estado (ChipEstado, agendas y tablas).
export const ETIQUETAS_ESTADO = {
  PENDIENTE: "Pendiente",
  CONFIRMADA: "Confirmada",
  ATENDIDA: "Atendida",
  CANCELADA: "Cancelada",
  INASISTENCIA: "Inasistencia",
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

// Para SelectorHorario: de todos los bloques de la jornada, los que no se pueden elegir
// (tomados, pasados o donde el servicio no cabe). Es la prop "ocupados" del plan.
export function horasNoElegibles(horarios, disponibles) {
  return horarios.filter((hora) => !disponibles.includes(hora));
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

// RN-14: el motivo, ya sin espacios al inicio ni al final, tiene entre 10 y 300 caracteres.
export function validarMotivo(motivo) {
  const largo = String(motivo ?? "").trim().length;
  if (largo < MOTIVO_MIN) return `El motivo debe tener al menos ${MOTIVO_MIN} caracteres.`;
  if (largo > MOTIVO_MAX) return `El motivo puede tener como máximo ${MOTIVO_MAX} caracteres.`;
  return "";
}

// RN-13: se agenda desde hoy hasta 60 días adelante, en texto "AAAA-MM-DD".
// El asistente lo usa para el min y el max del calendario.
export function rangoFechasCita(ahora) {
  const desde = aFechaIso(ahora);
  return { desde, hasta: sumarDias(desde, DIAS_ANTICIPACION) };
}

// RN-13: se compara como texto "AAAA-MM-DD" para no depender de las horas
// (un cambio de horario de verano no corre el límite).
export function validarFechaCita(fecha, ahora) {
  if (!FORMATO_FECHA.test(String(fecha ?? ""))) return "La fecha debe tener el formato AAAA-MM-DD.";
  const { desde, hasta } = rangoFechasCita(ahora);
  if (fecha < desde) return "Esa fecha ya pasó. Elige una desde hoy.";
  if (fecha > hasta) {
    return `Solo se puede agendar hasta ${DIAS_ANTICIPACION} días adelante (hasta el ${formatearFechaLarga(hasta)}).`;
  }
  return "";
}

// RN-17: el asistente parte en el primer paso que falta, así se saltan los que ya
// vienen resueltos por la URL (?servicio, ?nutricionista) o por la reserva guardada.
export function primerPasoIncompleto(reserva) {
  if (!reserva.servicioCodigo) return 1;
  if (!reserva.nutricionistaId) return 2;
  if (!reserva.fecha || !reserva.hora) return 3;
  return 4;
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

export function sumarDias(fecha, dias) {
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

// S-05 Mis citas: "Próximas" son las que aún ocupan agenda y no han empezado (de la más cercana
// a la más lejana). "Historial" es todo lo demás, de la más reciente a la más antigua.
export function separarProximasEHistorial(citas, ahora) {
  const ordenadas = filtrarCitas(citas);
  const esProxima = (c) => ESTADOS_QUE_OCUPAN.includes(c.estado) && inicioDeCita(c) > ahora;
  return {
    proximas: ordenadas.filter(esProxima),
    historial: ordenadas.filter((c) => !esProxima(c)).reverse(),
  };
}

// RN-25: acciones de la secretaria sobre una cita. Salen de las transiciones permitidas (RN-02),
// sin ATENDIDA, que la marca el nutricionista (RN-26). Reprogramar es aparte (RN-05).
const ACCIONES_SECRETARIA = ["CONFIRMADA", "CANCELADA", "INASISTENCIA"];

export function accionesSecretaria(estado) {
  return (TRANSICIONES[estado] ?? []).filter((nuevo) => ACCIONES_SECRETARIA.includes(nuevo));
}

// RN-09, RN-25, RN-33: la grilla de la agenda de un día. Una fila por bloque, desde la hora en
// que empieza el primer nutricionista hasta la última hora del que termina más tarde, y una
// celda por nutricionista:
// - "fuera": ese bloque no está en su jornada (o no atiende ese día). Se muestra "—".
// - "citas": una o más citas empiezan en ese bloque.
// - "continua": el bloque lo ocupa una cita que empezó antes (por ejemplo, una de 50 min).
// - "libre": no hay nada.
export function armarAgenda(nutricionistas, fecha, citas) {
  if (nutricionistas.length === 0) return [];
  const inicio = Math.min(...nutricionistas.map((n) => aMinutos(n.horaInicio)));
  const fin = Math.max(...nutricionistas.map((n) => aMinutos(n.horaFin)));
  const bloquesPorNutricionista = new Map(
    nutricionistas.map((n) => [n.id, generarBloques(n, fecha)]),
  );
  const delDia = citas.filter((c) => c.fecha === fecha);

  const filas = [];
  for (let minuto = inicio; minuto + DURACION_BLOQUE <= fin; minuto += DURACION_BLOQUE) {
    const hora = aHoraTexto(minuto);
    const celdas = nutricionistas.map((n) => {
      if (!bloquesPorNutricionista.get(n.id).includes(hora)) {
        return { nutricionistaId: n.id, tipo: "fuera" };
      }
      const propias = delDia.filter((c) => c.nutricionistaId === n.id);
      const empiezan = propias.filter((c) => c.hora === hora);
      if (empiezan.length > 0) return { nutricionistaId: n.id, tipo: "citas", citas: empiezan };
      const continua = propias.some(
        (c) =>
          ESTADOS_QUE_OCUPAN.includes(c.estado) &&
          bloquesQueOcupa(c.hora, c.duracionMin).includes(hora),
      );
      return { nutricionistaId: n.id, tipo: continua ? "continua" : "libre" };
    });
    filas.push({ hora, celdas });
  }
  return filas;
}
