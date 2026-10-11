import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MapaDiferido from "../../components/clinica/MapaDiferido.jsx";
import ServicioFila from "../../components/clinica/ServicioFila.jsx";
import { INFO_CLINICA, URL_COMO_LLEGAR } from "../../data/infoClinica.js";
import { proximasHorasLibres } from "../../services/citasService.js";
import { listarNutricionistas, listarServicios } from "../../services/serviciosService.js";
import {
  NOMBRE_TIPO_SERVICIO,
  SLUG_TIPO_SERVICIO,
  TIPOS_AGENDABLES,
  urlSolicitarCita,
} from "../../utils/clinica.js";
import { formatearFecha } from "../../utils/formato.js";

const TIPOS_CARTA = ["CONSULTA", "PLAN", "EVALUACION", "TALLER"];

function fechaConMayuscula(fecha) {
  const texto = formatearFecha(fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function Inicio() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [seleccion, setSeleccion] = useState({ servicio: "", nutricionista: "" });
  const [tipoActivo, setTipoActivo] = useState("CONSULTA");

  useEffect(() => {
    let vigente = true;
    Promise.all([listarServicios(), listarNutricionistas(), proximasHorasLibres(4)]).then(
      ([servicios, nutricionistas, horas]) => {
        if (vigente) setDatos({ servicios, nutricionistas, horas });
      },
    );
    return () => {
      vigente = false;
    };
  }, []);

  function cambiarSeleccion(evento) {
    setSeleccion((anterior) => ({ ...anterior, [evento.target.name]: evento.target.value }));
  }

  function verHoras(evento) {
    evento.preventDefault();
    navigate(urlSolicitarCita(seleccion));
  }

  const nutricionistaPorId = (id) => datos?.nutricionistas.find((n) => n.id === id);

  function horasLibres() {
    if (datos === null) return <p role="status">Buscando horas libres...</p>;
    if (datos.horas.length === 0) {
      return (
        <p className="mb-0">
          No hay horas libres en los próximos días. Revisa más adelante o{" "}
          <Link to="/contacto">escríbenos</Link>.
        </p>
      );
    }
    return (
      <ul className="list-unstyled mb-0">
        {datos.horas.map((hora) => {
          const nutricionista = nutricionistaPorId(hora.nutricionistaId);
          const cuando = `${fechaConMayuscula(hora.fecha)}, ${hora.hora}`;
          return (
            <li
              key={`${hora.nutricionistaId}-${hora.fecha}-${hora.hora}`}
              className="d-flex justify-content-between align-items-center gap-2 py-2 border-bottom"
            >
              <div>
                <div className="fw-semibold">{nutricionista?.nombre ?? hora.nutricionistaId}</div>
                <div className="small text-body-secondary">{nutricionista?.especialidad}</div>
                <div className="small">{cuando}</div>
              </div>
              <Link
                className="btn btn-sm btn-outline-primary"
                to={urlSolicitarCita({ nutricionista: hora.nutricionistaId })}
                aria-label={`Elegir ${cuando} con ${nutricionista?.nombre ?? hora.nutricionistaId}`}
              >
                Elegir
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  const serviciosDelTipo = datos?.servicios.filter((s) => s.tipo === tipoActivo) ?? [];

  return (
    <>
      <section className="container py-4 py-lg-5">
        <div className="row g-4 align-items-start">
          <div className="col-12 col-lg-7">
            <h1 className="display-5 mb-3">Agenda tu control sin llamar por teléfono</h1>
            <p className="lead text-body-secondary">
              Elige el servicio y quién quieres que te atienda. Si no tienes preferencia, te
              mostramos todas las horas.
            </p>
            <form className="bg-white border rounded-3 p-3 p-md-4" onSubmit={verHoras}>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label htmlFor="inicio-servicio" className="form-label">
                    Servicio
                  </label>
                  <select
                    id="inicio-servicio"
                    name="servicio"
                    className="form-select"
                    value={seleccion.servicio}
                    onChange={cambiarSeleccion}
                  >
                    <option value="">Cualquier servicio</option>
                    {TIPOS_AGENDABLES.map((tipo) => (
                      <optgroup key={tipo} label={NOMBRE_TIPO_SERVICIO[tipo]}>
                        {datos?.servicios
                          .filter((s) => s.tipo === tipo)
                          .map((s) => (
                            <option key={s.codigo} value={s.codigo}>
                              {s.nombre}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label htmlFor="inicio-nutricionista" className="form-label">
                    Nutricionista
                  </label>
                  <select
                    id="inicio-nutricionista"
                    name="nutricionista"
                    className="form-select"
                    value={seleccion.nutricionista}
                    onChange={cambiarSeleccion}
                  >
                    <option value="">Cualquier nutricionista</option>
                    {datos?.nutricionistas.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">
                    Ver horas disponibles
                  </button>
                </div>
              </div>
            </form>
          </div>
          <aside className="col-12 col-lg-5" aria-labelledby="titulo-horas">
            <div className="bg-white border rounded-3 p-3 p-md-4">
              <h2 id="titulo-horas" className="h4">
                Próximas horas libres
              </h2>
              {horasLibres()}
            </div>
          </aside>
        </div>
      </section>

      <section className="container pb-4" aria-labelledby="titulo-servicios">
        <h2 id="titulo-servicios" className="mb-3">
          Servicios
        </h2>
        <div className="d-flex flex-wrap gap-2 mb-2" role="tablist" aria-label="Tipos de servicio">
          {TIPOS_CARTA.map((tipo) => (
            <button
              key={tipo}
              id={`pestana-${tipo}`}
              type="button"
              role="tab"
              aria-selected={tipo === tipoActivo}
              aria-controls="panel-servicios"
              className={`btn btn-sm ${tipo === tipoActivo ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setTipoActivo(tipo)}
            >
              {NOMBRE_TIPO_SERVICIO[tipo]}
            </button>
          ))}
        </div>
        <div
          id="panel-servicios"
          role="tabpanel"
          aria-labelledby={`pestana-${tipoActivo}`}
          className="bg-white border rounded-3 px-3"
        >
          {datos === null ? (
            <p className="py-3 mb-0" role="status">
              Cargando servicios...
            </p>
          ) : (
            <ul className="list-unstyled mb-0">
              {serviciosDelTipo.map((servicio) => (
                <ServicioFila key={servicio.codigo} servicio={servicio} />
              ))}
            </ul>
          )}
        </div>
        <p className="mt-2 mb-0 d-flex flex-wrap gap-3">
          <Link to={`/servicios/categoria/${SLUG_TIPO_SERVICIO[tipoActivo]}`}>
            Ver solo {NOMBRE_TIPO_SERVICIO[tipoActivo].toLowerCase()}
          </Link>
          <Link to="/servicios">Ver el catálogo completo</Link>
        </p>
      </section>

      <section className="container pb-4" aria-labelledby="titulo-equipo">
        <h2 id="titulo-equipo" className="mb-3">
          Nuestro equipo
        </h2>
        <div className="row g-3">
          {datos?.nutricionistas.map((n) => (
            <div className="col-12 col-md-6 col-xl-3" key={n.id}>
              <div className="bg-white border rounded-3 p-3 h-100">
                <p className="fw-semibold mb-1">{n.nombre}</p>
                <p className="small text-body-secondary mb-0">{n.especialidad}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 mb-0">
          <Link to="/nosotros">Conoce a la clínica y su equipo</Link>
        </p>
      </section>

      <section className="container pb-5" aria-labelledby="titulo-llegar">
        <div className="bg-white border rounded-3 p-3 p-md-4">
          <div className="row g-4 align-items-center">
            <div className="col-12 col-lg-7">
              <MapaDiferido alto={280} />
            </div>
            <div className="col-12 col-lg-5">
              <h2 id="titulo-llegar" className="h3">
                Cómo llegar
              </h2>
              <p className="mb-1">
                {INFO_CLINICA.direccion}, {INFO_CLINICA.region}.
              </p>
              <ul className="list-unstyled small text-body-secondary mb-3">
                {INFO_CLINICA.horario.map((tramo) => (
                  <li key={tramo.dias}>
                    {tramo.dias}: {tramo.horas}
                  </li>
                ))}
              </ul>
              <div className="d-flex flex-wrap gap-2">
                <a
                  className="btn btn-primary"
                  href={URL_COMO_LLEGAR}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Cómo llegar
                </a>
                <Link className="btn btn-outline-primary" to="/contacto">
                  Escríbenos
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
