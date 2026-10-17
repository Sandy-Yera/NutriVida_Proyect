import { useState } from "react";
import ChipEstado from "./ChipEstado.jsx";
import { ETIQUETAS_ESTADO } from "../../utils/citas.js";

const primerNombre = (nutricionista) => nutricionista.nombre.split(" ")[0];

// Contenido de una celda: "—" fuera de la jornada, la cita (botón), su continuación o vacío.
function Celda({ celda, nombrePaciente, seleccionadaId, onSeleccionar }) {
  if (celda.tipo === "fuera") {
    return (
      <span className="text-body-secondary">
        <span aria-hidden="true">—</span>
        <span className="visually-hidden">Fuera de jornada</span>
      </span>
    );
  }
  if (celda.tipo === "continua") {
    return <span className="small text-body-secondary">↳ continúa</span>;
  }
  if (celda.tipo === "libre") return null;
  return (
    <div className="d-grid gap-1">
      {celda.citas.map((cita) => (
        <button
          key={cita.id}
          type="button"
          className={`btn btn-sm text-start ${
            cita.id === seleccionadaId ? "btn-outline-primary active" : "btn-light border"
          }`}
          aria-pressed={cita.id === seleccionadaId}
          aria-label={`Cita de ${nombrePaciente(cita.pacienteId)}, ${cita.hora}, ${ETIQUETAS_ESTADO[cita.estado]}`}
          onClick={() => onSeleccionar(cita.id)}
        >
          <span className="d-block small fw-semibold text-truncate">
            {nombrePaciente(cita.pacienteId)}
          </span>
          <ChipEstado estado={cita.estado} />
        </button>
      ))}
    </div>
  );
}

// S-06 (RN-25, RN-33): agenda de un día. En escritorio, filas por bloque y una columna por
// nutricionista; en el móvil, una pestaña por nutricionista. Solo muestra y avisa la cita
// elegida con onSeleccionar(citaId): la página decide qué hacer.
// filas: el resultado de armarAgenda. pacientes: { [id]: "Nombre Apellido" }.
export default function GrillaAgenda({
  filas,
  nutricionistas,
  pacientes,
  seleccionadaId,
  onSeleccionar,
}) {
  const [pestana, setPestana] = useState(nutricionistas[0]?.id);
  const nombrePaciente = (id) => pacientes[id] ?? id;
  const propsCelda = { nombrePaciente, seleccionadaId, onSeleccionar };
  const indice = Math.max(
    0,
    nutricionistas.findIndex((n) => n.id === pestana),
  );

  return (
    <>
      <div className="d-none d-md-block table-responsive">
        <table className="table table-bordered align-middle mb-0" aria-label="Agenda del día">
          <thead>
            <tr>
              <th scope="col" className="text-nowrap">
                Hora
              </th>
              {nutricionistas.map((n) => (
                <th key={n.id} scope="col">
                  {n.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.hora}>
                <th scope="row" className="text-nowrap small">
                  {fila.hora}
                </th>
                {fila.celdas.map((celda) => (
                  <td key={celda.nutricionistaId} style={{ minWidth: "8rem" }}>
                    <Celda celda={celda} {...propsCelda} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="d-md-none">
        <div className="nav nav-tabs mb-2" role="tablist" aria-label="Nutricionistas">
          {nutricionistas.map((n) => (
            <button
              key={n.id}
              type="button"
              role="tab"
              aria-selected={n.id === nutricionistas[indice].id}
              className={`nav-link px-2${n.id === nutricionistas[indice].id ? " active" : ""}`}
              onClick={() => setPestana(n.id)}
            >
              {primerNombre(n)}
            </button>
          ))}
        </div>
        <ul className="list-unstyled mb-0" role="tabpanel">
          {filas
            .filter((fila) => fila.celdas[indice].tipo !== "fuera")
            .map((fila) => (
              <li key={fila.hora} className="d-flex gap-3 border-bottom py-2">
                <span className="small text-nowrap pt-1">{fila.hora}</span>
                <div className="flex-grow-1">
                  <Celda celda={fila.celdas[indice]} {...propsCelda} />
                </div>
              </li>
            ))}
          {filas.every((fila) => fila.celdas[indice]?.tipo === "fuera") && (
            <li className="text-body-secondary py-2">No atiende este día.</li>
          )}
        </ul>
      </div>
    </>
  );
}
