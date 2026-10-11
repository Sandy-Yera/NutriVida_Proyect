import { pagosSemilla } from "../data/semillas/pagos.js";

export async function procesarPago({ titular, numero, vencimiento, cvv, monto }) {
  return { estado: "APROBADO", pagoId: "P9999", motivo: null };
}

export async function obtenerPago(id) {
  return pagosSemilla.find((p) => p.id === id) ?? null;
}
