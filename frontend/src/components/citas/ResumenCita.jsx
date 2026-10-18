import { formatearFechaLarga, formatearPrecio } from "../../utils/formato.js";

// Resumen de la cita para el paso 4 del asistente (S-03) y la pantalla de pago (S-04).
// RN-23 y RN-31: el precio y la fecha siempre con utils/formato.js. motivo es opcional.
export default function ResumenCita({ servicio, nutricionista, fecha, hora, motivo }) {
  return (
    <dl className="row mb-0">
      <dt className="col-sm-4">Servicio</dt>
      <dd className="col-sm-8">
        {servicio.nombre}
        <span className="text-body-secondary small"> · {servicio.modalidad}</span>
      </dd>

      <dt className="col-sm-4">Nutricionista</dt>
      <dd className="col-sm-8">{nutricionista.nombre}</dd>

      <dt className="col-sm-4">Fecha y hora</dt>
      <dd className="col-sm-8">
        {formatearFechaLarga(fecha)}, {hora}
      </dd>

      {motivo && (
        <>
          <dt className="col-sm-4">Motivo</dt>
          <dd className="col-sm-8 text-break">{motivo}</dd>
        </>
      )}

      <dt className="col-sm-4">Total a pagar</dt>
      <dd className="col-sm-8 fw-semibold mb-0">{formatearPrecio(servicio.precio)}</dd>
    </dl>
  );
}
