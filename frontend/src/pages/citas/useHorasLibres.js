import { useEffect, useState } from "react";
import { horariosDisponibles } from "../../services/citasService.js";
import { generarBloques, validarFechaCita } from "../../utils/citas.js";

// Horas libres para reprogramar una cita (RN-10 a RN-13). Lo usan Mis citas y la agenda de la
// secretaria. La propia cita no ocupa su horario (idExcluido).
// Devuelve horas: null si no hay fecha válida, "cargando" mientras se piden, o la lista de libres.
export function useHorasLibres({ cita, nutricionista, fecha, ahora }) {
  const [resultado, setResultado] = useState(null);
  const errorFecha = fecha ? validarFechaCita(fecha, ahora) : "";
  const pedir = Boolean(cita && nutricionista && fecha) && !errorFecha;
  const clave = `${cita?.id}|${fecha}`;

  useEffect(() => {
    if (!pedir) return undefined;
    let vigente = true;
    horariosDisponibles(cita.nutricionistaId, fecha, cita.duracionMin, cita.id).then(
      (disponibles) => {
        if (vigente) setResultado({ clave: `${cita.id}|${fecha}`, disponibles });
      },
    );
    return () => {
      vigente = false;
    };
  }, [pedir, cita, fecha]);

  let horas = null;
  if (pedir) horas = resultado?.clave === clave ? resultado.disponibles : "cargando";

  return {
    errorFecha,
    horarios: pedir ? generarBloques(nutricionista, fecha) : [],
    horas,
  };
}
