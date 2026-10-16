import { guardar, leer } from "./almacen.js";
import { citasSemilla } from "./semillas/citas.js";
import { aFechaIso } from "../utils/formato.js";

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

export function actualizar(id, cambios) {
  const citas = leer(CLAVE, citasSemilla);
  const indice = buscarIndice(citas, id);
  const permitidos = { ...cambios };
  delete permitidos.id;
  delete permitidos.creadaEn;
  const actualizada = { ...citas[indice], ...permitidos };
  citas[indice] = actualizada;
  guardar(CLAVE, citas);
  return actualizada;
}
