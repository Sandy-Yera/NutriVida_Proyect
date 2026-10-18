import { useEffect, useRef } from "react";
import SelectorHorario from "./SelectorHorario.jsx";
import { horasNoElegibles } from "../../utils/citas.js";

// RN-05 y RN-10 a RN-13: elegir una nueva fecha y hora para una cita. Lo usan Mis citas (S-05)
// y la agenda de la secretaria (S-06). Solo muestra y avisa: la página carga las horas libres
// y guarda el cambio.
// horas: null mientras no hay fecha válida; "cargando" mientras se piden; o la lista de libres.
export default function PanelReprogramar({
  titulo,
  rango,
  fecha,
  errorFecha,
  horarios,
  horas,
  hora,
  procesando = false,
  onCambiarFecha,
  onElegirHora,
  onConfirmar,
  onCerrar,
}) {
  const tituloRef = useRef(null);
  const listas = Array.isArray(horas);

  // Al abrirse, el foco va al título (teclado y lectores de pantalla).
  useEffect(() => {
    tituloRef.current?.focus();
  }, []);
  const puedeConfirmar = listas && horas.includes(hora) && !procesando;

  return (
    <div className="bg-white border rounded-3 p-3 mb-3">
      <h2 ref={tituloRef} tabIndex={-1} className="h5">
        {titulo}
      </h2>
      <label htmlFor="fecha-reprogramar" className="form-label fw-semibold">
        Nueva fecha
      </label>
      <input
        id="fecha-reprogramar"
        type="date"
        className="form-control mb-2"
        style={{ maxWidth: "16rem" }}
        min={rango.desde}
        max={rango.hasta}
        value={fecha ?? ""}
        onChange={(evento) => onCambiarFecha(evento.target.value || undefined)}
        aria-invalid={Boolean(errorFecha)}
      />
      {errorFecha && (
        <p role="alert" className="text-danger">
          {errorFecha}
        </p>
      )}
      {horas === "cargando" && <p role="status">Buscando horas disponibles...</p>}
      {listas && (
        <SelectorHorario
          horarios={horarios}
          ocupados={horasNoElegibles(horarios, horas)}
          seleccionado={hora}
          onSeleccionar={onElegirHora}
        />
      )}
      <div className="d-flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!puedeConfirmar}
          onClick={onConfirmar}
        >
          {procesando ? "Guardando..." : "Confirmar nueva hora"}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          disabled={procesando}
          onClick={onCerrar}
        >
          No reprogramar
        </button>
      </div>
    </div>
  );
}
