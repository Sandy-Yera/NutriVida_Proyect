import { ETIQUETAS_ESTADO } from "../../utils/citas.js";
import { aFechaIso, formatearFecha, formatearFechaLarga } from "../../utils/formato.js";

// RN-31: fechas con utils/formato.js. La hora se toma de la hora local del registro.
function formatearMomento(iso) {
  const momento = new Date(iso);
  const hora = `${String(momento.getHours()).padStart(2, "0")}:${String(momento.getMinutes()).padStart(2, "0")}`;
  return `${formatearFecha(aFechaIso(momento))}, ${hora}`;
}

// Ninguna transición lleva a PENDIENTE: si una entrada termina en PENDIENTE, fue una
// reprogramación (RN-05). Se rotula así para que no se lea "Pendiente → Pendiente".
function describir(entrada) {
  const cambio = `${ETIQUETAS_ESTADO[entrada.de]} → ${ETIQUETAS_ESTADO[entrada.a]}`;
  return entrada.a === "PENDIENTE" ? `Reprogramada (${cambio})` : cambio;
}

// RN-04: los cambios de una cita, con fecha, estado anterior, estado nuevo y quién.
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
          {formatearMomento(entrada.fecha)}: {describir(entrada)}
          {entrada.por ? `, por ${nombre(entrada.por)}` : ""}
        </li>
      ))}
    </ol>
  );
}
