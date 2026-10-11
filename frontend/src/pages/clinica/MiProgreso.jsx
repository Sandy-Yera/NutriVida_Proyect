import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GraficoProgreso from "../../components/clinica/GraficoProgreso.jsx";
import { obtenerSesion } from "../../auth/auth.js";
import { listarCitas } from "../../services/citasService.js";
import { listarMediciones, obtenerPlan } from "../../services/fichasService.js";
import { listarNutricionistas } from "../../services/serviciosService.js";
import { formatearFecha } from "../../utils/formato.js";
import {
  COMIDAS_PLAN,
  INDICADORES_PROGRESO,
  formatearMedida,
  proximaCita,
  urlSolicitarCita,
  valorIndicador,
} from "../../utils/clinica.js";

const COLUMNAS = ["PESO", "CINTURA", "IMC", "GRASA"];
const ENCABEZADOS = { PESO: "Peso (kg)", CINTURA: "Cintura (cm)", IMC: "IMC", GRASA: "% grasa" };

function ProximaCita({ cita, nombreNutricionista }) {
  if (!cita) {
    return (
      <p className="mb-0">
        No tienes citas próximas. <Link to={urlSolicitarCita()}>Solicitar cita</Link>
      </p>
    );
  }
  return (
    <p className="mb-0">
      <span className="text-body-secondary">Próxima cita:</span>{" "}
      <strong>
        {formatearFecha(cita.fecha)}, {cita.hora}
      </strong>{" "}
      con {nombreNutricionista(cita.nutricionistaId)}
    </p>
  );
}

function TablaMediciones({ mediciones, nombreNutricionista }) {
  const recientes = [...mediciones].sort((a, b) => b.fecha.localeCompare(a.fecha));
  return (
    <>
      <table className="table align-middle mb-0 d-none d-md-table">
        <caption className="visually-hidden">
          Mis mediciones, de la más reciente a la más antigua
        </caption>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            {COLUMNAS.map((indicador) => (
              <th key={indicador} scope="col" className="text-end">
                {ENCABEZADOS[indicador]}
              </th>
            ))}
            <th scope="col">Nutricionista</th>
          </tr>
        </thead>
        <tbody>
          {recientes.map((medicion) => (
            <tr key={medicion.id}>
              <td>{formatearFecha(medicion.fecha)}</td>
              {COLUMNAS.map((indicador) => (
                <td key={indicador} className="text-end">
                  {formatearMedida(valorIndicador(medicion, indicador), indicador)}
                </td>
              ))}
              <td>{nombreNutricionista(medicion.nutricionistaId)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="list-unstyled mb-0 d-md-none" aria-label="Mis mediciones">
        {recientes.map((medicion) => (
          <li key={medicion.id} className="border-bottom py-2">
            <div className="fw-semibold">{formatearFecha(medicion.fecha)}</div>
            <div>
              {COLUMNAS.map((indicador) => (
                <span key={indicador} className="me-3 d-inline-block">
                  {INDICADORES_PROGRESO[indicador].nombre}{" "}
                  {formatearMedida(valorIndicador(medicion, indicador), indicador, {
                    conUnidad: true,
                  })}
                </span>
              ))}
            </div>
            <div className="small text-body-secondary">
              {nombreNutricionista(medicion.nutricionistaId)}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function PlanAlimenticio({ plan, nombreNutricionista }) {
  if (!plan) {
    return (
      <p className="text-body-secondary mb-0">
        Aún no tienes un plan alimenticio: tu nutricionista lo indicará en tu consulta.
      </p>
    );
  }
  return (
    <>
      <p>
        {plan.objetivo}
        {plan.kcalDiarias > 0 && (
          <> · {new Intl.NumberFormat("es-CL").format(plan.kcalDiarias)} kcal diarias</>
        )}
        <span className="text-body-secondary">
          {" "}
          · Indicado por {nombreNutricionista(plan.nutricionistaId)}
        </span>
      </p>
      <div className="row row-cols-1 row-cols-md-3 row-cols-xl-5 g-3">
        {COMIDAS_PLAN.map(({ clave, nombre }) => (
          <div key={clave} className="col">
            <div className="border rounded-3 p-3 h-100">
              <h3 className="h6 mb-1">{nombre}</h3>
              <p className="mb-0">{plan.comidas[clave] || "Sin indicación."}</p>
            </div>
          </div>
        ))}
      </div>
      {plan.indicaciones && (
        <p className="mt-3 mb-0">
          <strong>Indicaciones:</strong> {plan.indicaciones}
        </p>
      )}
    </>
  );
}

export default function MiProgreso() {
  const pacienteId = obtenerSesion()?.id;
  const [indicador, setIndicador] = useState("PESO");
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      listarMediciones(pacienteId),
      obtenerPlan(pacienteId),
      listarCitas({ pacienteId }),
      listarNutricionistas(),
    ]).then(([mediciones, plan, citas, nutricionistas]) => {
      if (vigente) {
        setDatos({ mediciones, plan, cita: proximaCita(citas, pacienteId), nutricionistas });
      }
    });
    return () => {
      vigente = false;
    };
  }, [pacienteId]);

  if (datos === null) {
    return (
      <section className="container py-4">
        <h1>Mi progreso</h1>
        <p role="status">Cargando tu progreso...</p>
      </section>
    );
  }

  const { mediciones, plan, cita, nutricionistas } = datos;
  const nombreNutricionista = (id) =>
    nutricionistas.find((nutricionista) => nutricionista.id === id)?.nombre ?? "Nutricionista";

  return (
    <section className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-baseline gap-2 mb-3">
        <h1 className="mb-0">Mi progreso</h1>
        <ProximaCita cita={cita} nombreNutricionista={nombreNutricionista} />
      </div>

      <div className="bg-white border rounded-3 p-3 p-md-4 mb-4">
        {mediciones.length === 0 ? (
          <p className="mb-0">Aún no tienes mediciones: se registran en tu primera consulta.</p>
        ) : (
          <>
            <div
              className="d-flex flex-wrap gap-2 mb-3"
              role="group"
              aria-label="Indicador del gráfico"
            >
              {Object.entries(INDICADORES_PROGRESO).map(([clave, { nombre }]) => (
                <button
                  key={clave}
                  type="button"
                  className={indicador === clave ? "btn btn-primary" : "btn btn-outline-primary"}
                  aria-pressed={indicador === clave}
                  onClick={() => setIndicador(clave)}
                >
                  {nombre}
                </button>
              ))}
            </div>
            <GraficoProgreso mediciones={mediciones} indicador={indicador} />
          </>
        )}
      </div>

      {mediciones.length > 0 && (
        <section
          className="bg-white border rounded-3 p-3 p-md-4 mb-4"
          aria-labelledby="titulo-mediciones"
        >
          <h2 id="titulo-mediciones" className="h4">
            Mis mediciones
          </h2>
          <TablaMediciones mediciones={mediciones} nombreNutricionista={nombreNutricionista} />
        </section>
      )}

      <section className="bg-white border rounded-3 p-3 p-md-4" aria-labelledby="titulo-plan">
        <h2 id="titulo-plan" className="h4">
          Mi plan alimenticio
          {plan && (
            <span className="fs-6 fw-normal text-body-secondary">
              {" "}
              (vigente desde el {formatearFecha(plan.vigenteDesde)})
            </span>
          )}
        </h2>
        <PlanAlimenticio plan={plan} nombreNutricionista={nombreNutricionista} />
      </section>
    </section>
  );
}
