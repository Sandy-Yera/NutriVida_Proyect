import * as fichasData from "../data/fichasData.js";
import { obtenerSesion } from "../auth/auth.js";
import { errorNoAutenticado, errorNoEncontrado, errorProhibido } from "../utils/errores.js";
import { apiFetch, apiFetchONull, query, usarApi } from "./http.js";

// Modo API (EP3, C-34): las mismas firmas contra /api/pacientes de ms-clinica. Las reglas de
// abajo las vuelve a aplicar el backend con el usuario del token (403 si la ficha es ajena).
async function conToken(ruta, opciones) {
  return apiFetch(ruta, opciones);
}

async function conTokenONull(ruta) {
  return apiFetchONull(ruta);
}

const rutaPaciente = (pacienteId) => `/api/pacientes/${encodeURIComponent(pacienteId)}`;

// Los inputs numéricos llegan como texto; la API recibe números o null.
function numeroONull(valor) {
  if (valor === undefined || valor === null || valor === "") return null;
  const numero = Number(valor);
  return Number.isNaN(numero) ? null : numero;
}

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
  if (usarApi()) return conToken(`/api/pacientes${query({ nutricionistaId })}`);
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
  if (usarApi()) return conTokenONull(rutaPaciente(pacienteId));
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
  if (usarApi()) return conToken("/api/pacientes", { method: "POST", body: datos });
  const sesion = exigirSesion();
  if (sesion.rol !== "NUTRICIONISTA" || datos.nutricionistaId !== sesion.nutricionistaId) {
    throw errorProhibido("Solo puedes crear fichas a tu nombre.");
  }
  return fichasData.crearFicha(datos);
}

export async function listarMediciones(pacienteId) {
  if (usarApi()) return conToken(`${rutaPaciente(pacienteId)}/mediciones`);
  exigirLectura(pacienteId);
  return fichasData.listarMediciones(pacienteId);
}

export async function registrarMedicion(pacienteId, datos) {
  if (usarApi()) {
    return conToken(`${rutaPaciente(pacienteId)}/mediciones`, {
      method: "POST",
      body: {
        fecha: datos.fecha,
        pesoKg: numeroONull(datos.pesoKg),
        tallaCm: numeroONull(datos.tallaCm),
        cinturaCm: numeroONull(datos.cinturaCm),
        caderaCm: numeroONull(datos.caderaCm),
        grasaPct: numeroONull(datos.grasaPct),
        notas: datos.notas ?? "",
      },
    });
  }
  const sesion = exigirEscritura(pacienteId);
  return fichasData.registrarMedicion(pacienteId, {
    ...datos,
    nutricionistaId: sesion.nutricionistaId,
  });
}

// Sin plan, ms-clinica responde 404 y aquí queda null, igual que en modo local.
export async function obtenerPlan(pacienteId) {
  if (usarApi()) return conTokenONull(`${rutaPaciente(pacienteId)}/plan`);
  exigirLectura(pacienteId);
  return fichasData.obtenerPlan(pacienteId);
}

export async function guardarPlan(pacienteId, plan) {
  if (usarApi()) {
    return conToken(`${rutaPaciente(pacienteId)}/plan`, {
      method: "PUT",
      body: { ...plan, kcalDiarias: numeroONull(plan.kcalDiarias) },
    });
  }
  const sesion = exigirEscritura(pacienteId);
  return fichasData.guardarPlan(pacienteId, { ...plan, nutricionistaId: sesion.nutricionistaId });
}
