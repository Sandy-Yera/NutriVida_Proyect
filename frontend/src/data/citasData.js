import { guardar, leer } from "./almacen.js";
import { citasSemilla } from "./semillas/citas.js";
import { aFechaIso } from "../utils/formato.js";
import { puedeTransicionar } from "../utils/citas.js";

const CLAVE = "nv_citas";

function siguienteId(citas) {
    const mayor = citas.reduce((max, c) => Math.max(max, Number(c.id.slice(1)) || 0), 0);
    return `C${String(mayor + 1).padStart(4, "0")}`;
}

function buscarIndice(citas, id) {
    const indice = citas.findIndex((c) => c.id === id);
    if (indice === -1) throw new Error(`La cita ${id} no existe.`);
    return indice;
}

export function listar() {
    return leer(CLAVE, citasSemilla);
}

export function obtener(id) {
    return leer(CLAVE, citasSemilla).find((c) => c.id === id) ?? null;
}

export function crear(datos) {
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
        historial: datos.historial ?? [],
        creadaEn: aFechaIso(new Date()),
    };
    guardar(CLAVE, [...citas, nueva]);
    return nueva;
}

function conHistorial(cita, nuevoEstado, usuarioId) {
    const entrada = { fecha: new Date().toISOString(), de: cita.estado, a: nuevoEstado, por: usuarioId };
    return [...cita.historial, entrada];
}

function reemplazar(citas, indice, cita) {
    citas[indice] = cita;
    guardar(CLAVE, citas);
    return cita;
}

export function cambiarEstado(id, nuevoEstado, usuarioId) {
    const citas = leer(CLAVE, citasSemilla);
    const indice = buscarIndice(citas, id);
    const cita = citas[indice];
    if (!puedeTransicionar(cita.estado, nuevoEstado)) {
        throw new Error(`No se puede pasar una cita ${cita.estado.toLowerCase()} a ${nuevoEstado.toLowerCase()}.`);
    }
    return reemplazar(citas, indice, {
        ...cita,
        estado: nuevoEstado,
        historial: conHistorial(cita, nuevoEstado, usuarioId),
    });
}

export function reprogramar(id, fecha, hora, usuarioId) {
    const citas = leer(CLAVE, citasSemilla);
    const indice = buscarIndice(citas, id);
    const cita = citas[indice];
    if (!["PENDIENTE", "CONFIRMADA"].includes(cita.estado)) {
        throw new Error("Solo se puede reprogramar una cita pendiente o confirmada.");
    }
    return reemplazar(citas, indice, {
        ...cita,
        fecha,
        hora,
        estado: "PENDIENTE",
        historial: conHistorial(cita, "PENDIENTE", usuarioId),
    });
}

export function actualizar(id, cambios) {
    if ("estado" in cambios || "historial" in cambios) {
        throw new Error("El estado de una cita se cambia con cambiarEstado o reprogramar.");
    }
    const citas = leer(CLAVE, citasSemilla);
    const indice = buscarIndice(citas, id);
    const permitidos = { ...cambios };
    delete permitidos.id;
    delete permitidos.creadaEn;
    return reemplazar(citas, indice, { ...citas[indice], ...permitidos });
}