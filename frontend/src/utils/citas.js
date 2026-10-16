import { aFechaLocal } from "./formato.js";

const MS_24_HORAS = 24 * 60 * 60 * 1000;
const TRANSICIONES = {
    PENDIENTE: ["CONFIRMADA", "CANCELADA"],
    CONFIRMADA: ["ATENDIDA", "INASISTENCIA", "CANCELADA"],
    ATENDIDA: [],
    CANCELADA: [],
    INASISTENCIA: [],
};
const DURACION_BLOQUE = 30;


// generarBloques de la fase 1 (Tareas Simon)
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


// puedeTransicionar de la fase 1 (Tareas Simon)
export function puedeTransicionar(actual, nuevo) {
    return (TRANSICIONES[actual] ?? []).includes(nuevo);
}


// puedeCancelar de la fase 1 (Tareas Simon)
export function puedeCancelar(cita, ahora) {
    // Se necesita saber la fecha y hora de inicio de la cita
    // Obtener la fecha actual y contrastar
    // Si hay menos de 24 horas, return false si no, true
    if (!puedeTransicionar(cita.estado, "CANCELADA")) return false;
    return inicioDeCita(cita) - ahora > MS_24_HORAS;
}


// necesitaRecordatorio de la fase 1 (Tareas Simon)
export function necesitaRecordatorio(cita, ahora) {
    if (cita.estado !== "CONFIRMADA") return false;
    const faltanteMs = inicioDeCita(cita) - ahora;
    return faltanteMs > 0 && faltanteMs <= MS_24_HORAS;
}


// puedeAgendarTeleconsulta de la fase 1 (Tareas Simon)
export function puedeAgendarTeleconsulta(citasDelPaciente, codigosNoPresenciales = ["CN004"]) {
    // Decidí añadir un parametro más que sería la lista de codigosNoPresenciales.
    // Antes si alguien añadia un service se desactualizaba la función, aquí se busca la solucion
    return citasDelPaciente.some(
        (cita) => cita.estado === "ATENDIDA" && !codigosNoPresenciales.includes(cita.servicioCodigo),
    );
}

// filtrarCitas, se utilizará para el citasService.js
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

export function horariosDisponibles(nutricionista, fecha, citas, duracionMin, ahora) {
    const bloques = generarBloques(nutricionista, fecha);

    // Tu idea: marcar lo que ocupan las citas pendientes o confirmadas
    const ocupados = new Set();
    citas
        .filter((c) => c.nutricionistaId === nutricionista.id && c.fecha === fecha && ["PENDIENTE", "CONFIRMADA"].includes(c.estado))
        .forEach((c) => bloquesQueOcupa(c.hora, c.duracionMin).forEach((b) => ocupados.add(b)));

    // Segunda mitad: dejar solo los bloques donde la cita nueva cabe completa
    return bloques.filter((b) =>
        bloquesQueOcupa(b, duracionMin).every((n) => bloques.includes(n) && !ocupados.has(n)),
        // y además, si se pasa `ahora`, descartar los que ya empezaron (usa inicioDeCita)
    );
}



export function inicioDeCita(cita) {
    // Obtiene la fecha y hora de inicio de la cita
    const [h, m] = cita.hora.split(":").map(Number);
    const inicio = aFechaLocal(cita.fecha);
    inicio.setHours(h, m, 0, 0);
    return inicio;
}




export function aMinutos(hora) {
    const [h, m] = hora.split(":").map(Number); // "08:30" → [8, 30]
    return h * 60 + m; // → 510
}

export function aHoraTexto(minutos) {
    const h = String(Math.floor(minutos / 60)).padStart(2, "0");
    const m = String(minutos % 60).padStart(2, "0");
    return `${h}:${m}`; // 510 → "08:30"
}

export function bloquesQueOcupa(hora, duracionMin) {
    const cantidad = Math.ceil((duracionMin ?? DURACION_BLOQUE) / DURACION_BLOQUE);
    const inicio = aMinutos(hora);
    const bloques = [];
    for (let i = 0; i < cantidad; i++) bloques.push(aHoraTexto(inicio + i * DURACION_BLOQUE));
    return bloques;   // bloquesQueOcupa("08:30", 50) → ["08:30", "09:00"]
}