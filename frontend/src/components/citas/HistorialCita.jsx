import { ETIQUETAS_ESTADO } from "../../utils/citas.js";
import { formatearFechaLarga } from "../../utils/formato.js";

function formatearMomento(iso) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

// RN-04: los cambios de estado de una cita, con fecha, estado anterior, estado nuevo y quién.
// Lo usan la agenda de la secretaria (S-06) y el detalle del admin (S-08).
// nombre: función que convierte un id de usuario en su nombre.
export default function HistorialCita({ cita, nombre }) {
  if (cita.historial.length === 0) {
    return (
      <p className="small text-body-secondary">
        Solicitada el {formatearFechaLarga(cita.creadaEn)}. Sin cambios todavía.
      </p>
    );
  }
  return (
    <ol className="small ps-3">
      {cita.historial.map((entrada, indice) => (
        <li key={indice}>
          {formatearMomento(entrada.fecha)}: {ETIQUETAS_ESTADO[entrada.de]} →{" "}
          {ETIQUETAS_ESTADO[entrada.a]}
          {entrada.por ? `, por ${nombre(entrada.por)}` : ""}
        </li>
      ))}
    </ol>
  );
}
