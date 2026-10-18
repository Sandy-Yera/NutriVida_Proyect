import { guardar, leer } from "./almacen.js";
import { pagosSemilla } from "./semillas/pagos.js";
import { aFechaIso } from "../utils/formato.js";

const CLAVE = "nv_pagos";

export const ESTADOS_PAGO = ["APROBADO", "RECHAZADO", "REEMBOLSADO"];

function validarEstado(estado) {
  if (!ESTADOS_PAGO.includes(estado)) throw new Error("El estado del pago no es válido.");
}

function siguienteId(pagos) {
  const mayor = pagos.reduce((max, p) => Math.max(max, Number(p.id.slice(1)) || 0), 0);
  return `P${String(mayor + 1).padStart(4, "0")}`;
}

function buscarIndice(pagos, id) {
  const indice = pagos.findIndex((p) => p.id === id);
  if (indice === -1) throw new Error(`El pago ${id} no existe.`);
  return indice;
}

export function listar() {
  return leer(CLAVE, pagosSemilla);
}

export function obtener(id) {
  return leer(CLAVE, pagosSemilla).find((p) => p.id === id) ?? null;
}

export function crear(datos) {
  validarEstado(datos.estado);
  const pagos = leer(CLAVE, pagosSemilla);
  const nuevo = {
    id: siguienteId(pagos),
    citaId: datos.citaId ?? null,
    monto: Number(datos.monto),
    ultimos4: String(datos.ultimos4 ?? "")
      .replace(/\D/g, "")
      .slice(-4),
    estado: datos.estado,
    motivo: String(datos.motivo ?? "").trim() || null,
    fecha: aFechaIso(new Date()),
  };
  guardar(CLAVE, [...pagos, nuevo]);
  return nuevo;
}

export function actualizar(id, cambios) {
  const pagos = leer(CLAVE, pagosSemilla);
  const indice = buscarIndice(pagos, id);
  const permitidos = { ...cambios };
  delete permitidos.id;
  delete permitidos.fecha;
  delete permitidos.ultimos4;
  delete permitidos.monto;
  // El pago se enlaza con su cita una sola vez: la cita se crea después del pago.
  if (pagos[indice].citaId) delete permitidos.citaId;
  if (permitidos.estado !== undefined) validarEstado(permitidos.estado);
  const actualizado = { ...pagos[indice], ...permitidos };
  pagos[indice] = actualizado;
  guardar(CLAVE, pagos);
  return actualizado;
}
