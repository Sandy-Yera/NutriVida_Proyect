import { Link } from "react-router-dom";
import { formatearFechaLarga } from "../../utils/formato.js";

export default function ArticuloCard({ articulo, autor }) {
  return (
    <article className="position-relative bg-white border rounded-3 p-3 p-md-4 h-100 d-flex flex-column">
      <h2 className="h4">
        <Link className="stretched-link text-decoration-none" to={`/consejos/${articulo.id}`}>
          {articulo.titulo}
        </Link>
      </h2>
      <p className="text-body-secondary">{articulo.resumen}</p>
      <p className="small mt-auto mb-0">
        {autor && <span>Por {autor} · </span>}
        <time dateTime={articulo.fecha}>{formatearFechaLarga(articulo.fecha)}</time>
      </p>
    </article>
  );
}
