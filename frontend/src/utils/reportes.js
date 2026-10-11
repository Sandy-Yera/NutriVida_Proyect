import { aFechaIso, formatearFecha, formatearPorcentaje } from "./formato.js";

export function rangoDelMes(hoy = new Date()) {
  return {
    desde: aFechaIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
    hasta: aFechaIso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)),
  };
}

export function rangoUltimosMeses(cantidad, hoy = new Date()) {
  return {
    desde: aFechaIso(new Date(hoy.getFullYear(), hoy.getMonth() - (cantidad - 1), 1)),
    hasta: aFechaIso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)),
  };
}

export function validarRango({ desde, hasta }) {
  if (!desde || !hasta) return "Indica la fecha de inicio y la de término.";
  if (desde > hasta) return "La fecha de inicio debe ser anterior o igual a la de término.";
  return "";
}

export function etiquetaSemana(semana) {
  return /^\d{4}-\d{2}-\d{2}$/.test(semana) ? `Sem. ${formatearFecha(semana)}` : String(semana);
}

export function textoTasaInasistencia({ atendidas, inasistencias, tasaInasistencia }) {
  if (atendidas + inasistencias === 0) return "Sin datos";
  return formatearPorcentaje(tasaInasistencia);
}
