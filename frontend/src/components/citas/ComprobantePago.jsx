import { formatearFechaLarga, formatearPrecio } from "../../utils/formato.js";

const ESTADO_PAGO = {
  APROBADO: { texto: "Aprobado", clase: "text-bg-success" },
  RECHAZADO: { texto: "Rechazado", clase: "text-bg-danger" },
  REEMBOLSADO: { texto: "Reembolsado", clase: "text-bg-secondary" },
};

// RN-20, RN-23 y RN-27: comprobante del pago simulado. Solo existen los 4 últimos dígitos.
export default function ComprobantePago({ pago, servicio }) {
  if (!pago) return <p className="mb-0">Esta cita no tiene un pago registrado.</p>;
  const estado = ESTADO_PAGO[pago.estado] ?? { texto: pago.estado, clase: "text-bg-light" };
  return (
    <dl className="row mb-0">
      <dt className="col-sm-5">N.° de pago</dt>
      <dd className="col-sm-7">{pago.id}</dd>
      <dt className="col-sm-5">Fecha</dt>
      <dd className="col-sm-7">{formatearFechaLarga(pago.fecha)}</dd>
      <dt className="col-sm-5">Servicio</dt>
      <dd className="col-sm-7">{servicio?.nombre ?? "—"}</dd>
      <dt className="col-sm-5">Monto</dt>
      <dd className="col-sm-7 cifra fw-semibold">{formatearPrecio(pago.monto)}</dd>
      <dt className="col-sm-5">Estado</dt>
      <dd className="col-sm-7">
        <span className={`badge ${estado.clase}`}>{estado.texto}</span>
      </dd>
      <dt className="col-sm-5">Tarjeta</dt>
      <dd className="col-sm-7 mb-0">Terminada en {pago.ultimos4}</dd>
    </dl>
  );
}
