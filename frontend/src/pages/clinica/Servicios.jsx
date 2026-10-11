import { useEffect, useState } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import ServicioFila from "../../components/clinica/ServicioFila.jsx";
import { listarServicios } from "../../services/serviciosService.js";
import {
  NOMBRE_TIPO_SERVICIO,
  SLUG_TIPO_SERVICIO,
  filtrarServicios,
  tipoDesdeSlug,
} from "../../utils/clinica.js";

const TIPOS = ["CONSULTA", "PLAN", "EVALUACION", "TALLER"];

function clasePestana({ isActive }) {
  return `btn btn-sm ${isActive ? "btn-primary" : "btn-outline-primary"}`;
}

export default function Servicios() {
  const { tipo: slug } = useParams();
  const tipo = slug ? tipoDesdeSlug(slug) : null;
  const [servicios, setServicios] = useState(null);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    let vigente = true;
    listarServicios().then((lista) => {
      if (vigente) setServicios(lista);
    });
    return () => {
      vigente = false;
    };
  }, []);

  if (slug && !tipo) {
    return (
      <section className="container py-5">
        <h1>Categoría no encontrada</h1>
        <p>La categoría “{slug}” no existe.</p>
        <Link className="btn btn-primary" to="/servicios">
          Ver todos los servicios
        </Link>
      </section>
    );
  }

  const titulo = tipo ? NOMBRE_TIPO_SERVICIO[tipo] : "Servicios";
  const resultado = servicios ? filtrarServicios(servicios, { tipo, texto }) : [];
  const grupos = (tipo ? [tipo] : TIPOS)
    .map((t) => ({ tipo: t, servicios: resultado.filter((s) => s.tipo === t) }))
    .filter((grupo) => grupo.servicios.length > 0);

  function contenido() {
    if (servicios === null) return <p role="status">Cargando servicios...</p>;
    if (resultado.length === 0) {
      return (
        <div className="bg-white border rounded-3 p-4">
          <p>
            {texto.trim()
              ? `No hay servicios que coincidan con ‘${texto.trim()}’. Prueba con otra palabra.`
              : "No hay servicios disponibles en esta categoría por ahora."}
          </p>
          {texto.trim() && (
            <button type="button" className="btn btn-outline-primary" onClick={() => setTexto("")}>
              Limpiar búsqueda
            </button>
          )}
        </div>
      );
    }
    return grupos.map((grupo) => (
      <section key={grupo.tipo} className="mb-4" aria-labelledby={`grupo-${grupo.tipo}`}>
        <h2 id={`grupo-${grupo.tipo}`} className={tipo ? "visually-hidden" : "h4 mb-2"}>
          {NOMBRE_TIPO_SERVICIO[grupo.tipo]}
        </h2>
        <ul className="list-unstyled bg-white border rounded-3 px-3 mb-0">
          {grupo.servicios.map((servicio) => (
            <ServicioFila key={servicio.codigo} servicio={servicio} />
          ))}
        </ul>
      </section>
    ));
  }

  return (
    <section className="container py-4">
      {tipo && (
        <nav aria-label="Ruta de navegación">
          <ol className="breadcrumb mb-2">
            <li className="breadcrumb-item">
              <Link to="/servicios">Servicios</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              {titulo}
            </li>
          </ol>
        </nav>
      )}
      <h1 className="mb-3">{titulo}</h1>
      <div className="row g-3 align-items-end mb-3">
        <div className="col-12 col-lg-7">
          <nav className="d-flex flex-wrap gap-2" aria-label="Tipos de servicio">
            <NavLink className={clasePestana} to="/servicios" end>
              Todos
            </NavLink>
            {TIPOS.map((t) => (
              <NavLink
                key={t}
                className={clasePestana}
                to={`/servicios/categoria/${SLUG_TIPO_SERVICIO[t]}`}
              >
                {NOMBRE_TIPO_SERVICIO[t]}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="col-12 col-lg-5">
          <label htmlFor="buscar-servicio" className="form-label small mb-1">
            Buscar por nombre o descripción
          </label>
          <input
            id="buscar-servicio"
            type="search"
            className="form-control"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
          />
        </div>
      </div>
      {servicios !== null && (
        <p className="small text-body-secondary mb-2" aria-live="polite">
          {resultado.length} {resultado.length === 1 ? "servicio" : "servicios"}
        </p>
      )}
      {contenido()}
    </section>
  );
}
