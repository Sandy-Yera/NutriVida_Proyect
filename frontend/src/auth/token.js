import { leerToken } from "../services/http.js";

// Vencimiento del JWT (claim exp, en segundos). Sin revisar la firma: eso lo hace el backend.
export function venceEn(token) {
  try {
    const carga = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(carga));
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

// La barra superior llama a obtenerSesion antes que RutaProtegida y borra el token vencido;
// esta marca guarda el motivo para que el aviso igual llegue a /login.
let vencidaRecien = false;

export function recordarVencida(valor) {
  vencidaRecien = valor;
}

// true si el token guardado ya venció (8 h).
export function tokenVencido() {
  const token = leerToken();
  const vence = token ? venceEn(token) : null;
  return vence !== null && vence <= Date.now();
}

// Para el aviso de RutaProtegida: el token venció o la sesión se acaba de cerrar por eso.
export function sesionVencida() {
  return vencidaRecien || tokenVencido();
}
