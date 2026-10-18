// RN-10 a RN-12: muestra todos los bloques de la jornada. Los que no se pueden elegir
// (tomados, ya pasados o donde el servicio no cabe completo) llegan en "ocupados" y salen
// deshabilitados. El componente no decide nada: avisa la hora elegida al padre con onSeleccionar.
export default function SelectorHorario({
  horarios,
  ocupados = [],
  seleccionado = null,
  onSeleccionar,
}) {
  if (horarios.length === 0) {
    return <p className="text-body-secondary mb-0">Ese día no hay atención. Elige otra fecha.</p>;
  }

  return (
    <div role="group" aria-label="Horas del día" className="d-flex flex-wrap gap-2">
      {horarios.map((hora) => {
        const ocupado = ocupados.includes(hora);
        const elegido = hora === seleccionado && !ocupado;
        return (
          <button
            key={hora}
            type="button"
            className={`btn btn-sm ${elegido ? "btn-primary" : "btn-outline-primary"}${
              ocupado ? " text-decoration-line-through" : ""
            }`}
            disabled={ocupado}
            aria-pressed={elegido}
            onClick={() => onSeleccionar(hora)}
          >
            {hora}
          </button>
        );
      })}
    </div>
  );
}
