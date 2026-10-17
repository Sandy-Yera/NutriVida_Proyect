import ChipEstado from "./ChipEstado.jsx";
import { formatearFechaLarga } from "../../utils/formato.js";

// S-05: una cita del paciente. Solo muestra y avisa: la página decide si se puede modificar.
// - Sin onCancelar ni onReprogramar (historial), no muestra acciones.
// - Con bloqueo (RN-06, menos de 24 h), muestra el motivo en vez de los botones.
export default function TarjetaCita({
  cita,
  servicio,
  nutricionista,
  bloqueo = "",
  onCancelar,
  onReprogramar,
}) {
  const titulo = `cita-${cita.id}`;
  const tieneAcciones = Boolean(onCancelar || onReprogramar);

  return (
    <article className="bg-white border rounded-3 p-3 h-100" aria-labelledby={titulo}>
      <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
        <h3 id={titulo} className="h6 mb-0">
          {servicio?.nombre ?? cita.servicioCodigo}
        </h3>
        <ChipEstado estado={cita.estado} />
      </div>
      <p className="mb-1">
        {formatearFechaLarga(cita.fecha)}, {cita.hora}
      </p>
      <p className="small text-body-secondary mb-2">
        {nutricionista?.nombre ?? cita.nutricionistaId}
        {servicio?.modalidad ? ` · ${servicio.modalidad}` : ""}
      </p>
      {cita.motivo && <p className="small mb-2 text-break">Motivo: {cita.motivo}</p>}

      {tieneAcciones && bloqueo && <p className="small text-body-secondary mb-0">{bloqueo}</p>}

      {tieneAcciones && !bloqueo && (
        <div className="d-flex flex-wrap gap-2">
          {onReprogramar && (
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => onReprogramar(cita)}
            >
              Reprogramar
            </button>
          )}
          {onCancelar && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => onCancelar(cita)}
            >
              Cancelar cita
            </button>
          )}
        </div>
      )}
    </article>
  );
}
