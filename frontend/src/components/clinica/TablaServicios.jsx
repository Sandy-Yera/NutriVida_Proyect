import { formatearPrecio } from "../../utils/formato.js";
import { TIPO_SERVICIO_SINGULAR } from "../../utils/clinica.js";

function Estado({ activo }) {
  return (
    <span className={`badge ${activo ? "text-bg-success" : "text-bg-secondary"}`}>
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

function Acciones({ servicio, onEditar, onCambiarEstado }) {
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-primary me-2"
        aria-label={`Editar ${servicio.codigo}`}
        onClick={() => onEditar(servicio)}
      >
        Editar
      </button>
      <button
        type="button"
        className={`btn btn-sm ${servicio.activo ? "btn-outline-danger" : "btn-outline-primary"}`}
        aria-label={`${servicio.activo ? "Desactivar" : "Activar"} ${servicio.codigo}`}
        onClick={() => onCambiarEstado(servicio)}
      >
        {servicio.activo ? "Desactivar" : "Activar"}
      </button>
    </>
  );
}

function duracion(servicio) {
  return servicio.duracionMin ? `${servicio.duracionMin} min` : "—";
}

function resumen(servicio) {
  return [
    TIPO_SERVICIO_SINGULAR[servicio.tipo],
    servicio.duracionMin && `${servicio.duracionMin} min`,
    servicio.modalidad,
    formatearPrecio(servicio.precio),
    servicio.destacado && "Destacado",
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function TablaServicios({ servicios, onEditar, onCambiarEstado }) {
  return (
    <>
      <table className="table align-middle bg-white mb-0 d-none d-lg-table">
        <caption className="visually-hidden">Servicios del catálogo</caption>
        <thead>
          <tr>
            <th scope="col">Código</th>
            <th scope="col">Nombre</th>
            <th scope="col">Tipo</th>
            <th scope="col">Duración</th>
            <th scope="col">Modalidad</th>
            <th scope="col" className="text-end">
              Precio
            </th>
            <th scope="col">Estado</th>
            <th scope="col" className="text-end">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {servicios.map((servicio) => (
            <tr key={servicio.codigo}>
              <td className="fw-semibold">{servicio.codigo}</td>
              <td>
                {servicio.nombre}
                {servicio.destacado && (
                  <span className="badge text-bg-light border ms-2">Destacado</span>
                )}
              </td>
              <td>{TIPO_SERVICIO_SINGULAR[servicio.tipo]}</td>
              <td className="text-nowrap">{duracion(servicio)}</td>
              <td>{servicio.modalidad}</td>
              <td className="text-end text-nowrap">{formatearPrecio(servicio.precio)}</td>
              <td>
                <Estado activo={servicio.activo} />
              </td>
              <td className="text-end text-nowrap">
                <Acciones
                  servicio={servicio}
                  onEditar={onEditar}
                  onCambiarEstado={onCambiarEstado}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="list-unstyled mb-0 d-lg-none" aria-label="Servicios del catálogo">
        {servicios.map((servicio) => (
          <li key={servicio.codigo} className="bg-white border rounded-3 p-3 mb-2">
            <div className="d-flex justify-content-between align-items-start gap-2">
              <div>
                <span className="fw-semibold">{servicio.codigo}</span> · {servicio.nombre}
              </div>
              <Estado activo={servicio.activo} />
            </div>
            <div className="small text-body-secondary mb-2">{resumen(servicio)}</div>
            <Acciones servicio={servicio} onEditar={onEditar} onCambiarEstado={onCambiarEstado} />
          </li>
        ))}
      </ul>
    </>
  );
}
