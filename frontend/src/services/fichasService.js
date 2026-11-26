import * as fichasData from "../data/fichasData.js";
import { obtenerSesion } from "../auth/auth.js";
import { errorNoAutenticado, errorNoEncontrado, errorProhibido } from "../utils/errores.js";

// Reglas de acceso a la ficha clínica (preparación EP3, ms-clinica). En EP2 se leen de la sesión;
// en EP3 salen del JWT y pasan a @PreAuthorize. La página sigue decidiendo qué mostrar, pero
// un dato clínico solo sale del service hacia quien corresponde:
// - el nutricionista a cargo de la ficha: lee y escribe;
// - el propio paciente: lee sus mediciones y su plan (Mi progreso);
// - el administrador: lee.

function exigirSesion() {
  const sesion = obtenerSesion();
  if (!sesion) throw errorNoAutenticado();
  return sesion;
}

function esACargo(sesion, ficha) {
  return (
    sesion.rol === "NUTRICIONISTA" &&
    Boolean(ficha) &&
    ficha.nutricionistaId === sesion.nutricionistaId
  );
}

function exigirLectura(pacienteId) {
  const sesion = exigirSesion();
  if (sesion.rol === "ADMIN" || (sesion.rol === "PACIENTE" && sesion.id === pacienteId)) return;
  if (esACargo(sesion, fichasData.obtenerFicha(pacienteId))) return;
  throw errorProhibido("No tienes acceso a la ficha de este paciente.");
}

function exigirEscritura(pacienteId) {
  const sesion = exigirSesion();
  const ficha = fichasData.obtenerFicha(pacienteId);
  if (!ficha) throw errorNoEncontrado("El paciente no tiene ficha: créala antes de continuar.");
  if (!esACargo(sesion, ficha)) {
    throw errorProhibido("Solo el nutricionista a cargo puede modificar esta ficha.");
  }
  return sesion;
}

export async function listarPacientes(nutricionistaId) {
  const sesion = exigirSesion();
  if (sesion.rol === "NUTRICIONISTA" && sesion.nutricionistaId !== nutricionistaId) {
    throw errorProhibido("Solo puedes ver tus propios pacientes.");
  }
  if (!["NUTRICIONISTA", "ADMIN"].includes(sesion.rol)) throw errorProhibido();
  return fichasData.listarFichas(nutricionistaId);
}

// Un nutricionista que no está a cargo solo recibe a quién pertenece la ficha (para el aviso
// "Ficha de otro nutricionista"), nunca el objetivo ni los antecedentes.
export async function obtenerFicha(pacienteId) {
  const sesion = exigirSesion();
  const ficha = fichasData.obtenerFicha(pacienteId);
  if (!ficha) return null;
  if (sesion.rol === "ADMIN" || esACargo(sesion, ficha)) return ficha;
  if (sesion.rol === "PACIENTE" && sesion.id === pacienteId) return ficha;
  if (sesion.rol === "NUTRICIONISTA")
    return { id: ficha.id, nutricionistaId: ficha.nutricionistaId };
  throw errorProhibido("No tienes acceso a la ficha de este paciente.");
}

// El nutricionista crea la ficha a su propio nombre; no puede asignársela a otro.
export async function crearFicha(datos) {
  const sesion = exigirSesion();
  if (sesion.rol !== "NUTRICIONISTA" || datos.nutricionistaId !== sesion.nutricionistaId) {
    throw errorProhibido("Solo puedes crear fichas a tu nombre.");
  }
  return fichasData.crearFicha(datos);
}

export async function listarMediciones(pacienteId) {
  exigirLectura(pacienteId);
  return fichasData.listarMediciones(pacienteId);
}

export async function registrarMedicion(pacienteId, datos) {
  const sesion = exigirEscritura(pacienteId);
  return fichasData.registrarMedicion(pacienteId, {
    ...datos,
    nutricionistaId: sesion.nutricionistaId,
  });
}

export async function obtenerPlan(pacienteId) {
  exigirLectura(pacienteId);
  return fichasData.obtenerPlan(pacienteId);
}

export async function guardarPlan(pacienteId, plan) {
  const sesion = exigirEscritura(pacienteId);
  return fichasData.guardarPlan(pacienteId, { ...plan, nutricionistaId: sesion.nutricionistaId });
}
