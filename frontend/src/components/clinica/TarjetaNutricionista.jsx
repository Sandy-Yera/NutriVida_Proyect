import { Link } from "react-router-dom";
import { describirDias, urlSolicitarCita } from "../../utils/clinica.js";

export default function TarjetaNutricionista({ nutricionista }) {
  const primerNombre = nutricionista.nombre.split(" ")[0];

  return (
    <article
      className="bg-white border rounded-3 p-3 h-100 d-flex flex-column"
      aria-labelledby={`nutricionista-${nutricionista.id}`}
    >
      <h3 id={`nutricionista-${nutricionista.id}`} className="h5 mb-1">
        {nutricionista.nombre}
      </h3>
      <p className="text-body-secondary mb-3">{nutricionista.especialidad}</p>
      <dl className="small mb-3">
        <dt className="fw-semibold">Días de atención</dt>
        <dd className="mb-2">{describirDias(nutricionista.dias)}</dd>
        <dt className="fw-semibold">Horario</dt>
        <dd className="mb-0">
          {nutricionista.horaInicio} a {nutricionista.horaFin}
        </dd>
      </dl>
      <Link
        className="btn btn-outline-primary mt-auto"
        to={urlSolicitarCita({ nutricionista: nutricionista.id })}
      >
        Agendar con {primerNombre}
      </Link>
    </article>
  );
}
