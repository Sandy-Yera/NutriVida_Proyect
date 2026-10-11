import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { obtenerServicio } from "../../services/serviciosService.js";
import {
  NOMBRE_TIPO_SERVICIO,
  SLUG_TIPO_SERVICIO,
  TIPO_SERVICIO_SINGULAR,
  urlSolicitarCita,
} from "../../utils/clinica.js";
import { formatearPrecio } from "../../utils/formato.js";

export default function DetalleServicio() {
  const { codigo } = useParams();
  const [carga, setCarga] = useState(null);

  useEffect(() => {
    let vigente = true;
    obtenerServicio(codigo).then((servicio) => {
      if (vigente) setCarga({ codigo, servicio });
    });
    return () => {
      vigente = false;
    };
  }, [codigo]);

  if (carga === null || carga.codigo !== codigo) {
    return (
      <section className="container py-4">
        <p role="status">Cargando servicio...</p>
      </section>
    );
  }

  const { servicio } = carga;

  if (!servicio || !servicio.activo) {
    return (
      <section className="container py-5">
        <h1>Servicio no disponible</h1>
        <p>
          {servicio
            ? "Este servicio no está disponible por ahora."
            : "El servicio que buscas no existe."}
        </p>
        <Link className="btn btn-primary" to="/servicios">
          Ver todos los servicios
        </Link>
      </section>
    );
  }

  const esTaller = servicio.tipo === "TALLER";
  const categoria = NOMBRE_TIPO_SERVICIO[servicio.tipo];

  return (
    <section className="container py-4">
      <nav aria-label="Ruta de navegación">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link to="/servicios">Servicios</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to={`/servicios/categoria/${SLUG_TIPO_SERVICIO[servicio.tipo]}`}>
              {categoria}
            </Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {servicio.nombre}
          </li>
        </ol>
      </nav>
      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <h1>{servicio.nombre}</h1>
          {servicio.destacado && <p className="badge text-bg-light border mb-3">Plan destacado</p>}
          <p className="lead">{servicio.descripcion}</p>
        </div>
        <aside className="col-12 col-lg-4">
          <div className="bg-white border rounded-3 p-3 p-md-4">
            <p className="fs-2 fw-semibold mb-3">{formatearPrecio(servicio.precio)}</p>
            <dl className="row small mb-3">
              <dt className="col-5 fw-semibold">Tipo</dt>
              <dd className="col-7">{TIPO_SERVICIO_SINGULAR[servicio.tipo]}</dd>
              {servicio.duracionMin && (
                <>
                  <dt className="col-5 fw-semibold">Duración</dt>
                  <dd className="col-7">{servicio.duracionMin} min</dd>
                </>
              )}
              <dt className="col-5 fw-semibold">Modalidad</dt>
              <dd className="col-7">{servicio.modalidad}</dd>
              {esTaller && (
                <>
                  <dt className="col-5 fw-semibold">Cupo</dt>
                  <dd className="col-7">{servicio.cupoMax} personas</dd>
                </>
              )}
            </dl>
            {esTaller ? (
              <p className="mb-0 fw-semibold">Inscripción en recepción</p>
            ) : (
              <Link
                className="btn btn-primary w-100"
                to={urlSolicitarCita({ servicio: servicio.codigo })}
              >
                Solicitar cita
              </Link>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
