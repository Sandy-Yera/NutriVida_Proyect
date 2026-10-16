// RN-17: la reserva en curso (pasos del asistente) vive en sessionStorage con la clave nv_reserva.
// Es de esa pestaña: sobrevive a F5 y al ir al pago, y desaparece al cerrar la pestaña.
// No usa almacen.js porque aquel trabaja con localStorage, que es para los datos guardados.
const CLAVE = "nv_reserva";

const CAMPOS = ["servicioCodigo", "nutricionistaId", "fecha", "hora", "motivo", "paso"];

// Devuelve la reserva del paciente indicado, o null. Si la guardó otro paciente en esta
// pestaña, o el contenido está dañado, la descarta.
export function leerReserva(pacienteId) {
  try {
    const guardada = JSON.parse(sessionStorage.getItem(CLAVE));
    if (!guardada || guardada.pacienteId !== pacienteId) return null;
    return guardada;
  } catch {
    return null;
  }
}

// Guarda solo los campos conocidos, así la pestaña no acumula datos de más.
export function guardarReserva(pacienteId, reserva) {
  const limpia = { pacienteId };
  CAMPOS.forEach((campo) => {
    if (reserva[campo] !== undefined) limpia[campo] = reserva[campo];
  });
  sessionStorage.setItem(CLAVE, JSON.stringify(limpia));
  return limpia;
}

// Se llama cuando la cita ya se creó (pago aprobado).
export function borrarReserva() {
  sessionStorage.removeItem(CLAVE);
}
