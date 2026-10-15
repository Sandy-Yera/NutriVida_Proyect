import { Link } from "react-router-dom";
import { formatearPrecio } from "../../utils/formato.js";

export default function ServicioFila({ servicio }) {
  return (
    <li className="row g-0 align-items-baseline py-2 border-bottom">
      <div className="col-8 col-md-6 pe-2">
        <Link className="fw-semibold" to={`/servicios/${servicio.codigo}`}>
          {servicio.nombre}
        </Link>
      </div>
      <div className="col-4 col-md-2 order-md-last text-end fw-semibold text-nowrap">
        {formatearPrecio(servicio.precio)}
      </div>
      <div className="col-12 col-md-4 small text-body-secondary">
        {servicio.duracionMin ? (
          <>
            <span>{servicio.duracionMin} min</span>
            <span aria-hidden="true"> · </span>
          </>
        ) : null}
        <span>{servicio.modalidad}</span>
      </div>
    </li>
  );
}
