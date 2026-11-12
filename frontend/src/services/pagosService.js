import * as pagosData from "../data/pagosData.js";
import { simularPago, soloDigitos, validarPago } from "../utils/pagos.js";
import { errorConflicto, errorNoEncontrado, errorValidacion } from "../utils/errores.js";
import { apiFetch, apiFetchONull, query, usarApi } from "./http.js";
import { asegurarToken } from "./tokenPuente.js";

// Modo API (EP3, R9): ms-citas no tiene POST /api/pagos. El pago se hace junto con la cita
// en POST /api/citas (citasService.pagarYCrearCita), así que procesarPago y
// reembolsarPagoSinCita solo existen en modo local. Los comprobantes sí se leen de la API.
const SOLO_LOCAL = "En modo API el pago se hace junto con la cita: usa pagarYCrearCita.";

// RN-18 a RN-21: valida la tarjeta, simula el cobro y guarda solo los 4 últimos dígitos.
// La validación de la tarjeta va aquí porque pagosData nunca recibe el número completo.
export async function procesarPago({ titular, numero, vencimiento, cvv, monto }) {
  if (usarApi()) throw errorConflicto(SOLO_LOCAL);
  const errores = validarPago({ titular, numero, vencimiento, cvv });
  if (!(Number(monto) > 0)) errores.monto = "El monto a pagar no es válido.";
  if (Object.keys(errores).length > 0) {
    throw errorValidacion("Revisa los datos de la tarjeta.", { errores });
  }
  const { estado, motivo } = simularPago(numero);
  const pago = pagosData.crear({
    monto: Number(monto),
    ultimos4: soloDigitos(numero).slice(-4),
    estado,
    motivo,
  });
  return { estado, pagoId: pago.id, motivo };
}

// RN-08 y RN-35: si el pago se aprobó pero la cita no se pudo crear (por ejemplo, otro paciente
// tomó la hora en ese instante), el pago se devuelve. Solo aplica a un pago APROBADO sin cita:
// el reembolso de una cita cancelada lo hace citasService.cambiarEstado.
// Es una función nueva: no cambia el contrato.
export async function reembolsarPagoSinCita(id) {
  if (usarApi()) throw errorConflicto(SOLO_LOCAL);
  const pago = pagosData.obtener(id);
  if (!pago) throw errorNoEncontrado(`El pago ${id} no existe.`);
  if (pago.estado !== "APROBADO" || pago.citaId) {
    throw errorConflicto("Solo se reembolsa un pago aprobado que no quedó asociado a una cita.");
  }
  return pagosData.actualizar(id, { estado: "REEMBOLSADO" });
}

export async function obtenerPago(id) {
  if (usarApi()) {
    await asegurarToken();
    return apiFetchONull(`/api/pagos/${encodeURIComponent(id)}`);
  }
  return pagosData.obtener(id);
}

// Para la vista del admin (S-08): todos los pagos, o solo los de ciertas citas.
// Es una función nueva: no cambia el contrato.
export async function listarPagos({ citaIds } = {}) {
  if (usarApi()) {
    await asegurarToken();
    return apiFetch(`/api/pagos${query({ citaIds: citaIds?.join(",") })}`);
  }
  const pagos = pagosData.listar();
  return citaIds ? pagos.filter((p) => citaIds.includes(p.citaId)) : pagos;
}
