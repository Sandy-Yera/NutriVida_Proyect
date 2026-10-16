import { ETIQUETAS_ESTADO } from "../../utils/citas.js";

// RN-01: el estado de una cita siempre se muestra con color y texto (guía visual 6.1).
// Los colores ya están en tema.css (.estado y .estado-PENDIENTE, .estado-CONFIRMADA, …).
export default function ChipEstado({ estado }) {
  return <span className={`estado estado-${estado}`}>{ETIQUETAS_ESTADO[estado] ?? estado}</span>;
}
