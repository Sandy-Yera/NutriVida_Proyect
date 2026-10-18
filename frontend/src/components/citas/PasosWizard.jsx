// RN-17: muestra en qué paso va el asistente. Solo dibuja: el paso actual lo decide el padre.
// pasos: lista de títulos. pasoActual: número desde 1.
export default function PasosWizard({ pasos, pasoActual }) {
  return (
    <ol className="list-unstyled d-flex flex-wrap gap-2 mb-0" aria-label="Pasos de la solicitud">
      {pasos.map((titulo, indice) => {
        const numero = indice + 1;
        const actual = numero === pasoActual;
        const hecho = numero < pasoActual;
        return (
          <li
            key={titulo}
            aria-current={actual ? "step" : undefined}
            className={`small px-2 py-1 rounded border ${
              actual ? "bg-primary text-white border-primary fw-semibold" : "text-body-secondary"
            }`}
          >
            <span aria-hidden="true">{hecho ? "✓" : numero}</span> {titulo}
            {hecho && <span className="visually-hidden"> (completado)</span>}
          </li>
        );
      })}
    </ol>
  );
}
