import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarServicios } from "../../services/serviciosService.js";
import { incluyeDelPlan, urlSolicitarCita } from "../../utils/clinica.js";
import { formatearPrecio } from "../../utils/formato.js";

export default function Planes() {
  const [planes, setPlanes] = useState(null);

  useEffect(() => {
    let vigente = true;
    listarServicios({ tipo: "PLAN" }).then((lista) => {
      if (vigente) setPlanes(lista);
    });
    return () => {
      vigente = false;
    };
  }, []);

  function contenido() {
    if (planes === null) return <p role="status">Cargando planes...</p>;
    if (planes.length === 0) {
      return (
        <div className="bg-white border rounded-3 p-4">
          <p>No hay planes disponibles por ahora.</p>
          <Link className="btn btn-outline-primary" to="/servicios">
            Ver los demás servicios
          </Link>
        </div>
      );
    }
    return (
      <div className="bg-white border rounded-3 px-3 px-md-4">
        {planes.map((plan) => {
          const incluye = incluyeDelPlan(plan.descripcion);
          return (
            <article
              key={plan.codigo}
              className="row g-3 align-items-center py-4 border-bottom"
              aria-labelledby={`plan-${plan.codigo}`}
            >
              <div className="col-12 col-md-8">
                <h2 id={`plan-${plan.codigo}`} className="h4 mb-2">
                  <Link className="text-decoration-none" to={`/servicios/${plan.codigo}`}>
                    {plan.nombre}
                  </Link>
                </h2>
                {incluye.length > 0 ? (
                  <>
                    <p className="small fw-semibold mb-1">Qué incluye</p>
                    <ul className="mb-0">
                      {incluye.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="mb-0 text-body-secondary">{plan.descripcion}</p>
                )}
              </div>
              <div className="col-12 col-md-4 text-md-end">
                <p className="fs-3 fw-semibold mb-2">{formatearPrecio(plan.precio)}</p>
                <Link
                  className="btn btn-primary"
                  to={urlSolicitarCita({ servicio: plan.codigo })}
                  aria-label={`Contratar plan: ${plan.nombre}`}
                >
                  Contratar plan
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <section className="container py-4">
      <h1>Planes especializados</h1>
      <p className="lead text-body-secondary mb-4">
        Acompañamiento por varias semanas con un objetivo claro. Al contratar eliges quién te
        atiende y la fecha de tu primera sesión.
      </p>
      {contenido()}
      <p className="small text-body-secondary mt-3 mb-0">
        Todos los planes son presenciales en la clínica. ¿Prefieres una sola consulta?{" "}
        <Link to="/servicios/categoria/consultas">Revisa las consultas</Link>.
      </p>
    </section>
  );
}
