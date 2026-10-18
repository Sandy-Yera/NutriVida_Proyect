import { Link } from "react-router-dom";
import ChipEstado from "./ChipEstado.jsx";
import { formatearFecha, formatearPrecio } from "../../utils/formato.js";

const ESTADO_PAGO = { APROBADO: "Aprobado", RECHAZADO: "Rechazado", REEMBOLSADO: "Reembolsado" };

// RN-27: tabla de citas del admin. En el móvil pasa a lista de tarjetas (clase .tabla-lista
// del tema de Gabriel, con data-etiqueta en cada celda). Solo muestra.
// filas: [{ cita, paciente, nutricionista, servicio, pago }]
export default function TablaCitasAdmin({ filas }) {
  return (
    <table className="table align-middle bg-white tabla-lista mb-0">
      <thead>
        <tr>
          <th scope="col">Cita</th>
          <th scope="col">Fecha</th>
          <th scope="col">Paciente</th>
          <th scope="col">Nutricionista</th>
          <th scope="col">Servicio</th>
          <th scope="col">Estado</th>
          <th scope="col">Pago</th>
          <th scope="col" className="text-end">
            Monto
          </th>
        </tr>
      </thead>
      <tbody>
        {filas.map(({ cita, paciente, nutricionista, servicio, pago }) => (
          <tr key={cita.id}>
            <td data-etiqueta="Cita">
              <Link to={`/admin/citas/${cita.id}`} aria-label={`Ver la cita ${cita.id}`}>
                {cita.id}
              </Link>
            </td>
            <td data-etiqueta="Fecha" className="text-nowrap">
              {formatearFecha(cita.fecha)}, {cita.hora}
            </td>
            <td data-etiqueta="Paciente">{paciente}</td>
            <td data-etiqueta="Nutricionista">{nutricionista}</td>
            <td data-etiqueta="Servicio">{servicio}</td>
            <td data-etiqueta="Estado">
              <ChipEstado estado={cita.estado} />
            </td>
            <td data-etiqueta="Pago">{pago ? ESTADO_PAGO[pago.estado] : "—"}</td>
            <td data-etiqueta="Monto" className="text-end cifra">
              {pago ? formatearPrecio(pago.monto) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
